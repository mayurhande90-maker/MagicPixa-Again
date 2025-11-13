import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User } from './types';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, generateMagicSoul, generateApparelTryOn, generateMockup, generateCaptions, generateSupportResponse, generateProductPackPlan, generateStyledImage, generateVideo, getVideoOperationStatus, generateBrandStylistImage, removeElementFromImage } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import ThemeToggle from './components/ThemeToggle';
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ProductStudioIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon, ShieldCheckIcon, DocumentTextIcon, FlagIcon,
    ArrowRightIcon, ZoomInIcon, FilmIcon, VideoCameraIcon, ColorSwatchIcon
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
    { view: 'product_studio', title: 'Product Studio', icon: ProductStudioIcon, gradient: 'from-green-400 to-green-500' },
    { view: 'brand_stylist', title: 'Brand Stylist', icon: LightbulbIcon, gradient: 'from-yellow-400 to-yellow-500' },
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
                        <p className="text-sm text-[#5F6368] mb-4">{user?.plan} Plan</p>
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
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Photo Studio');
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
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Interior');
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
                const updatedProfile = await deductCredits(auth.user.uid, currentCost, 'Magic Photo Colour');
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
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Soul');
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
                    <div className="lg:col-span-3 w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-full flex items-center justify-center overflow-hidden">
                            {isLoading ? <div className="text-center"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Creating your magic moment...</p></div>
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-contain"/></div>
                            : <div className="text-center text-gray-400"><UsersIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your generated photo will appear here.</p></div>}
                        </div>
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
                                    <button onClick={handleDownloadClick} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm">
                                        <DownloadIcon className="w-5 h-5" /> Download
                                    </button>
                                    <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] hover:bg-blue-50 font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                                        <RetryIcon className="w-5 h-5" /> Regenerate
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleGenerate} disabled={isLoading || !hasImages || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-lg shadow-sm disabled:opacity-50">
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

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [person, setPerson] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [top, setTop] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [trousers, setTrousers] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const personInputRef = useRef<HTMLInputElement>(null);
    const topInputRef = useRef<HTMLInputElement>(null);
    const trousersInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 3;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-apparel') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-apparel')!, 10) : 3);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const canGenerate = person !== null && (top !== null || trousers !== null);

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-apparel', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'person' | 'top' | 'trousers') => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            if (type === 'person') setPerson(data);
            else if (type === 'top') setTop(data);
            else setTrousers(data);
            setGeneratedImage(null);
            setError(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!person) {
            setError("Please upload a photo of a person.");
            return;
        }
        if (!top && !trousers) {
            setError("Please upload at least one clothing item.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const apparelItems = [];
            if (top) apparelItems.push({ type: 'top', base64: top.base64.base64, mimeType: top.base64.mimeType });
            if (trousers) apparelItems.push({ type: 'trousers', base64: trousers.base64.base64, mimeType: trousers.base64.mimeType });

            const newBase64 = await generateApparelTryOn(person.base64.base64, person.base64.mimeType, apparelItems);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Apparel');
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
        setPerson(null);
        setTop(null);
        setTrousers(null);
        setGeneratedImage(null);
        setError(null);
        if (personInputRef.current) personInputRef.current.value = "";
        if (topInputRef.current) topInputRef.current.value = "";
        if (trousersInputRef.current) trousersInputRef.current.value = "";
    };

    const ImageUploadBox: React.FC<{
        image: { url: string } | null;
        inputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        title: string;
        icon: React.ReactNode;
        className?: string;
    }> = ({ image, inputRef, onFileChange, title, icon, className }) => {
        const triggerFileInput = () => inputRef.current?.click();
        return (
            <div className={`relative w-full aspect-[3/4] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''} ${className}`} onClick={!image ? triggerFileInput : undefined}>
                <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                {image ? (
                    <>
                        <img src={image.url} alt={title} className="w-full h-full object-cover" />
                        <button onClick={triggerFileInput} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title={`Change ${title}`}><ArrowUpCircleIcon className="w-5 h-5" /></button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500 p-2">
                        {icon}
                        <span className="font-semibold text-sm text-gray-700">{title}</span>
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
                    <p className="text-[#5F6368] mt-2">Virtually try on any clothing with a single click.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3 w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-full flex items-center justify-center overflow-hidden">
                            {isLoading ? <div className="text-center"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Styling your look...</p></div>
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-contain"/></div>
                            : <div className="text-center text-gray-400"><UsersIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your virtual try-on will appear here.</p></div>}
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <ImageUploadBox image={person} inputRef={personInputRef} onFileChange={e => handleFileChange(e, 'person')} title="Person" icon={<AvatarUserIcon className="w-8 h-8"/>} />
                            <ImageUploadBox image={top} inputRef={topInputRef} onFileChange={e => handleFileChange(e, 'top')} title="Top" icon={<GarmentTopIcon className="w-8 h-8"/>} />
                            <ImageUploadBox image={trousers} inputRef={trousersInputRef} onFileChange={e => handleFileChange(e, 'trousers')} title="Bottoms" icon={<GarmentTrousersIcon className="w-8 h-8"/>} />
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-4">
                            <div className="space-y-2">
                                {generatedImage ? (
                                    <>
                                        <button onClick={() => { if(generatedImage) { const link = document.createElement('a'); link.href = generatedImage; link.download = `magicpixa_tryon_${Date.now()}.png`; link.click(); }}} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg"><DownloadIcon className="w-5 h-5"/> Download</button>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={handleGenerate} disabled={isLoading || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] font-bold py-2 rounded-lg disabled:opacity-50"><RetryIcon className="w-5 h-5"/> Regenerate</button>
                                            <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 font-bold py-2 rounded-lg"><UploadIcon className="w-5 h-5"/> Start Over</button>
                                        </div>
                                    </>
                                ) : (
                                    <button onClick={handleGenerate} disabled={isLoading || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50"><SparklesIcon className="w-5 h-5"/> Generate</button>
                                )}
                                <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                            </div>
                            {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                        </div>
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mockupType, setMockupType] = useState(mockupTypes[0].key);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 2;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-mockup') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-mockup')!, 10) : 2);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const canGenerate = originalImage !== null && mockupType !== null;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-mockup', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'image/png') {
                setError('Please upload a transparent PNG file for the best results.');
            } else {
                setError(null);
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            setOriginalImage(data);
            setGeneratedImage(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!originalImage) {
            setError("Please upload your logo or design.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            const newBase64 = await generateMockup(originalImage.base64.base64, originalImage.base64.mimeType, mockupType);
            setGeneratedImage(`data:image/png;base64,${newBase64}`);
            
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Mockup');
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
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-48'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Magic Mockup</h2>
                    <p className="text-[#5F6368] mt-2">Generate realistic mockups for your designs instantly.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3 w-full aspect-square bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-full flex items-center justify-center overflow-hidden">
                            {isLoading ? <div className="text-center"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Generating your mockup...</p></div>
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-contain"/></div>
                            : <div className="text-center text-gray-400 p-4"><MockupIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your generated mockup will appear here.</p></div>}
                        </div>
                    </div>
                    
                    <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">1. Upload your design</label>
                            <div className={`relative w-full aspect-video bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors ${!originalImage ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`} onClick={!originalImage ? () => fileInputRef.current?.click() : undefined}>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png" />
                                {originalImage ? (
                                    <>
                                        <img src={originalImage.url} alt="Uploaded design" className="w-full h-full object-contain p-2" />
                                        <button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title="Change design"><ArrowUpCircleIcon className="w-5 h-5" /></button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-gray-500 p-2"><UploadIcon className="w-8 h-8" /><span className="font-semibold text-sm text-gray-700">Upload Transparent PNG</span></div>
                                )}
                            </div>
                        </div>

                        <div className={!originalImage ? 'opacity-50' : ''}>
                            <label className="block text-sm font-bold text-[#1E1E1E] mb-2">2. Choose Mockup</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                                {mockupTypes.map(m => (
                                    <button key={m.key} onClick={() => setMockupType(m.key)} disabled={!originalImage} className={`py-2 px-1 text-xs font-semibold rounded-lg border-2 transition-colors ${mockupType === m.key ? 'bg-[#0079F2] text-white border-[#0079F2]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#0079F2]'} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-300`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t border-gray-200/80">
                           {generatedImage ? (
                                <>
                                    <button onClick={() => { if(generatedImage) { const link = document.createElement('a'); link.href = generatedImage; link.download = `magicpixa_mockup_${Date.now()}.png`; link.click(); }}} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg"><DownloadIcon className="w-5 h-5"/> Download</button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={handleGenerate} disabled={isLoading || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-[#0079F2] text-[#0079F2] font-bold py-2 rounded-lg disabled:opacity-50"><RetryIcon className="w-5 h-5"/> Regenerate</button>
                                        <button onClick={handleStartOver} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-600 font-bold py-2 rounded-lg"><UploadIcon className="w-5 h-5"/> Start Over</button>
                                    </div>
                                </>
                            ) : (
                                <button onClick={handleGenerate} disabled={isLoading || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50"><SparklesIcon className="w-5 h-5"/> Generate</button>
                           )}
                           <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                        </div>
                        {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                    </div>
                </div>
            </div>
            {isModalOpen && generatedImage && <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
};

const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [image, setImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [captions, setCaptions] = useState<{ caption: string; hashtags: string }[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 1;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-caption') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-caption')!, 10) : 3);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const canGenerate = image !== null;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-caption', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            setImage({ file, url: URL.createObjectURL(file), base64 });
            setCaptions(null);
            setError(null);
        }
    };
    
    const handleGenerate = async () => {
        if (!image) {
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
        
        try {
            const result = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(result);
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'CaptionAI');
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

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-4xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">CaptionAI</h2>
                    <p className="text-[#5F6368] mt-2">Generate engaging social media captions instantly.</p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div>
                            <div 
                                className={`relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`} 
                                onClick={!image ? () => fileInputRef.current?.click() : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                {image ? (
                                    <>
                                        <img src={image.url} alt="Uploaded for captioning" className="w-full h-full object-cover" />
                                        <button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title="Change image"><ArrowUpCircleIcon className="w-5 h-5" /></button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 text-gray-500 p-2"><UploadIcon className="w-8 h-8" /><span className="font-semibold text-sm text-gray-700">Upload Image</span></div>
                                )}
                            </div>
                            <button onClick={handleGenerate} disabled={isLoading || !canGenerate || hasInsufficientCredits} className="w-full mt-4 flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                {isLoading ? 'Generating...' : <><SparklesIcon className="w-5 h-5"/> Generate Captions</>}
                            </button>
                            <p className={`text-xs text-center mt-2 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credit.`}</p>
                            {error && <div className='mt-2 text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                        </div>

                        <div className="space-y-4">
                            {isLoading && <div className="text-center p-8"><SparklesIcon className="w-10 h-10 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-2 text-sm text-gray-500">Generating creative ideas...</p></div>}
                            {captions ? (
                                captions.map((c, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200/80">
                                        <p className="text-sm text-gray-700 mb-2">{c.caption}</p>
                                        <p className="text-xs text-blue-600 font-medium mb-3">{c.hashtags}</p>
                                        <button onClick={() => handleCopy(`${c.caption}\n\n${c.hashtags}`, index)} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-600 text-xs font-semibold py-1.5 rounded-md hover:bg-gray-100">
                                            {copiedIndex === index ? <><CheckIcon className="w-4 h-4 text-green-500"/> Copied!</> : <><CopyIcon className="w-4 h-4"/> Copy</>}
                                        </button>
                                    </div>
                                ))
                            ) : !isLoading && (
                                <div className="text-center p-8 text-gray-400">
                                    <CaptionIcon className="w-12 h-12 mx-auto mb-2"/>
                                    <p className="text-sm">Your generated captions will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// FIX: Corrected component definition and moved InputField and TextAreaField outside to prevent re-renders.
const InputField: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
    type?: string;
    required?: boolean;
}> = ({ id, label, value, onChange, placeholder, type = "text", required = false }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-bold text-[#1E1E1E] mb-1.5">{label}</label>
        <input
            id={id}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
        />
    </div>
);

const TextAreaField: React.FC<{
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    required?: boolean;
    rows?: number;
}> = ({ id, label, value, onChange, placeholder, required = false, rows = 3 }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-bold text-[#1E1E1E] mb-1.5">{label}</label>
        <textarea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            rows={rows}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0079F2]"
        />
    </div>
);

const ProductStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [productImages, setProductImages] = useState<{ file: File; url: string; base64: Base64File }[]>([]);
    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isGeneratingVideos, setIsGeneratingVideos] = useState(false);
    const [videoStatuses, setVideoStatuses] = useState<{ spin: string; cinemagraph: string }>({ spin: 'idle', cinemagraph: 'idle' });
    
    // Advanced Inputs
    const [brandLogo, setBrandLogo] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [brandColors, setBrandColors] = useState<string[]>([]);
    const [brandFonts, setBrandFonts] = useState('');
    const [competitorUrl, setCompetitorUrl] = useState('');
    const [inspirationImages, setInspirationImages] = useState<{ file: File; url: string; base64: Base64File }[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
    const [generatedImages, setGeneratedImages] = useState<{ [key: string]: string }>({});
    const [generatedVideos, setGeneratedVideos] = useState<{ [key: string]: string }>({});

    const fileInputRef = useRef<HTMLInputElement>(null);
    const brandLogoInputRef = useRef<HTMLInputElement>(null);
    const inspirationInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 5;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? 0 : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'product' | 'brand' | 'inspiration') => {
        const files = event.target.files;
        if (!files) return;

        const processedFiles = await Promise.all(
            Array.from(files).map(async (file) => {
                if (!file.type.startsWith('image/')) return null;
                const base64 = await fileToBase64(file);
                return { file, url: URL.createObjectURL(file), base64 };
            })
        );

        const validFiles = processedFiles.filter(f => f !== null) as { file: File; url: string; base64: Base64File }[];
        if (validFiles.length === 0) return;

        if (type === 'product') {
            setProductImages(prev => [...prev, ...validFiles].slice(0, 5));
        } else if (type === 'brand') {
            setBrandLogo(validFiles[0]);
        } else if (type === 'inspiration') {
            setInspirationImages(prev => [...prev, ...validFiles].slice(0, 3));
        }
        
        setError(null);
    };

    const pollVideoStatus = useCallback(async (operation: any, videoKey: 'spin' | 'cinemagraph') => {
        setVideoStatuses(prev => ({ ...prev, [videoKey]: 'Generating...' }));

        const intervalId = setInterval(async () => {
            try {
                const updatedOp = await getVideoOperationStatus(operation);
                if (updatedOp.done) {
                    clearInterval(intervalId);
                    if (updatedOp.error) {
                         console.error(`Video generation failed for ${videoKey}:`, updatedOp.error.message);
                         setError(`Video generation failed for ${videoKey}.`);
                         setVideoStatuses(prev => ({ ...prev, [videoKey]: 'Error' }));
                    } else {
                        const videoUri = updatedOp.response?.generatedVideos?.[0]?.video?.uri;
                        if (videoUri) {
                            // The API key is now automatically appended by the service
                            const response = await fetch(`${videoUri}&key=${import.meta.env.VITE_API_KEY}`);
                            const blob = await response.blob();
                            const videoObjectUrl = URL.createObjectURL(blob);
                            setGeneratedVideos(prev => ({ ...prev, [videoKey]: videoObjectUrl }));
                            setVideoStatuses(prev => ({ ...prev, [videoKey]: 'Done' }));
                        } else {
                            setError(`Could not retrieve video URL for ${videoKey}.`);
                            setVideoStatuses(prev => ({ ...prev, [videoKey]: 'Error' }));
                        }
                    }
                }
            } catch (pollError: any) {
                console.error("Error polling video status:", pollError);
                setError(pollError.message || "Failed to get video status.");
                setVideoStatuses(prev => ({ ...prev, [videoKey]: 'Error' }));
                clearInterval(intervalId);
                if (pollError.message.includes("API key")) {
                    await window.aistudio?.openSelectKey();
                }
            }
        }, 10000);

        return () => clearInterval(intervalId);
    }, []);

    const handleGenerate = async () => {
        if (productImages.length === 0 || !productName || !productDescription) {
            setError("Please upload at least one product photo and fill in the name and description.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPlan(null);
        setGeneratedImages({});
        setGeneratedVideos({});
        setVideoStatuses({ spin: 'idle', cinemagraph: 'idle' });
        
        try {
            // Step 1: Generate the plan
            const plan = await generateProductPackPlan(
                productImages.map(img => img.base64),
                productName,
                productDescription,
                { logo: brandLogo?.base64, colors: brandColors, fonts: brandFonts.split(',').map(f => f.trim()) },
                competitorUrl,
                inspirationImages.map(img => img.base64)
            );
            setGeneratedPlan(plan);

            // Step 2: Generate all images in parallel
            const imagePrompts = plan.imageGenerationPrompts;
            const imageKeys = Object.keys(imagePrompts);
            const imagePromises = imageKeys.map(key => 
                generateStyledImage(productImages.map(img => img.base64), imagePrompts[key])
                    .then(base64 => ({ key, base64: `data:image/png;base64,${base64}` }))
                    .catch(e => ({ key, error: e }))
            );

            const imageResults = await Promise.all(imagePromises);
            const newImages: { [key: string]: string } = {};
            imageResults.forEach(result => {
                if ('base64' in result) {
                    newImages[result.key] = result.base64;
                } else {
                    console.error(`Failed to generate image for ${result.key}:`, result.error);
                }
            });
            setGeneratedImages(newImages);

            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Product Studio');
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }

            // Step 3: Initiate Video Generation
            if (plan.videoGenerationPrompts) {
                 const hasKey = await window.aistudio?.hasSelectedApiKey();
                 if (!hasKey) {
                     await window.aistudio?.openSelectKey();
                 }

                setIsGeneratingVideos(true);
                
                const { video360Spin, videoCinemagraph } = plan.videoGenerationPrompts;
                if (video360Spin) {
                    generateVideo(video360Spin)
                        .then(op => pollVideoStatus(op, 'spin'))
                        .catch(e => {
                             setError(`Failed to start 360 Spin video: ${e.message}`);
                             setVideoStatuses(prev => ({...prev, spin: 'Error'}));
                        });
                }
                if (videoCinemagraph) {
                    generateVideo(videoCinemagraph)
                        .then(op => pollVideoStatus(op, 'cinemagraph'))
                        .catch(e => {
                             setError(`Failed to start Cinemagraph video: ${e.message}`);
                             setVideoStatuses(prev => ({...prev, cinemagraph: 'Error'}));
                        });
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleStartOver = () => {
        setProductImages([]);
        setProductName('');
        setProductDescription('');
        setBrandLogo(null);
        setBrandColors([]);
        setBrandFonts('');
        setCompetitorUrl('');
        setInspirationImages([]);
        setGeneratedPlan(null);
        setGeneratedImages({});
        setGeneratedVideos({});
        setIsLoading(false);
        setError(null);
        setIsGeneratingVideos(false);
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Product Studio</h2>
                    <p className="text-[#5F6368] mt-2">Generate a complete, on-brand product pack automatically.</p>
                </div>
                
                {!generatedPlan ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                             <div>
                                <h3 className="text-xl font-bold text-[#1E1E1E] mb-2">1. Core Product Info</h3>
                                <InputField id="productName" label="Brand Name / Product Name" value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g., Aura Glow Vitamin C Serum" required />
                                <div className="mt-4">
                                    <TextAreaField id="productDescription" label="Short Product Description" value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="e.g., 'A lightweight daily serum for bright, even-toned skin.'" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Product Photos (up to 5)</label>
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                    {productImages.map((img, index) => (
                                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                                            <img src={img.url} className="w-full h-full object-cover" />
                                            <button onClick={() => setProductImages(prev => prev.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    {productImages.length < 5 && (
                                        <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500">
                                            <PlusIcon className="w-6 h-6"/>
                                        </button>
                                    )}
                                </div>
                                <input type="file" ref={fileInputRef} onChange={e => handleFileChange(e, 'product')} className="hidden" accept="image/*" multiple />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6">
                            <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex justify-between items-center">
                                <h3 className="text-xl font-bold text-[#1E1E1E]">2. Creative Boosters (Optional)</h3>
                                {showAdvanced ? <ChevronUpIcon className="w-5 h-5"/> : <ChevronDownIcon className="w-5 h-5"/>}
                            </button>
                            {showAdvanced && (
                                <div className="mt-4 pt-4 border-t space-y-4">
                                    <InputField id="competitorUrl" label="Competitor URL" value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="e.g., https://competitor.com/product" />
                                     <div>
                                        <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Brand Kit</label>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0">
                                                <button onClick={() => brandLogoInputRef.current?.click()} className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center">
                                                    {brandLogo ? <img src={brandLogo.url} className="w-full h-full object-contain p-1"/> : <ColorSwatchIcon className="w-6 h-6 text-gray-400"/>}
                                                </button>
                                                <input type="file" ref={brandLogoInputRef} onChange={e => handleFileChange(e, 'brand')} className="hidden" accept="image/png" />
                                                <p className="text-xs text-center mt-1">Logo (PNG)</p>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input value={brandColors.join(', ')} onChange={e => setBrandColors(e.target.value.split(',').map(c => c.trim()))} placeholder="Brand Colors (hex, e.g. #ff0000)" className="w-full text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg"/>
                                                <input value={brandFonts} onChange={e => setBrandFonts(e.target.value)} placeholder="Brand Fonts (e.g. Poppins, Lato)" className="w-full text-sm px-3 py-2 bg-white border border-gray-300 rounded-lg"/>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Inspiration Images (up to 3)</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {inspirationImages.map((img, index) => (
                                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                                                    <img src={img.url} className="w-full h-full object-cover" />
                                                     <button onClick={() => setInspirationImages(prev => prev.filter((_, i) => i !== index))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                                </div>
                                            ))}
                                            {inspirationImages.length < 3 && (
                                                <button onClick={() => inspirationInputRef.current?.click()} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500">
                                                    <PlusIcon className="w-6 h-6"/>
                                                </button>
                                            )}
                                        </div>
                                        <input type="file" ref={inspirationInputRef} onChange={e => handleFileChange(e, 'inspiration')} className="hidden" accept="image/*" multiple />
                                    </div>
                                </div>
                            )}
                            <div className="mt-6 pt-6 border-t">
                                <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                    {isLoading ? 'Generating...' : <><SparklesIcon className="w-5 h-5"/> Generate Product Pack</>}
                                </button>
                                <p className={`text-xs text-center mt-2 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                                {error && <div className='mt-2 text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Results View */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold">Your Generated Product Pack</h2>
                            <button onClick={handleStartOver} className="font-semibold text-blue-600 hover:underline">Start Over</button>
                        </div>
                        
                        {/* Visual Assets Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                            <h3 className="text-xl font-bold mb-4">Visual Assets</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.entries(generatedImages).map(([key, src]) => (
                                     <div key={key} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                                         <img src={src as string} alt={key} className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                             <p className="text-white font-bold capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                         </div>
                                     </div>
                                ))}
                            </div>
                        </div>

                         {/* Storyboard Section */}
                        {generatedImages.storyboardPanel1 && (
                            <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                                <div className="flex items-center gap-2 mb-4">
                                    <FilmIcon className="w-6 h-6"/>
                                    <h3 className="text-xl font-bold">Visual Storyboard</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     {['storyboardPanel1', 'storyboardPanel2', 'storyboardPanel3'].map((key, index) => (
                                         generatedImages[key] && (
                                            <div key={key} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                                                <img src={generatedImages[key]} alt={`Storyboard Panel ${index+1}`} className="w-full h-full object-cover" />
                                                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{index+1}</div>
                                            </div>
                                         )
                                     ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Video Assets Section */}
                        {isGeneratingVideos && (
                             <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                                <div className="flex items-center gap-2 mb-4">
                                    <VideoCameraIcon className="w-6 h-6"/>
                                    <h3 className="text-xl font-bold">Video Assets</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {Object.entries({ spin: '360° Spin', cinemagraph: 'Cinemagraph' }).map(([key, title]) => (
                                        <div key={key} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative flex flex-col items-center justify-center">
                                            {generatedVideos[key] ? (
                                                <video src={generatedVideos[key]} controls autoPlay loop muted className="w-full h-full object-cover"></video>
                                            ) : (
                                                <div className="text-center">
                                                    <p className="font-bold mb-2">{title}</p>
                                                    <p className="text-sm text-gray-500 capitalize">{videoStatuses[key as keyof typeof videoStatuses]}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}


                        {/* Text Assets Section */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                            <h3 className="text-xl font-bold mb-4">Text & Copy Assets</h3>
                            <div className="space-y-4">
                                 <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-bold text-gray-500">SEO TITLE</label>
                                    <p>{generatedPlan.textAssets.seoTitle}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-bold text-gray-500">ALT TEXT</label>
                                    <p>{generatedPlan.textAssets.altText}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-bold text-gray-500">CAPTIONS</label>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                        {generatedPlan.textAssets.captions.map((c: any, i: number) => <li key={i}><span className="font-bold capitalize">{c.length}:</span> {c.text}</li>)}
                                    </ul>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <label className="text-xs font-bold text-gray-500">KEYWORDS</label>
                                    <p className="text-blue-600">{generatedPlan.textAssets.keywords.join(', ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const BrandStylistAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [brandLogo, setBrandLogo] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [productImage, setProductImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    
    const [brandName, setBrandName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [brandColors, setBrandColors] = useState('');
    const [brandFonts, setBrandFonts] = useState('');
    const [website, setWebsite] = useState('');
    const [contactDetails, setContactDetails] = useState('');
    const [emailId, setEmailId] = useState('');

    const [originalGeneratedImage, setOriginalGeneratedImage] = useState<string | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [processing, setProcessing] = useState<{ logo: boolean; product: boolean; reference: boolean }>({ logo: false, product: false, reference: false });
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const brandLogoRef = useRef<HTMLInputElement>(null);
    const productImageRef = useRef<HTMLInputElement>(null);
    const referenceImageRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = 4;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-stylist') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-stylist')!, 10) : 4);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;
    const isProcessingFile = processing.logo || processing.product || processing.reference;
    const canGenerate = brandLogo && productImage && referenceImage && brandName && productDescription;

    useEffect(() => {
        if (isGuest) sessionStorage.setItem('magicpixa-guest-credits-stylist', guestCredits.toString());
    }, [isGuest, guestCredits]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'product' | 'reference') => {
        const file = event.target.files?.[0];
        if (!file) return;

        setProcessing(prev => ({ ...prev, [type]: true }));
        setError(null);

        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file.');
            setProcessing(prev => ({ ...prev, [type]: false }));
            return;
        }
        
        try {
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            if (type === 'logo') setBrandLogo(data);
            else if (type === 'product') setProductImage(data);
            else setReferenceImage(data);
        } catch(err) {
            setError("Failed to process the image. Please try again.");
            console.error(err);
        } finally {
            setProcessing(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleGenerate = async () => {
        if (!canGenerate) {
            setError("Please fill in all required fields and upload all three images.");
            return;
        }
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const newBase64 = await generateBrandStylistImage({
                logo: brandLogo!.base64,
                product: productImage!.base64,
                reference: referenceImage!.base64,
                name: brandName,
                description: productDescription,
                colors: brandColors,
                fonts: brandFonts,
                website: website,
                contact: contactDetails,
                email: emailId
            });
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);
            setOriginalGeneratedImage(newImage);
             if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Brand Stylist AI');
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
        setBrandLogo(null);
        setProductImage(null);
        setReferenceImage(null);
        setBrandName('');
        setProductDescription('');
        setBrandColors('');
        setBrandFonts('');
        setWebsite('');
        setContactDetails('');
        setEmailId('');
        setGeneratedImage(null);
        setOriginalGeneratedImage(null);
        setError(null);
        if(brandLogoRef.current) brandLogoRef.current.value = "";
        if(productImageRef.current) productImageRef.current.value = "";
        if(referenceImageRef.current) referenceImageRef.current.value = "";
    };

    const ImageUploadControl: React.FC<{ image: { url: string } | null; inputRef: React.RefObject<HTMLInputElement>; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; isProcessing: boolean; altText: string; }> = ({ image, inputRef, onFileChange, isProcessing, altText }) => (
        <div className={`relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50`} onClick={() => inputRef.current?.click()}>
            <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
            {image ? (
                <>
                    <img src={image.url} alt={altText} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <PencilIcon className="w-6 h-6 text-white"/>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center gap-1 text-gray-500 p-2"><UploadIcon className="w-8 h-8" /><span className="font-semibold text-xs text-gray-700">Upload</span></div>
            )}
            {isProcessing && (
                 <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 * 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
            )}
        </div>
    );

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Brand Stylist AI</h2>
                    <p className="text-[#5F6368] mt-2">Generate on-brand visuals in the style of any image.</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    <div className="lg:col-span-3 w-full aspect-[4/3] bg-white rounded-2xl p-4 border border-gray-200/80 shadow-lg shadow-gray-500/5">
                        <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 h-full flex items-center justify-center overflow-hidden group">
                            {isLoading ? <div className="text-center p-4"><SparklesIcon className="w-12 h-12 text-[#f9d230] animate-pulse mx-auto"/><p className="mt-4 font-medium">Your AI creative director is at work...</p></div>
                            : generatedImage ? (
                                <>
                                    <img src={generatedImage} alt="Generated" className="w-full h-full object-contain cursor-pointer" onClick={() => setIsModalOpen(true)}/>
                                    <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                                        <button onClick={() => { if(generatedImage) { const link = document.createElement('a'); link.href = generatedImage; link.download = `magicpixa_stylist_${Date.now()}.png`; link.click(); }}} className="bg-white/80 backdrop-blur-sm rounded-full p-2 text-gray-700 hover:text-black shadow-md"><DownloadIcon className="w-6 h-6"/></button>
                                        <button onClick={() => setIsEditModalOpen(true)} className="bg-white/80 backdrop-blur-sm rounded-full p-2 text-gray-700 hover:text-black shadow-md"><PencilIcon className="w-6 h-6"/></button>
                                    </div>
                                </>
                            )
                            : <div className="text-center text-gray-400 p-4"><LightbulbIcon className="w-16 h-16 mx-auto mb-2"/><p className="font-semibold">Your generated image will appear here.</p></div>}
                        </div>
                    </div>

                    <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div>
                           <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">1. Upload Your Assets</h3>
                           <div className="flex items-start justify-center gap-4 text-center">
                               <div className="flex flex-col items-center gap-1.5 w-1/3">
                                   <label className="block text-sm font-bold text-[#1E1E1E]">Brand Logo</label>
                                   <ImageUploadControl image={brandLogo} inputRef={brandLogoRef} onFileChange={e => handleFileChange(e, 'logo')} isProcessing={processing.logo} altText="Brand Logo"/>
                               </div>
                               <div className="flex flex-col items-center gap-1.5 w-1/3">
                                   <label className="block text-sm font-bold text-[#1E1E1E]">Product Photo</label>
                                   <ImageUploadControl image={productImage} inputRef={productImageRef} onFileChange={e => handleFileChange(e, 'product')} isProcessing={processing.product} altText="Product Photo"/>
                               </div>
                               <div className="flex flex-col items-center gap-1.5 w-1/3">
                                   <label className="block text-sm font-bold text-[#1E1E1E]">Reference Style</label>
                                   <ImageUploadControl image={referenceImage} inputRef={referenceImageRef} onFileChange={e => handleFileChange(e, 'reference')} isProcessing={processing.reference} altText="Reference Style"/>
                               </div>
                           </div>
                        </div>
                        
                        <div>
                           <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">2. Provide Brand Details</h3>
                           <div className="space-y-4">
                               <InputField id="brandName" label="Brand Name" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="e.g., Aura Glow" required/>
                               <TextAreaField id="prodDesc" label="Product Description" value={productDescription} onChange={e => setProductDescription(e.target.value)} placeholder="e.g., A lightweight daily serum..." required rows={2}/>
                               <InputField id="brandColors" label="Brand Colors (Optional)" value={brandColors} onChange={e => setBrandColors(e.target.value)} placeholder="e.g., pastel pink, gold, #F0E68C" />
                               <InputField id="brandFonts" label="Brand Font Style (Optional)" value={brandFonts} onChange={e => setBrandFonts(e.target.value)} placeholder="e.g., a clean modern sans-serif" />
                               <InputField id="brandWebsite" label="Website (Optional)" value={website} onChange={e => setWebsite(e.target.value)} placeholder="e.g., www.auraglow.com" />
                               <InputField id="brandContact" label="Contact Number (Optional)" value={contactDetails} onChange={e => setContactDetails(e.target.value)} placeholder="e.g., +91 98765 43210" />
                               <InputField id="brandEmail" label="Email ID (Optional)" value={emailId} onChange={e => setEmailId(e.target.value)} placeholder="e.g., contact@auraglow.com" />
                           </div>
                        </div>
                        
                         <div className="flex-grow flex flex-col justify-end">
                            <div className="space-y-2 pt-6 border-t border-gray-200/80">
                               {originalGeneratedImage && generatedImage && originalGeneratedImage !== generatedImage && !isLoading && (
                                   <button onClick={() => setGeneratedImage(originalGeneratedImage)} className="w-full text-center text-sm font-semibold text-blue-600 hover:underline">Revert to Original</button>
                               )}

                               {generatedImage ? (
                                   <div className="space-y-2">
                                       <button onClick={handleGenerate} disabled={isLoading || isProcessingFile || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50">
                                           <RetryIcon className="w-5 h-5"/> Re-generate
                                       </button>
                                       <button onClick={handleStartOver} disabled={isLoading} className="w-full text-center text-sm text-gray-500 hover:text-gray-800 pt-2">Start Over</button>
                                   </div>
                               ) : (
                                   <button onClick={handleGenerate} disabled={isLoading || isProcessingFile || !canGenerate || hasInsufficientCredits} className="w-full flex items-center justify-center gap-2 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 rounded-lg disabled:opacity-50"><SparklesIcon className="w-5 h-5"/> Generate</button>
                               )}
                               <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credits.`}</p>
                           </div>
                        </div>
                        {error && <div className='text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm'>{error}</div>}
                    </div>
                </div>
            </div>
             {isModalOpen && generatedImage && <ImageModal imageUrl={generatedImage} onClose={() => setIsModalOpen(false)} />}
             {isEditModalOpen && generatedImage && (
                <ImageEditModal 
                    imageUrl={generatedImage} 
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={(newImage) => {
                        setGeneratedImage(newImage);
                        setIsEditModalOpen(false);
                    }}
                    auth={auth}
                    navigateTo={navigateTo}
                />
             )}
        </div>
    );
};

interface ImageEditModalProps {
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    auth: AuthProps;
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
}

const ImageEditModal: React.FC<ImageEditModalProps> = ({ imageUrl, onClose, onSave, auth, navigateTo }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const isDrawing = useRef(false);
    const [paths, setPaths] = useState<Array<{ points: { x: number; y: number }[], size: number }>>([]);
    const currentPath = useRef<{ points: { x: number; y: number }[], size: number } | null>(null);
    const [brushSize, setBrushSize] = useState(30);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const EDIT_COST = 1;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const currentCredits = isGuest ? 0 : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;

    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const img = imageRef.current;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the original image centered and scaled
        if (img) {
            const canvasAspect = canvas.width / canvas.height;
            const imageAspect = img.naturalWidth / img.naturalHeight;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let drawX = 0;
            let drawY = 0;

            if (imageAspect > canvasAspect) {
                drawHeight = canvas.width / imageAspect;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = canvas.height * imageAspect;
                drawX = (canvas.width - drawWidth) / 2;
            }
            ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        }

        // Draw all saved paths
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'; // red-500 with 50% opacity
        
        const allPaths = currentPath.current ? [...paths, currentPath.current] : paths;
        allPaths.forEach(path => {
            if (path.points.length < 2) return;
            ctx.lineWidth = path.size;
            ctx.beginPath();
            ctx.moveTo(path.points[0].x, path.points[0].y);
            for (let i = 1; i < path.points.length; i++) {
                ctx.lineTo(path.points[i].x, path.points[i].y);
            }
            ctx.stroke();
        });

    }, [paths]);

    useEffect(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageUrl;
        img.onload = () => {
            imageRef.current = img;
            const canvas = canvasRef.current;
            if (canvas) {
                const container = canvas.parentElement;
                if (container) {
                    canvas.width = container.clientWidth;
                    canvas.height = container.clientHeight;
                    redrawCanvas();
                }
            }
        };

        const handleResize = () => {
             const canvas = canvasRef.current;
             if(canvas && canvas.parentElement) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                redrawCanvas();
             }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [imageUrl, redrawCanvas]);

    useEffect(() => {
        redrawCanvas();
    }, [paths, redrawCanvas]);


    const getBrushPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!imageRef.current) return; // FIX: Prevent drawing before image is loaded.
        const pos = getBrushPos(e);
        if (!pos) return;
        isDrawing.current = true;
        currentPath.current = { points: [pos], size: brushSize };
        redrawCanvas();
    };

    const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentPath.current && currentPath.current.points.length > 0) {
            setPaths(prev => [...prev, currentPath.current!]);
        }
        currentPath.current = null;
    };

    const handleDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing.current || !imageRef.current) return; // FIX: Prevent drawing before image is loaded.
        e.preventDefault();
        const pos = getBrushPos(e);
        if (pos && currentPath.current) {
            currentPath.current.points.push(pos);
            redrawCanvas();
        }
    };

    const handleUndo = () => {
        setPaths(prev => prev.slice(0, -1));
    };

    const handleRemoveElement = async () => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || paths.length === 0 || !img) return;
        
        if (hasInsufficientCredits) {
            setError(`This action costs ${EDIT_COST} credit. Please top up.`);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Create mask on a hidden canvas with original image dimensions
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = img.naturalWidth;
        maskCanvas.height = img.naturalHeight;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) {
            setError("Could not create mask.");
            setIsLoading(false);
            return;
        }

        maskCtx.fillStyle = 'black';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Calculate scaling factors
        const canvasAspect = canvas.width / canvas.height;
        const imageAspect = img.naturalWidth / img.naturalHeight;
        let scale: number, offsetX = 0, offsetY = 0;
        
        if (imageAspect > canvasAspect) {
            scale = img.naturalWidth / canvas.width;
            offsetY = (canvas.height - canvas.width / imageAspect) / 2;
        } else {
            scale = img.naturalHeight / canvas.height;
            offsetX = (canvas.width - canvas.height * imageAspect) / 2;
        }

        // Draw scaled paths onto the mask
        maskCtx.strokeStyle = 'white';
        maskCtx.lineJoin = 'round';
        maskCtx.lineCap = 'round';
        
        paths.forEach(path => {
            if (path.points.length < 1) return;
            maskCtx.lineWidth = path.size * scale;
            maskCtx.beginPath();
            const startX = (path.points[0].x - offsetX) * scale;
            const startY = (path.points[0].y - offsetY) * scale;
            maskCtx.moveTo(startX, startY);
            for (let i = 1; i < path.points.length; i++) {
                const pointX = (path.points[i].x - offsetX) * scale;
                const pointY = (path.points[i].y - offsetY) * scale;
                maskCtx.lineTo(pointX, pointY);
            }
            maskCtx.stroke();
        });

        const maskDataUrl = maskCanvas.toDataURL('image/png');
        const maskBase64 = maskDataUrl.split(',')[1];
        const originalBase64 = imageUrl.split(',')[1];
        const originalMimeType = imageUrl.match(/data:(.*);/)?.[1] || 'image/png';

        try {
            const newBase64 = await removeElementFromImage(originalBase64, originalMimeType, maskBase64);
            onSave(`data:image/png;base64,${newBase64}`);

            if (!isGuest && auth.user) {
                await deductCredits(auth.user.uid, EDIT_COST, 'Brand Stylist - Edit');
                // We don't need to update user here, it will be reflected on next page load
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to edit image.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="relative w-full max-w-4xl bg-gray-800 rounded-2xl p-4 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-white text-lg font-bold text-center flex-1">Magic Eraser</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="relative w-full aspect-video rounded-lg overflow-hidden cursor-crosshair">
                     <canvas 
                        ref={canvasRef}
                        className="w-full h-full"
                        onMouseDown={startDrawing}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onMouseMove={handleDrawing}
                        onTouchStart={startDrawing}
                        onTouchEnd={stopDrawing}
                        onTouchMove={handleDrawing}
                     />
                     {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                            <SparklesIcon className="w-10 h-10 text-yellow-400 animate-pulse" />
                            <p className="text-white mt-2">Removing element...</p>
                        </div>
                     )}
                </div>
                {error && <p className="text-red-400 text-sm text-center bg-red-900/50 p-2 rounded-md">{error}</p>}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                     <div className="flex items-center gap-2 text-white">
                        <label htmlFor="brushSize" className="text-sm font-semibold">Brush Size:</label>
                        <input id="brushSize" type="range" min="5" max="100" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-24"/>
                     </div>
                     <div className="flex items-center gap-4">
                        <button onClick={handleUndo} disabled={paths.length === 0} className="bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50">Undo</button>
                        <button onClick={() => setPaths([])} disabled={paths.length === 0} className="bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50">Clear Mask</button>
                        <button onClick={handleRemoveElement} disabled={isLoading || paths.length === 0 || hasInsufficientCredits} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5"/>
                            Remove Element
                        </button>
                     </div>
                </div>
                 <p className={`text-xs text-center pt-1 ${hasInsufficientCredits ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>{hasInsufficientCredits ? 'Insufficient credits.' : `This costs ${EDIT_COST} credit.`}</p>
            </div>
        </div>
    );
};


// FIX: Added a closing parenthesis to complete the component definition.
// This was causing the "Unexpected end of file" error.
const Profile: React.FC<{ user: User | null; openEditProfileModal: () => void; handleLogout: () => void; }> = ({ user, openEditProfileModal, handleLogout }) => (
    <div className="p-4">
        {user && (
            <div className="space-y-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-[#0079F2] font-bold text-4xl">
                        {user.avatar}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-center">{user.name}</h2>
                        <p className="text-gray-500 text-center">{user.email}</p>
                    </div>
                    <button onClick={openEditProfileModal} className="w-full mt-2 flex items-center justify-center gap-2 text-sm py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                        <PencilIcon className="w-4 h-4" /> Edit Profile
                    </button>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-xl p-4">
                    <h3 className="font-bold text-lg mb-2">My Plan</h3>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-2xl font-bold text-[#1E1E1E]">{user.credits} <span className="text-lg font-medium text-gray-500">Credits</span></p>
                            <p className="text-sm text-gray-500">{user.plan} Plan</p>
                        </div>
                        <button className="bg-[#f9d230] text-[#1E1E1E] text-sm font-semibold py-2 px-4 rounded-lg">
                            Get More
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <button className="w-full text-left flex items-center gap-4 p-4 bg-white border border-gray-200/80 rounded-xl">
                        <StarIcon className="w-6 h-6 text-gray-400"/>
                        <span className="font-semibold">Rate MagicPixa</span>
                        <ChevronRightIcon className="w-5 h-5 ml-auto text-gray-400"/>
                    </button>
                    <button className="w-full text-left flex items-center gap-4 p-4 bg-white border border-gray-200/80 rounded-xl">
                        <FlagIcon className="w-6 h-6 text-gray-400"/>
                        <span className="font-semibold">Report an Issue</span>
                        <ChevronRightIcon className="w-5 h-5 ml-auto text-gray-400"/>
                    </button>
                     <button className="w-full text-left flex items-center gap-4 p-4 bg-white border border-gray-200/80 rounded-xl">
                        <HelpIcon className="w-6 h-6 text-gray-400"/>
                        <span className="font-semibold">Help & Support</span>
                        <ChevronRightIcon className="w-5 h-5 ml-auto text-gray-400"/>
                    </button>
                </div>
                
                 <button onClick={handleLogout} className="w-full mt-4 flex items-center justify-center gap-2 text-sm py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                    <LogoutIcon className="w-5 h-5" /> Logout
                </button>
            </div>
        )}
    </div>
);

// FIX: Added the Creations placeholder component.
const Creations: React.FC = () => (
  <div className="p-4 text-center">
    <ProjectsIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <h2 className="text-xl font-bold">My Creations</h2>
    <p className="text-gray-500">This feature is coming soon!</p>
  </div>
);

// FIX: The DashboardPage component was incomplete, causing it to return nothing (void).
// This fix completes the component by adding the remaining view cases to the render logic
// and returning a proper JSX layout including the Header, Sidebar, and main content area.
export const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
      case 'home_dashboard':
        return <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'studio':
        return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} />;
      case 'interior':
        return <MagicInterior auth={auth} navigateTo={navigateTo} />;
      case 'colour':
        return <MagicPhotoColour auth={auth} navigateTo={navigateTo} />;
      case 'soul':
        return <MagicSoul auth={auth} navigateTo={navigateTo} />;
      case 'apparel':
        return <MagicApparel auth={auth} navigateTo={navigateTo} />;
      case 'mockup':
        return <MagicMockup auth={auth} navigateTo={navigateTo} />;
      case 'caption':
        return <CaptionAI auth={auth} navigateTo={navigateTo} />;
      case 'product_studio':
        return <ProductStudio auth={auth} navigateTo={navigateTo} />;
      case 'brand_stylist':
        return <BrandStylistAI auth={auth} navigateTo={navigateTo} />;
      case 'billing':
        // The user is guaranteed to be authenticated on dashboard pages.
        return <Billing user={auth.user!} setUser={auth.setUser} />;
      case 'creations':
        return <Creations />;
      case 'profile':
        return <Profile user={auth.user} openEditProfileModal={openEditProfileModal} handleLogout={auth.handleLogout} />;
      default:
        // Fallback to dashboard view for any unknown view.
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} />;
    }
  };

  const isHomeDashboard = activeView === 'home_dashboard';
  // On mobile, show a back button for any feature view that isn't one of the main "tab" views.
  const showBackButton = isMobile && !['home_dashboard', 'dashboard', 'profile', 'creations'].includes(activeView);

  const dashboardAuthProps = {
    ...auth,
    isDashboard: true,
    showBackButton: showBackButton,
    handleBack: () => setActiveView(isMobile ? 'home_dashboard' : 'dashboard'),
    openConversation: () => setIsConversationOpen(true),
    setActiveView: setActiveView,
  };

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      <Header navigateTo={navigateTo} auth={dashboardAuthProps} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
};
