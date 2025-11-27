"""Watermark detection service using OCR and object detection."""
import logging
import time
from typing import List, Optional, Tuple
import numpy as np
import cv2
from PIL import Image
import easyocr

from ..models import WatermarkRegion
from ..config import get_settings

logger = logging.getLogger(__name__)


class WatermarkDetector:
    """Detects watermarks, text, and logos in images using AI."""
    
    def __init__(self):
        self.settings = get_settings()
        self._reader: Optional[easyocr.Reader] = None
        self._initialized = False
    
    def _initialize(self):
        """Lazy initialization of OCR reader."""
        if not self._initialized:
            logger.info("Initializing EasyOCR reader...")
            try:
                self._reader = easyocr.Reader(
                    self.settings.ocr_languages,
                    gpu=self._check_gpu()
                )
                self._initialized = True
                logger.info("EasyOCR reader initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize EasyOCR: {e}")
                raise
    
    def _check_gpu(self) -> bool:
        """Check if GPU is available for processing."""
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False
    
    def detect(
        self,
        image: np.ndarray,
        confidence_threshold: float = 0.7,
        detect_text: bool = True,
        detect_logos: bool = True
    ) -> Tuple[List[WatermarkRegion], int]:
        """
        Detect watermarks in an image.
        
        Args:
            image: Input image as numpy array (BGR format)
            confidence_threshold: Minimum confidence for detection
            detect_text: Enable OCR text detection
            detect_logos: Enable logo/pattern detection
            
        Returns:
            Tuple of (list of detected regions, processing time in ms)
        """
        start_time = time.time()
        regions = []
        
        height, width = image.shape[:2]
        
        # Convert BGR to RGB for processing
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # OCR-based text detection
        if detect_text:
            text_regions = self._detect_text(image_rgb, width, height, confidence_threshold)
            regions.extend(text_regions)
        
        # Logo/pattern detection using edge detection and contours
        if detect_logos:
            logo_regions = self._detect_logos(image, width, height, confidence_threshold)
            regions.extend(logo_regions)
        
        # Merge overlapping regions
        regions = self._merge_overlapping_regions(regions)
        
        processing_time = int((time.time() - start_time) * 1000)
        logger.info(f"Detection completed: {len(regions)} regions found in {processing_time}ms")
        
        return regions, processing_time
    
    def _detect_text(
        self,
        image_rgb: np.ndarray,
        width: int,
        height: int,
        confidence_threshold: float
    ) -> List[WatermarkRegion]:
        """Detect text using EasyOCR."""
        self._initialize()
        regions = []
        
        try:
            results = self._reader.readtext(image_rgb)
            
            for bbox, text, confidence in results:
                if confidence >= confidence_threshold:
                    # Convert bbox to normalized coordinates
                    x_coords = [p[0] for p in bbox]
                    y_coords = [p[1] for p in bbox]
                    
                    x_min = min(x_coords) / width
                    y_min = min(y_coords) / height
                    x_max = max(x_coords) / width
                    y_max = max(y_coords) / height
                    
                    # Add padding around detected text
                    padding = 0.01
                    x_min = max(0, x_min - padding)
                    y_min = max(0, y_min - padding)
                    x_max = min(1, x_max + padding)
                    y_max = min(1, y_max + padding)
                    
                    region = WatermarkRegion(
                        x=x_min,
                        y=y_min,
                        width=x_max - x_min,
                        height=y_max - y_min,
                        confidence=confidence,
                        text=text,
                        type="text"
                    )
                    regions.append(region)
                    logger.debug(f"Detected text: '{text}' with confidence {confidence:.2f}")
                    
        except Exception as e:
            logger.error(f"OCR detection failed: {e}")
        
        return regions
    
    def _detect_logos(
        self,
        image: np.ndarray,
        width: int,
        height: int,
        confidence_threshold: float
    ) -> List[WatermarkRegion]:
        """Detect potential logos using edge detection and contour analysis."""
        regions = []
        
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply Gaussian blur
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Edge detection
            edges = cv2.Canny(blurred, 50, 150)
            
            # Dilate to connect nearby edges
            kernel = np.ones((3, 3), np.uint8)
            dilated = cv2.dilate(edges, kernel, iterations=2)
            
            # Find contours
            contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Analyze contours for potential watermarks
            for contour in contours:
                area = cv2.contourArea(contour)
                image_area = width * height
                
                # Filter by area (watermarks are typically small relative to image)
                relative_area = area / image_area
                if 0.001 < relative_area < 0.15:  # Between 0.1% and 15% of image
                    x, y, w, h = cv2.boundingRect(contour)
                    
                    # Check aspect ratio (watermarks often have specific ratios)
                    aspect_ratio = w / h if h > 0 else 0
                    if 0.2 < aspect_ratio < 5:  # Reasonable aspect ratio
                        # Calculate confidence based on characteristics
                        confidence = self._calculate_logo_confidence(
                            contour, gray[y:y+h, x:x+w], relative_area
                        )
                        
                        if confidence >= confidence_threshold:
                            padding = 0.005
                            region = WatermarkRegion(
                                x=max(0, x / width - padding),
                                y=max(0, y / height - padding),
                                width=min(1, w / width + 2 * padding),
                                height=min(1, h / height + 2 * padding),
                                confidence=confidence,
                                type="logo"
                            )
                            regions.append(region)
                            
        except Exception as e:
            logger.error(f"Logo detection failed: {e}")
        
        return regions
    
    def _calculate_logo_confidence(
        self,
        contour: np.ndarray,
        roi: np.ndarray,
        relative_area: float
    ) -> float:
        """Calculate confidence score for a potential logo region."""
        confidence = 0.5  # Base confidence
        
        # Higher confidence for corner regions (common watermark locations)
        # This would need image dimensions to calculate properly
        
        # Analyze edge density
        if roi.size > 0:
            edges = cv2.Canny(roi, 50, 150)
            edge_density = np.count_nonzero(edges) / roi.size
            if edge_density > 0.1:  # High edge density suggests logo/text
                confidence += 0.2
        
        # Smaller relative areas are more likely to be watermarks
        if relative_area < 0.05:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _merge_overlapping_regions(
        self,
        regions: List[WatermarkRegion],
        overlap_threshold: float = 0.3
    ) -> List[WatermarkRegion]:
        """Merge overlapping detection regions."""
        if not regions:
            return regions
        
        merged = []
        used = set()
        
        for i, r1 in enumerate(regions):
            if i in used:
                continue
            
            current = r1
            for j, r2 in enumerate(regions[i+1:], start=i+1):
                if j in used:
                    continue
                
                if self._calculate_iou(current, r2) > overlap_threshold:
                    current = self._merge_regions(current, r2)
                    used.add(j)
            
            merged.append(current)
            used.add(i)
        
        return merged
    
    def _calculate_iou(self, r1: WatermarkRegion, r2: WatermarkRegion) -> float:
        """Calculate Intersection over Union for two regions."""
        x1 = max(r1.x, r2.x)
        y1 = max(r1.y, r2.y)
        x2 = min(r1.x + r1.width, r2.x + r2.width)
        y2 = min(r1.y + r1.height, r2.y + r2.height)
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        area1 = r1.width * r1.height
        area2 = r2.width * r2.height
        union = area1 + area2 - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def _merge_regions(
        self,
        r1: WatermarkRegion,
        r2: WatermarkRegion
    ) -> WatermarkRegion:
        """Merge two regions into one."""
        x_min = min(r1.x, r2.x)
        y_min = min(r1.y, r2.y)
        x_max = max(r1.x + r1.width, r2.x + r2.width)
        y_max = max(r1.y + r1.height, r2.y + r2.height)
        
        return WatermarkRegion(
            x=x_min,
            y=y_min,
            width=x_max - x_min,
            height=y_max - y_min,
            confidence=max(r1.confidence, r2.confidence),
            text=r1.text or r2.text,
            type=r1.type if r1.confidence > r2.confidence else r2.type
        )


# Singleton instance
_detector: Optional[WatermarkDetector] = None


def get_detector() -> WatermarkDetector:
    """Get singleton detector instance."""
    global _detector
    if _detector is None:
        _detector = WatermarkDetector()
    return _detector