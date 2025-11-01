import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User } from './App';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, generateCaptions, colourizeImage, removeImageBackground } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ScissorsIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon
} from './components/icons';
// FIX: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { Blob, LiveServerMessage } from '@google/genai';

interface DashboardPageProps {
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
  auth: AuthProps;
  activeView: View;
  setActiveView: (view: View) => void;
  openEditProfileModal: () => void;
  isConversationOpen: boolean;
  setIsConversationOpen: (isOpen: boolean) => void;
}

const loadingMessages = [
  "Mixing some virtual paint...",
  "Chatting with the AI muse...",
  "Polishing pixels...",
  "Framing your masterpiece...",
  "Just a moment...",
];

const aspectRatios = [
    { key: 'original', label: 'Same as Input' },
    { key: '1:1', label: '1:1 (Square)' },
    { key: '16:9', label: '16:9 (Landscape)' },
    { key: '9:16', label: '9:16 (Portrait)' },
];

const homeInteriorStyles = [
    { key: 'Modern', label: 'Modern' },
    { key: 'Japanese', label: 'Japanese' },
    { key: 'American', label: 'American' },
    { key: 'Chinese', label: 'Chinese' },
    { key: 'Traditional Indian', label: 'Indian' },
    { key: 'Coastal', label: 'Coastal' },
    { key: 'Arabic', label: 'Arabic' },
    { key: 'Futuristic', label: 'Futuristic' },
    { key: 'African', label: 'African' },
];

const officeInteriorStyles = [
    { key: 'Modern Corporate', label: 'Corporate' },
    { key: 'Minimalist', label: 'Minimalist' },
    { key: 'Industrial', label: 'Industrial' },
    { key: 'Luxury Executive', label: 'Executive' },
    { key: 'Contemporary', label: 'Contemporary' },
    { key: 'Creative / Artistic', label: 'Creative' },
    { key: 'Biophilic / Nature-Inspired', label: 'Biophilic' },
    { key: 'Traditional Indian', label: 'Indian' },
    { key: 'Tech Futuristic', label: 'Futuristic' },
];

const homeRoomTypes = [
    { key: 'Living Room', label: 'Living Room' },
    { key: 'Kitchen', label: 'Kitchen' },
    { key: 'Master Bedroom', label: 'Master Bed' },
    { key: 'Kids Bedroom', label: 'Kids Bed' },
    { key: 'Guest Bedroom', label: 'Guest Bed' },
    { key: 'Balcony', label: 'Balcony' },
    { key: 'Washroom', label: 'Washroom' },
];

const officeRoomTypes = [
    { key: 'Cabin', label: 'Cabin' },
    { key: 'Work Area', label: 'Work Area' },
    { key: 'Pantry', label: 'Pantry' },
    { key: 'Conference Room', label: 'Conference' },
    { key: 'Reception Area', label: 'Reception' },
    { key: 'Restroom', label: 'Restroom' },
];


