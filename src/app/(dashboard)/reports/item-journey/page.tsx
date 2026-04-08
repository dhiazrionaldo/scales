/**
 * ITEM JOURNEY REPORT PAGE
 * 
 * Displays complete pallet lifecycle journey through warehouse
 * Shows receiving, putaway, and gate out progress
 */

'use client';

import { useUserStore } from '@/store/user';
import { useSettingsContext } from '../../settings/settings-context';
import { ItemJourneyComponent } from '@/components/finish-good/ItemJourneyComponent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, GitCompareIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ItemJourneyReportPage() {
  const warehouseId = useUserStore((state) => state.warehouse);
  const { selectedCompanyId, loadingCompanies } = useSettingsContext();

  // Show loading state
  if (loadingCompanies) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-200">Item Journey Report</h1>
          <p className="text-gray-200 mt-1">Track complete pallet lifecycle from receiving to shipment</p>
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
          <h1 className="text-3xl font-bold text-gray-200">Item Journey Report</h1>
          <p className="text-gray-200 mt-1">Track complete pallet lifecycle from receiving to shipment</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a warehouse and company from the sidebar to view item journeys.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="px-6 pt-6 flex gap-4">
        <GitCompareIcon className='flex-col h-9 w-9'/>
        <h1 className="text-3xl font-bold text-gray-200">Item Journey Report</h1>
      </div>
      <div>
        <p className="mt-2 text-gray-200">
          Track complete pallet lifecycle from receiving to shipment with detailed status and timeline
        </p>
      </div>
      <ItemJourneyComponent
        warehouseId={warehouseId}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
