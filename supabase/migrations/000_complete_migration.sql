-- ============================================================================
-- SCALES WMS - COMPLETE DATABASE SCHEMA MIGRATION
-- ============================================================================
-- This file is a consolidated version of all 11 migration files.
-- Run this in your Supabase SQL Editor to initialize the complete database.
-- ============================================================================

-- ========== STEP 1: INITIALIZE EXTENSIONS ==========
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON SCHEMA public TO authenticated;

-- ========== STEP 2: COMPANY & USER MANAGEMENT ==========

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouses table
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_locations INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module VARCHAR(100) NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Users table (links to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Company assignments
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Create indexes for company/user tables
CREATE INDEX idx_warehouses_company_id ON public.warehouses(company_id);
CREATE INDEX idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);

-- Insert default roles
INSERT INTO public.roles (name, description) VALUES
('ADMIN', 'Full system access'),
('WAREHOUSE_MANAGER', 'Warehouse operations management'),
('RECEIVING_OPERATOR', 'Receiving and HU scanning'),
('PUTAWAY_OPERATOR', 'Pallet placement'),
('PICKING_OPERATOR', 'Pallet picking'),
('QUALITY_CHECKER', 'Quality and defect management'),
('VIEWER', 'Read-only access')
ON CONFLICT DO NOTHING;

-- Insert default permissions
INSERT INTO public.permissions (module, action, description) VALUES
('warehouse', 'create', 'Create new warehouse'),
('warehouse', 'read', 'View warehouse details'),
('warehouse', 'update', 'Update warehouse'),
('warehouse', 'delete', 'Delete warehouse'),
('pallet', 'receive', 'Receive pallets'),
('pallet', 'putaway', 'Place pallets in locations'),
('pallet', 'pick', 'Pick pallets for outbound'),
('pallet', 'move', 'Move pallets between locations'),
('pallet', 'view', 'View pallet details'),
('inventory', 'view', 'View inventory'),
('inventory', 'adjust', 'Adjust inventory'),
('report', 'view', 'View reports'),
('report', 'export', 'Export report data'),
('defect', 'report', 'Report defects'),
('defect', 'resolve', 'Resolve defects'),
('user', 'manage', 'Manage users'),
('audit', 'view', 'View audit logs')
ON CONFLICT DO NOTHING;

-- Map policies and permission sets
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM public.roles r, public.permissions p
WHERE r.name IN ('ADMIN', 'WAREHOUSE_MANAGER')
ON CONFLICT DO NOTHING;

-- ========== STEP 3: WAREHOUSE STRUCTURE ==========

-- Warehouse zones
CREATE TABLE IF NOT EXISTS public.warehouse_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  zone_code VARCHAR(10) NOT NULL,
  description TEXT,
  area_sqm DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(warehouse_id, zone_code)
);

-- Warehouse racks
CREATE TABLE IF NOT EXISTS public.warehouse_racks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES public.warehouse_zones(id) ON DELETE CASCADE,
  rack_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, rack_code)
);

-- Warehouse levels
CREATE TABLE IF NOT EXISTS public.warehouse_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rack_id UUID NOT NULL REFERENCES public.warehouse_racks(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  max_weight_kg DECIMAL(10, 2),
  height_cm DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rack_id, level_number)
);

-- Warehouse bins
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id UUID NOT NULL REFERENCES public.warehouse_levels(id) ON DELETE CASCADE,
  bin_code VARCHAR(20) NOT NULL,
  bin_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level_id, bin_code)
);

-- Warehouse locations (flattened view)
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_code VARCHAR(50) NOT NULL,
  zone VARCHAR(10),
  rack VARCHAR(20),
  level INTEGER,
  bin VARCHAR(20),
  width_cm DECIMAL(8, 2),
  height_cm DECIMAL(8, 2),
  depth_cm DECIMAL(8, 2),
  max_weight_kg DECIMAL(10, 2),
  capacity_volume_cbm DECIMAL(10, 4),
  current_volume_cbm DECIMAL(10, 4) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  coordinates_x DECIMAL(10, 4),
  coordinates_y DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(warehouse_id, location_code)
);

-- Warehouse maps
CREATE TABLE IF NOT EXISTS public.warehouse_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  name VARCHAR(255),
  blueprint_file TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse coordinates
