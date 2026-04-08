-- ========== 5. WAREHOUSE OPERATIONS ==========

-- Receiving operations
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

-- Outbound shipments
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

-- Create indexes
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
