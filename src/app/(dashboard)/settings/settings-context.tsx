"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Company {
  id: string;
  name: string;
  code: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface SettingsContextType {
  companies: Company[];
  warehouse: Warehouse[];
  selectedCompanyId: string | null;
  selectedCompany: Company | null;
  setSelectedCompanyId: (id: string) => void;
  loadingCompanies: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  companies: [],
  warehouse: [],
  selectedCompanyId: null,
  selectedCompany: null,
  setSelectedCompanyId: () => {},
  loadingCompanies: true,
});

export function useSettingsContext() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [warehouse, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: userCompaniesData } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", userData.user.id);

        if (!userCompaniesData || userCompaniesData.length === 0) return;

        const companyIds = userCompaniesData.map((uc) => uc.company_id);

        const { data: userWarehousesData } = await supabase
          .from("user_companies")
          .select("warehouse_id, warehouses (id, name, code)")
          .eq("user_id", userData.user.id);

        if (!userWarehousesData || userWarehousesData.length === 0) return;

        const warehouseIds = userWarehousesData.map((uc) => uc.warehouse_id);

        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name, code")
          .in("id", companyIds)
          .order("name");

        setCompanies(companiesData || []);
        if (companiesData && companiesData.length > 0) {
          const initialCompanyId = companiesData[0].id;
          setSelectedCompanyId(initialCompanyId);
          setSelectedCompany(companiesData[0]);
        }

        const { data: warehousesData } = await supabase
          .from("warehouses")
          .select("id, name, code")
          .in("id", warehouseIds);

        setWarehouses(warehousesData || []);

      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoadingCompanies(false);
      }
    }

    fetchCompanies();
  }, [supabase]);

  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const company = companies.find((comp) => comp.id === selectedCompanyId);
      setSelectedCompany(company || null);
    }
  }, [selectedCompanyId, companies]);

  return (
    <SettingsContext.Provider
      value={{
        companies,
        warehouse,
        selectedCompanyId,
        selectedCompany,
        setSelectedCompanyId,
        loadingCompanies,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
