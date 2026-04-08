"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Permission {
  module: string;
  action: string;
}

interface PermissionsContextType {
  permissions: Permission[];
  userRoleName: string | null;
  loading: boolean;
  can: (module: string, action: string) => boolean;
  isAdmin: boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: [],
  userRoleName: null,
  loading: true,
  can: () => false,
  isAdmin: false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userRoleName, setUserRoleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPermissions() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          setLoading(false);
          return;
        }

        // Get user's role in their company (use first company)
        const { data: userCompany } = await supabase
          .from("user_companies")
          .select("role_id, roles(id, name)")
          .eq("user_id", userData.user.id)
          .limit(1)
          .maybeSingle();

        if (!userCompany) {
          setLoading(false);
          return;
        }

        const roleId = userCompany.role_id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roleName = (userCompany.roles as any)?.name || null;
        setUserRoleName(roleName);

        // Get all permission IDs for this role
        const { data: rolePermissions } = await supabase
          .from("role_permissions")
          .select("permissions(module, action)")
          .eq("role_id", roleId);

        const perms: Permission[] = (rolePermissions || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((rp: any) => rp.permissions)
          .filter(Boolean);

        setPermissions(perms);
      } catch (error) {
        console.error("Error loading permissions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPermissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Administrator role bypasses all permission checks
  const isAdmin =
    userRoleName?.toLowerCase().includes("admin") === true ||
    userRoleName?.toLowerCase().includes("administrator") === true;

  function can(module: string, action: string): boolean {
    if (isAdmin) return true;
    return permissions.some((p) => p.module === module && p.action === action);
  }

  return (
    <PermissionsContext.Provider value={{ permissions, userRoleName, loading, can, isAdmin }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
