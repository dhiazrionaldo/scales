/**
 * RECEIVED REPORT API Route
 * 
 * Fetches received pallets with location and inventory data
 * Used for the Received Report dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface ReceivedItem {
  id: string;
  hu_label: string;
  product_name: string;
  qty: number;
  net_weight: number;
  batch: string;
  location_code: string;
  received_time: string;
  status: string;
  received_days: number;
}

interface StockMetrics {
  total_stock: number;
  over_3_days_stock: number;
  do_stock: number;
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

    // Query received items with joins to pallets, hu_labels, and locations
    let query = supabase
      .from('receiving')
      .select(
        `
        id,
        status,
        received_time,
        pallets!inner(
          id,
          warehouse_locations(location_code),
          hu_labels!inner(
            hu_code,
            product_name,
            quantity,
            net_weight_kg,
            batch_number,
            item_category
          )
        )
      `
      )
      .eq('pallets.warehouse_id', warehouseId)
      .eq('pallets.hu_labels.warehouse_id', warehouseId)
      .eq('pallets.hu_labels.item_category', 'FINISH_GOOD');

    const { data: receivedItems, error: fetchError } = await query;
    console.log(receivedItems)
    if (fetchError) {
      console.error('[RECEIVED-REPORT] Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch received items' },
        { status: 500 }
      );
    }

    // Transform data to match ReceivedItem interface
    const transformedItems: ReceivedItem[] = (receivedItems || [])
    .map((item: any) => {
        const pallet = item.pallets;
        const huLabel = Array.isArray(pallet?.hu_labels) 
        ? pallet.hu_labels[0] 
        : pallet?.hu_labels;
        const location = Array.isArray(pallet?.warehouse_locations)
        ? pallet.warehouse_locations[0]
        : pallet?.warehouse_locations;
        const receivedDate = new Date(item.received_time);
        const now = new Date();
        const receivedDays = Math.floor(
        (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log('huLabel:', huLabel);        // 👈 temp debug, remove after confirming
        console.log('location:', location);      // 👈 temp debug, remove after confirming

        return {
        id: item.id,
        hu_label: huLabel?.hu_code || 'N/A',
        product_name: huLabel?.product_name || 'N/A',
        qty: huLabel?.quantity || 0,
        net_weight: huLabel?.net_weight_kg || 0,
        batch: huLabel?.batch_number || 'N/A',
        location_code: location?.location_code || 'Unassigned',
        received_time: item.received_time,
        status: item.status,
        received_days: receivedDays,
        item_category: huLabel?.item_category || 'N/A',
        };
    })
    .filter((item) => {
        if (!locationFilter) return true;
        return item.location_code.toLowerCase().includes(locationFilter.toLowerCase());
    });

    // Calculate metrics
    const metrics: StockMetrics = {
      total_stock: transformedItems.reduce((sum, item) => sum + item.qty, 0),
      over_3_days_stock: transformedItems
        .filter((item) => item.received_days > 3)
        .reduce((sum, item) => sum + item.qty, 0),
      do_stock: 0, // This would come from delivery_orders if needed
    };

    // Query for DO stock (items in picking/delivery orders)
    const { data: doItems, error: doError } = await supabase
      .from('picking_tasks')
      .select('qty')
      .eq('warehouse_id', warehouseId)
      .eq('company_id', companyId)
      .in('status', ['pending', 'in_progress']);

    if (!doError && doItems) {
      metrics.do_stock = doItems.reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    }

    return NextResponse.json({
      success: true,
      data: transformedItems,
      metrics,
    });
  } catch (error) {
    console.error('[RECEIVED-REPORT] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
