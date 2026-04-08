# Finish Good Module - Test Plan & Validation Guide

## Overview

This document provides comprehensive test cases for validating the Finish Good Module implementation with self-hosted OCR integration across all four workflow steps.

## Test Environment Setup

### Prerequisites
- NextJS dev server running: `npm run dev`
- Supabase project connected and authenticated
- Self-hosted OCR service running and accessible
- Test warehouse, users, and locations pre-configured in Supabase
- Test images (HU labels and delivery orders) available

### Test User Account
```
Email: test@scales-wms.local
Password: TestPassword123!
Warehouse: TEST-WH-001
Company: TEST-CORP-001
```

---

## Part 1: RECEIVING STEP TESTS

### Test Data Preparation

Create test images:
1. **Valid HU Label Image** (`test_hu_valid.png`)
   - Text: "HU123456" 
   - Text: "Brake Pad A"
   - Text: "120 pieces"
   - Text: "BATCH2025A"

2. **Invalid HU (Low Quality)** (`test_hu_blurry.png`)
   - Same text but intentionally blurred/low contrast

3. **Invalid HU (Already Scanned)** (`test_hu_duplicate.png`)
   - Same HU label scanned twice

### Test Case RCV-01: Successful HU Label Recognition

**Objective**: Verify OCR successfully extracts HU label data

**Steps**:
1. Navigate to Finish Good → Receiving tab
2. Click "Capture HU Label"
3. Upload `test_hu_valid.png`
4. Wait for OCR processing to complete

**Expected Results**:
- [ ] Image loads successfully
- [ ] OCR processing shows progress indicator
- [ ] Processing completes in < 5 seconds
- [ ] Extracted data displays:
  - HU Label: HU123456
  - Product Name: Brake Pad A
  - Quantity: 120
  - Batch: BATCH2025A
- [ ] Confidence score ≥ 0.8 (high quality)
- [ ] "Next Step" button becomes enabled
- [ ] Audit log created with operation_type: "HU_RECEIVED"

**Pass Criteria**: All checks passed ✓

---

### Test Case RCV-02: Camera Capture Flow

**Objective**: Verify camera capture and local image processing works

**Steps**:
1. Navigate to Finish Good → Receiving tab
2. Click "Camera" button
3. Allow camera permission
4. Aim at HU label
5. Take snapshot
6. Confirm image

**Expected Results**:
- [ ] Camera permission dialog appears
- [ ] Live video feed displays
- [ ] Snapshot button captures frame
- [ ] Captured image preview shown
- [ ] Re-capture option available
- [ ] Upon confirmation:
  - Image uploaded to OCR service
  - Processing completes
  - Extracted data displayed
- [ ] Same results as RCV-01

**Pass Criteria**: All checks passed ✓

---

### Test Case RCV-03: Low Confidence Detection

**Objective**: Verify system handles low-quality images appropriately

**Steps**:
1. Upload `test_hu_blurry.png`
2. Wait for OCR processing

**Expected Results**:
- [ ] Image processes successfully
- [ ] Confidence score < 0.5 (shown in red)
- [ ] Warning message: "Low quality image detected. Please retake."
- [ ] "Next Step" button is DISABLED
- [ ] User can retry with new image
- [ ] Retry doesn't create duplicate records

**Pass Criteria**: All checks passed ✓

---

### Test Case RCV-04: Duplicate HU Detection

**Objective**: Verify system prevents duplicate HU scans

**Steps**:
1. Upload same HU label image twice in succession
2. First scan should succeed
3. Second scan attempts to create same HU

**Expected Results - First Scan**:
- [ ] HU extracted successfully
- [ ] Pallet created with status: RECEIVED
- [ ] Audit log: operation_type = HU_RECEIVED
- [ ] Navigation to Putaway enabled

**Expected Results - Second Scan**:
- [ ] OCR extraction successful
- [ ] System detects duplicate HU
- [ ] Error message: "HU123456 already registered"
- [ ] Database check shows no duplicate pallet created
- [ ] Audit log: operation_type = DUPLICATE_HU_DETECTED

**Pass Criteria**: Duplicate detected and rejected ✓

---

### Test Case RCV-05: OCR Service Timeout

**Objective**: Verify graceful handling of slow OCR service

**Setup**:
1. Simulate slow OCR response by adding artificial delay on VM:
   ```python
   import time
   time.sleep(10)  # In OCR endpoint
   ```

**Steps**:
1. Set `OCR_TIMEOUT=3000` (3 seconds) in .env.local
2. Upload image and wait for timeout

**Expected Results**:
- [ ] Timeout error appears after 3 seconds
- [ ] User-friendly message: "OCR service took too long. Please try again."
- [ ] "Retry" button available
- [ ] No partial data saved to database
- [ ] Audit log: operation_type = OCR_TIMEOUT
- [ ] Can retry with same image

**Pass Criteria**: Timeout handled gracefully ✓

---

### Test Case RCV-06: Database Constraint Validation

**Objective**: Verify all database records created correctly

**Steps**:
1. Complete successful HU scan
2. Check Supabase database

**Expected Results** (query each table):

```sql
-- hu_labels table
SELECT * FROM hu_labels WHERE hu_code = 'HU123456';
-- Expected: 1 row with product_name, qty, batch, company_id, warehouse_id

-- pallets table
SELECT * FROM pallets WHERE hu_id = (SELECT id FROM hu_labels WHERE hu_code = 'HU123456');
-- Expected: 1 row with status = 'RECEIVED', location_id = NULL initially

-- receiving table
SELECT * FROM receiving WHERE hu_id = (SELECT id FROM hu_labels WHERE hu_code = 'HU123456');
-- Expected: 1 row with received_time set, status = 'RECEIVED'

-- audit_logs table
SELECT * FROM audit_logs WHERE details->>'hu_label' = 'HU123456' 
AND operation_type = 'HU_RECEIVED'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with operator_id, company_id, warehouse_id, details JSON
```

**Pass Criteria**: All expected rows created ✓

---

## Part 2: PUTAWAY STEP TESTS

### Test Data Preparation

Pre-create 10 warehouse locations in Supabase:

```sql
INSERT INTO warehouse_locations (id, warehouse_id, location_code, current_volume, capacity_volume, status) VALUES
('loc-001', 'wh-test-001', 'A-01-01-01', 50, 100, 'AVAILABLE'),
('loc-002', 'wh-test-001', 'A-01-02-01', 75, 100, 'AVAILABLE'),
('loc-003', 'wh-test-001', 'A-02-01-01', 20, 100, 'AVAILABLE'),
('loc-004', 'wh-test-001', 'B-01-01-01', 90, 100, 'AVAILABLE'),
('loc-005', 'wh-test-001', 'B-01-02-01', 100, 100, 'FULL'),
...
```

### Test Case PUT-01: Location Selection from Suggestions

**Objective**: Verify suggested locations display and selection works

**Prerequisites**:
- Complete successful RCV-01 test (Receiving with pallet)
- Should auto-advance to Putaway step

**Steps**:
1. Putaway tab now active showing pallet HU123456
2. View suggested locations list
3. Select first suggested location "A-01-01-01"
4. Click "Confirm Putaway"

**Expected Results**:
- [ ] Suggested locations list shows 3-5 best options
- [ ] Each location shows:
  - Location code (A-01-01-01)
  - Capacity available (50%)
  - Distance score (0.95)
- [ ] Selected location highlighted
- [ ] Putaway API called with: { pallet_id, location_id, warehouse_id }
- [ ] Pallet status updated: RECEIVED → STORED
- [ ] Audit log: operation_type = PALLET_PUTAWAY
- [ ] Workflow advances to Picking

**Pass Criteria**: All checks passed ✓

---

### Test Case PUT-02: Capacity Validation

**Objective**: Verify system prevents storing in over-capacity locations

**Setup**:
1. Pre-fill a location to 100% capacity in test data

**Steps**:
1. Try to select full capacity location
2. Click "Confirm Putaway"

**Expected Results**:
- [ ] Location is disabled (grayed out) in list
- [ ] Tooltip: "Location capacity full"
- [ ] Cannot select full location
- [ ] Error if manually forced: "Location capacity exceeded"

**Pass Criteria**: Over-capacity location rejected ✓

---

### Test Case PUT-03: Confirmation Image Verification

**Objective**: Verify optional confirmation image re-scans HU at location

**Steps**:
1. Select location A-01-01-01
2. Check "Verify with image" checkbox
3. Upload confirmation image showing same HU label at location
4. Click "Confirm Putaway"

