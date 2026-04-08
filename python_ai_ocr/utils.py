import logging
import requests
from typing import Optional, Dict
from PIL import Image
from io import BytesIO
import numpy as np
import base64
from config import settings

try:
    from supabase import create_client, Client
except ImportError:
    Client = None


logger = logging.getLogger(__name__)


class ImageUtils:
    """Image handling utilities"""
    
    @staticmethod
    def validate_image_size(file_size_bytes: int) -> bool:
        """Check if image size is within limits"""
        max_bytes = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        return file_size_bytes <= max_bytes
    
    @staticmethod
    def load_image_from_url(url: str) -> Optional[np.ndarray]:
        """
        Load image from URL
        
        Args:
            url: Image URL
        
        Returns:
            Image as numpy array or None if failed
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            image = Image.open(BytesIO(response.content))
            
            # Validate image
            if image.size[0] * image.size[1] == 0:
                logger.error("Invalid image dimensions")
                return None
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = rgb_image
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            return np.array(image)[:, :, ::-1]  # Convert RGB to BGR
        except Exception as e:
            logger.error(f"Error loading image from URL: {e}")
            return None
    
    @staticmethod
    def load_image_from_base64(base64_data: str) -> Optional[np.ndarray]:
        """
        Load image from base64 string
        
        Args:
            base64_data: Base64 encoded image
        
        Returns:
            Image as numpy array or None if failed
        """
        try:
            # Remove data URL prefix if present
            if ',' in base64_data:
                base64_data = base64_data.split(',')[1]
            
            image_bytes = base64.b64decode(base64_data)
            image = Image.open(BytesIO(image_bytes))
            
            # Validate image
            if image.size[0] * image.size[1] == 0:
                logger.error("Invalid image dimensions")
                return None
            
            # Convert to BGR for OpenCV
            if image.mode == 'RGBA':
                rgb_image = Image.new('RGB', image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[3])
                image = rgb_image
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            return np.array(image)[:, :, ::-1]  # Convert RGB to BGR
        except Exception as e:
            logger.error(f"Error loading image from base64: {e}")
            return None


class ValidationUtils:
    """Data validation utilities"""
    
    _supabase_client: Optional[Client] = None
    
    @classmethod
    def get_supabase_client(cls) -> Optional[Client]:
        """Get or initialize Supabase client"""
        if cls._supabase_client is None and Client is not None:
            try:
                cls._supabase_client = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                logger.info(f"Connected to Supabase at {settings.SUPABASE_URL}")
            except Exception as e:
                logger.error(f"Failed to connect to Supabase: {e}")
                return None
        return cls._supabase_client
    
    @staticmethod
    def validate_company_warehouse(company_id: str, warehouse_id: str) -> bool:
        """
        Validate company and warehouse IDs against Supabase
        """
        if not settings.ENABLE_COMPANY_VALIDATION:
            return True
        
        # Basic format validation
        if not company_id or not warehouse_id:
            logger.warning("Company ID or Warehouse ID is empty")
            return False
        
        # Query Supabase to verify company and warehouse exist
        try:
            supabase = ValidationUtils.get_supabase_client()
            if supabase is None:
                logger.warning("Supabase client not available, skipping database validation")
                return True
            
            # Check if company exists
            company_response = supabase.table("companies").select("id").eq("id", company_id).execute()
            if not company_response.data:
                logger.warning(f"Company not found in database: {company_id}")
                return False
            
            # Check if warehouse exists and belongs to the company
            warehouse_response = supabase.table("warehouses").select("id").eq("id", warehouse_id).eq("company_id", company_id).execute()
            if not warehouse_response.data:
                logger.warning(f"Warehouse not found or doesn't belong to company: {warehouse_id}/{company_id}")
                return False
            
            logger.info(f"Validation successful for company: {company_id}, warehouse: {warehouse_id}")
            return True
        
        except Exception as e:
            logger.error(f"Error validating company/warehouse in Supabase: {e}")
            # Fail safe: if validation fails, reject the request
            return False
    
    @staticmethod
    def validate_ocr_result(result: Dict) -> bool:
        """Validate OCR result for required fields"""
        required_fields = ["hu_label", "product_name", "confidence"]
        
        for field in required_fields:
            if field not in result:
                return False
            
            if field == "hu_label" and not result[field]:
                return False
            
            if field == "confidence" and not (0 <= result[field] <= 1):
                return False
        
        return True


class LogUtils:
    """Logging utilities"""
    
    @staticmethod
    def setup_logging(level: str = "INFO"):
        """Setup logging configuration"""
        logging.basicConfig(
            level=level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    @staticmethod
    def log_ocr_request(company_id: str, warehouse_id: str, ocr_type: str):
        """Log OCR request"""
        logger.info(f"OCR Request - Company: {company_id}, Warehouse: {warehouse_id}, Type: {ocr_type}")
    
    @staticmethod
    def log_ocr_result(ocr_type: str, confidence: float, processing_time: float):
        """Log OCR result"""
        logger.info(f"OCR Result - Type: {ocr_type}, Confidence: {confidence:.3f}, Time: {processing_time:.1f}ms")
    
    @staticmethod
    def log_error(operation: str, error: str):
        """Log error"""
        logger.error(f"{operation} failed: {error}")
