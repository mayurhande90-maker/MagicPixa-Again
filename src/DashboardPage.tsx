

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User } from './App';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, removeImageBackground, generateApparelTryOn, generateMockup, generateCaptions } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ScissorsIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon
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

const mockupTypes = [
    { key: 'T-shirt', label: 'T-shirt' },
    { key: 'Hoodie', label: 'Hoodie' },
    { key: 'Coffee Mug', label: 'Coffee Mug' },
    { key: 'Bottle', label: 'Bottle' },
    { key: 'Visiting Card', label: 'Visiting Card' },
    { key: 'Billboard', label: 'Billboard' },
    { key: 'Frame / Poster', label: 'Frame/Poster' },
    { key: 'Laptop Screen', label: 'Laptop' },
    { key: 'Mobile Case', label: 'Mobile Case' },
    { key: 'Shopping Bag', label: 'Shopping Bag' },
    { key: 'Box Packaging', label: 'Box' },
    { key: 'Vehicle Branding (Car / Van side)', label: 'Vehicle' },
    { key: 'Cap / Hat', label: 'Cap/Hat' },
];

const dashboardFeatures: { view: View; title: string; icon: React.FC<{className?: string}>; gradient: string; disabled?: boolean }[] = [
    { view: 'studio', title: 'Photo Studio', icon: PhotoStudioIcon, gradient: 'from-blue-400 to-blue-500' },
    { view: 'eraser', title: 'BG Eraser', icon: ScissorsIcon, gradient: 'from-emerald-400 to-emerald-500' },
    { view: 'colour', title: 'Photo Colour', icon: PaletteIcon, gradient: 'from-rose-400 to-rose-500' },
    { view: 'caption', title: 'CaptionAI', icon: CaptionIcon, gradient: 'from-amber-400 to-amber-500' },
    { view: 'interior', title: 'Interior AI', icon: HomeIcon, gradient: 'from-orange-400 to-orange-500' },
    { view: 'apparel', title: 'Apparel AI', icon: UsersIcon, gradient: 'from-teal-400 to-teal-500' },
    { view: 'mockup', title: 'Mockup AI', icon: MockupIcon, gradient: 'from-indigo-400 to-indigo-500' },
    { view: 'creations', title: 'Coming Soon', icon: ProjectsIcon, gradient: 'from-gray-400 to-gray-500', disabled: true },
];

const DesktopDashboard: React.FC<{ user: User | null; navigateTo: (page: Page, view?: View, sectionId?: string) => void; openEditProfileModal: () => void; }> = ({ user, navigateTo, openEditProfileModal }) => (
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

const MobileDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void; }> = ({ user, setActiveView }) => (
    <div className="p-4">
        <h1 className="text-2xl font-bold text-[#1E1E1E]">Welcome, {user?.name.split(' ')[0]}!</h1>
        <p className="text-[#5F6368] mt-1 mb-6">What will you create today?</p>
        
        <div className="grid grid-cols-2 gap-4">
            {dashboardFeatures.map(feature => (
                <div 
                    key={feature.view}
                    onClick={() => !feature.disabled && setActiveView(feature.view)}
                    className={`relative aspect-square p-4 rounded-2xl text-white flex flex-col justify-end bg-gradient-to-br ${feature.gradient} shadow-lg shadow-gray-500/10 transition-transform transform active:scale-95`}
                >
                    <feature.icon className="w-8 h-8 absolute top-4 left-4" />
                    <h3 className="font-bold">{feature.title}</h3>
                </div>
            ))}
        </div>
    </div>
);


const Dashboard: React.FC<{ user: User | null; navigateTo: (page: Page, view?: View, sectionId?: string) => void; openEditProfileModal: () => void; setActiveView: (view: View) => void; }> = ({ user, navigateTo, openEditProfileModal, setActiveView }) => (
    <>
        <div className="hidden lg:block h-full">
            <DesktopDashboard user={user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} />
        </div>
        <div className="lg:hidden">
            <MobileDashboard user={user} setActiveView={setActiveView} />
        </div>
    </>
);

const MobileHomeDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void; }> = ({ user, setActiveView }) => {
    // Static data for the Smart Stack for now.
    const smartStackItems = [
        {
            icon: <RetryIcon className="w-6 h-6 text-indigo-500" />,
            title: "Jump back in",
            description: "Continue editing your latest product photo.",
            bgColor: "bg-indigo-50",
            action: () => setActiveView('studio')
        },
        {
            icon: <CaptionIcon className="w-6 h-6 text-amber-500" />,
            title: "Intelligent Suggestion",
            description: "Your new photo looks great! Generate some social media captions.",
            bgColor: "bg-amber-50",
            action: () => setActiveView('caption')
        },
        {
            icon: <HomeIcon className="w-6 h-6 text-orange-500" />,
            title: "Feature Discovery",
            description: "Did you know you can redesign your entire room with Magic Interior?",
            bgColor: "bg-orange-50",
            action: () => setActiveView('interior')
        }
    ];

    return (
        <div className="p-4 space-y-8">
            {/* 1. Primary Action Zone */}
            <div>
                <h1 className="text-2xl font-bold text-[#1E1E1E]">Welcome back, {user?.name.split(' ')[0]}!</h1>
                <p className="text-[#5F6368] mt-1 mb-6">Ready to start creating?</p>
                <button 
                    onClick={() => setActiveView('dashboard')}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#f9d230] text-[#1E1E1E] font-bold rounded-xl shadow-lg shadow-[#f9d230]/40 transition-transform transform active:scale-95"
                >
                    <PlusIcon className="w-6 h-6" />
                    <span>Start with a Photo</span>
                </button>
            </div>

            {/* 2. The Smart Stack */}
            <div>
                <h2 className="text-lg font-bold text-[#1E1E1E] mb-3">Recommended for you</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 -mb-4">
                    {smartStackItems.map((item, index) => (
                        <div key={index} onClick={item.action} className={`flex-shrink-0 w-64 p-4 rounded-2xl border border-gray-200/80 cursor-pointer transition-transform transform active:scale-95 ${item.bgColor}`}>
                            <div className="flex items-start gap-3">
                                {item.icon}
                                <div className="flex-1">
                                    <h3 className="font-bold text-sm text-[#1E1E1E]">{item.title}</h3>
                                    <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Quick Tools */}
            <div>
                <h2 className="text-lg font-bold text-[#1E1E1E] mb-3">All Tools</h2>
                <div className="grid grid-cols-4 gap-4">
                    {dashboardFeatures.filter(f => !f.disabled).slice(0, 8).map(feature => (
                        <div 
                            key={feature.view}
                            onClick={() => !feature.disabled && setActiveView(feature.view)}
                            className="flex flex-col items-center gap-2 text-center cursor-pointer transition-transform transform active:scale-90"
                        >
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${feature.gradient} shadow-md`}>
                                <feature.icon className="w-8 h-8 text-white" />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">{feature.title.replace('Magic ', '').replace(' AI', '')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [aspectRatio, setAspectRatio] = useState<string>('original');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [mobileControlsExpanded, setMobileControlsExpanded] = useState(true);
    
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
    const hasImage = originalImage !== null;
    
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
            setMobileControlsExpanded(true);
        }
    };

    const handleStartOver = useCallback(() => {
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        setAspectRatio('original');
        setMobileControlsExpanded(true);
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
    
    const handleAspectRatioSelect = (key: string) => {
        setAspectRatio(key);
        setMobileControlsExpanded(false);
    };

    const hasInsufficientCredits = currentCredits < currentCost;
    
    const DesktopControlPanel = () => (
        <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
            <div className='text-center'>
                <h3 className="text-xl font-bold text-[#1E1E1E]">Control Panel</h3>
                <p className='text-sm text-[#5F6368]'>Your creative cockpit</p>
            </div>
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                    <p className="text-xs text-yellow-700">For best results, upload a clear, well-lit photo where the subject is facing forward.</p>
                </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-200/80">
                {!originalImage && !isLoading && <p className="text-xs text-center text-[#5F6368]">Click the canvas on the left to upload a photo.</p>}
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
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            {generatedImage ? (
                                <div className="w-full space-y-2">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                        <DownloadIcon className="w-6 h-6" /> Download Image
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <RetryIcon className="w-5 h-5" /> Regenerate
                                        </button>
                                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                            <UploadIcon className="w-5 h-5" /> Upload New
                                        </button>
                                    </div>
                                    <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>Regeneration costs {EDIT_COST} credits.</p>
                                </div>
                            ) : (
                                <div className="w-full space-y-2">
                                    <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                        <SparklesIcon className="w-6 h-6" /> Generate
                                    </button>
                                    <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits. Top up now!') : `This generation will cost ${EDIT_COST} credits.`}</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
        </div>
    );

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Studio</h2>
                    <p className="text-[#5F6368] mt-2">Transform your product photos into studio-quality images.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                                role={!hasImage ? 'button' : undefined} 
                                tabIndex={!hasImage ? 0 : -1} 
                                aria-label={!hasImage ? "Upload an image" : ""}
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

                                {hasImage && !isLoading && (
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
                    
                    <DesktopControlPanel />
                    
                    <div className="lg:hidden w-full bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-4 space-y-4">
                        <h3 className="text-lg font-bold text-center text-[#1E1E1E]">Controls</h3>
                        {mobileControlsExpanded || !hasImage ? (
                            <div className={!hasImage ? 'opacity-50' : ''}>
                                <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Aspect Ratio</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {aspectRatios.map(ar => (
                                        <button key={ar.key} onClick={() => handleAspectRatioSelect(ar.key)} disabled={!hasImage} className={`py-3 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${aspectRatio === ar.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>{ar.label}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500">Aspect Ratio</p>
                                    <p className="text-sm font-semibold text-[#1E1E1E]">{aspectRatios.find(ar => ar.key === aspectRatio)?.label}</p>
                                </div>
                                <button onClick={() => setMobileControlsExpanded(true)} className="text-sm font-semibold text-[#0079F2] py-1 px-3 rounded-md hover:bg-blue-50">Change</button>
                            </div>
                        )}
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>

                </div>
                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                    {generatedImage ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                <DownloadIcon className="w-5 h-5" /> Download
                            </button>
                            <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                <RetryIcon className="w-5 h-5" /> Regenerate
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleImageEdit} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                            <SparklesIcon className="w-5 h-5" /> Generate
                        </button>
                    )}
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
    const [mobileControlsExpanded, setMobileControlsExpanded] = useState(true);
    
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
    const hasImage = originalImage !== null;

    const handleSpaceTypeChange = (type: 'home' | 'office') => {
        setSpaceType(type);
        setRoomType(null); 
        if (type === 'home') setStyle('Modern');
        else setStyle('Modern Corporate');
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
        if (spaceType && roomType && style) {
            setMobileControlsExpanded(false);
        }
    }, [spaceType, roomType, style]);

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
            setMobileControlsExpanded(true);
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
        setMobileControlsExpanded(true);
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

    const Controls = ({isMobile}: {isMobile: boolean}) => (
         <div className={`space-y-4 ${!hasImage ? 'opacity-50' : ''}`}>
            <div>
                <label className="block text-sm font-bold text-[#1E1E1E] mb-2">1. Space Type</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleSpaceTypeChange('home')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${spaceType === 'home' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>Home</button>
                    <button onClick={() => handleSpaceTypeChange('office')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors ${spaceType === 'office' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>Office</button>
                </div>
            </div>
            {spaceType && (
                <>
                    <div>
                        <label className="block text-sm font-bold text-[#1E1E1E] mb-2">2. Room Type</label>
                        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-3'} gap-2`}>
                            {(spaceType === 'home' ? homeRoomTypes : officeRoomTypes).map(rt => (
                                <button key={rt.key} onClick={() => setRoomType(rt.key)} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${roomType === rt.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                    {rt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={`${!roomType ? 'opacity-50' : ''}`}>
                        <label className="block text-sm font-bold text-[#1E1E1E] mb-2">3. Design Style</label>
                        <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-3'} gap-2`}>
                            {currentStyles.map(s => (
                                <button key={s.key} onClick={() => setStyle(s.key)} disabled={!hasImage || !spaceType || !roomType} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${style === s.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
    
    const ActionButtons = () => (
        <div className="w-full space-y-2">
            {generatedImage ? (
                <>
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                        <DownloadIcon className="w-6 h-6" /> Download Image
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <RetryIcon className="w-5 h-5" /> Regenerate
                        </button>
                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                            <UploadIcon className="w-5 h-5" /> Upload New
                        </button>
                    </div>
                </>
            ) : (
                <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                    <SparklesIcon className="w-6 h-6" /> Generate
                </button>
            )}
            <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits.') : `This costs ${EDIT_COST} credits.`}</p>
        </div>
    );

    const MobileSummary = () => (
        <div className="grid grid-cols-3 gap-2 text-center">
            <div>
                <p className="text-xs text-gray-500">Space</p>
                <p className="text-sm font-semibold text-[#1E1E1E] capitalize">{spaceType}</p>
            </div>
             <div>
                <p className="text-xs text-gray-500">Room</p>
                <p className="text-sm font-semibold text-[#1E1E1E]">{roomType}</p>
            </div>
             <div>
                <p className="text-xs text-gray-500">Style</p>
                <p className="text-sm font-semibold text-[#1E1E1E]">{style}</p>
            </div>
        </div>
    );

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
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                {generatedImage ? <img src={generatedImage} alt="Generated Interior" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                : originalImage ? <img src={originalImage.url} alt="Original Room" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                : <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}><div className="flex flex-col items-center gap-2 text-[#5F6368]"><UploadIcon className="w-12 h-12" /><span className='font-semibold text-lg text-[#1E1E1E]'>Upload a photo of your room</span><span className="text-sm">or click to select a file</span></div></div>}
                                {hasImage && !isLoading && <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo"><ArrowUpCircleIcon className="w-6 h-6" /></button>}
                                {isLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" /><p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p></div>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'><h3 className="text-xl font-bold text-[#1E1E1E]">Design Controls</h3><p className='text-sm text-[#5F6368]'>Select your desired style</p></div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left"><LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" /><div><p className="font-bold text-sm text-yellow-800">Pro Tip</p><p className="text-xs text-yellow-700">For best results, use a wide-angle shot of your room in good lighting. Empty rooms work great!</p></div></div>
                        <div className="space-y-4 pt-4 border-t border-gray-200/80"><Controls isMobile={false} />{!hasImage && !isLoading && <p className="text-xs text-center text-[#5F6368] pt-4 border-t border-gray-200/80">Upload a photo to get started and select a style.</p>}{hasImage && <div className="pt-4 border-t border-gray-200/80"><ActionButtons/></div>}</div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" /> Try Again</button></div>}
                    </div>
                    
                    <div className="lg:hidden w-full bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-4 space-y-4">
                        <div className="flex justify-center items-center relative">
                            <h3 className="text-lg font-bold text-center text-[#1E1E1E]">Controls</h3>
                            {(!mobileControlsExpanded && hasImage) && <button onClick={() => setMobileControlsExpanded(true)} className="absolute right-0 text-sm font-semibold text-[#0079F2]">Change</button>}
                        </div>

                        {mobileControlsExpanded || !hasImage ? (
                            <Controls isMobile={true}/>
                        ) : (
                            <MobileSummary />
                        )}
                         {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>

                </div>

                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                    {generatedImage ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                <DownloadIcon className="w-5 h-5" /> Download
                            </button>
                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                <RetryIcon className="w-5 h-5" /> Regenerate
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits || !canGenerate} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                            <SparklesIcon className="w-5 h-5" /> Generate
                        </button>
                    )}
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
    const [mobileControlsExpanded, setMobileControlsExpanded] = useState(true);

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
    const hasImage = originalImage !== null;


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
                    setMobileControlsExpanded(true);
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
        setMobileControlsExpanded(true);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);
    
    const handleModeSelect = (mode: 'restore' | 'colourize_only') => {
        setMode(mode);
        setMobileControlsExpanded(false);
    };

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
    
    const ActionButtons = () => (
         <div className="w-full space-y-2">
            {generatedImage ? (
                <>
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                        <DownloadIcon className="w-6 h-6" /> Download Image
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <RetryIcon className="w-5 h-5" /> Regenerate
                        </button>
                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                            <UploadIcon className="w-5 h-5" /> Upload New
                        </button>
                    </div>
                </>
            ) : (
                <div className="w-full space-y-2">
                    <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                        <SparklesIcon className="w-6 h-6" /> Generate
                    </button>
                </div>
            )}
             <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up for credits!' : 'Insufficient credits.') : `This generation costs ${currentCost} credits.`}</p>
        </div>
    );
    
    const Controls = () => (
        <div className={!hasImage ? 'opacity-50' : ''}>
            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mode</label>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('restore')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'restore' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                    Auto Restore & Colourize
                </button>
                <button onClick={() => setMode('colourize_only')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'colourize_only' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                    Colourize Only
                </button>
            </div>
        </div>
    );
    
    const MobileControls = () => (
        <div className="lg:hidden w-full bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-4 space-y-4">
            <h3 className="text-lg font-bold text-center text-[#1E1E1E]">Controls</h3>
            {mobileControlsExpanded || !hasImage ? (
                <div className={!hasImage ? 'opacity-50' : ''}>
                    <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mode</label>
                    <div className="grid grid-cols-1 gap-2">
                        <button onClick={() => handleModeSelect('restore')} disabled={!hasImage} className={`py-3 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'restore' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>Auto Restore & Colourize</button>
                        <button onClick={() => handleModeSelect('colourize_only')} disabled={!hasImage} className={`py-3 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'colourize_only' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>Colourize Only</button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-xs text-gray-500">Mode</p>
                        <p className="text-sm font-semibold text-[#1E1E1E]">{mode === 'restore' ? 'Auto Restore & Colourize' : 'Colourize Only'}</p>
                    </div>
                    <button onClick={() => setMobileControlsExpanded(true)} className="text-sm font-semibold text-[#0079F2] py-1 px-3 rounded-md hover:bg-blue-50">Change</button>
                </div>
            )}
            {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
        </div>
    );
    
    const MobileFooter = () => (
         <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
             {generatedImage ? (
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                        <DownloadIcon className="w-5 h-5" /> Download
                    </button>
                    <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                        <RetryIcon className="w-5 h-5" /> Regenerate
                    </button>
                </div>
            ) : (
                <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                    <SparklesIcon className="w-5 h-5" /> Generate
                </button>
            )}
         </div>
    );

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'><h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Colour</h2><p className="text-[#5F6368] mt-2">Breathe new life into your vintage black & white photos.</p></div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3"><div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5"><div className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`} onClick={!hasImage ? triggerFileInput : undefined}><input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />{generatedImage ? <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg" /> : originalImage ? <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" /> : <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}><div className="flex flex-col items-center gap-2 text-[#5F6368]"><UploadIcon className="w-12 h-12" /><span className='font-semibold text-lg text-[#1E1E1E]'>Upload your vintage photo</span><span className="text-sm">Minimum 512x512 pixels</span></div></div>}{hasImage && !isLoading && <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo"><ArrowUpCircleIcon className="w-6 h-6" /></button>}{isLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" /><p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p></div>}</div></div></div>
                    <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'><h3 className="text-xl font-bold text-[#1E1E1E]">Colourization Options</h3><p className='text-sm text-[#5F6368]'>Choose your enhancement level</p></div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">High-contrast, clear black & white photos give the best results. Blurry or low-res images may be less accurate.</p>
                            </div>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            <Controls />
                            {!hasImage && !isLoading && <p className="text-xs text-center text-[#5F6368] pt-4 border-t border-gray-200/80">Upload a photo to see the options.</p>}
                            {hasImage && <div className="pt-4 border-t border-gray-200/80"><ActionButtons/></div>}
                        </div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" /> Try Again</button></div>}
                    </div>
                    <MobileControls />
                </div>
                <MobileFooter />
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
        return saved ? parseInt(saved, 10) : 1;
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 1;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasImage = originalImage !== null;

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
        if (currentCredits < EDIT_COST) {
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
    }, [base64Data, currentCredits, auth, isGuest, navigateTo]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_transparent_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const hasInsufficientCredits = currentCredits < currentCost;
    
    const ActionButtons = () => (
        <div className="w-full space-y-2">
            {generatedImage ? (
                 <div className="w-full space-y-2">
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                        <DownloadIcon className="w-6 h-6" /> Download PNG
                    </button>
                    <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                        <UploadIcon className="w-5 h-5" /> Remove Another
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-full space-y-2">
                        <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                            <SparklesIcon className="w-6 h-6" /> Remove Background
                        </button>
                    </div>
                    <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get credits!' : 'Insufficient credits.') : `This costs ${currentCost} credit.`}</p>
                </>
            )}
        </div>
    );
    
    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Background Eraser</h2>
                    <p className="text-[#5F6368] mt-2">Remove backgrounds from any photo in a single click.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                                style={{
                                    backgroundImage: `
                                        linear-gradient(45deg, #e0e0e0 25%, transparent 25%), 
                                        linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
                                        linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
                                        linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)`,
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                }}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-[2px] rounded-xl"></div>
                                
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Transparent Background" className="max-h-full h-auto w-auto object-contain rounded-lg z-10" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg z-10" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'} z-10`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your photo here</span>
                                            <span className="text-sm">or click to upload</span>
                                        </div>
                                    </div>
                                )}

                                {hasImage && !isLoading && (
                                     <button onClick={triggerFileInput} className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"><ArrowUpCircleIcon className="w-6 h-6" /></button>
                                )}

                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-20">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'><h3 className="text-xl font-bold text-[#1E1E1E]">Actions</h3><p className='text-sm text-[#5F6368]'>Ready to go transparent?</p></div>
                        <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200/80 text-left">
                            <LightbulbIcon className="w-8 h-8 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold text-sm text-yellow-800">Pro Tip</p>
                                <p className="text-xs text-yellow-700">Images with a clear subject and a simple background work best for clean and accurate cutouts.</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-200/80">
                            <ActionButtons />
                        </div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>

                </div>
                 <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                    {generatedImage ? (
                        <ActionButtons />
                    ) : (
                        <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:opacity-50">
                            <SparklesIcon className="w-6 h-6" /> Remove Background
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    type ImageState = { file: File; url: string; base64: Base64File } | null;
    const [personImage, setPersonImage] = useState<ImageState>(null);
    const [topImage, setTopImage] = useState<ImageState>(null);
    const [pantsImage, setPantsImage] = useState<ImageState>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);

    const messageIntervalRef = useRef<number | null>(null);
    const personFileInputRef = useRef<HTMLInputElement>(null);


    const EDIT_COST = 3;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = auth.user?.credits ?? 0;
    const hasInsufficientCredits = currentCredits < EDIT_COST;

    const canGenerate = personImage && (topImage || pantsImage);

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
    
    const handlePersonFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const url = URL.createObjectURL(file);
            fileToBase64(file).then(base64File => {
                setPersonImage({ file, url, base64: base64File });
            });
            setError(null);
            setGeneratedImage(null);
        }
    };

    const handleGarmentFileChange = (file: File | undefined, setImageState: React.Dispatch<React.SetStateAction<ImageState>>) => {
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const url = URL.createObjectURL(file);
            fileToBase64(file).then(base64File => {
                setImageState({ file, url, base64: base64File });
            });
            setError(null);
            setGeneratedImage(null);
        }
    };
    
    const triggerPersonFileInput = () => {
        if (isLoading) return;
        personFileInputRef.current?.click();
    };

    const handleGenerate = useCallback(async () => {
        if (!canGenerate) {
            setError("Please upload a person's photo and at least one clothing item.");
            return;
        }
        if (hasInsufficientCredits) {
            navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const apparelItems: { type: string; base64: string; mimeType: string }[] = [];
            if (topImage) {
                apparelItems.push({ type: 'top', base64: topImage.base64.base64, mimeType: topImage.base64.mimeType });
            }
            if (pantsImage) {
                apparelItems.push({ type: 'pants', base64: pantsImage.base64.base64, mimeType: pantsImage.base64.mimeType });
            }

            if(personImage){
                const newBase64 = await generateApparelTryOn(personImage.base64.base64, personImage.base64.mimeType, apparelItems);
                setGeneratedImage(`data:image/png;base64,${newBase64}`);

                if (auth.user) {
                    const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                    auth.setUser(prevUser => prevUser ? { ...prevUser, credits: updatedProfile.credits } : null);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [personImage, topImage, pantsImage, hasInsufficientCredits, auth, navigateTo]);
    
    const handleStartOver = useCallback(() => {
        setPersonImage(null);
        setTopImage(null);
        setPantsImage(null);
        setGeneratedImage(null);
        setError(null);
        if (personFileInputRef.current) personFileInputRef.current.value = "";
    }, []);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_apparel_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);


    const ImageUploader: React.FC<{
        image: ImageState;
        onFileChange: (file: File | undefined) => void;
        title: string;
        icon: React.ReactNode;
        aspectRatio?: string;
        disabled?: boolean;
        onRemove?: () => void;
    }> = ({ image, onFileChange, title, icon, aspectRatio = 'aspect-[3/4]', disabled = false, onRemove }) => {
        const inputRef = useRef<HTMLInputElement>(null);
        return (
            <div className="flex-1 flex flex-col items-center">
                <div
                    onClick={() => !disabled && !image && inputRef.current?.click()}
                    className={`w-full ${aspectRatio} relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center transition-colors ${!disabled && !image ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
                >
                    <input type="file" ref={inputRef} onChange={(e) => onFileChange(e.target.files?.[0])} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={disabled}/>
                    {image ? (
                        <>
                            <img src={image.url} alt={title} className="w-full h-full object-contain rounded-lg" />
                             {onRemove && !disabled && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemove();
                                        if(inputRef.current) inputRef.current.value = "";
                                    }}
                                    className="absolute top-2 right-2 z-10 p-1 bg-black/50 rounded-full text-white hover:bg-black/75 transition-colors"
                                    aria-label={`Remove ${title}`}
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-center text-gray-500">
                            {icon}
                            <p className="text-xs mt-1">{title}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const ActionButtons = () => (
        <div className="w-full space-y-2">
            {generatedImage ? (
                <div className="w-full space-y-2">
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                        <DownloadIcon className="w-6 h-6" /> Download Image
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                         <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <RetryIcon className="w-5 h-5" /> Regenerate
                        </button>
                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                            <UploadIcon className="w-5 h-5" /> Start Over
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full space-y-2">
                    <button onClick={handleGenerate} disabled={!canGenerate || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5" /> Generate
                    </button>
                    <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                </div>
            )}
        </div>
    );
    

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Apparel</h2>
                    <p className="text-[#5F6368] mt-2">Virtually try on clothes in seconds.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Main Canvas */}
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!personImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!personImage ? triggerPersonFileInput : undefined}
                            >
                                <input type="file" ref={personFileInputRef} onChange={handlePersonFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated Apparel" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : personImage ? (
                                    <img src={personImage.url} alt="Person" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <AvatarUserIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Upload a photo of a person</span>
                                            <span className="text-sm">or click to select a file</span>
                                        </div>
                                    </div>
                                )}

                                {personImage && !isLoading && (
                                     <button
                                        onClick={triggerPersonFileInput}
                                        className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                        aria-label="Change photo"
                                    >
                                        <ArrowUpCircleIcon className="w-6 h-6" />
                                    </button>
                                )}

                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Control Panel */}
                    <div className="hidden lg:block lg:col-span-2 space-y-4">
                        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                            <h3 className="font-bold text-lg mb-4 text-[#1E1E1E]">1. Upload Garments</h3>
                            <div className={`grid grid-cols-2 gap-4 ${!personImage ? 'opacity-50' : ''}`}>
                                <ImageUploader image={topImage} onFileChange={(f) => handleGarmentFileChange(f, setTopImage)} title="Upload Top" icon={<GarmentTopIcon className="w-8 h-8"/>} aspectRatio="aspect-square" disabled={!personImage} onRemove={() => setTopImage(null)} />
                                <ImageUploader image={pantsImage} onFileChange={(f) => handleGarmentFileChange(f, setPantsImage)} title="Upload Pants" icon={<GarmentTrousersIcon className="w-8 h-8"/>} aspectRatio="aspect-square" disabled={!personImage} onRemove={() => setPantsImage(null)} />
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 space-y-4">
                             <h3 className="font-bold text-lg text-[#1E1E1E]">2. Generate</h3>
                            <ActionButtons />
                        </div>
                        {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                    </div>
                </div>

                 {/* Mobile Garment Uploader */}
                 <div className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 mt-8">
                    <h3 className="font-bold text-lg mb-4 text-[#1E1E1E] text-center">Upload Garments</h3>
                    <div className={`grid grid-cols-2 gap-4 ${!personImage ? 'opacity-50' : ''}`}>
                        <ImageUploader image={topImage} onFileChange={(f) => handleGarmentFileChange(f, setTopImage)} title="Upload Top" icon={<GarmentTopIcon className="w-8 h-8"/>} aspectRatio="aspect-square" disabled={!personImage} onRemove={() => setTopImage(null)} />
                        <ImageUploader image={pantsImage} onFileChange={(f) => handleGarmentFileChange(f, setPantsImage)} title="Upload Pants" icon={<GarmentTrousersIcon className="w-8 h-8"/>} aspectRatio="aspect-square" disabled={!personImage} onRemove={() => setPantsImage(null)} />
                    </div>
                 </div>


                 {/* Mobile Sticky Footer */}
                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                    {generatedImage ? (
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                <DownloadIcon className="w-5 h-5" /> Download
                            </button>
                            <button onClick={handleGenerate} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <RetryIcon className="w-5 h-5" /> Regenerate
                            </button>
                        </div>
                    ) : (
                        <div className="w-full space-y-2">
                            <button onClick={handleGenerate} disabled={!canGenerate || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                                <SparklesIcon className="w-5 h-5" /> Generate
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [mockupType, setMockupType] = useState<string>('T-shirt');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 2;
    const currentCost = EDIT_COST;

    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = auth.user?.credits ?? 0;
    const hasImage = originalImage !== null;
    const hasInsufficientCredits = currentCredits < currentCost;
    
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
            setError("Please upload your logo or design first.");
            return;
        }
        if (currentCredits < EDIT_COST) {
            navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const newBase64 = await generateMockup(base64Data.base64, base64Data.mimeType, mockupType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            if (auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, currentCost);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, mockupType, currentCredits, auth, navigateTo, currentCost]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_mockup_${mockupType.replace(/ /g, '_').toLowerCase()}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage, mockupType]);

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    const ActionButtons = () => (
        <div className="w-full space-y-2">
            {generatedImage ? (
                 <div className="w-full space-y-2">
                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                        <DownloadIcon className="w-6 h-6" /> Download Image
                    </button>
                    <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                        <UploadIcon className="w-5 h-5" /> Create Another Mockup
                    </button>
                </div>
            ) : (
                <>
                    <div className="w-full space-y-2">
                        <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                            <SparklesIcon className="w-6 h-6" /> Generate Mockup
                        </button>
                    </div>
                    <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${currentCost} credits.`}</p>
                </>
            )}
        </div>
    );

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Mockup</h2>
                    <p className="text-[#5F6368] mt-2">Generate realistic mockups for your designs in one click.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                {generatedImage ? (
                                    <img src={generatedImage} alt="Generated Mockup" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original Design" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your logo or design here</span>
                                            <span className="text-sm">or click to upload</span>
                                        </div>
                                    </div>
                                )}

                                {hasImage && !isLoading && (
                                     <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"><ArrowUpCircleIcon className="w-6 h-6" /></button>
                                )}

                                {isLoading && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                        <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium">{loadingMessage}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                            <h3 className="text-xl font-bold text-[#1E1E1E]">Mockup Options</h3>
                            <p className='text-sm text-[#5F6368]'>Select a mockup type</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            <div className={!hasImage ? 'opacity-50' : ''}>
                                <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mockup Type</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                    {mockupTypes.map(mt => (
                                        <button key={mt.key} onClick={() => setMockupType(mt.key)} disabled={!hasImage} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${mockupType === mt.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                            {mt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {hasImage && <div className="pt-4 border-t border-gray-200/80"><ActionButtons/></div>}
                        </div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" /> Try Again</button></div>}
                    </div>
                    
                    <div className="lg:hidden w-full bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-4 space-y-4">
                        <h3 className="text-lg font-bold text-center text-[#1E1E1E]">Controls</h3>
                        <div className={!hasImage ? 'opacity-50' : ''}>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mockup Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {mockupTypes.slice(0, 9).map(mt => (
                                    <button key={mt.key} onClick={() => setMockupType(mt.key)} disabled={!hasImage} className={`py-3 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${mockupType === mt.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50`}>{mt.label}</button>
                                ))}
                            </div>
                        </div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>
                </div>
                
                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                    <ActionButtons />
                </div>
            </div>
        </div>
    );
};

const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    type CaptionResult = { caption: string; hashtags: string };
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [generatedCaptions, setGeneratedCaptions] = useState<CaptionResult[] | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messageIntervalRef = useRef<number | null>(null);

    const EDIT_COST = 1;
    const currentCost = EDIT_COST;
    
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = auth.user?.credits ?? 0;
    const hasImage = originalImage !== null;
    const hasInsufficientCredits = currentCredits < currentCost;
    
    useEffect(() => {
        if (originalImage) {
            setBase64Data(null);
            setError(null);
            fileToBase64(originalImage.file).then(setBase64Data);
            setGeneratedCaptions(null); // Clear old captions on new image
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
            setError(null);
        }
    };
    
    const handleGenerate = useCallback(async () => {
        if (!base64Data) {
            setError("Please upload an image first.");
            return;
        }
        if (currentCredits < currentCost) {
            navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedCaptions(null);

        try {
            const results = await generateCaptions(base64Data.base64, base64Data.mimeType);
            setGeneratedCaptions(results);
            if (auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, currentCost);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [base64Data, currentCredits, auth, navigateTo, currentCost]);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const triggerFileInput = () => {
        if (isLoading) return;
        fileInputRef.current?.click();
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 h-full'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">CaptionAI</h2>
                    <p className="text-[#5F6368] mt-2">Generate engaging social media captions for any photo.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Image Uploader */}
                    <div className="w-full aspect-square bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div
                            className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                            onClick={!hasImage ? triggerFileInput : undefined}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                            {originalImage ? (
                                <img src={originalImage.url} alt="Uploaded for captions" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                            ) : (
                                <div className="text-center">
                                    <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                        <UploadIcon className="w-12 h-12" />
                                        <span className='font-semibold text-lg text-[#1E1E1E]'>Upload a Photo</span>
                                        <span className="text-sm">and we'll write the captions</span>
                                    </div>
                                </div>
                            )}
                            {hasImage && <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"><ArrowUpCircleIcon className="w-6 h-6" /></button>}
                        </div>
                    </div>

                    {/* Captions Display */}
                    <div className="w-full h-full min-h-[50vh] lg:aspect-square flex flex-col">
                        <div className="flex-1 bg-white rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-500/5 p-6 space-y-4 overflow-y-auto">
                            <h3 className="text-xl font-bold text-center text-[#1E1E1E]">Generated Captions</h3>
                            {isLoading ? (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg p-4 text-center z-10">
                                    <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                    <p aria-live="polite" className="mt-4 text-[#1E1E1E] font-medium transition-opacity duration-300">{loadingMessage}</p>
                                </div>
                            ) : error ? (
                                <div className='w-full flex flex-col items-center justify-center gap-4 pt-4'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={() => { setError(null); handleGenerate();}} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>
                            ) : generatedCaptions ? (
                                <div className="space-y-4">
                                    {generatedCaptions.map((item, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200/80">
                                            <p className="text-sm text-gray-800">{item.caption}</p>
                                            <p className="text-xs text-blue-600 mt-2 font-medium">{item.hashtags}</p>
                                            <button onClick={() => handleCopy(`${item.caption}\n\n${item.hashtags}`, index)} className="mt-3 text-xs font-bold flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors">
                                                {copiedIndex === index ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                                {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                    <InformationCircleIcon className="w-10 h-10 mb-2"/>
                                    <p className="font-semibold">Your captions will appear here.</p>
                                    <p className="text-sm">Upload an image and click "Generate".</p>
                                </div>
                            )}
                        </div>
                        <div className="hidden lg:block pt-8">
                             <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                                <SparklesIcon className="w-5 h-5" /> {generatedCaptions ? 'Regenerate' : 'Generate'} Captions
                            </button>
                            <p className={`text-xs text-center pt-2 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${currentCost} credit.`}</p>
                        </div>
                    </div>
                </div>

                {/* Mobile Sticky Footer */}
                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
                     <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5" /> {generatedCaptions ? 'Regenerate' : 'Generate'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Creations: React.FC = () => (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
        <div className='mb-8'>
            <h2 className="text-3xl font-bold text-[#1E1E1E]">My Creations</h2>
            <p className="text-[#5F6368] mt-1">A gallery of all your magical creations.</p>
        </div>
         <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
             <ProjectsIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
             <h3 className="text-xl font-bold text-[#1E1E1E]">Coming Soon!</h3>
             <p className="text-[#5F6368] mt-2 max-w-sm mx-auto">We're hard at work building this space. Soon, all your generated images and projects will be saved and organized right here for you to access anytime.</p>
        </div>
    </div>
);

const Profile: React.FC<{ user: User | null, auth: AuthProps, openEditProfileModal: () => void }> = ({ user, auth, openEditProfileModal }) => (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
        <div className='mb-8'>
            <h2 className="text-3xl font-bold text-[#1E1E1E]">My Profile</h2>
            <p className="text-[#5F6368] mt-1">Manage your account settings.</p>
        </div>
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
            <div className="flex flex-col items-center text-center">
                 <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-[#0079F2] font-bold text-4xl mb-4">
                    {user?.avatar}
                </div>
                <h3 className="text-2xl font-bold text-[#1E1E1E]">{user?.name}</h3>
                <p className="text-[#5F6368]">{user?.email}</p>
                <div className="mt-6 w-full space-y-4">
                    <button onClick={openEditProfileModal} className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                       <PencilIcon className="w-4 h-4" /> Edit Profile
                    </button>
                     <button onClick={auth.handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                       <LogoutIcon className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const MagicConversation: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    // ... State management for conversation ...
    const [isRecording, setIsRecording] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptions, setTranscriptions] = useState<{ type: 'user' | 'model'; text: string }[]>([]);

    const sessionRef = useRef<any>(null); // Using `any` due to no exported LiveSession type
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const transcriptContainerRef = useRef<HTMLDivElement>(null);
    const currentInputTranscription = useRef('');
    const currentOutputTranscription = useRef('');
    
    useEffect(() => {
        if(transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcriptions]);

    const stopAudioPlayback = () => {
        if(sourcesRef.current) {
            for (const source of sourcesRef.current.values()) {
                source.stop();
                sourcesRef.current.delete(source);
            }
        }
        nextStartTimeRef.current = 0;
    };

    const stopAudioProcessing = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
        }
    }, []);

    const cleanup = useCallback(() => {
        setIsRecording(false);
        setIsConnecting(false);
        stopAudioPlayback();
        stopAudioProcessing();

        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
    }, [stopAudioProcessing]);

    const handleStart = async () => {
        if (isRecording) return;
        setIsConnecting(true);
        setError(null);
        setTranscriptions([]);
        
        try {
            // Initialize Audio Contexts
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputNodeRef.current = outputAudioContextRef.current.createGain();
            outputNodeRef.current.connect(outputAudioContextRef.current.destination);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const sessionPromise = startLiveSession({
                 onopen: () => {
                    if (!inputAudioContextRef.current) return;
                    mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
                    scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob: Blob = {
                            data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                         sessionPromise.then((session) => {
                           session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                    scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    setIsConnecting(false);
                    setIsRecording(true);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                    }
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscription.current += message.serverContent.inputTranscription.text;
                    }

                    if (message.serverContent?.turnComplete) {
                        setTranscriptions(prev => [
                            ...prev, 
                            { type: 'user', text: currentInputTranscription.current },
                            { type: 'model', text: currentOutputTranscription.current }
                        ]);
                        currentInputTranscription.current = '';
                        currentOutputTranscription.current = '';
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
                        const ctx = outputAudioContextRef.current;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                        
                        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                        const source = ctx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNodeRef.current);
                        
                        source.addEventListener('ended', () => {
                            sourcesRef.current.delete(source);
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        sourcesRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Live session error:", e);
                    setError("A connection error occurred. Please try again.");
                    cleanup();
                },
                onclose: (e: CloseEvent) => {
                    cleanup();
                },
            });

            sessionRef.current = await sessionPromise;

        } catch (err) {
            console.error("Failed to start session:", err);
            setError("Could not access microphone. Please check permissions and try again.");
            setIsConnecting(false);
        }
    };
    
    const handleStop = () => {
        cleanup();
    };

    return (
        <div className={`fixed inset-x-0 bottom-0 z-[60] lg:inset-auto lg:bottom-8 lg:right-8 lg:w-96 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-[calc(100%+2rem)]'}`}>
            <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-2xl border border-gray-200/80 max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200/80">
                    <h3 className="font-bold text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-blue-500" /> Magic Conversation</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"><XIcon className="w-5 h-5"/></button>
                </div>

                {/* Body / Transcript */}
                <div ref={transcriptContainerRef} className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {transcriptions.length === 0 && !isRecording && !isConnecting && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <p>Tap the microphone to start a conversation with Pixa.</p>
                        </div>
                    )}
                     {transcriptions.map((item, index) => (
                         <div key={index} className={`flex items-start gap-3 ${item.type === 'user' ? 'justify-end' : ''}`}>
                             {item.type === 'model' && <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0"><SparklesIcon className="w-5 h-5 text-blue-500"/></div>}
                             <div className={`max-w-xs px-4 py-2 rounded-2xl ${item.type === 'user' ? 'bg-gray-200 text-gray-800 rounded-br-none' : 'bg-blue-500 text-white rounded-bl-none'}`}>
                                 <p className="text-sm">{item.text}</p>
                             </div>
                         </div>
                     ))}
                </div>

                {/* Footer / Controls */}
                <div className="p-4 border-t border-gray-200/80">
                     {error && <p className="text-center text-sm text-red-600 mb-2">{error}</p>}
                    <div className="flex justify-center items-center">
                        <button 
                            onClick={isRecording ? handleStop : handleStart} 
                            disabled={isConnecting}
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-colors duration-300 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} disabled:bg-gray-400`}
                        >
                            {isConnecting ? 
                                <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                : isRecording ? <StopIcon className="w-7 h-7" /> : <MicrophoneIcon className="w-7 h-7" />
                            }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MobileNav: React.FC<{ activeView: View; setActiveView: (view: View) => void; auth: AuthProps }> = ({ activeView, setActiveView, auth }) => {
    const handleNav = (view: View) => {
        if (!auth.isAuthenticated) {
            auth.openAuthModal();
        } else {
            setActiveView(view);
        }
    };

    const navItems: { view: View; label: string; icon: React.FC<{ className?: string }>; disabled?: boolean }[] = [
        { view: 'home_dashboard', label: 'Home', icon: HomeIcon },
        { view: 'dashboard', label: 'Features', icon: DashboardIcon },
        { view: 'creations', label: 'Projects', icon: ProjectsIcon, disabled: true },
        { view: 'profile', label: 'Profile', icon: AvatarUserIcon },
    ];
    
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/80 backdrop-blur-lg border-t border-gray-200/80 z-[100] lg:hidden">
            <div className="flex justify-around items-center h-full">
                {navItems.map(item => (
                    <button 
                        key={item.label} 
                        onClick={() => handleNav(item.view)} 
                        disabled={item.disabled} 
                        className={`flex flex-col items-center justify-center gap-1 p-2 w-1/4 h-full transition-colors ${activeView === item.view ? 'text-blue-600' : 'text-gray-500'} disabled:text-gray-300`}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


export const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard': return <MobileDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'home_dashboard': return <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'studio': return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} />;
      case 'interior': return <MagicInterior auth={auth} navigateTo={navigateTo} />;
      case 'billing': return auth.user ? <Billing user={auth.user} setUser={auth.setUser} /> : null;
      case 'colour': return <MagicPhotoColour auth={auth} navigateTo={navigateTo} />;
      case 'eraser': return <MagicBackgroundEraser auth={auth} navigateTo={navigateTo} />;
      case 'apparel': return <MagicApparel auth={auth} navigateTo={navigateTo} />;
      case 'mockup': return <MagicMockup auth={auth} navigateTo={navigateTo} />;
      case 'caption': return <CaptionAI auth={auth} navigateTo={navigateTo} />;
      case 'creations': return <Creations />;
      case 'profile': return <Profile user={auth.user} auth={auth} openEditProfileModal={openEditProfileModal} />;
      default: return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
    }
  };
  
  const showBackButton = ![
      'dashboard', 'home_dashboard', 'creations', 'billing', 'profile'
  ].includes(activeView);

  const handleBack = () => {
      setActiveView('dashboard');
  };
  
  const headerAuthProps = {
    ...auth,
    setActiveView,
    openConversation: () => setIsConversationOpen(true),
    isDashboard: true,
    isSidebarOpen,
    setIsSidebarOpen,
    showBackButton,
    handleBack,
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col lg:flex-row">
      <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col w-full">
        <Header navigateTo={navigateTo} auth={headerAuthProps} />
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-0">
          {renderActiveView()}
        </main>
        {auth.isAuthenticated && (
            <>
                <MagicConversation isOpen={isConversationOpen} onClose={() => setIsConversationOpen(false)} />
                <MobileNav activeView={activeView} setActiveView={setActiveView} auth={auth}/>
            </>
        )}
      </div>
    </div>
  );
};