**Expected Results**:
- [ ] Confirmation image preview displays
- [ ] Image removed/replaced option available
- [ ] OCR extracts HU from confirmation image
- [ ] Extracted HU matches stored HU (HU123456)
- [ ] Confidence score shown
- [ ] If match succeeds:
  - Putaway completes
  - Audit log: operation_type = PALLET_PUTAWAY_VERIFIED_WITH_IMAGE
- [ ] Database: inventory_locations record created with image_verification_at timestamp

**Pass Criteria**: Confirmation image verified and matched ✓

---

### Test Case PUT-04: Confirmation Image Mismatch

**Objective**: Verify system detects HU mismatch in confirmation image

**Steps**:
1. Select location
2. Check "Verify with image"
3. Upload image showing DIFFERENT HU label
4. Click "Confirm Putaway"

**Expected Results**:
- [ ] OCR extracts different HU (e.g., HU654321)
- [ ] Mismatch detected: "HU mismatch! Expected HU123456, got HU654321"
- [ ] Putaway NOT completed
- [ ] "Retry" option available
- [ ] Audit log: operation_type = PALLET_PUTAWAY_VERIFICATION_FAILED
- [ ] Database not updated

**Pass Criteria**: Mismatch detected and rejected ✓

---

### Test Case PUT-05: Warehouse Location Update

**Objective**: Verify warehouse_locations inventory updated correctly

**Setup**:
1. Note location A-01-01-01 current_volume before putaway: 50

**Steps**:
1. Successfully complete putaway of pallet to A-01-01-01
2. Pallet size assumed: 50 unit-volumes
3. Check warehouse_locations table

**Expected Results**:
- [ ] warehouse_locations for A-01-01-01:
  - current_volume updated: 50 → 100 (or different calculation)
  - status updated: AVAILABLE → FULL (if now at capacity)
- [ ] Inventory available for putaway

**Pass Criteria**: Location capacity updated ✓

---

### Test Case PUT-06: Database Records Created

**Objective**: Verify all putaway records created correctly

**Steps**:
1. Complete RCV-01 → PUT-01 workflow
2. Check Supabase tables

**Expected Results**:

```sql
-- pallets table (updated)
SELECT * FROM pallets WHERE hu_id = (SELECT id FROM hu_labels WHERE hu_code = 'HU123456');
-- Expected: status = 'STORED', location_id set, stored_at timestamp

-- putaway_tasks table (new)
SELECT * FROM putaway_tasks WHERE pallet_id = (SELECT id FROM pallets WHERE...);
-- Expected: 1 row with status = 'COMPLETED', operator_id, location_id, completed_at

-- inventory_locations table (new)
SELECT * FROM inventory_locations WHERE pallet_id = (SELECT id FROM pallets WHERE...);
-- Expected: 1 row tracking pallet at location

-- audit_logs
SELECT * FROM audit_logs WHERE operation_type = 'PALLET_PUTAWAY' 
AND details->>'hu_label' = 'HU123456'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row
```

**Pass Criteria**: All expected records created ✓

---

## Part 3: PICKING STEP TESTS

### Test Data Preparation

Pre-create delivery order and inventory:

```sql
-- Delivery order
INSERT INTO delivery_orders (id, company_id, warehouse_id, document_number, status)
VALUES ('do-001', 'corp-test', 'wh-test', 'DO-20260305-001', 'OPEN');

-- Inventory items
INSERT INTO inventory (id, company_id, warehouse_id, product_name, batch, total_qty, available_qty, reserved_qty) VALUES
('inv-001', 'corp-test', 'wh-test', 'Brake Pad A', 'BATCH2025A', 500, 500, 0),
('inv-002', 'corp-test', 'wh-test', 'Rotor B', 'BATCH2025B', 300, 300, 0);
```

### Test Case PICK-01: Delivery Order Recognition

**Objective**: Verify OCR extracts delivery order information correctly

**Steps**:
1. Navigate to Picking tab
2. Click "Upload Delivery Order"
3. Upload image of delivery order showing:
   - Document Number: DO-20260305-001
   - Products: Brake Pad A (120 pcs), Rotor B (80 pcs)
4. Wait for OCR processing

**Expected Results**:
- [ ] Image uploads successfully
- [ ] OCR processing shows progress
- [ ] Processing completes in < 5 seconds
- [ ] Extracted delivery order displays:
  - Document Number: DO-20260305-001
  - Delivery status: OPEN
