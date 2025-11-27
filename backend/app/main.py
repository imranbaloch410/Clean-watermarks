"""FastAPI application for Clean Watermarks."""
import io
import logging
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from .config import get_settings
from .models import (
    BatchJob,
    HealthResponse,
    JobStatusResponse,
    ProcessingOptions,
    ProcessingStatus,
    UploadResponse,
)
from .services.processor import get_processor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize app
settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered bulk watermark removal API"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    settings.setup_directories()
    
    # Pre-initialize processor
    processor = get_processor()
    logger.info("Processor initialized")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    gpu_available = False
    try:
        import torch
        gpu_available = torch.cuda.is_available()
    except ImportError:
        pass
    
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        gpu_available=gpu_available,
        models_loaded=True
    )


@app.post("/upload", response_model=UploadResponse)
async def upload_images(
    files: List[UploadFile] = File(..., description="Images to process (max 200)")
):
    """
    Upload images for batch watermark removal.
    
    Accepts up to 200 images in a single batch upload.
    Supported formats: JPG, JPEG, PNG, WebP, BMP, TIFF
    """
    # Validate file count
    if len(files) > settings.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_batch_size} images per batch"
        )
    
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Validate and collect files
    valid_files = []
    
    for file in files:
        # Check extension
        ext = Path(file.filename).suffix.lower().lstrip('.')
        if ext not in settings.allowed_extensions:
            logger.warning(f"Skipping invalid file type: {file.filename}")
            continue
        
        # Check size
        content = await file.read()
        if len(content) > settings.max_upload_size:
            logger.warning(f"Skipping oversized file: {file.filename}")
            continue
        
        valid_files.append((file.filename, content))
    
    if not valid_files:
        raise HTTPException(
            status_code=400,
            detail="No valid image files provided"
        )
    
    # Create job and save files
    processor = get_processor()
    job = processor.create_job([f[0] for f in valid_files])
    
    # Save files asynchronously
    await processor.save_uploaded_files(job.id, valid_files)
    
    logger.info(f"Uploaded {len(valid_files)} files for job {job.id}")
    
    return UploadResponse(
        job_id=job.id,
        total_images=len(valid_files),
        message=f"Successfully uploaded {len(valid_files)} images"
    )


@app.post("/process/{job_id}")
async def process_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    options: Optional[ProcessingOptions] = None
):
    """
    Start processing a batch job.
    
    This endpoint starts the watermark detection and removal process
    for all images in the specified job.
    """
    processor = get_processor()
    job = processor.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != ProcessingStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Job already {job.status.value}"
        )
    
    # Use default options if not provided
    if options is None:
        options = ProcessingOptions()
    
    # Start processing in background
    background_tasks.add_task(processor.process_job, job_id, options)
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Processing started"
    }


@app.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get the status of a processing job."""
    processor = get_processor()
    job = processor.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    download_ready = (
        job.status == ProcessingStatus.COMPLETED and
        job.completed_images > 0
    )
    
    return JobStatusResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        total_images=job.total_images,
        completed_images=job.completed_images,
        failed_images=job.failed_images,
        tasks=job.tasks,
        download_ready=download_ready
    )


@app.get("/download/{job_id}/{task_id}")
async def download_single_image(job_id: str, task_id: str):
    """Download a single processed image."""
    processor = get_processor()
    image_path = processor.get_processed_image_path(job_id, task_id)
    
    if not image_path or not image_path.exists():
        raise HTTPException(status_code=404, detail="Processed image not found")
    
    return FileResponse(
        path=str(image_path),
        filename=image_path.name,
        media_type="image/jpeg"
    )


@app.get("/download-all/{job_id}")
async def download_all_images(job_id: str):
    """
    Download all processed images as a ZIP file.
    
    Returns a ZIP archive containing all successfully processed images
    from the specified job.
    """
    processor = get_processor()
    job = processor.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != ProcessingStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Job not yet completed"
        )
    
    # Create ZIP file in memory
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for task in job.tasks:
            if task.status == ProcessingStatus.COMPLETED and task.processed_path:
                file_path = Path(task.processed_path)
                if file_path.exists():
                    zip_file.write(file_path, file_path.name)
    
    zip_buffer.seek(0)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"cleaned_images_{timestamp}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@app.delete("/job/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and all associated files."""
    processor = get_processor()
    job = processor.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    processor.cleanup_job(job_id)
    
    return {"message": f"Job {job_id} deleted successfully"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "AI-powered bulk watermark removal API",
        "endpoints": {
            "health": "/health",
            "upload": "/upload",
            "process": "/process/{job_id}",
            "status": "/status/{job_id}",
            "download_single": "/download/{job_id}/{task_id}",
            "download_all": "/download-all/{job_id}",
            "delete_job": "/job/{job_id}"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )