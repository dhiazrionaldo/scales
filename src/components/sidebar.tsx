"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  MapPin,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Building2,
  Warehouse,
  GitCompareIcon,
  QrCode,
  LayoutDashboardIcon,
  WarehouseIcon,
  LocateFixedIcon,
  User2Icon,
  ShieldCheck,
  BookOpenCheck,
  FileClock,
  Package2,
  SquareEqual,
  Book,
  DoorOpenIcon,
  PictureInPicture,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image"
import logo from '@/asset/ico.png';
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUserStore } from "@/store/user";
import { usePermissions } from "@/contexts/permissions-context";

interface MenuSection {
  title: string;
  module: string; // permission module name, e.g. "dashboard", "finish_good"
  icon: any;
  items: MenuItem[];
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { warehouse, setWarehouse } = useUserStore();
  const { can, loading: permissionsLoading } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(true);
  const [userWarehouseId, setUserWarehouseId] = useState<string | null>(null);

  // Add this effect to fetch the user's assigned warehouse
  useEffect(() => {
    const fetchUserWarehouse = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_companies')          
        .select('warehouse_id')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return;

      if (data.warehouse_id) {
        setUserWarehouseId(data.warehouse_id);
        setWarehouse(data.warehouse_id); // auto-select it in context
      }
    };

    fetchUserWarehouse();
  }, [supabase]);
  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch warehouses from Supabase
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const { data, error } = await supabase
          .from('warehouses')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setWarehouses(data || []);
      } catch (error) {
        console.error('Failed to load warehouses:', error);
      } finally {
        setIsLoadingWarehouses(false);
      }
    };

    fetchWarehouses();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: "Dashboard",
      module: "dashboard",
      icon: <LayoutDashboardIcon className="h-4 w-4"/>,
      items: [
        {
          name: "Overview",
          href: "/dashboard",
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Finish Good",
      module: "finish_good",
      icon: <SquareEqual className="h-4 w-4"/>,
      items: [
        {
          name: "Receiving",
          href: "/receiving",
          icon: <Package className="h-4 w-4" />,
        },
        {
          name: "Picking",
          href: "/picking",
          icon: <PictureInPicture className="h-4 w-4" />,
        },
        {
          name: "Gate Out",
          href: "/gate-out",
          icon: <DoorOpenIcon className="h-4 w-4" />,
        },
        {
          name: "Receiving Report",
          href: "/receiving/report",
          icon: <Book className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Packaging",
      module: "packaging",
      icon: <Package2 className="h-4 w-4"/>,
      items: [
        {
          name: "QR Generator",
          href: "/qr-generator",
          icon: <QrCode className="h-4 w-4" />,
        },
        {
          name: "Packaging Receiving",
          href: "/packaging-receiving",
          icon: <Package className="h-4 w-4" />,
        },
        {
          name: "Packaging Putaway",
          href: "/packaging-putaway",
          icon: <Boxes className="h-4 w-4" />,
        },
        {
          name: "Receiving Report",
          href: "/packaging-receiving/report",
          icon: <Book className="h-4 w-4" />,
        },
        {
          name: "Putaway Report",
          href: "/packaging-putaway/report",
          icon: <Boxes className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Just In Time",
      module: "JIT",
      icon: <FileClock className="h-4 w-4"/>,
      items: [
        {
          name: "QR Generator",
          href: "/qr-generator",
          icon: <QrCode className="h-4 w-4" />,
        },
        {
          name: "JIT Receiving",
          href: "/jit-receiving",
          icon: <Package className="h-4 w-4" />,
        },
        // {
        //   name: "JIT Putaway",
        //   href: "/jit-putaway",
        //   icon: <Boxes className="h-4 w-4" />,
        // },
        {
          name: "Receiving Report",
          href: "/jit-receiving/report",
          icon: <Book className="h-4 w-4" />,
        },
        {
          name: "Putaway Report",
          href: "/jit-putaway/report",
          icon: <Boxes className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Warehouse",
      module: "warehouse",
      icon: <WarehouseIcon className="h-4 w-4"/>,
      items: [
        {
          name: "Warehouse Map",
          href: "/warehouse-map",
          icon: <MapPin className="h-4 w-4" />,
        },
        {
          name: "Stock Taking",
          href: "/stock-taking",
          icon: <Boxes className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Reports",
      module: "reports",
      icon: <BookOpenCheck className="h-4 w-4"/>,
      items: [
        {
          name: "Inventory",
          href: "/reports/inventory",
          icon: <Warehouse className="h-4 w-4"/>,
        },
        {
          name: "Item Journey",
          href: "/reports/item-journey",
          icon: <GitCompareIcon className="h-4 w-4" />,
        },
        {
          name: "Audit Logs",
          href: "/reports/audit",
          icon: <FileText className="h-4 w-4" />,
        },
      ],
    },
    {
      title: "Settings",
      module: "settings",
      icon: <Settings className="h-4 w-4"/>,
      items: [
        {
          name: "Company",
          href: "/settings/company",
          icon: <Building2 className="h-4 w-4" />,
        },
        {
          name: "Warehouse",
          href: "/settings/warehouse",
          icon: <WarehouseIcon className="h-4 w-4" />,
        },
        {
          name: "Locations",
          href: "/settings/locations",
          icon: <LocateFixedIcon className="h-4 w-4" />,
        },
        {
          name: "Users",
          href: "/settings/users",
          icon: <User2Icon className="h-4 w-4" />,
        },
        {
          name: "Roles",
          href: "/settings/roles",
          icon: <ShieldCheck className="h-4 w-4" />,
        },
      ],
    },
  ];

  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
  const activeSection = menuSections.find((section) =>
      section.items.some((item) => item.href === pathname)
    );
    return activeSection ? [activeSection.title] : ["Dashboard"];
  });

  // Filter sections based on permissions (skip filtering while loading)
  const visibleSections = permissionsLoading
    ? menuSections
    : menuSections.filter((section) => can(section.module, "view"));

  return (
    <>
      {/* Gradient background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      </div>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
      >
        {isOpen ? (
          <X className="h-6 w-6 dark:text-white" />
        ) : (
          <Menu className="h-6 w-6 dark:text-white" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`warehouse-sidebar bg-slate-900/50 backdrop-blur-xl border-slate-800 flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300 ease-in-out`}
      >
        {/* Logo with Mobile Close Button */}
        <div className="flex items-center gap-2  border-b border-b-slate-800 border-warehouse-border border-slate-800 p-4 flex items-center flex-shrink-0 justify-between">
          <div className="flex h-8 sm:h-9 w-8 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-primary/20 ring-1 ring-primary/30 shrink-0">
            <Image src={logo} alt="" className="h-5 sm:h-6 w-5 sm:w-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-sm font-semibold text-sidebar-foreground tracking-tight truncate">SCALES</span>
            <span className="text-[7px] sm:text-[7px] text-sidebar-foreground/40 tracking-widest font-medium hidden sm:block">Warehouse Management System</span>
          </div>
          {/* Close Button - Visible on Mobile Only */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6 text-gray-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Warehouse Selector */}
        <div className="p-4 border-b border-slate-700">
          <label className="text-xs font-semibold uppercase tracking-wider text-warehouse dark:text-slate-400 mb-2 block">
            <Building2 className="inline h-3 w-3 mr-1" />
            Active Warehouse
          </label>
          <select
            value={warehouse || ''}
            onChange={(e) => setWarehouse(e.target.value)}
            disabled={isLoadingWarehouses || !!userWarehouseId}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm hover:border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <option value="">
              {isLoadingWarehouses ? 'Loading...' : 'Select Warehouse'}
            </option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
          {!warehouse && (
            <p className="text-xs text-amber-400 mt-2">
              ⚠️ Please select a warehouse to proceed
            </p>
          )}
        </div>

        {/* Menu - Scrollable */}
        <ScrollArea className="flex-1 overflow-hidden">
          <nav className="space-y-2 p-4 relative">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-1 ">
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-warehouse dark:text-warehouse hover:bg-gray-100 hover:text-slate-500 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                  <ChevronDown
                    className={`ml-auto h-3 w-3 transition-transform ${
                      expandedSections.includes(section.title) ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSections.includes(section.title) && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`warehouse-nav-item text-warehouse dark:hover:bg-slate-800 dark:hover:text-slate-500 ${
                              isActive ? "bg-blue-600 text-white" : "text-warehouse"
                          }`}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Logout Button - Fixed */}
        <div className="border-t border-t-slate-300 border-warehouse-border dark:border-slate-800 p-4 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="warehouse-button-primary w-full justify-center dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
