"use client";

import { useAuth } from "@/components/auth-provider";
import { BarChart3, Package, TrendingUp, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { session } = useAuth();
  
  const stats = [
    {
      label: "Total Pallets",
      value: "12,548",
      icon: <Package className="h-6 w-6" />,
      color: "dark:bg-blue-500/20 bg-blue-50",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Active Operations",
      value: "248",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "dark:bg-green-500/20 bg-green-50",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      label: "Pending Putaway",
      value: "42",
      icon: <AlertCircle className="h-6 w-6" />,
      color: "dark:bg-yellow-500/20 bg-yellow-50",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: "System Health",
      value: "98.5%",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "dark:bg-purple-500/20 bg-purple-50",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {session?.user?.user_metadata?.full_name || session?.user?.email}
        </h1>
        <p className="text-slate-400">
          Here&apos;s your warehouse overview for today
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 shadow-2xl">
            <div className={`inline-flex rounded-lg p-3 ${stat.color}`}>
              <span className={stat.iconColor}>
                {stat.icon}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-400">
              {stat.label}
            </h3>
            <p className="mt-2 text-2xl font-bold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activities */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white">
          Recent Activities
        </h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-4 border-t border-slate-800 pt-4">
            <div className="flex-1">
              <p className="font-medium text-white">
                Pallet PL-00145 moved to location A12-03
              </p>
              <p className="text-sm text-slate-400">2 hours ago</p>
            </div>
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/30">
              Completed
            </span>
          </div>
          <div className="flex items-center gap-4 border-t border-slate-800 pt-4">
            <div className="flex-1">
              <p className="font-medium text-white">
                HU scan verification for batch HU-00893
              </p>
              <p className="text-sm text-slate-400">4 hours ago</p>
            </div>
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/30">
              In Progress
            </span>
          </div>
          <div className="flex items-center gap-4 border-t border-slate-800 pt-4">
            <div className="flex-1">
              <p className="font-medium text-white">
                Stock reconciliation completed for Zone B
              </p>
              <p className="text-sm text-slate-400">6 hours ago</p>
            </div>
            <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/30">
              Completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
