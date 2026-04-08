"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Building2, Save, AlertCircle, Plus, X, Edit, Trash2 } from "lucide-react";

interface Company {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface UserCompanyRole {
  user_id: string;
  company_id: string;
  role_id: string;
}

export default function CompanySettingsPage() {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompanies, setUserCompanies] = useState<UserCompanyRole[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // Fetch companies user is assigned to
      const { data: userCompsData } = await supabase
        .from("user_companies")
        .select("company_id, user_id, role_id")
        .eq("user_id", userData.user.id);

      if (!userCompsData || userCompsData.length === 0) throw new Error("No companies assigned");

      setUserCompanies(userCompsData);

      // Get all companies for user
      const companyIds = userCompsData.map(uc => uc.company_id);
      const { data: companiesData } = await supabase
        .from("companies")
        .select("*")
        .in("id", companyIds)
        .order("name");

      setCompanies(companiesData || []);

      if (companiesData && companiesData.length > 0) {
        setSelectedCompany(companiesData[0]);
        setFormData(companiesData[0]);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      setMessage({ type: "error", text: "Failed to load companies" });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      if (!selectedCompany) throw new Error("No company selected");

      // Call API route instead of direct Supabase (avoids RLS issues)
      const response = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedCompany.id,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save company");
      }

      const updatedCompanyData = await response.json();

      const updatedCompanies = companies.map(c => 
        c.id === selectedCompany.id ? { ...c, ...updatedCompanyData } : c
      ) as Company[];
      
      setCompanies(updatedCompanies);
      setSelectedCompany({ ...selectedCompany, ...updatedCompanyData } as Company);
      setMessage({ type: "success", text: "Company settings saved successfully" });
    } catch (error) {
      console.error("Error saving company:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to save company settings" });
    } finally {
      setSaving(false);
    }
  }

  function selectCompany(company: Company) {
    setSelectedCompany(company);
    setFormData(company);
    setShowForm(true);
    setIsCreating(false);
  }

  function startCreateCompany() {
    setSelectedCompany(null);
    setFormData({ name: "", email: "", phone: "", address: "", city: "", country: "" });
    setShowForm(true);
    setIsCreating(true);
  }

  async function handleCreate() {
    try {
      setSaving(true);
      setMessage(null);

      if (!formData.name?.trim()) throw new Error("Company name is required");

      // Call API route instead of direct Supabase (avoids RLS issues)
      const response = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create company");
      }

      const { data: newCompanyData } = await response.json();

      setCompanies([...companies, newCompanyData]);
      setShowForm(false);
      setIsCreating(false);
      setFormData({});
      setMessage({ type: "success", text: "Company created successfully" });
    } catch (error) {
      console.error("Error creating company:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to create company" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      if (!selectedCompany) throw new Error("No company selected");
      
      if (!confirm(`Are you sure you want to delete "${selectedCompany.name}"? This cannot be undone.`)) {
        return;
      }

      setSaving(true);
      setMessage(null);

      // Call API route instead of direct Supabase (avoids RLS issues)
      const response = await fetch("/api/settings/company", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: selectedCompany.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete company");
      }

      const updatedCompanies = companies.filter(c => c.id !== selectedCompany.id);
      setCompanies(updatedCompanies);
      setShowForm(false);
      setSelectedCompany(null);
      setFormData({});
      setMessage({ type: "success", text: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete company" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-400">Loading companies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="dark-glass rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">Companies</h2>
              <p className="text-sm text-slate-400">Manage all companies</p>
            </div>
          </div>
          <button
            onClick={startCreateCompany}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Company
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

      {/* Companies List */}
      <div className="grid grid-cols-1 gap-3">
        {companies.length === 0 ? (
          <div className="dark-glass rounded-2xl border border-slate-800 p-6 text-center">
            <p className="text-slate-400">No companies assigned to you.</p>
          </div>
        ) : (
          companies.map((company) => (
            <div
              key={company.id}
              className="dark-glass rounded-2xl border border-slate-800 p-4 flex justify-between items-center cursor-pointer hover:border-slate-700 transition"
              onClick={() => selectCompany(company)}
            >
              <div>
                <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                <p className="text-sm text-slate-400">{company.email || "No email"}</p>
                {company.city && (
                  <p className="text-xs text-slate-500">{company.city}, {company.country}</p>
                )}
              </div>
              <Edit className="h-5 w-5 text-blue-400" />
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Form */}
      {showForm && (
        <div className="dark-glass rounded-2xl border border-slate-800 p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              {isCreating ? "Create Company" : "Edit Company"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 hover:bg-slate-800 rounded-lg transition"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Company Name */}
          <div>
            <label className="text-sm font-medium text-slate-300">Company Name</label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Enter company name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="company@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-slate-300">Phone</label>
            <input
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-medium text-slate-300">Address</label>
            <input
              type="text"
              value={formData.address || ""}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* City */}
            <div>
              <label className="text-sm font-medium text-slate-300">City</label>
              <input
                type="text"
                value={formData.city || ""}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="City"
              />
            </div>

            {/* Country */}
            <div>
              <label className="text-sm font-medium text-slate-300">Country</label>
              <input
                type="text"
                value={formData.country || ""}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full mt-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Country"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={isCreating ? handleCreate : handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              <Save className="h-4 w-4" />
              {saving ? (isCreating ? "Creating..." : "Saving...") : (isCreating ? "Create" : "Save")}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition font-medium"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            {!isCreating && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-red-600/20 hover:bg-red-600/30 disabled:opacity-50 text-red-400 rounded-lg transition font-medium ml-auto"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
        