import cv2
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
        pass


class PaddleOCREngine(OCREngine):
    """PaddleOCR implementation — compatible with new paddleocr API"""
    
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
            if self.ocr is None:
                logger.error("PaddleOCR not initialized")
                return "", 0.0

            logger.info(f"PaddleOCR input image shape: {image.shape}, dtype: {image.dtype}")

            # PaddleOCR requires BGR 3-channel uint8 image
            if len(image.shape) == 2:
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
                logger.info(f"Converted grayscale to BGR: {image.shape}")

            # New paddleocr API — no cls argument
            results = self.ocr.ocr(image)
            logger.info(f"PaddleOCR raw results: {results}")

            if not results or results[0] is None:
                logger.warning("PaddleOCR returned empty results")
                return "", 0.0

            texts = []
            confidences = []

            for page in results:
                if page is None:
                    continue
                for line in page:
                    # New API returns: [[box], [text, confidence]]
                    # Old API returns: [[box], [text, confidence]] — same structure
                    try:
                        if isinstance(line[1], (list, tuple)):
                            text = line[1][0]
                            confidence = float(line[1][1])
                        else:
                            # Some versions return just text
                            text = str(line[1])
                            confidence = 0.8
                        
                        logger.info(f"Detected text: '{text}' with confidence: {confidence:.3f}")
                        texts.append(text)
                        confidences.append(confidence)
                    except (IndexError, TypeError) as e:
                        logger.warning(f"Could not parse line result: {line}, error: {e}")
                        continue

            full_text = " ".join(texts)
            avg_confidence = float(np.mean(confidences)) if confidences else 0.0
            logger.info(f"Final text: '{full_text}', avg confidence: {avg_confidence:.3f}")
            return full_text, avg_confidence

        except Exception as e:
            logger.error(f"PaddleOCR extraction error: {e}", exc_info=True)
            return "", 0.0


class TesseractOCREngine(OCREngine):
    """Tesseract OCR implementation"""

    def __init__(self):
        try:
            import pytesseract
            self.pytesseract = pytesseract
            logger.info("Tesseract OCR initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Tesseract: {e}")
            raise

    def extract_text(self, image: np.ndarray) -> Tuple[str, float]:
        try:
            logger.info(f"Tesseract input image shape: {image.shape}, dtype: {image.dtype}")
            data = self.pytesseract.image_to_data(image, output_type=self.pytesseract.Output.DICT)

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
            avg_confidence = float(np.mean(confidences)) if confidences else 0.0
            logger.info(f"Final text: '{full_text}', avg confidence: {avg_confidence:.3f}")
            return full_text, avg_confidence

        except Exception as e:
            logger.error(f"Tesseract extraction error: {e}", exc_info=True)
            return "", 0.0


class HULabelParser:
    
    # Matches: PABMITB0...PFUNDN format
    HU_PATTERNS = [
        r'(PAB[A-Z0-9]+)',
        r'(GGD[A-Z0-9\-]+)',
        r'HU\s*[:=]?\s*([A-Z0-9-]+)',
        r'([A-Z]{3,}\d[A-Z0-9]{5,20})',
        r'(PAB[A-Z0-9]{10,20})'
    ]

    # Matches: GGD036AN20RN7-72700B020P (5H45)
    PRODUCT_PATTERNS = [
        r'([A-Z0-9]{6,}-[A-Z0-9]{6,}\s*\([A-Z0-9]+\))',
        r'Product\s*[:=]?\s*([A-Za-z0-9\s\-/]+?)(?=\n|Qty|Quantity)',
        r'Description\s*[:=]?\s*([A-Za-z0-9\s\-/]+?)(?=\n|Qty)',
    ]

    # Matches: TOTAL(Pcs) 20
    QTY_PATTERNS = [
        r'TOTAL\s*\(?Pcs\)?\s*[:=]?\s*(\d+)',
        r'Qty\s*[:=]?\s*(\d+)',
        r'Quantity\s*[:=]?\s*(\d+)',
        r'(?:Pcs|Units)\s*[:=]?\s*(\d+)',
    ]

    # Matches: NET WEIGHT 321.180 Kg
    WEIGHT_PATTERNS = [
        r'NET\s+WEIGHT\s*[:=]?\s*([\d.]+)\s*[Kk]g',
        r'(?:Net\s+)?Weight\s*[:=]?\s*([\d.]+)\s*(?:kg|lbs?)',
        r'Net\s+Wt\s*[:=]?\s*([\d.]+)',
    ]

    # Matches: BATCH : XC430...
    BATCH_PATTERNS = [
        r'BATCH\s*[:=]?\s*([A-Z0-9-]+)',
        r'Batch\s*[:=]?\s*([A-Z0-9-]+)',
        r'Lot\s*[:=]?\s*([A-Z0-9-]+)',
    ]

    @staticmethod
    def extract_field(text: str, patterns: list) -> Optional[str]:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                return match.group(1).strip()
        return None

    @staticmethod
    def parse_hu_label(ocr_text: str) -> Dict[str, any]:
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

        result["hu_label"] = HULabelParser.extract_field(ocr_text, HULabelParser.HU_PATTERNS)
        result["product_name"] = HULabelParser.extract_field(ocr_text, HULabelParser.PRODUCT_PATTERNS)

        qty_str = HULabelParser.extract_field(ocr_text, HULabelParser.QTY_PATTERNS)
        if qty_str:
            try:
                result["qty"] = int(qty_str)
            except ValueError:
                result["qty"] = None

        weight_str = HULabelParser.extract_field(ocr_text, HULabelParser.WEIGHT_PATTERNS)
        if weight_str:
            result["net_weight"] = f"{weight_str}kg" if 'kg' not in weight_str.lower() else weight_str

        result["batch"] = HULabelParser.extract_field(ocr_text, HULabelParser.BATCH_PATTERNS)

        return result

