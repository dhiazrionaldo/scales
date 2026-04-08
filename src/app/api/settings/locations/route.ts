import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/settings/locations?company_id=xxx   → returns { warehouses }
// GET /api/settings/locations?warehouse_id=xxx → returns { locations }
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company_id = request.nextUrl.searchParams.get("company_id");
    const warehouse_id = request.nextUrl.searchParams.get("warehouse_id");

    if (warehouse_id) {
      const { data, error } = await supabase
        .from("warehouse_locations")
        .select("id,warehouse_id,company_id,location_code,grid_zone,grid_row,grid_column,max_stacks,status,created_at,updated_at, area")
        .eq("warehouse_id", warehouse_id)
        .order("grid_zone,grid_row,grid_column");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ locations: data || [] });
    }

    if (company_id) {
      const { data, error } = await supabase
        .from("warehouses")
        .select("id, name")
        .eq("company_id", company_id)
        .order("name");

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ warehouses: data || [] });
    }

    return NextResponse.json({ error: "company_id or warehouse_id is required" }, { status: 400 });
  } catch (error) {
    console.error("Locations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface LocationPayload {
  warehouse_id: string;
  company_id: string;
  location_code: string;
  grid_zone: string;
  grid_row: number;
  grid_column: number;
  max_stacks?: number;
  status?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LocationPayload = await request.json();

    if (!body.warehouse_id) {
      return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
    }

    if (!body.company_id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    if (!body.location_code?.trim()) {
      return NextResponse.json({ error: "Location code is required" }, { status: 400 });
    }

    if (!body.grid_zone?.trim()) {
      return NextResponse.json({ error: "Grid zone is required" }, { status: 400 });
    }

    if (body.grid_row === null || body.grid_row === undefined) {
      return NextResponse.json({ error: "Grid row is required" }, { status: 400 });
    }

    if (body.grid_column === null || body.grid_column === undefined) {
      return NextResponse.json({ error: "Grid column is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: newLocation, error: createError } = await supabase
      .from("warehouse_locations")
      .insert({
        warehouse_id: body.warehouse_id,
        company_id: body.company_id,
        location_code: body.location_code,
        grid_zone: body.grid_zone,
        grid_row: body.grid_row,
        grid_column: body.grid_column,
        max_stacks: body.max_stacks || 4,
        status: body.status || "AVAILABLE",
        area: body.area
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message || "Failed to create location" }, { status: 500 });
    }

    return NextResponse.json({ data: newLocation }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: locationId, warehouse_id, company_id, ...updateData } = body;
    
    if (!locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    if (!warehouse_id) {
      return NextResponse.json({ error: "Warehouse ID is required" }, { status: 400 });
    }

    if (!company_id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: updatedLocation, error: updateError } = await supabase
      .from("warehouse_locations")
      .update(updateData)
      .eq("id", locationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message || "Failed to update location" }, { status: 500 });
    }

    return NextResponse.json(updatedLocation, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.locationId) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from("warehouse_locations")
      .delete()
      .eq("id", body.locationId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete location" }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
