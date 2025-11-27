"""Image processing service for batch watermark removal."""
import asyncio
import logging
import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np
from PIL import Image

from ..config import get_settings
from ..models import (
    BatchJob,
    ImageTask,
    ProcessingOptions,
    ProcessingStatus,
    WatermarkRegion,
)
from .detector import get_detector
from .inpainter import get_inpainter

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Handles batch image processing for watermark removal."""
    
    def __init__(self):
        self.settings = get_settings()
        self.jobs: Dict[str, BatchJob] = {}
        self.executor = ThreadPoolExecutor(max_workers=self.settings.max_workers)
        self._detector = None
        self._inpainter = None
    
    @property
    def detector(self):
        if self._detector is None:
            self._detector = get_detector()
        return self._detector
    
    @property
    def inpainter(self):
        if self._inpainter is None:
            self._inpainter = get_inpainter()
        return self._inpainter
    
    def create_job(self, filenames: List[str]) -> BatchJob:
        """Create a new batch processing job."""
        job_id = str(uuid.uuid4())
        
        tasks = [
            ImageTask(
                id=str(uuid.uuid4()),
                filename=filename,
                status=ProcessingStatus.PENDING
            )
            for filename in filenames
        ]
        
        job = BatchJob(
            id=job_id,
            tasks=tasks,
            total_images=len(tasks),
            status=ProcessingStatus.PENDING
        )
        
        self.jobs[job_id] = job
        logger.info(f"Created job {job_id} with {len(tasks)} images")
        
        return job
    
    def get_job(self, job_id: str) -> Optional[BatchJob]:
        """Get job by ID."""
        return self.jobs.get(job_id)
    
    async def process_job(
        self,
        job_id: str,
        options: ProcessingOptions
    ) -> BatchJob:
        """Process all images in a job asynchronously."""
        job = self.jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = ProcessingStatus.DETECTING
        logger.info(f"Starting processing for job {job_id}")
        
        # Process images concurrently
        loop = asyncio.get_event_loop()
        tasks = []
        
        for task in job.tasks:
            future = loop.run_in_executor(
                self.executor,
                self._process_single_image,
                task,
                options,
                job_id
            )
            tasks.append(future)
        
        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Update job status
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                job.tasks[i].status = ProcessingStatus.FAILED
                job.tasks[i].error = str(result)
                job.failed_images += 1
                logger.error(f"Task {job.tasks[i].id} failed: {result}")
            else:
                job.completed_images += 1
        
        # Final job status
        if job.failed_images == job.total_images:
            job.status = ProcessingStatus.FAILED
        else:
            job.status = ProcessingStatus.COMPLETED
        
        job.completed_at = datetime.utcnow()
        logger.info(
            f"Job {job_id} completed: {job.completed_images}/{job.total_images} successful"
        )
        
        return job
    
    def _process_single_image(
        self,
        task: ImageTask,
        options: ProcessingOptions,
        job_id: str
    ) -> ImageTask:
        """Process a single image (runs in thread pool)."""
        start_time = time.time()
        
        try:
            # Update status
            task.status = ProcessingStatus.DETECTING
            
            # Load image
            image_path = self.settings.upload_dir / job_id / task.filename
            image = cv2.imread(str(image_path))
            
            if image is None:
                raise ValueError(f"Failed to load image: {task.filename}")
            
            # Detect watermarks
            regions = []
            
            if options.auto_detect:
                detected_regions, detect_time = self.detector.detect(
                    image,
                    confidence_threshold=options.detection_confidence,
                    detect_text=options.ocr_enabled,
                    detect_logos=options.logo_detection
                )
                regions.extend(detected_regions)
            
            # Add manual regions if provided
            if options.manual_regions:
                regions.extend(options.manual_regions)
            
            task.regions = regions
            
            # Remove watermarks
            task.status = ProcessingStatus.REMOVING
            
            if regions:
                result, inpaint_time = self.inpainter.inpaint(
                    image,
                    regions,
                    method=options.inpainting_method
                )
            else:
                result = image
            
            # Save processed image
            output_dir = self.settings.output_dir / job_id
            output_dir.mkdir(parents=True, exist_ok=True)
            
            output_filename = f"cleaned_{task.filename}"
            output_path = output_dir / output_filename
            
            # Preserve quality
            if options.preserve_quality:
                # Get original file extension
                ext = Path(task.filename).suffix.lower()
                if ext in ['.jpg', '.jpeg']:
                    cv2.imwrite(str(output_path), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
                elif ext == '.png':
                    cv2.imwrite(str(output_path), result, [cv2.IMWRITE_PNG_COMPRESSION, 3])
                else:
                    cv2.imwrite(str(output_path), result)
            else:
                cv2.imwrite(str(output_path), result)
            
            # Update task
            task.processed_path = str(output_path)
            task.status = ProcessingStatus.COMPLETED
            task.completed_at = datetime.utcnow()
            task.processing_time_ms = int((time.time() - start_time) * 1000)
            
            logger.info(
                f"Processed {task.filename}: {len(regions)} regions removed "
                f"in {task.processing_time_ms}ms"
            )
            
            return task
            
        except Exception as e:
            task.status = ProcessingStatus.FAILED
            task.error = str(e)
            logger.error(f"Failed to process {task.filename}: {e}")
            raise
    
    async def save_uploaded_files(
        self,
        job_id: str,
        files: List[tuple]  # List of (filename, file_content)
    ) -> List[str]:
        """Save uploaded files to disk."""
        upload_dir = self.settings.upload_dir / job_id
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        saved_files = []
        
        for filename, content in files:
            file_path = upload_dir / filename
            
            # Ensure unique filename
            if file_path.exists():
                base, ext = os.path.splitext(filename)
                filename = f"{base}_{uuid.uuid4().hex[:8]}{ext}"
                file_path = upload_dir / filename
            
            # Save file
            with open(file_path, 'wb') as f:
                f.write(content)
            
            saved_files.append(filename)
        
        logger.info(f"Saved {len(saved_files)} files for job {job_id}")
        return saved_files
    
    def get_processed_image_path(self, job_id: str, task_id: str) -> Optional[Path]:
        """Get path to processed image."""
        job = self.jobs.get(job_id)
        if not job:
            return None
        
        for task in job.tasks:
            if task.id == task_id and task.processed_path:
                return Path(task.processed_path)
        
        return None
    
    def cleanup_job(self, job_id: str):
        """Clean up job files and data."""
        # Remove upload directory
        upload_dir = self.settings.upload_dir / job_id
        if upload_dir.exists():
            import shutil
            shutil.rmtree(upload_dir)
        
        # Remove output directory
        output_dir = self.settings.output_dir / job_id
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)
        
        # Remove job from memory
        if job_id in self.jobs:
            del self.jobs[job_id]
        
        logger.info(f"Cleaned up job {job_id}")


# Singleton instance
_processor: Optional[ImageProcessor] = None


def get_processor() -> ImageProcessor:
    """Get singleton processor instance."""
    global _processor
    if _processor is None:
        _processor = ImageProcessor()
    return _processor