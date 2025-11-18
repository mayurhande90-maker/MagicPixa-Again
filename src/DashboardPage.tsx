import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Page, AuthProps, View, User, Creation, AppConfig } from './types';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, generateMagicSoul, generateApparelTryOn, generateMockup, generateCaptions, generateSupportResponse, generateProductPackPlan, generateStyledImage, generateVideo, getVideoOperationStatus, generateBrandStylistImage, removeElementFromImage, suggestThumbnailTitles, generateThumbnail } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile, saveCreation, getCreations, deleteCreation } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import ThemeToggle from './components/ThemeToggle';
import { AdminPanel } from './components/AdminPanel'; // Import the new AdminPanel component
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ProductStudioIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon, ShieldCheckIcon, DocumentTextIcon, FlagIcon,
    ArrowRightIcon, ZoomInIcon, FilmIcon, VideoCameraIcon, ColorSwatchIcon, ImageIcon, TrashIcon, ThumbnailIcon
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
  appConfig: AppConfig | null;
  setAppConfig: React.Dispatch<React.SetStateAction<AppConfig | null>>;
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

const dashboardFeatures: { view: View; title: string; icon: React.FC<{className?: string}>; gradient: string; disabled?: boolean; description?: string; }[] = [
    { view: 'studio', title: 'Magic Photo Studio', icon: PhotoStudioIcon, gradient: 'from-blue-400 to-blue-500', description: 'Studio-quality product shots' },
    { view: 'product_studio', title: 'Product Studio', icon: ProductStudioIcon, gradient: 'from-green-400 to-green-500', description: 'Full marketing packs' },
    { view: 'brand_stylist', title: 'Brand Stylist AI', icon: LightbulbIcon, gradient: 'from-yellow-400 to-yellow-500', description: 'On-brand styled photos' },
    { view: 'thumbnail_studio', title: 'Thumbnail Studio', icon: ThumbnailIcon, gradient: 'from-red-400 to-red-500', description: 'Create YouTube thumbnails' },
    { view: 'soul', title: 'Magic Soul', icon: UsersIcon, gradient: 'from-pink-400 to-pink-500', description: 'Combine two people' },
    { view: 'colour', title: 'Magic Photo Colour', icon: PaletteIcon, gradient: 'from-rose-400 to-rose-500', description: 'Colourize B&W photos' },
    { view: 'caption', title: 'CaptionAI', icon: CaptionIcon, gradient: 'from-amber-400 to-amber-500', description: 'Generate social captions' },
    { view: 'interior', title: 'Magic Interior', icon: HomeIcon, gradient: 'from-orange-400 to-orange-500', description: 'Redesign any room' },
    { view: 'apparel', title: 'Magic Apparel', icon: UsersIcon, gradient: 'from-teal-400 to-teal-500', description: 'Virtual clothing try-on' },
    { view: 'mockup', title: 'Magic Mockup', icon: MockupIcon, gradient: 'from-indigo-400 to-indigo-500', description: 'Create product mockups' },
    { view: 'creations', title: 'My Creations', icon: ProjectsIcon, gradient: 'from-gray-400 to-gray-500', description: 'Browse your projects' },
];

