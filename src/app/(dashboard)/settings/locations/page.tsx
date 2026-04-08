"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Save, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/ui/data-table";
import { getColumns, LocationData as LocationDataType } from "./columns";
import { useSettingsContext } from "../settings-context";
import { usePermissions } from "@/contexts/permissions-context";

interface Warehouse {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  location_code: "",
  grid_zone: "",
  grid_row: "",
  grid_column: "",
  max_stacks: "4",
  status: "AVAILABLE",
  area: "FINISH_GOOD"
};

export default function LocationsSettingsPage() {
  const { selectedCompanyId } = useSettingsContext();
  const { can } = usePermissions();

  const [locations, setLocations] = useState<LocationDataType[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Fetch warehouses when company changes
  const fetchWarehouses = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      const res = await fetch(`/api/settings/locations?company_id=${selectedCompanyId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setWarehouses(json.warehouses);
      setSelectedWarehouse("");
      setLocations([]);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load warehouses" });
    }
  }, [selectedCompanyId]);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  // Fetch locations when warehouse changes
  const fetchLocations = useCallback(async () => {
    if (!selectedWarehouse) { setLocations([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/locations?warehouse_id=${selectedWarehouse}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLocations(json.locations);
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load locations" });
    } finally {
      setLoading(false);
    }
  }, [selectedWarehouse]);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWarehouse) { setMessage({ type: "error", text: "Please select a warehouse" }); return; }
    if (!formData.location_code.trim()) { setFormMessage({ type: "error", text: "Location code is required" }); return; }
    if (!formData.grid_zone.trim()) { setFormMessage({ type: "error", text: "Grid zone is required" }); return; }
    if (formData.grid_row === "") { setFormMessage({ type: "error", text: "Grid row is required" }); return; }
    if (formData.grid_column === "") { setFormMessage({ type: "error", text: "Grid column is required" }); return; }
    
    try {
      const payload = {
        warehouse_id: selectedWarehouse,
        company_id: selectedCompanyId,
        location_code: formData.location_code.toUpperCase(),
        grid_zone: formData.grid_zone.toUpperCase(),
        grid_row: parseInt(formData.grid_row),
        grid_column: parseInt(formData.grid_column),
        max_stacks: parseInt(formData.max_stacks) || 4,
        area: formData.area,
        status: formData.status,
      };

      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { id: editingId, ...payload } : payload;

      const response = await fetch("/api/settings/locations", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save location");
      }

      setMessage({ type: "success", text: editingId ? "Location updated successfully" : "Location created successfully" });
      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
      setFormMessage(null);
      fetchLocations();
    } catch (error) {
      setFormMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save location" });
    }
  };

  const handleEdit = (location: LocationDataType) => {
    setEditingId(location.id);
    setFormData({
      location_code: location.location_code,
      grid_zone: location.grid_zone,
      grid_row: location.grid_row.toString(),
      grid_column: location.grid_column.toString(),
      max_stacks: location.max_stacks.toString(),
      status: location.status,
      area: location.area
    });
    setFormMessage(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this location?")) return;
    try {
      const response = await fetch("/api/settings/locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete location");
      }
      setMessage({ type: "success", text: "Location deleted successfully" });
      fetchLocations();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete location" });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="dark-glass rounded-2xl border border-slate-800 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Warehouse Locations</h2>
            </div>
            <p className="text-sm text-slate-400">Manage storage locations in a 2D grid with stack-based capacity</p>
          </div>
          {selectedWarehouse && can("settings", "create") && (
            <button
              onClick={() => { setFormData(EMPTY_FORM); setEditingId(null); setFormMessage(null); setShowForm(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Location
            </button>
          )}
        </div>

        {/* Warehouse Selector */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <label className="text-xs font-medium text-slate-400 mb-2 block">Select Warehouse</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">-- Select a Warehouse --</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${message.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Location Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-2xl bg-slate-900 border border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? "Edit Location" : "New Location"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formMessage && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${formMessage.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{formMessage.text}</span>
              </div>
            )}

            {/* Grid Information */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-300">
                <strong>Grid Model:</strong> Locations are organized in a 2D grid. Each location represents a vertical stack that can hold multiple pallets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Area</label>
                <select value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="FINISH_GOOD">FINISH GOOD</option>
                  <option value="PACKAGING">PACKAGING</option>
                  <option value="JIT">JIT</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Location Code</label>
                <input type="text" value={formData.location_code} onChange={(e) => setFormData({ ...formData, location_code: e.target.value })} placeholder="e.g., A-001" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Zone (A, B, C, ...)</label>
                <input type="text" value={formData.grid_zone} onChange={(e) => setFormData({ ...formData, grid_zone: e.target.value })} placeholder="e.g., A" maxLength="1" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Grid Row</label>
                <input type="number" value={formData.grid_row} onChange={(e) => setFormData({ ...formData, grid_row: e.target.value })} placeholder="0, 1, 2, ..." className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Grid Column</label>
                <input type="number" value={formData.grid_column} onChange={(e) => setFormData({ ...formData, grid_column: e.target.value })} placeholder="0, 1, 2, ..." className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" required />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Max Stack Height (pallets)</label>
                <input type="number" value={formData.max_stacks} onChange={(e) => setFormData({ ...formData, max_stacks: e.target.value })} placeholder="e.g., 4" min="1" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1 block">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                  <option value="AVAILABLE">Available</option>
                  <option value="FULL">Full</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-700">
              <button type="button" onClick={handleCancel} className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium">
                <Save className="h-4 w-4" /> {editingId ? "Update" : "Create"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Locations Table */}
      {selectedWarehouse && (
        <div className="dark-glass rounded-2xl border border-slate-800 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12"><p className="text-slate-400">Loading locations...</p></div>
          ) : locations.length > 0 ? (
            <DataTable
              columns={getColumns({ onEdit: handleEdit, onDelete: handleDelete, canEdit: can("settings", "edit"), canDelete: can("settings", "delete") })}
              data={locations}
              filterColumn="location_code"
              filterPlaceholder="Filter by location code..."
            />
          ) : (
            <div className="flex items-center justify-center py-12"><p className="text-slate-400">No locations found. Add one to get started.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
