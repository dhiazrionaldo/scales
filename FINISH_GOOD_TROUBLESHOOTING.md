# Finish Good Module - Troubleshooting & FAQ

## Quick Troubleshooting Guide

### Problem: "Failed to connect to OCR service"

**Error Message**: 
```
Error: Cannot connect to OCR service at http://192.168.1.100:8000
Request failed with status code: 0
```

**Diagnosis**:
1. Check if OCR service VM is running
2. Check if OCR service container is active
3. Verify network connectivity between servers
4. Check firewall rules

**Solutions** (try in order):

```bash
# Solution 1: Verify OCR VM is reachable
ping 192.168.1.100
# Expected: Pings successful

# Solution 2: Check if port is open
Test-NetConnection -ComputerName 192.168.1.100 -Port 8000
# Expected: TcpTestSucceeded: True

# Solution 3: Test health endpoint directly
curl http://192.168.1.100:8000/health
# Expected: JSON response with status: "healthy"

# Solution 4: Check Docker container status (if using Docker)
docker ps | grep "scales-ai-ocr" OR grep "ocr"
# Expected: Container should be running

# Solution 5: Start OCR service
docker start scales-ai-ocr
# OR
python main.py  # If running directly

# Solution 6: Check OCR service logs
docker logs scales-ai-ocr --tail 50
# OR
tail -f ~/python_ai_ocr/logs/service.log
```

**If still failing**:
- [ ] Verify OCR_SERVICE_URL in `.env.local` is correct
- [ ] Verify network allows traffic on port 8000
- [ ] Check if proxy/VPN is blocking connection
- [ ] Try accessing from another machine to rule out local issue
- [ ] Contact IT for network troubleshooting

---

### Problem: "OCR extraction failed - low confidence"

**Error Message**:
```
OCR Processing Failed
Confidence score: 0.35 (Threshold: 0.50)
Low image quality detected. Please try again.
```

**Causes**:
- Poor image lighting
- Blurry or out-of-focus image
- Label text partially obscured
- Label damaged/faded
- Wrong angle (too tilted)
- Incorrect distance (too close/far)

**Solutions**:

1. **Improve Image Quality**:
   - Use better lighting (natural light or bright LED)
   - Ensure label is not in shadow
   - Hold camera steady for 2 seconds before capture
   - Zoom to frame label properly (6-12 inches distance)
   - Ensure label text is fully visible and not cut off

2. **Camera Technique**:
   - Capture at 90-degree angle to label (not tilted)
   - Keep camera lens clean
   - Avoid shiny reflections on label
   - Use highest phone camera resolution

3. **Retry with New Image**:
   - Take another photo with above improvements
   - System will re-process

4. **Manual Entry** (if available):
   - Type HU label manually
   - Contact supervisor if label is unreadable

---

### Problem: "Duplicate HU label detected"

**Error Message**:
```
HU123456 is already registered in the system.
This pallet may have been previously scanned.
```

**This is working as designed** - the system prevents duplicate registrations.

**Possible Causes**:
1. Same pallet scanned twice (genuine duplicate)
2. Different pallet with same label format (rare)
3. Label not properly removed from returned pallet

**Solutions**:

```bash
# Check if HU already exists
# Log into Supabase → SQL Editor
SELECT * FROM hu_labels WHERE hu_code = 'HU123456';

# If it exists, check its status
SELECT hu_labels.hu_code, pallets.status, pallets.stored_at
FROM hu_labels
LEFT JOIN pallets ON hu_labels.id = pallets.hu_id
WHERE hu_code = 'HU123456';
```

**Possible Results**:
- **Pallet in RECEIVED status**: Didn't complete putaway - go to Putaway step
- **Pallet in STORED status**: Stored in warehouse - cannot receive again
- **Pallet in SHIPPED status**: Already shipped - should not be received again

**If duplicate is in error**:
1. Verify it's a different physical pallet
2. Check label - may need to re-label pallet
3. Contact warehouse manager if confusion about pallet identity

---

### Problem: "Pallet not found after receiving"

**Error Message**:
```
Cannot proceed to Putaway.
Pallet reference not found in system.
```

**Causes**:
- Database connection interrupted
- Pallet insert failed silently
- Supabase RLS policy blocking access
- Wrong warehouse context

**Diagnosis**:

```typescript
// Check browser console (F12 → Console)
// Look for error details about API response

// Check Next.js server console
// Should show any database errors

// Query Supabase directly
SELECT * FROM pallets 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
```

**Solutions**:

1. **If pallet doesn't exist in database**:
   - API route failed silently
   - Check Supabase connection
   - Retry receiving with same image
   - Check browser console for errors