- [ ] Picking list generated with items:
  - Item 1: Brake Pad A, 120 pcs, BATCH2025A
  - Item 2: Rotor B, 80 pcs, BATCH2025B
- [ ] Location codes shown if inventory available
- [ ] Sequence numbers assigned (1, 2)

**Pass Criteria**: DO extracted and picking list generated ✓

---

### Test Case PICK-02: Picking List Route Optimization

**Objective**: Verify picking list sorted by warehouse zones for efficiency

**Setup**:
1. Pre-populate inventory_locations for pallets:
   - Brake Pad A at location A-02-03-01 (Zone A, Rack 2)
   - Rotor B at location B-01-04-02 (Zone B, Rack 1)

**Steps**:
1. Complete DO extraction (PICK-01)
2. Review picking list order

**Expected Results**:
- [ ] Picking list sorted by zone-rack-level:
  - Sequence 1: A-02-03-01 (Zone A first)
  - Sequence 2: B-01-04-02 (Zone B second)
- [ ] Sequence numbers reflect optimized route
- [ ] First item highlighted in bold/color
- [ ] Current item indicator shows progress

**Pass Criteria**: Picking list optimized and ordered ✓

---

### Test Case PICK-03: Item Completion Tracking

**Objective**: Verify checkboxes and progress tracking work correctly

**Steps**:
1. Display picking list from PICK-01
2. Check item 1 (Brake Pad A) checkbox
3. Progress bar should update to show 50%
4. Check item 2 (Rotor B) checkbox
5. Progress bar should update to 100%

**Expected Results**:
- [ ] Checkbox click registers
- [ ] Item marking updates UI
- [ ] Progress bar shows correct percentage: 50% → 100%
- [ ] Completed items get strikethrough style
- [ ] "Complete Picking" button disabled until all items checked
- [ ] Once all checked, "Complete Picking" button enabled
- [ ] Visual indication of current/next item

**Pass Criteria**: Progress tracking works correctly ✓

---

### Test Case PICK-04: Picking Task Completion

**Objective**: Verify picking tasks created and marked as completed

**Steps**:
1. Complete item checking (PICK-03)
2. Click "Complete Picking"
3. API processes completion
4. Check database

**Expected Results**:
- [ ] Picking API called with: { delivery_order_id, warehouse_id }
- [ ] API response includes: pickling_tasks_completed, total_items
- [ ] UI shows completion confirmation
- [ ] Workflow advances to Gate Out
- [ ] Audit log: operation_type = PICKING_LIST_COMPLETED

**Database Verification**:
```sql
-- picking_tasks table
SELECT * FROM picking_tasks WHERE delivery_order_id = 'do-001';
-- Expected: 2 rows with status = 'COMPLETED'

-- delivery_orders table
SELECT * FROM delivery_orders WHERE id = 'do-001';
-- Expected: status = 'PICKING'
```

**Pass Criteria**: Picking tasks completed and tracked ✓

---

### Test Case PICK-05: Partial Fulfillment Handling

**Objective**: Verify system handles items with insufficient inventory

**Setup**:
1. Inventory for Rotor B = 50 units (need 80)

**Steps**:
1. Upload DO requiring 80 Rotor B units
2. Check picking list

**Expected Results**:
- [ ] Picking list shows: Rotor B, Qty: 50 (in red/warning)
- [ ] Alert message: "Only 50 of 80 Rotor B units available. Partial fulfillment."
- [ ] Fulfillment status: "PARTIAL"
- [ ] User can Still complete picking
- [ ] Shipment released with available quantity only
- [ ] Backorder recorded for remaining 30 units

**Pass Criteria**: Partial fulfillment handled appropriately ✓

---

### Test Case PICK-06: Database Record Validation

**Objective**: Verify all picking records created with correct state

**Steps**:
1. Complete full picking workflow (PICK-01 through PICK-04)
2. Query database

**Expected Results**:

```sql
-- delivery_orders (updated)
SELECT * FROM delivery_orders WHERE id = 'do-001';
-- Expected: status = 'PICKING' or 'COMPLETED'

-- picking_tasks (new)
SELECT * FROM picking_tasks WHERE delivery_order_id = 'do-001' ORDER BY sequence;
-- Expected: 2 rows, both status = 'COMPLETED', sequences 1 and 2

-- audit_logs
SELECT * FROM audit_logs WHERE operation_type = 'PICKING_LIST_GENERATED'
ORDER BY created_at DESC LIMIT 1;
-- Expected: 1 row with delivery_order_id, item_count, fulfillment_status
```

