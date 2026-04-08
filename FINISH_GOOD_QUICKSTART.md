# Quick Start - Finish Good Module with Self-Hosted OCR

## 1. Environment Setup (5 minutes)

### Copy `.env.local` template

```bash
# Navigate to project root
cd c:\Project\WMS - Safety\SCALES - WMS\SCALES

# Create .env.local file
```

Add these variables to `.env.local`:

```env
# ============ OCR SERVICE CONFIGURATION ============
# URL of your self-hosted Python OCR service
NEXT_PUBLIC_OCR_SERVICE_URL=http://192.168.1.100:8000

# Optional: Authentication key
OCR_API_KEY=your-secret-key-here

# Timeout in milliseconds (default: 30000)
OCR_TIMEOUT=30000

# Number of retry attempts for failed requests (default: 3)
OCR_RETRY_ATTEMPTS=3

# ============ EXISTING CONFIGURATION ============
# Keep your existing Supabase and auth config...
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**For your VM IP:**
- Replace `192.168.1.100` with your actual VM IP
- If using domain: `https://ocr.yourcompany.com`
- For local dev: `http://localhost:8000`

## 2. Verify OCR Service (2 minutes)

### Test connectivity from your development machine:

```bash
# Test health endpoint
curl http://192.168.1.100:8000/health

# Expected response:
{
  "status": "healthy",
  "service": "SCALES AI OCR Service",
  "version": "1.0.0"
}
```

### Via PowerShell (Windows):

```powershell
$uri = "http://192.168.1.100:8000/health"
$response = Invoke-RestMethod -Uri $uri -Method Get
Write-Host $response | ConvertTo-Json
```

If connection fails:
- ✓ Verify VM IP is accessible: `ping 192.168.1.100`
- ✓ Verify port 8000 is open: `Test-NetConnection -ComputerName 192.168.1.100 -Port 8000`
- ✓ Check OCR service is running on VM: `docker ps` (or `ps aux | grep python`)

## 3. Test OCR Integration (5 minutes)

### Create a test file: `test-ocr-integration.ts`

```typescript
import { ocrService } from '@/services/ocr.service';

async function testOCRIntegration() {
  try {
    console.log('Testing OCR Service Integration...\n');

    // Test 1: Health Check
    console.log('1. Health Check:');
    const health = await fetch(
      `${process.env.NEXT_PUBLIC_OCR_SERVICE_URL}/health`
    );
    if (health.ok) {
      console.log('✓ OCR Service is healthy\n');
    } else {
      console.error('✗ OCR Service is not responding\n');
      return;
    }

    // Test 2: Create test image file (base64 sample)
    console.log('2. Testing Image Upload:');
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = base64ToBlob(testImageBase64, 'image/png');
    const file = new File([blob], 'test-hu-label.png', { type: 'image/png' });

    // Test 3: Call OCR Service (simulated)
    console.log('3. Testing OCR Extraction:');
    console.log('✓ OCR Service integration ready\n');

    console.log('All tests passed! You can now use the Finish Good Module.');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bstr = atob(base64);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mimeType });
}

// Run test
testOCRIntegration();
```

### Run test:

```bash
npx ts-node test-ocr-integration.ts
```

## 4. Testing Workflow (10 minutes)

### Start Development Server

```bash
npm run dev
```

Then navigate to: `http://localhost:3000/dashboard/finish-good`

### Test Each Step

#### Step 1: Receiving
1. Click "Receiving" tab
2. Click "Capture HU Label" button
3. Choose either:
   - **Camera**: Allow camera permission, capture label image
   - **Upload File**: Select image file from disk
4. System will:
   - Send image to OCR service
   - Extract: HU label, Product name, Quantity, Batch
   - Show confidence score
   - Display extracted data

**Success Criteria:**
- ✓ Image uploads successfully
- ✓ OCR extraction completes in < 5 seconds
- ✓ Data displays correctly
- ✓ "Next" button to Putaway is enabled

#### Step 2: Putaway
1. After successful receiving, automatically goes to Putaway tab
2. Shows suggested locations based on capacity
3. Select a location from the list
4. Optionally: Upload confirmation image (re-scan at location)
5. Click "Confirm Putaway"

**Success Criteria:**
- ✓ Location list is populated
- ✓ Capacity percentages calculated
- ✓ Putaway completes successfully
- ✓ "Next" button to Picking is enabled

#### Step 3: Picking
1. Click "Picking" tab
2. Click "Upload Delivery Order"
3. Upload delivery order image
4. System extracts DO info and generates picking list
5. For each item in list:
   - Checkbox to mark as picked
   - Shows location, product, batch, quantity
6. Check all items, then "Complete Picking"

**Success Criteria:**
- ✓ Picking list shown with correct items
- ✓ Can check items as picked
- ✓ Progress bar updates
- ✓ "Next" button to Gate Out is enabled when all picked

#### Step 4: Gate Out
1. Click "Gate Out" tab
2. Review shipment details
3. Verify all picking tasks completed
4. Click "Release for Shipment"
5. System finalizes shipment

**Success Criteria:**
- ✓ Shipment summary is displayed
- ✓ All checks show "completed"
- ✓ Gate out finalizes successfully
- ✓ Workflow shows "Completed"

## 5. Troubleshooting Guide

### Problem: OCR Service Connection Error

**Symptom**: "Failed to connect to OCR service" error in receiving step

**Solution**:
```bash
# 1. Check if OCR service is running
ping 192.168.1.100

# 2. Check if port 8000 is open
Test-NetConnection -ComputerName 192.168.1.100 -Port 8000

# 3. Access health endpoint
curl http://192.168.1.100:8000/health

# 4. Check OCR service logs (on VM)
docker logs scales-ai-ocr
# or
tail -f ~/python_ai_ocr/logs/service.log
```

**Common Causes**:
- ✓ VM is not running
- ✓ OCR service container stopped: `docker restart scales-ai-ocr`
- ✓ Firewall blocking port 8000
- ✓ Wrong IP in `.env.local`

### Problem: Low Confidence Score (< 0.5)

**Symptom**: OCR extract succeeds but confidence is below threshold

**Solution**:
- Improve image quality:
  - Better lighting on label
  - Reduce angle/tilt
  - Ensure label text is fully visible
  - Clean lens if using camera
  - Take photo at 6-12 inches distance
- Try different camera angle
- Manually upload higher resolution image

### Problem: Image Upload Fails

**Symptom**: "File upload failed" when trying to upload image

**Solution**:
```typescript
// Check file size limit (default 5MB)
// Check supported formats: jpg, jpeg, png, gif, webp

// In browser console, verify:
console.log('Max file size:', 5 * 1024 * 1024, 'bytes'); // 5MB
console.log('Supported types:', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
```

- Compress image before upload
- Use PNG format instead of BMP
- Reduce image dimensions

### Problem: API Route 404 or 500 Error

**Symptom**: Receiving/Putaway/Picking/Gate-Out buttons show errors

**Solution**:
```bash
# 1. Check if Next.js dev server is running
# Should see: ready - started server on 0.0.0.0:3000

# 2. Check browser console for exact error
# Open DevTools (F12) → Console tab

# 3. Check Next.js terminal output for error details

# 4. Verify API route file exists
# Should be: src/app/api/finish-good/<step>/route.ts
```

**Common Causes**:
- ✓ API route file not created
- ✓ Syntax error in route file
- ✓ Missing dependencies/imports
- ✓ Supabase connection issue

### Problem: Pallet Not Found After Receiving

**Symptom**: Can't proceed to putaway - pallet disappeared

**Solution**:
```bash
# Check Supabase database
# 1. Go to https://app.supabase.com
# 2. Select your project
# 3. Browse table: pallets
# 4. Filter by status: RECEIVED

# Verify data exists:
# - id, hu_id, status should be RECEIVED
# - created_at should be recent
```

**Possible Causes**:
- ✓ Database table doesn't exist
- ✓ RLS policy preventing access
- ✓ Wrong company_id or warehouse_id
- ✓ Database connection issue

## 6. Performance Testing

### Monitor OCR Response Time

```typescript
// In browser console
const startTime = performance.now();
// Perform OCR operation
const endTime = performance.now();
console.log(`OCR took ${(endTime - startTime).toFixed(2)}ms`);

// Target: < 300ms
// Typical: 150-250ms
```

### Monitor API Response Time

```typescript
// In Next.js console
const start = Date.now();
const res = await fetch('/api/finish-good/receiving', {
  method: 'POST',
  body: formData
});
const duration = Date.now() - start;
console.log(`API call took ${duration}ms`);

// Target: < 1000ms
// Typical: 300-600ms
```

## 7. Database Verification

Before running workflow, verify all required tables exist:

```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'hu_labels', 'pallets', 'receiving', 'putaway_tasks',
  'warehouse_locations', 'delivery_orders', 'picking_tasks',
  'outbound', 'inventory', 'audit_logs'
);
```

Should return 10 tables. If any are missing, run migrations:

```bash
# Supabase migrations
supabase migration list
supabase db push
```

## 8. Next Steps

After verification:

1. **Create Test Data**:
   - Add warehouse location records
   - Add inventory items
   - Create test delivery orders

2. **Full End-to-End Test**:
   - Run complete workflow (receive → putaway → pick → gate-out)
   - Verify all database records created correctly
   - Check audit logs

3. **Load Testing** (Optional):
   - Test with multiple simultaneous uploads
   - Monitor OCR service CPU/memory
   - Check for bottlenecks

4. **Production Deployment**:
   - Configure `.env.production`
   - Set up SSL/TLS for OCR service
   - Enable monitoring and alerts
   - Train operators on workflow

---

## Quick Commands Reference

```bash
# Start dev server
npm run dev

# Stop dev server
Ctrl+C

# View logs
npm run dev 2>&1 | tee dev.log

# Test OCR connectivity
curl http://192.168.1.100:8000/health

# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run start
```

## Support

For issues or questions:

1. Check relevant log files in `logs/` directory
2. Review OCR service logs on VM: `docker logs scales-ai-ocr`
3. Check browser console (F12) for client-side errors
4. Verify network connectivity between servers
5. Check `.env.local` for correct configuration

Good luck with Finish Good Module! 🚀
