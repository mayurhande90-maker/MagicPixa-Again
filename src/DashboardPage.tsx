

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps } from './App';
import { editImageWithPrompt, analyzeImageContent } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import { 
    UploadIcon, SparklesIcon, ImageIcon, DownloadIcon, RetryIcon, DashboardIcon, ProjectsIcon, HelpIcon,
    ScannerIcon, NotesIcon, CaptionIcon, ChevronDownIcon, ScissorsIcon, PhotoStudioIcon
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
    
    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);
    const GENERATION_COST = 2;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    
    useEffect(() => {
        if (!isGuest && auth.user) {
            getOrCreateUserProfile(auth.user.uid, auth.user.name, auth.user.email)
                .then(profile => {
                    auth.setUser(prevUser => prevUser ? { ...prevUser, credits: profile.credits } : null);
                })
                .catch(err => console.error("Could not sync user credits:", err));
        }
    }, [isGuest, auth.user?.uid]);

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
            if (isGuest) auth.openAuthModal();
            return;
        };

        setIsLoading(true);
        setError(null);
        
        try {
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, GENERATION_COST);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - GENERATION_COST);
            }

            const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
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
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Home &nbsp;&gt;&nbsp; Dashboard &nbsp;&gt;&nbsp; <span className="text-slate-800 dark:text-slate-200">Photo Studio</span>
            </div>
            <div className='mb-8'>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">AI Photo Studio</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Transform your raw product photo into a hyper-realistic image ready to post.</p>
            </div>
            
            <div className='flex-grow'>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                        <div
                            className="relative border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors duration-300 h-full min-h-[400px] flex items-center justify-center"
                            onClick={!originalImage ? triggerFileInput : undefined}
                            role="button"
                            tabIndex={!originalImage ? 0 : -1}
                            aria-label="Upload a product image"
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !originalImage && triggerFileInput()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                            
                            {!originalImage && !error && (
                                <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer">
                                        <UploadIcon className="w-12 h-12" />
                                        <span className='font-semibold text-lg text-slate-800 dark:text-slate-200'>Drop your product photo here</span>
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
                                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-900/60 backdrop-blur-sm border border-white/20 text-white hover:bg-slate-900/80 transition-all duration-300"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </>
                             )}

                            {isLoading && (
                                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl p-4 text-center">
                                    <div className="w-full max-w-sm">
                                        <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                            <div className="bg-blue-500 h-2.5 rounded-full progress-bar-animated w-full"></div>
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
                                        className="w-full max-w-xs flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                                        <RetryIcon className="w-6 h-6" />
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                     <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><SparklesIcon className="w-5 h-5 text-blue-500" /> Configuration</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Upload a clear, front-facing photo for best results.</p>
                            {(isAnalyzing || imageDescription) && (
                                <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg min-h-[80px] flex items-center justify-center text-center">
                                    {isAnalyzing ? (
                                        <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                            <SparklesIcon className="w-5 h-5 text-blue-500 animate-pulse-opacity" />
                                            <span className="font-medium">Analyzing creative potential...</span>
                                        </div>
                                    ) : imageDescription ? (
                                        <div className="text-left w-full">
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">AI Insight:</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{imageDescription}"</p>
                                        </div>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                             <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">Actions</h3>
                             
                             {generatedImage ? (
                                <div className="space-y-4">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105">
                                        <DownloadIcon className="w-6 h-6" />
                                        Download Image
                                    </button>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={handleGenerateClick}
                                            disabled={isLoading || hasInsufficientCredits}
                                            className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Generate a new image using the same product photo"
                                        >
                                            <RetryIcon className="w-5 h-5" />
                                            Regenerate
                                        </button>
                                        <button
                                            onClick={handleStartOver}
                                            disabled={isLoading}
                                            className="w-full flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-3 px-4 rounded-lg transition-all disabled:opacity-50"
                                            title="Start over with a new image"
                                        >
                                            <UploadIcon className="w-5 h-5" />
                                            New Image
                                        </button>
                                    </div>
                                    <p className={`text-xs text-center transition-opacity duration-300 ${hasInsufficientCredits ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                                        {hasInsufficientCredits ? 'Insufficient credits to regenerate.' : `Regeneration costs ${GENERATION_COST} credits.`}
                                    </p>
                                </div>
                             ) : (
                                <>
                                 <button onClick={handleGenerateClick} disabled={isLoading || !originalImage || hasInsufficientCredits || isAnalyzing}
                                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100">
                                    {getButtonText()}
                                 </button>
                                 <p className={`text-xs text-center mt-3 ${hasInsufficientCredits && originalImage ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
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
    const [activeView, setActiveView] = useState<'studio' | 'creations'>('studio');
    
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? undefined : auth.user?.credits;

    const toggleCategory = (category: string) => {
        setOpenCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const mainLinks = [
        { name: 'Dashboard', icon: DashboardIcon, view: 'studio' },
        { name: 'My Creations', icon: ProjectsIcon, view: 'creations' },
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
                { name: 'PDF Master Suite', icon: NotesIcon },
                { name: 'Smart Notes Generator', icon: NotesIcon },
                { name: 'AutoCaption AI', icon: CaptionIcon },
            ]
        },
    ];

    return (
        <div className="flex min-h-screen">
            <aside className="w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-6 hidden lg:flex flex-col">
                <div className="flex items-center gap-2 mb-10">
                    <h1 onClick={() => navigateTo('home')} className="cursor-pointer text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        Magic<span className="text-blue-600 dark:text-blue-400">Pixa</span>
                    </h1>
                </div>
                <nav className="flex flex-col gap-y-4 flex-grow">
                    <div>
                        <h3 className="px-3 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Main</h3>
                        <div className="space-y-1 mt-2">
                           {mainLinks.map(link => (
                                <button key={link.name} onClick={() => link.view !== 'creations' && setActiveView(link.view as any)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-left ${
                                    activeView === link.view
                                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                                } ${link.view === 'creations' ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <link.icon className="w-5 h-5" /> {link.name}
                                </button>
                           ))}
                        </div>
                    </div>

                    <div>
                         <h3 className="px-3 text-xs font-semibold uppercase text-slate-400 dark:text-slate-500 tracking-wider">AI Tools</h3>
                         <div className="space-y-1 mt-2">
                            {toolCategories.map(category => (
                                <div key={category.name}>
                                    <button onClick={() => toggleCategory(category.name)} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors font-medium">
                                        <span className="flex items-center gap-3">
                                            {category.name}
                                        </span>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${openCategories.includes(category.name) ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openCategories.includes(category.name) && (
                                        <div className="mt-1 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700 space-y-1">
                                            {category.tools.map(tool => (
                                                <a key={tool.name} href="#" className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${tool.name === 'AI Photo Studio' ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900'}`}>
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
                    <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors font-medium"><HelpIcon className="w-5 h-5" /> Help & Support</a>
                </div>
            </aside>

            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-black">
                <header className="flex items-center justify-end p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        {!isGuest && (
                             <div className="hidden sm:flex items-center gap-4">
                                <div className="text-right">
                                   <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Credits: {currentCredits}</p>
                                </div>
                            </div>
                        )}
                        <ThemeToggle />
                        {auth.isAuthenticated && auth.user ? (
                           <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={setActiveView} />
                        ) : (
                           <button onClick={() => auth.openAuthModal()} className="text-sm font-semibold bg-slate-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors">
                               Sign In
                           </button>
                        )}
                    </div>
                </header>
                <main className="flex-1">
                    {activeView === 'studio' && <MagicPhotoStudio auth={auth} />}
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;