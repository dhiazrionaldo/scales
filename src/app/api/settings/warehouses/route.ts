import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's company
    const { data: userCompany, error: userError } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (userError || !userCompany) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 }
      );
    }

    // Get warehouses
    const { data: warehouses, error: warehouseError } = await supabase
      .from("warehouses")
      .select("*")
      .eq("company_id", userCompany.company_id);

    if (warehouseError) {
      return NextResponse.json(
        { error: "Failed to fetch warehouses" },
        { status: 500 }
      );
    }

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Warehouses API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's company
    const { data: userCompany } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!userCompany) {
      return NextResponse.json(
        { error: "No company assigned" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { data, error } = await supabase
      .from("warehouses")
      .insert([
        {
          ...body,
          company_id: userCompany.company_id,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Warehouses API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
