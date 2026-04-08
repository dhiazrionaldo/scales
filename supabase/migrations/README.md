# SCALES Database Migrations

This directory contains SQL migration scripts for initializing the SCALES Warehouse Management System database in Supabase.

## Files Included

1. **001_init_extensions.sql** - Initialize PostgreSQL extensions (UUID, pgcrypto)
2. **002_company_user_management.sql** - Companies, warehouses, users, roles, and permissions
3. **003_warehouse_structure.sql** - Warehouse zones, racks, levels, bins, and locations
4. **004_hu_labels_pallets.sql** - Handling units and pallets
5. **005_inventory.sql** - Inventory and stock movements
6. **006_operations.sql** - Warehouse operations (receiving, putaway, picking, outbound)
7. **007_delivery_defects.sql** - Delivery orders and defect management
8. **008_stock_taking_ai.sql** - Stock taking and AI suggestions
9. **009_audit_erp.sql** - Audit logs and ERP integration
10. **010_row_level_security.sql** - Row Level Security (RLS) policies
11. **011_audit_triggers.sql** - Audit triggers and update functions

## How to Execute in Supabase

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the content of each SQL file (in order) and paste into the editor
5. Click **Run** to execute each migration
6. Repeat for all 11 files in order

### Option 2: At Supabase CLI (if installed)

Run migrations using Supabase CLI:

```bash
supabase db push
```

### Option 3: Direct SQL Connection

Use a PostgreSQL client to connect to your Supabase database:

```bash
psql "postgresql://user:password@host:port/database" -f 001_init_extensions.sql
psql "postgresql://user:password@host:port/database" -f 002_company_user_management.sql
# ... and so on for each file
```

## Database Schema Overview

### Multi-Tenant Structure
- **Companies**: Top-level organizational unit
- **Warehouses**: Physical warehouses under companies
- **Users**: System users assigned to companies with roles

### Core Operations
- **HU Labels & Pallets**: Handling unit tracking
- **Receiving**: Inbound pallet processing
- **Putaway**: AI-assisted pallet placement
- **Picking**: Outbound order fulfillment
- **Delivery Orders**: Customer shipment tracking

### Inventory & Stock
- **Inventory**: Aggregate stock levels
- **Stock Movements**: Complete movement history
- **Stock Takes**: Cyclic counting verification

### Quality & Compliance
- **Defects**: Defect reporting and tracking
- **Audit Logs**: Complete audit trail
- **ERP Sync Logs**: Integration tracking

### AI & Analytics
- **AI Suggestions**: Location recommendation scoring
- **Object Detection**: Computer vision results
- **Events**: Webhook event tracking

## Key Features

✅ **Multi-tenant architecture** - Support multiple companies and warehouses
✅ **Row Level Security (RLS)** - Data isolation by company and warehouse
✅ **Audit logging** - Complete audit trail for compliance
✅ **AI-ready** - Support for ML-based pallet placement
✅ **Scalable** - Designed for 50,000+ pallet locations
✅ **Indexed** - Performance optimized with strategic indexes
✅ **Event-driven** - Webhook and integration support

## Default Data

The following default data is inserted automatically:

### Roles
- ADMIN
- WAREHOUSE_MANAGER
- RECEIVING_OPERATOR
- PUTAWAY_OPERATOR
- PICKING_OPERATOR
- QUALITY_CHECKER
- VIEWER

### Movement Types
- RECEIVING
- PUTAWAY
- PICKING
- ADJUSTMENT
- DEFECT
- TRANSFER
- RETURN

### Defect Codes
- DMG_PALLET (Pallet damaged)
- DMG_PRODUCT (Product damaged)
- EXP_PRODUCT (Product expired)
- MISMATCH (Label mismatch)
- SHORT_QTY (Quantity shortage)
- CONTAMINATION (Product contaminated)
- SEAL_BROKEN (Seal broken)
- LABEL_MISSING (Label missing/unreadable)

## Next Steps

1. Create test data for your warehouse structure
2. Import your company and user information
3. Set up webhook endpoints for ERP integration
4. Configure AI service credentials for pallet placement
5. Begin receiving and processing pallets

## Troubleshooting

**Issue**: Foreign key constraint errors
- **Solution**: Ensure migrations are run in order. Each file depends on previous files.

**Issue**: RLS policies too restrictive
- **Solution**: Verify users are properly assigned to companies via `user_companies` table with correct roles.

**Issue**: Cannot insert data after RLS enabled
- **Solution**: Ensure current user is authenticated and has proper `user_companies` assignment.

## Support

For issues or questions:
1. Check the docs folder in the project
2. Review database-schema.md for design details
3. Check api-spec.md for integration requirements