class OCRService:
    """Main OCR Service with Hybrid OCR (Paddle + Tesseract)"""

    def __init__(self):
        self.engine_name = settings.OCR_ENGINE

        # Primary engine
        if settings.OCR_ENGINE == "paddleocr":
            self.engine = PaddleOCREngine()
        elif settings.OCR_ENGINE == "tesseract":
            self.engine = TesseractOCREngine()
        else:
            raise ValueError(f"Unsupported OCR engine: {settings.OCR_ENGINE}")

        # Fallback engine (always available)
        try:
            self.fallback_engine = TesseractOCREngine()
        except:
            self.fallback_engine = None

        self.preprocessor = ImagePreprocessor()

        logger.info(f"OCR Service initialized with {self.engine_name} engine")

    def _run_multi_preprocessing(self, image: np.ndarray) -> list:
        """
        Generate multiple preprocessing variants
        Improves OCR accuracy significantly
        """

        variants = []

        try:
            variants.append(ImagePreprocessor.preprocess_for_ocr(image))
        except:
            pass

        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            variants.append(gray)
        except:
            pass

        try:
            thr = ImagePreprocessor.apply_threshold(image)
            variants.append(thr)
        except:
            pass

        return variants

    def _run_ocr_engine(self, engine, image: np.ndarray) -> Tuple[str, float]:
        try:
            text, conf = engine.extract_text(image)
            return text, conf
        except Exception as e:
            logger.warning(f"OCR engine failed: {e}")
            return "", 0.0

    def _run_ocr_with_fallback(self, image: np.ndarray) -> Tuple[str, float]:

        regions = self.preprocessor.crop_regions(image)

        all_text = []
        confidences = []

        for region_name, region_img in regions.items():

            variants = self._run_multi_preprocessing(region_img)

            best_text = ""
            best_conf = 0.0

            for variant in variants:

                # Primary engine
                text, conf = self._run_ocr_engine(self.engine, variant)

                if conf > best_conf:
                    best_text = text
                    best_conf = conf

                # Fallback engine
                if self.fallback_engine:
                    text2, conf2 = self._run_ocr_engine(self.fallback_engine, variant)

                    if conf2 > best_conf:
                        best_text = text2
                        best_conf = conf2

            logger.info(f"OCR {region_name}: {best_text}")

            if best_text:
                all_text.append(best_text)
                confidences.append(best_conf)

        if not all_text:
            return "", 0.0

        full_text = "\n".join(all_text)
        avg_conf = float(np.mean(confidences)) if confidences else 0.0

        return full_text, avg_conf

    def extract_hu_label(self, image: np.ndarray) -> Dict:
        start_time = time.time()

        try:
            logger.info(f"Starting HU label extraction, image shape: {image.shape}")

            quality_score = self.preprocessor.get_image_quality_score(image)

            ocr_text, ocr_confidence = self._run_ocr_with_fallback(image)

            parsed_data = HULabelParser.parse_hu_label(ocr_text)

            overall_confidence = ocr_confidence

            if parsed_data.get("hu_label"):
                overall_confidence = min(1.0, overall_confidence + 0.05)

            if parsed_data.get("product_name"):
                overall_confidence = min(1.0, overall_confidence + 0.05)

            return {
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

        except Exception as e:
            logger.error(f"Error extracting HU label: {e}", exc_info=True)

            return {
                "hu_label": "",
                "product_name": "",
                "qty": 0,
                "net_weight": "",
                "batch": "",
                "confidence": 0.0,
                "error": str(e),
                "processing_time_ms": (time.time() - start_time) * 1000
            }

    def extract_delivery_order(self, image: np.ndarray) -> Dict:

        start_time = time.time()

        try:

            quality_score = self.preprocessor.get_image_quality_score(image)

            ocr_text, ocr_confidence = self._run_ocr_with_fallback(image)

            parsed_data = HULabelParser.parse_hu_label(ocr_text)

            overall_confidence = ocr_confidence

            if parsed_data.get("hu_label"):
                overall_confidence = min(1.0, overall_confidence + 0.05)

            return {
                "hu_label": parsed_data["hu_label"] or "",
                "product_name": parsed_data["product_name"] or "",
                "qty": parsed_data["qty"] or 0,
                "batch": parsed_data["batch"] or "",
                "confidence": max(0.0, min(1.0, overall_confidence)),
                "raw_text": ocr_text,
                "processing_time_ms": (time.time() - start_time) * 1000,
                "quality_score": quality_score
            }

        except Exception as e:

            logger.error(f"Error extracting delivery order: {e}", exc_info=True)

            return {
                "hu_label": "",
                "product_name": "",
                "qty": 0,
                "batch": "",
                "confidence": 0.0,
                "error": str(e),
                "processing_time_ms": (time.time() - start_time) * 1000
            }

# class OCRService:
#     """Main OCR Service"""

#     def __init__(self):
#         self.engine_name = settings.OCR_ENGINE

#         if settings.OCR_ENGINE == "paddleocr":
#             self.engine = PaddleOCREngine()
#         elif settings.OCR_ENGINE == "tesseract":
#             self.engine = TesseractOCREngine()
#         else:
#             raise ValueError(f"Unsupported OCR engine: {settings.OCR_ENGINE}")

#         self.preprocessor = ImagePreprocessor()
#         logger.info(f"OCR Service initialized with {self.engine_name} engine")

#     def _run_ocr_with_fallback(self, image: np.ndarray) -> Tuple[str, float]:

#         regions = self.preprocessor.crop_regions(image)

#         all_text = []
#         confidences = []

#         for region_name, region_img in regions.items():

#             processed = self.preprocessor.preprocess_for_ocr(region_img)

#             text, conf = self.engine.extract_text(processed)

#             logger.info(f"OCR {region_name}: {text}")

#             if text:
#                 all_text.append(text)
#                 confidences.append(conf)

#         if not all_text:
#             return "", 0.0

#         full_text = "\n".join(all_text)
#         avg_conf = float(np.mean(confidences)) if confidences else 0.0

#         return full_text, avg_conf
    
#     def extract_hu_label(self, image: np.ndarray) -> Dict:
#         start_time = time.time()

#         try:
#             logger.info(f"Starting HU label extraction, image shape: {image.shape}")

#             quality_score = self.preprocessor.get_image_quality_score(image)
#             logger.info(f"Image quality score: {quality_score:.3f}")

#             ocr_text, ocr_confidence = self._run_ocr_with_fallback(image)

#             parsed_data = HULabelParser.parse_hu_label(ocr_text)

#             overall_confidence = ocr_confidence
#             if parsed_data.get("hu_label"):
#                 overall_confidence = min(1.0, overall_confidence + 0.05)
#             if parsed_data.get("product_name"):
#                 overall_confidence = min(1.0, overall_confidence + 0.05)

#             return {
#                 "hu_label": parsed_data["hu_label"] or "",
#                 "product_name": parsed_data["product_name"] or "",
#                 "qty": parsed_data["qty"] or 0,
#                 "net_weight": parsed_data["net_weight"] or "",
#                 "batch": parsed_data["batch"] or "",
#                 "confidence": max(0.0, min(1.0, overall_confidence)),
#                 "raw_text": ocr_text,
#                 "processing_time_ms": (time.time() - start_time) * 1000,
#                 "quality_score": quality_score,
#                 "ocr_confidence": ocr_confidence
#             }

#         except Exception as e:
#             logger.error(f"Error extracting HU label: {e}", exc_info=True)
#             return {
#                 "hu_label": "", "product_name": "", "qty": 0,
#                 "net_weight": "", "batch": "",
#                 "confidence": 0.0, "error": str(e),
#                 "processing_time_ms": (time.time() - start_time) * 1000
#             }

#     def extract_delivery_order(self, image: np.ndarray) -> Dict:
#         start_time = time.time()

#         try:
#             logger.info(f"Starting delivery order extraction, image shape: {image.shape}")

#             quality_score = self.preprocessor.get_image_quality_score(image)
#             logger.info(f"Image quality score: {quality_score:.3f}")

#             ocr_text, ocr_confidence = self._run_ocr_with_fallback(image)

#             parsed_data = HULabelParser.parse_hu_label(ocr_text)

#             overall_confidence = ocr_confidence
#             if parsed_data.get("hu_label"):
#                 overall_confidence = min(1.0, overall_confidence + 0.05)

#             return {
#                 "hu_label": parsed_data["hu_label"] or "",
#                 "product_name": parsed_data["product_name"] or "",
#                 "qty": parsed_data["qty"] or 0,
#                 "batch": parsed_data["batch"] or "",
#                 "confidence": max(0.0, min(1.0, overall_confidence)),
#                 "raw_text": ocr_text,
#                 "processing_time_ms": (time.time() - start_time) * 1000,
#                 "quality_score": quality_score
#             }

#         except Exception as e:
#             logger.error(f"Error extracting delivery order: {e}", exc_info=True)
#             return {
#                 "hu_label": "", "product_name": "", "qty": 0, "batch": "",
#                 "confidence": 0.0, "error": str(e),
#                 "processing_time_ms": (time.time() - start_time) * 1000
#             }