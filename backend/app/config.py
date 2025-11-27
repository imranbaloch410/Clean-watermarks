"""Application configuration settings."""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "Clean Watermarks API"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File Storage
    upload_dir: Path = Path("uploads")
    output_dir: Path = Path("outputs")
    max_upload_size: int = 50 * 1024 * 1024  # 50MB per file
    max_batch_size: int = 200  # Maximum images per batch
    allowed_extensions: set = {"jpg", "jpeg", "png", "webp", "bmp", "tiff"}
    
    # Processing
    max_workers: int = 4  # Concurrent processing workers
    processing_timeout: int = 300  # 5 minutes per image max
    
    # AI Models
    ocr_languages: list = ["en"]
    detection_confidence: float = 0.7
    inpainting_model: str = "lama"  # Options: lama, simple
    
    # Redis (for task queue)
    redis_url: str = "redis://localhost:6379/0"
    
    # CORS
    cors_origins: list = ["http://localhost:3000", "http://localhost:5173"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
    
    def setup_directories(self):
        """Create necessary directories if they don't exist."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    settings = Settings()
    settings.setup_directories()
    return settings