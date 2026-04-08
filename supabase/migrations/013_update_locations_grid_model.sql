-- ========== MIGRATION: Update warehouse_locations to 2D Grid Stack Model ==========
-- This migration aligns the warehouse_locations table with the SCALES Grid-Based Stack model
-- as defined in the documentation (warehouse-layout.md)
--
-- Key Changes:
-- 1. Add grid positioning fields (grid_row, grid_column) for 2D visualization
-- 2. Add max_stacks field for vertical capacity per location (as per rules.md)
-- 3. Add grid_zone for zone-specific grid organization
-- 4. Reorganize capacity tracking to focus on pallet count vs. volume

-- Step 1: Add new columns to warehouse_locations
ALTER TABLE IF EXISTS public.warehouse_locations
ADD COLUMN IF NOT EXISTS grid_row INTEGER COMMENT 'Row position in the 2D grid (0-indexed)',
ADD COLUMN IF NOT EXISTS grid_column INTEGER COMMENT 'Column position in the 2D grid (0-indexed)',
ADD COLUMN IF NOT EXISTS max_stacks INTEGER DEFAULT 4 COMMENT 'Maximum number of pallets that can be stacked vertically',
ADD COLUMN IF NOT EXISTS grid_zone VARCHAR(10) COMMENT 'Zone prefix for this location (e.g., "A", "B", "C")',
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Step 2: Create a unique constraint for company-based multi-tenancy
ALTER TABLE IF EXISTS public.warehouse_locations
DROP CONSTRAINT IF EXISTS warehouse_locations_warehouse_id_location_code_key CASCADE;

ALTER TABLE IF EXISTS public.warehouse_locations
ADD CONSTRAINT warehouse_locations_company_warehouse_code_unique
UNIQUE (company_id, warehouse_id, location_code);

-- Step 3: Create composite index for grid-based queries
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_grid_positioning
ON public.warehouse_locations(warehouse_id, grid_zone, grid_row, grid_column);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company
ON public.warehouse_locations(company_id);

-- Step 4: Create a view for current occupancy calculation
-- This view counts the number of pallets currently stored in each location
-- Counts pallets that are PUTAWAY_PENDING (assigned) or STORED (physically placed)
CREATE OR REPLACE VIEW public.location_occupancy AS
SELECT
  wl.id AS location_id,
  wl.location_code,
  wl.warehouse_id,
  wl.company_id,
  wl.max_stacks,
  wl.grid_zone,
  wl.grid_row,
  wl.grid_column,
  wl.status,
  COUNT(p.id) AS current_occupancy,
  wl.max_stacks - COUNT(p.id) AS available_slots,
  CASE
    WHEN COUNT(p.id) = 0 THEN 'EMPTY'
    WHEN COUNT(p.id) < wl.max_stacks THEN 'PARTIAL'
    WHEN COUNT(p.id) >= wl.max_stacks THEN 'FULL'
  END AS occupancy_status
FROM public.warehouse_locations wl
LEFT JOIN public.pallets p
  ON p.location_id = wl.id
  AND p.status IN ('PUTAWAY_PENDING', 'STORED')
GROUP BY wl.id, wl.location_code, wl.warehouse_id, wl.company_id, wl.max_stacks,
         wl.grid_zone, wl.grid_row, wl.grid_column, wl.status;

-- Step 5: Create a function to check if a location can accept more pallets
CREATE OR REPLACE FUNCTION public.can_store_pallet(
  p_location_id UUID,
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (lo.current_occupancy < lo.max_stacks)
    FROM public.location_occupancy lo
    WHERE lo.location_id = p_location_id
    AND lo.company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Step 6: Create audit/comment columns for tracking grid changes
ALTER TABLE IF EXISTS public.warehouse_locations
ADD COLUMN IF NOT EXISTS grid_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 7: Create an enum for location status if not exists
DO $$ BEGIN
    CREATE TYPE location_status_enum AS ENUM ('AVAILABLE', 'FULL', 'MAINTENANCE', 'DISABLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 8: Update the status column to use enum (if schema allows)
-- Note: This is optional and can be applied after data migration if needed
-- ALTER TABLE public.warehouse_locations ALTER COLUMN status TYPE location_status_enum USING status::location_status_enum;

-- Step 9: Create indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_status
ON public.warehouse_locations(status)
WHERE status != 'DISABLED';

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_zone
ON public.warehouse_locations(grid_zone);

-- ========== Documentation ==========
-- After running this migration, the warehouse_locations table now supports:
--
-- 1. 2D Grid Positioning:
--    - grid_row: Row number in the zone grid (0-indexed)
--    - grid_column: Column number in the zone grid (0-indexed)
--    - grid_zone: Zone prefix (e.g., "A-", "B-")
--
-- 2. Stack Capacity Management:
--    - max_stacks: Vertical capacity (default 4 pallets)
--    - occupancy view: Real-time pallet count per location
--    - can_store_pallet(): Function to check if location accepts more pallets
--
-- 3. Multi-Tenancy:
--    - company_id: Full data isolation per sister company
--
-- Usage Examples:
--
-- Get all locations for a warehouse with occupancy:
-- SELECT * FROM public.location_occupancy WHERE warehouse_id = $1;
--
-- Check if a location is full:
-- SELECT can_store_pallet($location_id, auth.uid()::uuid) AS can_store;
--
-- Get all empty stacks in Zone A:
-- SELECT * FROM location_occupancy
-- WHERE grid_zone = 'A' AND occupancy_status = 'EMPTY';
--
-- Generate grid in admin: All locations in Zone A, rows 0-5, cols 0-10:
-- INSERT INTO warehouse_locations (warehouse_id, company_id, location_code, grid_zone, grid_row, grid_column, max_stacks)
-- SELECT $warehouse_id, $company_id, 'A-' || (row_num * 10 + col_num)::text, 'A', row_num, col_num, 4
-- FROM (SELECT generate_series(0, 5) AS row_num) r
-- CROSS JOIN (SELECT generate_series(0, 10) AS col_num) c;
