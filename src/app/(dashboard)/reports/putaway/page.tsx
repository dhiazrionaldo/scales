/**
 * PUTAWAY REPORT PAGE
 * 
 * Displays putaway tasks for assigned locations
 * Shows pallets with PUTAWAY_PENDING status
 */

'use client';

import { useUserStore } from '@/store/user';
import { useSettingsContext } from '../../settings/settings-context';
import { PutawayReportComponent } from '@/components/finish-good/PutawayReportComponent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Boxes } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function PutawayReportPage() {
  const warehouseId = useUserStore((state) => state.warehouse);
  const { selectedCompanyId, loadingCompanies } = useSettingsContext();

  // Show loading state
  if (loadingCompanies) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Putaway Report</h1>
          <p className="text-gray-600 mt-1">Monitor and manage pallets awaiting physical placement</p>
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
          <h1 className="text-3xl font-bold">Putaway Report</h1>
          <p className="text-gray-600 mt-1">Monitor and manage pallets awaiting physical placement</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a warehouse and company from the sidebar to view putaway tasks.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex px-6 pt-6 gap-4">
        <Boxes className='flex-col h-9 w-9'/>
        <h1 className="text-3xl font-bold text-gray-300">Putaway Report</h1>
      </div>
      <div>
        <p className="mt-2 text-gray-300">
          Monitor and manage pallets awaiting physical placement
        </p>
      </div>
      <PutawayReportComponent
        warehouseId={warehouseId}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
