/**
 * COMPLETE PUTAWAY API Route
 * 
 * Confirms pallet placement at assigned location
 * Updates putaway_tasks status to COMPLETED
 * Updates pallet status to STORED
 * Based on warehouse-flow.md Pallet Storage step
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface CompletePutawayRequest {
  putawayTaskId: string;
  palletId: string;
  huCode: string; // Scanning HU again to verify correct pallet
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: CompletePutawayRequest = await request.json();
    const { putawayTaskId, palletId, huCode } = body;

    // Validate inputs
    if (!putawayTaskId || !palletId || !huCode) {
      return NextResponse.json(
        { success: false, error: 'Putaway Task ID, Pallet ID, and HU Code are required' },
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

    console.log(`[COMPLETE-PUTAWAY] Completing putaway task ${putawayTaskId} for pallet ${palletId}`);

    // Verify putaway task exists
    const { data: putawayTask, error: taskError } = await supabase
      .from('putaway_tasks')
      .select('id, pallet_id, status, warehouse_id, company_id, suggested_location_id')
      .eq('id', putawayTaskId)
      .single();

    if (taskError || !putawayTask) {
      console.error(`[COMPLETE-PUTAWAY] Putaway task not found:`, taskError);
      return NextResponse.json(
        { success: false, error: 'Putaway task not found' },
        { status: 404 }
      );
    }

    // Verify pallet exists and matches the task
    const { data: pallet, error: palletError } = await supabase
      .from('pallets')
      .select('id, status, hu_id, location_id, warehouse_id, company_id')
      .eq('id', palletId)
      .single();

    if (palletError || !pallet) {
      console.error(`[COMPLETE-PUTAWAY] Pallet not found:`, palletError);
      return NextResponse.json(
        { success: false, error: 'Pallet not found' },
        { status: 404 }
      );
    }

    // Verify pallet matches the putaway task
    if (pallet.id !== putawayTask.pallet_id) {
      return NextResponse.json(
        { success: false, error: 'Pallet does not match the putaway task' },
        { status: 400 }
      );
    }

    // Verify HU code matches
    const { data: huLabel, error: huError } = await supabase
      .from('hu_labels')
      .select('id, hu_code, product_name, quantity, batch_number')
      .eq('id', pallet.hu_id)
      .single();

    if (huError || !huLabel) {
      console.error(`[COMPLETE-PUTAWAY] HU label not found:`, huError);
      return NextResponse.json(
        { success: false, error: 'HU label not found' },
        { status: 404 }
      );
    }

    // Validate HU code matches (case-insensitive)
    if (huLabel.hu_code.toUpperCase() !== huCode.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: `HU code mismatch. Expected ${huLabel.hu_code}, got ${huCode}` },
        { status: 400 }
      );
    }

    // Get location information
    const { data: location, error: locationError } = await supabase
      .from('warehouse_locations')
      .select('id, location_code')
      .eq('id', pallet.location_id)
      .single();

    if (locationError || !location) {
      console.error(`[COMPLETE-PUTAWAY] Location not found:`, locationError);
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Update pallet status to STORED
    const { data: updatedPallet, error: updateError } = await supabase
      .from('pallets')
      .update({
        status: 'STORED',
        stored_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', palletId)
      .select()
      .single();

    if (updateError) {
      console.error(`[COMPLETE-PUTAWAY] Error updating pallet status:`, updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update pallet status' },
        { status: 500 }
      );
    }

    // Complete putaway task
    const { data: completedTask, error: completeError } = await supabase
      .from('putaway_tasks')
      .update({
        status: 'COMPLETED',
        confirmed_location_id: pallet.location_id,
        operator_id: user.id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', putawayTaskId)
      .select()
      .single();

    if (completeError) {
      console.error(`[COMPLETE-PUTAWAY] Error completing putaway task:`, completeError);
      return NextResponse.json(
        { success: false, error: 'Failed to complete putaway task' },
        { status: 500 }
      );
    }

    // Create stock movement record
    await supabase.from('stock_movements').insert({
      company_id: pallet.company_id,
      warehouse_id: pallet.warehouse_id,
      pallet_id: palletId,
      from_location: null, // Coming from receiving
      to_location: pallet.location_id,
      movement_type: 'PUTAWAY',
      operator_id: user.id,
      created_at: new Date().toISOString(),
    });

    // Log audit event
    await logAuditEvent(supabase, {
      company_id: pallet.company_id,
      warehouse_id: pallet.warehouse_id,
      operation_type: 'PALLET_PUTAWAY_COMPLETED',
      operator_id: user.id,
      details: {
        putaway_task_id: putawayTaskId,
        pallet_id: palletId,
        location_id: pallet.location_id,
        location_code: location.location_code,
        hu_code: huLabel.hu_code,
        status: 'STORED',
      },
    });

    console.log(`[COMPLETE-PUTAWAY] Successfully completed putaway for pallet ${palletId}`);

    return NextResponse.json({
      success: true,
      pallet: updatedPallet,
      putawayTask: completedTask,
      message: `Pallet successfully placed at ${location.location_code}. Status updated to STORED.`,
    });
  } catch (error) {
    console.error(`[COMPLETE-PUTAWAY] Error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Putaway completion failed: ${errorMessage}`,
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
  }
}