CREATE TABLE IF NOT EXISTS public.warehouse_coordinates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  x DECIMAL(10, 2) NOT NULL,
  y DECIMAL(10, 2) NOT NULL,
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse routes
CREATE TABLE IF NOT EXISTS public.warehouse_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  from_location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  to_location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  distance_meters DECIMAL(10, 2),
  aisle_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(warehouse_id, from_location_id, to_location_id)
);

-- Create indexes for warehouse structure
CREATE INDEX idx_warehouse_zones_warehouse_id ON public.warehouse_zones(warehouse_id);
CREATE INDEX idx_warehouse_racks_zone_id ON public.warehouse_racks(zone_id);
CREATE INDEX idx_warehouse_levels_rack_id ON public.warehouse_levels(rack_id);
CREATE INDEX idx_warehouse_bins_level_id ON public.warehouse_bins(level_id);
CREATE INDEX idx_warehouse_locations_warehouse_id ON public.warehouse_locations(warehouse_id);
CREATE INDEX idx_warehouse_locations_status ON public.warehouse_locations(status);
CREATE INDEX idx_warehouse_coordinates_location_id ON public.warehouse_coordinates(location_id);
CREATE INDEX idx_warehouse_routes_warehouse_id ON public.warehouse_routes(warehouse_id);
CREATE INDEX idx_warehouse_maps_warehouse_id ON public.warehouse_maps(warehouse_id);

-- ========== STEP 4: HU LABELS & PALLETS ==========

-- HU Labels
CREATE TABLE IF NOT EXISTS public.hu_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hu_code VARCHAR(50) NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity INTEGER NOT NULL,
  net_weight_kg DECIMAL(10, 3),
  batch_number VARCHAR(100),
  expiry_date DATE,
  supplier_name VARCHAR(255),
  receiving_reference VARCHAR(100),
  scanned_at TIMESTAMP WITH TIME ZONE,
  ocr_confidence DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pallets
CREATE TABLE IF NOT EXISTS public.pallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hu_id UUID NOT NULL REFERENCES public.hu_labels(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  pallet_code VARCHAR(50) UNIQUE,
  status VARCHAR(50) DEFAULT 'RECEIVING',
  received_at TIMESTAMP WITH TIME ZONE,
  stored_at TIMESTAMP WITH TIME ZONE,
  picked_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for HU & pallets
CREATE INDEX idx_hu_labels_company_id ON public.hu_labels(company_id);
CREATE INDEX idx_hu_labels_warehouse_id ON public.hu_labels(warehouse_id);
CREATE INDEX idx_hu_labels_hu_code ON public.hu_labels(hu_code);
CREATE INDEX idx_pallets_company_id ON public.pallets(company_id);
CREATE INDEX idx_pallets_warehouse_id ON public.pallets(warehouse_id);
CREATE INDEX idx_pallets_location_id ON public.pallets(location_id);
CREATE INDEX idx_pallets_status ON public.pallets(status);
CREATE INDEX idx_pallets_hu_id ON public.pallets(hu_id);

-- ========== STEP 5: INVENTORY ==========

-- Inventory
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  batch_number VARCHAR(100),
  total_qty INTEGER DEFAULT 0,
  available_qty INTEGER DEFAULT 0,
  reserved_qty INTEGER DEFAULT 0,
  damaged_qty INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, warehouse_id, product_sku, batch_number)
);

