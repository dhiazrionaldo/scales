'use client';

/**
 * RECEIVED REPORT Component
 * 
 * Displays received items with:
 * - 3 metric cards (total stock, 3+ days stock, DO stock)
 * - Searchable, sortable, paginated data table with location filtering
 */

import { useEffect, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Package, Clock, Truck, AlertCircle, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface ReceivedItem {
  id: string;
  hu_label: string;
  product_name: string;
  qty: number;
  net_weight: number;
  batch: string;
  location_code: string;
  received_time: string;
  status: string;
  received_days: number;
}

interface StockMetrics {
  total_stock: number;
  over_3_days_stock: number;
  do_stock: number;
}

interface ReceivedReportComponentProps {
  warehouseId: string;
  companyId: string;
}

export function ReceivedReportComponent({
  warehouseId,
  companyId,
}: ReceivedReportComponentProps) {
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [metrics, setMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [allLocations, setAllLocations] = useState<string[]>([]);

  // Fetch received items and metrics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          warehouseId,
          companyId,
          ...(locationFilter && { location: locationFilter }),
        });

        const response = await fetch(`/api/packaging/received-report?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch received items');
        }

        const result = await response.json();
        console.log(result.data)
        if (result.success) {
          setItems(result.data);
          setMetrics(result.metrics);

          // Extract unique locations for filter
          const locations = Array.from(
            new Set(result.data.map((item: ReceivedItem) => item.location_code))
          ).sort();
          setAllLocations(locations as string[]);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('[RECEIVED-REPORT] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (warehouseId && companyId) {
      fetchData();
    }
  }, [warehouseId, companyId, locationFilter]);

  // Data table columns
  const columns: ColumnDef<ReceivedItem>[] = [
    {
      accessorKey: 'hu_label',
      header: 'HU Label',
      cell: ({ row }) => <span className="font-mono">{row.getValue('hu_label')}</span>,
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
      header: 'Quantity',
      cell: ({ row }) => {
        const qty = row.getValue('qty') as number;
        return <span className="font-semibold">{qty.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'batch',
      header: 'Batch',
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('batch')}</span>,
    },
    {
      accessorKey: 'location_code',
      header: 'Location',
      cell: ({ row }) => {
        const location = row.getValue('location_code') as string;
        return (
          <span className={location === 'Unassigned' ? 'text-orange-600' : 'text-green-600'}>
            {location}
          </span>
        );
      },
    },
    {
      accessorKey: 'net_weight',
      header: 'Net Weight (kg)',
      cell: ({ row }) => {
        const weight = row.getValue('net_weight') as number;
        return weight.toFixed(2);
      },
    },
    {
      accessorKey: 'received_time',
      header: 'Received',
      cell: ({ row }) => {
        const date = new Date(row.getValue('received_time') as string);
        return date.toLocaleDateString();
      },
    },
    {
      accessorKey: 'received_days',
      header: 'Days in Stock',
      cell: ({ row }) => {
        const days = row.getValue('received_days') as number;
        const isOverdue = days > 3;
        return (
          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
            {days}d {isOverdue && '⚠️'}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const statusConfig: Record<string, { bg: string; text: string }> = {
          pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
          completed: { bg: 'bg-green-100', text: 'text-green-800' },
          cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
        };

        const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
        return (
          <span className={`px-2 py-1 rounded text-sm font-medium ${config.bg} ${config.text}`}>
            {status}
          </span>
        );
      },
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Stock Card */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Current Total Stock</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {metrics?.total_stock.toLocaleString() || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">units</p>
            </div>
            <Package className="h-8 w-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        {/* Over 3 Days Card */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">More Than 3 Days</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">
                {metrics?.over_3_days_stock.toLocaleString() || 0}
              </p>
              <p className="text-xs text-orange-600 mt-1">units</p>
            </div>
            <Clock className="h-8 w-8 text-orange-400 opacity-50" />
          </div>
        </Card>

        {/* DO Stock Card */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">DO Stock</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {metrics?.do_stock.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">units (in delivery)</p>
            </div>
            <Truck className="h-8 w-8 text-green-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters and Data Table */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Received Items</h2>

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
                  <DropdownMenuRadioGroup value={locationFilter} onValueChange={setLocationFilter}>
                    <DropdownMenuRadioItem value="">All Locations</DropdownMenuRadioItem>
                    {allLocations.map((location) => (
                      <DropdownMenuRadioItem key={location} value={location}>
                        {location}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {locationFilter && (
              <Button
                variant="ghost"
                onClick={() => setLocationFilter('')}
                className="text-xs"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="p-6">
          <DataTable
            columns={columns}
            data={items}
            filterPlaceholder="Search by HU label or product..."
            filterColumn="hu_label"
          />
        </div>
      </Card>
    </div>
  );
}
