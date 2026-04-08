/**
 * Location Suggestion Service
 *
 * Uses Google Gemini AI to intelligently suggest optimal warehouse locations
 * based on pallet characteristics and warehouse occupancy data.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

interface WarehouseLocation {
  location_id: string;
  location_code: string;
  grid_zone: string;
  grid_row: number;
  grid_column: number;
  max_stacks: number;
  status: string;
  current_occupancy?: number;
  available_slots?: number;
  area: string;
}

interface PalletData {
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
  net_weight?: number;
  item_category?: string;
}

interface LocationSuggestion {
  location_id: string;
  location_code: string;
  capacity_available: number;
  distance_score: number;
  reasoning?: string;
}

interface LocationSuggestionRequest {
  pallet: PalletData;
  availableLocations: WarehouseLocation[];
  warehouseId: string;
  companyId: string;
}

const AREA_MAP: Record<string, string> = {
  FINISH_GOOD: 'FINISH_GOOD',
  PACKAGING:   'PACKAGING',
  JIT:         'JIT',
};

class LocationSuggestionService {
  private client: GoogleGenerativeAI;
  private model: string = "gemini-2.5-flash";

  constructor() {
    this.client = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY!
    );
  }

  async suggestLocations(
    request: LocationSuggestionRequest
  ): Promise<LocationSuggestion[]> {
    const { pallet, availableLocations } = request;

    // ✅ Step 1: Cluster by area first
    const targetArea = AREA_MAP[pallet.item_category ?? ''];
    
    const areaFilteredLocations = targetArea
      ? availableLocations.filter((loc) => loc.area === targetArea)
      : availableLocations;

    console.log(
      `[AI-LOCATION-SUGGESTION] Area filter: "${targetArea}" → ${areaFilteredLocations.length}/${availableLocations.length} locations`
    );

    // ✅ Step 2: Filter out full/ineligible
    const eligibleLocations = areaFilteredLocations.filter((loc) => {
      const availableSlots = loc.available_slots ?? loc.max_stacks;
      const isFull = availableSlots <= 0 || (loc.current_occupancy ?? 0) >= loc.max_stacks;
      return !isFull && loc.status !== 'MAINTENANCE' && loc.status !== 'DISABLED';
    });

    console.log(
      `[AI-LOCATION-SUGGESTION] ${areaFilteredLocations.length} in area → ${eligibleLocations.length} eligible`
    );

    // ✅ Step 3: Fallback if no eligible locations in target area
    if (eligibleLocations.length === 0 && targetArea) {
      console.warn(
        `[AI-LOCATION-SUGGESTION] No eligible locations in area "${targetArea}", falling back to all areas`
      );

      const fallbackLocations = availableLocations.filter((loc) => {
        const availableSlots = loc.available_slots ?? loc.max_stacks;
        const isFull = availableSlots <= 0 || (loc.current_occupancy ?? 0) >= loc.max_stacks;
        return !isFull && loc.status !== 'MAINTENANCE' && loc.status !== 'DISABLED';
      });

      return fallbackLocations.length === 0
        ? []
        : this.getFallbackSuggestions(fallbackLocations);
    }

    if (eligibleLocations.length === 0) return [];

    // ✅ Step 4: Prepare location data for Gemini
    const locationsData = eligibleLocations.map((loc) => ({
      location_code: loc.location_code,
      area: loc.area,
      zone: loc.grid_zone,
      position: `Row ${loc.grid_row}, Col ${loc.grid_column}`,
      max_capacity: loc.max_stacks,
      current_occupancy: loc.current_occupancy ?? 0,
      available_slots: loc.available_slots ?? loc.max_stacks,
      occupancy_status:
        (loc.available_slots ?? loc.max_stacks) <= 0
          ? 'FULL'
          : (loc.current_occupancy ?? 0) > 0
          ? 'PARTIAL'
          : 'EMPTY',
    }));

    const prompt = `
Kamu adalah sistem AI untuk manajemen gudang yang bertugas menyarankan lokasi penyimpanan palet terbaik.

Analisis setiap lokasi berdasarkan:
1. KAPASITAS: Pastikan lokasi masih memiliki slot tersedia
2. KETERSEDIAAN: Utamakan lokasi kosong atau yang masih ada ruang
3. ZONA: Kelompokkan produk sejenis dalam zona yang sama
4. JARAK: Pilih lokasi yang dekat dan mudah dijangkau
5. EFISIENSI: Maksimalkan penggunaan ruang gudang

ATURAN KETAT:
- JANGAN sarankan lokasi dengan available_slots = 0
- JANGAN sarankan lokasi dengan status "FULL", "MAINTENANCE", atau "DISABLED"
- Jika kurang dari 5 lokasi tersedia, kembalikan hanya yang tersedia saja
- Balas HANYA dengan array JSON murni, tanpa markdown, tanpa backtick, tanpa penjelasan apapun

Informasi Palet Masuk:
- HU Label: ${pallet.hu_label}
- Produk: ${pallet.product_name}
- Kategori: ${pallet.item_category ?? 'Tidak diketahui'}
- Area Target: ${targetArea ?? 'Semua area'}
- Jumlah: ${pallet.qty} unit
- Batch: ${pallet.batch}
- Berat: ${pallet.net_weight ? pallet.net_weight + ' kg' : 'Tidak diketahui'}

Lokasi Tersedia di Area ${targetArea}:
${JSON.stringify(locationsData, null, 2)}

Sarankan 5 lokasi terbaik dalam format JSON (alasan harus bahasa Indonesia):
[
  {
    "location_code": "A-001",
    "reasoning": "Slot masih kosong, Zona A-001 masih bisa dimuat"
  }
]`;

    try {
      console.log(
        `[AI-LOCATION-SUGGESTION] Requesting Gemini for pallet: ${pallet.hu_label}`
      );

      const geminiModel = this.client.getGenerativeModel({
        model: this.model,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const result = await geminiModel.generateContent(prompt);
      const responseText = result.response.text();

      console.log(`[AI-LOCATION-SUGGESTION] Gemini response received`);

      // Parse JSON with regex as safety net
      let suggestions: any[];
      try {
        suggestions = JSON.parse(responseText);
      } catch {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.warn(`[AI-LOCATION-SUGGESTION] Could not parse JSON:`, responseText);
          return this.getFallbackSuggestions(eligibleLocations);
        }
        suggestions = JSON.parse(jsonMatch[0]);
      }

      // Map Gemini suggestions back to full location objects
      const locationMap = new Map(
        eligibleLocations.map((loc) => [loc.location_code, loc])
      );

      const mappedSuggestions: LocationSuggestion[] = suggestions
        .map((suggestion: any) => {
          const location = locationMap.get(suggestion.location_code);
          if (!location) return null;

          // Double-check Gemini didn't hallucinate a full location
          const availableSlots = location.available_slots ?? location.max_stacks;
          if (availableSlots <= 0) return null;
          
          return {
            location_id: location.location_id,
            location_code: location.location_code,
            capacity_available: Math.max(
              0,
              (availableSlots / location.max_stacks) * 100
            ),
            distance_score: this.calculateDistanceScore(
              location.grid_row,
              location.grid_column
            ),
            reasoning: suggestion.reasoning,
          };
        })
        .filter(
          (suggestion): suggestion is LocationSuggestion => suggestion !== null
        );

      console.log(
        `[AI-LOCATION-SUGGESTION] Mapped ${mappedSuggestions.length} suggestions`
      );

      return mappedSuggestions.length > 0
        ? mappedSuggestions
        : this.getFallbackSuggestions(eligibleLocations);

    } catch (error) {
      console.error(`[AI-LOCATION-SUGGESTION] Error calling Gemini API:`, error);
      return this.getFallbackSuggestions(eligibleLocations);
    }
  }

  /**
   * Fallback: Simple rule-based location suggestion
   * Used when AI is unavailable
   */
  private getFallbackSuggestions(
    locations: WarehouseLocation[]
  ): LocationSuggestion[] {
    return locations
      .filter((loc) => {
        const availableSlots = loc.available_slots ?? loc.max_stacks;
        return (
          availableSlots > 0 &&
          loc.status !== 'MAINTENANCE' &&
          loc.status !== 'DISABLED'
        );
      })
      .sort((a, b) => {
        const aAvailable = (a.available_slots ?? a.max_stacks) / a.max_stacks;
        const bAvailable = (b.available_slots ?? b.max_stacks) / b.max_stacks;

        if (aAvailable !== bAvailable) return bAvailable - aAvailable;

        const aDistance = Math.sqrt(a.grid_row ** 2 + a.grid_column ** 2);
        const bDistance = Math.sqrt(b.grid_row ** 2 + b.grid_column ** 2);
        return aDistance - bDistance;
      })
      .slice(0, 5)
      .map((loc) => ({
        location_id: loc.id,
        location_code: loc.location_code,
        capacity_available: Math.max(
          0,
          ((loc.available_slots ?? loc.max_stacks) / loc.max_stacks) * 100
        ),
        distance_score: this.calculateDistanceScore(loc.grid_row, loc.grid_column),
      }));
  }

  /**
   * Calculate proximity score (0-1)
   * Lower grid coordinates = higher score (closer to origin)
   */
  private calculateDistanceScore(row: number, column: number): number {
    const maxDistance = Math.sqrt(100 * 100 + 100 * 100);
    const distance = Math.sqrt(row * row + column * column);
    return Math.max(0, 1 - distance / maxDistance);
  }
}

