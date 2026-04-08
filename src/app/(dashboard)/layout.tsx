"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { PermissionsProvider, usePermissions } from "@/contexts/permissions-context";
import Image from "next/image"
import logo from '@/asset/logo-white.png';
import { SettingsProvider, useSettingsContext } from "../(dashboard)/settings/settings-context";

// Get initials from full name
function getInitials(fullName: string | null): string {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map((name) => name.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// Get avatar background color based on initials
function getAvatarColor(initials: string): string {
  const colors = [
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-cyan-500",
  ];
  const charCode = initials.charCodeAt(0);
  return colors[charCode % colors.length];
}

// Get readable module name from pathname
function getModuleName(pathname: string): string {
  const path = pathname.split("/").filter(Boolean).pop() || "dashboard";
  const moduleNames: Record<string, string> = {
    dashboard: "Dashboard",
    receiving: "Receiving",
    putaway: "Putaway",
    picking: "Picking",
    "gate-out": "Gate Out",
    "stock-taking": "Stock Taking",
    inventory: "Inventory",
    pallet: "Pallet",
    audit: "Audit",
  };
  return moduleNames[path] || path.charAt(0).toUpperCase() + path.slice(1);
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading, isAuthenticated, user } = useAuth();
  const { userRoleName } = usePermissions();
  const moduleName = getModuleName(pathname);
  const { companies, selectedCompany, setSelectedCompanyId, loadingCompanies } = useSettingsContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Image src={logo} alt="" className="mx-auto p-5 mb-4 h-15 w-26"/>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="warehouse-main md:ml-56 dark bg-slate-950">
      {/* Gradient background effect */}
      <div className="absolute inset-0 h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>
      <Sidebar />
      <div className="warehouse-topbar p-4 h-16 border-b flex items-center justify-end px-4 md:px-6 bg-slate-900/50 backdrop-blur-xl border-slate-800">
        {/* <span className="hidden md:flex text-2xl font-semibold text-white items-left">{moduleName}</span> */}
        <div className="flex items-center gap-4">
          {companies.map((comp) => (
            <label
              key={comp.id}
              className={`p-3 text-xs font-medium whitespace-nowrap rounded rounded-lg ${comp.id === selectedCompany?.id
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-slate-700/20 text-slate-400 border border-slate-700/30"
                }`}
              onClick={() => setSelectedCompanyId(comp.id)}
            >
              {comp.name}
            </label>
          ))}
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors">
              {/* Avatar with initials */}
              <div
                className={`${getAvatarColor(
                  getInitials(user.full_name)
                )} w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm`}
              >
                {getInitials(user.full_name)}
              </div>
              {/* User info */}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {user.full_name || "User"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-400">{user.email}</p>
                  {userRoleName && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {userRoleName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="warehouse-content bg-slate-950">
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PermissionsProvider>
      <SettingsProvider>
        <DashboardContent>{children}</DashboardContent>
      </SettingsProvider>
    </PermissionsProvider>
  );
}
