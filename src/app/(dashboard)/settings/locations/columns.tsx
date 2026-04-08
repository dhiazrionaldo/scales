"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface LocationData {
  id: string
  warehouse_id: string
  company_id: string
  location_code: string
  grid_zone: string
  grid_row: number
  grid_column: number
  max_stacks: number
  status: string
  created_at: string
  updated_at: string
  area: string
}

interface ColumnsProps {
  onEdit: (location: LocationData) => void
  onDelete: (id: string) => void
  canEdit?: boolean
  canDelete?: boolean
}

export const getColumns = ({ onEdit, onDelete, canEdit = true, canDelete = true }: ColumnsProps): ColumnDef<LocationData>[] => [
  {
    id: "location_code",
    accessorKey: "location_code",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Code
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-semibold">{row.getValue("location_code")}</div>,
  },
  {
    id: "area",
    accessorKey: "area",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Area
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-semibold">{row.getValue("area")}</div>,
  },
  {
    id: "grid_zone",
    accessorKey: "grid_zone",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Zone
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium text-blue-400">{row.getValue("grid_zone")}</div>,
  },
  {
    id: "grid_position",
    header: "Position (Row × Col)",
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="text-sm">
          {location.grid_row} × {location.grid_column}
        </div>
      )
    },
  },
  {
    id: "max_stacks",
    accessorKey: "max_stacks",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Max Stack Height
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-sm">
        <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
          {row.getValue("max_stacks")} pallets
        </span>
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 p-0"
      >
        Status
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full ${
            status === "AVAILABLE"
              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
              : status === "FULL"
                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                : status === "MAINTENANCE"
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300"
          }`}
        >
          {status}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const location = row.original
      return (
        <div className="flex gap-2 justify-center">
          {canEdit && (
            <button
              onClick={() => onEdit(location)}
              className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 font-semibold"
              title="Edit location"
            >
              <Edit className="w-5 h-5" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(location.id)}
              className="text-red-600 hover:text-red-800 dark:hover:text-red-400 font-semibold"
              title="Delete location"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      )
    },
  },
]
