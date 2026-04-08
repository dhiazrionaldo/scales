# SCALES AI OCR Service Integration Guide

This guide explains how to integrate the Python AI OCR service with the SCALES Warehouse Management System.

## Architecture Overview

```
NextJS Frontend
    ↓
Supabase API (Auth, RLS)
    ↓
NextJS API Route (/api/*)
    ↓
n8n Webhook Engine
    ↓
Python FastAPI OCR Service
    ↓
PaddleOCR / Tesseract
```

## Integration Points

### 1. NextJS API Route Integration

Create `/src/app/api/ocr/hu-label/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createClient();
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's company and warehouse
  const { data: userCompany } = await supabase
    .from('user_companies')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  
  const { companyId, warehouseId } = await request.json();
  
  // Validate access
  if (userCompany?.company_id !== companyId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Forward to n8n (which calls the Python service)
  const n8nResponse = await fetch(
    'https://your-n8n-instance.com/webhook/scales-ocr-hu-label',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyId,
        warehouseId,
        userId: user.id,
        imageFile: imageData,
      }),
    }
  );
  
  const result = await n8nResponse.json();
  
  // Store OCR result in audit logs
  await supabase
    .from('audit_logs')
    .insert({
      company_id: companyId,
      warehouse_id: warehouseId,
      operation_type: 'HU_OCR_EXTRACTION',
      operator_id: user.id,
      details: {
        hu_label: result.hu_label,
        product_name: result.product_name,
        confidence: result.confidence,
      },
    });
  
  return NextResponse.json(result);
}
```

### 2. React Client Hook

Create `/src/hooks/useOCR.ts`:

```typescript
import { useCallback, useState } from 'react';
import { useWarehouse } from './useWarehouse';

interface OCRResult {
  hu_label: string;
  product_name: string;
  qty: number;
  net_weight: string;
  batch: string;
  confidence: number;
  processing_time_ms: number;
}

export function useOCR() {
  const { warehouse } = useWarehouse();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const extractHULabel = useCallback(
    async (imageFile: File): Promise<OCRResult | null> => {
      if (!warehouse) {
        setError('No warehouse selected');
        return null;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('company_id', warehouse.company_id);
        formData.append('warehouse_id', warehouse.id);
        formData.append('file', imageFile);
        
        const response = await fetch('/api/ocr/hu-label', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('OCR extraction failed');
        }
        
        const result = await response.json();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [warehouse]
  );
  
  const extractDeliveryOrder = useCallback(
    async (imageFile: File): Promise<OCRResult | null> => {
      if (!warehouse) {
        setError('No warehouse selected');
        return null;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const formData = new FormData();
        formData.append('company_id', warehouse.company_id);
        formData.append('warehouse_id', warehouse.id);
        formData.append('file', imageFile);
        
        const response = await fetch('/api/ocr/delivery-order', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('OCR extraction failed');
        }
        
        const result = await response.json();
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [warehouse]
  );
  
  return {
    extractHULabel,
    extractDeliveryOrder,
    loading,
    error,
  };
}
```

### 3. React Component Example

Create `/src/components/OCRScanner.tsx`:

```typescript
'use client';

import { useRef, useState } from 'react';
import { useOCR } from '@/hooks/useOCR';
import { Button } from '@/components/ui/button';

interface OCRScannerProps {
  onSuccess: (data: any) => void;
  onError: (error: string) => void;
}

export function OCRScanner({ onSuccess, onError }: OCRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const { extractHULabel, loading } = useOCR();
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const result = await extractHULabel(file);
    if (result) {
      onSuccess(result);
    } else {
      onError('Failed to extract HU label');
    }
  };
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
      }
    } catch (err) {
      onError('Camera access denied');
    }
  };
  
  const captureImage = async () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'hu-label.jpg', { type: 'image/jpeg' });
        const result = await extractHULabel(file);
        
        if (result) {
          setScanning(false);
          onSuccess(result);
        } else {
          onError('OCR extraction failed');
        }
      }, 'image/jpeg');
    }
  };
  
  return (
    <div className="space-y-4">
      {!scanning ? (
        <>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload Image'}
          </Button>
          
          <Button
            onClick={startCamera}
            variant="secondary"
            disabled={loading}
          >
            Start Camera
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg"
          />
          
          <div className="flex gap-2">
            <Button
              onClick={captureImage}
              disabled={loading}
            >
              Capture
            </Button>
            
            <Button
              onClick={() => setScanning(false)}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 4. n8n Workflow Configuration

Create a webhook in n8n to receive requests from NextJS and forward to the Python service:

**Trigger:** HTTP Request
**Method:** POST
**URL:** https://your-domain.com/webhook/scales-ocr-hu-label

**n8n Nodes:**

```
1. Webhook Trigger
   ↓
2. Set Variables (company_id, warehouse_id, imageFile)
   ↓
3. HTTP Request to Python Service
   - URL: http://python-ocr-service:8000/api/v1/ocr/hu-label
   - Method: POST (multipart/form-data)
   - Fields:
     - company_id: {{ $json.companyId }}
     - warehouse_id: {{ $json.warehouseId }}
     - file: {{ $json.imageFile }}
   ↓
4. HTTP Response (return result to NextJS)
```

### 5. Database Integration

Add audit logging to track OCR operations:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  operator_id UUID NOT NULL REFERENCES users(id),
  operation_type VARCHAR(100) NOT NULL,
  details JSONB,
  confidence_score DECIMAL(3, 2),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT ocr_confidence_range CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX idx_audit_logs_company_operation 
  ON audit_logs(company_id, operation_type, created_at DESC);
```

### 6. Environment Configuration

Update `.env.local` in your NextJS project:

```env
# OCR Service
NEXT_PUBLIC_OCR_SERVICE_URL=http://localhost:8000
OCR_API_KEY=your-api-key-here

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
N8N_API_KEY=your-n8n-api-key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. Error Handling

Implement comprehensive error handling in your NextJS route:

```typescript
try {
  const result = await extractOCR(imageData);
  
  // Validate result
  if (result.confidence < 0.5) {
    return NextResponse.json(
      { 
        success: false, 
        warning: 'Low confidence score',
        result 
      },
      { status: 206 } // Partial Content
    );
  }
  
  return NextResponse.json({ success: true, result });
} catch (error) {
  // Log error to Supabase
  await supabase
    .from('error_logs')
    .insert({
      service: 'ocr',
      error_message: error.message,
      timestamp: new Date(),
    });
  
  return NextResponse.json(
    { error: 'OCR processing failed' },
    { status: 500 }
  );
}
```

## Performance Optimization

### 1. Image Compression

Compress images before sending to reduce bandwidth:

```typescript
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_size = 1280;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };
    };
  });
}
```

### 2. Caching Results

Cache OCR results for identical HU labels:

```typescript
const cache = new Map<string, OCRResult>();

async function extractWithCache(
  imageFile: File
): Promise<OCRResult> {
  const hash = await hashFile(imageFile);
  
  if (cache.has(hash)) {
    return cache.get(hash)!;
  }
  
  const result = await extractHULabel(imageFile);
  cache.set(hash, result);
  
  return result;
}
```

## Monitoring & Debugging

### 1. Log OCR Performance

```typescript
const startTime = performance.now();
const result = await extractHULabel(file);
const duration = performance.now() - startTime;

console.log(`OCR completed in ${duration.toFixed(1)}ms`);
console.log(`Confidence: ${result.confidence.toFixed(2)}`);
```

### 2. Monitor Error Rates

```sql
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  operation_type,
  COUNT(*) as total_operations,
  COUNT(CASE WHEN confidence_score < 0.5 THEN 1 END) as low_confidence,
  AVG(processing_time_ms) as avg_processing_time
FROM audit_logs
WHERE operation_type = 'HU_OCR_EXTRACTION'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), operation_type
ORDER BY hour DESC;
```

## Deployment

### Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  ocr-service:
    build: ./python_ai_ocr
    ports:
      - "8000:8000"
    environment:
      - OCR_ENGINE=paddleocr
    networks:
      - scales-network
  
  nextjs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_OCR_SERVICE_URL=http://ocr-service:8000
    depends_on:
      - ocr-service
    networks:
      - scales-network

networks:
  scales-network:
    driver: bridge
```

## Troubleshooting

### Issue: OCR Returns Low Confidence

**Solution:**
1. Check image quality - ensure good lighting
2. Adjust image preprocessing settings
3. Check label format matches parser patterns
4. Test with different OCR engine

### Issue: <300ms Performance Target Not Met

**Solutions:**
1. Reduce image preprocessing - disable unnecessary steps
2. Use lighter OCR model (PaddleOCR with smaller model)
3. Implement caching for duplicate labels
4. Consider GPU acceleration

### Issue: Authentication Errors

**Solution:**
1. Verify Supabase credentials in .env.local
2. Check Row Level Security policies
3. Ensure user has company/warehouse access
4. Validate JWT tokens

## Next Steps

1. ✅ Deploy Python OCR service
2. ✅ Set up n8n webhook
3. ✅ Create NextJS API routes
4. ✅ Build React components
5. ✅ Configure database logging
6. ✅ Set up monitoring
7. ✅ Performance testing
8. ✅ Production deployment

For more details, see the main [README.md](./README.md).
