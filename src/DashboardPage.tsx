
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// FIX: Add AppConfig to import from types.
import { Page, AuthProps, View, User, Creation, AppConfig } from './types';
import { startLiveSession, editImageWithPrompt, generateInteriorDesign, colourizeImage, generateMagicSoul, generateApparelTryOn, generateMockup, generateCaptions, generateSupportResponse, generateProductPackPlan, generateStyledImage, generateVideo, getVideoOperationStatus, generateBrandStylistImage, removeElementFromImage } from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { encode, decode, decodeAudioData } from './utils/audioUtils';
import { deductCredits, getOrCreateUserProfile, saveCreation, getCreations, deleteCreation } from './firebase';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Billing from './components/Billing';
import ThemeToggle from './components/ThemeToggle';
// FIX: Changed to a named import for `AdminPanel` as it does not have a default export.
import { AdminPanel } from './components/AdminPanel'; // Import the new AdminPanel component
import { 
    UploadIcon, SparklesIcon, DownloadIcon, RetryIcon, ProjectsIcon, ArrowUpCircleIcon, LightbulbIcon,
    PhotoStudioIcon, HomeIcon, PencilIcon, CreditCardIcon, CaptionIcon, PaletteIcon, ProductStudioIcon,
    MicrophoneIcon, StopIcon, UserIcon as AvatarUserIcon, XIcon, MockupIcon, UsersIcon, CheckIcon,
    GarmentTopIcon, GarmentTrousersIcon, AdjustmentsVerticalIcon, ChevronUpIcon, ChevronDownIcon, LogoutIcon, PlusIcon,
    DashboardIcon, CopyIcon, InformationCircleIcon, StarIcon, TicketIcon, ChevronRightIcon, HelpIcon, MinimalistIcon,
    LeafIcon, CubeIcon, DiamondIcon, SunIcon, PlusCircleIcon, CompareIcon, ChevronLeftRightIcon, ShieldCheckIcon, DocumentTextIcon, FlagIcon,
    ArrowRightIcon, ZoomInIcon, FilmIcon, VideoCameraIcon, ColorSwatchIcon, ImageIcon, TrashIcon
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

// FIX: Re-implemented the missing ImageEditModal component to provide Magic Eraser functionality.
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

    // DEFINITIVE FIX: This effect synchronizes the component's internal state (`currentImageUrl`)
    // with the external `imageUrl` prop. This is the crucial step that was missing.
    // It ensures that whenever the modal is opened with a *new* image from the gallery,
    // its internal state is updated, triggering a re-render with the correct image.
    useEffect(() => {
        if (imageUrl) {
            setCurrentImageUrl(imageUrl);
            setHistory([imageUrl]); // Reset history for the new image editing session
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
    
    // This effect now correctly redraws the image whenever `currentImageUrl` is updated by the new effect above.
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
            else navigateTo('dashboard', 'billing');
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
                auth.setUser(prev => prev ? { ...prev, ...updatedProfile } : null);
            } else {
                const newCredits = guestCredits - EDIT_COST;
                setGuestCredits(newCredits);
                sessionStorage.setItem('magicpixa-guest-credits-eraser', newCredits.toString());
            }

        } catch (err) {
            console.error("Error removing element:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during editing.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const previousImage = history[history.length - 1];
            setHistory(prev => prev.slice(0, -1));
            setCurrentImageUrl(previousImage);
            drawImage(previousImage);
            clearMask();
            setError(null);
        }
    };

    const handleSaveAndClose = async () => {
        setIsLoading(true);
        try {
            // Only save if the image has actually changed from the original
            if (auth.user && currentImageUrl !== imageUrl) {
                await saveCreation(auth.user.uid, currentImageUrl, 'Magic Eraser (Edit)');
            }
            onSave(currentImageUrl);
            onClose();
        } catch (error) {
            console.error("Failed to save creation:", error);
            setError("Could not save your creation. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-sm flex flex-col p-4" onDoubleClick={onClose}>
            <div className="flex-shrink-0 flex justify-between items-center text-white pb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10"><XIcon className="w-6 h-6" /></button>
                    <h2 className="text-xl font-bold">Magic Eraser</h2>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleUndo} disabled={history.length <= 1 || isLoading} className="text-sm font-semibold py-2 px-4 rounded-lg hover:bg-white/10 disabled:opacity-50">Undo</button>
                    <button onClick={handleSaveAndClose} disabled={isLoading} className="text-sm font-bold py-2 px-4 rounded-lg bg-[#f9d230] text-black disabled:opacity-50">Done</button>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 w-full h-full flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
                <canvas ref={canvasRef} className="absolute max-w-full max-h-full object-contain rounded-lg"></canvas>
                <canvas
                    ref={maskCanvasRef}
                    className="absolute max-w-full max-h-full object-contain cursor-crosshair rounded-lg"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                ></canvas>
                {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white rounded-lg">
                        <SparklesIcon className="w-10 h-10 animate-pulse mb-4" />
                        <p className="font-bold">Applying Magic...</p>
                    </div>
                )}
                 {error && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white py-2 px-4 rounded-lg text-sm shadow-lg">
                        {error}
                    </div>
                )}
            </div>
            
            <div className="flex-shrink-0 flex items-center justify-center gap-4 pt-4" onClick={e => e.stopPropagation()}>
                <label className="text-white text-sm">Brush Size</label>
                <input
                    type="range"
                    min="10"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-48"
                />
            </div>

            <div className="absolute bottom-4 left-4 p-3 bg-black/50 text-white rounded-lg text-sm font-semibold flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={handleRemoveElement} disabled={isLoading || hasInsufficientCredits} className="bg-red-500 hover:bg-red-600 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">
                    Erase
                </button>
                <div className="text-center">
                    <p>Cost: {EDIT_COST} credit</p>
                    {hasInsufficientCredits && <p className="text-xs text-red-300">Insufficient funds</p>}
                </div>
            </div>
        </div>
    );
};