2. **If pallet exists but not accessible**:
   - RLS policy issue
   - Verify company_id and warehouse_id match
   - Check user permissions in Supabase

3. **If Supabase connection problem**:
   - Verify `NEXT_PUBLIC_SUPABASE_URL` in .env.local
   - Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is valid
   - Check Supabase project status
   - Try in incognito mode (clear browser cache)

---

### Problem: "Suggested locations not displaying"

**Error Message**:
```
No available locations found.
All warehouse locations are at capacity.
```

**Causes**:
- No warehouse locations configured
- All locations full
- RLS policy blocking location access
- Supabase query error

**Solutions**:

```sql
-- Check if locations exist
SELECT location_code, capacity_volume, current_volume, status
FROM warehouse_locations
WHERE warehouse_id = 'your-warehouse-id'
ORDER BY location_code;

-- Check availability
SELECT location_code, 
       capacity_volume,
       current_volume,
       (capacity_volume - current_volume) as available_space,
       status
FROM warehouse_locations
WHERE warehouse_id = 'your-warehouse-id'
AND status = 'AVAILABLE'
ORDER BY available_space DESC;

-- Add test locations if missing
INSERT INTO warehouse_locations 
(id, warehouse_id, location_code, capacity_volume, current_volume, status)
VALUES 
('loc-test-1', 'your-warehouse-id', 'A-01-01-01', 100, 0, 'AVAILABLE'),
('loc-test-2', 'your-warehouse-id', 'A-01-02-01', 100, 0, 'AVAILABLE'),
('loc-test-3', 'your-warehouse-id', 'B-01-01-01', 100, 0, 'AVAILABLE');
```

---

### Problem: API Route Returning 404 or 500 Error

**Error Messages**:
```
404 Not Found: /api/finish-good/receiving
500 Internal Server Error
```

**Diagnosis Steps**:

1. **Check if route file exists**:
   ```bash
   # Should exist at:
   src/app/api/finish-good/receiving/route.ts
   # (for /api/finish-good/receiving endpoint)
   ```

2. **Check Next.js dev server console**:
   ```bash
   # Error details should appear in terminal running: npm run dev
   # Look for syntax errors, import errors, etc.
   ```

3. **Check browser console** (F12):
   ```javascript
   // Error message may indicate missing endpoint or auth issue
   console.log('API Error:', error);
   ```

**Common Causes & Fixes**:

| Error | Cause | Fix |
|-------|-------|-----|
| 404 | Route file not created | Create missing route file |
| 404 | Route path mismatch | Verify folder structure matches URL |
| 500 | Syntax error in route | Check route.ts for TypeScript errors |
| 500 | Missing import | Add missing dependency import |
| 500 | Supabase error | Check Supabase connection and RLS policies |
| 401 | Not authenticated | Login first, verify JWT token |
| 403 | RLS policy denied | Verify warehouse_id and company_id match |

**To rebuild and test**:
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Clear Next.js cache
rm -r .next

# 3. Reinstall dependencies
npm install

# 4. Rebuild
npm run build

# 5. Start dev server
npm run dev

# 6. Test endpoint
curl -X GET http://localhost:3000/api/health
```

---

### Problem: "Picking list not generating"

**Error Message**:
```
Failed to generate picking list.
Delivery order not recognized.
```

**Causes**:
- OCR failed to extract delivery order info
- Delivery order document image too low quality
- Required products not in inventory
- Inventory empty/zero quantity

**Solutions**:

1. **Improve delivery order image**:
   - Same quality requirements as HU labels
   - Ensure all product lines are visible
   - Quantity clearly written

2. **Check inventory** (if OCR succeeded):
   ```sql
   -- Check if products exist in inventory
   SELECT product_name, batch, total_qty, available_qty
   FROM inventory
   WHERE warehouse_id = 'your-warehouse-id'
   AND product_name IN ('Brake Pad A', 'Rotor B');
   
   -- If empty, or zero available_qty, add inventory
   INSERT INTO inventory 
   (id, company_id, warehouse_id, product_name, batch, total_qty, available_qty, reserved_qty)
   VALUES 
   (gen_random_uuid(), 'your-company-id', 'your-warehouse-id', 'Brake Pad A', 'BATCH2025A', 500, 500, 0);
   ```

3. **Retry with better quality DO image**

---

### Problem: "Cannot complete picking - items not checked"

**Error Message**:
```
Cannot complete. You must pick all items before proceeding.
2 of 3 items remaining.
```

**This is working as designed** - prevents shipping incomplete orders.

**Solution**:
- Check all items in the picking list
- Click checkbox for each location visited
- Verify count matches (completed/total)
- Then click "Complete Picking"

**If items cannot be picked**:
- Check if items are in warehouse
- Verify pallet status is STORED
- Check inventory availability

---

### Problem: "Gate out failed - pallet not found"

**Error Message**:
```
Cannot release shipment.
One or more pallets in picking tasks not found.
```

**Causes**:
- Pallet deleted from system (shouldn't happen)
- Pallet status changed unexpectedly
- Data integrity issue

**Solutions**:

```sql
-- Verify picking tasks reference valid pallets
SELECT pt.id, pt.delivery_order_id, pt.pallet_id, p.status
FROM picking_tasks pt
LEFT JOIN pallets p ON pt.pallet_id = p.id
WHERE pt.delivery_order_id = 'your-delivery-order-id'
AND p.id IS NULL;  -- This shows missing pallets

-- If pallets are missing, check if they were deleted
SELECT * FROM pallets 
WHERE id = 'missing-pallet-id'
LIMIT 1;
```

**If data is inconsistent**:
- Contact database administrator
- May need to manually correct data in Supabase
- Document incident for root cause analysis

---

### Problem: Inventory Not Updated After Gate Out

**Symptom**:
```
Gate out completed successfully.
But inventory quantities didn't decrease.
```

**Check**:

```sql
-- Verify stock transactions were created
SELECT * FROM stock_transactions 
WHERE delivery_order_id = 'your-delivery-order-id'
AND transaction_type = 'OUTBOUND'
ORDER BY created_at DESC;

-- Verify inventory was updated
SELECT product_name, batch, available_qty, reserved_qty, total_qty
FROM inventory
WHERE product_name = 'Brake Pad A'
AND warehouse_id = 'your-warehouse-id';

-- Check audit logs for error details
SELECT * FROM audit_logs
WHERE operation_type = 'DELIVERY_GATE_OUT'
AND details->>'delivery_order_id' = 'your-delivery-order-id'
ORDER BY created_at DESC;
```

**Possible Issues**:
1. Stock transaction created but inventory update failed
2. RLS policy preventing update
3. Database constraint violation

**Resolution**:
- If transaction exists but inventory not updated: Contact DBA to manually update
- If transaction missing: Likely API error - check logs
- Run gate out again if it was a temporary error

---

### Problem: Slow OCR Processing

**Symptom**:
```
OCR taking 5+ seconds to process image
Expected: < 300ms
```

**Diagnosis**:

```bash
# 1. Check OCR service performance
# SSH to OCR VM and monitor
top  # Check CPU and memory usage
iostat 1 5  # Check disk I/O

# 2. Check network latency
ping -c 5 192.168.1.100  # Note average time

# 3. Check if OCR model is loaded
# Look for GPU utilization (if using GPU)
nvidia-smi  # Check if CUDA available
```

**Possible Causes & Solutions**:

| Cause | Solution |
|-------|----------|
| High network latency | Move OCR service closer to NextJS, optimize network |
| OCR model loading | Model cached - slow on first request only |
| Image size too large | Compress image before uploading |
| OCR service under heavy load | Add more resources or load balance |
| Disk I/O bottleneck | Check disk speed, use faster storage |
| GPU not initialized | Configure GPU support, check drivers |
| CPU throttling | Check kernel logs, ensure good cooling |

**Quick Fix** (if temporary):
```bash
# Restart OCR service to clear cache
docker restart scales-ai-ocr
# or
systemctl restart ocr_service
```

---

### Problem: "Image upload timeout"

**Error Message**:
```
Upload timeout after 30 seconds.
Connection to server lost.
```

**Causes**:
- Network connection unstable
- Server taking too long to process
- Image file too large
- Firewall/proxy interference

**Solutions**:

1. **Check file size**:
   - Max size should be 5MB
   - Compress if larger: `Convert image.jpg -quality 80 image_compressed.jpg`

2. **Check network**:
   - Run speed test
   - Check WiFi signal strength
   - Try wired connection if available

3. **Increase timeout** (if applicable):
   ```env
   # In .env.local
   OCR_TIMEOUT=60000  # 60 seconds instead of 30
   ```

4. **Retry with better connectivity**

---

## Frequently Asked Questions (FAQ)

### Q: Can I use the Finish Good module without the self-hosted OCR service?

**A**: No, the implementation requires OCR service for:
- Receiving: HU label extraction
- Picking: Delivery order processing

Without OCR, you would need to:
1. Manually type HU labels and delivery info
2. Modify API routes to skip OCR calls
3. Create alternative input forms

This is not recommended for production use.

---

### Q: What image formats are supported for OCR?

**A**: Supported formats:
- ✓ JPEG (.jpg, .jpeg)
- ✓ PNG (.png)
- ✓ GIF (.gif)
- ✓ WebP (.webp)

Not supported:
- ✗ BMP
- ✗ TIFF
- ✗ PDF
- ✗ SVG

**Recommendation**: Use JPEG for photos, PNG for scanned documents.

---

### Q: What is the maximum file size for image upload?

**A**: 5MB per image.

For larger images, compress first:
```bash
# Using ImageMagick
mogrify -quality 85 -resize 1920x1080 image.jpg

