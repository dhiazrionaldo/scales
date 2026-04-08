/**
 * CONFIRM PALLET LOCATION API Route
 * 
 * Confirms pallet location assignment after receiving
 * Updates pallet with location_id and transitions status to STORED
 * Based on warehouse-flow.md Putaway Confirmation step
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface ConfirmLocationRequest {
  palletId: string;
  locationId: string;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ConfirmLocationRequest = await request.json();
    const { palletId, locationId } = body;

    // Validate inputs
    if (!palletId || !locationId) {
      return NextResponse.json(
        { success: false, error: 'Pallet ID and Location ID are required' },
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

    console.log(`[CONFIRM-LOCATION] Confirming pallet ${palletId} to location ${locationId}`);

    // Verify pallet exists
    const { data: pallet, error: palletError } = await supabase
      .from('pallets')
      .select('id, status, hu_id, warehouse_id, company_id')
      .eq('id', palletId)
      .single();

    if (palletError || !pallet) {
      console.error(`[CONFIRM-LOCATION] Pallet not found:`, palletError);
      return NextResponse.json(
        { success: false, error: 'Pallet not found' },
        { status: 404 }
      );
    }

    // Verify location exists and is available
    const { data: location, error: locationError } = await supabase
      .from('warehouse_locations')
      .select('id, location_code, warehouse_id, status')
      .eq('id', locationId)
      .single();

    if (locationError || !location) {
      console.error(`[CONFIRM-LOCATION] Location not found:`, locationError);
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }

    // Verify location belongs to same warehouse
    if (location.warehouse_id !== pallet.warehouse_id) {
      return NextResponse.json(
        { success: false, error: 'Location does not belong to pallet warehouse' },
        { status: 400 }
      );
    }

    // Get HU label data for inventory
    const { data: huLabel, error: huError } = await supabase
      .from('hu_labels')
      .select('id, product_name, product_sku, quantity, batch_number, item_category')
      .eq('id', pallet.hu_id)
      .single();

    if (huError || !huLabel) {
      console.error(`[CONFIRM-LOCATION] Error fetching HU label:`, huError);
    }

    // Update pallet with location and status to PUTAWAY_PENDING
    // Pallet will transition to STORED when operator physically places it at location
    const { data: updatedPallet, error: updateError } = await supabase
      .from('pallets')
      .update({
        location_id: locationId,
        status: 'PUTAWAY_PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', palletId)
      .select()
      .single();

    if (updateError) {
      console.error(`[CONFIRM-LOCATION] Error updating pallet:`, updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update pallet location' },
        { status: 500 }
      );
    }

    // ============ CREATE PUTAWAY TASK ============
    // Create putaway_tasks record for operator to complete placement
    const { error: putawayTaskError } = await supabase.from('putaway_tasks').insert({
      company_id: pallet.company_id,
      warehouse_id: pallet.warehouse_id,
      pallet_id: palletId,
      suggested_location_id: locationId,
      confirmed_location_id: null, // Will be set when operator confirms placement
      operator_id: user.id,
      status: 'PENDING', // Operator needs to confirm placement
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (putawayTaskError) {
      console.warn(`[CONFIRM-LOCATION] Warning: Failed to create putaway_tasks record:`, putawayTaskError);
    }

    // ============ UPDATE INVENTORY ============
    // Create or update inventory record
    if (huLabel) {
      const { data: existingInventory, error: invQueryError } = await supabase
        .from('inventory')
        .select('id, total_qty, available_qty')
        .eq('company_id', pallet.company_id)
        .eq('warehouse_id', pallet.warehouse_id)
        .eq('product_name', huLabel.product_name)
        .eq('batch_number', huLabel.batch_number)
        .eq('item_category', huLabel.item_category)
        .single();

      if (!invQueryError && existingInventory) {
        // Update existing inventory
        await supabase
          .from('inventory')
          .update({
            total_qty: existingInventory.total_qty + huLabel.quantity,
            available_qty: existingInventory.available_qty + huLabel.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInventory.id);
      } else {
        // Create new inventory record
        await supabase.from('inventory').insert({
          company_id: pallet.company_id,
          warehouse_id: pallet.warehouse_id,
          product_name: huLabel.product_name,
          product_sku: huLabel.product_sku,
          batch_number: huLabel.batch_number,
          total_qty: huLabel.quantity,
          available_qty: huLabel.quantity,
          reserved_qty: 0,
          damaged_qty: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          item_category: 'PACKAGING'
        });
      }

      // Create inventory_locations record to track pallet location
      const { error: invLocError } = await supabase.from('inventory_locations').insert({
        pallet_id: palletId,
        location_id: locationId,
        product_name: huLabel.product_name,
        product_sku: huLabel.product_sku,
        batch_number: huLabel.batch_number,
        quantity: huLabel.quantity,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        item_category: 'PACKAGING'
      });

      if (invLocError) {
        console.warn(`[CONFIRM-LOCATION] Warning: Failed to create inventory_locations record:`, invLocError);
      }
    }

    // Log audit event
    await logAuditEvent(supabase, {
      company_id: pallet.company_id,
      warehouse_id: pallet.warehouse_id,
      operation_type: 'PALLET_LOCATION_CONFIRMED',
      operator_id: user.id,
      details: {
        pallet_id: palletId,
        location_id: locationId,
        location_code: location.location_code,
        status: 'PUTAWAY_PENDING',
      },
    });

    console.log(`[CONFIRM-LOCATION] Successfully confirmed pallet ${palletId} at location ${location.location_code}`);

    return NextResponse.json({
      success: true,
      pallet: updatedPallet,
      message: `Pallet location confirmed. Status: PUTAWAY_PENDING - Ready for physical placement at location ${location.location_code}`,
    });
  } catch (error) {
    console.error(`[CONFIRM-LOCATION] Error:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: `Location confirmation failed: ${errorMessage}`,
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
