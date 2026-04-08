import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    // Auth check with normal server client
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Data fetching with admin client (bypasses RLS)
    const adminSupabase = createAdminClient();

    const { data: assignedUsers } = await adminSupabase
      .from("user_companies")
      .select("user_id");

    const assignedUserIds = new Set<string>((assignedUsers?.map((uc: any) => uc.user_id) as string[]) || []);

    const { data: allUsers, error: usersError } = await adminSupabase
      .from("users")
      .select("id, email, full_name");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json({ users: [] });
    }

    const unassignedUsers = allUsers?.filter((u: any) => !assignedUserIds.has(u.id)) || [];
    return NextResponse.json({ users: unassignedUsers });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}