-- Inventory by location
CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  batch_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Movement types
CREATE TABLE IF NOT EXISTS public.movement_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  from_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  to_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  movement_type_id UUID NOT NULL REFERENCES public.movement_types(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  qty_moved INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert movement types
INSERT INTO public.movement_types (name, description) VALUES
('RECEIVING', 'Pallet received from supplier'),
('PUTAWAY', 'Pallet placed in location'),
('PICKING', 'Pallet picked for outbound'),
('ADJUSTMENT', 'Inventory adjustment'),
('DEFECT', 'Defect movement'),
('TRANSFER', 'Transfer between locations'),
('RETURN', 'Return to supplier')
ON CONFLICT DO NOTHING;

-- Create indexes for inventory
CREATE INDEX idx_inventory_company_id ON public.inventory(company_id);
CREATE INDEX idx_inventory_warehouse_id ON public.inventory(warehouse_id);
CREATE INDEX idx_inventory_locations_pallet_id ON public.inventory_locations(pallet_id);
CREATE INDEX idx_inventory_locations_location_id ON public.inventory_locations(location_id);
CREATE INDEX idx_stock_movements_company_id ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_warehouse_id ON public.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_pallet_id ON public.stock_movements(pallet_id);
CREATE INDEX idx_stock_movements_from_location_id ON public.stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location_id ON public.stock_movements(to_location_id);

-- ========== STEP 6: WAREHOUSE OPERATIONS ==========

-- Receiving
CREATE TABLE IF NOT EXISTS public.receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  hu_id UUID NOT NULL REFERENCES public.hu_labels(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  receiving_reference VARCHAR(100),
  received_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Putaway tasks
CREATE TABLE IF NOT EXISTS public.putaway_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  suggested_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  confirmed_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  ai_confidence DECIMAL(5, 2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Picking tasks
CREATE TABLE IF NOT EXISTS public.picking_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  delivery_order_id UUID NOT NULL,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  qty_to_pick INTEGER NOT NULL,
  qty_picked INTEGER DEFAULT 0,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  picked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outbound
CREATE TABLE IF NOT EXISTS public.outbound (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  delivery_order_id UUID NOT NULL,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  carrier_name VARCHAR(255),
  tracking_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for operations
CREATE INDEX idx_receiving_company_id ON public.receiving(company_id);
CREATE INDEX idx_receiving_warehouse_id ON public.receiving(warehouse_id);
CREATE INDEX idx_receiving_hu_id ON public.receiving(hu_id);
CREATE INDEX idx_receiving_status ON public.receiving(status);
CREATE INDEX idx_putaway_tasks_company_id ON public.putaway_tasks(company_id);
CREATE INDEX idx_putaway_tasks_warehouse_id ON public.putaway_tasks(warehouse_id);
CREATE INDEX idx_putaway_tasks_pallet_id ON public.putaway_tasks(pallet_id);
CREATE INDEX idx_putaway_tasks_status ON public.putaway_tasks(status);
CREATE INDEX idx_putting_tasks_suggested_location_id ON public.putaway_tasks(suggested_location_id);
CREATE INDEX idx_picking_tasks_company_id ON public.picking_tasks(company_id);
CREATE INDEX idx_picking_tasks_warehouse_id ON public.picking_tasks(warehouse_id);
CREATE INDEX idx_picking_tasks_delivery_order_id ON public.picking_tasks(delivery_order_id);
CREATE INDEX idx_picking_tasks_pallet_id ON public.picking_tasks(pallet_id);
CREATE INDEX idx_picking_tasks_status ON public.picking_tasks(status);
CREATE INDEX idx_outbound_company_id ON public.outbound(company_id);
CREATE INDEX idx_outbound_warehouse_id ON public.outbound(warehouse_id);
CREATE INDEX idx_outbound_delivery_order_id ON public.outbound(delivery_order_id);

-- ========== STEP 7: DELIVERY ORDERS & DEFECTS ==========

-- Delivery orders
CREATE TABLE IF NOT EXISTS public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  document_number VARCHAR(100) NOT NULL UNIQUE,
  customer_name VARCHAR(255),
  customer_address TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery order items
CREATE TABLE IF NOT EXISTS public.delivery_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(100),
  quantity_ordered INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  batch_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Defect codes
CREATE TABLE IF NOT EXISTS public.defect_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(50),
  description TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Defects
CREATE TABLE IF NOT EXISTS public.defects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  defect_code_id UUID REFERENCES public.defect_codes(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  description TEXT,
  severity VARCHAR(20),
  reported_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  status VARCHAR(50) DEFAULT 'OPEN',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert defect codes
INSERT INTO public.defect_codes (code, category, description, severity) VALUES
('DMG_PALLET', 'Damage', 'Pallet damaged', 'HIGH'),
('DMG_PRODUCT', 'Damage', 'Product damaged', 'MEDIUM'),
('EXP_PRODUCT', 'Expiry', 'Product expired', 'HIGH'),
('MISMATCH', 'Mismatch', 'Label mismatch', 'MEDIUM'),
('SHORT_QTY', 'Shortage', 'Quantity shortage', 'MEDIUM'),
('CONTAMINATION', 'Contamination', 'Product contaminated', 'HIGH'),
('SEAL_BROKEN', 'Seal', 'Seal broken', 'LOW'),
('LABEL_MISSING', 'Label', 'Label missing/unreadable', 'LOW')
ON CONFLICT DO NOTHING;

-- Create indexes for delivery/defects
CREATE INDEX idx_delivery_orders_company_id ON public.delivery_orders(company_id);
CREATE INDEX idx_delivery_orders_warehouse_id ON public.delivery_orders(warehouse_id);
CREATE INDEX idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX idx_delivery_order_items_delivery_order_id ON public.delivery_order_items(delivery_order_id);
CREATE INDEX idx_defects_company_id ON public.defects(company_id);
CREATE INDEX idx_defects_warehouse_id ON public.defects(warehouse_id);
CREATE INDEX idx_defects_pallet_id ON public.defects(pallet_id);
CREATE INDEX idx_defects_status ON public.defects(status);
CREATE INDEX idx_defects_defect_code_id ON public.defects(defect_code_id);

-- ========== STEP 8: STOCK TAKING & AI ==========

-- Stock takes
CREATE TABLE IF NOT EXISTS public.stock_takes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock take items
CREATE TABLE IF NOT EXISTS public.stock_take_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stock_take_id UUID NOT NULL REFERENCES public.stock_takes(id) ON DELETE CASCADE,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  expected_qty INTEGER,
  counted_qty INTEGER,
  variance INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  pallet_id UUID NOT NULL REFERENCES public.pallets(id) ON DELETE CASCADE,
  suggested_location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  chosen_location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  confidence_score DECIMAL(5, 2),
  algorithm VARCHAR(100),
  explanation TEXT,
  accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Object detection results
CREATE TABLE IF NOT EXISTS public.object_detection_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  image_reference VARCHAR(255),
  image_url TEXT,
  detected_items JSON,
  estimated_width_cm DECIMAL(8, 2),
  estimated_height_cm DECIMAL(8, 2),
  estimated_depth_cm DECIMAL(8, 2),
  confidence_score DECIMAL(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for stock taking/AI
CREATE INDEX idx_stock_takes_warehouse_id ON public.stock_takes(warehouse_id);
CREATE INDEX idx_stock_takes_status ON public.stock_takes(status);
CREATE INDEX idx_stock_take_items_stock_take_id ON public.stock_take_items(stock_take_id);
CREATE INDEX idx_stock_take_items_pallet_id ON public.stock_take_items(pallet_id);
CREATE INDEX idx_ai_suggestions_warehouse_id ON public.ai_suggestions(warehouse_id);
CREATE INDEX idx_ai_suggestions_pallet_id ON public.ai_suggestions(pallet_id);
CREATE INDEX idx_ai_suggestions_accepted ON public.ai_suggestions(accepted);
CREATE INDEX idx_object_detection_results_warehouse_id ON public.object_detection_results(warehouse_id);

-- ========== STEP 9: AUDIT & ERP ==========

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255),
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  reference_id UUID,
  payload JSONB,
  status VARCHAR(50) DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ERP sync logs
CREATE TABLE IF NOT EXISTS public.erp_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  operation VARCHAR(50),
  status VARCHAR(50) DEFAULT 'PENDING',
  payload JSONB,
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit/ERP
CREATE INDEX idx_audit_logs_company_id ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_events_company_id ON public.events(company_id);
CREATE INDEX idx_events_event_type ON public.events(event_type);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_erp_sync_logs_company_id ON public.erp_sync_logs(company_id);
CREATE INDEX idx_erp_sync_logs_entity_type ON public.erp_sync_logs(entity_type);
CREATE INDEX idx_erp_sync_logs_status ON public.erp_sync_logs(status);

-- ========== STEP 10: ROW LEVEL SECURITY ==========

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hu_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.putaway_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.picking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Users can view assigned companies" ON public.companies
  FOR SELECT USING (
    id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for warehouses
CREATE POLICY "Users can view warehouses in their companies" ON public.warehouses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert warehouses" ON public.warehouses
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM public.roles WHERE name IN ('ADMIN', 'WAREHOUSE_MANAGER')
      )
    )
  );

-- RLS Policies for warehouse locations
CREATE POLICY "Users can view locations in their warehouses" ON public.warehouse_locations
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for pallets
CREATE POLICY "Users can view pallets in their warehouses" ON public.pallets
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for HU labels
CREATE POLICY "Users can view HUs in their warehouses" ON public.hu_labels
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for inventory
CREATE POLICY "Users can view inventory in their warehouses" ON public.inventory
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for receiving
CREATE POLICY "Users can view receiving in their warehouses" ON public.receiving
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for putaway tasks
CREATE POLICY "Users can view putaway tasks in their warehouses" ON public.putaway_tasks
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for picking tasks
CREATE POLICY "Users can view picking tasks in their warehouses" ON public.picking_tasks
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for delivery orders
CREATE POLICY "Users can view delivery orders in their warehouses" ON public.delivery_orders
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for defects
CREATE POLICY "Users can view defects in their warehouses" ON public.defects
  FOR SELECT USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses 
      WHERE company_id IN (
        SELECT company_id FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for audit logs
CREATE POLICY "Admins can view audit logs in their company" ON public.audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid() AND role_id IN (
        SELECT id FROM public.roles WHERE name = 'ADMIN'
      )
    )
  );

-- RLS Policies for events
CREATE POLICY "Users can view events in their company" ON public.events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.user_companies 
      WHERE user_id = auth.uid()
    )
  );