// Export singleton instance
export const locationSuggestionService = new LocationSuggestionService();

export type {
  LocationSuggestion,
  LocationSuggestionRequest,
  WarehouseLocation,
  PalletData,
};

// /**ORIGINAL*
//  * Location Suggestion Service
//  *
//  * Uses Claude AI to intelligently suggest optimal warehouse locations
//  * based on pallet characteristics and warehouse occupancy data.
//  *
//  * This service replaces the n8n webhook and provides real-time,
//  * intelligent location recommendations using the Anthropic Claude API.
//  */

// import Anthropic from "@anthropic-ai/sdk";

// interface WarehouseLocation {
//   id: string;
//   location_code: string;
//   grid_zone: string;
//   grid_row: number;
//   grid_column: number;
//   max_stacks: number;
//   status: string;
//   current_occupancy?: number;
//   available_slots?: number;
//   area: string;
// }

// interface PalletData {
//   hu_label: string;
//   product_name: string;
//   qty: number;
//   batch: string;
//   net_weight?: number;
//   item_category?: string; 
// }
// // Map item_category → area
// const AREA_MAP: Record<string, string> = {
//   FINISH_GOOD: 'FINISH_GOOD',
//   PACKAGING:   'PACKAGING',
//   JIT:         'JIT',
// };

