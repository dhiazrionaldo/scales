/**
 * INVENTORY REPORT API Route
 * 
 * Fetches inventory data with metrics for the inventory report
 * Used for inventory reports dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface InventoryItem {
  id: string;
  product_name: string;
  batch_number: string;
  location_code: string;
  quantity: number;
  total_qty: number;
  available_qty: number;
  damaged_qty: number;
  created_at: string;
  item_category: string;
}

interface InventoryMetrics {
  total_items: number;
  total_availability: number;
  total_damaged: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const warehouseId = searchParams.get('warehouseId');
    const companyId = searchParams.get('companyId');
    const locationFilter = searchParams.get('location');
    const categoryFilter = searchParams.get('item_category');
    
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

    // Query inventory with location data
    let query = supabase
      .from('inventory_locations')
      .select(
        `
        id,
        product_name,
        batch_number,
        quantity,
        created_at,
        location_id,
        warehouse_locations(location_code),
        pallets(
          id,
          company_id,
          warehouse_id
        ),
        item_category
      `
      )
      .eq('pallets.warehouse_id', warehouseId);

    const { data: inventoryLocations, error: fetchError } = await query;
    
    if (fetchError) {
      console.error('[INVENTORY-REPORT] Database error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch inventory items' },
        { status: 500 }
      );
    }
    

    // Query inventory summary for metrics
    let metricsQuery = supabase
      .from('inventory')
      .select('total_qty, available_qty, damaged_qty, created_at')
      .eq('warehouse_id', warehouseId)
      .eq('company_id', companyId);

    const { data: inventoryMetrics, error: metricsError } = await metricsQuery;
    
    if (metricsError) {
      console.error('[INVENTORY-REPORT] Error fetching metrics:', metricsError);
    }

    // Transform inventory locations data
    const transformedItems: InventoryItem[] = (inventoryLocations || [])
      .map((item: any) => {
        const location = item.warehouse_locations?.[0];
        
        return {
          id: item.id,
          product_name: item.product_name || 'N/A',
          batch_number: item.batch_number || 'N/A',
          location_code: item.warehouse_locations.location_code || 'Unassigned',
          quantity: item.quantity || 0,
          total_qty: item.quantity || 0,
          available_qty: item.quantity || 0,
          damaged_qty: 0,
          created_at: item.created_at,
          item_category: item.item_category
        };
      })
      .filter((item) => {
        if (!locationFilter) return true;
        return item.location_code.toLowerCase().includes(locationFilter.toLowerCase());
      })
      .filter((item) => {
        if (!categoryFilter) return true;
        return item.item_category.toLowerCase().includes(categoryFilter.toLowerCase());
      });

    // Calculate metrics
    const metrics: InventoryMetrics = {
      total_items: transformedItems.reduce((sum, item) => sum + item.quantity, 0),
      total_availability: inventoryMetrics
        ? inventoryMetrics.reduce((sum: number, item: any) => sum + (item.available_qty || 0), 0)
        : transformedItems.reduce((sum, item) => sum + item.available_qty, 0),
      total_damaged: inventoryMetrics
        ? inventoryMetrics.reduce((sum: number, item: any) => sum + (item.damaged_qty || 0), 0)
        : 0,
    };

    // Get all unique locations for filter
    const allLocations = Array.from(
      new Set(transformedItems.map((item) => item.location_code))
    ).sort();
    
    const allCategory = Array.from(
      new Set(transformedItems.map((item) => item.item_category))
    ).sort();

    return NextResponse.json({
      success: true,
      data: transformedItems,
      metrics,
      locations: allLocations,
      item_category: allCategory
    });
  } catch (error) {
    console.error('[INVENTORY-REPORT] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
