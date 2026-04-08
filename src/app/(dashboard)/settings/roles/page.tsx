"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, Plus, Edit, Trash2, Save, X, AlertCircle } from "lucide-react";
import { usePermissions } from "@/contexts/permissions-context";

interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

export default function RolesSettingsPage() {
  const supabase = createClient();
  const { can } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch roles
      const { data: rolesData } = await supabase.from("roles").select("*");
      setRoles(rolesData || []);

      // Fetch permissions
      const { data: permissionsData } = await supabase
        .from("permissions")
        .select("*");
      setPermissions(permissionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Failed to load roles and permissions" });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function fetchRolePermissions(roleId: string) {
    try {
      const { data } = await supabase
        .from("role_permissions")
        .select("permission_id")
        .eq("role_id", roleId);

      setSelectedRolePermissions(
        data?.map((rp: any) => rp.permission_id as string) || []
      );
    } catch (error) {
      console.error("Error fetching role permissions:", error);
    }
  }

  async function handleSave() {
    try {
      if (!formData.name) {
        setMessage({ type: "error", text: "Role name is required" });
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("roles")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
        setMessage({ type: "success", text: "Role updated successfully" });
      } else {
        const { error } = await supabase.from("roles").insert([payload]);

        if (error) throw error;
        setMessage({ type: "success", text: "Role created successfully" });
      }

      setFormData({ name: "", description: "" });
      setEditingId(null);
      setShowForm(false);
      setSelectedRolePermissions([]);
      fetchData();
    } catch (error) {
      console.error("Error saving role:", error);
      setMessage({ type: "error", text: "Failed to save role" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const { error } = await supabase.from("roles").delete().eq("id", id);

      if (error) throw error;
      setMessage({ type: "success", text: "Role deleted successfully" });
      fetchData();
    } catch (error) {
      console.error("Error deleting role:", error);
      setMessage({ type: "error", text: "Failed to delete role" });
    }
  }

  async function saveRolePermissions(roleId: string) {
    try {
      // Delete existing permissions
      await supabase.from("role_permissions").delete().eq("role_id", roleId);

      // Insert new permissions
      if (selectedRolePermissions.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(
          selectedRolePermissions.map((permId) => ({
            role_id: roleId,
            permission_id: permId,
          }))
        );

        if (error) throw error;
      }

      setMessage({ type: "success", text: "Role permissions updated" });
      fetchData();
    } catch (error) {
      console.error("Error saving permissions:", error);
      setMessage({ type: "error", text: "Failed to save permissions" });
    }
  }

  function openEdit(role: Role) {
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setEditingId(role.id);
    fetchRolePermissions(role.id);
    setShowForm(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-400">Loading roles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="dark-glass rounded-2xl border border-slate-800 p-6 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Roles</h2>
          </div>
          <p className="text-sm text-slate-400">
            Manage user roles and permissions
          </p>
        </div>
        {can("settings", "create") && (
          <button
            onClick={() => {
              setFormData({ name: "", description: "" });
              setEditingId(null);
              setSelectedRolePermissions([]);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Role
          </button>
        )}
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
            {editingId ? "Edit Role" : "Add New Role"}
          </h3>

          <div>
            <label className="text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Role name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Role description"
              rows={3}
            />
          </div>

          {/* Permissions */}
          {editingId && (
            <div>
              <label className="text-sm font-medium text-slate-300 block mb-3">
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {permissions.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-slate-700/50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRolePermissions.includes(permission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRolePermissions([
                            ...selectedRolePermissions,
                            permission.id,
                          ]);
                        } else {
                          setSelectedRolePermissions(
                            selectedRolePermissions.filter(
                              (id) => id !== permission.id
                            )
                          );
                        }
                      }}
                      className="mt-1 rounded"
                    />
                    <div>
                      <p className="text-sm text-slate-300">
                        {permission.module} - {permission.action}
                      </p>
                      {permission.description && (
                        <p className="text-xs text-slate-500">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-700">
            {editingId ? (
              <>
                <button
                  onClick={() => saveRolePermissions(editingId)}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
                >
                  <Save className="h-4 w-4" />
                  Save Permissions
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                >
                  <Save className="h-4 w-4" />
                  Save Role
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
              >
                <Save className="h-4 w-4" />
                Create Role
              </button>
            )}
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({ name: "", description: "" });
                setSelectedRolePermissions([]);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Roles List */}
      <div className="grid grid-cols-1 gap-4">
        {roles.length === 0 ? (
          <div className="dark-glass rounded-2xl border border-slate-800 p-6 text-center">
            <p className="text-slate-400">No roles yet. Add one to get started.</p>
          </div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="dark-glass rounded-2xl border border-slate-800 p-4 flex justify-between items-start"
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                {role.description && (
                  <p className="text-sm text-slate-400 mt-1">{role.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                {can("settings", "edit") && (
                  <button
                    onClick={() => openEdit(role)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                {can("settings", "delete") && (
                  <button
                    onClick={() => handleDelete(role.id)}
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