// interface LocationSuggestion {
//   location_id: string;
//   location_code: string;
//   capacity_available: number;
//   distance_score: number;
//   reasoning?: string;
// }

// interface LocationSuggestionRequest {
//   pallet: PalletData;
//   availableLocations: WarehouseLocation[];
//   warehouseId: string;
//   companyId: string;
// }

// class LocationSuggestionService {
//   private client: Anthropic;
//   private model: string = "claude-opus-4-6";

//   constructor() {
//     this.client = new Anthropic({
//       apiKey: process.env.ANTHROPIC_API_KEY,
//     });
//   }

//   /**
//    * Suggest optimal warehouse locations for a pallet using Claude AI
//    *
//    * The AI considers:
//    * - Pallet characteristics (product, quantity, weight, batch)
//    * - Location capacity and availability
//    * - Grid layout (zone grouping, proximity)
//    * - Location status (available, full, maintenance)
//    * - Product type patterns (e.g., similar products near each other)
//    */
//   async suggestLocations(
//     request: LocationSuggestionRequest
//   ): Promise<LocationSuggestion[]> {
//     const { pallet, availableLocations } = request;

//     // FIX 1: Filter out full/ineligible locations before sending to Claude
//     const eligibleLocations = availableLocations.filter((loc) => {
//       const availableSlots = loc.available_slots ?? loc.max_stacks;
//       const isFull =
//         availableSlots <= 0 ||
//         (loc.current_occupancy ?? 0) >= loc.max_stacks;
//       return (
//         !isFull &&
//         loc.status !== "MAINTENANCE" &&
//         loc.status !== "DISABLED"
//       );
//     });

