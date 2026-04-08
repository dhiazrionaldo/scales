"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Trash2, AlertCircle, ArrowUpDown, UserPlus, Eye, EyeOff, Edit, Link2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSettingsContext } from "../settings-context";
import { usePermissions } from "@/contexts/permissions-context";

interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  warehouse_id: string | null;
  users: { id: string; email: string; full_name: string | null };
  roles: { id: string; name: string; description: string | null };
  warehouses: { id: string; name: string } | null;
  companies: { id: string; name: string };
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface Warehouse {
  id: string;
  name: string;
}

const EMPTY_CREATE = { full_name: "", email: "", password: "", role_id: "", company_id: "", warehouse_id: "" };
const EMPTY_EDIT = { full_name: "", role_id: "", company_id: "", warehouse_id: "" };

export default function UsersSettingsPage() {
  const { selectedCompanyId, companies } = useSettingsContext();
  const { can } = usePermissions();

  const [users, setUsers] = useState<UserCompany[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState("assigned");
  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [showPassword, setShowPassword] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<UserCompany | null>(null);
  const [editUnassignedTarget, setEditUnassignedTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns: ColumnDef<UserCompany>[] = useMemo(
    () => [
      {
        id: "full_name",
        accessorFn: (row) => row.users?.full_name,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Name <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.users?.full_name || <span className="text-slate-500 italic">No name</span>,
      },
      {
        id: "email",
        accessorFn: (row) => row.users?.email,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Email <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.users?.email,
      },
      {
        id: "role_name",
        accessorFn: (row) => row.roles?.name,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Role <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-medium">
            {row.original.roles?.name}
          </span>
        ),
      },
      {
        id: "warehouse_name",
        accessorFn: (row) => row.warehouses?.name,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Warehouse <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm text-slate-300">
            {row.original.warehouses?.name || <span className="text-slate-500 italic">Not assigned</span>}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {can("settings", "edit") && (
              <button
                onClick={() => { setEditTarget(row.original); setEditForm({ full_name: row.original.users?.full_name || "", role_id: row.original.role_id, company_id: row.original.company_id, warehouse_id: row.original.warehouse_id || "" }); setEditError(null); }}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                title="Edit user"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {can("settings", "delete") && (
              <button
                onClick={() => handleDelete(row.original.id)}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition"
                title="Remove from company"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const unassignedColumns: ColumnDef<User>[] = useMemo(
    () => [
      {
        id: "full_name",
        accessorFn: (row) => row.full_name,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Name <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.full_name || <span className="text-slate-500 italic">No name</span>,
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <button onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="flex items-center gap-2 hover:text-blue-400">
            Email <ArrowUpDown className="h-4 w-4" />
          </button>
        ),
        cell: ({ row }) => row.original.email,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {can("settings", "create") && (
              <button
                onClick={() => {
                  setEditUnassignedTarget(row.original);
                  setEditForm({
                    full_name: row.original.full_name || "",
                    role_id: "",
                    company_id: selectedCompanyId || ""
                  });
                  setEditError(null);
                }}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-green-400 transition"
                title="Assign to company"
              >
                <Link2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [can, selectedCompanyId]
  );

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      // Fetch users assigned to the current company
      const res = await fetch(`/api/settings/users?company_id=${selectedCompanyId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUsers(json.users);
      setRoles(json.roles);
      setWarehouses(json.warehouses || []);
    } catch (error) {
      console.error("Error fetching assigned users:", error);
      setMessage({ type: "error", text: "Failed to load assigned users" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  const fetchUnassignedUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all unassigned users (not assigned to any company or role)
      const unassignedRes = await fetch(`/api/settings/users/unassigned`);
      const unassignedJson = await unassignedRes.json();
      console.log("Unassigned users response:", unassignedJson);
      if (!unassignedRes.ok) throw new Error(unassignedJson.error);
      setUnassignedUsers(unassignedJson.users || []);
    } catch (error) {
      console.error("Error fetching unassigned users:", error);
      setMessage({ type: "error", text: "Failed to load unassigned users" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    fetchUnassignedUsers();
  }, [fetchUnassignedUsers]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Remove this user from the company?")) return;
    try {
      const res = await fetch("/api/settings/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_company_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMessage({ type: "success", text: "User removed from company" });
      fetchData();
      fetchUnassignedUsers();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to remove user" });
    }
  }, [fetchData, fetchUnassignedUsers]);

  async function handleCreate() {
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password.trim() || !createForm.role_id || !createForm.company_id) {
      setCreateError("All fields are required");
      return;
    }
    setCreateLoading(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createForm, company_id: createForm.company_id }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error || "Failed to create user"); return; }
      setMessage({ type: "success", text: `User ${createForm.email} created and assigned to company.` });
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
      fetchData();
      fetchUnassignedUsers();
    } catch { setCreateError("Network error. Please try again."); }
    finally { setCreateLoading(false); }
  }

  async function handleEdit() {
    if (!editForm.role_id || !editForm.company_id) { setEditError("Role and Company are required"); return; }
    setEditLoading(true);
    setEditError(null);
    try {
      if (editUnassignedTarget) {
        // Assigning an unassigned user to a company
        const res = await fetch("/api/settings/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: editUnassignedTarget.id, ...editForm }),
        });
        const json = await res.json();
        if (!res.ok) { setEditError(json.error || "Failed to assign user"); return; }
        setMessage({ type: "success", text: "User assigned to company successfully." });
        setEditUnassignedTarget(null);
      } else if (editTarget) {
        // Updating an assigned user
        const res = await fetch("/api/settings/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: editTarget.user_id, user_company_id: editTarget.id, ...editForm }),
        });
        const json = await res.json();
        if (!res.ok) { setEditError(json.error || "Failed to update user"); return; }
        setMessage({ type: "success", text: "User updated successfully." });
        setEditTarget(null);
      }
      fetchData();
      fetchUnassignedUsers();
    } catch { setEditError("Network error. Please try again."); }
    finally { setEditLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="dark-glass rounded-2xl border border-slate-800 p-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Company Users</h2>
            </div>
            <p className="text-sm text-slate-400">Manage users assigned to this company</p>
          </div>
          {can("settings", "create") && (
            <button
              onClick={() => { setShowCreate(true); setCreateForm({ ...EMPTY_CREATE, company_id: selectedCompanyId || "" }); setCreateError(null); setShowPassword(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          )}
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${message.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Users Table */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="assigned" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Assigned Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Unassigned Users ({unassignedUsers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assigned" className="mt-6">
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><p className="text-slate-400">Loading users...</p></div>
            ) : users.length === 0 ? (
              <div className="dark-glass rounded-2xl border border-slate-800 p-6 text-center">
                <p className="text-slate-400">No users assigned to this company yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="dark-glass rounded-2xl border border-slate-800 p-6">
                <DataTable columns={columns} data={users} filterPlaceholder="Search by name or email..." filterColumn="email" />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="unassigned" className="mt-6">
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12"><p className="text-slate-400">Loading users...</p></div>
            ) : unassignedUsers.length === 0 ? (
              <div className="dark-glass rounded-2xl border border-slate-800 p-6 text-center">
                <p className="text-slate-400">No unassigned users available.</p>
              </div>
            ) : (
              <div className="dark-glass rounded-2xl border border-slate-800 p-6">
                <DataTable columns={unassignedColumns} data={unassignedUsers} filterPlaceholder="Search by name or email..." filterColumn="email" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); setCreateError(null); } }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" /> Create New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {createError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {createError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Full Name</label>
              <input type="text" value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="John Doe" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
              <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="john@example.com" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Minimum 6 characters" className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Company</label>
              <select value={createForm.company_id} onChange={(e) => setCreateForm({ ...createForm, company_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="">Select a company</option>
                {companies?.length ? companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>) : null}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Role</label>
              <select value={createForm.role_id} onChange={(e) => setCreateForm({ ...createForm, role_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="">Select a role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block\">Warehouse</label>
              <select value={createForm.warehouse_id} onChange={(e) => setCreateForm({ ...createForm, warehouse_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50\">
                <option value="">Select a warehouse (optional)</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => { setShowCreate(false); setCreateError(null); }} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium">Cancel</button>
            <button onClick={handleCreate} disabled={createLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50">
              <UserPlus className="h-4 w-4" /> {createLoading ? "Creating..." : "Create User"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget || !!editUnassignedTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditUnassignedTarget(null); setEditError(null); } }}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-400" /> {editUnassignedTarget ? "Assign User to Company" : "Edit User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {editError}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
              <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-400 text-sm">
                {editTarget?.users?.email || editUnassignedTarget?.email}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Full Name</label>
              <input type="text" value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} placeholder="Full name" className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Company</label>
              <select value={editForm.company_id} onChange={(e) => setEditForm({ ...editForm, company_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="">Select a company</option>
                {companies?.length ? companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>) : null}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Role</label>
              <select value={editForm.role_id} onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="">Select a role</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Warehouse</label>
              <select value={editForm.warehouse_id} onChange={(e) => setEditForm({ ...editForm, warehouse_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                <option value="">Select a warehouse (optional)</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => { setEditTarget(null); setEditUnassignedTarget(null); setEditError(null); }} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium">Cancel</button>
            <button onClick={handleEdit} disabled={editLoading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50">
              <Edit className="h-4 w-4" /> {editLoading ? "Saving..." : editUnassignedTarget ? "Assign User" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
