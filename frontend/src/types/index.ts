// API Types

export type ProcessingStatus = 
  | 'pending'
  | 'detecting'
  | 'removing'
  | 'completed'
  | 'failed';

export interface WatermarkRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  text?: string;
  type: 'text' | 'logo' | 'pattern';
}

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

export interface UploadResponse {
  job_id: string;
  total_images: number;
  message: string;
}

export interface ProcessingOptions {
  auto_detect: boolean;
  detection_confidence: number;
  ocr_enabled: boolean;
  logo_detection: boolean;
  inpainting_method: 'lama' | 'telea' | 'ns';
  preserve_quality: boolean;
  manual_regions: WatermarkRegion[];
}

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

export interface HealthResponse {
  status: string;
  version: string;
  gpu_available: boolean;
  models_loaded: boolean;
}

// Frontend Types

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: ProcessingStatus;
  taskId?: string;
}

export interface AppState {
  // Files
  files: UploadedFile[];
  selectedFileId: string | null;
  
  // Job
  currentJobId: string | null;
  jobStatus: JobStatusResponse | null;
  
  // Processing
  isUploading: boolean;
  isProcessing: boolean;
  
  // Options
  options: ProcessingOptions;
  
  // UI
  showSettings: boolean;
}