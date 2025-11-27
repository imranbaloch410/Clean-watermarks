import React, { useState, useCallback } from 'react';
import { Sparkles, Wand2, MessageSquare, Lightbulb, AlertCircle } from 'lucide-react';
import { analyzeImage, generateSuggestions, isGeminiConfigured } from '../services/geminiService';
import { Spinner } from './Spinner';

interface GeminiPanelProps {
  imageDataUrl: string | null;
}

export const GeminiPanel: React.FC<GeminiPanelProps> = ({ imageDataUrl }) => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'suggest'>('analyze');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = isGeminiConfigured();

  const handleAnalyze = useCallback(async () => {
    if (!imageDataUrl) return;
    
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const result = await analyzeImage(imageDataUrl);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  }, [imageDataUrl]);

  const handleSuggest = useCallback(async () => {
    if (!imageDataUrl) return;
    
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    
    try {
      const result = await generateSuggestions(imageDataUrl);
      setSuggestions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setIsLoading(false);
    }
  }, [imageDataUrl]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <h2 className="font-semibold text-white">AI Assistant</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">Powered by Gemini</p>
      </div>

      {/* API Key Warning */}
      {!isConfigured && (
        <div className="mx-4 mt-4 p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200">
              <p className="font-medium">API Key Required</p>
              <p className="text-amber-300/70 mt-1">
                Set VITE_GEMINI_API_KEY in your .env file to enable AI features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === 'analyze'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/20'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Analyze
          </div>
        </button>
        <button
          onClick={() => setActiveTab('suggest')}
          className={`flex-1 px-4 py-3 text-xs font-medium transition-colors ${
            activeTab === 'suggest'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-900/20'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Suggest
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!imageDataUrl ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-sm text-gray-500">
                Select an image to use AI features
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Action Button */}
            <button
              onClick={activeTab === 'analyze' ? handleAnalyze : handleSuggest}
              disabled={isLoading || !isConfigured}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner size="sm" className="border-white" />
                  Processing...
                </>
              ) : (
                <>
                  {activeTab === 'analyze' ? (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Analyze Image
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4" />
                      Get Suggestions
                    </>
                  )}
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Analysis Result */}
            {activeTab === 'analyze' && analysis && (
              <div className="p-4 bg-gray-800 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Analysis
                </h3>
                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {analysis}
                </p>
              </div>
            )}

            {/* Suggestions Result */}
            {activeTab === 'suggest' && suggestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Suggestions
                </h3>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-800 rounded-lg text-sm text-gray-200 flex gap-3"
                  >
                    <span className="text-indigo-400 font-medium shrink-0">
                      {index + 1}.
                    </span>
                    <span>{suggestion}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <p className="text-[10px] text-gray-600 text-center">
          AI responses may not always be accurate. Review before use.
        </p>
      </div>
    </div>
  );
};

export default GeminiPanel;