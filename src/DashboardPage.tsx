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
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon
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
    { view: 'eraser', title: 'BG Eraser', icon: ScissorsIcon, gradient: 'from-emerald-400 to-emerald-500' },
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
    
    // New prompt-less state
    const [theme, setTheme] = useState<string>('automatic');
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
        setTheme('automatic');
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
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center overflow-hidden ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                                role={!hasImage ? 'button' : undefined} 
                                tabIndex={!hasImage ? 0 : -1} 
                                aria-label={!hasImage ? "Upload an image" : ""}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer transform hover:-translate-y-1 transition-transform duration-300" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated" className="max-h-full h-auto w-auto object-contain rounded-lg" />
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
                    
                    {/* Mobile Controls */}
                    {hasImage && <div className="lg:hidden w-full bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-center text-[#1E1E1E]">Controls</h3>
                             <button onClick={() => setMobileControlsExpanded(!mobileControlsExpanded)} className="p-1">
                                {mobileControlsExpanded ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                            </button>
                        </div>
                        {mobileControlsExpanded && (
                            <div className='space-y-4'>
                                <div className='pt-2'>
                                    <label className="block text-sm font-bold text-[#1E1E1E] mb-2">Scene Theme</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2 -mb-2">
                                        {themes.map(t => (
                                            <button key={t.key} onClick={() => setTheme(t.key)} className={`flex-shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 w-20 text-xs font-semibold rounded-lg border-2 transition-colors ${theme === t.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300'}`}>
                                                {t.icon} {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
                    </div>}

                </div>
                <div className="lg:hidden fixed bottom-20 left-0 right-0 z-20 bg-white/90 backdrop-blur-sm border-t p-4">
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
    const [mobileControlsExpanded, setMobileControlsExpanded] = useState(true);
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
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer transform hover:-translate-y-1 transition-transform duration-300" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated Interior" className="max-h-full h-auto w-auto object-contain rounded-lg" />
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
    const [mobileControlsExpanded, setMobileControlsExpanded] = useState(true);
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
                {/* FIX: This line was malformed due to a copy-paste error. */}
<label className="block text-sm font-bold text-[#1E1E1E] mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleModeSelect('restore')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'restore' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                        Auto Restore & Colourize
                    </button>
                    <button onClick={() => handleModeSelect('colourize_only')} disabled={!hasImage} className={`py-2 px-1 text-sm font-semibold rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300 ${mode === 'colourize_only' ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'}`}>
                        Colourize Only
                    </button>
                </div>
            </div>
        ) : (
            <div className="text-center">
                <p className="text-xs text-gray-500">Mode</p>
                <p className="text-sm font-semibold text-[#1E1E1E] capitalize">{mode === 'restore' ? 'Auto Restore' : 'Colourize Only'}</p>
            </div>
        )}
        {error && <div className='w-full flex flex-col items-center justify-center gap-4 pt-4 border-t border-gray-200/80'><div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div><button onClick={handleStartOver} className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800"><RetryIcon className="w-4 h-4" />Try Again</button></div>}
    </div>
);
// Minor change for commit.--- START OF FILE src/components/Header.tsx ---

import React, { useState } from 'react';
// FIX: Import `View` from `../App` where it is defined, instead of `../DashboardPage` which does not export it.
import { Page, AuthProps, View } from '../App';
import UserMenu from './UserMenu';
import { SparklesIcon, MagicPixaLogo, AudioWaveIcon, MenuIcon, XIcon, ArrowLeftIcon } from './icons';

// Add `setActiveView` to AuthProps for the dashboard context
interface DashboardAuthProps extends AuthProps {
    setActiveView?: (view: View) => void;
    openConversation?: () => void;
    isDashboard?: boolean;
    showBackButton?: boolean;
    handleBack?: () => void;
}

interface HeaderProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: DashboardAuthProps;
}

const Header: React.FC<HeaderProps> = ({ navigateTo, auth }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleMobileLinkClick = (page: Page, view?: View, sectionId?: string) => {
    navigateTo(page, view, sectionId);
    setIsMobileMenuOpen(false);
  }

  const MobileNavMenu: React.FC = () => (
    <div className="fixed inset-0 bg-white z-[100] p-4 flex flex-col">
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleMobileLinkClick('home', undefined, 'home')}>
                <MagicPixaLogo />
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2">
                <XIcon className="w-6 h-6 text-gray-600" />
            </button>
        </div>
        <nav className="flex flex-col gap-6 text-center">
            {auth.isAuthenticated ? (
              <button onClick={() => handleMobileLinkClick('dashboard', 'dashboard')} className="text-lg font-semibold text-[#1E1E1E]">Dashboard</button>
            ) : (
              <button onClick={() => handleMobileLinkClick('home', undefined, 'home')} className="text-lg font-semibold text-[#1E1E1E]">Home</button>
            )}
            <button onClick={() => handleMobileLinkClick('home', undefined, 'features')} className="text-lg font-semibold text-[#1E1E1E]">Features</button>
            <button onClick={() => handleMobileLinkClick('home', undefined, 'pricing')} className="text-lg font-semibold text-[#1E1E1E]">Pricing</button>
            <button onClick={() => handleMobileLinkClick('home', undefined, 'about')} className="text-lg font-semibold text-[#1E1E1E]">About Us</button>
        </nav>
        {!auth.isAuthenticated && (
            <div className="mt-auto">
                <button onClick={() => { auth.openAuthModal(); setIsMobileMenuOpen(false); }} className="w-full text-lg font-semibold bg-[#0079F2] text-white px-4 py-3 rounded-xl">
                    Sign In
                </button>
            </div>
        )}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-50 py-4 px-4 sm:px-6 lg:px-8 bg-[#F9FAFB]/80 backdrop-blur-lg border-b border-gray-200/80">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-10">
              {auth.isDashboard && (
                <div className="lg:hidden">
                    {auth.showBackButton && (
                        <button onClick={auth.handleBack} className="p-2 -ml-2 text-[#1E1E1E]" aria-label="Go back">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
              )}
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('home', undefined, 'home')}>
                  <MagicPixaLogo />
              </div>
              <nav className="hidden md:flex items-center gap-6">
                   {auth.isAuthenticated ? (
                      <button onClick={() => navigateTo('dashboard', 'dashboard')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Dashboard</button>
                   ) : (
                      <button onClick={() => navigateTo('home', undefined, 'home')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Home</button>
                   )}
                   <button onClick={() => navigateTo('home', undefined, 'features')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Features</button>
                   <button onClick={() => navigateTo('home', undefined, 'pricing')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Pricing</button>
                   <button onClick={() => navigateTo('home', undefined, 'about')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">About Us</button>
              </nav>
          </div>
          <div className="flex items-center gap-4">
              {auth.isAuthenticated && auth.user ? (
                <>
                  {/* Mobile view: Show credits instead of user circle */}
                  <div className="sm:hidden flex items-center gap-2 bg-yellow-100/80 text-yellow-900 font-semibold px-3 py-1.5 rounded-full text-sm border border-yellow-300/50">
                    <SparklesIcon className="w-4 h-4 text-yellow-600" />
                    <span>{auth.user.credits} Credits</span>
                  </div>

                  {/* Desktop view: Unchanged */}
                  <div className="hidden sm:flex items-center gap-4">
                    {auth.isDashboard ? (
                      <>
                        <button 
                            onClick={auth.openConversation}
                            className="flex items-center gap-2 bg-white text-blue-600 font-semibold px-3 py-1.5 rounded-full text-sm border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                        >
                            <AudioWaveIcon className="w-4 h-4" />
                            <span>Magic Conversation</span>
                        </button>
                        <div className="flex items-center gap-2 bg-yellow-100/80 text-yellow-900 font-semibold px-3 py-1.5 rounded-full text-sm border border-yellow-300/50">
                            <SparklesIcon className="w-4 h-4 text-yellow-600" />
                            <span>{auth.user.credits} Credits</span>
                        </div>
                        <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
                      </>
                    ) : (
                       <UserMenu user={auth.user} onLogout={auth.handleLogout} navigateTo={navigateTo} setActiveView={auth.setActiveView} />
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => auth.openAuthModal()} className="hidden sm:block text-sm font-semibold bg-white text-[#0079F2] px-4 py-2 rounded-xl border-2 border-[#0079F2] hover:bg-blue-50 transition-colors">
                    Sign In
                  </button>
                  <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-[#1E1E1E] md:hidden" aria-label="Open navigation menu">
                    <MenuIcon className="w-6 h-6" />
                  </button>
                </>
              )}
          </div>
        </div>
      </header>
      {isMobileMenuOpen && !auth.isDashboard && <MobileNavMenu />}
    </>
  );
};

export default Header;
// Minor change for commit.--- START OF FILE src/components/Footer.tsx ---

import React from 'react';
import { MagicPixaLogo } from './icons';

const Footer: React.FC = () => {
    const scrollToSection = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <footer className="bg-white text-[#5F6368] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
                    <div className="flex-shrink-0">
                        <MagicPixaLogo className="justify-center md:justify-start" />
                        <p className="mt-2 text-sm">Create, No Prompt Required.</p>
                    </div>
                    <div className="flex gap-12">
                        <div className="flex flex-col gap-4 items-start">
                            <button onClick={() => scrollToSection('home')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Home</button>
                            <button onClick={() => scrollToSection('features')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Features</button>
                        </div>
                        <div className="flex flex-col gap-4 items-start">
                            <button onClick={() => scrollToSection('pricing')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">Pricing</button>
                            <button onClick={() => scrollToSection('about')} className="text-sm font-semibold text-[#5F6368] hover:text-[#1E1E1E] transition-colors">About Us</button>
                        </div>
                    </div>
                </div>
                 <div className="mt-12 border-t border-gray-200/80 pt-8 text-center text-sm">
                    <p>&copy; {new Date().getFullYear()} MagicPixa. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
// Minor change for commit.--- START OF FILE src/components/ThemeToggle.tsx ---



import React from 'react';
import { useTheme } from '../theme';
import { SunIcon, MoonIcon, SystemIcon } from './icons';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { name: 'light', icon: <SunIcon className="w-5 h-5" /> },
    { name: 'dark', icon: <MoonIcon className="w-5 h-5" /> },
    { name: 'system', icon: <SystemIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-200 dark:bg-slate-800 rounded-lg">
      {themes.map((t) => (
        <button
          key={t.name}
          onClick={() => setTheme(t.name as 'light' | 'dark' | 'system')}
          className={`p-1.5 rounded-md transition-colors ${
            theme === t.name ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          aria-label={`Switch to ${t.name} theme`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
// Minor change for commit.--- START OF FILE src/theme.tsx ---



import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        return savedTheme;
      }
      // Check system preference if no theme is saved
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light'; // Default to light theme
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Determine if dark mode should be applied
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    // Apply the correct class
    root.classList.remove(isDark ? 'light' : 'dark');
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Save the user's explicit theme choice
    localStorage.setItem('theme', theme);

    // Optional: Add a listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        if (theme === 'system') {
            const newIsDark = mediaQuery.matches;
            root.classList.remove(newIsDark ? 'light' : 'dark');
            root.classList.add(newIsDark ? 'dark' : 'light');
        }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);

  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
// Minor change for commit.--- START OF FILE src/components/AuthModal.tsx ---

import React, { useState, useEffect, ReactNode } from 'react';
import { GoogleIcon, MagicPixaLogo } from './icons';

interface AuthModalProps {
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  error?: ReactNode | null;
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  onClose, 
  onGoogleSignIn,
  error: propError,
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If a prop error is passed from the main app, it takes precedence.
  const error = propError || internalError;
  
  // Clear any internal modal error if a new error is passed from props.
  useEffect(() => {
    if(propError) {
      setInternalError(null);
    }
  }, [propError]);


  const handleGoogleClick = async () => {
    setInternalError(null);
    setIsLoading(true);
    try {
      await onGoogleSignIn();
      // On redirect, this component will unmount before the code below runs.
      // isLoading will reset on component re-mount.
    } catch (err: any) {
      setInternalError(err.message || 'Failed to sign in with Google.');
      // Only set loading to false on an immediate error, as success causes a page redirect.
      setIsLoading(false); 
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      aria-labelledby="auth-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative bg-white w-full max-w-sm m-4 p-8 rounded-2xl shadow-xl border border-gray-200/80"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
                 <MagicPixaLogo />
            </div>
              <p className="text-[#5F6368] mb-6">
                Sign in or create an account to get started.
              </p>
              <div className="space-y-4">
                 <button
                    onClick={handleGoogleClick}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-bold text-[#1E1E1E] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0079F2] disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 
                        <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        : <GoogleIcon className="w-5 h-5" />
                    }
                    Continue with Google
                </button>
                 {error && <div className="text-sm text-red-700 mt-4 bg-red-50 p-4 rounded-lg border border-red-200">{error}</div>}
              </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
// Minor change for commit.--- START OF FILE src/components/UserMenu.tsx ---

import React, { useState, useRef, useEffect } from 'react';
// FIX: Import `View` from `../App` where it is defined, instead of `../DashboardPage` which does not export it.
import { User, Page, View } from '../App';
import { LogoutIcon, DashboardIcon, ProjectsIcon } from './icons';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  navigateTo: (page: Page, view?: View) => void;
  setActiveView?: (view: View) => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, navigateTo, setActiveView }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (view: View) => {
    navigateTo('dashboard', view);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer text-[#0079F2] font-bold text-lg hover:ring-2 hover:ring-[#0079F2] transition-all"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="User menu"
      >
        {user.avatar}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white border border-gray-200/80 rounded-xl shadow-lg z-20"
          role="menu"
        >
          <div className="p-4 border-b border-gray-200/80">
            <p className="font-semibold text-[#1E1E1E] truncate" title={user.name}>{user.name}</p>
            <p className="text-sm text-[#5F6368] truncate" title={user.email}>{user.email}</p>
          </div>
          <div className="py-2">
            <button onClick={() => handleNavigation('dashboard')} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-[#1E1E1E] hover:bg-gray-100" role="menuitem">
              <DashboardIcon className="w-5 h-5" /> Dashboard
            </button>
            <button onClick={() => handleNavigation('creations')} disabled className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-400 cursor-not-allowed" role="menuitem">
              <ProjectsIcon className="w-5 h-5" /> My Creations
            </button>
          </div>
          <div className="py-2 border-t border-gray-200/80">
             <button onClick={onLogout} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                <LogoutIcon className="w-5 h-5" /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
// Minor change for commit.--- START OF FILE src/firebase.ts ---

// FIX: The build process was failing because it could not resolve scoped Firebase packages like '@firebase/auth'.
// Changed imports to the standard Firebase v9+ modular format (e.g., 'firebase/auth') which Vite can resolve from the installed 'firebase' package.
// FIX: Changed to a namespace import for `firebase/app` to resolve module resolution issues.
import * as firebaseApp from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment, Timestamp, Firestore } from 'firebase/firestore';


// DEFINITIVE FIX: Use `import.meta.env` for all Vite-exposed variables.
const projectId = (import.meta as any).env.VITE_FIREBASE_PROJECT_ID;

// SELF-HEALING CONFIG: The authDomain was consistently misconfigured by the user.
// To fix this permanently, we now derive the authDomain directly from the projectId,
// which is the standard Firebase convention and bypasses the faulty environment variable.
const derivedAuthDomain = projectId ? `${projectId}.firebaseapp.com` : (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN;

// Export the config object so other parts of the app can inspect it for diagnostics.
export const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: derivedAuthDomain,
  projectId: projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID
};

const checkConfigValue = (value: string | undefined): boolean => {
    return !!value && value !== 'undefined';
};

// DEFINITIVE FIX: All keys, including the Gemini API key, must use the VITE_ prefix
// and be accessed via import.meta.env in a Vite application.
const allConfigKeys = {
    "VITE_API_KEY": (import.meta as any).env.VITE_API_KEY,
    "VITE_FIREBASE_API_KEY": (import.meta as any).env.VITE_FIREBASE_API_KEY,
    "VITE_FIREBASE_AUTH_DOMAIN": (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    "VITE_FIREBASE_PROJECT_ID": (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    "VITE_FIREBASE_STORAGE_BUCKET": (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    "VITE_FIREBASE_MESSAGING_SENDER_ID": (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    "VITE_FIREBASE_APP_ID": (import.meta as any).env.VITE_FIREBASE_APP_ID
};

const missingKeys = Object.entries(allConfigKeys)
    .filter(([_, value]) => !checkConfigValue(value as string | undefined))
    .map(([key, _]) => key);

export const isConfigValid = missingKeys.length === 0;

export const getMissingConfigKeys = (): string[] => missingKeys;

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigValid) {
  try {
    // FIX: Use namespace import to access firebase app functions.
    app = firebaseApp.getApps().length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Error initializing Firebase:", error);
  }
} else {
  console.error("Configuration is missing or incomplete. Please check your environment variables. Missing:", missingKeys.join(', '));
}

/**
 * Signs in the user with Google using a popup window.
 * This method is more self-contained than redirect and provides immediate feedback.
 * @returns A promise that resolves with the user's credentials on success.
 */
export const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized.");
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        return result;
    } catch (error) {
        console.error("Error during Google Sign-In with Popup:", error);
        throw error; // Re-throw to be caught by the calling function in App.tsx
    }
};


/**
 * Gets a user's profile from Firestore. If it doesn't exist, it creates one on-the-fly.
 * This "on-demand" creation is the core fix for the sign-up race condition.
 * It also handles the monthly credit renewal logic.
 * @param uid The user's unique ID from Firebase Auth.
 * @param name The user's display name (optional, used for creation).
 * @param email The user's email (optional, used for creation).
 * @returns The user's profile data.
 */
export const getOrCreateUserProfile = async (uid: string, name?: string | null, email?: string | null) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userRef = doc(db, "users", uid);
  const docSnap = await getDoc(userRef);

  if (docSnap.exists()) {
    // Profile exists, check for credit renewal
    const userData = docSnap.data();
    const lastRenewal = userData.lastCreditRenewal as Timestamp;
    if (lastRenewal) {
        const lastRenewalDate = lastRenewal.toDate();
        const oneMonthLater = new Date(lastRenewalDate.getFullYear(), lastRenewalDate.getMonth() + 1, lastRenewalDate.getDate());

        if (new Date() >= oneMonthLater) {
          await updateDoc(userRef, {
            credits: 10,
            lastCreditRenewal: serverTimestamp(),
          });
          console.log(`Credits renewed for user ${uid}`);
          return { ...userData, credits: 10 };
        }
    }
    return userData;
  } else {
    // Profile does not exist, create it now
    console.log(`Creating new user profile for UID: ${uid}`);
    const newUserProfile = {
      uid,
      name: name || 'New User',
      email: email || 'No Email',
      credits: 10,
      signUpDate: serverTimestamp(),
      lastCreditRenewal: serverTimestamp(),
    };
    await setDoc(userRef, newUserProfile);
    // Return the profile data (timestamps will be null until server processes them, which is fine)
    return { ...newUserProfile, credits: 10 };
  }
};

/**
 * Updates a user's profile information in Firestore.
 * @param uid The user's unique ID.
 * @param data An object containing the fields to update (e.g., { name: 'New Name' }).
 */
export const updateUserProfile = async (uid: string, data: { name: string }): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, data);
};

/**
 * Atomically deducts credits. It will create the user profile if it doesn't exist.
 * This is now the primary function for any action that costs credits.
 * @param uid The user's unique ID.
 * @param amount The number of credits to deduct.
 * @returns The updated user profile data after deduction.
 */
export const deductCredits = async (uid: string, amount: number) => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // First, ensure the profile exists and is up-to-date
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);
  
  if (userProfile.credits < amount) {
    throw new Error("Insufficient credits.");
  }

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(-amount),
  });

  return { ...userProfile, credits: userProfile.credits - amount };
};

/**
 * Atomically adds credits to a user's account.
 * @param uid The user's unique ID.
 * @param amount The number of credits to add.
 * @returns The updated user profile data after addition.
 */
export const addCredits = async (uid: string, amount: number) => {
  if (!db || !auth) throw new Error("Firestore is not initialized.");
  
  // Ensure the user profile exists.
  const userProfile = await getOrCreateUserProfile(uid, auth.currentUser?.displayName, auth.currentUser?.email);

  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    credits: increment(amount),
  });

  // Return the new profile state
  return { ...userProfile, credits: userProfile.credits + amount };
};

export { app, auth };--- START OF FILE src/components/ConfigurationError.tsx ---



import React from 'react';

interface ConfigurationErrorProps {
  missingKeys: string[];
}

const ConfigurationError: React.FC<ConfigurationErrorProps> = ({ missingKeys }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e0e0e] p-4 text-center">
    <div>
      <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Application Not Configured
      </h1>
      <p className="text-gray-600 dark:text-gray-300 max-w-lg mx-auto">
        This application is not properly connected to its backend services.
        If you are the administrator, please ensure that all required environment variables are correctly set up in your hosting provider's dashboard.
      </p>
      {missingKeys.length > 0 && (
        <div className="mt-6 text-left max-w-md mx-auto bg-red-50 dark:bg-red-900/30 p-4 rounded-lg border border-red-200 dark:border-red-800/70">
            <h3 className="font-semibold text-red-800 dark:text-red-300">The following keys appear to be missing:</h3>
            <ul className="list-disc list-inside mt-2 text-sm text-red-700 dark:text-red-400 font-mono">
                {missingKeys.map(key => <li key={key}>{key}</li>)}
            </ul>
        </div>
      )}
    </div>
  </div>
);

export default ConfigurationError;
// Minor change for commit.--- START OF FILE src/components/Billing.tsx ---

import React, { useState } from 'react';
import { User } from '../App';
import { addCredits } from '../firebase';
import { SparklesIcon, CheckIcon } from './icons';

interface BillingProps {
  user: User;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const creditPackages = [
  { credits: 100, price: 4.99, bestValue: false, description: "Perfect for casual users" },
  { credits: 250, price: 9.99, bestValue: true, description: "Most popular choice for creators" },
  { credits: 600, price: 19.99, bestValue: false, description: "For heavy users and small teams" },
];

const Billing: React.FC<BillingProps> = ({ user, setUser }) => {
  const [loadingPackage, setLoadingPackage] = useState<number | null>(null);
  const [purchasedPackage, setPurchasedPackage] = useState<number | null>(null);

  const handlePurchase = async (credits: number, index: number) => {
    setLoadingPackage(index);
    try {
      const updatedProfile = await addCredits(user.uid, credits);
      setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
      setPurchasedPackage(index);
      setTimeout(() => setPurchasedPackage(null), 3000); // Reset after 3 seconds
    } catch (error) {
      console.error("Failed to add credits:", error);
      alert("There was an issue processing your purchase. Please try again.");
    } finally {
      setLoadingPackage(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
      <div className='mb-8'>
        <h2 className="text-3xl font-bold text-[#1E1E1E]">Get More Credits</h2>
        <p className="text-[#5F6368] mt-1">
          Your current balance is <span className="font-bold text-[#1E1E1E]">{user.credits}</span> credits.
          Choose a package below to top up your account and continue creating.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {creditPackages.map((pkg, index) => (
          <div key={index} className={`relative bg-white p-8 rounded-xl border-2 transition-colors ${pkg.bestValue ? 'border-[#0079F2]' : 'border-gray-200/80'}`}>
            {pkg.bestValue && (
              <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#0079F2] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Best Value
              </div>
            )}
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2 text-[#1E1E1E]"><SparklesIcon className="w-5 h-5 text-[#0079F2]"/> {pkg.credits} Credits</h3>
              <p className="text-4xl font-bold mb-2 text-[#1E1E1E]">${pkg.price}</p>
              <p className="text-[#5F6368] h-10 mb-6">{pkg.description}</p>
              <button
                onClick={() => handlePurchase(pkg.credits, index)}
                disabled={loadingPackage !== null}
                className={`w-full font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform disabled:opacity-50 disabled:cursor-wait ${
                  purchasedPackage === index
                    ? 'bg-green-500 text-white'
                    : pkg.bestValue
                    ? 'bg-[#0079F2] text-white hover:bg-blue-700 hover:scale-105'
                    : 'bg-gray-100 hover:bg-gray-200 text-[#1E1E1E] hover:scale-105'
                }`}
              >
                {loadingPackage === index ? (
                  <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : purchasedPackage === index ? (
                  <span className="flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5"/> Credits Added!</span>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Billing;
// Minor change for commit.--- START OF FILE src/components/Sidebar.tsx ---

import React from 'react';
import { User, Page, View } from '../App';
import { DashboardIcon, PhotoStudioIcon, CreditCardIcon, ScissorsIcon, PaletteIcon, CaptionIcon, ScannerIcon, MockupIcon, UsersIcon, HomeIcon, NotesIcon } from './icons';

interface SidebarProps {
  user: User | null;
  activeView: View;
  setActiveView: (view: View) => void;
  navigateTo: (page: Page, view?: View, sectionId?: string) => void;
}

const NavButton: React.FC<{
    item: { id: string; label: string; icon: React.FC<{ className?: string }>; disabled: boolean };
    activeView: View;
    onClick: () => void;
}> = ({ item, activeView, onClick }) => (
    <button
        key={item.id}
        onClick={onClick}
        disabled={item.disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left ${
            activeView === item.id
                ? 'bg-[#0079F2]/10 text-[#0079F2]'
                : item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-[#5F6368] hover:bg-gray-100'
        }`}
    >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        <span className="truncate">{item.label}</span>
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({ user, activeView, setActiveView, navigateTo }) => {
  const navStructure = [
    { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, disabled: false },
    { type: 'divider', label: 'Features' },
    { id: 'studio', label: 'Magic Photo Studio', icon: PhotoStudioIcon, disabled: false },
    { id: 'eraser', label: 'Magic Background Eraser', icon: ScissorsIcon, disabled: false },
    { id: 'colour', label: 'Magic Photo Colour', icon: PaletteIcon, disabled: false },
    { id: 'caption', label: 'CaptionAI', icon: CaptionIcon, disabled: false },
    { id: 'interior', label: 'Magic Interior', icon: HomeIcon, disabled: false },
    { id: 'apparel', label: 'Magic Apparel', icon: UsersIcon, disabled: false },
    { id: 'scanner', label: 'Magic Scanner', icon: ScannerIcon, disabled: true },
    { id: 'mockup', label: 'Magic Mockup', icon: MockupIcon, disabled: false },
    { id: 'notes', label: 'Magic Notes', icon: NotesIcon, disabled: true },
  ];

  const handleNavClick = (view: View) => {
    setActiveView(view);
  }

  return (
    <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200/80 p-4 flex-col">
        <nav className="flex-1 space-y-1">
            {navStructure.map((item, index) => {
            if (item.type === 'divider') {
                return (
                <div key={`divider-${index}`} className="pt-3 pb-2">
                    {item.label && <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pb-2">{item.label}</span>}
                    <hr className="border-gray-200/80" />
                </div>
                );
            }
            return (
                <NavButton
                key={item.id}
                item={item as any}
                activeView={activeView}
                onClick={() => handleNavClick(item.id as View)}
                />
            );
            })}
        </nav>
        {user && (
            <div className="mt-auto p-4 bg-gray-50 rounded-lg border border-gray-200/80">
            <p className="text-sm text-[#5F6368] mb-1">Credits</p>
            <p className="text-2xl font-bold text-[#1E1E1E]">{user.credits}</p>
            <button 
                onClick={() => {
                    navigateTo('home', undefined, 'pricing');
                }}
                className="w-full mt-3 bg-[#f9d230] text-[#1E1E1E] text-sm font-semibold py-2 rounded-lg hover:scale-105 transform transition-transform"
            >
                Get More Credits
            </button>
            </div>
        )}
    </aside>
  );
};

export default Sidebar;
// Minor change for commit.--- START OF FILE src/components/EditProfileModal.tsx ---

import React, { useState } from 'react';
import { User } from '../App';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSave }) => {
  const [name, setName] = useState(user.name);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && name.trim() !== user.name) {
      setIsLoading(true);
      await onSave(name.trim());
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      aria-labelledby="edit-profile-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-sm m-4 p-8 rounded-2xl shadow-xl border border-gray-200/80"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-20"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center">
          <h2 id="edit-profile-title" className="text-2xl font-bold text-[#1E1E1E] mb-2">Edit Profile</h2>
          <p className="text-[#5F6368] mb-6">Update your personal information.</p>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 text-left mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
                required
              />
            </div>
            <div>
               <label htmlFor="email" className="block text-sm font-medium text-gray-700 text-left mb-1">
                Email
              </label>
               <input
                type="email"
                id="email"
                value={user.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || name.trim() === user.name}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0079F2] rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
// Minor change for commit.--- START OF FILE src/utils/audioUtils.ts ---

// Base64 encoding function
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Base64 decoding function
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Decodes raw PCM audio data into an AudioBuffer that can be played by the browser.
 * @param data The raw audio data as a Uint8Array.
 * @param ctx The AudioContext to use for creating the buffer.
 * @param sampleRate The sample rate of the audio.
 * @param numChannels The number of audio channels.
 * @returns A promise that resolves to an AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // The raw data is Int16, so we create a view of the buffer as Int16Array
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  
  // Create an AudioBuffer with the correct parameters
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  // Fill the AudioBuffer with the PCM data, converting from Int16 to Float32
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize the Int16 value to the Float32 range [-1.0, 1.0]
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
const MagicBackgroundEraser: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    return (<div></div>);
};
const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    return (<div></div>);
};
const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    return (<div></div>);
};
const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    return (<div></div>);
};
const PixaChat: React.FC<{
    user: User | null;
    isConversationOpen: boolean;
    setIsConversationOpen: (isOpen: boolean) => void;
}> = ({ user, isConversationOpen, setIsConversationOpen }) => {
    return (<div></div>);
};

// FIX: Changed to a named export to resolve circular dependency with App.tsx
export const DashboardPage: React.FC<DashboardPageProps> = ({
  navigateTo,
  auth,
  activeView,
  setActiveView,
  openEditProfileModal,
  isConversationOpen,
  setIsConversationOpen
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const showBackButton = activeView !== 'dashboard' && activeView !== 'home_dashboard';

  const handleBack = () => {
      // Determine the most logical place to go back to.
      if (['studio', 'eraser', 'colour', 'caption', 'interior', 'apparel', 'mockup'].includes(activeView)) {
          setActiveView('dashboard');
      } else {
          setActiveView('home_dashboard');
      }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderContent = () => {
    switch (activeView) {
      case 'home_dashboard':
        return isMobile ? <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} /> : <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
      case 'dashboard':
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
      case 'studio':
        return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} />;
      case 'interior':
          return <MagicInterior auth={auth} navigateTo={navigateTo} />;
      case 'colour':
          return <MagicPhotoColour auth={auth} navigateTo={navigateTo} />;
      case 'eraser':
          return <MagicBackgroundEraser auth={auth} navigateTo={navigateTo} />;
       case 'apparel':
          return <MagicApparel auth={auth} navigateTo={navigateTo} />;
       case 'mockup':
            return <MagicMockup auth={auth} navigateTo={navigateTo} />;
       case 'caption':
            return <CaptionAI auth={auth} navigateTo={navigateTo} />;
      case 'billing':
        return auth.user ? <Billing user={auth.user} setUser={auth.setUser} /> : null;
      case 'profile':
          // On mobile, this view is triggered from the nav bar.
          // On desktop, it is a modal. We handle modal opening in App.tsx
          if (isMobile && auth.user) {
              return (
                  <div className="p-4">
                      <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-[#0079F2] font-bold text-2xl">
                                {auth.user.avatar}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-[#1E1E1E]">{auth.user.name}</h3>
                                <p className="text-sm text-[#5F6368] truncate">{auth.user.email}</p>
                            </div>
                        </div>
                        <button onClick={openEditProfileModal} className="w-full flex items-center justify-center gap-2 text-sm py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                           <PencilIcon className="w-4 h-4" /> Edit Profile
                        </button>
                        <button onClick={auth.handleLogout} className="w-full mt-2 flex items-center justify-center gap-2 text-sm py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                           <LogoutIcon className="w-4 h-4" /> Logout
                        </button>
                    </div>
                  </div>
              );
          }
          return null;
      default:
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
        <Header 
            navigateTo={navigateTo} 
            auth={{...auth, isDashboard: true, showBackButton, handleBack, openConversation: () => setIsConversationOpen(true)}} 
        />
        <div className="lg:flex h-[calc(100vh-69px)]">
            <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} />
            <main className="flex-1 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
        <PixaChat 
            user={auth.user} 
            isConversationOpen={isConversationOpen}
            setIsConversationOpen={setIsConversationOpen}
        />
    </div>
  );
};
