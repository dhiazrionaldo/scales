import cv2
import numpy as np
from PIL import Image, ImageDraw
from io import BytesIO
import base64
import logging
from typing import Tuple, Optional
from config import settings


logger = logging.getLogger(__name__)


class ImagePreprocessor:
    """Image preprocessing for OCR optimization"""
    @staticmethod
    def crop_regions(image: np.ndarray) -> dict:
        """
        Crop specific regions of the label for targeted OCR
        Regions are defined as percentage of image dimensions
        """
        h, w = image.shape[:2]
        
        regions = {
            # Top section - HU code area (top 30% of image)
            "hu_region": image[0:int(h*0.3), 0:w],
            
            # Middle section - product code (30-60%)
            "product_region": image[int(h*0.3):int(h*0.6), 0:w],
            
            # Bottom section - weight, qty, batch (bottom 40%)
            "detail_region": image[int(h*0.6):h, 0:w],
        }
        
        return regions
    @staticmethod
    def decode_base64_image(image_data: str) -> np.ndarray:
        """Decode base64 image string to numpy array"""
        try:
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes))
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Error decoding base64 image: {e}")
            raise ValueError("Invalid base64 image data")
    
    @staticmethod
    def resize_image(image: np.ndarray) -> np.ndarray:
        """
        Smart resize for OCR.
        Only upscale small images, never downscale large ones.
        """
        h, w = image.shape[:2]

        # minimum OCR friendly resolution
        min_width = 1600

        if w < min_width:
            scale = min_width / w
            new_w = int(w * scale)
            new_h = int(h * scale)

            return cv2.resize(
                image,
                (new_w, new_h),
                interpolation=cv2.INTER_CUBIC
            )

        return image

    @staticmethod
    def apply_threshold(image: np.ndarray) -> np.ndarray:
        """
        Apply binary threshold to improve OCR accuracy
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary
    
    @staticmethod
    def deskew_image(image: np.ndarray) -> np.ndarray:
        """
        Detect and correct image skew for better OCR
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLines(edges, 1, np.pi/180, 100)
        
        if lines is None:
            return image
        
        angles = []
        for line in lines:
            rho, theta = line[0]
            angle = np.rad2deg(theta) - 90
            angles.append(angle)
        
        if not angles:
            return image
        
        median_angle = np.median(angles)
        
        h, w = gray.shape
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        
        if len(image.shape) == 3:
            return cv2.warpAffine(image, matrix, (w, h))
        else:
            return cv2.warpAffine(gray, matrix, (w, h))
    
    @staticmethod
    def enhance_contrast(image: np.ndarray) -> np.ndarray:
        """
        Enhance image contrast using CLAHE
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        
        if len(image.shape) == 3:
            return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)
        return enhanced
    
    @staticmethod
    def denoise_image(image: np.ndarray) -> np.ndarray:
        """
        Apply image denoising — using positional args for OpenCV 4.10 compatibility
        """
        try:
            if len(image.shape) == 3:
                return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)
            else:
                return cv2.fastNlMeansDenoising(image, None, 10, 7, 21)
        except Exception as e:
            logger.warning(f"Denoising failed, skipping: {e}")
            return image
    
    @staticmethod
    def preprocess_for_ocr(image: np.ndarray) -> np.ndarray:
        """
        Complete preprocessing pipeline for OCR
        Each step is isolated so a failure in one doesn't kill the rest
        """
        try:
            image = ImagePreprocessor.resize_image(image)
        except Exception as e:
            logger.warning(f"Resize failed, skipping: {e}")

        try:
            image = ImagePreprocessor.denoise_image(image)
        except Exception as e:
            logger.warning(f"Denoise failed, skipping: {e}")

        try:
            image = ImagePreprocessor.enhance_contrast(image)
        except Exception as e:
            logger.warning(f"Contrast enhancement failed, skipping: {e}")

        try:
            image = ImagePreprocessor.deskew_image(image)
        except Exception as e:
            logger.warning(f"Deskew failed, skipping: {e}")

        try:
            image = ImagePreprocessor.apply_threshold(image)
        except Exception as e:
            logger.warning(f"Threshold failed, skipping: {e}")

        return image
    
    @staticmethod
    def get_image_quality_score(image: np.ndarray) -> float:
        """
        Estimate image quality (0-1)
        Considers: contrast, brightness, sharpness
        """
        try:
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness_score = min(laplacian_var / 1000, 1.0)
            
            contrast = gray.std()
            contrast_score = min(contrast / 100, 1.0)
            
            brightness = gray.mean()
            brightness_score = 1.0 if 50 < brightness < 200 else 0.5
            
            quality_score = (sharpness_score * 0.4 + 
                           contrast_score * 0.4 + 
                           brightness_score * 0.2)
            
            return max(0.0, min(1.0, quality_score))
        except Exception as e:
            logger.error(f"Error calculating image quality: {e}")
            return 0.5