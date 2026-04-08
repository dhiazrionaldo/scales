"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Building2, Warehouse, Users, Shield, MapPin } from "lucide-react";
import { SettingsProvider, useSettingsContext } from "./settings-context";

const settingsTabs = [
  {
    name: "Company",
    href: "/settings/company",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    name: "Warehouse",
    href: "/settings/warehouse",
    icon: <Warehouse className="h-4 w-4" />,
  },
  {
    name: "Locations",
    href: "/settings/locations",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    name: "Users",
    href: "/settings/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    name: "Roles",
    href: "/settings/roles",
    icon: <Shield className="h-4 w-4" />,
  },
];

function SettingsLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { companies, selectedCompanyId, setSelectedCompanyId, loadingCompanies } =
    useSettingsContext();

  const showCompanySelector =
    pathname !== "/settings/company" && pathname !== "/settings/roles";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-600/20">
            <Settings className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-sm text-slate-400">Manage your warehouse system</p>
          </div>
        </div>

        {/* Company Selector */}
        {showCompanySelector && !loadingCompanies && companies.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-400 whitespace-nowrap">
              Company
            </label>
            <select
              value={selectedCompanyId || ""}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 min-w-[200px]"
            >
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        {settingsTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {tab.icon}
              <span className="text-sm font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">{children}</div>
    </div>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <SettingsLayoutInner>{children}</SettingsLayoutInner>
    </SettingsProvider>
  );
}
