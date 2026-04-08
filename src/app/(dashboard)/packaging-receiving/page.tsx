'use client';

/**
 * RECEIVING Page
 *
 * One-Click Inbound Power Action
 * Handles incoming pallet reception workflow with integrated location selection
 * Follows warehouse-flow.md and ui-guideline.md specifications
 */

import { useUserStore } from '@/store/user';
import { AlertCircle, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { PackagingReceivingComponent } from '@/components/packaging/PackagingReceivingComponent';
import React from 'react';
import { useSettingsContext } from "@/app/(dashboard)/settings/settings-context";

export default function PackagingReceivingPage() {
  const warehouseId = useUserStore((state) => state.warehouse);
  const { companies, warehouse,loadingCompanies } = useSettingsContext();
  const companyId = companies?.[0]?.id ?? '';
  const warehouseName = warehouse?.find(w => w.id === warehouseId)?.name || 'Unknown Warehouse';

  const handleReceivingSuccess = (data: {
    pallet_id: string;
    hu_label: string;
    location_code: string;
  }) => {
    // Success handled by ReceivingComponent internally
    // Could add toast notification here if needed
    console.log('Pallet received:', data);
  };

  if (loadingCompanies) {
    return (
      <div className="p-6">
        <Alert className="mb-4">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-sm sm:text-base">Loading company data...</p>
              <p className="text-xs sm:text-sm">
                Please wait while we load your company information.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!companyId || !companies || companies.length === 0) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-sm sm:text-base">No company assigned</p>
              <p className="text-xs sm:text-sm">
                You do not have access to any company. Please contact your administrator to assign a company.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!warehouseId) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-5 h-5" />
          <AlertDescription>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-sm sm:text-base">No warehouse assigned</p>
              <p className="text-xs sm:text-sm">
                Please select a warehouse from the sidebar dropdown to start receiving HU labels.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            💡 <strong>How to select a warehouse:</strong>
          </p>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            <li>Look for <strong>"Active Warehouse"</strong> dropdown at the top of the sidebar</li>
            <li>Click the dropdown to see available warehouses</li>
            <li>Select your warehouse</li>
            <li>Return to Receiving to start scanning HU labels</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-7 h-7 text-green-600" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Packaging Receive Pallet
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Scan the HU label, review the details, select storage location, and confirm in one action.
        </p>
      </div>

      {/* Company & Warehouse Info */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs sm:text-sm py-2 px-3">
          {companies?.[0]?.name || 'Company'}
        </Badge>
        <Badge variant="outline" className="text-xs sm:text-sm py-2 px-3">
          Warehouse: {warehouseName}
        </Badge>
      </div>

      {/* Receiving Component */}
      <Card className="p-6 dark:bg-slate-800">
        <PackagingReceivingComponent
          warehouseId={warehouseId}
          companyId={companyId}
          onSuccess={handleReceivingSuccess}
        />
      </Card>
    </div>
  );
}
