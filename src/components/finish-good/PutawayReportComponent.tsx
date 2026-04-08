/**
 * PUTAWAY REPORT COMPONENT
 * 
 * Displays putaway tasks with location filtering
 * Shows pallets pending physical placement
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { Package, Boxes, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface PutawayItem {
  id: string;
  hu_label: string;
  product_name: string;
  qty: number;
  batch: string;
  net_weight: number;
  location_code: string;
  received_time: string;
  assigned_time: string;
  status: string;
  pallet_id: string;
  item_category: string;
}

interface PutawayMetrics {
  total_pending: number;
  total_quantity: number;
  assigned_locations: number;
}

interface Props {
  warehouseId: string;
  companyId: string;
}

export function PutawayReportComponent({ warehouseId, companyId }: Props) {
  const [items, setItems] = useState<PutawayItem[]>([]);
  const [metrics, setMetrics] = useState<PutawayMetrics | null>(null);
  const [locations, setLocations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>('');
  // Fetch putaway report data
  const fetchReport = useCallback(async () => {
    try {
      setError(null);

      const params = new URLSearchParams({
        warehouseId,
        companyId,
        ...(locationFilter && { location: locationFilter }),
      });

      const response = await fetch(`/api/finish-good/putaway-report?${params}`);
      const result = await response.json();
      
      if (!result.success) {  
        setError(result.error || 'Failed to fetch putaway tasks');
        setItems([]);
        setMetrics(null);
        setLocations([]);
        return;
      }

      setItems(result.data || []);
      setMetrics(result.metrics || null);
      setLocations(result.locations || []);
    } catch (err) {
      console.error('Error fetching putaway report:', err);
      setError('An error occurred while fetching putaway tasks');
      setItems([]);
      setMetrics(null);
    }
  }, [warehouseId, companyId, locationFilter]);

  // Initial fetch and refetch on parameter change
  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Calculate days assigned
  const getDaysAssigned = (assignedTime: string): number => {
    const assigned = new Date(assignedTime);
    const now = new Date();
    return Math.floor((now.getTime() - assigned.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Define columns
  const columns: ColumnDef<PutawayItem>[] = [
    {
      accessorKey: 'hu_label',
      header: 'HU Label',
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue('hu_label')}</span>,
    },
    {
      accessorKey: 'product_name',
      header: 'Product',
    },
    {
      accessorKey: 'item_category',
      header: 'Category',
      cell: ({ row }) => {
        const value = row.getValue('item_category') as string;

        const badgeClass: Record<string, string> = {
          FINISH_GOOD: 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300',
          PACKAGING:   'border-blue-200  bg-blue-50  text-blue-700  dark:border-blue-800  dark:bg-blue-950  dark:text-blue-300',
        };
        
        const badgeLabel: Record<string, string> = {
          FINISH_GOOD: 'FINISH GOOD',
          PACKAGING:   'PACKAGING',
        };
        return (
          <Badge
            variant="outline"
            className={cn(badgeClass[value] ?? 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300')}
          >
            {badgeLabel[value] ?? value}
          </Badge>
        );
      }
    },
    {
      accessorKey: 'qty',
      header: 'Qty',
      cell: ({ row }) => <span className="font-semibold">{row.getValue('qty')}</span>,
    },
    {
      accessorKey: 'location_code',
      header: 'Location',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-sm font-medium text-blue-700">
          <MapPin className="h-3 w-3" />
          {row.getValue('location_code')}
        </span>
      ),
    },
    {
      accessorKey: 'batch',
      header: 'Batch',
    },
    {
      accessorKey: 'assigned_time',
      header: 'Assigned Date',
      cell: ({ row }) => new Date(row.getValue('assigned_time') as string).toLocaleDateString(),
    },
    {
      accessorKey: 'assigned_time',
      id: 'daysAssigned',
      header: 'Days Assigned',
      cell: ({ row }) => {
        const days = getDaysAssigned(row.getValue('assigned_time') as string);
        return (
          <span className={`font-semibold ${days > 1 ? 'text-amber-600' : ''}`}>
            {days}d
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Total Pending */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 border-orange-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Pending</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {metrics?.total_pending || 0}
              </p>
              <p className="text-xs text-orange-600 mt-1">Pallets awaiting placement</p>
            </div>
            <Package className="h-10 w-10 text-orange-400 opacity-80" />
          </div>
        </Card>

        {/* Total Quantity */}
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Quantity</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {metrics?.total_quantity || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">Units to be placed</p>
            </div>
            <Boxes className="h-10 w-10 text-blue-400 opacity-80" />
          </div>
        </Card>

        {/* Assigned Locations */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600">Assigned Locations</p>
              <p className="text-3xl font-bold text-emerald-900 mt-2">
                {metrics?.assigned_locations || 0}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Unique locations</p>
            </div>
            <MapPin className="h-10 w-10 text-emerald-400 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Location Filter */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Inventory List</h2>

          {/* Location Filter */}
          <div className="flex items-end gap-4">
            <div>
              <label className="text-sm font-medium block mb-2">Filter by Location</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    {locationFilter || 'All Locations'}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup
                    value={locationFilter}
                    onValueChange={setLocationFilter}
                  >
                    <DropdownMenuRadioItem value="">All Locations</DropdownMenuRadioItem>
                    {locations.map((location) => (
                      <DropdownMenuRadioItem key={location} value={location}>
                        {location}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {locationFilter && (
              <Button variant="ghost" onClick={() => setLocationFilter('')} className="text-xs">
                Clear Filter
              </Button>
            )}
          </div>
        </div>
      {/* <div className="p-6 flex items-center gap-4">
        <label className="text-sm font-medium block mb-2">Filter by Location</label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              {selectedLocation ? `📍 ${selectedLocation}` : 'All Locations'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => setSelectedLocation(null)}
              className={selectedLocation === null ? 'bg-blue-50' : ''}
            >
              All Locations
            </DropdownMenuItem>
            {locations.map((location) => (
              <DropdownMenuItem
                key={location}
                onClick={() => setSelectedLocation(location)}
                className={selectedLocation === location ? 'bg-blue-50' : ''}
              >
                📍 {location}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div> */}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      <div className="p-6">
        <DataTable
          columns={columns}
          data={items}
          filterPlaceholder="Search by HU label or location..."
          filterColumn="hu_label"
        />
      </div>
      </Card>
    </div>
  );
}
