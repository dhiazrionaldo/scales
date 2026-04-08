import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"  # also speeds up startup
import logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import numpy as np
from datetime import datetime
import io

from config import settings
from models import (
    HULabelResponse, DeliveryOrderResponse, AIResponse, 
    HealthCheck, OCRType
)
from ocr_service import OCRService
from utils import ImageUtils, ValidationUtils, LogUtils
from preprocessing import ImagePreprocessor


# Setup logging
LogUtils.setup_logging(settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Global OCR service instance
ocr_service: OCRService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    # Startup
    global ocr_service
    logger.info("Starting SCALES AI OCR Service...")
    try:
        ocr_service = OCRService()
        logger.info(f"OCR Service initialized with {settings.OCR_ENGINE} engine")
    except Exception as e:
        logger.error(f"Failed to initialize OCR service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down SCALES AI OCR Service...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered OCR service for warehouse label scanning and delivery order processing",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Health & Status Endpoints
# ============================================================================

@app.get("/health", response_model=HealthCheck)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ocr_engine": settings.OCR_ENGINE,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/status")
async def service_status():
    """Detailed service status"""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ocr_engine": settings.OCR_ENGINE,
        "ocr_confidence_threshold": settings.OCR_CONFIDENCE_THRESHOLD,
        "max_response_time_ms": settings.OCR_MAX_RESPONSE_TIME_MS,
        "max_image_size_mb": settings.MAX_IMAGE_SIZE_MB,
        "debug_mode": settings.DEBUG,
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================================================
# HU Label OCR Endpoints
# ============================================================================

@app.post("/api/v1/ocr/hu-label", response_model=HULabelResponse)
async def ocr_hu_label_upload(
    company_id: str = Form(...),
    warehouse_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Extract HU label information from uploaded image
    
    Args:
        company_id: Company UUID
        warehouse_id: Warehouse UUID
        file: Image file (JPEG, PNG, WebP)
    
    Returns:
        HULabelResponse with extracted data
    """
    logger.info(f"HU Label OCR request - Company: {company_id}, Warehouse: {warehouse_id}")
    
    try:
        # Validate company/warehouse
        if not ValidationUtils.validate_company_warehouse(company_id, warehouse_id):
            raise HTTPException(status_code=400, detail="Invalid company_id or warehouse_id")
        
        # Read file
        contents = await file.read()
        
        # Validate size
        if not ImageUtils.validate_image_size(len(contents)):
            raise HTTPException(
                status_code=413,
                detail=f"Image size exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit"
            )
        
        # Load image
        image = ImageUtils.load_image_from_base64(
            __import__('base64').b64encode(contents).decode()
        )
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Extract HU label
        result = ocr_service.extract_hu_label(image)
        
        # Log result
        LogUtils.log_ocr_result("hu_label", result.get("confidence", 0), 
                               result.get("processing_time_ms", 0))
        
        return HULabelResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HU label OCR error: {e}")
        LogUtils.log_error("HU Label OCR", str(e))
        raise HTTPException(status_code=500, detail="OCR processing failed")


@app.post("/api/v1/ocr/hu-label/base64", response_model=HULabelResponse)
async def ocr_hu_label_base64(
    company_id: str,
    warehouse_id: str,
    image_data: str
):
    """
    Extract HU label from base64 encoded image
    
    Args:
        company_id: Company UUID
        warehouse_id: Warehouse UUID
        image_data: Base64 encoded image string
    
    Returns:
        HULabelResponse with extracted data
    """
    try:
        # Validate company/warehouse
        if not ValidationUtils.validate_company_warehouse(company_id, warehouse_id):
            raise HTTPException(status_code=400, detail="Invalid company_id or warehouse_id")
        
        # Load image from base64
        image = ImageUtils.load_image_from_base64(image_data)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
        
        # Extract HU label
        result = ocr_service.extract_hu_label(image)
        
        LogUtils.log_ocr_result("hu_label", result.get("confidence", 0), 
                               result.get("processing_time_ms", 0))
        
        return HULabelResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HU label OCR error: {e}")
        LogUtils.log_error("HU Label OCR", str(e))
        raise HTTPException(status_code=500, detail="OCR processing failed")


@app.post("/api/v1/ocr/hu-label/url", response_model=HULabelResponse)
async def ocr_hu_label_url(
    company_id: str,
    warehouse_id: str,
    image_url: str
):
    """
    Extract HU label from image URL
    
    Args:
        company_id: Company UUID
        warehouse_id: Warehouse UUID
        image_url: URL to image file
    
    Returns:
        HULabelResponse with extracted data
    """
    try:
        # Validate company/warehouse
        if not ValidationUtils.validate_company_warehouse(company_id, warehouse_id):
            raise HTTPException(status_code=400, detail="Invalid company_id or warehouse_id")
        
        # Load image from URL
        image = ImageUtils.load_image_from_url(image_url)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Failed to load image from URL")
        
        # Extract HU label
        result = ocr_service.extract_hu_label(image)
        
        LogUtils.log_ocr_result("hu_label", result.get("confidence", 0), 
                               result.get("processing_time_ms", 0))
        
        return HULabelResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HU label OCR error: {e}")
        LogUtils.log_error("HU Label OCR", str(e))
        raise HTTPException(status_code=500, detail="OCR processing failed")


# ============================================================================
# Delivery Order OCR Endpoints
# ============================================================================

@app.post("/api/v1/ocr/delivery-order", response_model=DeliveryOrderResponse)
async def ocr_delivery_order_upload(
    company_id: str = Form(...),
    warehouse_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Extract delivery order information from uploaded image
    
    Args:
        company_id: Company UUID
        warehouse_id: Warehouse UUID
        file: Image file (JPEG, PNG, WebP)
    
    Returns:
        DeliveryOrderResponse with extracted data
    """
    try:
        # Validate company/warehouse
        if not ValidationUtils.validate_company_warehouse(company_id, warehouse_id):
            raise HTTPException(status_code=400, detail="Invalid company_id or warehouse_id")
        
        # Read file
        contents = await file.read()
        
        # Validate size
        if not ImageUtils.validate_image_size(len(contents)):
            raise HTTPException(
                status_code=413,
                detail=f"Image size exceeds {settings.MAX_IMAGE_SIZE_MB}MB limit"
            )
        
        # Load image
        image = ImageUtils.load_image_from_base64(
            __import__('base64').b64encode(contents).decode()
        )
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Extract delivery order
        result = ocr_service.extract_delivery_order(image)
        
        LogUtils.log_ocr_result("delivery_order", result.get("confidence", 0), 
                               result.get("processing_time_ms", 0))
        
        return DeliveryOrderResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delivery order OCR error: {e}")
        LogUtils.log_error("Delivery Order OCR", str(e))
        raise HTTPException(status_code=500, detail="OCR processing failed")


@app.post("/api/v1/ocr/delivery-order/base64", response_model=DeliveryOrderResponse)
async def ocr_delivery_order_base64(
    company_id: str,
    warehouse_id: str,
    image_data: str
):
    """
    Extract delivery order from base64 encoded image
    
    Args:
        company_id: Company UUID
        warehouse_id: Warehouse UUID
        image_data: Base64 encoded image string
    
    Returns:
        DeliveryOrderResponse with extracted data
    """
    try:
        # Validate company/warehouse
        if not ValidationUtils.validate_company_warehouse(company_id, warehouse_id):
            raise HTTPException(status_code=400, detail="Invalid company_id or warehouse_id")
        
        # Load image from base64
        image = ImageUtils.load_image_from_base64(image_data)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
        
        # Extract delivery order
        result = ocr_service.extract_delivery_order(image)
        
        LogUtils.log_ocr_result("delivery_order", result.get("confidence", 0), 
                               result.get("processing_time_ms", 0))
        
        return DeliveryOrderResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delivery order OCR error: {e}")
        LogUtils.log_error("Delivery Order OCR", str(e))
        raise HTTPException(status_code=500, detail="OCR processing failed")


# ============================================================================
# Image Preprocessing Endpoints (Debug/Utility)
# ============================================================================

@app.post("/api/v1/image/quality-score")
async def get_image_quality(file: UploadFile = File(...)):
    """
    Calculate image quality score (0-1)
    
    Useful for validating image quality before OCR
    """
    try:
        contents = await file.read()
        image = ImageUtils.load_image_from_base64(
            __import__('base64').b64encode(contents).decode()
        )
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        preprocessor = ImagePreprocessor()
        quality = preprocessor.get_image_quality_score(image)
        
        return {
            "quality_score": quality,
            "quality_level": "high" if quality > 0.7 else "medium" if quality > 0.4 else "low"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Quality score error: {e}")
        raise HTTPException(status_code=500, detail="Quality calculation failed")


# ============================================================================
# Root Endpoint
# ============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "endpoints": {
            "health": "/health",
            "status": "/status",
            "hu_label_upload": "/api/v1/ocr/hu-label",
            "hu_label_base64": "/api/v1/ocr/hu-label/base64",
            "hu_label_url": "/api/v1/ocr/hu-label/url",
            "delivery_order_upload": "/api/v1/ocr/delivery-order",
            "delivery_order_base64": "/api/v1/ocr/delivery-order/base64",
            "image_quality": "/api/v1/image/quality-score"
        }
    }


# ============================================================================
# Error Handlers
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower()
    )
