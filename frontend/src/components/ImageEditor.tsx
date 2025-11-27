import React, { useEffect, useRef, useState } from 'react';
import { FitMode, OutputPreset, OUTPUT_DIMENSIONS } from '../types';
import { processImage } from '../services/imageProcessor';

interface ImageEditorProps {
  sourceImage: HTMLImageElement | null;
  fitMode: FitMode;
  outputPreset: OutputPreset;
  enhance: boolean;
  onProcessed: (url: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  sourceImage,
  fitMode,
  outputPreset,
  enhance,
  onProcessed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!sourceImage) {
      setDisplayUrl(null);
      return;
    }

    // Process the image with current settings
    try {
      const processedUrl = processImage(sourceImage, fitMode, outputPreset, enhance);
      setDisplayUrl(processedUrl);
      onProcessed(processedUrl);
    } catch (error) {
      console.error('Error processing image:', error);
    }
  }, [sourceImage, fitMode, outputPreset, enhance, onProcessed]);

  // Get display dimensions based on preset
  const { width: targetWidth, height: targetHeight } = OUTPUT_DIMENSIONS[outputPreset];
  const aspectRatio = targetWidth / targetHeight;

  if (!sourceImage) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Select an image to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 shadow-2xl"
      style={{ aspectRatio: `${aspectRatio}` }}
    >
      {displayUrl ? (
        <img 
          src={displayUrl} 
          alt="Processed preview" 
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-gray-700 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Processing...</p>
          </div>
        </div>
      )}
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Overlay with image info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-3">
            <span className="bg-gray-800 px-2 py-1 rounded">
              {sourceImage.width} × {sourceImage.height}
            </span>
            <span className="text-gray-500">→</span>
            <span className="bg-indigo-900/50 px-2 py-1 rounded text-indigo-300">
              {targetWidth} × {targetHeight}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {enhance && (
              <span className="bg-amber-900/50 px-2 py-1 rounded text-amber-300">
                NatGeo Enhanced
              </span>
            )}
            <span className="bg-gray-800 px-2 py-1 rounded capitalize">
              {fitMode.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageEditor;