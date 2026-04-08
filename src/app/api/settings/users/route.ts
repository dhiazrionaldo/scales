import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET /api/settings/users?company_id=xxx — list users + roles
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const server = await createServerClient();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company_id = request.nextUrl.searchParams.get("company_id");
    if (!company_id) {
      return NextResponse.json({ error: "company_id is required" }, { status: 400 });
    }

    const [{ data: usersData }, { data: rolesData }, { data: warehousesData }] = await Promise.all([
      supabase
        .from("user_companies")
        .select("id, user_id, company_id, role_id, warehouse_id, users(id, email, full_name), roles(id, name, description), warehouses(id, name)")
        .eq("company_id", company_id),
      supabase.from("roles").select("id, name, description"),
      supabase.from("warehouses").select("id, name").eq("company_id", company_id),
    ]);

    return NextResponse.json({ users: usersData || [], roles: rolesData || [], warehouses: warehousesData || [] });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/settings/users — remove user from company
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const server = await createServerClient();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { user_company_id } = body;

    if (!user_company_id) {
      return NextResponse.json({ error: "user_company_id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("user_companies").delete().eq("id", user_company_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/settings/users — create new user or assign existing user to company
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, email, password, company_id, role_id, user_id, warehouse_id } = body;

    if (!company_id || !role_id) {
      return NextResponse.json({ error: "company_id and role_id are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // If user_id is provided, this is assigning an existing user
    if (user_id) {
      // Update full_name in public users table and auth metadata if provided
      if (full_name !== undefined) {
        await admin.from("users").update({ full_name: full_name.trim() || null }).eq("id", user_id);
        await admin.auth.admin.updateUserById(user_id, {
          user_metadata: { full_name: full_name.trim() || null },
        });
      }

      // Assign to company with role and warehouse
      const { error: assignError } = await admin.from("user_companies").insert({
        user_id,
        company_id,
        role_id,
        warehouse_id: warehouse_id || null,
      });

      if (assignError) {
        return NextResponse.json({ error: "Failed to assign user to company" }, { status: 500 });
      }

      return NextResponse.json({ success: true, user_id }, { status: 200 });
    }

    // Otherwise, create a new user
    if (!full_name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "full_name, email, and password are required for new users" }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: createError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim() },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // Upsert into public users table (in case there's no trigger)
    await admin.from("users").upsert({
      id: newUserId,
      email: email.trim().toLowerCase(),
      full_name: full_name.trim(),
    });

    // Assign to company with role and warehouse
    const { error: assignError } = await admin.from("user_companies").insert({
      user_id: newUserId,
      company_id,
      role_id,
      warehouse_id: warehouse_id || null,
    });

    if (assignError) {
      // Rollback: delete created auth user
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: "Failed to assign user to company" }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_id: newUserId }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/settings/users — update user full_name and/or role
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, user_company_id, full_name, role_id, warehouse_id } = body;

    if (!user_id || !user_company_id) {
      return NextResponse.json({ error: "user_id and user_company_id are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Update full_name in public users table and auth metadata
    if (full_name !== undefined) {
      await admin.from("users").update({ full_name: full_name.trim() || null }).eq("id", user_id);
      await admin.auth.admin.updateUserById(user_id, {
        user_metadata: { full_name: full_name.trim() || null },
      });
    }

    // Update role and warehouse in user_companies
    const updates: any = {};
    if (role_id) updates.role_id = role_id;
    if (warehouse_id !== undefined) updates.warehouse_id = warehouse_id || null;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await admin
        .from("user_companies")
        .update(updates)
        .eq("id", user_company_id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
