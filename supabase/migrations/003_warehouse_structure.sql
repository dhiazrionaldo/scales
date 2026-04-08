-- ========== 2. WAREHOUSE STRUCTURE ==========

-- Warehouse zones (e.g., Zone A, B, C)
CREATE TABLE IF NOT EXISTS public.warehouse_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  zone_code VARCHAR(10) NOT NULL,
  description TEXT,
  area_sqm DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(warehouse_id, zone_code)
);

-- Warehouse racks (e.g., A001, A002)
CREATE TABLE IF NOT EXISTS public.warehouse_racks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID NOT NULL REFERENCES public.warehouse_zones(id) ON DELETE CASCADE,
  rack_code VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, rack_code)
);

-- Warehouse levels (height levels in a rack)
CREATE TABLE IF NOT EXISTS public.warehouse_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rack_id UUID NOT NULL REFERENCES public.warehouse_racks(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL,
  max_weight_kg DECIMAL(10, 2),
  height_cm DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rack_id, level_number)
);

-- Warehouse bins (individual pallet positions)
CREATE TABLE IF NOT EXISTS public.warehouse_bins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id UUID NOT NULL REFERENCES public.warehouse_levels(id) ON DELETE CASCADE,
  bin_code VARCHAR(20) NOT NULL,
  bin_position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(level_id, bin_code)
);

-- Warehouse locations (flattened view for easier access)
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

-- Warehouse coordinates (for map visualization)
CREATE TABLE IF NOT EXISTS public.warehouse_coordinates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES public.warehouse_locations(id) ON DELETE CASCADE,
  x DECIMAL(10, 2) NOT NULL,
  y DECIMAL(10, 2) NOT NULL,
  width DECIMAL(10, 2),
  height DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Warehouse routes (distance matrix between locations)
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

-- Create indexes
CREATE INDEX idx_warehouse_zones_warehouse_id ON public.warehouse_zones(warehouse_id);
CREATE INDEX idx_warehouse_racks_zone_id ON public.warehouse_racks(zone_id);
CREATE INDEX idx_warehouse_levels_rack_id ON public.warehouse_levels(rack_id);
CREATE INDEX idx_warehouse_bins_level_id ON public.warehouse_bins(level_id);
CREATE INDEX idx_warehouse_locations_warehouse_id ON public.warehouse_locations(warehouse_id);
CREATE INDEX idx_warehouse_locations_status ON public.warehouse_locations(status);
CREATE INDEX idx_warehouse_coordinates_location_id ON public.warehouse_coordinates(location_id);
CREATE INDEX idx_warehouse_routes_warehouse_id ON public.warehouse_routes(warehouse_id);
CREATE INDEX idx_warehouse_maps_warehouse_id ON public.warehouse_maps(warehouse_id);
