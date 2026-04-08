-- ========== 10. AUDIT TRIGGERS & FUNCTIONS ==========

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

-- Function to update 'updated_at' timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
