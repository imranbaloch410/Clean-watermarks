import { create } from 'zustand';
import { 
  UploadedFile, 
  ProcessingOptions, 
  JobStatusResponse,
  ProcessingStatus 
} from '../types';

interface AppStore {
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
  
  // Actions - Files
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  selectFile: (id: string | null) => void;
  updateFileStatus: (id: string, status: ProcessingStatus, taskId?: string) => void;
  
  // Actions - Job
  setCurrentJobId: (jobId: string | null) => void;
  setJobStatus: (status: JobStatusResponse | null) => void;
  
  // Actions - Processing
  setUploading: (uploading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  
  // Actions - Options
  updateOptions: (options: Partial<ProcessingOptions>) => void;
  
  // Actions - UI
  toggleSettings: () => void;
  
  // Reset
  reset: () => void;
}

const defaultOptions: ProcessingOptions = {
  auto_detect: true,
  detection_confidence: 0.7,
  ocr_enabled: true,
  logo_detection: true,
  inpainting_method: 'lama',
  preserve_quality: true,
  manual_regions: [],
};

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useStore = create<AppStore>((set, get) => ({
  // Initial state
  files: [],
  selectedFileId: null,
  currentJobId: null,
  jobStatus: null,
  isUploading: false,
  isProcessing: false,
  options: defaultOptions,
  showSettings: false,
  
  // File actions
  addFiles: (newFiles: File[]) => {
    const uploadedFiles: UploadedFile[] = newFiles.map(file => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as ProcessingStatus,
    }));
    
    set(state => ({
      files: [...state.files, ...uploadedFiles].slice(0, 200), // Max 200 files
    }));
  },
  
  removeFile: (id: string) => {
    const file = get().files.find(f => f.id === id);
    if (file) {
      URL.revokeObjectURL(file.preview);
    }
    
    set(state => ({
      files: state.files.filter(f => f.id !== id),
      selectedFileId: state.selectedFileId === id ? null : state.selectedFileId,
    }));
  },
  
  clearFiles: () => {
    get().files.forEach(file => URL.revokeObjectURL(file.preview));
    set({
      files: [],
      selectedFileId: null,
      currentJobId: null,
      jobStatus: null,
    });
  },
  
  selectFile: (id: string | null) => {
    set({ selectedFileId: id });
  },
  
  updateFileStatus: (id: string, status: ProcessingStatus, taskId?: string) => {
    set(state => ({
      files: state.files.map(f => 
        f.id === id ? { ...f, status, taskId: taskId || f.taskId } : f
      ),
    }));
  },
  
  // Job actions
  setCurrentJobId: (jobId: string | null) => {
    set({ currentJobId: jobId });
  },
  
  setJobStatus: (status: JobStatusResponse | null) => {
    set({ jobStatus: status });
    
    // Update file statuses based on job status
    if (status) {
      const { files } = get();
      const updatedFiles = files.map(file => {
        const task = status.tasks.find(t => t.filename === file.file.name);
        if (task) {
          return { ...file, status: task.status, taskId: task.id };
        }
        return file;
      });
      set({ files: updatedFiles });
    }
  },
  
  // Processing actions
  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },
  
  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },
  
  // Options actions
  updateOptions: (newOptions: Partial<ProcessingOptions>) => {
    set(state => ({
      options: { ...state.options, ...newOptions },
    }));
  },
  
  // UI actions
  toggleSettings: () => {
    set(state => ({ showSettings: !state.showSettings }));
  },
  
  // Reset
  reset: () => {
    get().files.forEach(file => URL.revokeObjectURL(file.preview));
    set({
      files: [],
      selectedFileId: null,
      currentJobId: null,
      jobStatus: null,
      isUploading: false,
      isProcessing: false,
      options: defaultOptions,
      showSettings: false,
    });
  },
}));