const smartStackItems = [
    {
        icon: <RetryIcon className="w-6 h-6 text-indigo-500" />,
        title: "Jump back in",
        description: "Continue editing your latest product photo.",
        bgColor: "bg-indigo-50",
        actionView: 'studio'
    },
    {
        icon: <CaptionIcon className="w-6 h-6 text-amber-500" />,
        title: "Intelligent Suggestion",
        description: "Your new photo looks great! Generate some social media captions.",
        bgColor: "bg-amber-50",
        actionView: 'caption'
    },
    {
        icon: <HomeIcon className="w-6 h-6 text-orange-500" />,
        title: "Feature Discovery",
        description: "Did you know you can redesign your entire room with Magic Interior?",
        bgColor: "bg-orange-50",
        actionView: 'interior'
    }
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

const DesktopDashboard: React.FC<{ user: User | null; navigateTo: (page: Page, view?: View, sectionId?: string) => void; openEditProfileModal: () => void; setActiveView: (view: View) => void; creations: Creation[]; appConfig: AppConfig | null; }> = ({ user, navigateTo, openEditProfileModal, setActiveView, creations, appConfig }) => {
    const quickTools = dashboardFeatures
        .filter(f => f.view !== 'creations')
        .slice(0, 6)
        .map(f => ({
            ...f,
            disabled: appConfig?.featureToggles[f.view] === false
        }));

    return (
        <div className="p-4 sm:p-6 lg:p-8 h-full">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <h1 className="text-3xl font-bold text-[#1E1E1E]">Welcome back, {user?.name.split(' ')[0]}!</h1>
                            <p className="text-[#5F6368] mt-1">Ready to create something amazing today?</p>
                        </div>

                        {/* Recommended for you */}
                        <div>
                            <h2 className="text-xl font-bold text-[#1E1E1E] mb-4">Recommended for You</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {smartStackItems.map((item, index) => (
                                    <div key={index} onClick={() => setActiveView(item.actionView as View)} className={`p-4 rounded-2xl border border-gray-200/80 cursor-pointer transition-transform transform hover:-translate-y-1 ${item.bgColor}`}>
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
                        
                        {/* Quick Tools */}
                        <div>
                            <h2 className="text-xl font-bold text-[#1E1E1E] mb-4">Quick Tools</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {quickTools.map(feature => (
                                    <div 
                                        key={feature.view}
                                        onClick={() => !feature.disabled && setActiveView(feature.view)}
                                        className={`relative bg-white p-4 rounded-2xl border border-gray-200/80 transition-shadow hover:shadow-lg hover:border-blue-300 ${feature.disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        {feature.disabled && (
                                            <div className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                SOON
                                            </div>
                                        )}
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${feature.gradient} mb-3`}>
                                            <feature.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <h3 className="font-bold text-sm text-[#1E1E1E]">{feature.title}</h3>
                                        <p className="text-xs text-gray-500">{feature.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Right Sidebar Area */}
                    <div className="space-y-8">
                         {/* Profile & Credits */}
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
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={openEditProfileModal} className="w-full flex items-center justify-center gap-2 text-sm py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                   <PencilIcon className="w-4 h-4" /> Edit Profile
                                </button>
                                 <button onClick={() => setActiveView('billing')} className="w-full flex items-center justify-center gap-2 text-sm py-2 bg-[#f9d230] text-[#1E1E1E] font-semibold rounded-lg hover:scale-105 transform transition-transform">
                                    <PlusIcon className="w-4 h-4" /> Add Credits
                                </button>
                            </div>
                        </div>

                        {/* Recent Creations */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80">
                            <h2 className="text-xl font-bold text-[#1E1E1E] mb-4">Recent Creations</h2>
                            {creations.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {creations.slice(0, 4).map(creation => (
                                            <div key={creation.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                                <img src={creation.imageUrl} alt={creation.feature} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => setActiveView('creations')} className="w-full bg-gray-100 text-gray-700 text-sm font-semibold py-2 rounded-lg hover:bg-gray-200">
                                        View All
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                     <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                     <p className="text-sm text-[#5F6368]">Your creations will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


const MobileDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void; appConfig: AppConfig | null; }> = ({ user, setActiveView, appConfig }) => {
    const featuresWithConfig = dashboardFeatures.map(f => ({
        ...f,
        disabled: appConfig?.featureToggles[f.view] === false
    }));

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold text-[#1E1E1E]">Welcome, {user?.name.split(' ')[0]}!</h1>
            <p className="text-[#5F6368] mt-1 mb-6">What will you create today?</p>
            
            <div className="grid grid-cols-2 gap-4">
                {featuresWithConfig.map(feature => (
                    <div 
                        key={feature.view}
                        onClick={() => !feature.disabled && setActiveView(feature.view)}
                        className={`relative aspect-square p-4 rounded-2xl text-white flex flex-col justify-end bg-gradient-to-br ${feature.gradient} shadow-lg shadow-gray-500/10 transition-transform transform active:scale-95 ${feature.disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        {feature.disabled && (
                            <div className="absolute top-2 right-2 bg-black/30 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                SOON
                            </div>
                        )}
                        <feature.icon className="w-8 h-8 absolute top-4 left-4" />
                        <h3 className="font-bold">{feature.title}</h3>
                    </div>
                ))}
            </div>
        </div>
    );
};

const Dashboard: React.FC<{ user: User | null; navigateTo: (page: Page, view?: View, sectionId?: string) => void; openEditProfileModal: () => void; setActiveView: (view: View) => void; creations: Creation[], appConfig: AppConfig | null; }> = ({ user, navigateTo, openEditProfileModal, setActiveView, creations, appConfig }) => (
    <>
        <div className="hidden lg:block h-full">
            <DesktopDashboard user={user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />
        </div>
        <div className="lg:hidden">
            <MobileDashboard user={user} setActiveView={setActiveView} appConfig={appConfig} />
        </div>
    </>
);

const MobileHomeDashboard: React.FC<{ user: User | null; setActiveView: (view: View) => void; }> = ({ user, setActiveView }) => {
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
                        <div key={index} onClick={() => setActiveView(item.actionView as View)} className={`flex-shrink-0 w-64 p-4 rounded-2xl border border-gray-200/80 cursor-pointer transition-transform transform active:scale-95 ${item.bgColor}`}>
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

const ImageEditModal: React.FC<{
    imageUrl: string;
    onClose: () => void;
    onSave: (newImageUrl: string) => void;
    auth: AuthProps;
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    appConfig: AppConfig | null;
}> = ({ imageUrl, onClose, onSave, auth, navigateTo, appConfig }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [brushSize, setBrushSize] = useState(40);
    const [history, setHistory] = useState<string[]>([]);
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const EDIT_COST = appConfig?.featureCosts['Magic Eraser'] || 1;
    const isGuest = !auth.isAuthenticated || !auth.user;
    const [guestCredits, setGuestCredits] = useState<number>(() => sessionStorage.getItem('magicpixa-guest-credits-eraser') ? parseInt(sessionStorage.getItem('magicpixa-guest-credits-eraser')!, 10) : 1);
    const currentCredits = isGuest ? guestCredits : (auth.user?.credits ?? 0);
    const hasInsufficientCredits = currentCredits < EDIT_COST;

    useEffect(() => {
        if (imageUrl) {
            setCurrentImageUrl(imageUrl);
            setHistory([imageUrl]);
        }
    }, [imageUrl]);

    const drawImage = useCallback((url: string) => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !maskCanvas || !container || !url) return;

        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        if (!ctx || !maskCtx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const imgAspectRatio = img.width / img.height;
            const containerAspectRatio = containerWidth / containerHeight;

            let renderWidth, renderHeight;

            if (imgAspectRatio > containerAspectRatio) {
                renderWidth = containerWidth;
                renderHeight = containerWidth / imgAspectRatio;
            } else {
                renderHeight = containerHeight;
                renderWidth = containerHeight * imgAspectRatio;
            }

            canvas.width = renderWidth;
            canvas.height = renderHeight;
            maskCanvas.width = renderWidth;
            maskCanvas.height = renderHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

            maskCtx.fillStyle = 'rgba(0,0,0,0.5)';
            maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        };
    }, []);
    
    useEffect(() => {
        drawImage(currentImageUrl);
    }, [drawImage, currentImageUrl]);

    useEffect(() => {
        const handleResize = () => drawImage(currentImageUrl);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [currentImageUrl, drawImage]);


    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = maskCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        draw(e);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoords(e);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (!maskCtx) return;

        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.beginPath();
        maskCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };
    
    const clearMask = () => {
        const maskCanvas = maskCanvasRef.current;
        if (!maskCanvas) return;
        const maskCtx = maskCanvas.getContext('2d');
        if (!maskCtx) return;
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = 'rgba(0,0,0,0.5)';
        maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    };
    
    const handleRemoveElement = async () => {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!canvas || !maskCanvas) return;
        
        if (hasInsufficientCredits) {
            if (isGuest) auth.openAuthModal();
            else navigateTo('home', undefined, 'pricing');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Create a pure black and white mask
            const finalMaskCanvas = document.createElement('canvas');
            finalMaskCanvas.width = maskCanvas.width;
            finalMaskCanvas.height = maskCanvas.height;
            const finalMaskCtx = finalMaskCanvas.getContext('2d');
            if (!finalMaskCtx) throw new Error("Could not create mask context");

            finalMaskCtx.fillStyle = 'black';
            finalMaskCtx.fillRect(0, 0, finalMaskCanvas.width, finalMaskCanvas.height);
            finalMaskCtx.globalCompositeOperation = 'destination-out';
            const tempMaskImg = new Image();
            tempMaskImg.src = maskCanvas.toDataURL();
            await new Promise(resolve => tempMaskImg.onload = resolve);
            finalMaskCtx.drawImage(tempMaskImg, 0, 0);
            
            const maskBase64 = finalMaskCanvas.toDataURL('image/png').split(',')[1];
            const originalBase64 = currentImageUrl.split(',')[1];
            const originalMimeType = currentImageUrl.match(/:(.*?);/)?.[1] || 'image/png';
            
            const newBase64 = await removeElementFromImage(originalBase64, originalMimeType, maskBase64);
            
            if (!newBase64 || newBase64.length < 500) {
                 throw new Error("The AI returned an invalid image. Please undo and try a different selection.");
            }
            const newImageUrl = `data:image/png;base64,${newBase64}`;

            const validationImage = new Image();
            validationImage.src = newImageUrl;
            await new Promise((resolve, reject) => {
                validationImage.onload = resolve;
                validationImage.onerror = () => reject(new Error("The AI returned a corrupted image. Please undo and try again."));
            });

            setHistory(prev => [...prev, currentImageUrl]);
            setCurrentImageUrl(newImageUrl);
            drawImage(newImageUrl);
            clearMask();
            
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Magic Eraser');
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
    
    const handleUndoRemoval = () => {
        setError(null);
        if (history.length > 1) {
            const lastState = history[history.length - 1];
            setCurrentImageUrl(lastState);
            drawImage(lastState);
            setHistory(prev => prev.slice(0, -1));
        }
    };

    const handleDone = () => {
        onSave(currentImageUrl);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div 
                className="bg-[#1E1E1E] w-full max-w-4xl h-[90vh] rounded-2xl shadow-xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Magic Eraser</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><XIcon className="w-6 h-6"/></button>
                </div>
                
                <div ref={containerRef} className="flex-1 relative flex items-center justify-center p-2">
                    <canvas ref={canvasRef} className="absolute" />
                    <canvas 
                        ref={maskCanvasRef} 
                        className="absolute cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                     {isLoading && (
                        <div className="absolute inset-0 bg-[#1E1E1E]/80 flex flex-col items-center justify-center z-20">
                            <SparklesIcon className="w-10 h-10 text-[#f9d230] animate-pulse" />
                            <p className="mt-2 text-white">Removing element...</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 space-y-4">
                    {error && <div className="text-red-400 bg-red-900/50 p-2 rounded-md text-center text-sm">{error}</div>}
                    <div className="flex items-center gap-4 text-white">
                        <span>Brush Size:</span>
                        <input 
                            type="range" 
                            min="10" 
                            max="100" 
                            value={brushSize} 
                            onChange={e => setBrushSize(Number(e.target.value))}
                            className="w-48"
                        />
                        <button onClick={clearMask} className="text-sm text-gray-300 hover:text-white">Clear Mask</button>
                    </div>
                    <div className="flex justify-center items-center gap-4">
                        <button onClick={handleUndoRemoval} disabled={history.length <= 1} className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50">Undo Removal</button>
                        <button onClick={handleRemoveElement} disabled={isLoading || hasInsufficientCredits} className="px-6 py-3 bg-red-600 text-white rounded-lg font-bold flex items-center gap-2 disabled:opacity-50">
                            <SparklesIcon className="w-5 h-5" /> Remove Element
                        </button>
                        <button onClick={handleDone} className="px-6 py-3 bg-[#0079F2] text-white rounded-lg font-bold">Done</button>
                    </div>
                    <p className={`text-xs text-center ${hasInsufficientCredits ? 'text-red-400' : 'text-gray-400'}`}>
                        {hasInsufficientCredits ? 'Insufficient credits.' : `Remove Element costs ${EDIT_COST} credit.`}
                    </p>
                </div>
            </div>
        </div>
    );
};

const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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
    
    const EDIT_COST = appConfig?.featureCosts['Magic Photo Studio'] || 2;
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
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);
            
            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Photo Studio');
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
    }, [base64Data, theme, currentCredits, auth, isGuest, navigateTo, EDIT_COST]);


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
                                        <img src={generatedImage} alt="Generated" className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="w-full h-full object-cover rounded-lg" />
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

const MagicInterior: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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
    
    const EDIT_COST = appConfig?.featureCosts['Magic Interior'] || 2;
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
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);

            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Interior');
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
    }, [base64Data, style, spaceType, roomType, currentCredits, auth, isGuest, navigateTo, EDIT_COST]);

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
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center overflow-hidden ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" />
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated Interior" className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
                                )
                                : originalImage ? <img src={originalImage.url} alt="Original Room" className="w-full h-full object-cover rounded-lg" />
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

const MagicPhotoColour: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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

    const EDIT_COST = appConfig?.featureCosts['Magic Photo Colour'] || 2;
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
            const newImage = `data:image/jpeg;base64,${newBase64}`;
            setGeneratedImage(newImage);
            
            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Photo Colour');
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
                                className={`relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 transition-colors duration-300 h-full flex items-center justify-center overflow-hidden ${!hasImage ? 'cursor-pointer hover:border-[#0079F2] hover:bg-blue-50/50' : ''}`}
                                onClick={!hasImage ? triggerFileInput : undefined}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                                
                                {generatedImage ? (
                                    <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}>
                                        <img src={generatedImage} alt="Generated" className="w-full h-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-[1.02]" />
                                    </div>
                                ) : originalImage ? (
                                    <img src={originalImage.url} alt="Original" className="w-full h-full object-cover rounded-lg" />
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

const MagicSoul: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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
    
    const EDIT_COST = appConfig?.featureCosts['Magic Soul'] || 3;
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
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);
            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Soul');
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
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-cover"/></div>
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

const MagicApparel: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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

    const EDIT_COST = appConfig?.featureCosts['Magic Apparel'] || 3;
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
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);
            
            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Apparel');
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
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-cover"/></div>
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

const MagicMockup: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [originalImage, setOriginalImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mockupType, setMockupType] = useState(mockupTypes[0].key);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = appConfig?.featureCosts['Magic Mockup'] || 2;
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
            const newImage = `data:image/png;base64,${newBase64}`;
            setGeneratedImage(newImage);
            
            if (!isGuest && auth.user) {
                saveCreation(auth.user.uid, newImage, 'Magic Mockup');
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
                            : generatedImage ? <div className="relative w-full h-full cursor-pointer group" onClick={() => setIsModalOpen(true)}><img src={generatedImage} alt="Generated" className="w-full h-full object-cover"/></div>
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

const CaptionAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [image, setImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [captions, setCaptions] = useState<{ caption: string; hashtags: string }[] | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const EDIT_COST = appConfig?.featureCosts['CaptionAI'] || 1;
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

const ProductStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
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

    const EDIT_COST = appConfig?.featureCosts['Product Studio'] || 5;
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
            const plan = await generateProductPackPlan(
                productImages.map(img => img.base64.base64),
                productName,
                productDescription,
                { logo: brandLogo?.base64?.base64, colors: brandColors, fonts: brandFonts.split(',').map(f => f.trim()) },
                competitorUrl,
                inspirationImages.map(img => img.base64.base64)
            );
            setGeneratedPlan(plan);

            const imagePrompts = plan.imageGenerationPrompts;
            const imageKeys = Object.keys(imagePrompts);
            const imagePromises = imageKeys.map(key => 
                generateStyledImage(productImages.map(img => img.base64.base64), imagePrompts[key])
                    .then(base64 => ({ key, base64: `data:image/png;base64,${base64}` }))
                    .catch(e => ({ key, error: e }))
            );

            const imageResults = await Promise.all(imagePromises);
            const newImages: { [key: string]: string } = {};
            imageResults.forEach(result => {
                if ('error' in result) {
                    console.error(`Failed to generate image for ${result.key}:`, result.error);
                } else {
                    newImages[result.key] = result.base64;
                }
            });
            setGeneratedImages(newImages);

            if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
                await window.aistudio.openSelectKey();
            }

            const videoPrompts = plan.videoGenerationPrompts;
            setIsGeneratingVideos(true);
            generateVideo(videoPrompts.video360Spin)
                .then(op => pollVideoStatus(op, 'spin'))
                .catch(e => {
                     setError(e.message);
                     setVideoStatuses(prev => ({ ...prev, spin: 'Error' }));
                });
            generateVideo(videoPrompts.videoCinemagraph)
                .then(op => pollVideoStatus(op, 'cinemagraph'))
                .catch(e => {
                     setError(e.message);
                     setVideoStatuses(prev => ({ ...prev, cinemagraph: 'Error' }));
                });
            
            if (!isGuest && auth.user) {
                const updatedProfile = await deductCredits(auth.user.uid, EDIT_COST, 'Product Studio');
                auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }

        } catch (err: any) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            if (err.message.includes("API key not found or invalid")) {
                 if (window.aistudio) {
                    await window.aistudio.openSelectKey();
                 }
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider">Product Studio</h2>
                    <p className="text-[#5F6368] mt-2">Generate a complete marketing pack from just a photo and product name.</p>
                </div>
                 <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Input Panel */}
                    <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-[#1E1E1E]">1. Core Details</h3>
                            <p className="text-sm text-[#5F6368]">Provide the essentials for your product.</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Product Photos (up to 5)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {productImages.map((img, i) => (
                                        <div key={i} className="relative aspect-square">
                                            <img src={img.url} alt={`Product ${i+1}`} className="w-full h-full object-cover rounded-lg" />
                                            <button type="button" onClick={() => setProductImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    {productImages.length < 5 && (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-[#0079F2] hover:text-[#0079F2]">
                                            <PlusIcon className="w-6 h-6"/>
                                            <span className="text-xs mt-1">Add Image</span>
                                        </button>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, 'product')} className="hidden" accept="image/*" multiple />
                                </div>
                            </div>
                            <InputField id="productName" label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., 'AuraGlow Vitamin C Serum'" required />
                            <TextAreaField id="productDescription" label="Product Description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="e.g., 'A brightening serum with hyaluronic acid...'" required />
                        </div>
                        
                        <div>
                           <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm font-semibold text-[#0079F2]">
                               {showAdvanced ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                               Advanced Styling (Optional)
                           </button>
                        </div>

                        {showAdvanced && (
                           <div className="space-y-4 border-t border-gray-200/80 pt-4">
                               <InputField id="brandColors" label="Brand Colors" value={brandColors.join(', ')} onChange={(e) => setBrandColors(e.target.value.split(',').map(c => c.trim()))} placeholder="e.g., #FF5733, #33FF57" />
                               <InputField id="brandFonts" label="Brand Fonts" value={brandFonts} onChange={(e) => setBrandFonts(e.target.value)} placeholder="e.g., 'Poppins', 'Lato'" />
                               <InputField id="competitorUrl" label="Competitor URL" value={competitorUrl} onChange={(e) => setCompetitorUrl(e.target.value)} placeholder="e.g., https://competitor.com/product" type="url" />
                               <div>
                                   <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Brand Logo</label>
                                   <div className="grid grid-cols-3 gap-2">
                                       {brandLogo ? (
                                           <div className="relative aspect-square">
                                               <img src={brandLogo.url} alt="Brand Logo" className="w-full h-full object-cover rounded-lg" />
                                               <button type="button" onClick={() => setBrandLogo(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                           </div>
                                       ) : (
                                           <button type="button" onClick={() => brandLogoInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-[#0079F2] hover:text-[#0079F2]">
                                               <PlusIcon className="w-6 h-6"/>
                                               <span className="text-xs mt-1">Add Logo</span>
                                           </button>
                                       )}
                                       <input type="file" ref={brandLogoInputRef} onChange={(e) => handleFileChange(e, 'brand')} className="hidden" accept="image/*" />
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-[#1E1E1E] mb-1.5">Inspiration Images (up to 3)</label>
                                   <div className="grid grid-cols-3 gap-2">
                                       {inspirationImages.map((img, i) => (
                                           <div key={i} className="relative aspect-square">
                                               <img src={img.url} alt={`Inspiration ${i+1}`} className="w-full h-full object-cover rounded-lg" />
                                               <button type="button" onClick={() => setInspirationImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><XIcon className="w-3 h-3"/></button>
                                           </div>
                                       ))}
                                       {inspirationImages.length < 3 && (
                                           <button type="button" onClick={() => inspirationInputRef.current?.click()} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-[#0079F2] hover:text-[#0079F2]">
                                               <PlusIcon className="w-6 h-6"/>
                                               <span className="text-xs mt-1">Add Image</span>
                                           </button>
                                       )}
                                       <input type="file" ref={inspirationInputRef} onChange={(e) => handleFileChange(e, 'inspiration')} className="hidden" accept="image/*" multiple />
                                   </div>
                               </div>
                           </div>
                        )}

                        <div className="pt-6 border-t border-gray-200/80">
                            <button type="submit" disabled={isLoading || hasInsufficientCredits} className="w-full flex items-center justify-center gap-3 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:opacity-50">
                                <SparklesIcon className="w-6 h-6"/> {isLoading ? 'Generating Plan...' : 'Generate Product Pack'}
                            </button>
                            <p className={`text-xs text-center pt-2 ${hasInsufficientCredits ? 'text-red-500 font-semibold' : 'text-[#5F6368]'}`}>{hasInsufficientCredits ? (isGuest ? 'Sign up to use this feature.' : 'Insufficient credits.') : `This costs ${EDIT_COST} credits.`}</p>
                        </div>
                        {error && <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>}
                    </form>

                    {/* Output Panel */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                            {!generatedPlan && !isLoading && (
                                <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                    <ProductStudioIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-[#1E1E1E]">Your Product Pack Appears Here</h3>
                                    <p className="text-[#5F6368] mt-1">Fill in the details on the left and click generate.</p>
                                </div>
                            )}
                             {isLoading && (
                                <div className="text-center py-20">
                                    <SparklesIcon className="w-16 h-16 text-[#f9d230] animate-pulse mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-[#1E1E1E]">Generating Your Marketing Pack...</h3>
                                    <p className="text-[#5F6368] mt-1">This might take a minute. We're creating images, videos, and text assets.</p>
                                </div>
                             )}

                            {generatedPlan && (
                                <div>
                                    <div className="mb-6 pb-4 border-b border-gray-200/80">
                                        <h2 className="text-2xl font-bold text-[#1E1E1E]">Your Generated Product Pack</h2>
                                        <p className="text-[#5F6368] mt-1">Here are the assets generated for <span className="font-bold">{productName}</span>.</p>
                                    </div>
                                    <div className="space-y-8">
                                        {/* Image Assets */}
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1E1E1E] flex items-center gap-2 mb-3"><ImageIcon className="w-5 h-5"/> Image Assets</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {Object.entries(generatedPlan.imageGenerationPrompts).map(([key, _]) => (
                                                    <div key={key} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                                                         {generatedImages[key] ? <img src={generatedImages[key]} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">Loading...</div>}
                                                         <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {/* Video Assets */}
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1E1E1E] flex items-center gap-2 mb-3"><VideoCameraIcon className="w-5 h-5"/> Video Assets</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* ... video components ... */}
                                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                                                    {generatedVideos['spin'] ? <video src={generatedVideos['spin']} className="w-full h-full object-cover" controls autoPlay loop muted/> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{videoStatuses.spin}</div>}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 capitalize">360° Spin</div>
                                                </div>
                                                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
                                                    {generatedVideos['cinemagraph'] ? <video src={generatedVideos['cinemagraph']} className="w-full h-full object-cover" controls autoPlay loop muted/> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">{videoStatuses.cinemagraph}</div>}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center p-1 capitalize">Cinemagraph</div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Text Assets */}
                                        <div>
                                            <h3 className="text-lg font-bold text-[#1E1E1E] flex items-center gap-2 mb-3"><DocumentTextIcon className="w-5 h-5"/> Text Assets</h3>
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold text-gray-500">SEO Title</p>
                                                    <p className="text-sm text-gray-800">{generatedPlan.textAssets.seoTitle}</p>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold text-gray-500">Social Media Captions</p>
                                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                                        {generatedPlan.textAssets.captions.map((c: any, i: number) => <li key={i} className="text-sm text-gray-800">{c.text}</li>)}
                                                    </ul>
                                                </div>
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs font-semibold text-gray-500">Keywords</p>
                                                    <p className="text-sm text-gray-800">{generatedPlan.textAssets.keywords.join(', ')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const BrandStylistAI: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => { return <div>Brand Stylist AI</div> };

const ThumbnailStudio: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; appConfig: AppConfig | null; }> = ({ auth, navigateTo, appConfig }) => {
    const [category, setCategory] = useState<string | null>(null);
    const [subjectA, setSubjectA] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [subjectB, setSubjectB] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ file: File; url: string; base64: Base64File } | null>(null);
    const [videoTitle, setVideoTitle] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Refs for file inputs
    const subjectAInputRef = useRef<HTMLInputElement>(null);
    const subjectBInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);

    const categories = [
        { id: 'podcast', label: 'Podcast', icon: <MicrophoneIcon className="w-6 h-6" /> },
        { id: 'unboxing', label: 'Unboxing', icon: <CubeIcon className="w-6 h-6" /> },
        { id: 'gaming', label: 'Gaming', icon: <UsersIcon className="w-6 h-6" /> },
        { id: 'vlog', label: 'Vlog', icon: <VideoCameraIcon className="w-6 h-6" /> },
        { id: 'informative', label: 'Informative', icon: <LightbulbIcon className="w-6 h-6" /> },
    ];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'A' | 'B' | 'Ref') => {
        const file = event.target.files?.[0];
        if (file) {
             if (!file.type.startsWith('image/')) {
                setError('Please upload a valid image file.');
                return;
            }
            const base64 = await fileToBase64(file);
            const data = { file, url: URL.createObjectURL(file), base64 };
            
            if (type === 'A') setSubjectA(data);
            else if (type === 'B') setSubjectB(data);
            else setReferenceImage(data);
            
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!referenceImage) {
            setError("Please upload a reference thumbnail style.");
            return;
        }
        if (!subjectA) {
            setError("Please upload at least one subject image.");
            return;
        }
        if (category === 'podcast' && !subjectB) {
             setError("Podcasts typically need two subjects. Please upload the second speaker.");
             return;
        }
        if (!videoTitle.trim()) {
            setError("Please enter a title for your thumbnail.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedThumbnail(null);

        try {
            const resultBase64 = await generateThumbnail({
                category: category || 'general',
                title: videoTitle,
                referenceImage: referenceImage.base64.base64,
                subjectA: subjectA.base64.base64,
                subjectB: subjectB?.base64.base64
            });

            const imageUrl = `data:image/png;base64,${resultBase64}`;
            setGeneratedThumbnail(imageUrl);

             if (auth.user) {
                 saveCreation(auth.user.uid, imageUrl, 'Thumbnail Studio');
                 // Assuming cost is 2 credits for now
                 const updatedProfile = await deductCredits(auth.user.uid, 2, 'Thumbnail Studio');
                 auth.setUser(prev => prev ? { ...prev, credits: updatedProfile.credits } : null);
            }

        } catch (err: any) {
            setError(err.message || "Failed to generate thumbnail.");
        } finally {
            setIsGenerating(false);
        }
    };

    const ImageUploadBox: React.FC<{
        image: { url: string } | null;
        inputRef: React.RefObject<HTMLInputElement>;
        onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
        title: string;
        isWide?: boolean;
    }> = ({ image, inputRef, onFileChange, title, isWide = false }) => {
        const triggerFileInput = () => inputRef.current?.click();
        return (
            <div className={`relative w-full ${isWide ? 'aspect-video' : 'aspect-square'} bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center transition-colors overflow-hidden ${!image ? 'hover:border-[#0079F2] hover:bg-blue-50/50 cursor-pointer' : ''}`} onClick={!image ? triggerFileInput : undefined}>
                <input type="file" ref={inputRef} onChange={onFileChange} className="hidden" accept="image/*" />
                {image ? (
                    <>
                        <img src={image.url} alt={title} className="w-full h-full object-cover" />
                        <button onClick={triggerFileInput} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-gray-700 hover:text-black shadow-md" title={`Change ${title}`}><ArrowUpCircleIcon className="w-5 h-5" /></button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-500 p-2">
                        <UploadIcon className="w-8 h-8" />
                        <span className="font-semibold text-sm text-gray-700">{title}</span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className='p-4 sm:p-6 lg:p-8 pb-24'>
            <div className='w-full max-w-7xl mx-auto'>
                <div className='mb-8 text-center'>
                    <h2 className="text-3xl font-bold text-[#1E1E1E] uppercase tracking-wider flex items-center justify-center gap-2">
                        <ThumbnailIcon className="w-8 h-8 text-red-500" /> Thumbnail Studio
                    </h2>
                    <p className="text-[#5F6368] mt-2">Replicate pro thumbnail styles with your own content.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    {/* Configuration Panel */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 space-y-6">
                        
                        {/* 1. Category Selection */}
                        <div>
                            <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">1. Select Category</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setCategory(cat.id); setSubjectA(null); setSubjectB(null); setGeneratedThumbnail(null); }}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${category === cat.id ? 'border-[#0079F2] bg-blue-50 text-[#0079F2]' : 'border-gray-200 hover:border-blue-200 text-gray-600'}`}
                                    >
                                        {cat.icon}
                                        <span className="text-xs font-bold mt-1">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {category && (
                            <>
                                {/* 2. Content Uploads */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">2. Upload Content</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <ImageUploadBox 
                                            image={subjectA} 
                                            inputRef={subjectAInputRef} 
                                            onFileChange={(e) => handleFileChange(e, 'A')} 
                                            title={category === 'podcast' ? "Speaker 1" : "Main Subject"} 
                                        />
                                        {category === 'podcast' && (
                                            <ImageUploadBox 
                                                image={subjectB} 
                                                inputRef={subjectBInputRef} 
                                                onFileChange={(e) => handleFileChange(e, 'B')} 
                                                title="Speaker 2" 
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* 3. Title */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3">3. Video Title (Influences Background)</h3>
                                    <InputField 
                                        id="thumbTitle" 
                                        label="" 
                                        value={videoTitle} 
                                        onChange={(e) => setVideoTitle(e.target.value)} 
                                        placeholder="e.g. SECRET REVEALED!" 
                                    />
                                </div>

                                {/* 4. Reference Style */}
                                <div className="animate-fade-in">
                                    <h3 className="text-lg font-bold text-[#1E1E1E] mb-3 flex items-center gap-2">
                                        4. Style Reference <span className="text-xs font-normal bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Crucial</span>
                                    </h3>
                                    <ImageUploadBox 
                                        image={referenceImage} 
                                        inputRef={referenceInputRef} 
                                        onFileChange={(e) => handleFileChange(e, 'Ref')} 
                                        title="Upload Reference Thumbnail" 
                                        isWide={true}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">AI will copy the layout, lighting, and text style from this image.</p>
                                </div>

                                {/* Generate Button */}
                                <div className="pt-4 border-t border-gray-200/80 animate-fade-in">
                                    <button 
                                        onClick={handleGenerate} 
                                        disabled={isGenerating} 
                                        className="w-full flex items-center justify-center gap-3 bg-[#f9d230] text-[#1E1E1E] font-bold py-3 px-4 rounded-xl shadow-md disabled:opacity-50 transition-transform transform active:scale-95 hover:shadow-lg"
                                    >
                                        <SparklesIcon className="w-6 h-6"/> {isGenerating ? 'Designing Magic...' : 'Generate Magic Thumbnail'}
                                    </button>
                                    <p className="text-xs text-center text-gray-500 mt-2">Costs 2 credits.</p>
                                </div>
                            </>
                        )}
                         {error && <div className="text-red-600 bg-red-100 p-3 rounded-lg w-full text-center text-sm">{error}</div>}
                    </div>

                    {/* Output Panel */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-2xl shadow-lg shadow-gray-500/5 border border-gray-200/80 p-6 min-h-[500px] flex flex-col">
                            {!generatedThumbnail && !isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
                                    <ThumbnailIcon className="w-24 h-24 text-gray-300 mb-4" />
                                    <h3 className="text-xl font-bold text-gray-400">Your Masterpiece Awaits</h3>
                                    <p className="text-gray-400 mt-2">Select a category and upload a reference to start.</p>
                                </div>
                            )}
                            
                            {isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                                    <div className="relative w-24 h-24 mb-6">
                                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-t-[#f9d230] rounded-full animate-spin"></div>
                                        <SparklesIcon className="absolute inset-0 m-auto w-8 h-8 text-[#f9d230] animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-[#1E1E1E] animate-pulse">Analyzing Reference Style...</h3>
                                    <p className="text-[#5F6368] mt-2">cutting out subjects • matching lighting • rendering 3D text</p>
                                </div>
                            )}

                            {generatedThumbnail && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-[#1E1E1E]">Generated Result</h2>
                                        <button onClick={() => setGeneratedThumbnail(null)} className="text-sm text-gray-500 hover:text-black flex items-center gap-1"><UploadIcon className="w-4 h-4"/> New Design</button>
                                    </div>
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden shadow-xl group">
                                        <img src={generatedThumbnail} alt="AI Generated Thumbnail" className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                             <button 
                                                onClick={() => { const link = document.createElement('a'); link.href = generatedThumbnail; link.download = `magic_thumb_${Date.now()}.png`; link.click(); }}
                                                className="bg-white text-[#1E1E1E] font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-transform flex items-center gap-2"
                                             >
                                                <DownloadIcon className="w-5 h-5" /> Download High-Res
                                             </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Support: React.FC<{ auth: AuthProps; }> = ({ auth }) => { return <div>Support</div> };

const Profile: React.FC<{ auth: AuthProps; openEditProfileModal: () => void; }> = ({ auth, openEditProfileModal }) => { return <div>Profile</div> };

const Creations: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View, sectionId?: string) => void; }> = ({ auth, navigateTo }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (auth.user) {
            setIsLoading(true);
            getCreations(auth.user.uid)
                .then(setCreations)
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [auth.user]);

    const handleDelete = async (creation: Creation, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!auth.user || !confirm('Are you sure you want to delete this creation?')) return;
        
        setDeletingId(creation.id);
        try {
            await deleteCreation(auth.user.uid, creation);
            setCreations(prev => prev.filter(c => c.id !== creation.id));
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete creation.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleDownload = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = url;
        link.download = `magicpixa_creation_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 pb-24">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 text-center lg:text-left flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-[#1E1E1E]">My Creations</h2>
                        <p className="text-[#5F6368] mt-1">Your generated masterpieces.</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
                         {[...Array(8)].map((_, i) => (
                            <div key={i} className="aspect-square bg-gray-200 rounded-xl"></div>
                        ))}
                    </div>
                ) : creations.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {creations.map(creation => (
                            <div 
                                key={creation.id} 
                                onClick={() => setSelectedImage(creation.imageUrl)}
                                className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-gray-200"
                            >
                                <img src={creation.imageUrl} alt={creation.feature} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                    <p className="text-white font-bold text-sm mb-1">{creation.feature}</p>
                                    <p className="text-gray-300 text-xs mb-3">{creation.createdAt?.seconds ? new Date(creation.createdAt.seconds * 1000).toLocaleDateString() : ''}</p>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleDownload(creation.imageUrl, e)} className="p-2 bg-white/20 backdrop-blur-sm rounded-lg text-white hover:bg-white hover:text-black transition-colors">
                                            <DownloadIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={(e) => handleDelete(creation, e)} disabled={deletingId === creation.id} className="p-2 bg-red-500/20 backdrop-blur-sm rounded-lg text-white hover:bg-red-500 transition-colors">
                                            {deletingId === creation.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <TrashIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ProjectsIcon className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No creations yet</h3>
                        <p className="text-gray-500 mb-6">Start using our magic tools to create something amazing.</p>
                        <button onClick={() => navigateTo('dashboard', 'dashboard')} className="px-6 py-3 bg-[#0079F2] text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
            {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
        </div>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen, appConfig, setAppConfig }) => {
  const [creations, setCreations] = useState<Creation[]>([]);
  const [isLoadingCreations, setIsLoadingCreations] = useState(true);

   useEffect(() => {
    if (auth.user) {
      setIsLoadingCreations(true);
      getCreations(auth.user.uid)
        .then(setCreations)
        .catch(console.error)
        .finally(() => setIsLoadingCreations(false));
    }
  }, [auth.user]);

  const renderContent = () => {
    switch (activeView) {
      case 'home_dashboard':
        return <MobileHomeDashboard user={auth.user} setActiveView={setActiveView} />;
      case 'dashboard':
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />;
      case 'studio':
        return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'interior':
          return <MagicInterior auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'colour':
          return <MagicPhotoColour auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'soul':
          return <MagicSoul auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'apparel':
          return <MagicApparel auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'mockup':
          return <MagicMockup auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'caption':
          return <CaptionAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'product_studio':
          return <ProductStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'brand_stylist':
          return <BrandStylistAI auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
       case 'thumbnail_studio':
          return <ThumbnailStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
      case 'creations':
        return <Creations auth={auth} navigateTo={navigateTo} />;
      case 'billing':
        return <Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} />;
      case 'profile':
          return <Profile auth={auth} openEditProfileModal={openEditProfileModal} />;
      case 'admin':
          return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
      default:
        return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />;
    }
  };

  const dashboardAuthProps = {
      ...auth,
      setActiveView,
      openConversation: () => setIsConversationOpen(true),
      isDashboard: true,
      showBackButton: activeView !== 'dashboard' && activeView !== 'home_dashboard',
      handleBack: () => setActiveView('dashboard'),
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <Header navigateTo={navigateTo} auth={dashboardAuthProps} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} appConfig={appConfig} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      {isConversationOpen && <Support auth={auth} />}
    </div>
  );
};

export default DashboardPage;