//     console.log(
//       `[AI-LOCATION-SUGGESTION] ${availableLocations.length} total → ${eligibleLocations.length} eligible after filtering full locations`
//     );

//     if (eligibleLocations.length === 0) {
//       console.warn(`[AI-LOCATION-SUGGESTION] No eligible locations available`);
//       return [];
//     }

//     // FIX 2: Use ?? instead of || to correctly handle available_slots = 0
//     const locationsData = eligibleLocations.map((loc) => ({
//       location_code: loc.location_code,
//       zone: loc.grid_zone,
//       position: `Row ${loc.grid_row}, Col ${loc.grid_column}`,
//       max_capacity: loc.max_stacks,
//       current_occupancy: loc.current_occupancy ?? 0,
//       available_slots: loc.available_slots ?? loc.max_stacks,
//       occupancy_status:
//         (loc.available_slots ?? loc.max_stacks) <= 0
//           ? "FULL"
//           : (loc.current_occupancy ?? 0) > 0
//           ? "PARTIAL"
//           : "EMPTY",
//     }));

//     // Create a detailed prompt for Claude
// //     const systemPrompt = `You are an expert warehouse logistics AI specialized in optimal pallet placement.
// // Your job is to analyze incoming pallets and suggest the best warehouse locations based on:

// // 1. CAPACITY: Ensure location has enough stack height for the pallet
// // 2. AVAILABILITY: Prefer empty or partially filled locations over full ones
// // 3. ZONE ORGANIZATION: Group similar products in the same zones when possible
// // 4. PROXIMITY: Suggest locations that are close together in the grid
// // 5. EFFICIENCY: Minimize travel distance and maximize space utilization

// // STRICT RULES:
// // - NEVER suggest a location where available_slots = 0
// // - NEVER suggest a location with occupancy_status "FULL"
// // - NEVER suggest a location with status "MAINTENANCE" or "DISABLED"
// // - If fewer than 5 eligible locations exist, return only the eligible ones

// // You must respond with a JSON array of location suggestions, ranked from best to worst.
// // Focus on practical warehouse management principles.`;

// //     const userPrompt = `
// // Incoming Pallet Information:
// // - HU Label: ${pallet.hu_label}
// // - Product: ${pallet.product_name}
// // - Quantity: ${pallet.qty} units
// // - Batch: ${pallet.batch}
// // - Weight: ${pallet.net_weight ? pallet.net_weight + " kg" : "Unknown"}

// // Available Warehouse Locations:
// // ${JSON.stringify(locationsData, null, 2)}

// // Please suggest the top 5 best locations for this pallet in JSON format:
// // [
// //   {
// //     "location_code": "A-001",
// //     "reasoning": "Brief explanation why this location is optimal"
// //   },
// //   ...
// // ]

// // Consider all factors and provide the most practical suggestions for warehouse efficiency.`;

// const systemPrompt = `Kamu adalah sistem AI untuk manajemen gudang yang bertugas menyarankan lokasi penyimpanan palet terbaik.