-- ========== STEP 11: AUDIT TRIGGERS & FUNCTIONS ==========

-- Function to log audit entries
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  company_id_val UUID;
BEGIN
  -- Determine company_id based on the table
  CASE TG_TABLE_NAME
    WHEN 'pallets' THEN company_id_val := NEW.company_id;
    WHEN 'hu_labels' THEN company_id_val := NEW.company_id;
    WHEN 'inventory' THEN company_id_val := NEW.company_id;
    WHEN 'receiving' THEN company_id_val := NEW.company_id;
    WHEN 'putaway_tasks' THEN company_id_val := NEW.company_id;
    WHEN 'picking_tasks' THEN company_id_val := NEW.company_id;
    WHEN 'delivery_orders' THEN company_id_val := NEW.company_id;
    WHEN 'defects' THEN company_id_val := NEW.company_id;
    ELSE company_id_val := NULL;
  END CASE;

  INSERT INTO public.audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    company_id_val,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id::text,
    CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging on critical tables
CREATE TRIGGER audit_pallets_trigger AFTER INSERT OR UPDATE OR DELETE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_hu_labels_trigger AFTER INSERT OR UPDATE OR DELETE ON public.hu_labels
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_receiving_trigger AFTER INSERT OR UPDATE OR DELETE ON public.receiving
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_putaway_tasks_trigger AFTER INSERT OR UPDATE OR DELETE ON public.putaway_tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_picking_tasks_trigger AFTER INSERT OR UPDATE OR DELETE ON public.picking_tasks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_delivery_orders_trigger AFTER INSERT OR UPDATE OR DELETE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_defects_trigger AFTER INSERT OR UPDATE OR DELETE ON public.defects
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Create triggers for updated_at columns
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warehouse_locations_updated_at BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hu_labels_updated_at BEFORE UPDATE ON public.hu_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pallets_updated_at BEFORE UPDATE ON public.pallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_receiving_updated_at BEFORE UPDATE ON public.receiving
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_putaway_tasks_updated_at BEFORE UPDATE ON public.putaway_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delivery_orders_updated_at BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_defects_updated_at BEFORE UPDATE ON public.defects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_suggestions_updated_at BEFORE UPDATE ON public.ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.audit_trigger_func() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

-- ========== STEP 12: AUTO-CREATE USER PROFILE ON AUTH SIGNUP ==========
-- This function runs automatically when a user signs up in Supabase Auth
-- It creates an entry in public.users table so RLS policies work

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run function when new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ========== INITIALIZATION COMPLETE ==========
-- Database schema is now fully initialized with:
-- ✓ 30+ core tables
-- ✓ 50+ performance indexes
-- ✓ Row Level Security policies
-- ✓ Audit triggers
-- ✓ Auto user profile creation on signup
-- ✓ Default roles, permissions, and lookup tables
-- ========== END OF MIGRATION ==========
