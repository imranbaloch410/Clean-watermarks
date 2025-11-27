import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import clsx from 'clsx';

const MAX_FILES = 200;
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/bmp': ['.bmp'],
  'image/tiff': ['.tiff', '.tif'],
};

export const DropZone: React.FC = () => {
  const { files, addFiles, isUploading, isProcessing } = useStore();
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remainingSlots = MAX_FILES - files.length;
    const filesToAdd = acceptedFiles.slice(0, remainingSlots);
    
    if (filesToAdd.length > 0) {
      addFiles(filesToAdd);
    }
    
    if (acceptedFiles.length > remainingSlots) {
      console.warn(`Only ${remainingSlots} files added. Maximum is ${MAX_FILES}.`);
    }
  }, [files.length, addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled: isUploading || isProcessing,
    maxFiles: MAX_FILES,
  });

  const isDisabled = isUploading || isProcessing;

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'drop-zone rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
        'min-h-[300px] flex flex-col items-center justify-center',
        isDragActive && 'dragover',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className={clsx(
          'w-16 h-16 mx-auto rounded-full flex items-center justify-center',
          'bg-gray-800 transition-colors duration-200',
          isDragActive && 'bg-indigo-600'
        )}>
          {isDragActive ? (
            <ImageIcon className="w-8 h-8 text-white" />
          ) : (
            <Upload className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-300">
            {isDragActive
              ? 'Drop images here'
              : 'Drag & drop images here'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            or click to browse
          </p>
        </div>
        
        <div className="text-xs text-gray-600 space-y-1">
          <p>Supports: JPG, PNG, WebP, BMP, TIFF</p>
          <p>Maximum: {MAX_FILES} images per batch</p>
          <p className="text-indigo-400 font-medium">
            {files.length} / {MAX_FILES} images loaded
          </p>
        </div>
      </div>
    </div>
  );
};

export default DropZone;