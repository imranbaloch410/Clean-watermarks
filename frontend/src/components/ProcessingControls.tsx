import React, { useState, useEffect, useCallback } from 'react';
import { Play, Download, Trash2, Settings, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import api from '../api/client';
import clsx from 'clsx';

export const ProcessingControls: React.FC = () => {
  const {
    files,
    currentJobId,
    jobStatus,
    isUploading,
    isProcessing,
    options,
    setCurrentJobId,
    setJobStatus,
    setUploading,
    setProcessing,
    clearFiles,
    toggleSettings,
  } = useStore();

  const [error, setError] = useState<string | null>(null);

  // Poll for job status
  useEffect(() => {
    if (!currentJobId || !isProcessing) return;

    const pollInterval = setInterval(async () => {
      try {
        const status = await api.getStatus(currentJobId);
        setJobStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          setProcessing(false);
        }
      } catch (err) {
        console.error('Failed to get job status:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [currentJobId, isProcessing, setJobStatus, setProcessing]);

  const handleCleanAll = useCallback(async () => {
    if (files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      // Upload files
      const uploadResponse = await api.upload(files.map(f => f.file));
      setCurrentJobId(uploadResponse.job_id);

      setUploading(false);
      setProcessing(true);

      // Start processing
      await api.process(uploadResponse.job_id, options);

    } catch (err) {
      console.error('Processing failed:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');
      setUploading(false);
      setProcessing(false);
    }
  }, [files, options, setCurrentJobId, setUploading, setProcessing]);

  const handleDownloadAll = useCallback(async () => {
    if (!currentJobId || !jobStatus?.download_ready) return;

    try {
      const blob = await api.downloadAll(currentJobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cleaned_images_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Download failed');
    }
  }, [currentJobId, jobStatus]);

  const handleClear = useCallback(() => {
    if (currentJobId) {
      api.deleteJob(currentJobId).catch(console.error);
    }
    clearFiles();
    setCurrentJobId(null);
    setJobStatus(null);
    setError(null);
  }, [currentJobId, clearFiles, setCurrentJobId, setJobStatus]);

  const progress = jobStatus?.progress ?? 0;
  const isComplete = jobStatus?.status === 'completed';
  const hasFailed = jobStatus?.status === 'failed';

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      {/* Progress bar */}
      {(isUploading || isProcessing) && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>
              {isUploading ? 'Uploading...' : `Processing ${jobStatus?.completed_images ?? 0}/${jobStatus?.total_images ?? files.length}`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${isUploading ? 0 : progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Status summary */}
      {isComplete && jobStatus && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg text-sm text-green-300">
          Completed! {jobStatus.completed_images} images processed successfully.
          {jobStatus.failed_images > 0 && ` (${jobStatus.failed_images} failed)`}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Clean All Button */}
        <button
          onClick={handleCleanAll}
          disabled={files.length === 0 || isUploading || isProcessing}
          className={clsx(
            'btn-primary flex items-center gap-2 flex-1 justify-center',
            'min-w-[140px]'
          )}
        >
          {isUploading || isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isUploading ? 'Uploading...' : 'Processing...'}
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Clean All ({files.length})
            </>
          )}
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownloadAll}
          disabled={!isComplete || !jobStatus?.download_ready}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download All
        </button>

        {/* Settings Button */}
        <button
          onClick={toggleSettings}
          className="btn-secondary p-2"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Clear Button */}
        <button
          onClick={handleClear}
          disabled={isUploading || isProcessing}
          className="btn-danger p-2"
          title="Clear all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ProcessingControls;