import logging
import re
import time
from typing import Dict, Optional, Tuple
from abc import ABC, abstractmethod
import numpy as np
from config import settings
from preprocessing import ImagePreprocessor


logger = logging.getLogger(__name__)


class OCREngine(ABC):
    """Abstract base class for OCR engines"""
    
    @abstractmethod
    def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
        """
        Extract text from image
        
        Returns:
            Tuple of (extracted_text, confidence)
        """
        pass

class PaddleOCREngine(OCREngine):
    """PaddleOCR implementation"""
    
    def __init__(self):
        try:
            from paddleocr import PaddleOCR
            self.ocr = PaddleOCR(lang='en')
            logger.info("PaddleOCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize PaddleOCR: {e}", exc_info=True)
            self.ocr = None
            raise
    
    def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
        try:
            # Guard check
            if self.ocr is None:
                logger.error("PaddleOCR not initialized")
                return "", 0.0

            logger.info(f"PaddleOCR input image shape: {image.shape}, dtype: {image.dtype}")
            
            # PaddleOCR expects BGR uint8 image
            if len(image.shape) == 2:
                # Convert grayscale back to BGR
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
                logger.info(f"Converted grayscale to BGR: {image.shape}")
            
            results = self.ocr.ocr(image, cls=True)
            logger.info(f"PaddleOCR raw results: {results}")
            
            if not results or not results[0]:
                logger.warning("PaddleOCR returned empty results")
                return "", 0.0
            
            texts = []
            confidences = []
            for line in results[0]:
                text = line[1][0]
                confidence = line[1][1]
                logger.info(f"Detected text: '{text}' with confidence: {confidence}")
                texts.append(text)
                confidences.append(confidence)
            
            full_text = " ".join(texts)
            avg_confidence = np.mean(confidences) if confidences else 0.0
            logger.info(f"Final text: '{full_text}', avg confidence: {avg_confidence}")
            return full_text, avg_confidence
            
        except Exception as e:
            logger.error(f"PaddleOCR extraction error: {e}", exc_info=True)
            return "", 0.0
            
class TesseractOCREngine(OCREngine):
    def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
        try:
            logger.info(f"Tesseract input image shape: {image.shape}, dtype: {image.dtype}")
            data = self.pytesseract.image_to_data(image, output_type=self.pytesseract.Output.DICT)
            logger.info(f"Tesseract raw data: {data}")
            
            texts = []
            confidences = []
            for i, text in enumerate(data['text']):
                if text.strip():
                    conf = int(data['conf'][i])
                    logger.info(f"Detected text: '{text}' with confidence: {conf}")
                    texts.append(text)
                    if conf > 0:
                        confidences.append(conf / 100.0)
            
            full_text = " ".join(texts)
            avg_confidence = np.mean(confidences) if confidences else 0.0
            logger.info(f"Final text: '{full_text}', avg confidence: {avg_confidence}")
            return full_text, avg_confidence
            
        except Exception as e:
            logger.error(f"Tesseract extraction error: {e}", exc_info=True)
            return "", 0.0

# class PaddleOCREngine(OCREngine):
#     """PaddleOCR implementation"""
    
#     def __init__(self):
#         try:
#             from paddleocr import PaddleOCR
#             self.ocr = PaddleOCR(use_angle_cls=True, lang='en')
#             logger.info("PaddleOCR initialized successfully")
#         except Exception as e:
#             logger.error(f"Failed to initialize PaddleOCR: {e}")
#             raise
    
#     def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
#         """Extract text using PaddleOCR"""
#         try:
#             results = self.ocr.ocr(image, cls=True)
            
#             if not results or not results[0]:
#                 return "", 0.0
            
#             texts = []
#             confidences = []
            
#             for line in results[0]:
#                 text = line[1][0]
#                 confidence = line[1][1]
#                 texts.append(text)
#                 confidences.append(confidence)
            
#             full_text = " ".join(texts)
#             avg_confidence = np.mean(confidences) if confidences else 0.0
            
#             return full_text, avg_confidence
#         except Exception as e:
#             logger.error(f"PaddleOCR extraction error: {e}")
#             return "", 0.0


# class TesseractOCREngine(OCREngine):
#     """Tesseract OCR implementation"""
    
#     def __init__(self):
#         try:
#             import pytesseract
#             self.pytesseract = pytesseract
#             logger.info("Tesseract OCR initialized successfully")
#         except Exception as e:
#             logger.error(f"Failed to initialize Tesseract: {e}")
#             raise
    
#     def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
#         """Extract text using Tesseract"""
#         try:
#             # Get detailed OCR data
#             data = self.pytesseract.image_to_data(image, output_type=self.pytesseract.Output.DICT)
            
#             texts = []
#             confidences = []
            
#             for i, text in enumerate(data['text']):
#                 if text.strip():
#                     texts.append(text)
#                     confidence = int(data['conf'][i]) / 100.0
#                     if confidence > 0:
#                         confidences.append(confidence)
            
#             full_text = " ".join(texts)
#             avg_confidence = np.mean(confidences) if confidences else 0.0
            
#             return full_text, avg_confidence
#         except Exception as e:
#             logger.error(f"Tesseract extraction error: {e}")
#             return "", 0.0


class HULabelParser:
    """Parse HU Label text into structured data"""
    
    # Pattern definitions for common warehouse label formats
    HU_PATTERNS = [
        r'HU\s*[:=]?\s*([A-Z0-9-]+)',
        r'Handling Unit\s*[:=]?\s*([A-Z0-9-]+)',
        r'([A-Z0-9]{6,15})',  # Generic HU ID pattern
    ]
    
    PRODUCT_PATTERNS = [
        r'Product\s*[:=]?\s*([A-Za-z0-9\s\-/]+?)(?=\n|Qty|Quantity)',
        r'Description\s*[:=]?\s*([A-Za-z0-9\s\-/]+?)(?=\n|Qty)',
        r'Item\s*[:=]?\s*([A-Za-z0-9\s\-/]+?)(?=\n|Qty)',
    ]
    
    QTY_PATTERNS = [
        r'Q(?:ty|uantity)\s*[:=]?\s*(\d+)',
        r'Qty\s*[:=]?\s*(\d+)',
        r'Quantity\s*[:=]?\s*(\d+)',
        r'(?:Pcs|Units)\s*[:=]?\s*(\d+)',
    ]
    
    WEIGHT_PATTERNS = [
        r'(?:Net\s+)?Weight\s*[:=]?\s*([\d.]+)\s*(?:kg|lbs?)',
        r'Weight\s*[:=]?\s*([\d.]+)\s*kg',
        r'Net\s+Wt\s*[:=]?\s*([\d.]+)',
    ]
    
    BATCH_PATTERNS = [
        r'Batch\s*[:=]?\s*([A-Z0-9-]+)',
        r'Lot\s*[:=]?\s*([A-Z0-9-]+)',
        r'Batch\s+(?:No|Number)\s*[:=]?\s*([A-Z0-9-]+)',
    ]
    
    @staticmethod
    def extract_field(text: str, patterns: list) -> Optional[str]:
        """
        Extract field using multiple patterns
        
        Args:
            text: Source text
            patterns: List of regex patterns to try
        
        Returns:
            Extracted value or None
        """
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None
    
    @staticmethod
    def parse_hu_label(ocr_text: str) -> Dict[str, any]:
        """
        Parse OCR text into HU label components
        
        Returns:
            Dictionary with extracted fields
        """
        result = {
            "hu_label": None,
            "product_name": None,
            "qty": None,
            "net_weight": None,
            "batch": None,
            "raw_text": ocr_text,
            "confidence_scores": {}
        }
        
        if not ocr_text or len(ocr_text.strip()) < 3:
            return result
        
        # Extract HU Label
        hu = HULabelParser.extract_field(ocr_text, HULabelParser.HU_PATTERNS)
        result["hu_label"] = hu
        
        # Extract Product Name
        product = HULabelParser.extract_field(ocr_text, HULabelParser.PRODUCT_PATTERNS)
        result["product_name"] = product
        
        # Extract Quantity
        qty_str = HULabelParser.extract_field(ocr_text, HULabelParser.QTY_PATTERNS)
        if qty_str:
            try:
                result["qty"] = int(qty_str)
            except ValueError:
                result["qty"] = None
        
        # Extract Weight
        weight_str = HULabelParser.extract_field(ocr_text, HULabelParser.WEIGHT_PATTERNS)
        if weight_str:
            # Ensure kg unit
            if 'kg' not in weight_str.lower():
                result["net_weight"] = f"{weight_str}kg"
            else:
                result["net_weight"] = weight_str
        
        # Extract Batch
        batch = HULabelParser.extract_field(ocr_text, HULabelParser.BATCH_PATTERNS)
        result["batch"] = batch
        
        return result


