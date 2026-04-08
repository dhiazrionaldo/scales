/**
 * PUTAWAY MODULE PAGE
 * 
 * Allows operators to complete putaway tasks by scanning HU
 * Confirms pallet placement at assigned location
 */

'use client';

import { useUserStore } from '@/store/user';
import { useSettingsContext } from '../settings/settings-context';
import { PackagingPutawayModuleComponent } from '@/components/packaging/PackagingPutawayModuleComponent';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Boxes } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function PackagingPutawayPage() {
  const warehouseId = useUserStore((state) => state.warehouse);
  const { selectedCompanyId, loadingCompanies } = useSettingsContext();

  // Show loading state
  if (loadingCompanies) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Packaging Putaway Tasks</h1>
          <p className="text-gray-600 mt-1">Complete putaway tasks by confirming pallet placement</p>
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
            
          <h1 className="text-3xl font-bold">Packaging Putaway Tasks</h1>
          <p className="text-gray-600 mt-1">Complete putaway tasks by confirming pallet placement</p>
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
      <div className="px-6 pt-6 flex gap-4">
        <Boxes className='flex-col  h-9 w-9'/>
        <h1 className="text-3xl font-bold text-gray-200">Packaging Putaway Tasks</h1>
      </div>
      <div>
        <p className="mt-2 text-gray-400">
          Complete putaway tasks by confirming pallet placement with HU code verification
        </p>
      </div>
      <PackagingPutawayModuleComponent
        warehouseId={warehouseId}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