**Pass Criteria**: All records created correctly ✓

---

## Part 4: GATE OUT STEP TESTS

### Test Case GATE-01: Shipment Confirmation Display

**Objective**: Verify gate out shows complete shipment summary

**Prerequisites**:
- Complete full workflow: RCV-01 → PUT-01 → PICK-01 through PICK-04

**Steps**:
1. Auto-advance to Gate Out tab
2. Review displayed information

**Expected Results**:
- [ ] Delivery Order Number: DO-20260305-001
- [ ] Pallet Count: 1 (or appropriate number)
- [ ] Total Quantity: 200 units (or sum of picked)
- [ ] Picking Status: All items picked ✓
- [ ] Documentation: Ready ✓
- [ ] Pre-flight checklist shows all items complete
- [ ] "Release for Shipment" button enabled

**Pass Criteria**: All shipment details displayed ✓

---

### Test Case GATE-02: Final Release and Status Update

**Objective**: Verify gate out finalizes shipment and updates all statuses

**Steps**:
1. Review gate out confirmation
2. Click "Release for Shipment"
3. Confirm action (warning about irreversible change)
4. Check database and UI

**Expected Results**:
- [ ] Warning dialog: "This action cannot be undone..."
- [ ] User confirms
- [ ] Gate out API called: POST /api/finish-good/gate-out
- [ ] API success response received
- [ ] UI shows: "Shipment released for carrier pickup"
- [ ] Next steps displayed: "Pickup time: [time], Tracking: [url]"
- [ ] Workflow progress shows all steps COMPLETED

**Database Verification**:
```sql
-- pallets (updated)
SELECT * FROM pallets WHERE hu_id = (SELECT id FROM hu_labels WHERE hu_code = 'HU123456');
-- Expected: status = 'SHIPPED', shipped_at timestamp set

-- delivery_orders (updated)
SELECT * FROM delivery_orders WHERE document_number = 'DO-20260305-001';
-- Expected: status = 'COMPLETED'

-- outbound (new)
SELECT * FROM outbound WHERE delivery_order_id = 'do-001';
-- Expected: 1 row per pallet, shipped_at timestamp set

-- inventory (updated)
SELECT * FROM inventory WHERE product_name = 'Brake Pad A' AND batch = 'BATCH2025A';
-- Expected: available_qty reduced by 120 (picked amount)

-- stock_transactions (new)
SELECT * FROM stock_transactions WHERE delivery_order_id = 'do-001' AND transaction_type = 'OUTBOUND'
ORDER BY created_at DESC LIMIT 2;
-- Expected: 2 rows (one per item), showing qty deducted
```

**Pass Criteria**: All statuses updated, inventory deducted ✓

---

### Test Case GATE-03: Incomplete Picking Prevention

**Objective**: Verify system prevents gate out without completed picking

**Setup**:
1. Create new delivery order scenario
2. Skip the picking step or mark picking incomplete

**Steps**:
1. Attempt gate out without fully picked items
2. Click "Release for Shipment"

**Expected Results**:
- [ ] Error message: "Cannot release shipment. Picking not complete."
- [ ] Shows missing items: "Brake Pad A: 0 of 120 picked"
- [ ] "Release for Shipment" button disabled
- [ ] User forced to complete picking first

**Pass Criteria**: Incomplete picking prevented ✓

---

### Test Case GATE-04: Audit Trail Completeness

**Objective**: Verify complete audit trail for entire workflow

**Steps**:
1. Complete full workflow (RCV → PUT → PICK → GATE)
2. Query audit_logs table

**Expected Results**:
```sql
SELECT operation_type, COUNT(*) as count, MAX(created_at) as latest
FROM audit_logs 
WHERE company_id = 'corp-test' AND warehouse_id = 'wh-test'
AND details->>'hu_label' = 'HU123456'
GROUP BY operation_type
ORDER BY latest DESC;

-- Expected results (4 rows minimum):
-- HU_RECEIVED | 1 | [datetime]
-- PALLET_PUTAWAY | 1 | [datetime]
-- PICKING_LIST_GENERATED | 1 | [datetime]
-- DELIVERY_GATE_OUT | 1 | [datetime]
```