class OCRService:
    """Main OCR Service"""
    
    def __init__(self):
        """Initialize OCR service with configured engine"""
        self.engine_name = settings.OCR_ENGINE
        
        if settings.OCR_ENGINE == "paddleocr":
            self.engine = PaddleOCREngine()
        elif settings.OCR_ENGINE == "tesseract":
            self.engine = TesseractOCREngine()
        else:
            raise ValueError(f"Unsupported OCR engine: {settings.OCR_ENGINE}")
        
        self.preprocessor = ImagePreprocessor()
        logger.info(f"OCR Service initialized with {self.engine_name} engine")
    
    # def extract_hu_label(self, image: np.ndarray) -> Dict:
    #     """
    #     Extract HU label from image
        
    #     Args:
    #         image: Input image (numpy array)
        
    #     Returns:
    #         Dictionary with extracted HU data and confidence
    #     """
    #     start_time = time.time()
        
    #     try:
    #         # Preprocess image
    #         processed_image = self.preprocessor.preprocess_for_ocr(image)
            
    #         # Get image quality score
    #         quality_score = self.preprocessor.get_image_quality_score(image)
            
    #         # Extract text using OCR engine
    #         ocr_text, ocr_confidence = self.engine.extract_text(processed_image)
            
    #         # Parse extracted text
    #         parsed_data = HULabelParser.parse_hu_label(ocr_text)
            
    #         # Calculate overall confidence
    #         overall_confidence = (ocr_confidence * 0.7 + quality_score * 0.3)
            
    #         # Build response
    #         response = {
    #             "hu_label": parsed_data["hu_label"] or "",
    #             "product_name": parsed_data["product_name"] or "",
    #             "qty": parsed_data["qty"] or 0,
    #             "net_weight": parsed_data["net_weight"] or "",
    #             "batch": parsed_data["batch"] or "",
    #             "confidence": max(0.0, min(1.0, overall_confidence)),
    #             "raw_text": ocr_text,
    #             "processing_time_ms": (time.time() - start_time) * 1000,
    #             "quality_score": quality_score,
    #             "ocr_confidence": ocr_confidence
    #         }
            
    #         return response
    #     except Exception as e:
    #         logger.error(f"Error extracting HU label: {e}")
    #         return {
    #             "hu_label": "",
    #             "product_name": "",
    #             "qty": 0,
    #             "net_weight": "",
    #             "batch": "",
    #             "confidence": 0.0,
    #             "error": str(e),
    #             "processing_time_ms": (time.time() - start_time) * 1000
    #         }

    def extract_hu_label(self, image: np.ndarray) -> Dict:
        start_time = time.time()
        
        try:
            logger.info(f"Starting HU label extraction, image shape: {image.shape}")
        
            processed_image = self.preprocessor.preprocess_for_ocr(image)
            logger.info(f"Preprocessed image shape: {processed_image.shape}")
            
            quality_score = self.preprocessor.get_image_quality_score(image)
            logger.info(f"Image quality score: {quality_score}")
            
            ocr_text, ocr_confidence = self.engine.extract_text(processed_image)
            logger.info(f"OCR result - text: '{ocr_text}', confidence: {ocr_confidence}")
            # Preprocess image
            # processed_image = self.preprocessor.preprocess_for_ocr(image)
            # quality_score = self.preprocessor.get_image_quality_score(image)
            
            # # Try primary OCR
            # ocr_text, ocr_confidence = self.engine.extract_text(processed_image)
            
            # If confidence is low, retry with original unprocessed image
            if ocr_confidence < 0.5:
                logger.warning(f"Low confidence ({ocr_confidence:.2f}) on processed image, retrying with original")
                ocr_text_raw, ocr_confidence_raw = self.engine.extract_text(image)
                if ocr_confidence_raw > ocr_confidence:
                    ocr_text = ocr_text_raw
                    ocr_confidence = ocr_confidence_raw
                    logger.info(f"Retry improved confidence to {ocr_confidence:.2f}")
            
            # Parse extracted text
            parsed_data = HULabelParser.parse_hu_label(ocr_text)
            
            # Use OCR confidence directly — don't penalize with quality score
            # Quality score is informational only
            overall_confidence = ocr_confidence
            
            # Boost confidence slightly if key fields were successfully parsed
            if parsed_data.get("hu_label"):
                overall_confidence = min(1.0, overall_confidence + 0.05)
            if parsed_data.get("product_name"):
                overall_confidence = min(1.0, overall_confidence + 0.05)

            response = {
                "hu_label": parsed_data["hu_label"] or "",
                "product_name": parsed_data["product_name"] or "",
                "qty": parsed_data["qty"] or 0,
                "net_weight": parsed_data["net_weight"] or "",
                "batch": parsed_data["batch"] or "",
                "confidence": max(0.0, min(1.0, overall_confidence)),
                "raw_text": ocr_text,
                "processing_time_ms": (time.time() - start_time) * 1000,
                "quality_score": quality_score,
                "ocr_confidence": ocr_confidence
            }
            
            return response
        except Exception as e:
            logger.error(f"Error extracting HU label: {e}")
            return {
                "hu_label": "", "product_name": "", "qty": 0,
                "net_weight": "", "batch": "",
                "confidence": 0.0, "error": str(e),
                "processing_time_ms": (time.time() - start_time) * 1000
            }

    def extract_delivery_order(self, image: np.ndarray) -> Dict:
        start_time = time.time()
        
        try:
            processed_image = self.preprocessor.preprocess_for_ocr(image)
            quality_score = self.preprocessor.get_image_quality_score(image)
            
            ocr_text, ocr_confidence = self.engine.extract_text(processed_image)
            
            # Retry with original if confidence too low
            if ocr_confidence < 0.5:
                logger.warning(f"Low confidence ({ocr_confidence:.2f}), retrying with original image")
                ocr_text_raw, ocr_confidence_raw = self.engine.extract_text(image)
                if ocr_confidence_raw > ocr_confidence:
                    ocr_text = ocr_text_raw
                    ocr_confidence = ocr_confidence_raw

            parsed_data = HULabelParser.parse_hu_label(ocr_text)
            overall_confidence = ocr_confidence

            if parsed_data.get("hu_label"):
                overall_confidence = min(1.0, overall_confidence + 0.05)

            response = {
                "hu_label": parsed_data["hu_label"] or "",
                "product_name": parsed_data["product_name"] or "",
                "qty": parsed_data["qty"] or 0,
                "batch": parsed_data["batch"] or "",
                "confidence": max(0.0, min(1.0, overall_confidence)),
                "raw_text": ocr_text,
                "processing_time_ms": (time.time() - start_time) * 1000,
                "quality_score": quality_score
            }
            
            return response
        except Exception as e:
            logger.error(f"Error extracting delivery order: {e}")
            return {
                "hu_label": "", "product_name": "", "qty": 0, "batch": "",
                "confidence": 0.0, "error": str(e),
                "processing_time_ms": (time.time() - start_time) * 1000
            }
    
    def extract_delivery_order(self, image: np.ndarray) -> Dict:
        """
        Extract delivery order information from image
        
        Args:
            image: Input image (numpy array)
        
        Returns:
            Dictionary with extracted DO data
        """
        start_time = time.time()
        
        try:
            # Preprocess image
            processed_image = self.preprocessor.preprocess_for_ocr(image)
            
            # Get image quality score
            quality_score = self.preprocessor.get_image_quality_score(image)
            
            # Extract text using OCR engine
            ocr_text, ocr_confidence = self.engine.extract_text(processed_image)
            
            # Parse extracted text
            parsed_data = HULabelParser.parse_hu_label(ocr_text)
            
            # Calculate overall confidence
            overall_confidence = (ocr_confidence * 0.7 + quality_score * 0.3)
            
            # Build response
            response = {
                "hu_label": parsed_data["hu_label"] or "",
                "product_name": parsed_data["product_name"] or "",
                "qty": parsed_data["qty"] or 0,
                "batch": parsed_data["batch"] or "",
                "confidence": max(0.0, min(1.0, overall_confidence)),
                "raw_text": ocr_text,
                "processing_time_ms": (time.time() - start_time) * 1000,
                "quality_score": quality_score
            }
            
            return response
        except Exception as e:
            logger.error(f"Error extracting delivery order: {e}")
            return {
                "hu_label": "",
                "product_name": "",
                "qty": 0,
                "batch": "",
                "confidence": 0.0,
                "error": str(e),
                "processing_time_ms": (time.time() - start_time) * 1000
            }
