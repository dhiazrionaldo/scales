/**
 * ITEM JOURNEY REPORT COMPONENT
 * 
 * Displays complete pallet lifecycle journey
 * Shows current status, location, and timeline progression
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface Checkpoint {
  stage: string;
  status: string;
  timestamp: string | null;
  operatorId: string | null;
}

interface PalletJourney {
  id: string;
  hu_label: string;
  product_name: string;
  pic_name: string;
  qty: number;
  batch: string;
  current_location: string;
  current_stage: string;
  current_status: string;
  received_date: string;
  last_updated: string;
  item_category: string;
  checkpoints: Checkpoint[];
}

interface Props {
  warehouseId: string;
  companyId: string;
}

export function ItemJourneyComponent({ warehouseId, companyId }: Props) {
  const [journeys, setJourneys] = useState<PalletJourney[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch journey data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        warehouseId,
        companyId,
        ...(statusFilter && { status: statusFilter }),
        ...(locationFilter && { location: locationFilter }),
        ...(categoryFilter && { item_category: categoryFilter }),
      });

      const response = await fetch(`/api/finish-good/item-journey?${params}`);
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch journeys');
        setJourneys([]);
        return;
      }
      
      setJourneys(result.data || []);
      setStatuses(result.statuses || []);
      setLocations(result.locations || []);
      setCategory(result.item_category || []);
    } catch (err) {
      console.error('Error fetching journeys:', err);
      setError('An error occurred while fetching journey data');
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, companyId, statusFilter, locationFilter, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const columns: ColumnDef<PalletJourney>[] = [
    {
      id: 'expand',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={() => toggleRow(row.original.id)}
          className="p-1 hover:bg-gray-900 rounded"
        >
          <ChevronDown
            className={`h-4 w-4 transition ${
              expandedRows.has(row.original.id) ? 'rotate-180' : ''
            }`}
          />
        </button>
      ),
      size: 40,
    },
    {
      accessorKey: 'hu_label',
      header: 'HU Label',
      cell: ({ row }) => <span className="font-mono font-semibold">{row.getValue('hu_label')}</span>,
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
      accessorKey: 'product_name',
      header: 'Product',
    },
    {
      accessorKey: 'pic_name',
      header: 'PIC',
    },
    {
      accessorKey: 'qty',
      header: 'Qty',
      cell: ({ row }) => <span className="font-semibold">{row.getValue('qty')}</span>,
    },
    {
      accessorKey: 'current_location',
      header: 'Current Location',
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-sm text-blue-700 font-medium">
          📍 {row.getValue('current_location')}
        </span>
      ),
    },
    {
      accessorKey: 'current_stage',
      header: 'Stage',
      cell: ({ row }) => {
        const stage = row.getValue('current_stage') as string;
        const stageColors: { [key: string]: string } = {
          RECEIVING: 'bg-yellow-50 text-yellow-700',
          PUTAWAY: 'bg-orange-50 text-orange-700',
          SHIPMENT: 'bg-green-50 text-green-700',
        };
        return (
          <span className={`px-2 py-1 rounded text-sm font-medium ${stageColors[stage] || ''}`}>
            {stage}
          </span>
        );
      },
    },
    {
      accessorKey: 'current_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('current_status') as string;
        const statusColors: { [key: string]: string } = {
          RECEIVED: 'bg-blue-50 text-blue-700',
          PUTAWAY_PENDING: 'bg-orange-50 text-orange-700',
          STORED: 'bg-green-50 text-green-700',
          READY_FOR_SHIPMENT: 'bg-purple-50 text-purple-700',
          SHIPPED: 'bg-green-50 text-green-700',
        };
        return (
          <span className={`px-2 py-1 rounded text-sm font-medium ${statusColors[status] || 'bg-gray-50 text-gray-700'}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'received_date',
      header: 'Received Date',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.getValue('received_date') as string)}</span>
      ),
    },
    {
      accessorKey: 'last_updated',
      header: 'Last Updated',
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.getValue('last_updated') as string)}</span>
      ),
    },
  ];

  const table = useReactTable({
    data: journeys,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-12">
          <div className="flex items-center justify-center gap-4">
            <Clock className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600">Loading pallet journeys...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Filter by Status</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-48">
                {statusFilter || 'All Statuses'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <DropdownMenuRadioItem value="">All Statuses</DropdownMenuRadioItem>
                {statuses.map((status) => (
                  <DropdownMenuRadioItem key={status} value={status}>
                    {status}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* location filter */}
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Filter by Location</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-48">
                {locationFilter ? `📍 ${locationFilter}` : 'All Locations'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuRadioGroup value={locationFilter} onValueChange={setLocationFilter}>
                <DropdownMenuRadioItem value="">All Locations</DropdownMenuRadioItem>
                {locations.map((location) => (
                  <DropdownMenuRadioItem key={location} value={location}>
                    📍 {location}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Category Filter */}
        <div>
          <label className="text-sm font-medium text-gray-200 block mb-2">Filter by Category</label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-48">
                {categoryFilter ? `${categoryFilter}` : 'All Category'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
                <DropdownMenuRadioItem value="">All Category</DropdownMenuRadioItem>
                {category.map((categori) => (
                  <DropdownMenuRadioItem key={categori} value={categori}>
                     {categori}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {(statusFilter || locationFilter || categoryFilter) && (
          <Button
            variant="destructive"
            onClick={() => {
              setStatusFilter('');
              setLocationFilter('');
              setCategoryFilter('');
            }}
            className="text-xs"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Data Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-200 cursor-pointer hover:bg-gray-900"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() && (
                          <span>{header.column.getIsSorted() === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
                {table.getRowModel().rows.map((row) => (
                    <>
                    <TableRow key={row.id} className="border-b hover:bg-warehouse-foreground">
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                        ))}
                    </TableRow>
                    {expandedRows.has(row.original.id) && (
                        <TableRow className="border-b">
                        <TableCell colSpan={99} className="px-4 py-6 bg-gray-900/50">
                            <JourneyTimeline journey={row.original} />
                        </TableCell>
                        </TableRow>
                    )}
                    </>
                ))}
                </TableBody>
            {/* <TableBody>
              {table.getRowModel().rows.map((row) => (
                <tbody key={row.id}>
                  <TableRow className="border-b hover:bg-gray-900">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.id) && (
                    <TableRow className="border-b">
                      <TableCell colSpan={columns.length} className="px-4 py-6">
                        <JourneyTimeline journey={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </tbody>
              ))}
            </TableBody> */}
          </Table>
        </div>

        {journeys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No pallets found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {journeys.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              journeys.length
            )}{' '}
            of {journeys.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Journey Timeline Component
 * Shows the complete pallet journey with checkpoints
 */
function JourneyTimeline({ journey }: { journey: PalletJourney }) {
  const stages = ['RECEIVING', 'PUTAWAY', 'SHIPMENT'];

  return (
    <div className="space-y-6">
        <div className="flex items-center">
            {stages.map((stage, index) => {
            const checkpoint = journey.checkpoints.find((cp) => cp.stage === stage);
            const isCompleted = checkpoint?.timestamp !== null;
            const isCurrent = journey.current_stage === stage;

            return (
                <div key={stage} className="flex items-center flex-1">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                    <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition ${
                        isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                    >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
                    </div>
                    <p className="font-semibold text-xs text-center">{stage}</p>
                    <p className="text-xs text-gray-500 text-center">{checkpoint?.status || 'N/A'}</p>
                    {checkpoint?.timestamp ? (
                    <p className="font-mono text-xs text-gray-400 text-center">
                        {new Date(checkpoint.timestamp).toLocaleString()}
                    </p>
                    ) : (
                    <p className="text-gray-400 italic text-xs">Pending...</p>
                    )}
                </div>

                {/* Connector line */}
                {index < stages.length - 1 && (
                    <div className={`h-1 flex-1 mb-8 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`} />
                )}
                </div>
            );
            })}
        </div>

        <div className="text-xs text-gray-200 p-3 rounded border border-gray-200">
            <p>
            <strong>Batch:</strong> {journey.batch} | <strong>PIC:</strong> {journey.pic_name}
            </p>
        </div>
        </div>
    // <div className="space-y-6">
    //   <div className="flex items-center gap-8">
    //     {stages.map((stage, index) => {
    //       const checkpoint = journey.checkpoints.find((cp) => cp.stage === stage);
    //       const isCompleted = checkpoint?.timestamp !== null;
    //       const isCurrent = journey.current_stage === stage;

    //       return (
    //         <div key={stage} className="flex items-center gap-4 flex-1">
    //           <div className="flex flex-col items-center gap-2">
    //             <div
    //               className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition ${
    //                 isCompleted
    //                   ? 'bg-green-500 text-white'
    //                   : isCurrent
    //                   ? 'bg-blue-500 text-white'
    //                   : 'bg-gray-200 text-gray-600'
    //               }`}
    //             >
    //               {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : index + 1}
    //             </div>
    //             <div className="text-center">
    //               <p className="font-semibold text-sm">{stage}</p>
    //               <p className="text-xs text-gray-600">{checkpoint?.status || 'N/A'}</p>
    //             </div>
    //           </div>

    //           {/* Timestamp */}
    //           <div className="flex-1">
    //             <div className="text-sm">
    //               {checkpoint?.timestamp ? (
    //                 <div className=" rounded ">
    //                   <p className="font-mono text-xs">
    //                     {new Date(checkpoint.timestamp).toLocaleString()}
    //                   </p>
    //                 </div>
    //               ) : (
    //                 <p className="text-gray-400 italic">Pending...</p>
    //               )}
    //             </div>
    //           </div>

    //           {/* Line divider */}
    //           {index < stages.length - 1 && (
    //             <div className={`h-1 flex-1 ${isCompleted ? 'bg-green-400' : 'bg-gray-300'}`} />
    //           )}
    //         </div>
    //       );
    //     })}
    //   </div>

    //   <div className="text-xs text-gray-200 p-3 rounded border border-gray-200">
    //     <p>
    //       <strong>Batch:</strong> {journey.batch} | <strong>PIC:</strong> {journey.pic_name}
    //     </p>
    //   </div>
    // </div>
  );
}
