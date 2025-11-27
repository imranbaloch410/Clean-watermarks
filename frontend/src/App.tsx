import React, { useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { ImageEditor } from './components/ImageEditor';
import { GeminiPanel } from './components/GeminiPanel';
import { Spinner } from './components/Spinner';
import { FitMode, OutputPreset } from './types';
import { loadImage, processImageToBlob, getFileSuffix, imageToBase64 } from './services/imageProcessor';
import { removeLogosFromImage } from './services/geminiService';
import { useStore } from './store/useStore';

const MAX_BATCH_SIZE = 200;

const App: React.FC = () => {
  const {
    batchItems,
    selectedId,
    sourceImageObj,
    activeProcessedUrl,
    fitMode,
    outputPreset,
    enhanceQuality,
    batchCleanLogos,
    isZipping,
    isBatchCleaning,
    zipProgress,
    isCleaningSingle,
    statusMessage,
    addFiles,
    removeBatchItem,
    setSelectedId,
    setSourceImageObj,
    setActiveProcessedUrl,
    setFitMode,
    setOutputPreset,
    setEnhanceQuality,
    setBatchCleanLogos,
    setIsZipping,
    setIsBatchCleaning,
    setZipProgress,
    setIsCleaningSingle,
    setStatusMessage,
    updateBatchItemPreview,
  } = useStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Selection (Multi)
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Quota Check
    if (batchItems.length + files.length > MAX_BATCH_SIZE) {
      alert(`Quota Limit Reached: You can process up to ${MAX_BATCH_SIZE} images at a time.`);
    }

    const filesArray = Array.from(files);
    addFiles(filesArray);

    // Reset input value to allow re-selecting same files
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveBatchItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeBatchItem(id);
  };

  // Load the "Active" image when selection changes
  useEffect(() => {
    if (!selectedId) {
      setSourceImageObj(null);
      setActiveProcessedUrl(null);
      return;
    }

    const item = batchItems.find(i => i.id === selectedId);
    if (item) {
      loadImage(item.previewUrl).then(img => {
        setSourceImageObj(img);
      });
    }
  }, [selectedId, batchItems, setSourceImageObj, setActiveProcessedUrl]);

  // Update the active processed URL when the Editor finishes
  const handleEditorProcessed = useCallback((url: string) => {
    setActiveProcessedUrl(url);
  }, [setActiveProcessedUrl]);

  const handleSingleDownload = () => {
    if (!activeProcessedUrl || !selectedId) return;
    const item = batchItems.find(i => i.id === selectedId);
    if (!item) return;

    const link = document.createElement('a');
    link.href = activeProcessedUrl;
    const name = item.file.name.replace(/\.[^/.]+$/, "");
    link.download = `${name}${getFileSuffix(outputPreset, enhanceQuality)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCleanActiveImage = async () => {
    if (!sourceImageObj) return;
    setIsCleaningSingle(true);
    setStatusMessage('Removing logos & text...');

    try {
      // Get current source as base64
      const base64 = imageToBase64(sourceImageObj);
      
      // Call Gemini
      const cleanedBase64 = await removeLogosFromImage(base64);
      
      // Load new image
      const newImg = await loadImage(cleanedBase64);
      
      // Update state
      setSourceImageObj(newImg);
      
      // Also update the preview URL in batch items so it persists
      if (selectedId) {
        updateBatchItemPreview(selectedId, cleanedBase64);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to clean image. Please try again.');
    } finally {
      setIsCleaningSingle(false);
      setStatusMessage('');
    }
  };

  const handleBatchMagicClean = async () => {
    if (batchItems.length === 0) return;
    if (!confirm(`Start Magic Clean for ${batchItems.length} images? This will remove logos/text from all images using AI. This process might take a while.`)) return;

    setIsBatchCleaning(true);
    // Uncheck the lazy flag so we don't double clean on download later
    setBatchCleanLogos(false);

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        const progress = Math.round(((i) / batchItems.length) * 100);
        setZipProgress(progress);
        setStatusMessage(`Cleaning ${i + 1}/${batchItems.length}`);
        
        // Allow UI update
        await new Promise(resolve => setTimeout(resolve, 10));

        try {
          const img = await loadImage(item.previewUrl);
          const base64 = imageToBase64(img, 0.8);
          const cleanedBase64 = await removeLogosFromImage(base64);
          
          // Convert base64 to blob url to save memory
          const res = await fetch(cleanedBase64);
          const blob = await res.blob();
          const newUrl = URL.createObjectURL(blob);

          // Update state
          updateBatchItemPreview(item.id, newUrl);
          
          // If currently viewing this item, update view
          if (selectedId === item.id) {
            const newImgObj = await loadImage(newUrl);
            setSourceImageObj(newImgObj);
          }
        } catch (e) {
          console.error(`Failed to clean item ${i}`, e);
          // Continue to next item even if one fails
        }
      }
      setZipProgress(100);
      setStatusMessage('All Cleaned!');
      setTimeout(() => {
        setStatusMessage('');
        setZipProgress(0);
      }, 2000);

    } catch (e) {
      console.error("Batch clean error", e);
      alert("An error occurred during batch cleaning.");
    } finally {
      setIsBatchCleaning(false);
    }
  };

  const handleBatchDownload = async () => {
    if (batchItems.length === 0) return;
    
    setIsZipping(true);
    setZipProgress(0);
    const zip = new JSZip();
    const folderName = outputPreset === OutputPreset.ULTRA_8K ? "framecraft-8k" : "framecraft-thumbnails";
    const folder = zip.folder(folderName);

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        // Update progress
        setZipProgress(Math.round(((i) / batchItems.length) * 100));
        setStatusMessage(`Processing ${i + 1}/${batchItems.length}`);
        
        // Allow UI to repaint
        await new Promise(resolve => setTimeout(resolve, 10));

        // 1. Load Original
        let img = await loadImage(item.previewUrl);
        
        // 2. AI Clean (If enabled via Checkbox)
        if (batchCleanLogos) {
          setStatusMessage(`AI Cleaning ${i + 1}/${batchItems.length}...`);
          try {
            const base64 = imageToBase64(img);
            const cleanedBase64 = await removeLogosFromImage(base64);
            img = await loadImage(cleanedBase64);
          } catch (e) {
            console.error(`Failed to clean image ${item.file.name}`, e);
            // Continue with original image if cleaning fails
          }
        }

        // 3. Resize / Enhance
        const blob = await processImageToBlob(img, fitMode, outputPreset, enhanceQuality);
        
        const fileName = item.file.name.replace(/\.[^/.]+$/, "") + getFileSuffix(outputPreset, enhanceQuality);
        
        folder?.file(fileName, blob);
      }
      
      setZipProgress(95);
      setStatusMessage('Generating ZIP...');
      const content = await zip.generateAsync({ type: "blob" });
      setZipProgress(100);

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `framecraft-batch-${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Brief delay before resetting UI
      setTimeout(() => {
        setIsZipping(false);
        setZipProgress(0);
        setStatusMessage('');
      }, 1000);

    } catch (err) {
      console.error("Batch processing failed", err);
      alert("Failed to process batch. Try fewer images.");
      setIsZipping(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Header */}
      <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 bg-gray-900/90 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-md flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-bold text-lg tracking-tight hidden md:block">FrameCraft</h1>
          </div>
          
          <div className="flex items-center gap-3">
             {batchItems.length > 0 && (
               <div className={`text-xs mr-2 hidden sm:block ${batchItems.length >= MAX_BATCH_SIZE ? 'text-amber-400 font-semibold' : 'text-gray-400'}`}>
                 {batchItems.length} / {MAX_BATCH_SIZE} images
               </div>
             )}

             {batchItems.length > 0 && !isBatchCleaning && !isZipping && (
              <>
                <label className="flex items-center gap-2 cursor-pointer mr-2 group" title="Clean on export (Lazy)">
                  <input type="checkbox" className="hidden" checked={batchCleanLogos} onChange={(e) => setBatchCleanLogos(e.target.checked)} />
                  <span className={`text-xs font-medium transition-colors ${batchCleanLogos ? 'text-indigo-400' : 'text-gray-600 group-hover:text-gray-500'}`}>
                     {batchCleanLogos ? 'Cleaning on Export' : 'Clean on Export'}
                  </span>
                </label>
                
                <button 
                  onClick={handleBatchMagicClean}
                  disabled={isBatchCleaning}
                  className="text-xs font-medium text-indigo-200 bg-indigo-900/50 hover:bg-indigo-800/50 border border-indigo-700/50 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-md"
                >
                   <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                   Magic Clean All
                </button>
              </>
             )}
             
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={batchItems.length >= MAX_BATCH_SIZE || isZipping || isBatchCleaning}
              className="text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              Add Images
            </button>
            
            {batchItems.length > 0 && (
              <button 
                onClick={handleBatchDownload}
                disabled={isZipping || isBatchCleaning}
                className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-md shadow-md shadow-indigo-900/20 min-w-[120px] justify-center"
              >
                {(isZipping || isBatchCleaning) ? (
                   <>
                     <Spinner size="sm" className="border-white" />
                     <span className="hidden sm:inline">{statusMessage || `${zipProgress}%`}</span>
                     <span className="sm:hidden">{zipProgress}%</span>
                   </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"></path></svg>
                    Download All
                  </>
                )}
              </button>
            )}

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              multiple
              className="hidden" 
              onChange={handleFileChange}
            />
          </div>
        </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Batch List */}
        <div className="w-24 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 z-20">
           <div className="p-3 border-b border-gray-800 flex justify-between items-center">
             <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Queue</span>
             <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{batchItems.length}/{MAX_BATCH_SIZE}</span>
           </div>
           <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {batchItems.length === 0 ? (
               <div className="text-center py-10 text-gray-600 text-sm p-2">
                 No images. Add some to start.
               </div>
             ) : (
               batchItems.map((item, idx) => (
                 <div 
                   key={item.id}
                   onClick={() => (!isZipping && !isBatchCleaning) && setSelectedId(item.id)}
                   className={`group relative flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                     selectedId === item.id 
                     ? 'bg-indigo-900/30 border border-indigo-500/30 ring-1 ring-indigo-500/20' 
                     : 'hover:bg-gray-800 border border-transparent'
                   } ${(isZipping || isBatchCleaning) ? 'pointer-events-none opacity-50' : ''}`}
                 >
                   <div className="w-16 h-9 bg-gray-950 rounded overflow-hidden shrink-0 relative">
                      <img src={item.previewUrl} alt="thumb" className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 bg-black/50 text-[8px] text-white px-1">{idx + 1}</div>
                   </div>
                   <div className="flex-1 min-w-0 hidden md:block">
                      <p className="text-sm text-gray-200 truncate">{item.file.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                   </div>
                   <button 
                     onClick={(e) => handleRemoveBatchItem(e, item.id)}
                     disabled={isZipping || isBatchCleaning}
                     className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-0"
                     title="Remove"
                   >
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                   </button>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* Center: Editor Workspace */}
        <main className="flex-1 bg-gray-950 p-4 md:p-8 overflow-y-auto flex flex-col items-center relative">
          {/* Dot Pattern Background */}
          <div className="absolute inset-0 z-0 opacity-[0.03]" 
               style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          </div>

          <div className="w-full max-w-5xl z-10 flex-1 flex flex-col justify-center min-h-[400px]">
            {(isCleaningSingle || isBatchCleaning) ? (
               <div className="w-full aspect-video bg-black rounded-lg border border-gray-700 flex flex-col items-center justify-center gap-4">
                 <Spinner size="lg" className="border-indigo-500" />
                 <p className="text-indigo-400 font-medium animate-pulse">
                   {isBatchCleaning ? `Batch Cleaning (${zipProgress}%)` : 'Removing logos, text & branding...'}
                 </p>
                 <p className="text-xs text-gray-500">AI Processing (This may take a moment)</p>
               </div>
            ) : (
              <ImageEditor 
                sourceImage={sourceImageObj} 
                fitMode={fitMode}
                outputPreset={outputPreset}
                enhance={enhanceQuality}
                onProcessed={handleEditorProcessed}
              />
            )}
          </div>
          
          {!selectedId && batchItems.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="text-center space-y-4 opacity-0 animate-fade-in" style={{ opacity: 1 }}>
                <p className="text-3xl font-light text-gray-600">Drop images here</p>
                <p className="text-sm text-gray-700">Batch processing supported ({MAX_BATCH_SIZE} image quota)</p>
              </div>
            </div>
          )}

          {/* Floating Controls for active image */}
          {selectedId && !isCleaningSingle && !isBatchCleaning && (
            <div className="mt-6 z-10 w-full max-w-4xl bg-gray-900/90 backdrop-blur p-4 rounded-xl border border-gray-800 shadow-2xl flex flex-col xl:flex-row items-center justify-between gap-4">
               
               {/* Left Side: Controls */}
               <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
                 
                  {/* Output Preset Selector */}
                 <div className="flex bg-gray-800 rounded-lg p-1 shrink-0">
                   <button
                     onClick={() => setOutputPreset(OutputPreset.ULTRA_8K)}
                     className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                       outputPreset === OutputPreset.ULTRA_8K
                       ? 'bg-gray-700 text-white shadow-sm'
                       : 'text-gray-400 hover:text-gray-200'
                     }`}
                   >
                     8K Ultra
                   </button>
                   <button
                     onClick={() => setOutputPreset(OutputPreset.YT_THUMBNAIL)}
                     className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                       outputPreset === OutputPreset.YT_THUMBNAIL
                       ? 'bg-red-600/90 text-white shadow-sm'
                       : 'text-gray-400 hover:text-gray-200'
                     }`}
                   >
                     YT Thumb
                   </button>
                 </div>

                 <div className="h-8 w-px bg-gray-700 hidden md:block"></div>

                 {/* Fit Mode Toggles */}
                 <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
                   {[
                     { mode: FitMode.CONTAIN_BLUR, label: 'Blur Fill' },
                     { mode: FitMode.CONTAIN_BLACK, label: 'Black Bars' },
                     { mode: FitMode.COVER, label: 'Crop' },
                   ].map((opt) => (
                     <button
                       key={opt.mode}
                       onClick={() => setFitMode(opt.mode)}
                       className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap ${
                         fitMode === opt.mode 
                         ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                         : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                       }`}
                     >
                       {opt.label}
                     </button>
                   ))}
                 </div>

                 {/* Enhancement Toggle */}
                 <div className="h-8 w-px bg-gray-700 hidden md:block"></div>
                 
                 <button
                   onClick={() => setEnhanceQuality(!enhanceQuality)}
                   className={`px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-2 ${
                     enhanceQuality 
                     ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-900/50 ring-1 ring-orange-400/50' 
                     : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                   }`}
                 >
                   <svg className={`w-3.5 h-3.5 ${enhanceQuality ? 'animate-pulse' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                   NatGeo
                 </button>

                 <button
                   onClick={handleCleanActiveImage}
                   className="px-3 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-2 bg-gray-800 text-indigo-300 border border-indigo-900/50 hover:bg-indigo-900/30 hover:border-indigo-500/50"
                 >
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                   Magic Clean
                 </button>
               </div>

               {/* Right Side: Action */}
               <button 
                 onClick={handleSingleDownload}
                 className="w-full xl:w-auto px-6 py-2 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2 whitespace-nowrap"
               >
                 Download Current
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4-4m4 4V4"></path></svg>
               </button>
            </div>
          )}
        </main>

        {/* Right Panel: Gemini (Only visible on larger screens) */}
        <div className="hidden lg:block w-80 border-l border-gray-800 bg-gray-900 z-20 shadow-2xl shrink-0">
          <GeminiPanel imageDataUrl={activeProcessedUrl} />
        </div>

      </div>
    </div>
  );
};

export default App;