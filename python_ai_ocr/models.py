from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class OCRType(str, Enum):
    """OCR Operation Types"""
    HU_LABEL = "hu_label"
    DELIVERY_ORDER = "delivery_order"


class ExtractedField(BaseModel):
    """Individual extracted field with confidence"""
    value: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class HULabelResponse(BaseModel):
    """HU Label OCR Response"""
    hu_label: str
    product_name: str
    qty: int
    net_weight: str  # e.g., "25kg"
    batch: str
    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall confidence")
    raw_text: Optional[str] = None
    processing_time_ms: float


class DeliveryOrderResponse(BaseModel):
    """Delivery Order OCR Response"""
    hu_label: str
    product_name: str
    qty: int
    batch: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    raw_text: Optional[str] = None
    processing_time_ms: float


class WarehouseLayoutResponse(BaseModel):
    """Warehouse Layout Detection Response"""
    detected_zones: int
    detected_racks: int
    coordinates: Optional[List[dict]] = None
    confidence: float
    processing_time_ms: float


class BoxObjectDetectionResponse(BaseModel):
    """Object Detection in Box Response"""
    detected_items: int
    estimated_dimensions: dict = Field(default_factory=lambda: {
        "width": 0,
        "height": 0,
        "depth": 0
    })
    confidence: float
    processing_time_ms: float


class OCRRequest(BaseModel):
    """Generic OCR Request"""
    company_id: str
    warehouse_id: str
    ocr_type: OCRType
    image_data: Optional[str] = None  # base64 encoded
    image_url: Optional[str] = None
    metadata: Optional[dict] = None


class AIResponse(BaseModel):
    """Generic AI Service Response"""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    processing_time_ms: float
    service_version: str = "1.0.0"


class HealthCheck(BaseModel):
    """Health Check Response"""
    status: str
    service: str
    version: str
    ocr_engine: str
    timestamp: str