// Analisis setiap lokasi berdasarkan:
// 1. KAPASITAS: Pastikan lokasi masih memiliki slot tersedia
// 2. KETERSEDIAAN: Utamakan lokasi kosong atau yang masih ada ruang
// 3. ZONA: Kelompokkan produk sejenis dalam zona yang sama
// 4. JARAK: Pilih lokasi yang dekat dan mudah dijangkau
// 5. EFISIENSI: Maksimalkan penggunaan ruang gudang

// ATURAN KETAT:
// - JANGAN sarankan lokasi dengan available_slots = 0
// - JANGAN sarankan lokasi dengan status "FULL", "MAINTENANCE", atau "DISABLED"
// - Jika kurang dari 5 lokasi tersedia, kembalikan hanya yang tersedia saja

// Balas HANYA dengan array JSON. Alasan harus singkat, maksimal 10 kata, menggunakan bahasa Indonesia yang mudah dipahami operator gudang.`;

// const userPrompt = `
// Informasi Palet Masuk:
// - HU Label: ${pallet.hu_label}
// - Produk: ${pallet.product_name}
// - Jumlah: ${pallet.qty} unit
// - Batch: ${pallet.batch}
// - Berat: ${pallet.net_weight ? pallet.net_weight + " kg" : "Tidak diketahui"}

// Lokasi Gudang Tersedia:
// ${JSON.stringify(locationsData, null, 2)}

// Sarankan 5 lokasi terbaik dalam format JSON:
// [
//   {
//     "location_code": "A-001",
//     "reasoning": "Slot masih kosong, zona A dekat pintu masuk"
//   },
//   ...
// ]
// Pertimbangkan semua faktor dan berikan saran yang paling praktis untuk efisiensi gudang.`;

//     try {
//       console.log(
//         `[AI-LOCATION-SUGGESTION] Requesting Claude for pallet: ${pallet.hu_label}`
//       );

//       const response = await this.client.messages.create({
//         model: this.model,
//         max_tokens: 1024,
//         system: systemPrompt,
//         messages: [
//           {
//             role: "user",
//             content: userPrompt,
//           },
//         ],
//       });

//       // Extract the text response
//       const responseText = response.content
//         .filter((block) => block.type === "text")
//         .map((block) => (block as any).text)
//         .join("");

//       console.log(`[AI-LOCATION-SUGGESTION] Claude response received`);

//       // Parse the JSON response
//       const jsonMatch = responseText.match(/\[[\s\S]*\]/);
//       if (!jsonMatch) {
//         console.warn(
//           `[AI-LOCATION-SUGGESTION] Could not parse JSON from response:`,
//           responseText
//         );
//         return this.getFallbackSuggestions(eligibleLocations);
//       }

//       const suggestions = JSON.parse(jsonMatch[0]);

//       // Map Claude's suggestions back to full location objects
//       const locationMap = new Map(
//         eligibleLocations.map((loc) => [loc.location_code, loc])
//       );

//       const mappedSuggestions: LocationSuggestion[] = suggestions
//         .map((suggestion: any) => {
//           const location = locationMap.get(suggestion.location_code);
//           if (!location) return null;

//           // FIX 3: Double-check Claude didn't hallucinate a full location
//           const availableSlots = location.available_slots ?? location.max_stacks;
//           if (availableSlots <= 0) return null;

//           return {
//             location_id: location.id,
//             location_code: location.location_code,
//             capacity_available: Math.max(
//               0,
//               (availableSlots / location.max_stacks) * 100
//             ),
//             distance_score: this.calculateDistanceScore(
//               location.grid_row,
//               location.grid_column
//             ),
//             reasoning: suggestion.reasoning,
//           };
//         })
//         .filter(
//           (suggestion): suggestion is LocationSuggestion => suggestion !== null
//         );

//       console.log(
//         `[AI-LOCATION-SUGGESTION] Mapped ${mappedSuggestions.length} suggestions`
//       );

//       // If we got results, return them; otherwise fallback
//       return mappedSuggestions.length > 0
//         ? mappedSuggestions
//         : this.getFallbackSuggestions(eligibleLocations);
//     } catch (error) {
//       console.error(
//         `[AI-LOCATION-SUGGESTION] Error calling Claude API:`,
//         error
//       );

