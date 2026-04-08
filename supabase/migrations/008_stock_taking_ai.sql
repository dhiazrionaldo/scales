-- ========== 7. STOCK TAKING & AI SUGGESTIONS ==========

-- Stock taking (cyclic counting)
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

-- AI suggestions for pallet placement
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

-- AI object detection results (from computer vision)
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

-- Create indexes
CREATE INDEX idx_stock_takes_warehouse_id ON public.stock_takes(warehouse_id);
CREATE INDEX idx_stock_takes_status ON public.stock_takes(status);
CREATE INDEX idx_stock_take_items_stock_take_id ON public.stock_take_items(stock_take_id);
CREATE INDEX idx_stock_take_items_pallet_id ON public.stock_take_items(pallet_id);
CREATE INDEX idx_ai_suggestions_warehouse_id ON public.ai_suggestions(warehouse_id);
CREATE INDEX idx_ai_suggestions_pallet_id ON public.ai_suggestions(pallet_id);
CREATE INDEX idx_ai_suggestions_accepted ON public.ai_suggestions(accepted);
CREATE INDEX idx_object_detection_results_warehouse_id ON public.object_detection_results(warehouse_id);
