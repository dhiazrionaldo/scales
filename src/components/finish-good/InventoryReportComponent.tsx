'use client';

/**
 * INVENTORY REPORT Component
 * 
 * Displays inventory items with:
 * - 3 metric cards (total items, total availability, total damaged)
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
import { Package, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  product_name: string;
  batch_number: string;
  location_code: string;
  quantity: number;
  total_qty: number;
  available_qty: number;
  damaged_qty: number;
  created_at: string;
  item_category: string;
}

interface InventoryMetrics {
  total_items: number;
  total_availability: number;
  total_damaged: number;
}

interface InventoryReportComponentProps {
  warehouseId: string;
  companyId: string;
}

export function InventoryReportComponent({
  warehouseId,
  companyId,
}: InventoryReportComponentProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [metrics, setMetrics] = useState<InventoryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [allLocations, setAllLocations] = useState<string[]>([]);
  const [allCategory, setAllCategory] = useState<string[]>([]);

  // Fetch inventory items and metrics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          warehouseId,
          companyId,
          ...(locationFilter && { location: locationFilter }),
          ...(categoryFilter && { item_category: categoryFilter})
        });

        const response = await fetch(`/api/finish-good/inventory-report?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch inventory items');
        }

        const result = await response.json();
        console.log(result)
        if (result.success) {
          setItems(result.data);
          setMetrics(result.metrics);
          setAllLocations(result.locations);
          setAllCategory(result.item_category);
        } else {
          setError(result.error || 'Failed to load data');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        console.error('[INVENTORY-REPORT] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (warehouseId && companyId) {
      fetchData();
    }
  }, [warehouseId, companyId, locationFilter, categoryFilter]);

  // Data table columns
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'product_name',
      header: 'Product',
      cell: ({ row }) => <span className="font-semibold">{row.getValue('product_name')}</span>,
    },
    {
      accessorKey: 'item_category',
      header: 'Item Category',
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
      // cell: ({ row }) => <span className="font-semibold">{row.getValue('item_category')}</span>,
    },
    {
      accessorKey: 'batch_number',
      header: 'Batch',
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('batch_number')}</span>,
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
      accessorKey: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => {
        const qty = row.getValue('quantity') as number;
        return <span className="font-semibold">{qty.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'available_qty',
      header: 'Available',
      cell: ({ row }) => {
        const qty = row.getValue('available_qty') as number;
        return <span className="text-green-600 font-semibold">{qty.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'damaged_qty',
      header: 'Damaged',
      cell: ({ row }) => {
        const qty = row.getValue('damaged_qty') as number;
        return qty > 0 ? (
          <span className="text-red-600 font-semibold">{qty.toLocaleString()}</span>
        ) : (
          <span className="text-gray-400">0</span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Received Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at') as string);
        return date.toLocaleDateString();
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
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Items Card */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Items in Inventory</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">
                {metrics?.total_items.toLocaleString() || 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">units</p>
            </div>
            <Package className="h-8 w-8 text-blue-400 opacity-50" />
          </div>
        </Card>

        {/* Total Availability Card */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Availability</p>
              <p className="text-3xl font-bold text-green-900 mt-2">
                {metrics?.total_availability.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">units available</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400 opacity-50" />
          </div>
        </Card>

        {/* Total Damaged Card */}
        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Total Damaged Qty</p>
              <p className="text-3xl font-bold text-red-900 mt-2">
                {metrics?.total_damaged.toLocaleString() || 0}
              </p>
              <p className="text-xs text-red-600 mt-1">units damaged</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Filters and Data Table */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold mb-4">Inventory List</h2>

          <div className='flex flex-cols justify-start gap-4'>
            {/* Location Filter */}
            <div className="flex flex-cols-2 items-start gap-4">
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
                <Button variant="destructive" onClick={() => setLocationFilter('')} className="text-xs">
                  Clear Filter
                </Button>
              )}
            </div>
            {/* Item Category Filter */}
            <div className="flex flex-cols-1 items-start gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Filter by Item Category</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      {categoryFilter || 'All Category'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuRadioGroup
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <DropdownMenuRadioItem value="">All Category</DropdownMenuRadioItem>
                      {allCategory.map((category) => (
                        <DropdownMenuRadioItem key={category} value={category}>
                          {category}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {categoryFilter && (
                <Button variant="destructive" onClick={() => setCategoryFilter('')} className="text-xs">
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="p-6">
          <DataTable
            columns={columns}
            data={items}
            filterPlaceholder="Search by product or batch..."
            filterColumn="product_name"
          />
        </div>
      </Card>
    </div>
  );
}