# Using ffmpeg
ffmpeg -i large_image.jpg -q:v 2 small_image.jpg
```

---

### Q: Can the system handle high-speed warehouse operations?

**A**: Yes, with proper configuration:

**Recommended Setup for High Throughput**:
- [ ] OCR service on GPU (NVIDIA)
- [ ] Multiple OCR service instances with load balancer
- [ ] Supabase with connection pooling
- [ ] Redis caching for location suggestions
- [ ] NextJS on production-grade server (4+ CPU cores, 8GB+ RAM)

**Estimated Throughput**:
- Single OCR service: 10-20 pallets/minute
- 3x OCR services with load balance: 30-60 pallets/minute
- Optimized setup: 100+ pallets/minute

---

### Q: What happens if a pallet is received but never goes through putaway?

**A**: The pallet remains in `RECEIVED` status indefinitely.

**Management**:
```sql
-- Find stale received pallets
SELECT hu_code, created_at, status
FROM hu_labels hl
LEFT JOIN pallets p ON hl.id = p.hu_id
WHERE p.status = 'RECEIVED'
AND p.created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at;
```

**Resolution Option**:
1. Contact warehouse supervisor
2. Verify pallet is still in receiving area
3. Complete putaway process
4. Or cancel if pallet was misplaced

---

### Q: Can I modify suggested locations algorithm?

**A**: Yes! The API currently suggests locations by:
1. First available location
2. Capacity percentage
3. Distance score

**To Customize**:
1. Edit `picking/route.ts`
2. Modify the location query logic
3. Add factors like:
   - Zone affinity (products from same supplier)
   - Vertical stacking compatibility
   - Temperature requirements
   - Picking frequency

Example enhancement:
```typescript
// Find locations with affinity scoring
const suggestions = await supabase
  .from('warehouse_locations')
  .select('*')
  .eq('warehouse_id', warehouseId)
  .eq('status', 'AVAILABLE')
  .order('zone ASC')  // Group by zone
  .order('current_volume ASC')  // Prefer empty locations
  .limit(5);
```

---

### Q: What about inventory allocation for multi-order picks?

**A**: Current implementation allocates inventory sequentially:
1. First order gets available stock
2. If insufficient, partial fulfillment
3. Backorder created automatically

**For Optimization** (future enhancement):
- Implement inventory reservation system
- Pre-allocate for confirmed orders
- Support priority-based allocation
- Implement wave picking

---

### Q: Can I use barcodes instead of OCR?

**A**: The system could be modified to:
1. Scan barcode → lookup in database
2. Skip OCR processing
3. Faster processing (no OCR delay)

**To Implement**:
```typescript
// Alternative to OCR in receiving route
const huLabel = await supabase
  .from('hu_labels')
  .select('*')
  .eq('hu_code', scannedBarcode)
  .single();

