
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page } from './App';
import { editImageWithPrompt } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { 
    UploadIcon, SparklesIcon, ImageIcon, DownloadIcon, RetryIcon, UserIcon, DashboardIcon, ProjectsIcon, BillingIcon, HelpIcon, InteriorIcon, ApparelIcon, MockupIcon, ScannerIcon, NotesIcon, CaptionIcon, FriendIcon, BackgroundRemovalIcon, ColorizeIcon
} from './components/icons';
import ThemeToggle from './components/ThemeToggle';

interface DashboardPageProps {
  navigateTo: (page: Page) => void;
}

const loadingMessages = [
  "Analyzing your product...",
  "Brainstorming creative backgrounds...",
  "Adjusting the virtual lighting...",
  "Rendering a hyper-realistic scene...",
  "Adding the final marketing polish...",
  "Almost ready!",
];

type AspectRatio = '1:1' | '16:9' | '9:16';

// This component contains the logic from the original App.tsx
const MagicPhotoStudio: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

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

    useEffect(() => {
        if (isLoading) {
        let messageIndex = 0;
        setLoadingMessage(loadingMessages[messageIndex]);
        
        messageIntervalRef.current = window.setInterval(() => {
            messageIndex = (messageIndex + 1) % loadingMessages.length;
            setLoadingMessage(loadingMessages[messageIndex]);
        }, 2500);
        } else {
        if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current);
            messageIntervalRef.current = null;
        }
        }

        return () => {
        if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current);
        }
        };
    }, [isLoading]);

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
        const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType, aspectRatio);
        setGeneratedImage(`data:image/png;base64,${newBase64}`);
        } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
        setIsLoading(false);
        }
    }, [base64Data, aspectRatio]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;

        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = 'magicpixa_photo.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 sm:p-8">
            {/* Controls Panel */}
            <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 flex flex-col justify-between gap-8 border border-gray-200 dark:border-gray-800/70">
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-cyan-600 dark:text-cyan-400">1. Upload Product Photo</h2>
                    <div
                        className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-cyan-500 bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-300 h-64 flex items-center justify-center"
                        onClick={triggerFileInput} role="button" tabIndex={0}
                        aria-label="Upload a product image" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        {originalImage ? (
                        <img src={originalImage.url} alt="Original product" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                        ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                            <UploadIcon className="w-10 h-10" />
                            <span>Click to upload image</span>
                            <span className="text-xs">PNG, JPG, or WEBP</span>
                        </div>
                        )}
                    </div>
                </div>
                <div className='flex flex-col gap-8'>
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-cyan-600 dark:text-cyan-400">2. Select Aspect Ratio</h2>
                        <div className="flex justify-center gap-3">
                        {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                            <button key={ratio} onClick={() => setAspectRatio(ratio)}
                            className={`w-full px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-900 focus:ring-cyan-500 ${
                                aspectRatio === ratio
                                ? 'bg-cyan-500 text-black shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300'
                            }`}>
                            {ratio}
                            </button>
                        ))}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-cyan-600 dark:text-cyan-400">3. Generate Your Image</h2>
                        <button onClick={handleGenerateClick} disabled={isLoading || !originalImage}
                        className="w-full flex items-center justify-center gap-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-black font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            </div>

            {/* Result Panel */}
            <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-800/70 min-h-[500px] lg:min-h-0">
                <h2 className="text-xl font-semibold mb-4 self-start text-cyan-600 dark:text-cyan-400">AI Generated Result</h2>
                {error && <div className="text-red-500 bg-red-100 dark:text-red-400 dark:bg-red-900/50 p-4 rounded-lg w-full text-center mb-4">{error}</div>}
                
                <div className="w-full flex-grow flex items-center justify-center">
                    {isLoading && (
                        <div className="w-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        <div className="w-full max-w-sm aspect-square bg-gray-200 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
                        <div className="w-full max-w-sm mt-8">
                            <p aria-live="polite" className="mt-4 text-center text-gray-700 dark:text-gray-300 font-medium transition-opacity duration-300">{loadingMessage}</p>
                        </div>
                        </div>
                    )}
                    {!isLoading && generatedImage && (
                        <div className="w-full flex flex-col items-center justify-center gap-4">
                        <img src={generatedImage} alt="Generated product photo" className="max-h-[calc(100%-60px)] h-auto w-auto object-contain rounded-lg shadow-2xl shadow-black/20" />
                        <button onClick={handleDownloadClick}
                            className="w-full max-w-xs flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 mt-4">
                            <DownloadIcon className="w-6 h-6" />
                            Download Image
                        </button>
                        </div>
                    )}
                    {!isLoading && !generatedImage && !error && (
                        <div className="text-center text-gray-400 dark:text-gray-500">
                        <ImageIcon className="w-16 h-16 mx-auto mb-4" />
                        <p>Your generated image will appear here.</p>
                        </div>
                    )}
                    {!isLoading && error && (
                        <button onClick={handleGenerateClick}
                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                            <RetryIcon className="w-6 h-6" />
                            Retry
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo }) => {
    const tools = [
        { name: 'Magic Photo Studio', icon: SparklesIcon },
        { name: 'Background Removal', icon: BackgroundRemovalIcon },
        { name: 'Photo Colourise', icon: ColorizeIcon },
        { name: 'Magic Interior', icon: InteriorIcon },
        { name: 'Magic Apparel', icon: ApparelIcon },
        { name: 'Magic Mockup', icon: MockupIcon },
        { name: 'Magic Scanner', icon: ScannerIcon },
        { name: 'Magic Notes', icon: NotesIcon },
        { name: 'CaptionAI', icon: CaptionIcon },
        { name: 'Magic Friend', icon: FriendIcon },
    ];
    
    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-gray-900/70 border-r border-gray-200 dark:border-gray-800 p-6 hidden lg:flex flex-col">
                <div className="flex items-center gap-2 mb-10">
                    <h1 onClick={() => navigateTo('home')} className="cursor-pointer text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
                        Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                        <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
                    </h1>
                </div>
                <nav className="flex flex-col space-y-2 flex-grow">
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><DashboardIcon className="w-5 h-5" /> Dashboard</a>
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-700/50 rounded-lg"><SparklesIcon className="w-5 h-5 text-cyan-500 dark:text-cyan-400" /> All Tools</a>
                    {/* Expandable tool list */}
                    <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-5">
                        {tools.map(tool => (
                             <a key={tool.name} href="#" className={`flex items-center gap-3 px-4 py-2 text-sm rounded-lg transition-colors ${tool.name === 'Magic Photo Studio' ? 'text-cyan-600 dark:text-cyan-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                <tool.icon className="w-4 h-4" /> {tool.name}
                            </a>
                        ))}
                    </div>
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><ProjectsIcon className="w-5 h-5" /> My Creations</a>
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><BillingIcon className="w-5 h-5" /> Subscription</a>
                </nav>
                 <div>
                    <a href="#" className="flex items-center gap-3 px-4 py-2 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><HelpIcon className="w-5 h-5" /> Help & Support</a>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0e0e0e]">
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <div>
                        <h2 className="text-xl font-semibold">Magic Photo Studio</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Create marketing-ready visuals from your product photos.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </div>
                    </div>
                </header>
                <main className="flex-1">
                    <MagicPhotoStudio />
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;
