# SCALES AI OCR Service

Python-based AI OCR service for the SCALES Warehouse Management System. Provides high-speed optical character recognition for HU label extraction and delivery order processing.

## Overview

The SCALES AI OCR Service is a FastAPI-based microservice that enables:

- **HU Label Extraction**: Extract product information, quantity, batch, and weight from handling unit labels
- **Delivery Order Processing**: Extract shipping requirements from delivery order documents
- **Image Preprocessing**: Optimize images for OCR accuracy
- **Multi-Tenant Support**: Serve multiple companies and warehouses from a single service instance

## Architecture

```
Client Request
    ↓
NextJS API Endpoint
    ↓
n8n Webhook Orchestration
    ↓
Python AI OCR Service
    ↓
Image Preprocessing Pipeline
    ↓
OCR Engine (PaddleOCR or Tesseract)
    ↓
Text Parsing & Validation
    ↓
Structured JSON Response
```

## Technology Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | FastAPI, Uvicorn |
| **OCR Engines** | PaddleOCR, Tesseract |
| **Image Processing** | OpenCV, Pillow, NumPy |
| **Async/Concurrency** | asyncio, aiofiles |
| **Data Validation** | Pydantic |
| **Containerization** | Docker, Docker Compose |

## Performance Characteristics

- **Response Time Goal**: < 300ms per scan
- **Supported Image Formats**: JPEG, PNG, WebP
- **Max Image Size**: 10MB (configurable)
- **OCR Confidence Threshold**: 0.5 (configurable)
- **Supported Languages**: English (extensible)

## Installation

### 1. Clone and Setup

```bash
cd python_ai_ocr
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Run Service

#### Option A: Direct Python

```bash
python main.py
```

#### Option B: Uvicorn

```bash
uvicorn main:app --host 0.0.0.0 --ppythonort 8000 --reload
```

#### Option C: Docker

```bash
docker build -t scales-ocr .
docker run -p 8000:8000 scales-ocr
```

#### Option D: Docker Compose

```bash
docker-compose up -d
```

## API Endpoints

### Health & Status

#### Health Check
```
GET /health
```
Response:
```json
{
  "status": "healthy",
  "service": "SCALES AI OCR Service",
  "version": "1.0.0",
  "ocr_engine": "paddleocr",
  "timestamp": "2024-01-15T10:30:00"
}
```

#### Service Status
```
GET /status
```

### HU Label OCR

#### Upload Image
```
POST /api/v1/ocr/hu-label

Headers:
  Content-Type: multipart/form-data

Form Data:
  - company_id: string (UUID)
  - warehouse_id: string (UUID)
  - file: file (JPEG, PNG, WebP)
```

Response:
```json
{
  "hu_label": "HU123456",
  "product_name": "Brake Pad A",
  "qty": 120,
  "net_weight": "25kg",
  "batch": "BATCH2025A",
  "confidence": 0.96,
  "raw_text": "HU123456 Brake Pad A Qty: 120 Net Weight: 25kg Batch: BATCH2025A",
  "processing_time_ms": 145.32
}
```

#### Base64 Encoded Image
```
POST /api/v1/ocr/hu-label/base64

Headers:
  Content-Type: application/json

Body:
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "warehouse_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "image_data": "iVBORw0KGgoAAAANSUhEUgAAA..."
}
```

#### Image URL
```
POST /api/v1/ocr/hu-label/url

Headers:
  Content-Type: application/json

Body:
{
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "warehouse_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "image_url": "https://example.com/hu-label.jpg"
}
```

### Delivery Order OCR

#### Upload Image
```
POST /api/v1/ocr/delivery-order

Headers:
  Content-Type: multipart/form-data

Form Data:
  - company_id: string (UUID)
  - warehouse_id: string (UUID)
  - file: file (JPEG, PNG, WebP)
```

Response:
```json
{
  "hu_label": "HU123456",
  "product_name": "Brake Pad A",
  "qty": 200,
  "batch": "BATCH2025A",
  "confidence": 0.94,
  "raw_text": "...",
  "processing_time_ms": 152.45
}
```

#### Base64 Encoded Image
```
POST /api/v1/ocr/delivery-order/base64
```

### Image Utility Endpoints

#### Image Quality Score
```
POST /api/v1/image/quality-score

Headers:
  Content-Type: multipart/form-data

Form Data:
  - file: file

Response:
{
  "quality_score": 0.87,
  "quality_level": "high"
}
```

## Configuration

### Environment Variables

```env
# App Configuration
APP_NAME=SCALES AI OCR Service
APP_VERSION=1.0.0
DEBUG=False
LOG_LEVEL=INFO

# Server
HOST=0.0.0.0
PORT=8000

# OCR Configuration
OCR_ENGINE=paddleocr          # paddleocr or tesseract
OCR_CONFIDENCE_THRESHOLD=0.5
OCR_MAX_RESPONSE_TIME_MS=300

# Image Processing
MAX_IMAGE_SIZE_MB=10
IMAGE_RESIZE_WIDTH=1280
IMAGE_RESIZE_HEIGHT=720

# Multi-tenant
ENABLE_COMPANY_VALIDATION=True
```

## Project Structure

```
python_ai_ocr/
├── main.py                 # FastAPI application & endpoints
├── ocr_service.py          # Core OCR logic & engines
├── preprocessing.py        # Image preprocessing pipeline
├── models.py               # Pydantic request/response models
├── config.py               # Configuration management
├── utils.py                # Utility functions
├── requirements.txt        # Python dependencies
├── Dockerfile              # Container image definition
├── docker-compose.yml      # Multi-container orchestration
├── .env.example            # Environment variables template
└── tests/                  # Test suite (optional)
```

## Implementation Details

### OCR Pipeline

1. **Image Loading**: Support for base64, URL, or file upload
2. **Validation**: Size, format, and quality checks
3. **Preprocessing**: 
   - Resize (1280x720 default)
   - Denoise (FastNLMeans)
   - Contrast Enhancement (CLAHE)
   - Deskew Detection
   - Threshold Binarization
4. **OCR Extraction**: PaddleOCR or Tesseract
5. **Text Parsing**: Regex-based field extraction
6. **Confidence Scoring**: Weighted calculation (0-1)

### Supported Label Formats

The HU label parser recognizes:

| Field | Patterns |
|-------|----------|
| **HU ID** | HU:, HU=, Handling Unit: |
| **Product** | Product:, Description:, Item: |
| **Quantity** | Qty:, Quantity:, Pcs, Units |
| **Weight** | Weight:, Net Weight:, Net Wt |
| **Batch** | Batch:, Lot:, Batch No: |

Example labels:

```
HU123456
Product A
Qty: 100
Weight: 25kg
Batch: BATCH001

---

HU=HU789012
Description=Valve B
Quantity=500
Net Weight=18.5kg
Lot=2025A

---

Handling Unit: HU456789
Item: Connector C
Pcs: 250
Wt: 12kg
Batch No: BATCH2025
```

## Integration with n8n

### n8n Webhook Configuration

**Trigger**: HTTP Request Node
**Method**: POST
**URL**: `http://ocr-service:8000/api/v1/ocr/hu-label`

**Headers**:
```json
{
  "Content-Type": "multipart/form-data"
}
```

**Body**:
```json
{
  "company_id": "{{ $json.companyId }}",
  "warehouse_id": "{{ $json.warehouseId }}",
  "image_file": "{{ $json.imageFile }}"
}
```

### Supabase Integration

Store OCR results in audit logs:

```sql
INSERT INTO audit_logs (
  company_id, warehouse_id, 
  operation_type, details, confidence_score
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  'HU_OCR_EXTRACTION',
  '{"hu_label": "HU123456", "product": "Brake Pad A"}',
  0.96
);
```

## Performance Optimization

### Image Preprocessing Impact

- **Raw OCR**: 50-80ms
- **With Preprocessing**: 120-180ms
- **Total Response**: 145-230ms (within 300ms target)

### Optimization Strategies

1. **Batch Processing**: Group multiple images
2. **Caching**: Cache OCR results for identical labels
3. **Model Quantization**: Use lightweight model versions
4. **Async Processing**: Non-blocking request handling
5. **GPU Acceleration**: Optional CUDA support for PaddleOCR

### Load Testing

```bash
# Install locust
pip install locust

# Create locustfile.py and run tests
locust -f locustfile.py --host=http://localhost:8000
```

## Error Handling

Common error responses:

**400 Bad Request**
```json
{
  "success": false,
  "error": "Invalid image file",
  "timestamp": "2024-01-15T10:30:00"
}
```

**413 Payload Too Large**
```json
{
  "success": false,
  "error": "Image size exceeds 10MB limit",
  "timestamp": "2024-01-15T10:30:00"
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "error": "OCR processing failed",
  "timestamp": "2024-01-15T10:30:00"
}
```

## Development

### Running Tests

```bash
pip install pytest pytest-asyncio

pytest tests/ -v
```

### Logging

Configure log level in `.env`:
```env
LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR
```

Logs will output to console in development mode.

### Code Quality

```bash
pip install black flake8 isort

# Format code
black . && isort .

# Check style
flake8 . && black --check .
```

## Troubleshooting

### PaddleOCR Models Not Downloading

PaddleOCR downloads models on first run. Ensure internet connectivity or pre-download:

```bash
python -c "from paddleocr import PaddleOCR; PaddleOCR()"
```

### Tesseract Not Found

Install system dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install tesseract-ocr

# macOS
brew install tesseract

# Windows
# Download installer: https://github.com/UB-Mannheim/tesseract/wiki
```

### Memory Usage

For large images or batch processing, monitor memory:

```bash
# Monitor service
docker stats scales-ai-ocr
```

## Security Considerations

1. **Input Validation**: All inputs validated before processing
2. **File Size Limits**: 10MB default (configurable)
3. **Company/Warehouse Validation**: Multi-tenant isolation
4. **Error Messages**: Minimal disclosure in production
5. **CORS**: Configure allowed origins in production
6. **Rate Limiting**: Implement in reverse proxy (nginx, CloudFlare)

## Future Enhancements

- [ ] Batch processing endpoint
- [ ] Confidence threshold fine-tuning
- [ ] Custom model training for specific label formats
- [ ] GraphQL API support
- [ ] WebSocket real-time processing
- [ ] Redis caching layer
- [ ] Multi-language support
- [ ] Handwriting recognition
- [ ] Barcode detection & verification
- [ ] A/B testing framework for OCR engines

## Monitoring & Logging

### Metrics to Track

- OCR accuracy (confidence score distribution)
- Processing time per scan
- Error rate by type
- Image quality trends
- Company/warehouse request volume
- Model inference latency

### Sample Monitoring Query

```sql
SELECT 
  company_id,
  warehouse_id,
  AVG(confidence_score) as avg_confidence,
  COUNT(*) as total_scans,
  AVG(processing_time_ms) as avg_time_ms
FROM audit_logs
WHERE operation_type = 'HU_OCR_EXTRACTION'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY company_id, warehouse_id
ORDER BY total_scans DESC;
```

## License

Part of the SCALES Warehouse Management System

## Support

For issues or questions:
1. Check logs: `docker logs scales-ai-ocr`
2. Review error details in API response
3. Verify environment configuration
4. Test with sample images in `/tests/images`
