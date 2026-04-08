"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Warehouse, Plus, Edit, Trash2, Save, X, AlertCircle, ArrowUpDown } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useSettingsContext } from "../settings-context";
import { usePermissions } from "@/contexts/permissions-context";

interface WarehouseData {
  id: string;
  company_id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  total_locations: number;
  created_at: string;
}


export default function WarehouseSettingsPage() {
  const supabase = createClient();
  const { selectedCompanyId } = useSettingsContext();
  const { can } = usePermissions();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    country: "",
    latitude: "",
    longitude: "",
  });

  // Define table columns
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns: ColumnDef<WarehouseData>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            Name
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
      },
      {
        accessorKey: "code",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            Code
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
      },
      {
        accessorKey: "city",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            City
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.city || "—",
      },
      {
        accessorKey: "country",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            Country
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.country || "—",
      },
      {
        accessorKey: "total_locations",
        header: ({ column }) => (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            Locations
            <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {can("settings", "edit") && (
              <button
                onClick={() => openEdit(row.original)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {can("settings", "delete") && (
              <button
                onClick={() => handleDelete(row.original.id)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    []
  );

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      setLoading(true);
      const { data: warehouseData } = await supabase
        .from("warehouses")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("name");

      setWarehouses(warehouseData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Failed to load warehouses" });
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCompanyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  async function handleSave() {
    try {
      if (!selectedCompanyId) throw new Error("Company ID not found");
      if (!formData.name || !formData.code) {
        setMessage({ type: "error", text: "Name and Code are required" });
        return;
      }

      const payload = {
        company_id: selectedCompanyId,
        name: formData.name,
        code: formData.code,
        address: formData.address || null,
        city: formData.city || null,
        country: formData.country || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("warehouses")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage({ type: "success", text: "Warehouse updated successfully" });
      } else {
        const { error } = await supabase.from("warehouses").insert([payload]);

        if (error) throw error;
        setMessage({ type: "success", text: "Warehouse created successfully" });
      }

      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        country: "",
        latitude: "",
        longitude: "",
      });
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error("Error saving warehouse:", error);
      setMessage({ type: "error", text: "Failed to save warehouse" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;

    try {
      const { error } = await supabase
        .from("warehouses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setMessage({ type: "success", text: "Warehouse deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      setMessage({ type: "error", text: "Failed to delete warehouse" });
    }
  }

  function openEdit(warehouse: WarehouseData) {
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address || "",
      city: warehouse.city || "",
      country: warehouse.country || "",
      latitude: warehouse.latitude?.toString() || "",
      longitude: warehouse.longitude?.toString() || "",
    });
    setEditingId(warehouse.id);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-400">Loading warehouses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="dark-glass rounded-2xl border border-slate-800 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Warehouse className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Warehouses</h2>
            </div>
            <p className="text-sm text-slate-400">
              Manage warehouses by company
            </p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: "",
                code: "",
                address: "",
                city: "",
                country: "",
                latitude: "",
                longitude: "",
              });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Warehouse
          </button>
        </div>


      </div>

      {/* Message Alert */}
      {message && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="dark-glass rounded-2xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {editingId ? "Edit Warehouse" : "Add New Warehouse"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Warehouse name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="WH001"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="City"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) =>
                  setFormData({ ...formData, country: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Country"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) =>
                  setFormData({ ...formData, latitude: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="0.000000"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) =>
                  setFormData({ ...formData, longitude: e.target.value })
                }
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="0.000000"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Warehouses List */}
      <div>
        {warehouses.length === 0 ? (
          <div className="dark-glass rounded-2xl border border-slate-800 p-6 text-center">
            <p className="text-slate-400">No warehouses yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="dark-glass rounded-2xl border border-slate-800 p-6">
            <DataTable
              columns={columns}
              data={warehouses}
              filterPlaceholder="Search by name or code..."
              filterColumn="name"
            />
          </div>
        )}
      </div>
    </div>
  );
}
