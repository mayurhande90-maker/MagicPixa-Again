import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User } from './types';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, generateMagicSoul, generateApparelTryOn, generateMockup, generateCaptions, generateSupportResponse } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import ThemeToggle from './components/ThemeToggle';
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon, ShieldCheckIcon, DocumentTextIcon, FlagIcon
} from './components/icons';
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
    { view: 'soul', title: 'Magic Soul', icon: UsersIcon, gradient: 'from-pink-400 to-pink-500' },
    { view: 'colour', title: 'Photo Colour', icon: PaletteIcon, gradient: 'from-rose-400 to-rose-500' },
    { view: 'caption', title: 'CaptionAI', icon: CaptionIcon, gradient: 'from-amber-400 to-amber-500' },
    { view: 'interior', title: 'Interior AI', icon: HomeIcon, gradient: 'from-orange-400 to-orange-500' },
    { view: 'apparel', title: 'Apparel AI', icon: UsersIcon, gradient: 'from-teal-400 to-teal-500' },
    { view: 'mockup', title: 'Mockup AI', icon: MockupIcon, gradient: 'from-indigo-400 to-indigo-500' },
    { view: 'creations', title: 'Coming Soon', icon: ProjectsIcon, gradient: 'from-gray-400 to-gray-500', disabled: true },
];

interface ImageModalProps {
    imageUrl: string;
    onClose: () => void;
}
  