if (huLabel) {
  // Use existing label (returning pallet)
  // Create new pallet record pointing to same label
} else {
  // Barcode not found - error or create new
}
```

Requires barcode labels to be pre-printed with unique codes.

---

### Q: How do I handle damaged or illegible labels?

**A**: Workflow:
1. Try OCR 2-3 times with different angles/lighting
2. If still failing, manual entry option (if implemented)
3. Contact warehouse supervisor
4. Physical inspection to verify pallet contents
5. Manual entry in system if absolutely necessary

**Best Practice**: Maintain label printing/maintenance program to prevent damage.

---

### Q: Can I track pallet movement between locations?

**A**: Currently partial tracking via:
- `picking` table: Shows pallets selected for orders
- `outbound` table: Shows pallets shipped
- `inventory_locations` table: Shows pallet locations

**For Complete History**:
```sql
-- Add pallet movement audit trail
CREATE TABLE pallet_movements (
  id UUID PRIMARY KEY,
  pallet_id UUID NOT NULL REFERENCES pallets(id),
  from_location UUID REFERENCES warehouse_locations(id),
  to_location UUID REFERENCES warehouse_locations(id),
  movement_type VARCHAR(50),
  operator_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track every location change
INSERT INTO pallet_movements (...) 
VALUES (...) 
ON UPDATE OF location_id;
```

---

### Q: What are the database backup requirements?

**A**: Recommended backup strategy:

**Supabase Backups**:
- [ ] Automatic daily backups (Supabase Pro)
- [ ] 30-day retention
- [ ] Point-in-time recovery available
- [ ] Weekly backup verification

**Application Backups**:
- [ ] Git repository backed up
- [ ] Container images saved
- [ ] Configuration files encrypted and backed up

**Recovery Time Objective (RTO)**: < 4 hours
**Recovery Point Objective (RPO)**: < 1 hour

---

### Q: Can I export picking lists to a mobile app?

**A**: Yes, the picking list JSON can be exported:
```typescript
// In picking route
const pickingList = { 
  delivery_order_id,
  items: [
    { task_id, location_code, product, qty, ... }
  ]
};

// Export as JSON
res.json(pickingList);

// Mobile app can fetch and display
```

**Mobile Integration Steps**:
1. Create mobile app consuming picking list API
2. Show items in list format with checkboxes
3. Submit completion status back to NextJS API
4. Sync with warehouse system

---

### Q: How do I reset/rollback if something goes wrong?

**A**: Depends on the stage:

**If In Receiving**:
- Just retry - no data is committed until confirmation
- OCR timeout? Retry with same image

**If In Putaway**:
- No commit until location confirmed
- Can select different location

**If In Picking**:
- Can unchecked items
- Can restart picking from beginning

**If Gate Out Already Released**:
- **CANNOT UNDO** - Shipment is final
- Must contact supervisor for inventory adjustment
- Manual database correction needed

**Data Rollback from Supabase**:
```sql
-- Read-only: Check what would be rolled back
SELECT * FROM audit_logs 
WHERE operation_type = 'DELIVERY_GATE_OUT'
AND details->>'delivery_order_id' = 'your-do'
ORDER BY created_at DESC LIMIT 1;

-- Point-in-time recovery
-- Contact Supabase support to restore to specific timestamp
-- This would revert all data changes to that point
```

---

### Q: How am I billed for Supabase usage?

**A (Typical Costs)**:
- Database storage: Pay-as-you-go ($10/month base + $0.125/GB)
- Bandwidth: Included in Pro plan
- Real-time subscriptions: Included
- API calls: Unlimited
- Auth: Unlimited

**For Finish Good module, estimate**:
- Storage: ~500MB for 10,000 pallets = ~$10/month
- Auth: Free (included with JWT)
- Total monthly for Finish Good: ~$15-20/month

**Cost Optimization**:
- Archive old operations to cold storage
- Implement query caching
- Use connection pooling

---

## Getting Help

### Support Channels

1. **Technical Issues**:
   - Check this troubleshooting guide first
   - Check logs in browser console (F12)
   - Check Next.js dev server console
   - Check OCR service logs: `docker logs scales-ai-ocr`

2. **Database Issues**:
   - Check Supabase dashboard
   - Run diagnostic queries (provided in guides)
   - Contact Supabase support if infrastructure issue

3. **OCR Service Issues**:
   - Check OCR service logs on VM
   - Verify network connectivity
   - Test health endpoint directly
   - Contact DevOps/Infrastructure team

4. **General Questions**:
   - Review documentation
   - Check FAQ section
   - Ask team members with Finish Good experience

### Quick Debug Checklist

Before escalating, verify:
- [ ] `.env.local` has correct values
- [ ] NEXT_PUBLIC_OCR_SERVICE_URL is accessible (ping test)
- [ ] Supabase connection working
- [ ] User is logged in and authenticated
- [ ] User has permission to access warehouse
- [ ] Database tables exist and have data
- [ ] OCR service is running (check Docker/process)
- [ ] No obvious errors in browser console
- [ ] API response status codes (200, 400, 401, 404, 500)

---

## Glossary

- **HU**: Handling Unit - Physical package with label
- **DO**: Delivery Order - Customer shipment request
- **OCR**: Optical Character Recognition - Vision-based text extraction
- **RLS**: Row Level Security - Database access control
- **JWT**: JSON Web Token - Authentication credential
- **CORS**: Cross-Origin Resource Sharing - Browser security
- **API**: Application Programming Interface - Service endpoint
- **RTO**: Recovery Time Objective - Target recovery time
- **RPO**: Recovery Point Objective - Target data loss acceptable

---

Last updated: March 5, 2026  
Version: 1.0
