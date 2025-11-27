import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';

export const SettingsPanel: React.FC = () => {
  const { options, updateOptions, showSettings, toggleSettings } = useStore();

  if (!showSettings) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Processing Settings</h2>
          <button
            onClick={toggleSettings}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Auto Detection */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Auto-detect watermarks</span>
              <input
                type="checkbox"
                checked={options.auto_detect}
                onChange={(e) => updateOptions({ auto_detect: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically find text and logos using AI
            </p>
          </div>

          {/* Detection Confidence */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Detection Confidence: {Math.round(options.detection_confidence * 100)}%
            </label>
            <input
              type="range"
              min="50"
              max="95"
              value={options.detection_confidence * 100}
              onChange={(e) => updateOptions({ detection_confidence: parseInt(e.target.value) / 100 })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>More detections</span>
              <span>Higher accuracy</span>
            </div>
          </div>

          {/* OCR Detection */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">OCR Text Detection</span>
              <input
                type="checkbox"
                checked={options.ocr_enabled}
                onChange={(e) => updateOptions({ ocr_enabled: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Detect text using optical character recognition
            </p>
          </div>

          {/* Logo Detection */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Logo Detection</span>
              <input
                type="checkbox"
                checked={options.logo_detection}
                onChange={(e) => updateOptions({ logo_detection: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Detect logos and patterns
            </p>
          </div>

          {/* Inpainting Method */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Inpainting Method
            </label>
            <select
              value={options.inpainting_method}
              onChange={(e) => updateOptions({ inpainting_method: e.target.value as 'lama' | 'telea' | 'ns' })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="lama">LaMa (Best Quality)</option>
              <option value="telea">Telea (Fast)</option>
              <option value="ns">Navier-Stokes (Classic)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              LaMa uses AI for best results, others are faster but lower quality
            </p>
          </div>

          {/* Preserve Quality */}
          <div>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-gray-300">Preserve Original Quality</span>
              <input
                type="checkbox"
                checked={options.preserve_quality}
                onChange={(e) => updateOptions({ preserve_quality: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Save images at original resolution with minimal compression
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-800">
          <button
            onClick={toggleSettings}
            className="w-full btn-primary"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;