const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            aria-labelledby="image-modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white bg-gray-800 rounded-full p-2 hover:bg-black transition-colors z-20"
                aria-label="Close"
            >
                <XIcon className="w-6 h-6" />
            </button>
            <div
                className="relative w-full max-w-5xl max-h-full"
                onClick={e => e.stopPropagation()}
            >
                <img src={imageUrl} alt="Generated result in full size" className="w-full h-full object-contain rounded-lg" style={{ maxHeight: '90vh' }}/>
            </div>
        </div>
    );
};

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
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    
    const [theme, setTheme] = useState<string>('automatic');
    
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
            setIsPanelOpen(true);
        }
    };

    const handleStartOver = useCallback(() => {
        setGeneratedImage(null);
        setError(null);
        setOriginalImage(null);
        setBase64Data(null);
        setTheme('automatic');
        setIsPanelOpen(false);
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

        setIsPanelOpen(false);
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);
        
        try {
            const newBase64 = await editImageWithPrompt(base64Data.base64, base64Data.mimeType, theme);
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
    }, [base64Data, theme, currentCredits, auth, isGuest, navigateTo]);


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
    
    const themes = [
        { key: 'automatic', label: 'Automatic', icon: <SparklesIcon className="w-5 h-5"/> },
        { key: 'minimalist', label: 'Minimalist', icon: <MinimalistIcon className="w-5 h-5"/> },
        { key: 'natural', label: 'Natural', icon: <LeafIcon className="w-5 h-5"/> },
        { key: 'geometric', label: 'Geometric', icon: <CubeIcon className="w-5 h-5"/> },
        { key: 'luxe', label: 'Luxe', icon: <DiamondIcon className="w-5 h-5"/> },
        { key: 'outdoor', label: 'Outdoor', icon: <SunIcon className="w-5 h-5"/> },
    ];
    
    const DesktopControlPanel = () => (
        <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-4">
            <div className='text-center'>
                <h3 className="text-xl font-bold text-[#1E1E1E]">Control Panel</h3>
                <p className='text-sm text-[#5F6368]'>Your creative cockpit</p>
            </div>
            
            {!hasImage ? (
                <div className='flex-1 flex flex-col items-center justify-center text-center p-4 border-t border-gray-200/80'>
                    <PhotoStudioIcon className="w-12 h-12 text-gray-300 mb-2"/>
                    <p className="text-sm text-[#5F6368]">Upload a photo to begin styling your scene.</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col space-y-6 pt-4 border-t border-gray-200/80">
                    {/* THEME SELECTOR */}
                    <div>
                        <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Scene Theme</label>
                        <div className="grid grid-cols-3 gap-2">
                            {themes.map(t => (
                                <button key={t.key} onClick={() => setTheme(t.key)} className={`flex flex-col items-center justify-center gap-1.5 p-2 text-xs font-semibold rounded-lg border-2 transition-colors ${theme === t.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* ACTION BUTTONS */}
                    <div className="flex-1 flex flex-col justify-end">
                        <div className="space-y-2 pt-4 border-t border-gray-200/80">
                            {generatedImage ? (
                                <>
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md">
                                        <DownloadIcon className="w-6 h-6" /> Download
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                            <RetryIcon className="w-5 h-5" /> Try Another Look
                                        </button>
                                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                            <UploadIcon className="w-5 h-5" /> Start Over
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] hover:scale-105 transform transition-all duration-300 text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                                    <SparklesIcon className="w-6 h-6" /> Generate Scene
                                </button>
                            )}
                             <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to get 10 free credits!' : 'Insufficient credits.') : `This generation will cost ${EDIT_COST} credits.`}</p>
                        </div>
                    </div>
                </div>
            )}
             {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
        </div>
    );

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Studio</h2>
                    <p className="text-[#5F6368] mt-2">Transform your product photos into studio-quality images.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center overflow-hidden ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                                role={!hasImage ? 'button' : undefined} 
                                tabIndex={!hasImage ? 0 : -1} 
                                aria-label={!hasImage ? "Upload an image" : ""}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
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
                                    <div className='absolute top-3 right-3 z-20 flex flex-col gap-2'>
                                         <button
                                            onClick={triggerFileInput}
                                            className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                            aria-label="Change photo"
                                            title="Change photo"
                                        >
                                            <ArrowUpCircleIcon className="w-6 h-6" />
                                        </button>
                                    </div>
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
                    
                    {/* Mobile Unified Control Area */}
                    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div 
                            onClick={() => hasImage && setIsPanelOpen(!isPanelOpen)}
                            className={`w-full py-2 flex justify-center ${hasImage ? 'cursor-pointer' : ''}`}
                            aria-controls="mobile-controls-panel-studio"
                            aria-expanded={isPanelOpen}
                        >
                            {hasImage ? (isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>) : <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>}
                        </div>

                        <div id="mobile-controls-panel-studio" className={`px-4 transition-all duration-300 ease-in-out overflow-hidden ${isPanelOpen && hasImage ? 'max-h-96 pb-4' : 'max-h-0'}`}>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2 text-center">Scene Theme</label>
                            <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                                {themes.map(t => (
                                    <button key={t.key} onClick={() => setTheme(t.key)} className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 w-20 text-xs font-semibold rounded-lg border-2 transition-colors ${theme === t.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300'}`}>
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200/80">
                            {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                            {generatedImage ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                        <DownloadIcon className="w-5 h-5" /> Download
                                    </button>
                                    <button onClick={handleImageEdit} disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                        <RetryIcon className="w-5 h-5" /> Another Look
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
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
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
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
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
            setIsPanelOpen(true);
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
        setIsPanelOpen(false);
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

        setIsPanelOpen(false);
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
                        <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'} gap-2`}>
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

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
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
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated Interior" className="max-h-full h-auto w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
                                )
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
                    
                    {/* Mobile Unified Control Area */}
                    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div 
                            onClick={() => hasImage && setIsPanelOpen(!isPanelOpen)}
                            className={`w-full py-2 flex justify-center ${hasImage ? 'cursor-pointer' : ''}`}
                            aria-controls="mobile-controls-panel-interior"
                            aria-expanded={isPanelOpen}
                        >
                            {hasImage ? (isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>) : <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>}
                        </div>

                        <div id="mobile-controls-panel-interior" className={`px-4 transition-all duration-300 ease-in-out overflow-y-auto ${isPanelOpen && hasImage ? 'max-h-[50vh] pb-4' : 'max-h-0'}`}>
                            <Controls isMobile={true}/>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200/80">
                            {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                            <ActionButtons />
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
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
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    setIsPanelOpen(true);
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
        setIsPanelOpen(false);
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

        setIsPanelOpen(false);
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

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
             <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Photo Colour</h2>
                    <p className="text-[#5F6368] mt-2">Breathe new life into vintage photos by colourizing and restoring them.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3">
                         <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                                
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                                ) : (
                                    <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                            <UploadIcon className="w-12 h-12" />
                                            <span className='font-semibold text-lg text-[#1E1E1E]'>Drop your B&W photo here</span>
                                            <span className="text-sm">or click to upload</span>
                                        </div>
                                    </div>
                                )}

                                {hasImage && !isLoading && (
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
                    
                    <div className="hidden lg:col-span-2 lg:flex lg:flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div className='text-center'>
                            <h3 className="text-xl font-bold text-[#1E1E1E]">Controls</h3>
                            <p className='text-sm text-[#5F6368]'>Select colourization mode</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-gray-200/80">
                            <Controls />
                            {hasImage && <div className="pt-4 border-t border-gray-200/80"><ActionButtons/></div>}
                        </div>
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>
                    
                    {/* Mobile Unified Control Area */}
                    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div 
                            onClick={() => hasImage && setIsPanelOpen(!isPanelOpen)}
                            className={`w-full py-2 flex justify-center ${hasImage ? 'cursor-pointer' : ''}`}
                            aria-controls="mobile-controls-panel-colour"
                            aria-expanded={isPanelOpen}
                        >
                            {hasImage ? (isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>) : <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>}
                        </div>

                        <div id="mobile-controls-panel-colour" className={`px-4 transition-all duration-300 ease-in-out overflow-hidden ${isPanelOpen && hasImage ? 'max-h-96 pb-4' : 'max-h-0'}`}>
                           <Controls />
                        </div>
                        
                        <div className="p-4 border-t border-gray-200/80">
                            {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                            <ActionButtons />
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
        </div>
    );
};

const MagicSoul: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [personA, setPersonA] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [style, setStyle] = useState('romantic');
    const [environment, setEnvironment] = useState('sunny');

    const fileInputARef = useRef<HTMLInputElement>(null);
    const fileInputBRef = useRef<HTMLInputElement>(null);
    
    const EDIT_COST = 3;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-soul') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-soul')!, 10) : 3);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const hasImages = personA !== null && personB !== null;

    const soulStyles = [{key: 'romantic', label: 'Romantic'}, {key: 'adventurous', label: 'Adventurous'}, {key: 'fun', label: 'Fun'}, {key: 'formal', label: 'Formal'}, {key: 'cinematic', label: 'Cinematic'}, {key: 'artistic', label: 'Artistic'}];
    const soulEnvironments = [{key: 'sunny', label: 'Sunny'}, {key: 'rainy', label: 'Rainy'}, {key: 'snowy', label: 'Snowy'}, {key: 'beach', label: 'Beach'}, {key: 'mountain', label: 'Mountain'}, {key: 'urban', label: 'Urban'}, {key: 'indoor', label: 'Indoor'}, {key: 'night city lights', label: 'Night City'}, {key: 'forest', label: 'Forest'}];

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-soul', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_soul_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, person: 'A' | 'B') => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            if (person === 'A') setPersonA(data);
            else setPersonB(data);
            setGeneratedImage(null);
            setError(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!personA || !personB) {
            setError("Please upload photos for both people.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsPanelOpen(false);
        setIsLoading(true);
        setError(null);
        
        try {
            const newBase64 = await generateMagicSoul(personA.base64.base64, personA.base64.mimeType, personB.base64.base64, personB.base64.mimeType, style, environment);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartOver = () => {
        setPersonA(null);
        setPersonB(null);
        setGeneratedImage(null);
        setError(null);
        setIsPanelOpen(true);
        if (fileInputARef.current) fileInputARef.current.value = "";
        if (fileInputBRef.current) fileInputBRef.current.value = "";
    };

    const ImageUploadBox: React.FC<{
        image: { url: string } | null;
        inputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        title: string;
        isSquare?: boolean;
    }> = ({ image, inputRef, onFileChange, title, isSquare = false }) => {
        const triggerFileInput = () => inputRef.current?.click();
        return (
            <div className={`relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`} onClick={!image ? triggerFileInput : undefined}>
                <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                {image ? (
                    <>
                        <img src={image.url} alt={title} className="w-full h-full object-cover" />
                        <button onClick={triggerFileInput} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title={`Change ${title}`}><ArrowUpCircleIcon className="w-5 h-5" /></button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500 p-2"><UploadIcon className="w-8 h-8" /><span className="font-semibold text-sm text-gray-700">{title}</span></div>
                )}
            </div>
        );
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Soul</h2>
                    <p className="text-[#5F6368] mt-2">Combine two people into one hyper-realistic photo.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3 w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5 flex items-center justify-center">
                        {isLoading ? <div className="text-center"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Creating your magic moment...</p></div>
                        : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-contain rounded-lg"/></div>
                        : <div className="text-center text-gray-400"><UsersIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your generated photo will appear here.</p></div>}
                    </div>

                    <div className="hidden lg:col-span-2 lg:flex flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <ImageUploadBox image={personA} inputRef={fileInputARef} onFileChange={e => handleFileChange(e, 'A')} title="Upload Person A" isSquare={true}/>
                            <ImageUploadBox image={personB} inputRef={fileInputBRef} onFileChange={e => handleFileChange(e, 'B')} title="Upload Person B" isSquare={true}/>
                        </div>
                        <div className={!hasImages ? 'opacity-50' : ''}>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Style</label>
                            <div className="grid grid-cols-3 gap-2">
                                {soulStyles.map(s => (
                                    <button key={s.key} onClick={() => setStyle(s.key)} disabled={!hasImages} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${style === s.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className={!hasImages ? 'opacity-50' : ''}>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Environment</label>
                            <div className="grid grid-cols-3 gap-2">
                                {soulEnvironments.map(e => (
                                    <button key={e.key} onClick={() => setEnvironment(e.key)} disabled={!hasImages} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${environment === e.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                        {e.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-gray-200/80">
                            {generatedImage ? (
                                <>
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg">
                                        <DownloadIcon className="w-5 h-5"/> Download
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] font-bold py-2 rounded-lg disabled:opacity-50">
                                            <RetryIcon className="w-5 h-5"/> Regenerate
                                        </button>
                                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 font-bold py-2 rounded-lg">
                                            <UploadIcon className="w-5 h-5"/> Start Over
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/> Generate
                                </button>
                            )}
                            <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                        </div>
                        {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                    </div>

                    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div onClick={() => setIsPanelOpen(!isPanelOpen)} className="w-full py-2 flex justify-center cursor-pointer" aria-controls="mobile-controls-panel-soul" aria-expanded={isPanelOpen}>
                            {isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>}
                        </div>
                        <div id="mobile-controls-panel-soul" className={`px-4 transition-all duration-300 ease-in-out overflow-y-auto ${isPanelOpen ? 'max-h-[50vh] pb-4' : 'max-h-0'}`}>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <ImageUploadBox image={personA} inputRef={fileInputARef} onFileChange={e => handleFileChange(e, 'A')} title="Upload Person A" isSquare={true}/>
                                <ImageUploadBox image={personB} inputRef={fileInputBRef} onFileChange={e => handleFileChange(e, 'B')} title="Upload Person B" isSquare={true}/>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Style</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {soulStyles.map(s => (
                                            <button key={s.key} onClick={() => setStyle(s.key)} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${style === s.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300'}`}>
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Environment</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {soulEnvironments.map(e => (
                                            <button key={e.key} onClick={() => setEnvironment(e.key)} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${environment === e.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300'}`}>
                                                {e.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200/80">
                           {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                           {generatedImage ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 font-bold py-3 px-4 rounded-xl"><DownloadIcon className="w-5 h-5"/> Download</button>
                                    <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg disabled:opacity-50"><RetryIcon className="w-5 h-5"/> Regenerate</button>
                                </div>
                           ) : (
                                <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/> Generate
                                </button>
                           )}
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (<ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />)}
        </div>
    );
};

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [personImage, setPersonImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [topImage, setTopImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [bottomImage, setBottomImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const personFileInputRef = useRef<HTMLInputElement>(null);
    const topFileInputRef = useRef<HTMLInputElement>(null);
    const bottomFileInputRef = useRef<HTMLInputElement>(null);
    
    const EDIT_COST = 3;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-apparel') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-apparel')!, 10) : 2);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const hasImage = personImage !== null;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-apparel', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleDownloadClick = useCallback(() => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `magicpixa_apparel_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [generatedImage]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'person' | 'top' | 'bottom') => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            if (type === 'person') {
                setPersonImage(data);
                setGeneratedImage(null);
                setIsPanelOpen(true);
            }
            else if (type === 'top') setTopImage(data);
            else if (type === 'bottom') setBottomImage(data);
            setError(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!personImage) {
            setError("Please upload a photo of a person.");
            return;
        }
        if (!topImage && !bottomImage) {
            setError("Please upload at least one clothing item.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsPanelOpen(false);
        setIsLoading(true);
        setError(null);
        
        const apparelItems: { type: string; base64: string; mimeType: string }[] = [];
        if (topImage) apparelItems.push({ type: 'top', ...topImage.base64 });
        if (bottomImage) apparelItems.push({ type: 'bottom', ...bottomImage.base64 });

        try {
            const newBase64 = await generateApparelTryOn(personImage.base64.base64, personImage.base64.mimeType, apparelItems);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartOver = () => {
        setPersonImage(null);
        setTopImage(null);
        setBottomImage(null);
        setGeneratedImage(null);
        setError(null);
        setIsPanelOpen(false);
    };
    
    const ImageUploadBox: React.FC<{
        image: { url: string } | null;
        inputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        title: string;
        isSquare?: boolean;
    }> = ({ image, inputRef, onFileChange, title, isSquare = false }) => {
        const triggerFileInput = () => inputRef.current?.click();
    
        return (
            <div
                className={`relative w-full ${isSquare ? 'aspect-square' : 'py-8'} bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`}
                onClick={!image ? triggerFileInput : undefined}
            >
                <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                {image ? (
                    <>
                        <img src={image.url} alt={title} className="w-full h-full object-cover" />
                        <button
                            onClick={triggerFileInput}
                            className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                            aria-label={`Change ${title}`}
                            title={`Change ${title}`}
                        >
                            <ArrowUpCircleIcon className="w-6 h-6" />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-[#5F6368] p-2">
                        <UploadIcon className="w-10 h-10" />
                        <span className="font-semibold text-base text-[#1E1E1E]">{title}</span>
                        <span className="text-sm">Click to upload</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Apparel</h2>
                    <p className="text-[#5F6368] mt-2">Virtually try on clothes on any person from a photo.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch">
                    {/* Left Column: Main Image Area */}
                    <div className="lg:col-span-3">
                        <div className="w-full h-full bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                            <div
                                className={`relative w-full aspect-[4/3] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!personImage && !isLoading ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`}
                                onClick={!personImage && !isLoading ? () => personFileInputRef.current?.click() : undefined}
                            >
                                <input type="file" ref={personFileInputRef} onChange={e => handleFileChange(e, 'person')} className="hidden" accept="image/*" />

                                {isLoading ? (
                                    <div className="text-center">
                                        <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto" />
                                        <p className="mt-4 font-medium">Generating your look...</p>
                                    </div>
                                ) : generatedImage ? (
                                    <div className="relative w-full h-full">
                                        <img src={generatedImage} alt="Virtual Try-On" className="w-full h-full object-contain" />
                                        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                                            <button
                                                onClick={() => setIsModalOpen(true)}
                                                className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                                aria-label="Zoom in" title="Zoom in"
                                            >
                                                <PlusCircleIcon className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={handleStartOver}
                                                className="p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                                aria-label="Start Over" title="Start Over"
                                            >
                                                <RetryIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ) : personImage ? (
                                    <div className="relative w-full h-full">
                                        <img src={personImage.url} alt="Person" className="w-full h-full object-contain" />
                                        <button
                                            onClick={() => personFileInputRef.current?.click()}
                                            className="absolute top-3 right-3 z-20 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md"
                                            aria-label="Change Person Photo"
                                            title="Change Person Photo"
                                        >
                                            <ArrowUpCircleIcon className="w-6 h-6" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-[#5F6368] p-4">
                                        <UsersIcon className="w-16 h-16" />
                                        <span className="font-semibold text-lg text-[#1E1E1E]">Upload a photo of a person</span>
                                        <span className="text-sm">Click here to start</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Right Column: Controls */}
                    <div className="hidden lg:block lg:col-span-2">
                         <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-lg shadow-gray-500/5 space-y-6 h-full flex flex-col">
                            <div>
                                <h3 className="text-xl font-bold text-[#1E1E1E] text-center mb-1">Controls</h3>
                                <p className="text-sm text-[#5F6368] text-center">Upload clothing items</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploadBox image={topImage} inputRef={topFileInputRef} onFileChange={e => handleFileChange(e, 'top')} title="Upload Top" isSquare={true} />
                                <ImageUploadBox image={bottomImage} inputRef={bottomFileInputRef} onFileChange={e => handleFileChange(e, 'bottom')} title="Upload Bottom" isSquare={true} />
                            </div>
                            <div className="flex-grow"></div>
                            <div className="space-y-2 pt-6 border-t border-gray-200/80">
                                <button onClick={handleGenerate} disabled={isLoading || !personImage || (!topImage && !bottomImage) || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/> Generate Try-On
                                </button>
                                <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                            </div>
                            {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                         </div>
                    </div>

                    {/* Mobile Unified Control Area */}
                    <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                        <div 
                            onClick={() => hasImage && setIsPanelOpen(!isPanelOpen)}
                            className={`w-full py-2 flex justify-center ${hasImage ? 'cursor-pointer' : ''}`}
                            aria-controls="mobile-controls-panel-apparel"
                            aria-expanded={isPanelOpen}
                        >
                            {hasImage ? (isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>) : <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>}
                        </div>

                        <div id="mobile-controls-panel-apparel" className={`px-4 transition-all duration-300 ease-in-out overflow-hidden ${isPanelOpen && hasImage ? 'max-h-96 pb-4' : 'max-h-0'}`}>
                            <h3 className="text-lg font-bold text-[#1E1E1E] text-center mb-3">Upload Clothing</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <ImageUploadBox image={topImage} inputRef={topFileInputRef} onFileChange={e => handleFileChange(e, 'top')} title="Upload Top" isSquare={true} />
                                <ImageUploadBox image={bottomImage} inputRef={bottomFileInputRef} onFileChange={e => handleFileChange(e, 'bottom')} title="Upload Bottom" isSquare={true} />
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-200/80">
                           {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                           {generatedImage ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                        <DownloadIcon className="w-5 h-5" /> Download
                                    </button>
                                    <button onClick={handleStartOver} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 hover:bg-gray-100 font-bold py-3 px-4 rounded-xl transition-colors">
                                        <RetryIcon className="w-5 h-5" /> Start Over
                                    </button>
                                </div>
                           ) : (
                                <button onClick={handleGenerate} disabled={isLoading || !personImage || (!topImage && !bottomImage) || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                    <SparklesIcon className="w-5 h-5"/> Generate Try-On
                                </button>
                           )}
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-mockup') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-mockup')!, 10) : 2);

    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const EDIT_COST = 2;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const hasImage = originalImage !== null;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-mockup', guestCredits.toString());
    }, [isGuest, guestCredits]);

    useEffect(() => {
        if (originalImage) {
            fileToBase64(originalImage.file).then(setBase64Data);
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
            setIsPanelOpen(true);
        }
    };

    const handleGenerate = async () => {
        if (!base64Data) {
            setError("Please upload a logo or design.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsPanelOpen(false);
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const newBase64 = await generateMockup(base64Data.base64, base64Data.mimeType, mockupType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStartOver = () => {
        setOriginalImage(null);
        setGeneratedImage(null);
        setError(null);
        setIsPanelOpen(false);
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Mockup</h2>
                    <p className="text-[#5F6368] mt-2">Generate realistic mockups for your designs instantly.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="lg:col-span-3">
                        <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5 flex items-center justify-center">
                            {isLoading ? (
                                <div className="text-center"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Generating your mockup...</p></div>
                            ) : generatedImage ? (
                                <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                    <img src={generatedImage} alt="Generated Mockup" className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"/>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400"><MockupIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your generated mockup will appear here.</p></div>
                            )}
                        </div>
                        {generatedImage && <button onClick={handleStartOver} className="w-full mt-4 py-2 text-sm text-gray-600 hover:text-black">Start Over</button>}
                    </div>
                    <div className="lg:col-span-2 space-y-6 hidden lg:block">
                        <div className="bg-white p-4 rounded-xl border">
                            <h3 className="font-bold mb-2">1. Upload your design</h3>
                            <div onClick={triggerFileInput} className="cursor-pointer aspect-video bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center text-center text-gray-500 hover:border-[#0079F2] p-4">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*"/>
                                {originalImage ? <img src={originalImage.url} alt="Uploaded design" className="max-h-full object-contain"/> : <span>+ Upload Logo/Design</span>}
                            </div>
                        </div>
                        <div className={`bg-white p-4 rounded-xl border ${!originalImage ? 'opacity-50' : ''}`}>
                            <h3 className="font-bold mb-2">2. Choose a mockup</h3>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {mockupTypes.map(m => (
                                    <button key={m.key} onClick={() => setMockupType(m.key)} disabled={!originalImage} className={`py-2 text-xs font-semibold rounded-lg border-2 ${mockupType === m.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white hover:border-[#0079F2]'}`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2 pt-4">
                            <button onClick={handleGenerate} disabled={!originalImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                <SparklesIcon className="w-5 h-5"/> Generate Mockup
                            </button>
                            <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                        </div>
                        {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && (
                <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />
            )}
            {/* Mobile Unified Control Area */}
             <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div 
                    onClick={() => hasImage && setIsPanelOpen(!isPanelOpen)}
                    className={`w-full py-2 flex justify-center ${hasImage ? 'cursor-pointer' : ''}`}
                    aria-controls="mobile-controls-panel-mockup"
                    aria-expanded={isPanelOpen}
                >
                    {hasImage ? (isPanelOpen ? <ChevronDownIcon className="w-6 h-6 text-gray-500"/> : <ChevronUpIcon className="w-6 h-6 text-gray-500"/>) : <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>}
                </div>
                 <div id="mobile-controls-panel-mockup" className={`px-4 transition-all duration-300 ease-in-out overflow-y-auto ${isPanelOpen && hasImage ? 'max-h-[50vh] pb-4' : 'max-h-0'}`}>
                    <div onClick={triggerFileInput} className="cursor-pointer bg-gray-50 border-2 border-dashed rounded-lg flex items-center justify-center text-center text-gray-500 hover:border-[#0079F2] p-2 mb-4">
                        {originalImage ? <img src={originalImage.url} alt="Uploaded design" className="h-12 object-contain"/> : <span>+ Upload Design</span>}
                    </div>
                    <div className={`${!originalImage ? 'opacity-50' : ''}`}>
                        <h3 className="font-bold mb-2 text-center">Choose a mockup</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {mockupTypes.slice(0, 8).map(m => (
                                <button key={m.key} onClick={() => setMockupType(m.key)} disabled={!originalImage} className={`py-2 text-xs font-semibold rounded-lg border-2 ${mockupType === m.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white hover:border-[#0079F2]'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200/80">
                    {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                    <button onClick={handleGenerate} disabled={!originalImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5"/> Generate Mockup
                    </button>
                </div>
            </div>
        </div>
    );
};
const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string } | null>(null);
    const [base64Data, setBase64Data] = useState<Base64File | null>(null);
    const [generatedCaptions, setGeneratedCaptions] = useState<{ caption: string; hashtags: string }[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 1;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-caption') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-caption')!, 10) : 2);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const hasImage = originalImage !== null;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-caption', guestCredits.toString());
    }, [isGuest, guestCredits]);
    
    useEffect(() => {
        if (originalImage) {
            fileToBase64(originalImage.file).then(setBase64Data).catch(err => setError("Failed to process file."));
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
            setGeneratedCaptions(null);
            setError(null);
        }
    };
    
    const handleGenerate = async () => {
        const currentFile = originalImage?.file;
        if (!currentFile) {
            setError("Please upload an image.");
            return;
        }

        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedCaptions(null);

        try {
            const b64Data = await fileToBase64(currentFile);
            const captions = await generateCaptions(b64Data.base64, b64Data.mimeType);
            setGeneratedCaptions(captions);
            setIsPanelOpen(true); // Show results
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST);
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            } else {
                setGuestCredits(prev => prev - EDIT_COST);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">CaptionAI</h2>
                    <p className="text-[#5F6368] mt-2">Generate engaging social media captions for your photos instantly.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* Left Column: Image Upload */}
                    <div className="w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div
                            className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                            onClick={!hasImage ? triggerFileInput : undefined}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                            {originalImage ? (
                                <img src={originalImage.url} alt="For captioning" className="max-h-full h-auto w-auto object-contain rounded-lg" />
                            ) : (
                                <div className={`text-center transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
                                    <div className="flex flex-col items-center gap-2 text-[#5F6368]">
                                        <UploadIcon className="w-12 h-12" />
                                        <span className='font-semibold text-lg text-[#1E1E1E]'>Upload a photo</span>
                                        <span className="text-sm">to generate captions</span>
                                    </div>
                                </div>
                            )}
                            {hasImage && !isLoading && (
                                <button onClick={triggerFileInput} className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black hover:bg-white transition-all duration-300 shadow-md" aria-label="Change photo">
                                    <ArrowUpCircleIcon className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Results/Controls */}
                    <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 flex flex-col min-h-[400px] lg:min-h-0 lg:aspect-[4/3]">
                        <div className="text-center mb-4">
                            <h3 className="text-xl font-bold text-[#1E1E1E]">Generated Captions</h3>
                            <p className='text-sm text-[#5F6368]'>Copy your favorite one</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 -mr-2">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse" />
                                    <p className="mt-4 font-medium">Generating captions...</p>
                                </div>
                            ) : generatedCaptions ? (
                                generatedCaptions.map((item, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200/80">
                                        <p className="text-sm text-[#1E1E1E] whitespace-pre-wrap">{item.caption}</p>
                                        <p className="text-xs text-blue-600 font-semibold mt-2">{item.hashtags}</p>
                                        <button
                                            onClick={() => handleCopy(`${item.caption}\n\n${item.hashtags}`, index)}
                                            className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black"
                                        >
                                            {copiedIndex === index ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                            {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                                    <CaptionIcon className="w-12 h-12 mb-2" />
                                    <p className="font-semibold">Your captions will appear here.</p>
                                    <p className="text-sm">Upload a photo to get started.</p>
                                </div>
                            )}
                            {error && <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>}
                        </div>
                         {/* This section is only for desktop */}
                        <div className="hidden lg:block pt-4 mt-auto border-t border-gray-200/80">
                            <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                <SparklesIcon className="w-5 h-5"/> Generate Captions
                            </button>
                            <p className={`text-xs text-center pt-2 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credit.`}</p>
                        </div>
                    </div>
                </div>
                 {/* Mobile Unified Control Area */}
                 <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)] p-4">
                    {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm mb-2'>{error}</div>}
                    <button onClick={handleGenerate} disabled={!hasImage || isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                        <SparklesIcon className="w-5 h-5"/> Generate
                    </button>
                </div>
                 {/* Mobile results panel */}
                 {generatedCaptions && (
                     <div className="lg:hidden mt-8">
                         <h3 className="text-xl font-bold text-center mb-4">Generated Captions</h3>
                         <div className="space-y-4">
                            {generatedCaptions.map((item, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border border-gray-200/80 shadow-sm">
                                    <p className="text-sm text-[#1E1E1E] whitespace-pre-wrap">{item.caption}</p>
                                    <p className="text-xs text-blue-600 font-semibold mt-2">{item.hashtags}</p>
                                    <button
                                        onClick={() => handleCopy(`${item.caption}\n\n${item.hashtags}`, index)}
                                        className="mt-3 flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black"
                                    >
                                        {copiedIndex === index ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                                        {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                                    </button>
                                </div>
                            ))}
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};

const Creations: React.FC = () => (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
        <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#1E1E1E]">My Creations</h2>
            <p className="text-[#5F6368] mt-2">This feature is coming soon!</p>
            <div className="mt-8 bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200">
                <ProjectsIcon className="w-16 h-16 text-gray-300 mx-auto" />
                <p className="mt-4 text-[#5F6368]">Your future creations will be saved here for easy access.</p>
            </div>
        </div>
    </div>
);

const Profile: React.FC<{ auth: AuthProps; openEditProfileModal: () => void; navigateTo: (page: Page, view?: View, sectionId?: string) => void; setActiveView: (view: View) => void; setIsConversationOpen: (isOpen: boolean) => void; }> = ({ auth, openEditProfileModal, navigateTo, setActiveView, setIsConversationOpen }) => {
    const { user, handleLogout } = auth;
    if (!user) return null;

    const menuItems = [
        { label: 'Billing & Credits', icon: CreditCardIcon, action: () => setActiveView('billing'), disabled: false },
        { label: 'Help & Support', icon: HelpIcon, action: () => setIsConversationOpen(true), disabled: false },
        { label: 'Privacy Policy', icon: ShieldCheckIcon, action: () => {}, disabled: true },
        { label: 'Terms of Service', icon: DocumentTextIcon, action: () => {}, disabled: true },
    ];
    
    return (
        <div className="p-4">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-[#0079F2] font-bold text-3xl">
                    {user.avatar}
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#1E1E1E]">{user.name}</h2>
                    <p className="text-sm text-[#5F6368]">{user.email}</p>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-semibold text-gray-500">Available Credits</p>
                        <p className="text-3xl font-bold text-[#1E1E1E]">{user.credits}</p>
                    </div>
                    <button onClick={() => setActiveView('billing')} className="bg-[#f9d230] text-[#1E1E1E] font-bold py-2 px-5 rounded-lg">
                        Buy More
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <button onClick={openEditProfileModal} className="w-full flex items-center justify-between text-left p-4 bg-white rounded-lg border border-gray-200/80">
                    <div className="flex items-center gap-4">
                        <AvatarUserIcon className="w-6 h-6 text-gray-500"/>
                        <span className="font-semibold text-[#1E1E1E]">Edit Profile</span>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-gray-400"/>
                </button>
                 {menuItems.map((item, index) => (
                    <button key={index} onClick={item.action} disabled={item.disabled} className="w-full flex items-center justify-between text-left p-4 bg-white rounded-lg border border-gray-200/80 disabled:opacity-50">
                        <div className="flex items-center gap-4">
                            <item.icon className="w-6 h-6 text-gray-500"/>
                            <span className="font-semibold text-[#1E1E1E]">{item.label}</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400"/>
                    </button>
                ))}
            </div>

            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 mt-8 text-red-600 font-semibold p-3 bg-red-50 rounded-lg">
                <LogoutIcon className="w-5 h-5"/>
                <span>Logout</span>
            </button>
        </div>
    );
};

const MarkdownRenderer: React.FC<{ text: string; onButtonClick: (text: string) => void; }> = ({ text, onButtonClick }) => {
    const renderTextWithBold = (line: string) => {
        return line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(<ul key={`ul-${elements.length}`} className="space-y-2 my-2">{listItems}</ul>);
            listItems = [];
        }
    };

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        const buttonMatch = trimmedLine.match(/^\[button:(.*?)\]$/);

        if (buttonMatch) {
            flushList();
            const buttonText = buttonMatch[1];
            elements.push(
                <button
                    key={`btn-${i}`}
                    onClick={() => onButtonClick(buttonText)}
                    className="w-full text-left text-sm p-3 my-1 bg-white border border-gray-200/80 rounded-lg hover:bg-gray-50 text-blue-600 font-semibold"
                >
                    {buttonText}
                </button>
            );
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
            listItems.push(
                <li key={i} className="text-sm flex items-start">
                    <span className="mr-3 mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-500"></span>
                    <span>{renderTextWithBold(trimmedLine.substring(2))}</span>
                </li>
            );
        } else {
            flushList();
            if (line.startsWith('### ')) {
                elements.push(<h3 key={i} className="text-base font-bold mt-4 mb-2">{renderTextWithBold(line.substring(4))}</h3>);
            } else if (trimmedLine !== '') {
                elements.push(<p key={i} className="text-sm">{renderTextWithBold(line)}</p>);
            }
        }
    });

    flushList();

    return <div className="space-y-2">{elements}</div>;
};

const HelpPanel: React.FC<{ isOpen: boolean; onClose: () => void; auth: AuthProps; }> = ({ isOpen, onClose, auth }) => {
    type Message = { speaker: 'user' | 'pixa' | 'system'; text: string; id?: string; isFinal?: boolean; };
    type HistoryItem = { role: 'user' | 'model'; text: string };
    
    // FIX: LiveSession is not a public type, use the inferred type from the promise.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const [messages, setMessages] = useState<Message[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [currentMode, setCurrentMode] = useState<'voice' | 'text'>('text');
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const { user } = auth;

    const commonQuestions = [
        "How do credits work?",
        "What is Magic Photo Studio?",
        "How do I use Interior AI?",
        "Can I try clothes on any photo?",
    ];

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);
    
    const handleSendMessage = async (messageText: string) => {
        if (!messageText.trim()) return;

        const newUserMessage: Message = { speaker: 'user', text: messageText, isFinal: true };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsThinking(true);
        
        try {
            const apiHistory: { role: 'user' | 'model'; text: string }[] = messages
                .filter(m => m.speaker === 'user' || m.speaker === 'pixa')
                .map(m => ({
                    role: m.speaker === 'user' ? 'user' : 'model',
                    text: m.text
                }));

            const responseText = await generateSupportResponse(apiHistory, messageText);
            const pixaResponse: Message = { speaker: 'pixa', text: responseText, isFinal: true };
            setMessages(prev => [...prev, pixaResponse]);

        } catch (error) {
            console.error("Error sending message:", error);
            const errorResponse: Message = { speaker: 'system', text: "Sorry, I'm having trouble connecting right now. Please try again later.", isFinal: true };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsThinking(false);
        }
    };
    
    const handleQuestionClick = (question: string) => {
        handleSendMessage(question);
    };

    const startAudio = async () => {
        setIsListening(true);
        setIsThinking(true);
        setMessages([]); // Clear previous chat
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        mediaStreamSourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
        };

        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);

        sessionPromiseRef.current = startLiveSession({
            onopen: () => {
                console.debug('Session opened.');
                setIsThinking(false);
            },
            onmessage: async (message: LiveServerMessage) => {
                if (message.serverContent?.outputTranscription) {
                    const text = message.serverContent.outputTranscription.text;
                    currentOutputTranscriptionRef.current += text;
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.speaker === 'pixa' && !last.isFinal) {
                            return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                        }
                        return [...prev, { speaker: 'pixa', text: currentOutputTranscriptionRef.current, isFinal: false }];
                    });
                } else if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    currentInputTranscriptionRef.current += text;
                     setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.speaker === 'user' && !last.isFinal) {
                            return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                        }
                        return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: false }];
                    });
                }
                
                if (message.serverContent?.turnComplete) {
                     setMessages(prev => {
                         const updated = [...prev];
                         const lastUser = updated.slice().reverse().find(m => m.speaker === 'user');
                         if (lastUser) lastUser.isFinal = true;
                         const lastPixa = updated.slice().reverse().find(m => m.speaker === 'pixa');
                         if (lastPixa) lastPixa.isFinal = true;
                         return updated;
                     });

                    currentInputTranscriptionRef.current = '';
                    currentOutputTranscriptionRef.current = '';
                }

                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio && outputAudioContextRef.current) {
                    const outCtx = outputAudioContextRef.current;
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                    const source = outCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outCtx.destination);
                    source.addEventListener('ended', () => sourcesRef.current.delete(source));
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }
            },
            onerror: (e) => {
                console.error('Session error:', e);
                setMessages(prev => [...prev, { speaker: 'system', text: 'An error occurred during the session.' }]);
                stopAudio();
            },
            onclose: () => {
                console.debug('Session closed.');
                stopAudio();
            },
        });
    };

    const stopAudio = () => {
        setIsListening(false);
        setIsThinking(false);
        sessionPromiseRef.current?.then(session => session.close());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
        audioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        sessionPromiseRef.current = null;
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 lg:inset-auto lg:bottom-8 lg:right-8 z-[100] flex flex-col bg-white rounded-none lg:rounded-2xl shadow-2xl w-full h-full lg:w-[400px] lg:h-[600px] border border-gray-200/80">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/80 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center relative">
                        <SparklesIcon className="w-6 h-6 text-white"/>
                        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                    </div>
                    <div>
                        <h2 className="font-bold text-lg text-[#1E1E1E]">Magic Helper</h2>
                        <p className="text-sm text-gray-500">Online</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700"><XIcon className="w-6 h-6"/></button>
            </div>
            
            {/* Chat Body */}
            <div ref={chatContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4">
                <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-xl max-w-xs">
                        <p className="text-sm">Hi {user?.name.split(' ')[0]}! I'm Pixa, your personal AI assistant. How can I help you today?</p>
                    </div>
                </div>
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-xl max-w-xs ${msg.speaker === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} ${msg.speaker === 'system' ? 'bg-red-50 text-red-700 w-full' : ''}`}>
                             {msg.speaker === 'user' ? (
                                <p className="text-sm">{msg.text}</p>
                            ) : (
                                <MarkdownRenderer text={msg.text} onButtonClick={handleSendMessage} />
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                     <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 p-3 rounded-xl max-w-xs">
                           <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                           </div>
                        </div>
                    </div>
                )}

                 {messages.length === 0 && !isListening && (
                    <div className="pt-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-500">Or ask one of these common questions:</p>
                        {commonQuestions.map(q => (
                             <button key={q} onClick={() => handleQuestionClick(q)} className="w-full text-left text-sm p-3 bg-white border border-gray-200/80 rounded-lg hover:bg-gray-50 text-blue-600">
                                {q}
                            </button>
                        ))}
                    </div>
                 )}
            </div>

             <div className="p-4 border-t border-gray-200/80 flex-shrink-0 space-y-2">
                <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
                    <button onClick={() => { if(isListening) stopAudio(); setCurrentMode('text'); }} className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${currentMode === 'text' ? 'bg-white shadow-sm' : ''}`}>Text</button>
                    <button onClick={() => { if(!isListening) startAudio(); setCurrentMode('voice');}} className={`flex-1 py-1.5 text-sm font-semibold rounded-md ${currentMode === 'voice' ? 'bg-white shadow-sm' : ''}`}>Voice</button>
                </div>
                 {currentMode === 'text' && (
                     <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-2">
                        <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Type your message..." className="flex-1 w-full px-4 py-2 bg-gray-50 border border-gray-200/80 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button type="submit" className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50" disabled={isThinking || !inputValue.trim()}><ChevronRightIcon className="w-6 h-6 transform -rotate-180"/></button>
                     </form>
                 )}
                {currentMode === 'voice' && (
                     <button onClick={isListening ? stopAudio : startAudio} className={`w-full flex items-center justify-center gap-3 py-2.5 rounded-lg text-white font-semibold ${isListening ? 'bg-red-500' : 'bg-blue-500'}`}>
                        {isListening ? <><StopIcon className="w-5 h-5"/> Stop Listening</> : <><MicrophoneIcon className="w-5 h-5"/> Start Listening</>}
                    </button>
                )}
                 <div className="flex justify-center gap-4 pt-2">
                     <button onClick={() => handleSendMessage("I want to report an issue.")} className="flex items-center gap-2 text-xs text-gray-500 hover:text-black">
                         <FlagIcon className="w-4 h-4" /> Report an Issue
                     </button>
                 </div>
            </div>
        </div>
    );
};

const MobileBottomNav: React.FC<{ activeView: View; setActiveView: (view: View) => void; }> = ({ activeView, setActiveView }) => {
    const navItems: { view: View; label: string; icon: React.FC<{ className?: string }>; disabled?: boolean; }[] = [
        { view: 'home_dashboard', label: 'Home', icon: HomeIcon },
        { view: 'dashboard', label: 'Tools', icon: DashboardIcon },
        { view: 'creations', label: 'Creations', icon: ProjectsIcon, disabled: true },
        { view: 'profile', label: 'Profile', icon: AvatarUserIcon },
    ];
    
    const isActive = (view: View) => {
        if (view === 'home_dashboard') return activeView === 'home_dashboard';
        if (view === 'dashboard') return activeView !== 'home_dashboard' && activeView !== 'creations' && activeView !== 'profile';
        return activeView === view;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-lg border-t border-gray-200/80 z-[80] lg:hidden">
            <div className="flex justify-around items-center h-full">
                {navItems.map(item => (
                    <button 
                        key={item.label} 
                        onClick={() => setActiveView(item.view as View)} 
                        disabled={item.disabled} 
                        className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-2xl transition-colors ${isActive(item.view) ? 'text-[#0079F2]' : 'text-gray-500'} disabled:text-gray-300`}
                        aria-current={isActive(item.view) ? 'page' : undefined}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen }) => {
    
    const handleBack = () => {
        if (['dashboard', 'home_dashboard', 'creations', 'profile'].includes(activeView)) {
            navigateTo('home'); // Go to marketing page if on a main dashboard view
        } else {
            setActiveView('dashboard'); // Go back to the tools grid from a specific tool
        }
    };
    
    const isMainView = ['dashboard', 'home_dashboard', 'creations', 'billing', 'profile'].includes(activeView);

    const headerAuthProps = {
        ...auth,
        setActiveView,
        openConversation: () => setIsConversationOpen(true),
        isDashboard: true,
        showBackButton: !isMainView,
        handleBack: handleBack
    };
    
    const { user, setUser } = auth;
    if (!user) return null; // Should be handled by App.tsx, but good practice

    const ViewComponent = {
        'dashboard': <Dashboard user={user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />,
        'home_dashboard': <MobileHomeDashboard user={user} setActiveView={setActiveView} />,
        'studio': <MagicPhotoStudio auth={auth} navigateTo={navigateTo} />,
        'interior': <MagicInterior auth={auth} navigateTo={navigateTo} />,
        'creations': <Creations />,
        'billing': <Billing user={user} setUser={setUser} />,
        'colour': <MagicPhotoColour auth={auth} navigateTo={navigateTo} />,
        'soul': <MagicSoul auth={auth} navigateTo={navigateTo} />,
        'apparel': <MagicApparel auth={auth} navigateTo={navigateTo} />,
        'mockup': <MagicMockup auth={auth} navigateTo={navigateTo} />,
        'profile': <Profile auth={auth} openEditProfileModal={openEditProfileModal} navigateTo={navigateTo} setActiveView={setActiveView} setIsConversationOpen={setIsConversationOpen} />,
        'caption': <CaptionAI auth={auth} navigateTo={navigateTo} />
    }[activeView];

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col lg:flex-row">
            <Sidebar user={user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} />
            <div className="flex-1 flex flex-col">
                <Header navigateTo={navigateTo} auth={headerAuthProps} />
                <main className="flex-1 lg:overflow-y-auto">
                    {/* The pb-20 is padding for the mobile bottom nav */}
                    <div className="pb-20 lg:pb-0">
                         {ViewComponent}
                    </div>
                </main>
            </div>
             <HelpPanel isOpen={isConversationOpen} onClose={() => setIsConversationOpen(false)} auth={auth} />
            <MobileBottomNav activeView={activeView} setActiveView={setActiveView} />
        </div>
    );
};

export default DashboardPage;
// Minor change for deployment.