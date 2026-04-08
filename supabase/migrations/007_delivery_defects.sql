-- ========== 6. DELIVERY ORDERS & DEFECT MANAGEMENT ==========

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

-- Defect codes lookup
CREATE TABLE IF NOT EXISTS public.defect_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) NOT NULL UNIQUE,
  category VARCHAR(50),
  description TEXT,
  severity VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Defects reported
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

-- Insert common defect codes
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

-- Create indexes
CREATE INDEX idx_delivery_orders_company_id ON public.delivery_orders(company_id);
CREATE INDEX idx_delivery_orders_warehouse_id ON public.delivery_orders(warehouse_id);
CREATE INDEX idx_delivery_orders_status ON public.delivery_orders(status);
CREATE INDEX idx_delivery_order_items_delivery_order_id ON public.delivery_order_items(delivery_order_id);
CREATE INDEX idx_defects_company_id ON public.defects(company_id);
CREATE INDEX idx_defects_warehouse_id ON public.defects(warehouse_id);
CREATE INDEX idx_defects_pallet_id ON public.defects(pallet_id);
CREATE INDEX idx_defects_status ON public.defects(status);
CREATE INDEX idx_defects_defect_code_id ON public.defects(defect_code_id);