//       // Graceful fallback to basic suggestion
//       return this.getFallbackSuggestions(eligibleLocations);
//     }
//   }

//   /**
//    * Fallback: Simple rule-based location suggestion
//    * Used when AI is unavailable
//    */
//   private getFallbackSuggestions(
//     locations: WarehouseLocation[]
//   ): LocationSuggestion[] {
//     return locations
//       .filter((loc) => {
//         // FIX 4: Use ?? and check actual slot count, not just status
//         const availableSlots = loc.available_slots ?? loc.max_stacks;
//         return (
//           availableSlots > 0 &&
//           loc.status !== "MAINTENANCE" &&
//           loc.status !== "DISABLED"
//         );
//       })
//       .sort((a, b) => {
//         // FIX 5: Use ?? instead of || so available_slots = 0 is respected
//         const aAvailable = (a.available_slots ?? a.max_stacks) / a.max_stacks;
//         const bAvailable = (b.available_slots ?? b.max_stacks) / b.max_stacks;

//         if (aAvailable !== bAvailable) {
//           return bAvailable - aAvailable;
//         }

//         // Then prefer locations closer to origin (0,0)
//         const aDistance = Math.sqrt(a.grid_row ** 2 + a.grid_column ** 2);
//         const bDistance = Math.sqrt(b.grid_row ** 2 + b.grid_column ** 2);
//         return aDistance - bDistance;
//       })
//       .slice(0, 5)
//       .map((loc) => ({
//         location_id: loc.id,
//         location_code: loc.location_code,
//         // FIX 6: Use ?? instead of || so 0 slots shows 0% not 100%
//         capacity_available: Math.max(
//           0,
//           ((loc.available_slots ?? loc.max_stacks) / loc.max_stacks) * 100
//         ),
//         distance_score: this.calculateDistanceScore(
//           loc.grid_row,
//           loc.grid_column
//         ),
//       }));
//   }

//   /**
//    * Calculate proximity score (0-1)
//    * Lower grid coordinates = higher score (closer to origin)
//    */
//   private calculateDistanceScore(row: number, column: number): number {
//     const maxDistance = Math.sqrt(100 * 100 + 100 * 100); // Assume max 100x100 grid
//     const distance = Math.sqrt(row * row + column * column);
//     return Math.max(0, 1 - distance / maxDistance);
//   }
// }

// // Export singleton instance
// export const locationSuggestionService = new LocationSuggestionService();

// export type {
//   LocationSuggestion,
//   LocationSuggestionRequest,
//   WarehouseLocation,
//   PalletData,
// };

// // /**
// //  * Location Suggestion Service
// //  *
// //  * Uses Claude AI to intelligently suggest optimal warehouse locations
// //  * based on pallet characteristics and warehouse occupancy data.
// //  *
// //  * This service replaces the n8n webhook and provides real-time,
// //  * intelligent location recommendations using the Anthropic Claude API.
// //  */

// // import Anthropic from "@anthropic-ai/sdk";

// // interface WarehouseLocation {
// //   id: string;
// //   location_code: string;
// //   grid_zone: string;
// //   grid_row: number;
// //   grid_column: number;
// //   max_stacks: number;
// //   status: string;
// //   current_occupancy?: number;
// //   available_slots?: number;
// // }

// // interface PalletData {
// //   hu_label: string;
// //   product_name: string;
// //   qty: number;
// //   batch: string;
// //   net_weight?: number;
// // }

// // interface LocationSuggestion {
// //   location_id: string;
// //   location_code: string;
// //   capacity_available: number;
// //   distance_score: number;
// //   reasoning?: string;
// // }

// // interface LocationSuggestionRequest {
// //   pallet: PalletData;
// //   availableLocations: WarehouseLocation[];
// //   warehouseId: string;
// //   companyId: string;
// // }