const Dashboard: React.FC<{ user: User | null; navigateTo: (page: Page, view?: View, sectionId?: string) => void; openEditProfileModal: () => void; }> = ({ user, navigateTo, openEditProfileModal }) => (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1E1E1E]">Welcome back, {user?.name.split(' ')[0]}!</h1>
                <p className="text-[#5F6368] mt-1">Ready to create something amazing today?</p>
            </div>

            <div className="space-y-8">
                 {/* Top Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Profile Card */}
                    <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-[#0079F2] font-bold text-2xl">
                                {user?.avatar}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-[#1E1E1E]">{user?.name}</h3>
                                <p className="text-sm text-[#5F6368] truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button onClick={openEditProfileModal} className="w-full flex items-center justify-center gap-2 text-sm py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                           <PencilIcon className="w-4 h-4" /> Edit Profile
                        </button>
                    </div>

                    {/* Credits Card */}
                     <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="font-bold text-lg text-[#1E1E1E]">Your Credits</h3>
                           <CreditCardIcon className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-4xl font-bold text-[#1E1E1E]">{user?.credits}</p>
                        <p className="text-sm text-[#5F6368] mb-4">Free Plan</p>
                         <button onClick={() => navigateTo('home', undefined, 'pricing')} className="w-full bg-[#f9d230] text-[#1E1E1E] text-sm font-semibold py-2.5 rounded-lg hover:scale-105 transform transition-transform">
                            Get More Credits
                        </button>
                    </div>
                </div>

                {/* My Creations Hub */}
                <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                    <h2 className="text-xl font-bold text-[#1E1E1E] mb-4">My Creations</h2>
                    <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                         <ProjectsIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                         <p className="text-sm text-[#5F6368]">Your future creations will appear here.</p>
                         <button disabled className="mt-4 bg-gray-200 text-gray-500 text-sm font-semibold px-4 py-2 rounded-lg cursor-not-allowed">
                            View All (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
);


const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('original');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    
    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);
    
    const EDIT_COST = 2;
    const currentCost = EDIT_COST;

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
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        setAspectRatio('original');
        if (fileInputRef.current) fileInputRef.current.value = ""; 
    }, []);

    const handleImageEdit = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < EDIT_COST) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        
        try {
            const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType, aspectRatio);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            
            // Deduct credits only on successful generation
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, aspectRatio, currentCredits, auth, isGuest, navigateTo]);


    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_image_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };
    
    const hasInsufficientCredits = currentCredits < currentCost;

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Studio</h2>
                    <p className="text-[#5F6368] mt-2">Transform your product photos into studio-quality images.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Left Panel: Image Canvas */}
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!originalImage && !generatedImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!originalImage && !generatedImage ? triggerFileInput : undefined}
                                role={!originalImage && !generatedImage ? 'button' : undefined} 
                                tabIndex={!originalImage && !generatedImage ? 0 : -1} 
                                aria-label={!originalImage ? "Upload an image" : ""}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your photo here</span>
                                            <span className="text-sm">or click to upload</span>
                                        </div>
                                    </div>
                                )}

                                {(originalImage || generatedImage) && !isLoading && (
                                     <button
                                        onClick={triggerFileInput}
                                        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                        aria-label="Change photo"
                                        title="Change photo"
                                    >
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}

                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Right Panel: Controls */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                           <h3 className="text-xl font-bold text-[#1E1E1E]">Control Panel</h3>
                           <p className='text-sm text-[#5F6368]'>Your creative cockpit</p>
                        </div>
                         <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">
                                    For best results, upload a clear, well-lit photo where the subject is facing forward.
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            {!originalImage && !isLoading && (
                                <p className="text-xs text-center text-[#5F6368]">Click the canvas on the left to upload a photo.</p>
                            )}

                            {originalImage && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Aspect Ratio</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                            {aspectRatios.map(ar => (
                                                <button key={ar.key} onClick={() => setAspectRatio(ar.key)} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${aspectRatio === ar.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                                    {ar.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {generatedImage ? (
                                        <div className="space-y-4">
                                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                                <DownloadIcon className="w-6 h-6" /> Download Image
                                            </button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <RetryIcon className="w-5 h-5" /> Regenerate
                                                </button>
                                                <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                                    <UploadIcon className="w-5 h-5" /> Upload New
                                                </button>
                                            </div>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {EDIT_COST} credits.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                                <SparklesIcon className="w-6 h-6" /> Generate
                                            </button>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${EDIT_COST} credits.`}</p>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">Start Over</button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {error && (
                            <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'>
                                <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>
                                <button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800">
                                    <RetryIcon className="w-4 h-4" />
                                    Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MagicInterior: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [spaceType, setSpaceType] = useState<'home' | 'office' | null>(null);
    const [roomType, setRoomType] = useState<string | null>(null);
    const [style, setStyle] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    
    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits-interior');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);
    
    const EDIT_COST = 2;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    
    const handleSpaceTypeChange = (type: 'home' | 'office') => {
        setSpaceType(type);
        setRoomType(null); // Reset room type
        // Set a logical default style
        if (type === 'home') {
            setStyle('Modern');
        } else {
            setStyle('Modern Corporate');
        }
    };
    
    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits-interior', guestCredits.toString());
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
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        setStyle(null);
        setSpaceType(null);
        setRoomType(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload a photo of your room first.");
            return;
        }
        if (!spaceType || !roomType || !style) {
            setError("Please select the space, room type, and style before generating.");
            return;
        }
        if (currentCredits < EDIT_COST) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        
        try {
            const newBase64 = await generateInteriorDesign(base64Data.base64, base64Data.mimeType, style, spaceType, roomType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);

            // Deduct credits only on successful generation
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, style, spaceType, roomType, currentCredits, auth, isGuest, navigateTo]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage || !style) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_interior_${style.toLowerCase().replace(' ','_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage, style]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };
    
    const hasInsufficientCredits = currentCredits < currentCost;
    const canGenerate = originalImage && spaceType && roomType && style;

    const currentStyles = spaceType === 'office' ? officeInteriorStyles : homeInteriorStyles;

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Interior</h2>
                    <p className="text-[#5F6368] mt-2">Redesign any room with the power of AI.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!originalImage && !generatedImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!originalImage && !generatedImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated Interior" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original Room" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Upload a photo of your room</span>
                                            <span className="text-sm">or click to select a file</span>
                                        </div>
                                    </div>
                                )}
                                {(originalImage || generatedImage) && !isLoading && (
                                     <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo">
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                           <h3 className="text-xl font-bold text-[#1E1E1E]">Design Controls</h3>
                           <p className='text-sm text-[#5F6368]'>Select your desired style</p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">
                                  For best results, use a wide-angle shot of your room in good lighting. Empty rooms work great!
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#1E1E1E] mb-2">1. Space Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleSpaceTypeChange('home')} disabled={!originalImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${spaceType === 'home' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>Home</button>
                                        <button onClick={() => handleSpaceTypeChange('office')} disabled={!originalImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${spaceType === 'office' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>Office</button>
                                    </div>
                                </div>

                                {spaceType && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">2. Room Type</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {(spaceType === 'home' ? homeRoomTypes : officeRoomTypes).map(rt => (
                                                    <button key={rt.key} onClick={() => setRoomType(rt.key)} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${roomType === rt.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                                        {rt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className={`${!roomType ? 'opacity-50' : ''}`}>
                                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">3. Design Style</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {currentStyles.map(s => (
                                                    <button key={s.key} onClick={() => setStyle(s.key)} disabled={!originalImage || !spaceType || !roomType} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${style === s.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {originalImage && (
                                <>
                                    {generatedImage ? (
                                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                                <DownloadIcon className="w-6 h-6" /> Download Image
                                            </button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <RetryIcon className="w-5 h-5" /> Regenerate
                                                </button>
                                                <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                                    <UploadIcon className="w-5 h-5" /> Upload New
                                                </button>
                                            </div>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {EDIT_COST} credits.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                                <SparklesIcon className="w-6 h-6" /> Generate
                                            </button>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${EDIT_COST} credits.`}</p>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">Start Over</button>
                                        </div>
                                    )}
                                </>
                            )}
                             {!originalImage && !isLoading && (
                                <p className="text-xs text-center text-[#5F6368] pt-4 border-t border-gray-200/80">Upload a photo to get started and select a style.</p>
                            )}
                        </div>

                        {error && (
                            <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'>
                                <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>
                                <button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800">
                                    <RetryIcon className="w-4 h-4" /> Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MagicPhotoColour: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [mode, setMode] = useState<'restore' | 'colourize_only'>('restore');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);

    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits-colour');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 2;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);

    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits-colour', guestCredits.toString());
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
        }
        return () => {
            if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
        };
    }, [isLoading]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setError(null);
            if (!['image/jpeg', 'image/png'].includes(file.type)) {
                setError('Please upload a valid image file (JPG or PNG).');
                return;
            }

            const img = new Image();
            img.onload = () => {
                if (img.width < 512 || img.height < 512) {
                    setError("Image resolution is too low. Please upload an image that is at least 512x512 pixels.");
                } else {
                    setOriginalImage({ file, url: URL.createObjectURL(file) });
                    setGeneratedImage(null);
                }
            };
            img.onerror = () => {
                setError("Could not load the image. Please try another file.");
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleStartOver = useCallback(() => {
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        setMode('restore');
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < currentCost) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const newBase64 = await colourizeImage(base64Data.base64, base64Data.mimeType, mode);
            setGeneratedImage(`data:image/jpeg;base64,${newBase64}`);
            
            // Deduct credits only on successful generation
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, currentCost);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - currentCost);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, mode, currentCredits, auth, isGuest, navigateTo, currentCost]);
    
    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_colourized_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const hasInsufficientCredits = currentCredits < currentCost;

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Colour</h2>
                    <p className="text-[#5F6368] mt-2">Breathe new life into your vintage black & white photos.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                        <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                             <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!originalImage && !generatedImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!originalImage && !generatedImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Upload your vintage photo</span>
                                            <span className="text-sm">Minimum 512x512 pixels</span>
                                        </div>
                                    </div>
                                )}
                                {(originalImage || generatedImage) && !isLoading && (
                                     <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo">
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                           <h3 className="text-xl font-bold text-[#1E1E1E]">Colourization Options</h3>
                           <p className='text-sm text-[#5F6368]'>Choose your enhancement level</p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">
                                    'Auto Restore' works best for photos with scratches or dust. Use 'Colourize Only' to preserve authentic grain.
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            {!originalImage && !isLoading && (
                                <p className="text-xs text-center text-[#5F6368]">Upload a black & white or sepia photo to get started.</p>
                            )}
                            {originalImage && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => setMode('restore')} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${mode === 'restore' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                                Auto Restore & Colourize
                                            </button>
                                            <button onClick={() => setMode('colourize_only')} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${mode === 'colourize_only' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                                Colourize Only
                                            </button>
                                        </div>
                                    </div>

                                    {generatedImage ? (
                                        <div className="space-y-4">
                                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                                <DownloadIcon className="w-6 h-6" /> Download Image
                                            </button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <RetryIcon className="w-5 h-5" /> Regenerate
                                                </button>
                                                <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                                    <UploadIcon className="w-5 h-5" /> Upload New
                                                </button>
                                            </div>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {currentCost} credits.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                                <SparklesIcon className="w-6 h-6" /> Generate
                                            </button>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${currentCost} credits.`}</p>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">Start Over</button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {error && (
                            <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'>
                                <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>
                                <button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800">
                                    <RetryIcon className="w-4 h-4" /> Try Again
                                </button>
                            </div>
                        )}
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

interface ParsedCaptions {
  notes: string;
  recommended: string;
  short: string;
  medium: string;
  long: string;
  hashtags: string;
}

const parseGeneratedText = (text: string): ParsedCaptions => {
    const getText = (regex: RegExp) => (text.match(regex) || [])[1]?.trim() || '';

    const notes = getText(/⚙️ \*\*Auto Notes:\*\*\s*\n([\s\S]*?)(?=\n\n🌟|$)/);
    const recommended = getText(/🌟 \*\*Recommended Caption:\*\*\s*\n([\s\S]*?)(?=\n\n---|---\n\n🪶|$)/);
    const short = getText(/🪶 \*\*Caption \(Short\):\*\*\s*\n([\s\S]*?)(?=\n\n💬|$)/);
    const medium = getText(/💬 \*\*Caption \(Medium\):\*\*\s*\n([\s\S]*?)(?=\n\n📝|$)/);
    const long = getText(/📝 \*\*Caption \(Long\):\*\*\s*\n([\s\S]*?)(?=\n\n🏷️|$)/);
    const hashtags = getText(/🏷️ \*\*Hashtags \(Recommended\):\*\*\s*\n([\s\S]*?)$/);

    return { notes, recommended, short, medium, long, hashtags };
};


const ResultCard: React.FC<{ title: string; content: string; }> = ({ title, content }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!content) return null;

    return (
        <div className="relative p-4 bg-gray-50 rounded-lg border border-gray-200/80">
            <h4 className="text-sm font-bold text-gray-800 mb-2">{title}</h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
            <button onClick={handleCopy} className="absolute top-3 right-3 bg-white px-2 py-1 text-xs font-semibold text-gray-700 rounded border hover:bg-gray-100">
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};


const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [parsedCaptions, setParsedCaptions] = useState<ParsedCaptions | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);

    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits-caption');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 1;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    
    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits-caption', guestCredits.toString());
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
            setParsedCaptions(null);
            setError(null);
        }
    };

    const handleStartOver = useCallback(() => {
        setParsedCaptions(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < currentCost) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setParsedCaptions(null);

        try {
            const newText = await generateCaptions(base64Data.base64, base64Data.mimeType);
            setParsedCaptions(parseGeneratedText(newText));

            // Deduct credits only on successful generation
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, currentCost);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - currentCost);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, currentCredits, auth, isGuest, navigateTo, currentCost]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const hasInsufficientCredits = currentCredits < currentCost;

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">CaptionAI</h2>
                    <p className="text-[#5F6368] mt-2">Generate engaging, platform-ready captions from any photo.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                        <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!originalImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!originalImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                {originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your photo here</span>
                                            <span className="text-sm">or click to upload</span>
                                        </div>
                                    </div>
                                )}
                                {originalImage && !isLoading && (
                                    <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo">
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                         {parsedCaptions && !isLoading ? (
                            <>
                                <div className='text-center'>
                                    <h3 className="text-xl font-bold text-[#1E1E1E]">Generated Captions</h3>
                                    <p className='text-sm text-[#5F6368]'>Ready to copy and paste!</p>
                                </div>
                                <div className="space-y-3 py-2 pr-2 -mr-2" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {parsedCaptions.notes && (
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200/80">
                                            <h4 className="text-sm font-bold text-blue-800 mb-1">⚙️ Auto Notes</h4>
                                            <p className="text-sm text-blue-900">{parsedCaptions.notes}</p>
                                        </div>
                                    )}
                                    <ResultCard title="🌟 Recommended Caption" content={parsedCaptions.recommended} />
                                    <hr className="border-gray-200/80 my-2" />
                                    <ResultCard title="🪶 Caption (Short)" content={parsedCaptions.short} />
                                    <ResultCard title="💬 Caption (Medium)" content={parsedCaptions.medium} />
                                    <ResultCard title="📝 Caption (Long)" content={parsedCaptions.long} />
                                    <ResultCard title="🏷️ Hashtags (Recommended)" content={parsedCaptions.hashtags} />
                                </div>
                                <div className="space-y-4 pt-4 border-t border-gray-200/80">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <RetryIcon className="w-5 h-5" /> Regenerate
                                        </button>
                                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                            <UploadIcon className="w-5 h-5" /> Upload New
                                        </button>
                                    </div>
                                    <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {EDIT_COST} credit.</p>
                                </div>
                            </>
                        ) : (
                             <>
                                <div className='text-center'>
                                   <h3 className="text-xl font-bold text-[#1E1E1E]">Control Panel</h3>
                                   <p className='text-sm text-[#5F6368]'>Your creative cockpit</p>
                                </div>
                                 <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                                    <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                        <p className="text-xs text-yellow-700">
                                            For best results, upload a clear photo. Works great for products, people, places, and more!
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 pt-4 border-t border-gray-200/80">
                                    {!originalImage && !isLoading && (
                                        <p className="text-xs text-center text-[#5F6368]">Click the canvas on the left to upload a photo.</p>
                                    )}

                                    {originalImage && (
                                        <>
                                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                                <SparklesIcon className="w-6 h-6" /> Generate
                                            </button>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${EDIT_COST} credit.`}</p>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">Start Over</button>
                                        </>
                                    )}
                                </div>
                            </>
                        )}

                        {error && (
                            <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'>
                                <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>
                                <button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800">
                                    <RetryIcon className="w-4 h-4" /> Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MagicBackgroundEraser: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);

    const [guestCredits, setGuestCredits] = useState<number>(() => {
        const saved = sessionStorage.getItem('magicpixa-guest-credits-eraser');
        return saved ? parseInt(saved, 10) : 2;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 1;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);

    useEffect(() => {
        if (isGuest) {
            sessionStorage.setItem('magicpixa-guest-credits-eraser', guestCredits.toString());
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
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < currentCost) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const newBase64 = await removeImageBackground(base64Data.base64, base64Data.mimeType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            
            // Deduct credits only on successful generation
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, currentCost);
                auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - currentCost);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, currentCredits, auth, isGuest, navigateTo, currentCost]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_eraser_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const hasInsufficientCredits = currentCredits < currentCost;

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Background Eraser</h2>
                    <p className="text-[#5F6368] mt-2">Instantly remove the background from any photo.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                        <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                style={{ background: generatedImage ? 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADBJREFUOE9jfPbs2X8GPEBSUhKfNAP+f0Y0/j+w/JnUFHDCBynUD2k0o9FASQYBACo6EAXr3w6aAAAAAElFTkSuQmCC) repeat' : '' }}
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!originalImage && !generatedImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!originalImage && !generatedImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated with background removed" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Upload any photo</span>
                                            <span className="text-sm">with a person, product, or object</span>
                                        </div>
                                    </div>
                                )}
                                {(originalImage || generatedImage) && !isLoading && (
                                     <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo">
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}
                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                           <h3 className="text-xl font-bold text-[#1E1E1E]">Background Eraser</h3>
                           <p className='text-sm text-[#5F6368]'>One click is all it takes</p>
                        </div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">
                                    Works great on portraits and product photos with clear subjects against a complex background.
                                </p>
                            </div>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            {!originalImage && !isLoading && (
                                <p className="text-xs text-center text-[#5F6368]">Upload a photo to get started.</p>
                            )}
                            {originalImage && (
                                <>
                                    {generatedImage ? (
                                        <div className="space-y-4">
                                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                                <DownloadIcon className="w-6 h-6" /> Download PNG
                                            </button>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <RetryIcon className="w-5 h-5" /> Regenerate
                                                </button>
                                                <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                                    <UploadIcon className="w-5 h-5" /> Upload New
                                                </button>
                                            </div>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {currentCost} credit.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                                <SparklesIcon className="w-6 h-6" /> Generate
                                            </button>
                                            <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${currentCost} credit.`}</p>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-red-600 transition-colors">Start Over</button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>

                        {error && (
                            <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'>
                                <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>
                                <button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800">
                                    <RetryIcon className="w-4 h-4" /> Try Again
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const LiveConversation: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    type SessionState = 'inactive' | 'connecting' | 'active' | 'error';
    type AIState = 'idle' | 'speaking';

    const [sessionState, setSessionState] = useState<SessionState>('inactive');
    const [aiState, setAiState] = useState<AIState>('idle');
    const [transcriptHistory, setTranscriptHistory] = useState<{ speaker: 'user' | 'model'; text: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const transcriptEndRef = useRef<HTMLDivElement>(null);

    const sessionPromiseRef = useRef<ReturnType<typeof startLiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);

    const createBlob = (data: Float32Array): Blob => {
        const int16 = new Int16Array(data.length);
        for (let i = 0; i < data.length; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const stopSession = useCallback(() => {
        setSessionState('inactive');
        setAiState('idle');
        nextStartTimeRef.current = 0;
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
    }, []);

    const startSession = async () => {
        setError(null);
        setTranscriptHistory([]);
        setSessionState('connecting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            inputAudioContextRef.current ||= new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current ||= new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            let currentInputTranscription = '';
            let currentOutputTranscription = '';

            sessionPromiseRef.current = startLiveSession({
                onopen: () => {
                    setSessionState('active');
                    inputAudioContextRef.current?.resume();
                    outputAudioContextRef.current?.resume();
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: createBlob(inputData) });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) currentInputTranscription += message.serverContent.inputTranscription.text;
                    if (message.serverContent?.outputTranscription) currentOutputTranscription += message.serverContent.outputTranscription.text;
                    
                    if (message.serverContent?.turnComplete) {
                        if (currentInputTranscription.trim()) setTranscriptHistory(p => [...p, { speaker: 'user', text: currentInputTranscription.trim() }]);
                        if (currentOutputTranscription.trim()) setTranscriptHistory(p => [...p, { speaker: 'model', text: currentOutputTranscription.trim() }]);
                        currentInputTranscription = '';
                        currentOutputTranscription = '';
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        setAiState('speaking');
                        const outputCtx = outputAudioContextRef.current;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputCtx.destination);
                        
                        source.addEventListener('ended', () => {
                            outputSourcesRef.current.delete(source);
                            if (outputSourcesRef.current.size === 0) {
                                setAiState('idle');
                            }
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        outputSourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setError('An error occurred. Please try again.');
                    setSessionState('error');
                    stopSession();
                },
                onclose: (e: CloseEvent) => {
                    stopSession();
                    onClose();
                },
            });
        } catch (err) {
            console.error('Failed to start session:', err);
            setError('Could not access microphone. Please grant permission.');
            setSessionState('error');
        }
    };
    
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcriptHistory]);

    useEffect(() => () => stopSession(), [stopSession]);
    
    const PixaAvatar = () => (
        <div className="relative w-32 h-32">
             <div className={`absolute inset-0 rounded-full bg-blue-100 transition-all duration-300 ${aiState === 'speaking' ? 'animate-pulse scale-110' : ''}`}></div>
            <div className={`absolute inset-1 rounded-full bg-white flex items-center justify-center`}>
                <SparklesIcon className={`w-12 h-12 text-blue-500 transition-transform duration-500 ${sessionState === 'active' ? 'scale-110' : ''}`} />
            </div>
             {sessionState === 'active' && <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-spin-slow"></div>}
        </div>
    );
    
    const getStatusText = () => {
        switch (sessionState) {
            case 'connecting': return 'Connecting...';
            case 'active':
                return aiState === 'speaking' ? 'Pixa is speaking...' : 'Listening...';
            case 'error': return error;
            default: return 'Talk with Pixa, your AI assistant.';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full max-w-2xl h-[90vh] max-h-[700px] m-4 rounded-2xl shadow-xl border border-gray-200/80 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 p-4 border-b border-gray-200/80 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">Magic Conversation</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                
                <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                    {transcriptHistory.length === 0 && sessionState !== 'active' && (
                         <div className="flex flex-col items-center justify-center h-full text-center">
                            <PixaAvatar />
                            <p className="mt-4 font-semibold text-gray-700">{getStatusText()}</p>
                        </div>
                    )}
                    {transcriptHistory.map((entry, index) => (
                        <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                            {entry.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-blue-600"/></div>}
                            <div className={`max-w-md p-3 rounded-lg ${entry.speaker === 'user' ? 'bg-gray-200 text-gray-800' : 'bg-blue-50 text-blue-900'}`}>
                                <p className="text-sm">{entry.text}</p>
                            </div>
                            {entry.speaker === 'user' && <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><AvatarUserIcon className="w-5 h-5 text-gray-600"/></div>}
                        </div>
                    ))}
                    <div ref={transcriptEndRef} />
                </div>
                
                <div className="flex-shrink-0 p-6 border-t border-gray-200/80 flex flex-col items-center justify-center">
                    {sessionState !== 'active' && (
                         <button onClick={startSession} disabled={sessionState === 'connecting'} className="flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-6 rounded-full shadow-lg disabled:opacity-50">
                            <MicrophoneIcon className="w-6 h-6" /> {sessionState === 'connecting' ? 'Starting...' : 'Tap to Speak'}
                        </button>
                    )}
                     {sessionState === 'active' && (
                        <>
                            <div className="flex items-center gap-2 text-gray-500 mb-4">
                               <div className={`w-3 h-3 rounded-full animate-pulse ${aiState === 'speaking' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                               <span>{getStatusText()}</span>
                            </div>
                            <button onClick={stopSession} className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold py-2 px-6 rounded-full shadow-md">
                                <StopIcon className="w-5 h-5" /> Stop
                            </button>
                        </>
                     )}
                     {sessionState === 'error' && <p className="text-red-500 mt-4">{error}</p>}
                </div>
            </div>
        </div>
    );
};


const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen }) => {
    const extendedAuthProps = {
      ...auth,
      setActiveView,
      openConversation: () => setIsConversationOpen(true),
      isDashboard: true,
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#F9FAFB]">
            <Header navigateTo={navigateTo} auth={extendedAuthProps} />
            <div className="flex flex-1" style={{ height: 'calc(100vh - 69px)' }}>
                <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} />
                <main className="flex-1 overflow-y-auto">
                    {activeView === 'dashboard' && <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} />}
                    {activeView === 'studio' && <MagicPhotoStudio auth={auth} navigateTo={navigateTo} />}
                    {activeView === 'interior' && <MagicInterior auth={auth} navigateTo={navigateTo} />}
                    {activeView === 'caption' && <CaptionAI auth={auth} navigateTo={navigateTo} />}
                    {activeView === 'colour' && <MagicPhotoColour auth={auth} navigateTo={navigateTo} />}
                    {activeView === 'eraser' && <MagicBackgroundEraser auth={auth} navigateTo={navigateTo} />}
                    {activeView === 'creations' && <Creations />}
                    {activeView === 'billing' && auth.user && <Billing user={auth.user} setUser={auth.setUser} />}
                </main>
            </div>
            {isConversationOpen && <LiveConversation onClose={() => setIsConversationOpen(false)} />}
        </div>
    );
};

export default DashboardPage;