-- ========== 9. ROW LEVEL SECURITY (RLS) POLICIES ==========

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

-- RLS rule for users (can only see their own data)
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- RLS rules for companies (all authenticated users can access)
CREATE POLICY "Authenticated users can view all companies" ON public.companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update companies" ON public.companies
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete companies" ON public.companies
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for warehouses (all authenticated users can access)
CREATE POLICY "Authenticated users can view all warehouses" ON public.warehouses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert warehouses" ON public.warehouses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update warehouses" ON public.warehouses
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete warehouses" ON public.warehouses
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for warehouse locations (all authenticated users can access)
CREATE POLICY "Authenticated users can view all locations" ON public.warehouse_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert locations" ON public.warehouse_locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update locations" ON public.warehouse_locations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete locations" ON public.warehouse_locations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for pallets (all authenticated users can access)
CREATE POLICY "Authenticated users can view all pallets" ON public.pallets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert pallets" ON public.pallets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update pallets" ON public.pallets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete pallets" ON public.pallets
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for HU labels (all authenticated users can access)
CREATE POLICY "Authenticated users can view all HUs" ON public.hu_labels
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert HUs" ON public.hu_labels
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update HUs" ON public.hu_labels
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete HUs" ON public.hu_labels
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for inventory (all authenticated users can access)
CREATE POLICY "Authenticated users can view all inventory" ON public.inventory
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert inventory" ON public.inventory
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inventory" ON public.inventory
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete inventory" ON public.inventory
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for receiving (all authenticated users can access)
CREATE POLICY "Authenticated users can view all receiving" ON public.receiving
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert receiving" ON public.receiving
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update receiving" ON public.receiving
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete receiving" ON public.receiving
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for putaway tasks (all authenticated users can access)
CREATE POLICY "Authenticated users can view all putaway tasks" ON public.putaway_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert putaway tasks" ON public.putaway_tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update putaway tasks" ON public.putaway_tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete putaway tasks" ON public.putaway_tasks
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for picking tasks (all authenticated users can access)
CREATE POLICY "Authenticated users can view all picking tasks" ON public.picking_tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert picking tasks" ON public.picking_tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update picking tasks" ON public.picking_tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete picking tasks" ON public.picking_tasks
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for delivery orders (all authenticated users can access)
CREATE POLICY "Authenticated users can view all delivery orders" ON public.delivery_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert delivery orders" ON public.delivery_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update delivery orders" ON public.delivery_orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete delivery orders" ON public.delivery_orders
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for defects (all authenticated users can access)
CREATE POLICY "Authenticated users can view all defects" ON public.defects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert defects" ON public.defects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update defects" ON public.defects
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete defects" ON public.defects
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for audit logs (all authenticated users can access)
CREATE POLICY "Authenticated users can view all audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update audit logs" ON public.audit_logs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete audit logs" ON public.audit_logs
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for events (all authenticated users can access)
CREATE POLICY "Authenticated users can view all events" ON public.events
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update events" ON public.events
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete events" ON public.events
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for user_companies (all authenticated users can access)
CREATE POLICY "Authenticated users can view all user_companies" ON public.user_companies
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert user_companies" ON public.user_companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update user_companies" ON public.user_companies
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete user_companies" ON public.user_companies
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for warehouse zones (all authenticated users can access)
CREATE POLICY "Authenticated users can view all warehouse_zones" ON public.warehouse_zones
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert warehouse_zones" ON public.warehouse_zones
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update warehouse_zones" ON public.warehouse_zones
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete warehouse_zones" ON public.warehouse_zones
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for inventory locations (all authenticated users can access)
CREATE POLICY "Authenticated users can view all inventory_locations" ON public.inventory_locations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert inventory_locations" ON public.inventory_locations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update inventory_locations" ON public.inventory_locations
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete inventory_locations" ON public.inventory_locations
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for stock movements (all authenticated users can access)
CREATE POLICY "Authenticated users can view all stock_movements" ON public.stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_movements" ON public.stock_movements
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_movements" ON public.stock_movements
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_movements" ON public.stock_movements
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for stock takes (all authenticated users can access)
CREATE POLICY "Authenticated users can view all stock_takes" ON public.stock_takes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert stock_takes" ON public.stock_takes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update stock_takes" ON public.stock_takes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete stock_takes" ON public.stock_takes
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- RLS rules for AI suggestions (all authenticated users can access)
CREATE POLICY "Authenticated users can view all ai_suggestions" ON public.ai_suggestions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert ai_suggestions" ON public.ai_suggestions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ai_suggestions" ON public.ai_suggestions
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete ai_suggestions" ON public.ai_suggestions
  FOR DELETE USING (auth.uid() IS NOT NULL);

