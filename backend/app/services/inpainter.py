"""Watermark inpainting service using LaMa and other methods."""
import logging
import time
from typing import List, Optional, Tuple
import numpy as np
import cv2
from PIL import Image

from ..models import WatermarkRegion
from ..config import get_settings

logger = logging.getLogger(__name__)


class WatermarkInpainter:
    """Removes watermarks using AI-powered inpainting."""
    
    def __init__(self):
        self.settings = get_settings()
        self._lama_model = None
        self._initialized = False
        self._use_lama = True
    
    def _initialize(self):
        """Lazy initialization of inpainting models."""
        if self._initialized:
            return
        
        logger.info("Initializing inpainting models...")
        
        # Try to load LaMa model
        try:
            from simple_lama_inpainting import SimpleLama
            self._lama_model = SimpleLama()
            self._use_lama = True
            logger.info("LaMa inpainting model loaded successfully")
        except Exception as e:
            logger.warning(f"LaMa model not available, using fallback: {e}")
            self._use_lama = False
        
        self._initialized = True
    
    def inpaint(
        self,
        image: np.ndarray,
        regions: List[WatermarkRegion],
        method: str = "lama"
    ) -> Tuple[np.ndarray, int]:
        """
        Remove watermarks from image using inpainting.
        
        Args:
            image: Input image as numpy array (BGR format)
            regions: List of regions to inpaint
            method: Inpainting method ('lama', 'telea', 'ns')
            
        Returns:
            Tuple of (inpainted image, processing time in ms)
        """
        if not regions:
            return image, 0
        
        start_time = time.time()
        height, width = image.shape[:2]
        
        # Create mask from regions
        mask = self._create_mask(regions, width, height)
        
        # Choose inpainting method
        if method == "lama" and self._use_lama:
            result = self._inpaint_lama(image, mask)
        elif method == "telea":
            result = self._inpaint_opencv(image, mask, cv2.INPAINT_TELEA)
        elif method == "ns":
            result = self._inpaint_opencv(image, mask, cv2.INPAINT_NS)
        else:
            # Default to advanced multi-pass inpainting
            result = self._inpaint_advanced(image, mask)
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Inpainting completed in {processing_time}ms using {method}")
        
        return result, processing_time
    
    def _create_mask(
        self,
        regions: List[WatermarkRegion],
        width: int,
        height: int
    ) -> np.ndarray:
        """Create binary mask from watermark regions."""
        mask = np.zeros((height, width), dtype=np.uint8)
        
        for region in regions:
            x1 = int(region.x * width)
            y1 = int(region.y * height)
            x2 = int((region.x + region.width) * width)
            y2 = int((region.y + region.height) * height)
            
            # Ensure coordinates are within bounds
            x1 = max(0, min(x1, width - 1))
            y1 = max(0, min(y1, height - 1))
            x2 = max(0, min(x2, width))
            y2 = max(0, min(y2, height))
            
            # Fill the region in the mask
            mask[y1:y2, x1:x2] = 255
        
        # Dilate mask slightly to ensure complete coverage
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.dilate(mask, kernel, iterations=2)
        
        return mask
    
    def _inpaint_lama(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Inpaint using LaMa model."""
        self._initialize()
        
        if not self._use_lama or self._lama_model is None:
            logger.warning("LaMa not available, falling back to advanced method")
            return self._inpaint_advanced(image, mask)
        
        try:
            # Convert BGR to RGB for LaMa
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)
            pil_mask = Image.fromarray(mask)
            
            # Run LaMa inpainting
            result = self._lama_model(pil_image, pil_mask)
            
            # Convert back to BGR
            result_np = np.array(result)
            result_bgr = cv2.cvtColor(result_np, cv2.COLOR_RGB2BGR)
            
            return result_bgr
            
        except Exception as e:
            logger.error(f"LaMa inpainting failed: {e}")
            return self._inpaint_advanced(image, mask)
    
    def _inpaint_opencv(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        method: int
    ) -> np.ndarray:
        """Inpaint using OpenCV methods."""
        return cv2.inpaint(image, mask, inpaintRadius=5, flags=method)
    
    def _inpaint_advanced(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Advanced multi-pass inpainting for high-quality results.
        Combines multiple techniques for better watermark removal.
        """
        result = image.copy()
        height, width = image.shape[:2]
        
        # Find connected components in mask
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
            mask, connectivity=8
        )
        
        # Process each region separately for better results
        for i in range(1, num_labels):  # Skip background (label 0)
            region_mask = (labels == i).astype(np.uint8) * 255
            
            # Get bounding box of this region
            x, y, w, h, area = stats[i]
            
            # Expand region for context
            padding = max(20, int(max(w, h) * 0.3))
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(width, x + w + padding)
            y2 = min(height, y + h + padding)
            
            # Extract region
            roi = result[y1:y2, x1:x2].copy()
            roi_mask = region_mask[y1:y2, x1:x2]
            
            # Multi-pass inpainting on the region
            inpainted_roi = self._multi_pass_inpaint(roi, roi_mask)
            
            # Blend result back
            result[y1:y2, x1:x2] = inpainted_roi
        
        return result
    
    def _multi_pass_inpaint(
        self,
        image: np.ndarray,
        mask: np.ndarray
    ) -> np.ndarray:
        """Multi-pass inpainting for a single region."""
        result = image.copy()
        
        # Pass 1: Telea method for initial fill
        result = cv2.inpaint(result, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)
        
        # Pass 2: NS method for refinement
        # Erode mask slightly for second pass
        kernel = np.ones((3, 3), np.uint8)
        eroded_mask = cv2.erode(mask, kernel, iterations=1)
        if np.any(eroded_mask):
            result = cv2.inpaint(result, eroded_mask, inpaintRadius=2, flags=cv2.INPAINT_NS)
        
        # Pass 3: Gaussian blur on the inpainted region for smoothing
        blurred = cv2.GaussianBlur(result, (5, 5), 0)
        
        # Blend original edges with blurred center
        # Create gradient mask for smooth transition
        dist_transform = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
        if dist_transform.max() > 0:
            blend_mask = dist_transform / dist_transform.max()
            blend_mask = np.clip(blend_mask, 0, 1)
            blend_mask = np.stack([blend_mask] * 3, axis=-1)
            
            result = (blurred * blend_mask + result * (1 - blend_mask)).astype(np.uint8)
        
        return result
    
    def _texture_synthesis(
        self,
        image: np.ndarray,
        mask: np.ndarray,
        patch_size: int = 9
    ) -> np.ndarray:
        """
        Simple texture synthesis for filling regions.
        Uses patch matching from surrounding areas.
        """
        result = image.copy()
        height, width = image.shape[:2]
        
        # Find pixels to fill
        fill_pixels = np.where(mask > 0)
        
        if len(fill_pixels[0]) == 0:
            return result
        
        # Get boundary pixels for sampling
        dilated = cv2.dilate(mask, np.ones((3, 3), np.uint8))
        boundary = dilated - mask
        boundary_pixels = np.where(boundary > 0)
        
        if len(boundary_pixels[0]) == 0:
            return result
        
        # Simple nearest neighbor fill
        for y, x in zip(fill_pixels[0], fill_pixels[1]):
            # Find nearest boundary pixel
            distances = np.sqrt(
                (boundary_pixels[0] - y) ** 2 + 
                (boundary_pixels[1] - x) ** 2
            )
            nearest_idx = np.argmin(distances)
            src_y = boundary_pixels[0][nearest_idx]
            src_x = boundary_pixels[1][nearest_idx]
            
            # Copy pixel value
            result[y, x] = image[src_y, src_x]
        
        # Smooth the result
        result = cv2.bilateralFilter(result, 9, 75, 75)
        
        return result


# Singleton instance
_inpainter: Optional[WatermarkInpainter] = None


def get_inpainter() -> WatermarkInpainter:
    """Get singleton inpainter instance."""
    global _inpainter
    if _inpainter is None:
        _inpainter = WatermarkInpainter()
    return _inpainter