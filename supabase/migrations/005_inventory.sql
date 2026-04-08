-- ========== 4. INVENTORY MANAGEMENT ==========

-- Inventory summary (aggregate view)
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

-- Stock movements log
CREATE TABLE IF NOT EXISTS public.movement_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create indexes
CREATE INDEX idx_inventory_company_id ON public.inventory(company_id);
CREATE INDEX idx_inventory_warehouse_id ON public.inventory(warehouse_id);
CREATE INDEX idx_inventory_locations_pallet_id ON public.inventory_locations(pallet_id);
CREATE INDEX idx_inventory_locations_location_id ON public.inventory_locations(location_id);
CREATE INDEX idx_stock_movements_company_id ON public.stock_movements(company_id);
CREATE INDEX idx_stock_movements_warehouse_id ON public.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_pallet_id ON public.stock_movements(pallet_id);
CREATE INDEX idx_stock_movements_from_location_id ON public.stock_movements(from_location_id);
CREATE INDEX idx_stock_movements_to_location_id ON public.stock_movements(to_location_id);
