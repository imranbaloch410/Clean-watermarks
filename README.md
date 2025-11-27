# Clean Watermarks - AI-Powered Bulk Watermark Removal

A high-performance web application for bulk AI-based watermark removal. Upload up to 200 images at once and remove watermarks with a single click using advanced AI technology.

## Features

- **Bulk Processing**: Upload and process up to 200 images in a single batch
- **One-Click Execution**: "Clean All" button processes the entire batch automatically
- **AI-Powered Detection**: Advanced OCR and object detection for automatic watermark identification
- **High-Quality Removal**: LaMa (Large Mask Inpainting) for seamless watermark removal
- **GPU Acceleration**: CUDA support for fast processing
- **Bulk Download**: Download all processed images as a ZIP file
- **Infinite Editing**: Unlimited revisions and re-processing cycles

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- Zustand for state management
- React Dropzone for file uploads

### Backend
- Python 3.11 with FastAPI
- EasyOCR for text detection
- OpenCV for image processing
- LaMa / Simple-Lama-Inpainting for AI inpainting
- PyTorch with CUDA support

### Infrastructure
- Docker with GPU support
- Redis for task queue
- Nginx for frontend serving and API proxy

## Quick Start

### Prerequisites

- Docker and Docker Compose
- NVIDIA GPU with CUDA support (recommended)
- NVIDIA Container Toolkit (for GPU support)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/imranbaloch410/Clean-watermarks.git
cd Clean-watermarks
```

2. Start the application:
```bash
docker-compose up -d
```

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Development Setup

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/upload` | POST | Upload images for processing |
| `/process/{job_id}` | POST | Start processing a batch job |
| `/status/{job_id}` | GET | Get job status and progress |
| `/download/{job_id}/{task_id}` | GET | Download single processed image |
| `/download-all/{job_id}` | GET | Download all processed images as ZIP |
| `/job/{job_id}` | DELETE | Delete a job and cleanup files |

## Processing Options

| Option | Default | Description |
|--------|---------|-------------|
| `auto_detect` | `true` | Automatically detect watermarks using AI |
| `detection_confidence` | `0.7` | Minimum confidence threshold (0.5-0.95) |
| `ocr_enabled` | `true` | Enable OCR text detection |
| `logo_detection` | `true` | Enable logo/pattern detection |
| `inpainting_method` | `lama` | Inpainting method: `lama`, `telea`, `ns` |
| `preserve_quality` | `true` | Preserve original image quality |

## Architecture

```
Clean-watermarks/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI application
│   │   ├── config.py        # Configuration settings
│   │   ├── models.py        # Pydantic models
│   │   └── services/
│   │       ├── detector.py  # Watermark detection (OCR + CV)
│   │       ├── inpainter.py # Watermark removal (LaMa)
│   │       └── processor.py # Batch processing pipeline
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── store/           # Zustand store
│   │   ├── api/             # API client
│   │   ├── types/           # TypeScript types
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## How It Works

1. **Upload**: Users drag and drop or select up to 200 images
2. **Detection**: AI analyzes each image to find watermarks:
   - OCR (EasyOCR) detects text watermarks
   - Edge detection and contour analysis finds logos
3. **Removal**: LaMa inpainting model fills the detected regions:
   - Creates a binary mask from detected regions
   - Uses generative AI to reconstruct the background
   - Multi-pass refinement for high-quality results
4. **Download**: Processed images are available for individual or bulk download

## Performance

- **Processing Speed**: ~2-5 seconds per image with GPU
- **Batch Size**: Up to 200 images per batch
- **Concurrent Processing**: 4 workers by default (configurable)
- **Memory Usage**: ~2-4GB GPU memory for LaMa model

## Configuration

Environment variables can be set in `.env` file or docker-compose.yml:

```env
# Backend
DEBUG=false
MAX_WORKERS=4
MAX_BATCH_SIZE=200
REDIS_URL=redis://localhost:6379/0

# Frontend
VITE_API_URL=http://localhost:8000
```

## Limitations

- Large images may require more processing time
- Complex watermarks with multiple colors may need manual adjustment
- GPU is recommended for optimal performance

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please use the GitHub issue tracker.