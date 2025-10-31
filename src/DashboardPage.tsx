import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps } from './App';
import { editImageWithPrompt } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon
} from './components/icons';

interface DashboardPageProps {
  navigateTo: (page: Page) => void;
  auth: AuthProps;
}

export type View = 'studio' | 'creations' | 'billing';

const loadingMessages = [
  "Mixing some virtual paint...",
  "Chatting with the AI muse...",
  "Polishing pixels...",
  "Framing your masterpiece...",
  "Just a moment...",
];

const MagicPhotoStudio: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    
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
    }, [isGuest, auth.user?.uid, auth]);

    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits', guestCredits.toString());
        }
    }, [isGuest, guestCredits]);

    useEffect(() => {
        if (originalImage) {
            setBase64Data(null);
            setError(null);
            fileToBase64(originalImage.file).then(setBase64Data);
        } else {
            setBase64Data(null);
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
        } else if (messageIntervalRef.current) {
            clearInterval(messageIntervalRef.current);
            messageIntervalRef.current = null;
        }

        return () => {
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
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
        if (fileInputRef.current) fileInputRef.current.value = ""; 
    }, []);

    const handleGenerateClick = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < GENERATION_COST) {
            if (isGuest) auth.openAuthModal();
            return;
        }

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
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, currentCredits, auth, isGuest, setGuestCredits]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_image.png`;
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
        if (isGuest && hasInsufficientCredits && originalImage) return 'Sign Up for More';
        return 'Generate Image';
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center'>
            <div className='w-full max-w-4xl mx-auto'>
                <div className='mb-12 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Studio</h2>
                    <p className="text-[#5F6368] mt-2">Transform your photo into a masterpiece.</p>
                </div>
                
                <div className="flex flex-col items-center gap-8">
                    <div className="w-full max-w-lg aspect-square bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div
                            className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center cursor-pointer"
                            onClick={!originalImage ? triggerFileInput : undefined}
                            role="button"
                            tabIndex={!originalImage ? 0 : -1}
                            aria-label="Upload a product image"
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                            
                            {!originalImage && !error && (
                                <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                        <UploadIcon className="w-12 h-12" />
                                        <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your photo here</span>
                                        <span className="text-sm">or click to upload</span>
                                    </div>
                                </div>
                            )}

                             {(originalImage || generatedImage) && !error && (
                                <img src={generatedImage || originalImage?.url} alt={generatedImage ? "Generated" : "Original"} className="max-h-full h-auto w-auto object-contain rounded-lg" />
                             )}

                            {isLoading && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center">
                                    <SparklesIcon className="w-12 h-12 text-[#FFD84D] animate-pulse" />
                                    <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">
                                        {loadingMessage}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className='w-full h-full flex flex-col items-center justify-center gap-4 p-4'>
                                    <div className="text-red-600 bg-red-100 p-4 rounded-lg w-full max-w-md text-center">{error}</div>
                                    <button onClick={handleStartOver}
                                        className="flex items-center justify-center gap-3 bg-[#0079F2] hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                                        <RetryIcon className="w-6 h-6" />
                                        Try Again
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-full max-w-sm">
                        {generatedImage ? (
                            <div className="space-y-4">
                                <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#FFD84D] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                    <DownloadIcon className="w-6 h-6" />
                                    Download Image
                                </button>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleGenerateClick}
                                        disabled={isLoading || hasInsufficientCredits}
                                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <RetryIcon className="w-5 h-5" />
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={handleStartOver}
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        <UploadIcon className="w-5 h-5" />
                                        New Image
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleGenerateClick} 
                                disabled={isLoading || !originalImage || hasInsufficientCredits}
                                className="w-full flex items-center justify-center gap-3 bg-[#FFD84D] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                            >
                                {getButtonText()}
                            </button>
                        )}
                        <p className={`text-xs text-center mt-3 ${hasInsufficientCredits && originalImage ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>
                            {originalImage && hasInsufficientCredits
                                ? (isGuest ? 'Sign up for 10 free credits!' : 'Insufficient Credits')
                                : originalImage ? `This costs ${GENERATION_COST} credits.` : `You have ${currentCredits} credits.`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Creations: React.FC = () => (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col items-center justify-center text-center">
        <ProjectsIcon className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-[#1E1E1E]">My Creations</h2>
        <p className="text-[#5F6368] mt-2 max-w-md">
            This is where your generated images will be stored. This feature is coming soon!
        </p>
    </div>
);


const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth }) => {
    const [activeView, setActiveView] = useState<View>('studio');

    // Pass `setActiveView` down to the header and user menu
    const extendedAuthProps = {
      ...auth,
      setActiveView,
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
            <Header navigateTo={navigateTo} auth={extendedAuthProps} />
            <div className="flex flex-1" style={{ height: 'calc(100vh - 69px)' }}>
                <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} />
                <main className="flex-1 overflow-y-auto">
                    {activeView === 'studio' && <MagicPhotoStudio auth={auth} />}
                    {activeView === 'creations' && <Creations />}
                    {activeView === 'billing' && auth.user && <Billing user={auth.user} setUser={auth.setUser} />}
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;