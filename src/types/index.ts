// User & Auth Types
export interface WarehouseUser {
  id: string;
  email: string;
  full_name: string;
  role: "ADMIN" | "OPERATOR";
  company_id: string;
  warehouse_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  company_id: string;
  role_id: string;
  role?: Role;
}

// Warehouse Types
export interface Warehouse {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  settings?: Record<string, any>;
  created_at: string;
}

// Pallet & Inventory Types
export interface Pallet {
  id: string;
  hu_code: string;
  hu_label?: string;
  location_id?: string;
  warehouse_id?: string;
  company_id: string;
  product_name: string;
  qty: number;
  batch?: string;
  status: "STORED" | "SHIPPED" | "DEFECT";
  last_scanned_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface Location {
  id: string;
  code: string;
  location_code: string;
  zone?: string;
  grid_zone: string; // Zone prefix (e.g., "A", "B", "C")
  grid_row: number; // Row in 2D grid (0-indexed)
  grid_column: number; // Column in 2D grid (0-indexed)
  warehouse_id: string;
  company_id: string;
  max_stacks: number; // Vertical capacity (default 4)
  status: "AVAILABLE" | "FULL" | "MAINTENANCE" | "DISABLED";
  created_at: string;
  updated_at: string;
}

export interface LocationOccupancy {
  location_id: string;
  location_code: string;
  warehouse_id: string;
  company_id: string;
  max_stacks: number;
  current_occupancy: number;
  available_slots: number;
  occupancy_status: "EMPTY" | "PARTIAL" | "FULL";
}

export interface Role {
  id: string;
  name: "ADMIN" | "OPERATOR";
  description?: string;
}

export interface StockMovement {
  id: string;
  pallet_id: string;
  from_location_id?: string;
  to_location_id?: string;
  movement_type: "INBOUND" | "OUTBOUND" | "ADJUSTMENT";
  operator_id: string;
  company_id: string;
  created_at: string;
}

export interface DeliveryOrder {
  id: string;
  company_id: string;
  do_number: string;
  status: "OPEN" | "COMPLETED";
  items?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  warehouse_id: string;
  company_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_damaged: number;
  unit_of_measure: string;
  created_at: string;
  updated_at: string;
}

// Operation Types
export interface ReceivingOrder {
  id: string;
  order_number: string;
  warehouse_id: string;
  supplier: string;
  status: "pending" | "partial" | "completed" | "cancelled";
  total_items: number;
  received_items: number;
  created_at: string;
  expected_delivery: string;
  completed_at?: string;
}

export interface PutawayTask {
  id: string;
  warehouse_id: string;
  pallet_id: string;
  source_location_id: string;
  target_location_id?: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface PickingTask {
  id: string;
  warehouse_id: string;
  order_id: string;
  pallet_id: string;
  quantity: number;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled";
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

// Scanning & OCR Types
export interface HUScan {
  id: string;
  warehouse_id: string;
  hu_label: string;
  scanned_at: string;
  location?: string;
  ocr_confidence: number;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  password: string;
  full_name: string;
  company_name: string;
}
