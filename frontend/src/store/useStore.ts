import { create } from 'zustand';
import { 
  BatchItem, 
  FitMode, 
  OutputPreset,
  ProcessingStatus,
  ProcessingOptions,
  JobStatusResponse,
} from '../types';

// Legacy UploadedFile type for backward compatibility
interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  status: ProcessingStatus;
  taskId?: string;
}

interface AppStore {
  // Batch items
  batchItems: BatchItem[];
  selectedId: string | null;
  
  // Legacy aliases (computed from batchItems)
  files: UploadedFile[];
  selectedFileId: string | null;
  
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
  
  // Actions - Batch Items
  addFiles: (files: File[]) => void;
  removeBatchItem: (id: string) => void;
  clearBatchItems: () => void;
  setSelectedId: (id: string | null) => void;
  updateBatchItem: (id: string, updates: Partial<BatchItem>) => void;
  updateBatchItemPreview: (id: string, previewUrl: string) => void;
  
  // Legacy action aliases
  selectFile: (id: string | null) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  
  // Actions - Image Processing
  setSourceImageObj: (img: HTMLImageElement | null) => void;
  setActiveProcessedUrl: (url: string | null) => void;
  
  // Actions - Settings
  setFitMode: (mode: FitMode) => void;
  setOutputPreset: (preset: OutputPreset) => void;
  setEnhanceQuality: (enhance: boolean) => void;
  setBatchCleanLogos: (clean: boolean) => void;
  
  // Actions - UI State
  setIsZipping: (zipping: boolean) => void;
  setIsBatchCleaning: (cleaning: boolean) => void;
  setZipProgress: (progress: number) => void;
  setIsCleaningSingle: (cleaning: boolean) => void;
  setStatusMessage: (message: string) => void;
  toggleSettings: () => void;
  
  // Actions - API-based (legacy)
  setCurrentJobId: (jobId: string | null) => void;
  setJobStatus: (status: JobStatusResponse | null) => void;
  setUploading: (uploading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  updateOptions: (options: Partial<ProcessingOptions>) => void;
  
  // Reset
  reset: () => void;
}

const MAX_BATCH_SIZE = 200;

const generateId = () => crypto.randomUUID();

const defaultOptions: ProcessingOptions = {
  auto_detect: true,
  detection_confidence: 0.7,
  ocr_enabled: true,
  logo_detection: true,
  inpainting_method: 'lama',
  preserve_quality: true,
  manual_regions: [],
};

// Convert BatchItem to UploadedFile for backward compatibility
const batchItemToUploadedFile = (item: BatchItem): UploadedFile => ({
  id: item.id,
  file: item.file,
  preview: item.previewUrl,
  status: item.status,
});

export const useStore = create<AppStore>((set, get) => ({
  // Initial state - Batch Items
  batchItems: [],
  selectedId: null,
  
  // Legacy computed properties (will be updated when batchItems changes)
  get files() {
    return get().batchItems.map(batchItemToUploadedFile);
  },
  get selectedFileId() {
    return get().selectedId;
  },
  
  // Initial state - Image Processing
  sourceImageObj: null,
  activeProcessedUrl: null,
  
  // Initial state - Settings
  fitMode: FitMode.CONTAIN_BLUR,
  outputPreset: OutputPreset.ULTRA_8K,
  enhanceQuality: false,
  batchCleanLogos: false,
  
  // Initial state - UI
  isZipping: false,
  isBatchCleaning: false,
  zipProgress: 0,
  isCleaningSingle: false,
  statusMessage: '',
  showSettings: false,
  
  // Initial state - API-based (legacy)
  currentJobId: null,
  jobStatus: null,
  isUploading: false,
  isProcessing: false,
  options: defaultOptions,
  
  // Actions - Batch Items
  addFiles: (files: File[]) => {
    const currentItems = get().batchItems;
    const remainingSlots = MAX_BATCH_SIZE - currentItems.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    const newItems: BatchItem[] = filesToAdd.map((file: File) => ({
      id: generateId(),
      file,
      previewUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: 'pending' as ProcessingStatus,
    }));
    
    set((state: AppStore) => {
      const updatedItems = [...state.batchItems, ...newItems];
      const newSelectedId = state.selectedId || (newItems.length > 0 ? newItems[0].id : null);
      return {
        batchItems: updatedItems,
        selectedId: newSelectedId,
      };
    });
  },
  
  removeBatchItem: (id: string) => {
    const item = get().batchItems.find((i: BatchItem) => i.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) {
        URL.revokeObjectURL(item.processedUrl);
      }
    }
    
    set((state: AppStore) => {
      const newItems = state.batchItems.filter((i: BatchItem) => i.id !== id);
      let newSelectedId = state.selectedId;
      
      if (id === state.selectedId) {
        newSelectedId = newItems.length > 0 ? newItems[0].id : null;
      }
      
      return {
        batchItems: newItems,
        selectedId: newSelectedId,
      };
    });
  },
  
  clearBatchItems: () => {
    get().batchItems.forEach((item: BatchItem) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) {
        URL.revokeObjectURL(item.processedUrl);
      }
    });
    
    set({
      batchItems: [],
      selectedId: null,
      sourceImageObj: null,
      activeProcessedUrl: null,
    });
  },
  
