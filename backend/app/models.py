"""Pydantic models for API requests and responses."""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


class ProcessingStatus(str, Enum):
    """Status of image processing."""
    PENDING = "pending"
    DETECTING = "detecting"
    REMOVING = "removing"
    COMPLETED = "completed"
    FAILED = "failed"


class WatermarkRegion(BaseModel):
    """Detected watermark region coordinates."""
    x: float = Field(..., ge=0, le=1, description="X coordinate (0-1)")
    y: float = Field(..., ge=0, le=1, description="Y coordinate (0-1)")
    width: float = Field(..., ge=0, le=1, description="Width (0-1)")
    height: float = Field(..., ge=0, le=1, description="Height (0-1)")
    confidence: float = Field(default=0.0, ge=0, le=1, description="Detection confidence")
    text: Optional[str] = Field(default=None, description="Detected text if OCR")
    type: str = Field(default="text", description="Type: text, logo, pattern")


class ImageTask(BaseModel):
    """Individual image processing task."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_path: Optional[str] = None
    processed_path: Optional[str] = None
    status: ProcessingStatus = ProcessingStatus.PENDING
    regions: List[WatermarkRegion] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    processing_time_ms: Optional[int] = None


class BatchJob(BaseModel):
    """Batch processing job containing multiple images."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tasks: List[ImageTask] = Field(default_factory=list)
    total_images: int = 0
    completed_images: int = 0
    failed_images: int = 0
    status: ProcessingStatus = ProcessingStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    @property
    def progress(self) -> float:
        """Calculate progress percentage."""
        if self.total_images == 0:
            return 0.0
        return (self.completed_images + self.failed_images) / self.total_images * 100


class UploadResponse(BaseModel):
    """Response after uploading images."""
    job_id: str
    total_images: int
    message: str


class ProcessingOptions(BaseModel):
    """Options for watermark removal processing."""
    auto_detect: bool = Field(default=True, description="Auto-detect watermarks using AI")
    detection_confidence: float = Field(default=0.7, ge=0.5, le=0.95)
    ocr_enabled: bool = Field(default=True, description="Enable OCR text detection")
    logo_detection: bool = Field(default=True, description="Enable logo detection")
    inpainting_method: str = Field(default="lama", description="Inpainting method: lama, simple")
    preserve_quality: bool = Field(default=True, description="Preserve original image quality")
    manual_regions: List[WatermarkRegion] = Field(default_factory=list)


class JobStatusResponse(BaseModel):
    """Response for job status query."""
    job_id: str
    status: ProcessingStatus
    progress: float
    total_images: int
    completed_images: int
    failed_images: int
    tasks: List[ImageTask]
    download_ready: bool = False


class DetectionResult(BaseModel):
    """Result of watermark detection on an image."""
    image_id: str
    regions: List[WatermarkRegion]
    detection_time_ms: int


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "healthy"
    version: str
    gpu_available: bool = False
    models_loaded: bool = False