// Placeholder for a feature view
const FeaturePlaceholder: React.FC<{ title: string }> = ({ title }) => (
    <div className="p-8 h-full flex items-center justify-center">
        <div className="text-center">
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-gray-500 mt-2">This feature is under construction.</p>
        </div>
    </div>
);


const CreationsGallery: React.FC<{ 
    creations: Creation[]; 
    isLoading: boolean;
    onDelete: (creation: Creation) => Promise<void>;
    onEdit: (imageUrl: string) => void;
}> = ({ creations, isLoading, onDelete, onEdit }) => {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
    
    const handleDelete = async (creation: Creation) => {
        if (window.confirm("Are you sure you want to delete this creation? This action cannot be undone.")) {
            setDeletingId(creation.id);
            await onDelete(creation);
            setDeletingId(null);
        }
    };

    const handleDownload = async (imageUrl: string) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `magicpixa-creation-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback for CORS issues: open in new tab
            window.open(imageUrl, '_blank');
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading your creations...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className='mb-8'>
              <h2 className="text-3xl font-bold text-[#1E1E1E]">My Creations</h2>
              <p className="text-[#5F6368] mt-1">Browse, download, or edit your generated images.</p>
            </div>
            {creations.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {creations.map(creation => (
                        <div key={creation.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img src={creation.imageUrl} alt={creation.feature} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setZoomedImageUrl(creation.imageUrl)} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40"><ZoomInIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="text-white">
                                    <p className="font-bold text-sm truncate">{creation.feature}</p>
                                    <p className="text-xs">{creation.createdAt.toDate().toLocaleDateString()}</p>
                                </div>
                            </div>
                             <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDownload(creation.imageUrl)} className="p-2 bg-white/80 rounded-full text-gray-800 hover:bg-white shadow-md"><DownloadIcon className="w-5 h-5"/></button>
                                <button onClick={() => onEdit(creation.imageUrl)} className="p-2 bg-white/80 rounded-full text-gray-800 hover:bg-white shadow-md"><PencilIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(creation)} disabled={deletingId === creation.id} className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-500 shadow-md disabled:opacity-50">
                                    {deletingId === creation.id ? <SparklesIcon className="w-5 h-5 animate-spin"/> : <TrashIcon className="w-5 h-5"/>}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                     <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                     <h3 className="text-xl font-bold text-[#1E1E1E]">Nothing here yet!</h3>
                     <p className="text-[#5F6368] mt-2">Your magical creations will appear here once you generate them.</p>
                </div>
            )}
            {zoomedImageUrl && <ImageModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
        </div>
    );
};


const DashboardPage: React.FC<DashboardPageProps> = ({ navigateTo, auth, activeView, setActiveView, openEditProfileModal, isConversationOpen, setIsConversationOpen, appConfig, setAppConfig }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(true);
    const [editModalState, setEditModalState] = useState<{ isOpen: boolean; imageUrl: string | null }>({ isOpen: false, imageUrl: null });

    const fetchCreations = useCallback(async () => {
        if (auth.user) {
            setIsLoadingCreations(true);
            try {
                const userCreations = await getCreations(auth.user.uid);
                setCreations(userCreations as Creation[]);
            } catch (error) {
                console.error("Failed to fetch creations:", error);
            } finally {
                setIsLoadingCreations(false);
            }
        }
    }, [auth.user]);

    useEffect(() => {
        // Fetch creations when the component mounts or when the user changes,
        // as it's needed for the main dashboard view and the creations view.
        if (auth.user) {
            fetchCreations();
        }
    }, [auth.user, fetchCreations]);
    
    const handleDeleteCreation = async (creation: Creation) => {
        if (auth.user) {
            await deleteCreation(auth.user.uid, creation);
            fetchCreations(); // Refresh list after deleting
        }
    };
    
    const handleEditSave = () => {
        fetchCreations(); // Re-fetch to show the newly saved edited creation
        setEditModalState({ isOpen: false, imageUrl: null });
    };

    const renderContent = () => {
        switch (activeView) {
            case 'home_dashboard':
            case 'dashboard':
                return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig} />;
            case 'creations':
                return <CreationsGallery creations={creations} isLoading={isLoadingCreations} onDelete={handleDeleteCreation} onEdit={(imageUrl) => setEditModalState({isOpen: true, imageUrl})} />;
            case 'billing':
                return <Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} />;
            case 'admin':
                return auth.user?.isAdmin ? <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} /> : <FeaturePlaceholder title="Access Denied" />;
            case 'studio':
            case 'product_studio':
            case 'brand_stylist':
            case 'soul':
            case 'colour':
            case 'caption':
            case 'interior':
            case 'apparel':
            case 'mockup':
                return <FeaturePlaceholder title={dashboardFeatures.find(f => f.view === activeView)?.title || 'Feature'} />;
            default:
                return <Dashboard user={auth.user} navigateTo={navigateTo} openEditProfileModal={openEditProfileModal} setActiveView={setActiveView} creations={creations} appConfig={appConfig}/>;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#F9FAFB]">
             <Header 
                navigateTo={navigateTo} 
                auth={{ 
                    ...auth, 
                    isDashboard: true, 
                    setActiveView, 
                    openConversation: () => setIsConversationOpen(true),
                    showBackButton: activeView !== 'home_dashboard' && activeView !== 'dashboard',
                    handleBack: () => setActiveView(window.innerWidth < 1024 ? 'home_dashboard' : 'dashboard')
                }} 
            />
            <div className="flex-1 flex overflow-hidden">
                <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} appConfig={appConfig} />
                <main className="flex-1 overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
            {editModalState.isOpen && editModalState.imageUrl && (
                 <ImageEditModal
                    imageUrl={editModalState.imageUrl}
                    onClose={() => setEditModalState({ isOpen: false, imageUrl: null })}
                    onSave={handleEditSave}
                    auth={auth}
                    navigateTo={navigateTo}
                    appConfig={appConfig}
                />
            )}
        </div>
    );
};

export default DashboardPage;
