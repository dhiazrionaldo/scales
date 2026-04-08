/**
 * PUTAWAY REPORT API Route
 * 
 * Fetches putaway tasks (pallets pending placement at assigned locations)
 * Shows pallets with PUTAWAY_PENDING status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface PutawayItem {
  id: string;
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
  net_weight: number;
  location_code: string;
  received_time: string;
  assigned_time: string;
  status: string;
  pallet_id: string;
}

interface PutawayMetrics {
  total_pending: number;
  total_quantity: number;
  assigned_locations: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouseId');
    const companyId = searchParams.get('companyId');
    const locationFilter = searchParams.get('location');

    // Validate required parameters
    if (!warehouseId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Warehouse ID and Company ID are required' },
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

    console.log(`[PUTAWAY-REPORT] Fetching putaway tasks for warehouse: ${warehouseId}`);

    // Query putaway tasks (PENDING status) from putaway_tasks table
    let query = supabase
      .from('putaway_tasks')
      .select(
        `
        id,
        pallet_id,
        status,
        created_at,
        updated_at,
        pallets!inner(
          hu_labels!inner(
            hu_code,
            product_name,
            quantity,
            batch_number,
            net_weight_kg,
            item_category
          ),
          warehouse_locations(location_code) 
        )
      `
      )
      .eq('warehouse_id', warehouseId)
      .eq('status', 'PENDING')
      .eq('pallets.hu_labels.item_category', 'JIT');

    const { data: putawayTasks, error: fetchError } = await query;
    console.log('putawayTasks: ', putawayTasks)
    if (fetchError) {
      console.error('[PUTAWAY-REPORT] Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch putaway tasks' },
        { status: 500 }
      );
    }

    // Transform data
    const transformedItems: PutawayItem[] = (putawayTasks || [])
    .map((item: any) => {
        const pallet = Array.isArray(item.pallets) 
        ? item.pallets[0] 
        : item.pallets;
        const huLabel = Array.isArray(pallet?.hu_labels)
        ? pallet.hu_labels[0]
        : pallet?.hu_labels;
        const location = Array.isArray(pallet?.warehouse_locations)
        ? pallet.warehouse_locations[0]
        : pallet?.warehouse_locations;

        console.log('pallet:', pallet);      // 👈 temp debug
        console.log('huLabel:', huLabel);    // 👈 temp debug

        return {
        id: item.id,
        hu_label: huLabel?.hu_code || 'N/A',
        product_name: huLabel?.product_name || 'N/A',
        qty: huLabel?.quantity || 0,
        batch: huLabel?.batch_number || 'N/A',
        net_weight: huLabel?.net_weight_kg || 0,
        location_code: location?.location_code || 'Unassigned',       // 👈 not in your select, add it if needed
        received_time: item.created_at,
        assigned_time: item.created_at,
        status: item.status,
        pallet_id: item.pallet_id,
        };
    })
    .filter((item) => {
        if (!locationFilter) return true;
        return item.location_code.toLowerCase().includes(locationFilter.toLowerCase());
    });

    // Calculate metrics
    const metrics: PutawayMetrics = {
      total_pending: transformedItems.length,
      total_quantity: transformedItems.reduce((sum, item) => sum + item.qty, 0),
      assigned_locations: new Set(transformedItems.map((item) => item.location_code)).size,
    };

    // Get unique locations for filter
    const allLocations = Array.from(
      new Set(transformedItems.map((item) => item.location_code))
    )
      .filter((loc) => loc !== 'Unassigned')
      .sort();

    console.log(`[PUTAWAY-REPORT] Found ${transformedItems.length} putaway tasks`);

    return NextResponse.json({
      success: true,
      data: transformedItems,
      metrics,
      locations: allLocations,
    });
  } catch (error) {
    console.error('[PUTAWAY-REPORT] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