**Pass Criteria**: Complete audit trail recorded ✓

---

## Part 5: ERROR HANDLING & EDGE CASES

### Test Case ERR-01: OCR Service Unavailable

**Objective**: Verify graceful degradation when OCR service is down

**Setup**:
1. Stop OCR service: `docker stop scales-ai-ocr`

**Steps**:
1. Navigate to Receiving
2. Upload HU label image
3. Wait for timeout

**Expected Results**:
- [ ] After timeout, error message: "OCR service unavailable. Please check connection."
- [ ] UI shows retry button
- [ ] No partial data saved
- [ ] Audit log: operation_type = OCR_SERVICE_UNAVAILABLE
- [ ] User can retry once service is back

**Pass Criteria**: Unavailability handled ✓

---

### Test Case ERR-02: Network Timeout

**Objective**: Verify handling of network latency/timeouts

**Setup**:
1. Simulate slow network: Set OCR_TIMEOUT=1000 (1 second)

**Steps**:
1. Upload image
2. Wait for timeout

**Expected Results**:
- [ ] Timeout error after 1 second
- [ ] Clear message: "Network timeout. Check internet connection."
- [ ] Retry available
- [ ] No database changes

**Pass Criteria**: Timeout handled gracefully ✓

---

### Test Case ERR-03: Invalid Image Format

**Objective**: Verify rejection of unsupported image formats

**Setup**:
1. Create test file: image.pdf, image.txt, etc.

**Steps**:
1. Try to upload non-image file
2. Try to upload BMP format (not supported)

**Expected Results**:
- [ ] File validation on client-side
- [ ] Error: "Only JPEG, PNG, GIF, and WebP formats supported"
- [ ] Upload not attempted
- [ ] Supported formats list shown

**Pass Criteria**: Invalid formats rejected ✓

---

### Test Case ERR-04: Oversized Image

**Objective**: Verify handling of images exceeding size limit

**Setup**:
1. Create 10MB+ image file

**Steps**:
1. Upload oversized image

**Expected Results**:
- [ ] Client-side validation before upload
- [ ] Error: "File size exceeds 5MB limit"
- [ ] Compression recommendation shown
- [ ] Upload prevented

**Pass Criteria**: Size limit enforced ✓

---

### Test Case ERR-05: Concurrent Workflow Entry

**Objective**: Verify system prevents multiple simultaneous workflows

**Setup**:
1. Open Finish Good in two browser tabs

**Steps**:
1. In Tab 1: Complete receiving (create pallet)
2. In Tab 2: Try to access same warehouse
3. Try to navigate to putaway with same pallet

**Expected Results**:
- [ ] Tab 2 detects concurrent access
- [ ] Warning: "Pallet is being accessed from another session"
- [ ] Suggest refresh to sync state
- [ ] Prevent simultaneous state modifications

**Pass Criteria**: Concurrent access prevented/managed ✓

---

### Test Case ERR-06: Session Timeout

**Objective**: Verify graceful handling of authentication timeout

**Setup**:
1. Start workflow (Receiving)
2. Let session expire (Supabase JWT timeout)
3. Try to proceed to Putaway

**Steps**:
1. Wait for session to expire
2. Click "Next Step"

**Expected Results**:
- [ ] API returns 401 Unauthorized
- [ ] UI redirects to login
- [ ] Error message: "Session expired. Please log in again."
- [ ] Unsaved work lost (expected)

**Pass Criteria**: Session timeout handled ✓

---

## Part 6: PERFORMANCE & LOAD TESTS

### Test Case PERF-01: Single Workflow Timing

**Objective**: Measure end-to-end timing for complete workflow

**Steps**:
1. Clear OCR cache
2. Time from start Receiving to complete Gate Out
3. Measure each step

**Measurement Points**:
- [ ] Image upload: < 2 seconds
- [ ] OCR processing: < 300ms
- [ ] API response: < 1 second
- [ ] Database updates: < 500ms
- [ ] UI update: < 500ms
- **Total per step**: < 5 seconds
- **Total workflow**: < 20 seconds

**Expected Performance**:
```
Receiving step:  3-5 seconds
Putaway step:    1-2 seconds  
Picking step:    2-3 seconds
Gate Out step:   1-2 seconds
──────────────────────────────
TOTAL:           7-12 seconds
```

