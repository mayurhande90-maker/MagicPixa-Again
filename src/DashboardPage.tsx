import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page } from './App';
import { editImageWithPrompt } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { 
    UploadIcon, SparklesIcon, ImageIcon, DownloadIcon, RetryIcon, UserIcon, DashboardIcon, ProjectsIcon, HelpIcon,
    ScannerIcon, NotesIcon, CaptionIcon, ChevronDownIcon, ScissorsIcon, PhotoStudioIcon,
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

// This component contains the logic from the original App.tsx, but with a new layout
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
    
    const renderContent = () => {
        if(isLoading) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="w-full max-w-sm aspect-square bg-gray-200 dark:bg-gray-800/50 rounded-lg animate-pulse"></div>
                    <div className="w-full max-w-sm mt-8">
                        <p aria-live="polite" className="mt-4 text-center text-gray-700 dark:text-gray-300 font-medium transition-opacity duration-300">{loadingMessage}</p>
                    </div>
                </div>
            );
        }
        if(error) {
            return (
                <div className='w-full h-full flex flex-col items-center justify-center gap-4'>
                     <div className="text-red-500 bg-red-100 dark:text-red-400 dark:bg-red-900/50 p-4 rounded-lg w-full max-w-md text-center">{error}</div>
                     <button onClick={handleGenerateClick}
                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                            <RetryIcon className="w-6 h-6" />
                            Retry
                        </button>
                </div>
            );
        }
        if (generatedImage) {
            return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                    <img src={generatedImage} alt="Generated product photo" className="max-h-[calc(100%-80px)] h-auto w-auto object-contain rounded-lg shadow-2xl shadow-black/20" />
                    <div className='flex items-center gap-4'>
                        <button onClick={handleDownloadClick}
                            className="flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 mt-4">
                            <DownloadIcon className="w-6 h-6" />
                            Download
                        </button>
                        <button onClick={() => setGeneratedImage(null)}
                            className="flex items-center justify-center gap-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg transition-all duration-300 mt-4">
                            Start Over
                        </button>
                    </div>
                </div>
            );
        }

        // Initial view
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Uploader */}
                <div className="lg:col-span-2 bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                    <div
                        className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-300 h-full min-h-[400px] flex items-center justify-center"
                        onClick={triggerFileInput} role="button" tabIndex={0}
                        aria-label="Upload a product image" onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && triggerFileInput()}>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                        {originalImage ? (
                        <img src={originalImage.url} alt="Original product" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                        ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                            <UploadIcon className="w-12 h-12" />
                            <span className='font-semibold text-lg text-gray-800 dark:text-gray-200'>Drop your product photo here</span>
                            <span className="text-sm">or click to upload (JPG, PNG, max 5MB)</span>
                        </div>
                        )}
                    </div>
                </div>

                {/* Side Panels */}
                <div className="space-y-8">
                    <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-cyan-500" /> Configuration</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload a clear, front-facing photo for best results.</p>
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
                    <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                         <h3 className="text-lg font-semibold mb-4">Actions</h3>
                         <button onClick={handleGenerateClick} disabled={isLoading || !originalImage}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                            Generate Image
                         </button>
                         <p className='text-xs text-center text-gray-400 dark:text-gray-500 mt-3'>This will cost 3 credits.</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full flex flex-col'>
            {/* Breadcrumbs */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Home &nbsp;&gt;&nbsp; Dashboard &nbsp;&gt;&nbsp; <span className="text-gray-800 dark:text-gray-200">Photo Studio</span>
            </div>
            {/* Title */}
            <div className='mb-8'>
                <h2 className="text-3xl font-bold text-blue-500">AI Photo Studio</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Transform your raw product photo into a hyper-realistic image ready to post.</p>
            </div>
            {/* Main Content Area */}
            <div className='flex-grow'>
                {renderContent()}
            </div>
        </div>
    )
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo }) => {
    const [openCategories, setOpenCategories] = useState<string[]>(['AI Photo Enhancements']);

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const mainLinks = [
        { name: 'Dashboard', icon: DashboardIcon },
        { name: 'My Creations', icon: ProjectsIcon },
    ];
    
    const toolCategories = [
        {
            name: 'AI Photo Enhancements',
            tools: [
                { name: 'Magic Enhance', icon: SparklesIcon },
                { name: 'Background Eraser', icon: ScissorsIcon },
                { name: 'AI Photo Studio', icon: PhotoStudioIcon },
            ]
        },
        {
            name: 'Productivity & Content Tools',
            tools: [
                { name: 'DocuScan Pro', icon: ScannerIcon },
                { name: 'PDF Master Suite', icon: NotesIcon }, // Re-using icon
                { name: 'Smart Notes Generator', icon: NotesIcon },
                { name: 'AutoCaption AI', icon: CaptionIcon },
            ]
        },
    ];

    return (
        <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-72 bg-white dark:bg-black/30 border-r border-gray-200 dark:border-gray-800/50 p-6 hidden lg:flex flex-col">
                <div className="flex items-center gap-2 mb-10">
                    <h1 onClick={() => navigateTo('home')} className="cursor-pointer text-2xl font-bold dark:text-white text-gray-900 flex items-center gap-2">
                        Magic<span className="text-cyan-500 dark:text-cyan-400">Pixa</span>
                        <div className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 glowing-dot"></div>
                    </h1>
                </div>
                <nav className="flex flex-col gap-y-4 flex-grow">
                    <div>
                        <h3 className="px-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Main</h3>
                        <div className="space-y-1 mt-2">
                           {mainLinks.map(link => (
                                <a key={link.name} href="#" className="flex items-center gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                                    <link.icon className="w-5 h-5" /> {link.name}
                                </a>
                           ))}
                        </div>
                    </div>

                    <div>
                         <h3 className="px-3 text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 tracking-wider">AI Tools</h3>
                         <div className="space-y-1 mt-2">
                            {toolCategories.map(category => (
                                <div key={category.name}>
                                    <button onClick={() => toggleCategory(category.name)} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium">
                                        <span className="flex items-center gap-3">
                                            {category.name}
                                        </span>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${openCategories.includes(category.name) ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openCategories.includes(category.name) && (
                                        <div className="mt-1 ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
                                            {category.tools.map(tool => (
                                                <a key={tool.name} href="#" className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${tool.name === 'AI Photo Studio' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                                    <tool.icon className="w-4 h-4" /> {tool.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                         </div>
                    </div>
                </nav>
                 <div>
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"><HelpIcon className="w-5 h-5" /> Help & Support</a>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0e0e0e]">
                <header className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                           <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Credits: 10</p>
                        </div>
                        <ThemeToggle />
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center cursor-pointer">
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
