/**
 * RECEIVING API Route
 * 
 * Handles HU label capture and pallet registration
 * Workflow: Capture → OCR Extract → Validate → Register → Suggest Locations
 * 
 * Based on warehouse-flow.md and ai-services.md specifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ocrService from '@/services/ocr.service';
import type { HULabelResponse } from '@/services/ocr.service';

interface ReceivingRequest {
  warehouseId: string;
  companyId: string;
}

interface SuggestedLocation {
  location_id: string;
  location_code: string;
  capacity_available: number;
  distance_score: number;
}

interface ReceivingResponse {
  success: boolean;
  pallet?: {
    id: string;
    hu_label: string;
    product_name: string;
    net_weight: number;
    qty: number;
    batch: string;
    status: string;
  };
  suggested_locations?: SuggestedLocation[];
  next_step?: string;
  error?: string;
  confidence?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<ReceivingResponse>> {
  try {
    // Get multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const warehouseId = formData.get('warehouseId') as string;
    const companyId = formData.get('companyId') as string;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (!warehouseId || !warehouseId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Warehouse ID is required' },
        { status: 400 }
      );
    }

    if (!companyId || !companyId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Company ID is required. Please ensure you are assigned to a company.' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file format. Allowed: ${allowedTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[RECEIVING] Starting OCR extraction for warehouse: ${warehouseId}`);

    // ============ STEP 1-2: CAPTURE & OCR EXTRACTION ============
    // Call self-hosted OCR service to extract HU label information
    const ocrResponse: HULabelResponse = await ocrService.extractHULabelFromFile(
      companyId,
      warehouseId,
      file
    );

    console.log(`[RECEIVING] OCR Response:`, {
      hu_label: ocrResponse.hu_label,
      confidence: ocrResponse.confidence,
      processing_time_ms: ocrResponse.processing_time_ms,
    });

    // ============ STEP 3: VALIDATE HU DATA ============
    // Validate confidence score (must be >= 0.5 per design)
    const MIN_CONFIDENCE = 0.3;
    if (ocrResponse.confidence < MIN_CONFIDENCE) {
      console.warn(`[RECEIVING] Low confidence score: ${ocrResponse.confidence}`);
      return NextResponse.json(
        {
          success: false,
          error: `OCR confidence too low (${(ocrResponse.confidence * 100).toFixed(1)}%). Please ensure label is clear and well-lit.`,
          confidence: ocrResponse.confidence,
        },
        { status: 400 }
      );
    }

    // Check for duplicate HU label (prevent re-scanning same pallet)
    const { data: existingHU, error: checkError } = await supabase
      .from('hu_labels')
      .select('id')
      .eq('product_sku', ocrResponse.product_sku)
      .eq('company_id', companyId)
      .eq('warehouse_id', warehouseId);

    if (checkError) {
      console.error(`[RECEIVING] Database error checking duplicate:`, checkError);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    if (existingHU && existingHU.length > 0) {
      console.warn(`[RECEIVING] Duplicate HU detected: ${ocrResponse.hu_label}`);
      await logAuditEvent(supabase, {
        company_id: companyId,
        warehouse_id: warehouseId,
        operation_type: 'DUPLICATE_HU_DETECTED',
        operator_id: user.id,
        details: {
          hu_label: ocrResponse.hu_label,
          message: 'Attempted to scan already registered HU label',
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: `HU label "${ocrResponse.hu_label}" is already registered in the system.`,
        },
        { status: 409 }
      );
    }

    // ============ STEP 4: REGISTER PALLET IN SYSTEM ============
    // Create HU label record
    const { data: huLabel, error: huError } = await supabase
      .from('hu_labels')
      .insert({
        hu_code: ocrResponse.hu_label,
        company_id: companyId,
        warehouse_id: warehouseId,
        product_name: ocrResponse.product_name,
        quantity: ocrResponse.qty,
        net_weight_kg: ocrResponse.net_weight,
        batch_number: ocrResponse.batch,
        ocr_confidence: ocrResponse.confidence,
        created_at: new Date().toISOString(),
        product_sku: ocrResponse.product_sku,
        item_category: 'PACKAGING',
      })
      .select()
      .single();

    if (huError) {
      console.error(`[RECEIVING] Error creating HU label:`, huError);
      return NextResponse.json(
        { success: false, error: 'Failed to register HU label' },
        { status: 500 }
      );
    }

    // Create pallet record (status: RECEIVED)
    const { data: pallet, error: palletError } = await supabase
      .from('pallets')
      .insert({
        hu_id: huLabel.id,
        quantity: ocrResponse.qty,
        batch: ocrResponse.batch,
        status: 'RECEIVED',
        company_id: companyId,
        warehouse_id: warehouseId,
        received_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (palletError) {
      console.error(`[RECEIVING] Error creating pallet:`, palletError);
      return NextResponse.json(
        { success: false, error: 'Failed to create pallet record' },
        { status: 500 }
      );
    }

    // Create receiving operation audit record
    const { error: receivingError } = await supabase.from('receiving').insert({
      hu_id: huLabel.id,
      operator_id: user.id,
      company_id: companyId,
      warehouse_id: warehouseId,
      received_time: new Date().toISOString(),
      status: 'RECEIVED',
      created_at: new Date().toISOString(),
      qty: ocrResponse.qty,
      pallet_id: pallet.id,
    });

    if (receivingError) {
      console.error(`[RECEIVING] Error creating receiving record:`, receivingError);
    }

    // ============ STEP 5: GENERATE PUTAWAY SUGGESTION ============
    // Get warehouse location suggestions using Claude AI
    let suggestedLocations: SuggestedLocation[] = [];

    try {
      // Fetch all available locations from the warehouse
      // Try location_occupancy view first (if migration applied)
      console.log(`[RECEIVING] Fetching locations for warehouse: ${warehouseId}, company: ${companyId}`);

      let { data: warehouseLocations, error: locError } = await supabase
        .from('location_occupancy')
        .select('location_id, location_code, grid_zone, grid_row, grid_column, max_stacks, status, current_occupancy, available_slots, area')
        .eq('warehouse_id', warehouseId)
        .eq('company_id', companyId)
        .neq('status', 'DISABLED');

      // If view doesn't exist, fallback to raw warehouse_locations table
      if (locError) {
        console.warn(`[RECEIVING] ⚠️ location_occupancy view failed, falling back to warehouse_locations:`, locError.message);

        const { data: rawLocations, error: rawError } = await supabase
          .from('warehouse_locations')
          .select('id, location_code, grid_zone, grid_row, grid_column, max_stacks, status, area')
          .eq('warehouse_id', warehouseId)
          .eq('company_id', companyId)
          .neq('status', 'DISABLED');

        if (rawError) {
          console.error(`[RECEIVING] Error fetching locations:`, rawError);
          throw new Error(`Failed to fetch warehouse locations: ${rawError.message}`);
        }

        // Calculate occupancy for each location
        // Count both PUTAWAY_PENDING and STORED pallets
        warehouseLocations = await Promise.all(
          (rawLocations || []).map(async (loc: any) => {
            const { data: pallets, error } = await supabase
              .from('pallets')
              .select('id')
              .eq('location_id', loc.id)
              .eq('company_id', companyId)
              .in('status', ['PUTAWAY_PENDING', 'STORED']);

            const currentOccupancy = pallets?.length || 0;
            console.log(`[RECEIVING] Location ${loc.location_code}: ${currentOccupancy} pallets`);

            return {
              ...loc,
              current_occupancy: currentOccupancy,
              available_slots: Math.max(0, loc.max_stacks - currentOccupancy),
            };
          })
        );
      }

      if (!warehouseLocations || warehouseLocations.length === 0) {
        console.warn(`[RECEIVING] No available locations found for warehouse ${warehouseId}`);
        throw new Error('No locations available in warehouse');
      }

      console.log(`[RECEIVING] Found ${warehouseLocations.length} locations, requesting AI suggestions...`);

      // Import the AI location suggestion service
      const { locationSuggestionService } = await import('@/lib/ai/location-suggestion.service');

      // Use Claude AI to suggest optimal locations
      const aiSuggestions = await locationSuggestionService.suggestLocations({
        pallet: {
          hu_label: ocrResponse.hu_label,
          product_name: ocrResponse.product_name,
          qty: ocrResponse.qty,
          batch: ocrResponse.batch,
          net_weight: ocrResponse.net_weight,
          item_category: 'PACKAGING'
        },
        availableLocations: warehouseLocations as any,
        warehouseId,
        companyId,
      });

      suggestedLocations = aiSuggestions;
      console.log(`[RECEIVING] Claude AI suggested ${suggestedLocations.length} locations`);

    } catch (aiError) {
      console.warn(`[RECEIVING] AI location suggestion failed, using simple fallback:`, aiError);

      // Fallback: Simple rule-based suggestion
      try {
        const { data: locations, error: locError } = await supabase
          .from('warehouse_locations')
          .select('id, location_code, max_stacks')
          .eq('warehouse_id', warehouseId)
          .eq('company_id', companyId)
          .neq('status', 'DISABLED')
          .limit(5);

        if (locError || !locations || locations.length === 0) {
          console.warn(`[RECEIVING] No locations found in warehouse_locations table`);
          suggestedLocations = [];
        } else {
          // Calculate occupancy for fallback locations
          // Count both PUTAWAY_PENDING and STORED pallets
          suggestedLocations = await Promise.all(
            locations.map(async (loc: any) => {
              const { data: pallets } = await supabase
                .from('pallets')
                .select('id')
                .eq('location_id', loc.id)
                .eq('company_id', companyId)
                .in('status', ['PUTAWAY_PENDING', 'STORED']);

              const currentOccupancy = pallets?.length || 0;
              const capacityPercent = Math.max(
                0,
                ((loc.max_stacks - currentOccupancy) / loc.max_stacks) * 100
              );

              console.log(
                `[RECEIVING] Fallback - ${loc.location_code}: ${currentOccupancy}/${loc.max_stacks} (${capacityPercent.toFixed(1)}%)`
              );

              return {
                location_id: loc.id,
                location_code: loc.location_code,
                capacity_available: capacityPercent,
                distance_score: 0.9,
              };
            })
          );

          console.log(`[RECEIVING] Using fallback suggestions: ${suggestedLocations.length} locations`);
        }
      } catch (fallbackError) {
        console.error(`[RECEIVING] Fallback location suggestion also failed:`, fallbackError);
        suggestedLocations = [];
      }
    }

    // Log successful receiving operation
    await logAuditEvent(supabase, {
      company_id: companyId,
      warehouse_id: warehouseId,
      operation_type: 'HU_RECEIVED',
      operator_id: user.id,
      details: {
        hu_label: ocrResponse.hu_label,
        product_name: ocrResponse.product_name,
        qty: ocrResponse.qty,
        batch: ocrResponse.batch,
        confidence: ocrResponse.confidence,
        pallet_id: pallet.id,
        ocr_processing_time_ms: ocrResponse.processing_time_ms,
      },
    });

    console.log(`[RECEIVING] Successfully created pallet: ${pallet.id}`);

    return NextResponse.json({
      success: true,
      pallet: {
        id: pallet.id,
        hu_label: ocrResponse.hu_label,
        product_name: ocrResponse.product_name,
        net_weight: ocrResponse.net_weight,
        qty: ocrResponse.qty,
        batch: ocrResponse.batch,
        status: 'RECEIVED',
        item_category: 'PACKAGING',
        product_sku: ocrResponse.product_sku
      },
      suggested_locations: suggestedLocations,
      next_step: 'PUTAWAY',
      confidence: ocrResponse.confidence,
    });
  } catch (error) {
    console.error(`[RECEIVING] Error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Receiving failed: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * Log audit event for compliance and tracking
 */
async function logAuditEvent(
  supabase: any,
  {
    company_id,
    warehouse_id,
    operation_type,
    operator_id,
    details,
  }: {
    company_id: string;
    warehouse_id: string;
    operation_type: string;
    operator_id: string;
    details: Record<string, any>;
  }
) {
  try {
    await supabase.from('audit_logs').insert({
      company_id,
      warehouse_id,
      operation_type,
      operator_id,
      details,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn(`[AUDIT] Failed to log event:`, error);
    // Don't throw - audit logging should not fail the operation
  }
}