**Pass Criteria**: All timing targets met ✓

---

### Test Case PERF-02: Concurrent User Operations

**Objective**: Verify system handles multiple users simultaneously

**Setup**:
1. Create 5 test users with different warehouses
2. Open Finish Good in 5 browser tabs (different users)

**Steps**:
1. User 1: Upload HU label (Warehouse A)
2. User 2: Upload HU label (Warehouse B)
3. User 3: Complete picking (Warehouse A)
4. User 4: Upload delivery order (Warehouse C)
5. User 5: Release shipment (Warehouse B)
6. All simultaneously

**Expected Results**:
- [ ] All 5 operations complete successfully
- [ ] No cross-user data leakage
- [ ] Each user sees only their warehouse data
- [ ] API response times < 2 seconds each
- [ ] No database constraint violations
- [ ] Audit logs correctly attribute to each operator

**Pass Criteria**: Concurrent operations handled correctly ✓

---

### Test Case PERF-03: Large Picking List

**Objective**: Verify UI responsiveness with many picking items

**Setup**:
1. Create delivery order with 100+ items

**Steps**:
1. Upload delivery order image
2. System generates picking list with 100+ items
3. Scroll through list
4. Check items one by one

**Expected Results**:
- [ ] Picking list renders in < 2 seconds
- [ ] Scrolling is smooth (60fps)
- [ ] Checking items responsive (no lag)
- [ ] Progress bar updates instantly
- [ ] Can scroll through 100+ items without performance degradation

**Pass Criteria**: Large lists handled smoothly ✓

---

## Test Summary & Sign-Off

### Test Execution Tracking

| Test ID | Test Name | Status | Notes | Date |
|---------|-----------|--------|-------|------|
| RCV-01 | Successful HU Recognition | [ ] PASS | | |
| RCV-02 | Camera Capture | [ ] PASS | | |
| RCV-03 | Low Confidence Detection | [ ] PASS | | |
| RCV-04 | Duplicate HU Detection | [ ] PASS | | |
| RCV-05 | OCR Timeout | [ ] PASS | | |
| RCV-06 | Database Records | [ ] PASS | | |
| PUT-01 | Location Selection | [ ] PASS | | |
| PUT-02 | Capacity Validation | [ ] PASS | | |
| PUT-03 | Confirmation Image | [ ] PASS | | |
| PUT-04 | Confirmation Mismatch | [ ] PASS | | |
| PUT-05 | Location Update | [ ] PASS | | |
| PUT-06 | Database Records | [ ] PASS | | |
| PICK-01 | DO Recognition | [ ] PASS | | |
| PICK-02 | Route Optimization | [ ] PASS | | |
| PICK-03 | Item Completion | [ ] PASS | | |
| PICK-04 | Task Completion | [ ] PASS | | |
| PICK-05 | Partial Fulfillment | [ ] PASS | | |
| PICK-06 | Database Records | [ ] PASS | | |
| GATE-01 | Shipment Display | [ ] PASS | | |
| GATE-02 | Final Release | [ ] PASS | | |
| GATE-03 | Incomplete Prevention | [ ] PASS | | |
| GATE-04 | Audit Trail | [ ] PASS | | |
| ERR-01 | OCR Unavailable | [ ] PASS | | |
| ERR-02 | Network Timeout | [ ] PASS | | |
| ERR-03 | Invalid Format | [ ] PASS | | |
| ERR-04 | Oversized Image | [ ] PASS | | |
| ERR-05 | Concurrent Access | [ ] PASS | | |
| ERR-06 | Session Timeout | [ ] PASS | | |
| PERF-01 | Timing Targets | [ ] PASS | | |
| PERF-02 | Concurrent Users | [ ] PASS | | |
| PERF-03 | Large Lists | [ ] PASS | | |

### Overall Test Results

**Total Tests**: 31  
**Passed**: ____ / 31  
**Failed**: ____ / 31  
**Pass Rate**: ____%  

### Known Issues (if any)

| Issue ID | Description | Severity | Status | Fix |
|----------|-------------|----------|--------|-----|
| | | | | |

### Sign-Off

**Tested By**: _________________  
**Date**: _________________  
**Approved For**: [ ] Development [ ] Staging [ ] Production  

---

Good luck with your testing! 🧪
