import React from 'react';
import { CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ProcessingStatus } from '../types';
import clsx from 'clsx';

const StatusIcon: React.FC<{ status: ProcessingStatus }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'detecting':
    case 'removing':
      return <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />;
    default:
      return null;
  }
};

export const ImageGrid: React.FC = () => {
  const { files, selectedFileId, selectFile, removeFile, isProcessing } = useStore();

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-400">
          Images ({files.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={clsx(
              'image-thumbnail aspect-square group',
              file.id === selectedFileId && 'selected',
              file.status === 'completed' && 'completed',
              file.status === 'failed' && 'failed',
              (file.status === 'detecting' || file.status === 'removing') && 'processing'
            )}
            onClick={() => selectFile(file.id)}
          >
            <img
              src={file.preview}
              alt={file.file.name}
              className="w-full h-full object-cover"
            />
            
            {/* Status overlay */}
            <div className={clsx(
              'absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity',
              file.status === 'pending' ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
            )}>
              <StatusIcon status={file.status} />
            </div>
            
            {/* Remove button */}
            {!isProcessing && file.status === 'pending' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.id);
                }}
                className="absolute top-1 right-1 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3 text-white" />
              </button>
            )}
            
            {/* Filename tooltip */}
            <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-[10px] text-white truncate">
                {file.file.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGrid;