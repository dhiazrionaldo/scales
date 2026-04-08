-- ========== 3. HANDLING UNITS (HU) & PALLETS ==========

-- HU Labels (Handling Unit identification)
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

-- Create indexes
CREATE INDEX idx_hu_labels_company_id ON public.hu_labels(company_id);
CREATE INDEX idx_hu_labels_warehouse_id ON public.hu_labels(warehouse_id);
CREATE INDEX idx_hu_labels_hu_code ON public.hu_labels(hu_code);
CREATE INDEX idx_pallets_company_id ON public.pallets(company_id);
CREATE INDEX idx_pallets_warehouse_id ON public.pallets(warehouse_id);
CREATE INDEX idx_pallets_location_id ON public.pallets(location_id);
CREATE INDEX idx_pallets_status ON public.pallets(status);
CREATE INDEX idx_pallets_hu_id ON public.pallets(hu_id);
