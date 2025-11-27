import axios from 'axios';
import { 
  UploadResponse, 
  JobStatusResponse, 
  ProcessingOptions,
  HealthResponse 
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes for large uploads
});

export const api = {
  /**
   * Health check
   */
  health: async (): Promise<HealthResponse> => {
    const response = await client.get<HealthResponse>('/health');
    return response.data;
  },

  /**
   * Upload images for processing
   */
  upload: async (files: File[]): Promise<UploadResponse> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await client.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = progressEvent.total
          ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
          : 0;
        console.log(`Upload progress: ${percentCompleted}%`);
      },
    });

    return response.data;
  },

  /**
   * Start processing a job
   */
  process: async (jobId: string, options?: ProcessingOptions): Promise<void> => {
    await client.post(`/process/${jobId}`, options);
  },

  /**
   * Get job status
   */
  getStatus: async (jobId: string): Promise<JobStatusResponse> => {
    const response = await client.get<JobStatusResponse>(`/status/${jobId}`);
    return response.data;
  },

  /**
   * Download a single processed image
   */
  downloadSingle: async (jobId: string, taskId: string): Promise<Blob> => {
    const response = await client.get(`/download/${jobId}/${taskId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Download all processed images as ZIP
   */
  downloadAll: async (jobId: string): Promise<Blob> => {
    const response = await client.get(`/download-all/${jobId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete a job
   */
  deleteJob: async (jobId: string): Promise<void> => {
    await client.delete(`/job/${jobId}`);
  },
};

export default api;