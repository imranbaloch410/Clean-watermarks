import React from 'react';
import { Sparkles, Github } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Header: React.FC = () => {
  const { files, jobStatus } = useStore();
  
  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/90 backdrop-blur-md z-30 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-indigo-500" />
          <h1 className="font-bold text-lg tracking-tight">
            Clean Watermarks
            <span className="text-indigo-400 text-sm font-normal ml-2">AI Edition</span>
          </h1>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Image counter */}
        <div className="text-sm text-gray-400">
          <span className="font-medium text-white">{files.length}</span>
          <span className="text-gray-500"> / 200 images</span>
        </div>
        
        {/* Status indicator */}
        {jobStatus && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              jobStatus.status === 'completed' ? 'bg-green-500' :
              jobStatus.status === 'failed' ? 'bg-red-500' :
              'bg-indigo-500 animate-pulse'
            }`} />
            <span className="text-xs text-gray-400 capitalize">
              {jobStatus.status}
            </span>
          </div>
        )}
        
        {/* GitHub link */}
        <a
          href="https://github.com/imranbaloch410/Clean-watermarks"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="View on GitHub"
        >
          <Github className="w-5 h-5 text-gray-400 hover:text-white" />
        </a>
      </div>
    </header>
  );
};

export default Header;