// // class LocationSuggestionService {
// //   private client: Anthropic;
// //   private model: string = "claude-opus-4-6";

// //   constructor() {
// //     this.client = new Anthropic({
// //       apiKey: process.env.ANTHROPIC_API_KEY,
// //     });
// //   }

// //   /**
// //    * Suggest optimal warehouse locations for a pallet using Claude AI
// //    *
// //    * The AI considers:
// //    * - Pallet characteristics (product, quantity, weight, batch)
// //    * - Location capacity and availability
// //    * - Grid layout (zone grouping, proximity)
// //    * - Location status (available, full, maintenance)
// //    * - Product type patterns (e.g., similar products near each other)
// //    */
// //   async suggestLocations(
// //     request: LocationSuggestionRequest
// //   ): Promise<LocationSuggestion[]> {
// //     const { pallet, availableLocations } = request;

// //     // Format available locations for Claude
// //     const locationsData = availableLocations.map((loc) => ({
// //       location_code: loc.location_code,
// //       zone: loc.grid_zone,
// //       position: `Row ${loc.grid_row}, Col ${loc.grid_column}`,
// //       max_capacity: loc.max_stacks,
// //       current_occupancy: loc.current_occupancy || 0,
// //       available_slots: loc.available_slots || loc.max_stacks,
// //       status: loc.status,
// //     }));

// //     // Create a detailed prompt for Claude
// //     const systemPrompt = `You are an expert warehouse logistics AI specialized in optimal pallet placement.
// // Your job is to analyze incoming pallets and suggest the best warehouse locations based on:

// // 1. CAPACITY: Ensure location has enough stack height for the pallet
// // 2. AVAILABILITY: Prefer empty or partially filled locations over full ones
// // 3. ZONE ORGANIZATION: Group similar products in the same zones when possible
// // 4. PROXIMITY: Suggest locations that are close together in the grid
// // 5. EFFICIENCY: Minimize travel distance and maximize space utilization

// // STRICT RULES:
// // - NEVER suggest a location where available_slots = 0
// // - NEVER suggest a location with status "FULL" or "MAINTENANCE"
// // - If fewer than 5 eligible locations exist, return only the eligible ones

// // You must respond with a JSON array of location suggestions, ranked from best to worst.
// // Focus on practical warehouse management principles.`;

// //     const userPrompt = `
// // Incoming Pallet Information:
// // - HU Label: ${pallet.hu_label}
// // - Product: ${pallet.product_name}
// // - Quantity: ${pallet.qty} units
// // - Batch: ${pallet.batch}
// // - Weight: ${pallet.net_weight ? pallet.net_weight + " kg" : "Unknown"}

// // Available Warehouse Locations:
// // ${JSON.stringify(locationsData, null, 2)}

// // Please suggest the top 5 best locations for this pallet in JSON format:
// // [
// //   {
// //     "location_code": "A-001",
// //     "reasoning": "Brief explanation why this location is optimal"
// //   },
// //   ...
// // ]

// // Consider all factors and provide the most practical suggestions for warehouse efficiency.`;

// //     try {
// //       console.log(
// //         `[AI-LOCATION-SUGGESTION] Requesting Claude for pallet: ${pallet.hu_label}`
// //       );

// //       const response = await this.client.messages.create({
// //         model: this.model,
// //         max_tokens: 1024,
// //         system: systemPrompt,
// //         messages: [
// //           {
// //             role: "user",
// //             content: userPrompt,
// //           },
// //         ],
// //       });

// //       // Extract the text response
// //       const responseText = response.content
// //         .filter((block) => block.type === "text")
// //         .map((block) => (block as any).text)
// //         .join("");

// //       console.log(`[AI-LOCATION-SUGGESTION] Claude response received`);

// //       // Parse the JSON response
// //       const jsonMatch = responseText.match(/\[[\s\S]*\]/);
// //       if (!jsonMatch) {
// //         console.warn(
// //           `[AI-LOCATION-SUGGESTION] Could not parse JSON from response:`,
// //           responseText
// //         );
// //         return this.getFallbackSuggestions(availableLocations);
// //       }

// //       const suggestions = JSON.parse(jsonMatch[0]);

// //       // Map Claude's suggestions back to full location objects
// //       const locationMap = new Map(
// //         availableLocations.map((loc) => [loc.location_code, loc])
// //       );

// //       const mappedSuggestions: LocationSuggestion[] = suggestions
// //         .map((suggestion: any) => {
// //           const location = locationMap.get(suggestion.location_code);
// //           if (!location) return null;
          
// //           return {
// //             location_id: location.id,
// //             location_code: location.location_code,
// //             capacity_available: Math.max(
// //               0,
// //               ((location.available_slots ?? location.max_stacks) / location.max_stacks)  *
// //                 100
// //             ),
// //             distance_score: this.calculateDistanceScore(
// //               location.grid_row,
// //               location.grid_column
// //             ),
// //             reasoning: suggestion.reasoning,
// //           };
// //         })
// //         .filter(
// //           (suggestion): suggestion is LocationSuggestion => suggestion !== null
// //         );

// //       console.log(
// //         `[AI-LOCATION-SUGGESTION] Mapped ${mappedSuggestions.length} suggestions`
// //       );

// //       // If we got results, return them; otherwise fallback
// //       return mappedSuggestions.length > 0
// //         ? mappedSuggestions
// //         : this.getFallbackSuggestions(availableLocations);
// //     } catch (error) {
// //       console.error(
// //         `[AI-LOCATION-SUGGESTION] Error calling Claude API:`,
// //         error
// //       );

// //       // Graceful fallback to basic suggestion
// //       return this.getFallbackSuggestions(availableLocations);
// //     }
// //   }

// //   /**
// //    * Fallback: Simple rule-based location suggestion
// //    * Used when AI is unavailable
// //    */
// //   private getFallbackSuggestions(
// //     locations: WarehouseLocation[]
// //   ): LocationSuggestion[] {
// //     return locations
// //       .filter((loc) => loc.status === "AVAILABLE" || loc.status === "PARTIAL")
// //       .sort((a, b) => {
// //         // Prefer locations with more available slots
// //         const aAvailable = (a.available_slots || a.max_stacks) / a.max_stacks;
// //         const bAvailable = (b.available_slots || b.max_stacks) / b.max_stacks;

// //         if (aAvailable !== bAvailable) {
// //           return bAvailable - aAvailable;
// //         }

// //         // Then prefer locations closer to origin (0,0)
// //         const aDistance = Math.sqrt(a.grid_row ** 2 + a.grid_column ** 2);
// //         const bDistance = Math.sqrt(b.grid_row ** 2 + b.grid_column ** 2);
// //         return aDistance - bDistance;
// //       })
// //       .slice(0, 5)
// //       .map((loc) => ({
// //         location_id: loc.id,
// //         location_code: loc.location_code,
// //         capacity_available: Math.max(
// //           0,
// //           ((loc.available_slots || loc.max_stacks) / loc.max_stacks) * 100
// //         ),
// //         distance_score: this.calculateDistanceScore(
// //           loc.grid_row,
// //           loc.grid_column
// //         ),
// //       }));
// //   }

// //   /**
// //    * Calculate proximity score (0-1)
// //    * Lower grid coordinates = higher score (closer to origin)
// //    */
// //   private calculateDistanceScore(row: number, column: number): number {
// //     const maxDistance = Math.sqrt(100 * 100 + 100 * 100); // Assume max 100x100 grid
// //     const distance = Math.sqrt(row * row + column * column);
// //     return Math.max(0, 1 - distance / maxDistance);
// //   }
// // }

// // // Export singleton instance
// // export const locationSuggestionService = new LocationSuggestionService();

// // export type {
// //   LocationSuggestion,
// //   LocationSuggestionRequest,
// //   WarehouseLocation,
// //   PalletData,
// // };
