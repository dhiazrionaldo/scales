# SCALES Database Migration Setup Guide

## Quick Start

You now have complete database migration files ready to run on your Supabase VM at `http://10.100.17.2:7000/`

### 🚀 Fastest Option: Execute All-in-One Migration

1. **Open Supabase Dashboard**
   - Go to: `http://10.100.17.2:7000/`
   - Login with your credentials

2. **Go to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy the Complete Migration**
   - Open the file: `supabase/migrations/000_complete_migration.sql`
   - Copy ALL the content

4. **Paste & Execute**
   - Paste into Supabase SQL Editor
   - Click **Run** button
   - ⏳ Wait 30-60 seconds for completion
   - ✅ You'll see green checkmarks for successful execution

### ✅ What Gets Created

**30+ Core Tables:**
- Companies, Warehouses, Users, Roles, Permissions
- Warehouse structure (zones, racks, levels, bins, locations)
- HU labels, Pallets, Inventory
- Receiving, Putaway, Picking, Outbound operations
- Delivery orders, Defects
- Stock taking, AI suggestions
- Audit logs, Events, ERP integration

**50+ Performance Indexes:**
- Company/warehouse navigation
- Status and timestamp filters
- Foreign key relationships
- Search optimization

**Row Level Security (RLS):**
- Users see only their company data
- Warehouse-level isolation
- Role-based access control

**Audit & Compliance:**
- Automatic audit logging on critical operations
- Updated_at timestamp maintenance
- Event tracking for integrations

**Default Data:**
- 7 predefined roles (ADMIN, WAREHOUSE_MANAGER, etc.)
- 17 permissions (warehouse, pallet, inventory, etc.)
- 7 movement types (RECEIVING, PUTAWAY, PICKING, etc.)
- 8 defect codes (DMG_PALLET, EXP_PRODUCT, etc.)

### 📋 Alternative: Step-by-Step Migrations

If you prefer to run migrations incrementally:

1. `001_init_extensions.sql` - Initialize extensions
2. `002_company_user_management.sql` - Company & user tables
3. `003_warehouse_structure.sql` - Warehouse structure
4. `004_hu_labels_pallets.sql` - Handling units & pallets
5. `005_inventory.sql` - Inventory management
6. `006_operations.sql` - Warehouse operations
7. `007_delivery_defects.sql` - Delivery & defects
8. `008_stock_taking_ai.sql` - Stock taking & AI
9. `009_audit_erp.sql` - Audit & ERP integration
10. `010_row_level_security.sql` - RLS policies
11. `011_audit_triggers.sql` - Triggers and functions

Each file can be run independently in order through Supabase SQL Editor.

### 🔍 Verify Migration Success

After running the migration, verify by checking:

1. **Table Creation**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. **View Table Count**
   ```sql
   SELECT COUNT(*) as table_count FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   Should show **30+ tables**

3. **Check Default Roles**
   ```sql
   SELECT * FROM public.roles;
   ```
   
   Should show 7 roles

4. **Check RLS on Tables**
   ```sql
   SELECT tablename FROM pg_tables 
   WHERE schemaname = 'public' 
   AND rowsecurity = true;
   ```
   
   Should show 20+ tables with RLS enabled

### 📱 Next Steps After Migration

1. **Create Test Company & Warehouse**
   ```sql
   INSERT INTO public.companies (name, city, country) 
   VALUES ('Test Company', 'Jakarta', 'Indonesia');
   
   -- Copy the company ID returned and use:
   INSERT INTO public.warehouses (company_id, name, code, city, country) 
   VALUES ('<company-uuid>', 'Central Warehouse', 'WH001', 'Jakarta', 'Indonesia');
   ```

2. **Create Warehouse Structure**
   ```sql
   -- Insert zones, racks, and locations for your warehouse
   -- See warehouse-layout.md for detailed structure
   ```

3. **Create Test Users**
   - Go to Supabase -> Auth -> Users
   - Create test users with emails
   - They'll get auth.users entries automatically

4. **Assign Users to Companies**
   ```sql
   -- After users are created, assign them roles
   INSERT INTO public.user_companies (user_id, company_id, role_id)
   SELECT 
     u.id,
     c.id,
     r.id
   FROM public.users u, public.companies c, public.roles r
   WHERE r.name = 'WAREHOUSE_MANAGER'
   LIMIT 1;
   ```

### 🆘 Troubleshooting

**Issue**: "relation already exists" error
- **Cause**: Migration already ran
- **Solution**: Drop and recreate database via Supabase dashboard, then re-run

**Issue**: Foreign key constraint errors
- **Cause**: Files run out of order
- **Solution**: Run `000_complete_migration.sql` all at once instead

**Issue**: RLS policies blocking inserts
- **Cause**: User not assigned to company
- **Solution**: Verify user has entry in `user_companies` table

**Issue**: Audit logs not recording
- **Cause**: Auth context not available
- **Solution**: Ensure authenticated user session exists before INSERT/UPDATE

### 📞 Need Help?

Check the documentation:
- `docs/database-schema.md` - Table designs and relationships
- `docs/core-tables.md` - SQL table list
- `docs/warehouse-layout.md` - Physical warehouse structure
- `docs/api-spec.md` - How to use the data via API

---

**Ready?** Copy `000_complete_migration.sql` to Supabase SQL Editor and click Run! 🚀
