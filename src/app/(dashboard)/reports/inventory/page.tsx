'use client';

/**
 * INVENTORY REPORT Page
 * 
 * Displays inventory items report with filtering, sorting, and pagination
 * Follows ui-guideline.md specifications for dashboard design
 */

import { useUserStore } from '@/store/user';
import { useSettingsContext } from '../../settings/settings-context';
import { InventoryReportComponent } from '@/components/finish-good/InventoryReportComponent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Warehouse } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function InventoryReportPage() {
  const warehouseId = useUserStore((state) => state.warehouse);
  const { selectedCompanyId, loadingCompanies } = useSettingsContext();

  // Show loading state
  if (loadingCompanies) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Report</h1>
          <p className="text-gray-600 mt-1">View current inventory status and availability</p>
        </div>
        <Card className="p-6">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // Show error if warehouse or company is not selected
  if (!warehouseId || !selectedCompanyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Report</h1>
          <p className="text-gray-600 mt-1">View current inventory status and availability</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a warehouse and company in settings before accessing the inventory report.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="px-6 pt-6 flex gap-4">
        <Warehouse className='flex-col h-9 w-9'/>
        <h1 className="text-3xl font-bold">Inventory Report</h1>
        <p className="text-gray-300 mt-1">
          View current inventory status with filtering, sorting, and pagination
        </p>
      </div>

      {/* Report Component */}
      <InventoryReportComponent warehouseId={warehouseId} companyId={selectedCompanyId} />
    </div>
  );
}
