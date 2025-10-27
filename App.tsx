
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { editImageWithPrompt } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { UploadIcon, SparklesIcon, ImageIcon, DownloadIcon } from './components/icons';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
  const [base64Data, setBase64Data] = useState<Base64File | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (originalImage) {
      fileToBase64(originalImage.file)
        .then(setBase64Data)
        .catch(err => {
          console.error(err);
          setError("Failed to read and convert the image file.");
        });
    }
  }, [originalImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
          setError('Please upload a valid image file.');
          return;
      }
      setOriginalImage({ file, url: URL.createObjectURL(file) });
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleGenerateClick = useCallback(async () => {
    if (!base64Data) {
      setError("Please upload an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType);
      setGeneratedImage(`data:image/png;base64,${newBase64}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [base64Data]);

  const handleDownloadClick = useCallback(() => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = 'ai_product_photo.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <SparklesIcon className="w-10 h-10 text-indigo-400" />
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 text-transparent bg-clip-text">
              AI Product Photo Studio
            </h1>
          </div>
          <p className="text-slate-400 max-w-3xl mx-auto">
            Upload your product photo and let AI generate a stunning, marketing-ready image in seconds. No prompt needed.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col justify-between gap-8 border border-slate-700">
            <div>
              <h2 className="text-xl font-semibold mb-3 text-cyan-400">1. Upload Product Photo</h2>
              <div
                className="relative border-2 border-dashed border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-800 transition-colors duration-300 h-64 flex items-center justify-center"
                onClick={triggerFileInput}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
                {originalImage ? (
                  <img src={originalImage.url} alt="Original product" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <UploadIcon className="w-10 h-10" />
                    <span>Click to upload image</span>
                    <span className="text-xs">PNG, JPG, or WEBP</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-3 text-cyan-400">2. Generate Your Image</h2>
              <p className="text-sm text-slate-400 mb-4">
                Our AI will analyze your product and automatically create a professional background and scene for it.
              </p>
              <button
                onClick={handleGenerateClick}
                disabled={isLoading || !originalImage}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-6 h-6" />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Panel */}
          <div className="bg-slate-800/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-700 min-h-[400px]">
             <h2 className="text-xl font-semibold mb-4 self-start text-cyan-400">AI Generated Result</h2>
            {error && <div className="text-red-400 bg-red-900/50 p-4 rounded-lg w-full">{error}</div>}
            
            <div className="w-full flex-grow flex items-center justify-center">
              {isLoading && (
                 <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <div className="w-full max-w-sm aspect-square bg-slate-700 rounded-lg animate-pulse"></div>
                    <p className="mt-4">Generating your masterpiece...</p>
                 </div>
              )}

              {!isLoading && generatedImage && (
                <div className="w-full flex flex-col items-center justify-center gap-4">
                    <img src={generatedImage} alt="Generated" className="max-h-[calc(100%-60px)] h-auto w-auto object-contain rounded-lg shadow-2xl shadow-black/50" />
                    <button
                        onClick={handleDownloadClick}
                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 mt-4"
                    >
                        <DownloadIcon className="w-6 h-6" />
                        Download Image
                    </button>
                </div>
              )}
              
              {!isLoading && !generatedImage && !error && (
                <div className="text-center text-slate-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                  <p>Your generated image will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
