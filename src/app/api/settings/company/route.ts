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

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("*")
      .eq("id", userCompany.company_id)
      .single();

    if (companyError) {
      return NextResponse.json(
        { error: "Failed to fetch company" },
        { status: 500 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = await createClient();

    // Get current user (check auth)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create company
    const { data: newCompany, error: createError } = await supabase
      .from("companies")
      .insert({
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        country: body.country || null,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating company:", createError);
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 }
      );
    }

    if (!newCompany) {
      return NextResponse.json(
        { error: "Failed to create company" },
        { status: 500 }
      );
    }

    // Get admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "ADMIN")
      .single();

    if (roleError || !adminRole) {
      console.error("Error fetching admin role:", roleError);
      // Try to rollback company creation
      await supabase.from("companies").delete().eq("id", newCompany.id);

      return NextResponse.json(
        { error: "Failed to assign role to user" },
        { status: 500 }
      );
    }

    // Assign user to new company as admin
    const { error: assignError } = await supabase
      .from("user_companies")
      .insert({
        user_id: user.id,
        company_id: newCompany.id,
        role_id: adminRole.id,
      });

    if (assignError) {
      console.error("Error assigning user to company:", assignError);
      // Try to rollback company creation
      await supabase.from("companies").delete().eq("id", newCompany.id);

      return NextResponse.json(
        { error: "Failed to assign user to company" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newCompany }, { status: 201 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id: companyId, ...updateData } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Verify user is assigned to this company
    const { data: userCompany, error: checkError } = await supabase
      .from("user_companies")
      .select("company_id")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .single();

    if (checkError || !userCompany) {
      return NextResponse.json(
        { error: "You don't have permission to update this company" },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("companies")
      .update(updateData)
      .eq("id", companyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    // Use service role to bypass RLS
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user is assigned to this company
    const { data: userCompany, error: checkError } = await supabase
      .from("user_companies")
      .select("role_id")
      .eq("company_id", body.companyId)
      .eq("user_id", user.id)
      .single();

    if (checkError || !userCompany) {
      return NextResponse.json(
        { error: "You don't have permission to delete this company" },
        { status: 403 }
      );
    }

    // Delete company (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from("companies")
      .delete()
      .eq("id", body.companyId);

    if (deleteError) {
      console.error("Error deleting company:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete company" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
