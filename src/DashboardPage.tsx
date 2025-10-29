
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps } from './App';
import { editImageWithPrompt, analyzeImageContent } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { deductCredits } from './firebase';
import { 
    UploadIcon, SparklesIcon, ImageIcon, DownloadIcon, RetryIcon, UserIcon, DashboardIcon, ProjectsIcon, HelpIcon,
    ScannerIcon, NotesIcon, CaptionIcon, ChevronDownIcon, ScissorsIcon, PhotoStudioIcon,
} from './components/icons';
import ThemeToggle from './components/ThemeToggle';
import UserMenu from './components/UserMenu';

interface DashboardPageProps {
  navigateTo: (page: Page) => void;
  auth: AuthProps;
}

const loadingMessages = [
  "Analyzing your product...",
  "Brainstorming creative backgrounds...",
  "Adjusting the virtual lighting...",
  "Rendering a hyper-realistic scene...",
  "Adding the final marketing polish...",
  "Almost ready!",
];

interface MagicPhotoStudioProps {
    auth: AuthProps;
}

const MagicPhotoStudio: React.FC<MagicPhotoStudioProps> = ({ auth }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [imageDescription, setImageDescription] = useState<string | null>(null);
    
    // Guest credit management using sessionStorage
    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);
    const GENERATION_COST = 2;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);

    // Effect to sync guest credits with sessionStorage
    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits', guestCredits.toString());
        }
    }, [isGuest, guestCredits]);


    useEffect(() => {
        if (originalImage) {
            setImageDescription(null);
            setBase64Data(null);
            setIsAnalyzing(true);
            setError(null);

            fileToBase64(originalImage.file)
                .then(async (b64Data) => {
                setBase64Data(b64Data);
                try {
                    const description = await analyzeImageContent(b64Data.base64, b64Data.mimeType);
                    setImageDescription(description);
                } catch (err) {
                    console.error(err);
                    setImageDescription("AI analysis failed. Please try another image.");
                } finally {
                    setIsAnalyzing(false);
                }
                })
                .catch(err => {
                    console.error(err);
                    setError("Failed to read and convert the image file.");
                    setIsAnalyzing(false);
                });
        } else {
            setBase64Data(null);
            setImageDescription(null);
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

    const handleStartOver = useCallback(() => {
        setOriginalImage(null);
        setGeneratedImage(null);
        setBase64Data(null);
        setError(null);
        setImageDescription(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
        }
    }, []);

    const handleGenerateClick = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < GENERATION_COST) {
            if (isGuest) auth.openAuthModal(); // Prompt guest to sign up
            return;
        };

        setIsLoading(true);
        setError(null);
        
        try {
            // Deduct credits before calling the API
            if (!isGuest && auth.user) {
                await deductCredits(auth.user.uid, GENERATION_COST);
                // Update local state for immediate UI feedback
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: prevUser.credits - GENERATION_COST } : null);
            } else {
                setGuestCredits(prev => prev - GENERATION_COST);
            }

            const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            // Optional: Refund credits on failure
            if (!isGuest && auth.user) {
                 auth.setUser(prevUser => prevUser ? { ...prevUser, credits: prevUser.credits + GENERATION_COST } : null);
            } else {
                setGuestCredits(prev => prev + GENERATION_COST);
            }
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, currentCredits, auth, isGuest, setGuestCredits]);

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
        if (isLoading) return;
        fileInputRef.current?.click();
    };
    
    const hasInsufficientCredits = currentCredits < GENERATION_COST;

    const getButtonText = () => {
        if (isAnalyzing) return 'Analyzing...';
        if (isGuest && hasInsufficientCredits && originalImage) return 'Sign Up for More';
        return 'Generate Image';
    };

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
            
            <div className='flex-grow'>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                        <div
                            className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors duration-300 h-full min-h-[400px] flex items-center justify-center"
                            onClick={!originalImage ? triggerFileInput : undefined}
                            role="button"
                            tabIndex={!originalImage ? 0 : -1}
                            aria-label="Upload a product image"
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !originalImage && triggerFileInput()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                            
                            {!originalImage && !error && (
                                <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400 cursor-pointer">
                                        <UploadIcon className="w-12 h-12" />
                                        <span className='font-semibold text-lg text-gray-800 dark:text-gray-200'>Drop your product photo here</span>
                                        <span className="text-sm">or click to upload (JPG, PNG, max 5MB)</span>
                                    </div>
                                </div>
                            )}

                             {(originalImage || generatedImage) && !error && (
                                <>
                                    <img src={generatedImage || originalImage?.url} alt={generatedImage ? "Generated product" : "Original product"} className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                    {!isLoading && (
                                        <button 
                                            onClick={triggerFileInput}
                                            title="Upload another image"
                                            aria-label="Upload another image"
                                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-900/60 backdrop-blur-sm border border-white/20 text-white hover:bg-gray-900/80 transition-all duration-300"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </>
                             )}

                            {isLoading && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl p-4 text-center">
                                    <div className="w-full max-w-sm">
                                        <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-cyan-400 h-2.5 rounded-full progress-bar-animated w-full"></div>
                                        </div>
                                        <p aria-live="polite" className="mt-4 text-white font-medium transition-opacity duration-300">
                                            {loadingMessage}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className='w-full h-full flex flex-col items-center justify-center gap-4 p-4'>
                                    <div className="text-red-500 bg-red-100 dark:text-red-400 dark:bg-red-900/50 p-4 rounded-lg w-full max-w-md text-center">{error}</div>
                                    <button onClick={handleStartOver}
                                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                                        <RetryIcon className="w-6 h-6" />
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="space-y-8">
                        <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-cyan-500" /> Configuration</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload a clear, front-facing photo for best results.</p>
                            {(isAnalyzing || imageDescription) && (
                                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg min-h-[80px] flex items-center justify-center text-center">
                                    {isAnalyzing ? (
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                            <SparklesIcon className="w-5 h-5 text-cyan-500 animate-pulse" />
                                            <span className="font-medium animate-shimmer">Analyzing creative potential...</span>
                                        </div>
                                    ) : imageDescription ? (
                                        <div className="text-left w-full">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">AI Insight:</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{imageDescription}"</p>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="bg-white/5 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-800/70">
                             <h3 className="text-lg font-semibold mb-4">Actions</h3>
                             
                             {generatedImage ? (
                                <div className="space-y-4">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                                        <DownloadIcon className="w-6 h-6" />
                                        Download Image
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={handleGenerateClick}
                                            disabled={isLoading || hasInsufficientCredits}
                                            className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Generate a new image using the same product photo"
                                        >
                                            <RetryIcon className="w-5 h-5" />
                                            Regenerate
                                        </button>
                                        <button
                                            onClick={handleStartOver}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                                            title="Start over with a new image"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                            New Image
                                        </button>
                                    </div>
                                    <p className={`text-xs text-center transition-opacity duration-300 ${hasInsufficientCredits ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {hasInsufficientCredits ? 'Insufficient credits to regenerate.' : `Regeneration costs ${GENERATION_COST} credits.`}
                                    </p>
                                </div>
                             ) : (
                                <>
                                 <button onClick={handleGenerateClick} disabled={isLoading || !originalImage || hasInsufficientCredits || isAnalyzing}
                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                                    {getButtonText()}
                                 </button>
                                 <p className={`text-xs text-center mt-3 ${hasInsufficientCredits && originalImage ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                                     {originalImage && hasInsufficientCredits
                                        ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient Credits')
                                        : `This will cost ${GENERATION_COST} credits.`}
                                 </p>
                                </>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth }) => {
    const [openCategories, setOpenCategories] = useState<string[]>(['AI Photo Enhancements']);
    const isGuest = !auth.isAuthenticated || !auth.user;
    
    // Guest users don't have stored credits, this is handled inside MagicPhotoStudio
    const currentCredits = isGuest ? undefined : auth.user?.credits;

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

            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#0e0e0e]">
                <header className="flex items-center justify-end p-4 border-b border-gray-200 dark:border-gray-800/50">
                    <div className="flex items-center gap-4">
                        {!isGuest && (
                            <div className="text-right">
                               <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">Credits: {currentCredits}</p>
                            </div>
                        )}
                        <ThemeToggle />
                        {auth.isAuthenticated && auth.user ? (
                           <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} />
                        ) : (
                           <button onClick={auth.openAuthModal} className="text-sm font-semibold bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-200 transition-colors">
                               Sign Up
                           </button>
                        )}
                    </div>
                </header>
                <main className="flex-1">
                    <MagicPhotoStudio auth={auth} />
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;
