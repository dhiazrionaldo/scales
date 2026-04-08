from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """Application settings"""
    
    # App Configuration
    APP_NAME: str = "SCALES AI OCR Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8100
    
    # OCR Configuration
    OCR_ENGINE: Literal["paddleocr", "tesseract"] = "paddleocr"
    OCR_CONFIDENCE_THRESHOLD: float = 0.5
    OCR_MAX_RESPONSE_TIME_MS: int = 300
    
    # Image Processing
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/webp"]
    IMAGE_RESIZE_WIDTH: int = 1280
    IMAGE_RESIZE_HEIGHT: int = 720
    
    # Multi-tenant
    ENABLE_COMPANY_VALIDATION: bool = True
    
    # Supabase Configuration
    SUPABASE_URL: str = "http://10.100.17.2:7000"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzE5MTUxMTYsImV4cCI6MTkyOTU5NTExNn0.0V7oHtg6-JX5u-Wyzk54LirL42DjaD8rcWf65NKniMc"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