  setSelectedId: (id: string | null) => {
    set({ selectedId: id });
  },
  
  updateBatchItem: (id: string, updates: Partial<BatchItem>) => {
    set((state: AppStore) => ({
      batchItems: state.batchItems.map((item: BatchItem) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
  },
  
  updateBatchItemPreview: (id: string, previewUrl: string) => {
    set((state: AppStore) => ({
      batchItems: state.batchItems.map((item: BatchItem) =>
        item.id === id ? { ...item, previewUrl } : item
      ),
    }));
  },
  
  // Legacy action aliases
  selectFile: (id: string | null) => {
    set({ selectedId: id });
  },
  
  removeFile: (id: string) => {
    const item = get().batchItems.find((i: BatchItem) => i.id === id);
    if (item) {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) {
        URL.revokeObjectURL(item.processedUrl);
      }
    }
    
    set((state: AppStore) => {
      const newItems = state.batchItems.filter((i: BatchItem) => i.id !== id);
      let newSelectedId = state.selectedId;
      
      if (id === state.selectedId) {
        newSelectedId = newItems.length > 0 ? newItems[0].id : null;
      }
      
      return {
        batchItems: newItems,
        selectedId: newSelectedId,
      };
    });
  },
  
  clearFiles: () => {
    get().batchItems.forEach((item: BatchItem) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) {
        URL.revokeObjectURL(item.processedUrl);
      }
    });
    
    set({
      batchItems: [],
      selectedId: null,
      sourceImageObj: null,
      activeProcessedUrl: null,
    });
  },
  
  // Actions - Image Processing
  setSourceImageObj: (img: HTMLImageElement | null) => {
    set({ sourceImageObj: img });
  },
  
  setActiveProcessedUrl: (url: string | null) => {
    set({ activeProcessedUrl: url });
  },
  
  // Actions - Settings
  setFitMode: (mode: FitMode) => {
    set({ fitMode: mode });
  },
  
  setOutputPreset: (preset: OutputPreset) => {
    set({ outputPreset: preset });
  },
  
  setEnhanceQuality: (enhance: boolean) => {
    set({ enhanceQuality: enhance });
  },
  
  setBatchCleanLogos: (clean: boolean) => {
    set({ batchCleanLogos: clean });
  },
  
  // Actions - UI State
  setIsZipping: (zipping: boolean) => {
    set({ isZipping: zipping });
  },
  
  setIsBatchCleaning: (cleaning: boolean) => {
    set({ isBatchCleaning: cleaning });
  },
  
  setZipProgress: (progress: number) => {
    set({ zipProgress: progress });
  },
  
  setIsCleaningSingle: (cleaning: boolean) => {
    set({ isCleaningSingle: cleaning });
  },
  
  setStatusMessage: (message: string) => {
    set({ statusMessage: message });
  },
  
  toggleSettings: () => {
    set((state: AppStore) => ({ showSettings: !state.showSettings }));
  },
  
  // Actions - API-based (legacy)
  setCurrentJobId: (jobId: string | null) => {
    set({ currentJobId: jobId });
  },
  
  setJobStatus: (status: JobStatusResponse | null) => {
    set({ jobStatus: status });
  },
  
  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },
  
  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },
  
  updateOptions: (newOptions: Partial<ProcessingOptions>) => {
    set((state: AppStore) => ({
      options: { ...state.options, ...newOptions },
    }));
  },
  
  // Reset
  reset: () => {
    get().batchItems.forEach((item: BatchItem) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.processedUrl) {
        URL.revokeObjectURL(item.processedUrl);
      }
    });
    
    set({
      batchItems: [],
      selectedId: null,
      sourceImageObj: null,
      activeProcessedUrl: null,
      fitMode: FitMode.CONTAIN_BLUR,
      outputPreset: OutputPreset.ULTRA_8K,
      enhanceQuality: false,
      batchCleanLogos: false,
      isZipping: false,
      isBatchCleaning: false,
      zipProgress: 0,
      isCleaningSingle: false,
      statusMessage: '',
      showSettings: false,
      currentJobId: null,
      jobStatus: null,
      isUploading: false,
      isProcessing: false,
      options: defaultOptions,
    });
  },
}));