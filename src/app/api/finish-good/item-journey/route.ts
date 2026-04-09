/**
 * ITEM JOURNEY REPORT API Route
 * 
 * Fetches complete pallet journey through warehouse lifecycle
 * Tracking: Receiving → Putaway → Gate Out (Shipment)
 * Shows current status, location, and historical timeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface JourneyCheckpoint {
  stage: string; // 'RECEIVING', 'PUTAWAY', 'SHIPMENT'
  status: string;
  timestamp: string | null;
  operatorId: string | null;
}

export interface PalletJourney {
  id: string;
  pallet_id: string;
  hu_label: string;
  product_name: string;
  pic_name: string;
  qty: number;
  batch: string;
  current_location: string;
  current_stage: string;
  current_status: string;
  received_date: string;
  last_updated: string;
  item_category: string;
  checkpoints: JourneyCheckpoint[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouseId');
    const companyId = searchParams.get('companyId');
    const statusFilter = searchParams.get('status');
    const locationFilter = searchParams.get('location');
    const categoryFilter = searchParams.get('item_category');

    if (!warehouseId || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Warehouse ID and Company ID are required' },
        { status: 400 }
      );
    }

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

    console.log(`[ITEM-JOURNEY] Fetching pallet journeys for warehouse: ${warehouseId}`);

    // Query all pallets with their related data
    const { data: pallets, error: palletsError } = await supabase
      .from('pallets')
      .select(
        `
        id,
        status,
        received_at,
        stored_at,
        updated_at,
        location_id,
        hu_id,
        hu_labels(
          hu_code,
          product_name,
          quantity,
          batch_number,
          item_category
        ),
        warehouse_locations(location_code),
        receiving(id, received_time, operator_id),
        putaway_tasks(id, status, completed_at, operator_id),
        outbound(id, shipped_at)
      `
      )
      .eq('warehouse_id', warehouseId)
      .order('received_at', { ascending: false });

    if (palletsError) {
      console.error('[ITEM-JOURNEY] Database error:', palletsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pallet journeys' },
        { status: 500 }
      );
    }

    // Get users for PIC names
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name');

    const userMap = new Map(users?.map((u: any) => [u.id, u.full_name]) || []);
    
    // Get audit logs for detailed timeline
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .in('operation_type', ['PALLET_RECEIVED', 'PALLET_LOCATION_CONFIRMED', 'PALLET_PUTAWAY_COMPLETED', 'PALLET_SHIPPED']);

    const auditMap = new Map<string, any[]>();
    (auditLogs || []).forEach((log: any) => {
      const palletId = log.details?.pallet_id;
      if (palletId) {
        if (!auditMap.has(palletId)) {
          auditMap.set(palletId, []);
        }
        auditMap.get(palletId)!.push(log);
      }
    });

    // Transform data
    const journeys: PalletJourney[] = (pallets || [])
      .map((pallet: any) => {
        const huLabel = Array.isArray(pallet.hu_labels) 
            ? pallet.hu_labels[0] 
            : pallet.hu_labels;
        const location = Array.isArray(pallet.warehouse_locations)
            ? pallet.warehouse_locations[0]
            : pallet.warehouse_locations;
        const receiving = pallet.receiving?.[0];
        const putawayTask = pallet.putaway_tasks?.[0];
        const outbound = pallet.outbound?.[0];
        const auditTrail = auditMap.get(pallet.id) || [];

        // Determine current stage and status
        let currentStage = 'RECEIVING';
        let currentStatus = pallet.status;

        if (pallet.status === 'STORED') {
          currentStage = 'PUTAWAY';
        }
        if (outbound?.shipped_at) {
          currentStage = 'SHIPMENT';
        }

        // Pull IDs from the task tables (operator_id), falling back to the audit logs (user_id)
        const receivedOpId = receiving?.operator_id || auditTrail.find((a: any) => a.operation_type === 'PALLET_RECEIVED')?.user_id;
        const putawayOpId = putawayTask?.operator_id || auditTrail.find((a: any) => a.operation_type === 'PALLET_PUTAWAY_COMPLETED')?.user_id;
        const shippedOpId = outbound?.operator_id || auditTrail.find((a: any) => a.operation_type === 'PALLET_SHIPPED')?.user_id;
        // Build checkpoints timeline with the accurately mapped names
        const checkpoints: JourneyCheckpoint[] = [
          {
            stage: 'RECEIVING',
            status: 'RECEIVED',
            timestamp: receiving?.received_time || pallet.received_at,
            operatorId: receivedOpId || null,
            operatorName: receivedOpId ? (userMap.get(receivedOpId) || 'Unknown') : null,
          },
          {
            stage: 'PUTAWAY',
            status: putawayTask?.status || 'PENDING',
            timestamp: putawayTask?.completed_at || (pallet.stored_at ? pallet.stored_at : null),
            operatorId: putawayOpId || null,
            operatorName: putawayOpId ? (userMap.get(putawayOpId) || 'Unknown') : null,
          },
          {
            stage: 'SHIPMENT',
            status: outbound?.shipped_at ? 'SHIPPED' : 'PENDING',
            timestamp: outbound?.shipped_at || null,
            operatorId: shippedOpId || null,
            operatorName: shippedOpId ? (userMap.get(shippedOpId) || 'Unknown') : null,
          },
        ];
        
        // Get PIC name from the first available audit log using user_id
        const picRecord = checkpoints.find((a: any) => a.operatorId)?.operatorId ? checkpoints.find((a: any) => a.operatorId) : auditTrail.find((a: any) => a.user_id);
        const picName = picRecord ? (userMap.get(picRecord.operatorId) || 'Unknown') : 'Pending';
        
        return {
          id: pallet.id,
          pallet_id: pallet.id,
          hu_label: huLabel?.hu_code || 'N/A',
          product_name: huLabel?.product_name || 'N/A',
          pic_name: picName,
          qty: huLabel?.quantity || 0,
          batch: huLabel?.batch_number || 'N/A',
          current_location: location?.location_code || 'Not Assigned',
          current_stage: currentStage,
          current_status: currentStatus,
          received_date: receiving?.received_time || pallet.received_at,
          last_updated: pallet.updated_at,
          checkpoints,
          item_category: huLabel.item_category
        };
      })
      .filter((journey) => {
        // Filter by status
        if (statusFilter && journey.current_status !== statusFilter) {
          return false;
        }
        // Filter by location
        if (locationFilter && !journey.current_location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
        // Filter by category
        if (categoryFilter && !journey.item_category.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
        return true;
      });

    // Get unique statuses for filter options
    const statuses = Array.from(new Set(journeys.map((j) => j.current_status))).sort();
    const locations = Array.from(new Set(journeys.map((j) => j.current_location).filter((l) => l !== 'Not Assigned'))).sort();

    console.log(`[ITEM-JOURNEY] Found ${journeys.length} pallet journeys`);
    const item_category = Array.from(new Set(journeys.map((j) => j.item_category).filter(Boolean))).sort();

    return NextResponse.json({
      success: true,
      data: journeys,
      statuses,
      locations,
      item_category
    });
  } catch (error) {
    console.error('[ITEM-JOURNEY] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
