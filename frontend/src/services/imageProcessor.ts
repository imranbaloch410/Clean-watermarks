import { FitMode, OutputPreset, OUTPUT_DIMENSIONS } from '../types';

/**
 * Load an image from a URL or base64 string
 */
export const loadImage = (source: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = source;
  });
};

/**
 * Create a blurred background from an image
 */
const createBlurredBackground = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): void => {
  // Calculate scale to cover the entire canvas
  const scale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  const x = (canvasWidth - scaledWidth) / 2;
  const y = (canvasHeight - scaledHeight) / 2;

  // Draw scaled image
  ctx.filter = 'blur(50px) brightness(0.7)';
  ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  ctx.filter = 'none';
};

/**
 * Apply NatGeo-style enhancement
 */
const applyEnhancement = (ctx: CanvasRenderingContext2D): void => {
  ctx.filter = 'contrast(1.1) saturate(1.15)';
};

/**
 * Process an image with the specified fit mode and output preset
 */
export const processImage = (
  img: HTMLImageElement,
  fitMode: FitMode,
  outputPreset: OutputPreset,
  enhance: boolean = false
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  const { width: targetWidth, height: targetHeight } = OUTPUT_DIMENSIONS[outputPreset];
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Apply enhancement filter if enabled
  if (enhance) {
    applyEnhancement(ctx);
  }

  switch (fitMode) {
    case FitMode.CONTAIN_BLUR: {
      // Draw blurred background first
      createBlurredBackground(ctx, img, targetWidth, targetHeight);
      
      // Reset filter for main image
      if (enhance) {
        applyEnhancement(ctx);
      } else {
        ctx.filter = 'none';
      }
      
      // Calculate contain dimensions
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      // Draw main image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      break;
    }
    
    case FitMode.CONTAIN_BLACK: {
      // Fill with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Calculate contain dimensions
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      // Draw main image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      break;
    }
    
    case FitMode.COVER: {
      // Calculate cover dimensions (crop to fit)
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      // Draw cropped image
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      break;
    }
  }

  // Reset filter
  ctx.filter = 'none';

  return canvas.toDataURL('image/jpeg', 0.92);
};

/**
 * Process an image and return as Blob
 */
export const processImageToBlob = (
  img: HTMLImageElement,
  fitMode: FitMode,
  outputPreset: OutputPreset,
  enhance: boolean = false
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const { width: targetWidth, height: targetHeight } = OUTPUT_DIMENSIONS[outputPreset];
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Apply enhancement filter if enabled
    if (enhance) {
      applyEnhancement(ctx);
    }

    switch (fitMode) {
      case FitMode.CONTAIN_BLUR: {
        // Draw blurred background first
        createBlurredBackground(ctx, img, targetWidth, targetHeight);
        
        // Reset filter for main image
        if (enhance) {
          applyEnhancement(ctx);
        } else {
          ctx.filter = 'none';
        }
        
        // Calculate contain dimensions
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        // Draw main image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        break;
      }
      
      case FitMode.CONTAIN_BLACK: {
        // Fill with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        
        // Calculate contain dimensions
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        // Draw main image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        break;
      }
      
      case FitMode.COVER: {
        // Calculate cover dimensions (crop to fit)
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        // Draw cropped image
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
        break;
      }
    }

    // Reset filter
    ctx.filter = 'none';

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (img: HTMLImageElement): { width: number; height: number } => {
  return { width: img.width, height: img.height };
};

/**
 * Convert image to base64
 */
export const imageToBase64 = (img: HTMLImageElement, quality: number = 0.8): string => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }
  
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * Get file suffix based on preset and enhancement
 */
export const getFileSuffix = (preset: OutputPreset, enhanced: boolean): string => {
  let suffix = '';
  if (enhanced) suffix += '-natgeo';
  if (preset === OutputPreset.ULTRA_8K) suffix += '-8k.jpg';
  else suffix += '-thumbnail.jpg';
  return suffix;
};