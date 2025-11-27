import React from 'react';
import { Header, DropZone, ImageGrid, ProcessingControls, SettingsPanel } from './components';
import { useStore } from './store/useStore';

const App: React.FC = () => {
  const { files } = useStore();
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Title and description */}
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              AI-Powered Watermark Removal
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Upload up to 200 images and remove watermarks with one click.
              Our AI automatically detects and removes text, logos, and patterns.
            </p>
          </div>
          
          {/* Drop zone */}
          <DropZone />
          
          {/* Image grid */}
          <ImageGrid />
          
          {/* Processing controls */}
          {files.length > 0 && (
            <ProcessingControls />
          )}
        </div>
      </main>
      
      {/* Settings modal */}
      <SettingsPanel />
    </div>
  );
};

export default App;