// Fit modes for image processing
export enum FitMode {
  CONTAIN_BLUR = 'contain_blur',
  CONTAIN_BLACK = 'contain_black',
  COVER = 'cover',
}

// Output presets
export enum OutputPreset {
  ULTRA_8K = 'ultra_8k',
  YT_THUMBNAIL = 'yt_thumbnail',
}

// Output dimensions
export const OUTPUT_DIMENSIONS = {
  [OutputPreset.ULTRA_8K]: { width: 7680, height: 4320 },
  [OutputPreset.YT_THUMBNAIL]: { width: 1280, height: 720 },
} as const;

// Processing status
export type ProcessingStatus = 
  | 'pending'
  | 'detecting'
  | 'removing'
  | 'completed'
  | 'failed';

// Batch item for queue
export interface BatchItem {
  id: string;
  file: File;
  previewUrl: string;
  processedUrl: string | null;
  status: ProcessingStatus;
}

// Watermark region for manual selection
export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  text?: string;
  type: 'text' | 'logo' | 'pattern';
}

// Image task from API
export interface ImageTask {
  id: string;
  filename: string;
  original_path?: string;
  processed_path?: string;
  status: ProcessingStatus;
  regions: WatermarkRegion[];
  error?: string;
  created_at: string;
  completed_at?: string;
  processing_time_ms?: number;
}

// Batch job from API
export interface BatchJob {
  id: string;
  tasks: ImageTask[];
  total_images: number;
  completed_images: number;
  failed_images: number;
  status: ProcessingStatus;
  created_at: string;
  completed_at?: string;
}

// Upload response from API
export interface UploadResponse {
  job_id: string;
  total_images: number;
  message: string;
}

// Processing options
export interface ProcessingOptions {
  auto_detect: boolean;
  detection_confidence: number;
  ocr_enabled: boolean;
  logo_detection: boolean;
  inpainting_method: 'lama' | 'telea' | 'ns';
  preserve_quality: boolean;
  manual_regions: WatermarkRegion[];
}

// Job status response from API
export interface JobStatusResponse {
  job_id: string;
  status: ProcessingStatus;
  progress: number;
  total_images: number;
  completed_images: number;
  failed_images: number;
  tasks: ImageTask[];
  download_ready: boolean;
}

// Health response from API
export interface HealthResponse {
  status: string;
  version: string;
  gpu_available: boolean;
  models_loaded: boolean;
}

// App state interface
export interface AppState {
  // Batch items
  batchItems: BatchItem[];
  selectedId: string | null;
  
  // Image processing
  sourceImageObj: HTMLImageElement | null;
  activeProcessedUrl: string | null;
  
  // Settings
  fitMode: FitMode;
  outputPreset: OutputPreset;
  enhanceQuality: boolean;
  batchCleanLogos: boolean;
  
  // UI State
  isZipping: boolean;
  isBatchCleaning: boolean;
  zipProgress: number;
  isCleaningSingle: boolean;
  statusMessage: string;
  showSettings: boolean;
  
  // API-based processing (legacy)
  currentJobId: string | null;
  jobStatus: JobStatusResponse | null;
  isUploading: boolean;
  isProcessing: boolean;
  options: ProcessingOptions;
}