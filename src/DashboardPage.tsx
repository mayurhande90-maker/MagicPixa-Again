
import React, { useState, useEffect, useRef } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { 
    getCreations, 
    saveCreation, 
    deleteCreation, 
    deductCredits,
    completeDailyMission
} from './firebase';
import { 
    generateInteriorDesign, 
    colourizeImage, 
    generateMagicSoul, 
    generateApparelTryOn, 
    generateMockup, 
    generateCaptions, 
    generateProductPackPlan, 
    editImageWithPrompt,
    generateBrandStylistImage,
    generateThumbnail,
    startLiveSession,
    analyzeVideoFrames,
    analyzeProductImage,
    generateModelShot,
    analyzeProductForModelPrompts
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { extractFramesFromVideo } from './utils/videoUtils';
import { getDailyMission, isMissionCompletedToday, Mission, MissionConfig } from './utils/dailyMissions';
import { 
    PhotoStudioIcon, 
    UploadIcon, 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    ProjectsIcon,
    MicrophoneIcon, 
    CubeIcon,
    UsersIcon,
    VideoCameraIcon,
    LightbulbIcon,
    ArrowUpCircleIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    CaptionIcon,
    ProductStudioIcon,
    DashboardIcon,
    XIcon,
    AudioWaveIcon,
    ArrowRightIcon,
    GarmentTopIcon,
    GarmentTrousersIcon,
    CopyIcon,
    CheckIcon,
    RetryIcon,
    PencilIcon,
    ArrowLeftIcon,
    CreditCardIcon,
    SunIcon,
    ChartBarIcon,
    FlagIcon
} from './components/icons';
import { LiveServerMessage, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from './utils/audioUtils';

interface DashboardPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
    activeView: View;
    setActiveView: (view: View) => void;
    openEditProfileModal: () => void;
    isConversationOpen: boolean;
    setIsConversationOpen: (isOpen: boolean) => void;
    appConfig: AppConfig | null;
    setAppConfig: (config: AppConfig) => void;
}

const downloadImage = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.warn("Download failed, opening in new tab", error);
        window.open(url, '_blank');
    }
};

const InputField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <input id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400" {...props} />
    </div>
);

const TextAreaField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <textarea id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400 resize-none" rows={4} {...props} />
    </div>
);

// Visual Selector for Prompt-Less UI - Premium Card Style
const VisualSelector: React.FC<{ 
    label: string; 
    options: { id: string; label: string; color?: string }[]; 
    selected: string; 
    onSelect: (id: string) => void; 
}> = ({ label, options, selected, onSelect }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between mb-3 ml-1">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
             <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold tracking-wide">REQUIRED</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {options.map(opt => {
                const isSelected = selected === opt.id;
                return (
                    <button 
                        key={opt.id} 
                        onClick={() => onSelect(opt.id)}
                        className={`relative group overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border-2 ${
                            isSelected 
                            ? 'border-[#4D7CFF] bg-[#4D7CFF]/5 shadow-md' 
                            : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-full h-full flex flex-col justify-between gap-3`}>
                            <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#4D7CFF]' : 'bg-gray-300 group-hover:bg-gray-400'} transition-colors duration-300`}></div>
                            <span className={`font-bold text-sm ${isSelected ? 'text-[#1A1A1E]' : 'text-gray-500 group-hover:text-gray-700'} transition-colors duration-300`}>{opt.label}</span>
                        </div>
                    </button>
                )
            })}
        </div>
    </div>
);

const SelectField: React.FC<any> = ({ label, children, ...props }) => (
    <div className="mb-6">
         {label && <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
         <div className="relative">
            <select className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl appearance-none outline-none transition-all font-medium text-[#1A1A1E] cursor-pointer" {...props}>
                {children}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
         </div>
    </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
        <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full view" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
    </div>
);

const MissionSuccessModal: React.FC<{ reward: number; onClose: () => void }> = ({ reward, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
         <div className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
             {/* Confetti CSS placeholder - would use a library in real app */}
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-6xl animate-pulse">🎉</div>
             
             <h2 className="text-2xl font-bold text-[#1A1A1E] mt-4 mb-2">Mission Accomplished!</h2>
             <p className="text-gray-500 mb-6">You've unlocked your daily creative reward.</p>
             
             <div className="bg-green-50 text-green-600 font-bold text-3xl py-4 rounded-2xl mb-6 border border-green-100">
                 +{reward} Credits
             </div>
             
             <button onClick={onClose} className="w-full bg-[#F9D230] text-[#1A1A1E] font-bold py-3 rounded-xl hover:bg-[#dfbc2b] transition-colors">
                 Awesome!
             </button>
         </div>
    </div>
);


// --- Standardized Layout Component (Strict 2-Column) ---
const FeatureLayout: React.FC<{
    title: string;
    icon: React.ReactNode;
    leftContent: React.ReactNode; // The Canvas
    rightContent: React.ReactNode; // The Controls
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
    creditCost: number;
    resultImage: string | null;
    onResetResult?: () => void;
    onNewSession?: () => void;
    description?: string;
    generateButtonStyle?: {
        className?: string;
        hideIcon?: boolean;
        label?: string;
    };
    resultHeightClass?: string;
}> = ({ 
    title, icon, leftContent, rightContent, onGenerate, isGenerating, canGenerate, 
    creditCost, resultImage, onResetResult, onNewSession, description,
    generateButtonStyle, resultHeightClass
}) => {
    const [isZoomed, setIsZoomed] = useState(false);

    return (
        <div className="flex flex-col p-6 lg:p-8 max-w-[1800px] mx-auto bg-[#FFFFFF]">
            {/* Header */}
            <div className="mb-5 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        {icon}
                    </div>
                    <h1 className="text-2xl font-bold text-[#1A1A1E]">{title}</h1>
                </div>
                {description && <p className="text-sm text-gray-500 font-medium max-w-2xl">{description}</p>}
            </div>

            {/* Main Content Grid */}
            {/* 50/50 Split for equal sizing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT COLUMN: Upload / Preview / Result Canvas */}
                <div className="h-full flex flex-col justify-start">
                    {resultImage ? (
                        <div className={`w-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner ${resultHeightClass || 'h-full min-h-[400px]'}`}>
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50"></div>
                             <img 
                                src={resultImage} 
                                className="w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]" 
                                onClick={() => setIsZoomed(true)}
                                title="Click to zoom"
                             />
                             
                             {/* Result Actions */}
                             <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
                                <div className="pointer-events-auto flex gap-2 sm:gap-3 flex-wrap justify-center">
                                    {onNewSession && (
                                         <button onClick={onNewSession} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">New Project</span>
                                        </button>
                                    )}
                                    {onResetResult && (
                                        <button onClick={onResetResult} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <RetryIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">Regenerate</span>
                                        </button>
                                    )}
                                    <button onClick={() => resultImage && downloadImage(resultImage, 'magicpixa-creation.png')} className="bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                                        <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5"/> <span>Download</span>
                                    </button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-start">
                            <div className="w-full relative flex flex-col items-center">
                                {leftContent}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Control Deck */}
                {/* h-full to force equal height with left column */}
                <div className="flex flex-col h-full">
                    <div className="bg-[#F6F7FA] p-5 rounded-3xl flex-1 flex flex-col h-full border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configuration</h3>
                            <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
                        </div>
                        
                        {/* Scrollable Content containing inputs AND button */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                            <div className="flex flex-col min-h-full">
                                {/* Changed justify-center to justify-start to align content to top */}
                                <div className="space-y-2 mb-6 flex-1 flex flex-col justify-start">
                                    {rightContent}
                                </div>

                                {/* Generate Button moved to bottom */}
                                <div className="mt-auto pt-4 border-t border-gray-200 bg-[#F6F7FA]">
                                    <button 
                                        onClick={onGenerate} 
                                        disabled={isGenerating || !canGenerate}
                                        className={`group w-full text-lg font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 ${
                                            generateButtonStyle?.className 
                                            ? generateButtonStyle.className 
                                            : "bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] shadow-yellow-500/20 hover:shadow-yellow-500/40"
                                        }`}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className={`w-6 h-6 border-3 border-t-transparent rounded-full animate-spin border-black/10 border-t-black`}></div> 
                                                <span className="animate-pulse">Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                {!generateButtonStyle?.hideIcon && <SparklesIcon className="w-6 h-6 transition-transform group-hover:rotate-12"/>}
                                                {generateButtonStyle?.label || "Generate"}
                                            </>
                                        )}
                                    </button>
                                    <div className="text-center mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                        {creditCost === 0 ? (
                                             <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1 rounded-full border border-green-200">
                                                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                 Sponsored by Daily Mission
                                             </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                                                <span className="w-1.5 h-1.5 bg-[#6EFACC] rounded-full animate-pulse"></span>
                                                Cost: {creditCost} Credits
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isZoomed && resultImage && (
                <ImageModal imageUrl={resultImage} onClose={() => setIsZoomed(false)} />
            )}
        </div>
    );
};

const UploadPlaceholder: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
    <div className="w-full flex justify-center">
        <div 
            onClick={onClick}
            className="h-[500px] w-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl mx-auto"
        >
            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                <UploadIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
            </div>
            
            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">{label}</p>
                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                    <div className="bg-gray-50 rounded-full px-3 py-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                            Click to Browse
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// --- Feature Components ---

// Helper for the new button-grid selectors
const SelectionGrid: React.FC<{ label: string; options: string[]; value: string; onChange: (val: string) => void }> = ({ label, options, value, onChange }) => (
    <div className="mb-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-3 ml-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
            {value && (
                 <button onClick={() => onChange('')} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">
                     Clear
                 </button>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isSelected = value === opt;
                return (
                    <button 
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${
                            isSelected 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm'
                        }`}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>
    </div>
);

const MagicPhotoStudio: React.FC<{ 
    auth: AuthProps; 
    navigateTo: any; 
    appConfig: AppConfig | null;
    activeMission?: Mission; 
    onMissionComplete?: () => void;
}> = ({ auth, appConfig, activeMission, onMissionComplete }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [showReward, setShowReward] = useState(false);

    // Refs for File Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    // Mode Selection State
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);

    // Manual Refinement State (Product)
    const [category, setCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');

    // Manual Refinement State (Model)
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    // New Model Controls
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    // Mission Tracking Ref (to prevent double submission in one session)
    const hasCompletedMissionRef = useRef(false);

    // Apply Mission Config on Load if active
    useEffect(() => {
        if (activeMission?.config && !studioMode) {
            const conf = activeMission.config;
            if (conf.studioMode) setStudioMode(conf.studioMode);
            if (conf.selectedPrompt) setSelectedPrompt(conf.selectedPrompt);
            if (conf.category) setCategory(conf.category);
            if (conf.brandStyle) setBrandStyle(conf.brandStyle);
            // ... map other fields as needed
            hasCompletedMissionRef.current = false; // Reset for new mission attempt
        }
    }, [activeMission]);

    const categories = ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Packaged Products', 'Jewellery', 'Footwear', 'Toys', 'Automotive'];
    const brandStyles = ['Clean', 'Bold', 'Luxury', 'Playful', 'Natural', 'High-tech', 'Minimal'];
    const visualTypes = ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'];

    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    // Animation Timer for Loading Text
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing Structure...", "Generating Model...", "Adjusting Lighting...", "Applying Physics...", "Polishing Pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            // NO IMMEDIATE ANALYSIS. Just set the image.
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            
            // Reset Session State But KEEP Image
            setResult(null);
            // Only reset mode if NOT in active mission
            if (!activeMission) {
                setStudioMode(null);
                setSelectedPrompt(null);
            }
            // Reset other granular settings to allow re-config
            setCategory(''); setBrandStyle(''); setVisualType('');
            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
            setModelComposition(''); setModelFraming('');
            setSuggestedPrompts([]);
            setSuggestedModelPrompts([]);
            
            // Set the new image
            setImage({ url: URL.createObjectURL(file), base64 });
        }
    };

    const handleModeSelect = async (mode: 'product' | 'model') => {
        setResult(null); // Clear any existing result to start scanning afresh on the original image
        setStudioMode(mode);
        setSelectedPrompt(null);
        
        if (mode === 'product') {
            // Trigger analysis logic for Product Mode
            setIsAnalyzing(true);
            try {
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType);
                setSuggestedPrompts(prompts);
            } catch (err) {
                console.error(err);
                setSuggestedPrompts([
                    "Put this on a clean white table with soft shadows",
                    "Show this product on a luxury gold podium"
                ]);
            } finally {
                setIsAnalyzing(false);
            }
        } else if (mode === 'model') {
             // Trigger scanning/analysis logic for Model Mode
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType);
                 setSuggestedModelPrompts(prompts);
             } catch (e) {
                 console.error(e);
                 // Fallback structure
                 setSuggestedModelPrompts([
                    { display: "Close-Up Portrait", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
                    { display: "Lifestyle Group", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" }
                 ]);
             } finally {
                 setIsAnalyzingModel(false);
             }
        }
    };

    // Mutually Exclusive Selection Logic
    const handlePromptSelect = (prompt: string) => {
        if (selectedPrompt === prompt) {
             setSelectedPrompt(null);
        } else {
             setSelectedPrompt(prompt);
             if (studioMode === 'product') {
                 setCategory(''); setBrandStyle(''); setVisualType('');
             } else {
                 setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                 setModelComposition(''); setModelFraming('');
             }
        }
    };

    const handleCategorySelect = (val: string) => {
        setCategory(val);
        setBrandStyle('');
        setVisualType('');
    };

    const handleBrandStyleSelect = (val: string) => {
        setBrandStyle(val);
        setVisualType('');
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setResult(null); 
        setLoading(true);
        try {
            let res;
            let cost = 2;

            if (studioMode === 'model') {
                 cost = appConfig?.featureCosts['Model Shot'] || 3;
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, {
                    modelType,
                    region: modelRegion,
                    skinTone,
                    bodyType,
                    composition: modelComposition,
                    framing: modelFraming,
                    freeformPrompt: selectedPrompt || undefined
                 });
            } else {
                cost = appConfig?.featureCosts['Magic Photo Studio'] || 2;
                let generationDirection = "";
                if (selectedPrompt) {
                    generationDirection = selectedPrompt;
                } else if (category) {
                    generationDirection = `${visualType || 'Professional'} shot of ${category} product. Style: ${brandStyle || 'Clean'}.`;
                } else {
                    generationDirection = "Professional studio lighting";
                }
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection);
            }

            const url = `data:image/png;base64,${res}`;
            setResult(url);
            
            // CHECK MISSION COMPLETION
            if (activeMission && !hasCompletedMissionRef.current && auth.user) {
                 const updatedUser = await completeDailyMission(auth.user.uid, activeMission.reward, activeMission.title);
                 // Update local auth user to show new credits
                 auth.setUser(prev => prev ? { ...prev, credits: updatedUser.credits, lastDailyMissionCompleted: updatedUser.lastDailyMissionCompleted } : null);
                 setShowReward(true);
                 hasCompletedMissionRef.current = true;
                 if (onMissionComplete) onMissionComplete();
            } else {
                // Standard flow
                const updated = await deductCredits(auth.user.uid, cost, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
                auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
            }

            saveCreation(auth.user.uid, url, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');

        } catch (e) {
            console.error(e);
            alert('Generation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setImage(null); 
        setResult(null);
        setStudioMode(null);
        setCategory(''); setBrandStyle(''); setVisualType('');
        setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
        setModelComposition(''); setModelFraming('');
        setSuggestedPrompts([]);
        setSuggestedModelPrompts([]);
        setSelectedPrompt(null);
        hasCompletedMissionRef.current = false;
    };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && (
        studioMode === 'product' 
            ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType))
            : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming))
    );

    // If mission is active, cost is 0 (sponsored), else standard
    const currentCost = activeMission && !hasCompletedMissionRef.current
        ? 0 
        : (studioMode === 'model' ? (appConfig?.featureCosts['Model Shot'] || 3) : (appConfig?.featureCosts['Magic Photo Studio'] || 2));

    return (
        <>
        <FeatureLayout 
            title={activeMission ? `Daily Mission: ${activeMission.title}` : "Magic Photo Studio"}
            description={activeMission ? activeMission.description : "Transform simple photos into professional, studio-quality product shots or lifelike model images."}
            icon={activeMission ? <FlagIcon className="w-6 h-6 text-yellow-500"/> : <PhotoStudioIcon className="w-6 h-6 text-blue-500"/>}
            creditCost={currentCost}
            isGenerating={loading}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            onNewSession={handleNewSession}
            resultHeightClass="h-[560px]"
            generateButtonStyle={{
                className: activeMission ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg border-none" : "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                hideIcon: true,
                label: activeMission ? "Generate Mission Image" : "Generate"
            }}
            leftContent={
                image ? (
                    <div className="relative h-[560px] w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                         {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}

                        {(isAnalyzing || isAnalyzingModel) && (
                            <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] rounded-3xl overflow-hidden flex items-center justify-center">
                                {(isAnalyzing || isAnalyzingModel) && (
                                    <>
                                        <div className="absolute top-0 h-full w-[3px] bg-[#4D7CFF] shadow-[0_0_20px_#4D7CFF] animate-[scan-horizontal_1.5s_linear_infinite] z-30"></div>
                                        <div className="absolute top-0 h-full w-48 bg-gradient-to-l from-[#4D7CFF]/30 to-transparent animate-[scan-horizontal_1.5s_linear_infinite] -translate-x-full z-20"></div>
                                    </>
                                )}
                                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-40 animate-bounce-slight">
                                    <div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div>
                                    <span className="text-xs font-bold tracking-widest uppercase">{isAnalyzingModel ? 'Generating Suggestions...' : 'Scanning Image...'}</span>
                                </div>
                            </div>
                        )}

                        <img 
                            src={image.url} 
                            className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                        />
                        
                        {!loading && !isAnalyzing && !isAnalyzingModel && (
                            <button 
                                onClick={() => redoFileInputRef.current?.click()} 
                                className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all hover:scale-110 z-40 border border-gray-100 group-hover:opacity-100 opacity-0"
                                title="Change Photo"
                            >
                                <UploadIcon className="w-5 h-5"/>
                            </button>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        
                        <style>{`
                            @keyframes progress {
                                0% { width: 0%; margin-left: 0; }
                                50% { width: 100%; margin-left: 0; }
                                100% { width: 0%; margin-left: 100%; }
                            }
                            @keyframes fadeInUp {
                                from { opacity: 0; transform: translateY(10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            @keyframes scan-horizontal {
                                0% { left: 0%; }
                                100% { left: 100%; }
                            }
                        `}</style>
                    </div>
                ) : (
                    <UploadPlaceholder label={activeMission ? 'Upload to Start Mission' : 'Upload Product Photo'} onClick={() => fileInputRef.current?.click()} />
                )
            }
            rightContent={
                !image ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                        <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                            <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                        </div>
                        <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                        <p className="text-sm text-gray-400">Upload a photo to unlock AI tools.</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn p-1 h-full flex flex-col">
                        
                        {activeMission ? (
                            <div className="flex flex-col h-full justify-center items-center text-center p-6">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4 animate-bounce-slight">
                                    <FlagIcon className="w-8 h-8 text-yellow-600"/>
                                </div>
                                <h3 className="text-xl font-bold text-[#1A1A1E] mb-2">Mission Active: {activeMission.title}</h3>
                                <p className="text-gray-500 mb-6 max-w-xs text-sm">{activeMission.description}</p>
                                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-xs font-bold border border-green-200">
                                    AI Settings Pre-Loaded
                                </div>
                            </div>
                        ) : (
                            /* STANDARD CONTROLS (Non-Mission) */
                            <>
                                {/* STEP 1: Mode Selection */}
                                {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="flex flex-col gap-4 h-full justify-center">
                                        <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                        <button onClick={() => handleModeSelect('product')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-blue-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors"><CubeIcon className="w-6 h-6"/></div>
                                                <span className="text-lg font-bold text-gray-800">Product Shot</span>
                                            </div>
                                            <p className="text-xs text-gray-500 pl-[4.5rem]">Studio lighting, podiums, and nature settings.</p>
                                        </button>
                                        <button onClick={() => handleModeSelect('model')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-purple-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                            <div className="flex items-center gap-4 mb-2">
                                                <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors"><UsersIcon className="w-6 h-6"/></div>
                                                <span className="text-lg font-bold text-gray-800">Model Shot</span>
                                            </div>
                                            <p className="text-xs text-gray-500 pl-[4.5rem]">Realistic human models holding or wearing your product.</p>
                                        </button>
                                    </div>
                                )}

                                {/* STEP 2: Configuration */}
                                {studioMode && (
                                    <div className="animate-fadeIn relative">
                                        <div className="flex items-center mb-4 -ml-2"> 
                                            <button onClick={() => {
                                                    setStudioMode(null);
                                                    setSelectedPrompt(null);
                                                    setCategory(''); setBrandStyle(''); setVisualType('');
                                                    setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                                                    setModelComposition(''); setModelFraming('');
                                                }} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                            >
                                                <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                            </button>
                                        </div>

                                        {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType) || isAnalyzing || isAnalyzingModel) && (
                                            <div className={`transition-all duration-300 mb-6`}>
                                                {(isAnalyzing || isAnalyzingModel) ? (
                                                    <div className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-100 opacity-50">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating Suggestions...</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="flex items-center justify-between mb-3 ml-1">
                                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Suggestions</label>
                                                            {selectedPrompt ? (
                                                                <button onClick={() => setSelectedPrompt(null)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear Selection</button>
                                                            ) : (
                                                                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold tracking-wide">RECOMMENDED</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((promptItem, idx) => {
                                                                const isModel = studioMode === 'model';
                                                                const displayText = isModel ? (promptItem as any).display : promptItem;
                                                                const promptValue = isModel ? (promptItem as any).prompt : promptItem;

                                                                return (
                                                                    <button 
                                                                        key={idx} 
                                                                        onClick={() => handlePromptSelect(promptValue)}
                                                                        style={!selectedPrompt ? { animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' } : {}}
                                                                        className={`group relative w-auto inline-flex rounded-full p-[2px] transition-all duration-300 transform active:scale-95 ${!selectedPrompt && 'animate-[fadeInUp_0.5s_ease-out]'} ${
                                                                            selectedPrompt === promptValue ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
                                                                        }`}
                                                                    >
                                                                        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 ${selectedPrompt === promptValue ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-300`}></div>
                                                                        <div className={`relative h-full w-full rounded-full flex items-center justify-center px-4 py-2 transition-colors duration-300 ${selectedPrompt === promptValue ? 'bg-transparent' : 'bg-white'}`}>
                                                                            <span className={`text-xs font-medium italic text-left ${selectedPrompt === promptValue ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'}`}>"{displayText}"</span>
                                                                        </div>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                            <div className="relative mb-6">
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="h-px flex-1 bg-gray-200"></div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR CUSTOMIZE</span>
                                                    <div className="h-px flex-1 bg-gray-200"></div>
                                                </div>
                                            </div>
                                        )}

                                        {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                            <div className="space-y-6 animate-fadeIn">
                                                {studioMode === 'product' ? (
                                                    <>
                                                         <div>
                                                             <div className="flex items-center justify-between mb-3 ml-1">
                                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Product Category</label>
                                                                {category && <button onClick={() => { setCategory(''); setBrandStyle(''); setVisualType(''); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear</button>}
                                                             </div>
                                                             <div className="flex flex-wrap gap-2">
                                                                {categories.map(opt => (
                                                                    <button key={opt} onClick={() => handleCategorySelect(opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform ${category === opt ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm active:scale-95'}`}>{opt}</button>
                                                                ))}
                                                             </div>
                                                        </div>
                                                        {category && <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={handleBrandStyleSelect} />}
                                                        {category && brandStyle && <SelectionGrid label="3. Visual Type" options={visualTypes} value={visualType} onChange={setVisualType} />}
                                                    </>
                                                ) : (
                                                    <>
                                                        <SelectionGrid label="1. Composition" options={compositionTypes} value={modelComposition} onChange={setModelComposition} />
                                                        {modelComposition && <SelectionGrid label="2. Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming(''); }} />}
                                                        {modelType && <SelectionGrid label="3. Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); setSkinTone(''); setBodyType(''); }} />}
                                                        {modelRegion && <SelectionGrid label="4. Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); setBodyType(''); }} />}
                                                        {skinTone && <SelectionGrid label="5. Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); setModelFraming(''); }} />}
                                                        {bodyType && <SelectionGrid label="6. Shot Type" options={shotTypes} value={modelFraming} onChange={setModelFraming} />}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )
            }
        />
        {showReward && activeMission && (
            <MissionSuccessModal reward={activeMission.reward} onClose={() => setShowReward(false)} />
        )}
        </>
    );
};

// --- Creative Loft Dashboard Home Components ---

const SunDial: React.FC<{ credits: number }> = ({ credits }) => (
    <div className="relative group cursor-pointer w-fit ml-auto">
        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
        <div className="relative bg-white p-3 rounded-full shadow-lg border border-yellow-100 flex items-center gap-3 pr-5 transition-all duration-300 group-hover:scale-105">
            <SunIcon className={`w-8 h-8 text-yellow-400 ${credits > 0 ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Energy</span>
                <span className="text-lg font-bold text-[#1A1A1E] leading-none">{credits}</span>
            </div>
        </div>
    </div>
);

const CreativeDNA: React.FC<{ creations: any[] }> = ({ creations }) => {
    // Calculate Top Tool
    const toolCounts: Record<string, number> = {};
    creations.forEach(c => {
        toolCounts[c.feature] = (toolCounts[c.feature] || 0) + 1;
    });
    let topTool = 'None yet';
    let maxCount = 0;
    Object.entries(toolCounts).forEach(([tool, count]) => {
        if (count > maxCount) {
            maxCount = count;
            topTool = tool;
        }
    });

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4" /> Creative DNA
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl">
                    <p className="text-3xl font-bold text-[#1A1A1E]">{creations.length}</p>
                    <p className="text-xs text-gray-500 font-medium mt-1">Total Creations</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl">
                    <p className="text-sm font-bold text-blue-600 truncate" title={topTool}>{topTool.split(' ')[0]}</p>
                    <p className="text-xs text-blue-400 font-medium mt-1">Favorite Tool</p>
                </div>
            </div>
        </div>
    );
};

const DailyQuest: React.FC<{ 
    user: User | null;
    onStartMission: (mission: Mission) => void; 
}> = ({ user, onStartMission }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const mission = getDailyMission();
    const isCompleted = isMissionCompletedToday(user?.lastDailyMissionCompleted);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            const diff = tomorrow.getTime() - now.getTime();
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };
        
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`rounded-3xl p-6 shadow-sm border relative overflow-hidden group ${isCompleted ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
            {!isCompleted && <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-100/50 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-yellow-200/50 transition-colors"></div>}
            
            <div className="flex items-center justify-between mb-4 relative z-10">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${isCompleted ? 'bg-green-200 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>
                    <FlagIcon className="w-3 h-3" /> {isCompleted ? 'Mission Complete' : 'Daily Mission'}
                </span>
            </div>
            
            <h3 className="text-lg font-bold text-[#1A1A1E] mb-1 relative z-10">{mission.title}</h3>
            <p className="text-sm text-gray-500 mb-6 relative z-10">{mission.description}</p>
            
            <div className="flex items-center justify-between relative z-10">
                {!isCompleted ? (
                    <>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-400 uppercase">Reward</span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded">+{mission.reward} Credits</span>
                        </div>
                        <button 
                            onClick={() => onStartMission(mission)}
                            className="bg-[#1A1A1E] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black hover:scale-105 transition-all shadow-lg"
                        >
                            Start Challenge
                        </button>
                    </>
                ) : (
                    <div className="w-full flex justify-between items-center">
                         <span className="text-xs font-bold text-green-700">Reward Claimed!</span>
                         <span className="text-xs font-mono text-green-600 bg-green-100 px-2 py-1 rounded">Next: {timeLeft}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const SpotlightHero: React.FC<{ lastCreation: any, navigateTo: any }> = ({ lastCreation, navigateTo }) => {
    if (!lastCreation) {
        return (
            <div className="h-[500px] w-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-[2.5rem] border border-gray-200 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.5)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] bg-no-repeat group-hover:animate-[shine_2s_infinite]"></div>
                <div className="relative z-10 max-w-md">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1E] mb-4">Your Canvas is Empty</h2>
                    <p className="text-gray-500 mb-8">Start your first masterpiece today. The studio is ready for you.</p>
                    <button 
                        onClick={() => navigateTo('dashboard', 'studio')}
                        className="bg-[#1A1A1E] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-black hover:scale-105 transition-all flex items-center gap-3 mx-auto"
                    >
                        <SparklesIcon className="w-5 h-5 text-[#F9D230]" /> Start Creating
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[600px] w-full rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
            <img src={lastCreation.imageUrl} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
            
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full mb-4 border border-white/20 uppercase tracking-wider">
                    Last Worked On
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{lastCreation.feature}</h2>
                <p className="text-gray-300 text-sm mb-8">
                    Created on {lastCreation.createdAt?.toDate ? lastCreation.createdAt.toDate().toLocaleDateString() : 'Recently'}
                </p>
                
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigateTo('dashboard', 'studio')} // Ideal: Deep link to resume
                        className="bg-white text-[#1A1A1E] px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                        <SparklesIcon className="w-4 h-4" /> Create Another
                    </button>
                    <button 
                         onClick={() => downloadImage(lastCreation.imageUrl, 'spotlight-image.png')}
                         className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                        <DownloadIcon className="w-4 h-4" /> Download
                    </button>
                </div>
            </div>
        </div>
    );
};

const QuickToolList: React.FC<{ navigateTo: any }> = ({ navigateTo }) => {
    const tools = [
        { id: 'product_studio', label: 'Product Studio', icon: CubeIcon, color: 'text-green-500', bg: 'bg-green-50' },
        { id: 'thumbnail_studio', label: 'Thumbnail Studio', icon: ThumbnailIcon, color: 'text-red-500', bg: 'bg-red-50' },
        { id: 'caption', label: 'Caption AI', icon: CaptionIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recommended</h3>
            <div className="space-y-2">
                {tools.map(tool => (
                    <button 
                        key={tool.id}
                        onClick={() => navigateTo('dashboard', tool.id)}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors group text-left"
                    >
                        <div className={`p-2.5 rounded-xl ${tool.bg} ${tool.color} group-hover:scale-110 transition-transform`}>
                            <tool.icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-700 text-sm group-hover:text-[#1A1A1E]">{tool.label}</span>
                        <ArrowRightIcon className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500" />
                    </button>
                ))}
            </div>
        </div>
    );
};

const DashboardHome: React.FC<{ 
    user: User | null, 
    navigateTo: any, 
    setActiveView: any,
    onStartMission: (mission: Mission) => void 
}> = ({ user, navigateTo, setActiveView, onStartMission }) => {
    const [recent, setRecent] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setRecent(data);
                setLoading(false);
            });
        }
    }, [user]);

    return (
        <div className="min-h-full p-4 sm:p-8 max-w-[1600px] mx-auto relative">
            {/* Animated Background Blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-[20%] right-[-10%] w-[40rem] h-[40rem] bg-blue-200/30 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column (The Easel) - 65% width on large screens */}
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                         <h1 className="text-3xl md:text-4xl font-bold text-[#1A1A1E]">
                            Welcome back, {user?.name?.split(' ')[0]}.
                        </h1>
                        <p className="text-gray-500">Your studio is ready.</p>
                    </div>
                    
                    {/* Spotlight Hero - Takes most of the space */}
                    <SpotlightHero lastCreation={recent[0]} navigateTo={navigateTo} />
                </div>

                {/* Right Column (The Desk) - 35% width */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                     {/* 1. Sun Dial (Energy) */}
                     <div className="flex justify-end">
                        {user && <SunDial credits={user.credits} />}
                     </div>

                     {/* 2. Creative DNA */}
                     <CreativeDNA creations={recent} />

                     {/* 3. Daily Quest (Replaces The Tray) */}
                     <DailyQuest user={user} onStartMission={onStartMission} />

                     {/* 4. Quick Tools */}
                     <QuickToolList navigateTo={navigateTo} />
                </div>
            </div>
             <style>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                 @keyframes shine {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `}</style>
        </div>
    );
};

const Creations: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth, navigateTo }) => {
    const [creations, setCreations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (auth.user) {
            getCreations(auth.user.uid).then(setCreations).finally(() => setLoading(false));
        }
    }, [auth.user]);

    const handleDelete = async (id: string, path: string) => {
        if (!auth.user) return;
        if (confirm('Are you sure you want to delete this creation? This cannot be undone.')) {
            await deleteCreation(auth.user.uid, { id, storagePath: path });
            setCreations(prev => prev.filter(c => c.id !== id));
        }
    };

    const groupCreationsByDate = (list: any[]) => {
        const groups: { [key: string]: any[] } = {};
        const today = new Date().toDateString();
        const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString();

        list.forEach(item => {
            const date = item.createdAt?.toDate ? item.createdAt.toDate().toDateString() : new Date().toDateString();
            let label = date;
            if (date === today) label = 'Today';
            else if (date === yesterday) label = 'Yesterday';
            
            if (!groups[label]) groups[label] = [];
            groups[label].push(item);
        });
        return groups;
    };

    const grouped = groupCreationsByDate(creations);
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
         if (a === 'Today') return -1;
         if (b === 'Today') return 1;
         if (a === 'Yesterday') return -1;
         if (b === 'Yesterday') return 1;
         return new Date(b).getTime() - new Date(a).getTime();
    });

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-full">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-[#1A1A1E]">My Creations</h1>
                <button onClick={() => navigateTo('dashboard', 'dashboard')} className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-lg font-bold text-sm hover:bg-[#dfbc2b]">
                    Go to Dashboard
                </button>
            </div>

            {loading ? (
                 <div className="text-center py-20 text-gray-400">Loading your masterpiece gallery...</div>
            ) : creations.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="w-8 h-8 text-gray-400"/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">No creations yet</h3>
                    <p className="text-gray-500 mb-6">Start creating amazing visuals with our AI tools.</p>
                    <button onClick={() => navigateTo('dashboard', 'studio')} className="bg-[#4D7CFF] text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors">
                        Start Creating
                    </button>
                </div>
            ) : (
                <div className="space-y-10">
                    {sortedKeys.map(date => (
                        <div key={date}>
                            <h3 className="text-lg font-bold text-gray-500 mb-4 uppercase tracking-wider text-xs">{date}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {grouped[date].map((creation: any) => (
                                    <div key={creation.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100 hover:shadow-lg transition-all">
                                        <img 
                                            src={creation.imageUrl} 
                                            className="w-full h-full object-cover"
                                            onClick={() => setSelectedImage(creation.imageUrl)}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                                            <span className="text-white text-xs font-bold mb-2">{creation.feature}</span>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => downloadImage(creation.imageUrl, `magicpixa-${creation.id}.png`)}
                                                    className="bg-white/20 hover:bg-white text-white hover:text-black p-2 rounded-lg backdrop-blur-md transition-all flex-1 flex justify-center"
                                                    title="Download"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(creation.id, creation.storagePath)}
                                                    className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-lg backdrop-blur-md transition-all flex-1 flex justify-center"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Mobile/Always Visible Actions overlay for better UX */}
                                        <div className="lg:hidden absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-3 pointer-events-none">
                                             <div className="flex gap-2 pointer-events-auto">
                                                <button onClick={() => downloadImage(creation.imageUrl, `magicpixa-${creation.id}.png`)} className="bg-white/90 p-1.5 rounded text-black shadow"><DownloadIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleDelete(creation.id, creation.storagePath)} className="bg-white/90 p-1.5 rounded text-red-500 shadow"><TrashIcon className="w-4 h-4"/></button>
                                             </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
        </div>
    );
};

const ProductStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [productName, setProductName] = useState('');
    const [productDesc, setProductDesc] = useState('');
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user || !productName) return;
        setLoading(true);
        try {
            const cost = appConfig?.featureCosts['Product Studio'] || 5;
            const res = await generateProductPackPlan(
                [image.base64.base64], 
                productName, 
                productDesc, 
                { colors: [], fonts: [] }, 
                '', 
                []
            );
            setResult(res);
            await deductCredits(auth.user.uid, cost, 'Product Studio');
            // Note: This feature returns text/strategy, we don't save an image to gallery yet.
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout 
            title="Product Studio"
            description="Generate a complete marketing pack: SEO titles, captions, and visual concepts."
            icon={<ProductStudioIcon className="w-6 h-6 text-green-500"/>}
            creditCost={appConfig?.featureCosts['Product Studio'] || 5}
            isGenerating={loading}
            canGenerate={!!image && !!productName}
            onGenerate={handleGenerate}
            resultImage={null}
            onNewSession={() => { setImage(null); setResult(null); setProductName(''); setProductDesc(''); }}
            leftContent={
                result ? (
                    <div className="w-full h-full bg-white p-6 rounded-3xl border border-gray-200 overflow-y-auto max-h-[600px]">
                        <h3 className="text-xl font-bold mb-4 text-green-600">Marketing Pack Generated</h3>
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs font-bold text-gray-400 uppercase">SEO Title</p>
                                <p className="font-bold text-lg">{result.textAssets.seoTitle}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Captions</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    {result.textAssets.captions.map((c: any, i: number) => (
                                        <li key={i} className="text-sm">{c.text}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.textAssets.keywords.map((k: string, i: number) => (
                                        <span key={i} className="bg-white px-2 py-1 rounded border text-xs font-mono">{k}</span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Visual Concepts</p>
                                <p className="text-sm italic text-gray-600">{result.imageGenerationPrompts.heroShot}</p>
                            </div>
                        </div>
                    </div>
                ) : image ? (
                    <div className="relative h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-3xl overflow-hidden">
                        <img src={image.url} className="max-w-full max-h-full object-contain" />
                        <button onClick={() => fileInputRef.current?.click()} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow"><UploadIcon className="w-5 h-5"/></button>
                    </div>
                ) : (
                    <UploadPlaceholder label="Upload Product" onClick={() => fileInputRef.current?.click()} />
                )
            }
            rightContent={
                <div>
                    <InputField label="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} placeholder="e.g. Luxe Face Cream" />
                    <TextAreaField label="Description / Key Benefits" value={productDesc} onChange={(e: any) => setProductDesc(e.target.value)} placeholder="Describe ingredients, target audience, etc." />
                    <div className="hidden"><input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} /></div>
                </div>
            }
        />
    );
};

// Simplified Implementations for other features using FeatureLayout to prevent blank screens
const StandardFeature: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    cost: number; 
    onGenerate: (img: Base64File, prompt?: string) => Promise<string>;
    auth: AuthProps;
    promptLabel?: string;
    placeholderLabel?: string;
}> = ({ title, description, icon, cost, onGenerate, auth, promptLabel = "Description", placeholderLabel = "Upload Photo" }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleRun = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await onGenerate(image.base64, prompt);
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, title);
            const updated = await deductCredits(auth.user.uid, cost, title);
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FeatureLayout 
                title={title}
                description={description}
                icon={icon}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={!!image}
                onGenerate={handleRun}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={() => { setImage(null); setResult(null); setPrompt(''); }}
                leftContent={
                    image ? (
                        <div className="relative h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-3xl overflow-hidden">
                            <img src={image.url} className="max-w-full max-h-full object-contain" />
                            <button onClick={() => fileInputRef.current?.click()} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow"><UploadIcon className="w-5 h-5"/></button>
                        </div>
                    ) : (
                        <UploadPlaceholder label={placeholderLabel} onClick={() => fileInputRef.current?.click()} />
                    )
                }
                rightContent={
                    image ? (
                        <div>
                            <InputField label={promptLabel} value={prompt} onChange={(e: any) => setPrompt(e.target.value)} placeholder="Describe the desired outcome..." />
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 p-10">Upload an image to start.</div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </>
    );
};

// Specific wrapper for CaptionAI as it returns text
const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [captions, setCaptions] = useState<{ caption: string; hashtags: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setCaptions([]);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const cost = appConfig?.featureCosts['CaptionAI'] || 1;
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(res);
            await deductCredits(auth.user.uid, cost, 'CaptionAI');
             // Note: We don't save text creations to image gallery currently
        } catch (e) {
            console.error(e);
            alert('Failed to generate captions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FeatureLayout 
                title="CaptionAI"
                description="Generate engaging social media captions and hashtags instantly."
                icon={<CaptionIcon className="w-6 h-6 text-amber-500"/>}
                creditCost={appConfig?.featureCosts['CaptionAI'] || 1}
                isGenerating={loading}
                canGenerate={!!image}
                onGenerate={handleGenerate}
                resultImage={null} // Custom result view
                onNewSession={() => { setImage(null); setCaptions([]); }}
                leftContent={
                    image ? (
                        <div className="relative h-[500px] w-full flex items-center justify-center bg-gray-100 rounded-3xl overflow-hidden">
                            <img src={image.url} className="max-w-full max-h-full object-contain" />
                        </div>
                    ) : (
                        <UploadPlaceholder label="Upload Photo for Captions" onClick={() => fileInputRef.current?.click()} />
                    )
                }
                rightContent={
                    captions.length > 0 ? (
                        <div className="space-y-4 h-[500px] overflow-y-auto pr-2">
                            {captions.map((c, i) => (
                                <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-sm text-gray-800 mb-2">{c.caption}</p>
                                    <p className="text-xs text-blue-500 font-medium mb-3">{c.hashtags}</p>
                                    <button onClick={() => navigator.clipboard.writeText(`${c.caption}\n\n${c.hashtags}`)} className="flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-gray-600">
                                        <CopyIcon className="w-3 h-3" /> Copy
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 p-10">Upload a photo to generate captions.</div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </>
    );
};


const DashboardPage: React.FC<DashboardPageProps> = ({ 
    navigateTo, 
    auth, 
    activeView, 
    setActiveView, 
    openEditProfileModal, 
    isConversationOpen, 
    setIsConversationOpen, 
    appConfig, 
    setAppConfig 
}) => {
    
    const [activeMission, setActiveMission] = useState<Mission | undefined>(undefined);

    const handleStartMission = (mission: Mission) => {
        setActiveMission(mission);
        setActiveView(mission.toolId);
    };

    const renderContent = () => {
        switch (activeView) {
            case 'home_dashboard':
            case 'dashboard':
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} onStartMission={handleStartMission} />;
            case 'creations':
                return <Creations auth={auth} navigateTo={navigateTo} />;
            case 'studio':
                 return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} activeMission={activeMission} onMissionComplete={() => {/* Handled inside component for now */}} />;
            case 'product_studio':
                 return <ProductStudio auth={auth} appConfig={appConfig} />;
            case 'thumbnail_studio':
                 // Placeholder using standard layout if specialized component not available in this context snippet
                 return <StandardFeature title="Thumbnail Studio" description="Create viral thumbnails." icon={<ThumbnailIcon className="w-6 h-6 text-red-500"/>} cost={appConfig?.featureCosts['Thumbnail Studio'] || 2} auth={auth} onGenerate={async (img, p) => await generateThumbnail({ category: 'General', title: p || 'Video', referenceImage: img.base64, subjectA: img.base64 })} />;
            case 'brand_stylist':
                 return <StandardFeature title="Brand Stylist" description="Style transfer for brands." icon={<LightbulbIcon className="w-6 h-6 text-yellow-500"/>} cost={appConfig?.featureCosts['Brand Stylist AI'] || 4} auth={auth} onGenerate={async (img, p) => await generateBrandStylistImage(img.base64, p || '')} />;
            case 'soul':
                 return <StandardFeature title="Magic Soul" description="Merge two subjects." icon={<UsersIcon className="w-6 h-6 text-pink-500"/>} cost={appConfig?.featureCosts['Magic Soul'] || 3} auth={auth} onGenerate={async (img, p) => await generateMagicSoul(img.base64, img.mimeType, img.base64, img.mimeType, p || 'Fantasy', 'Studio')} />;
            case 'colour':
                 return <StandardFeature title="Photo Colour" description="Colourize B&W photos." icon={<PaletteIcon className="w-6 h-6 text-rose-500"/>} cost={appConfig?.featureCosts['Magic Photo Colour'] || 2} auth={auth} onGenerate={async (img) => await colourizeImage(img.base64, img.mimeType, 'restore')} />;
            case 'interior':
                 return <StandardFeature title="Magic Interior" description="Redesign your space." icon={<HomeIcon className="w-6 h-6 text-orange-500"/>} cost={appConfig?.featureCosts['Magic Interior'] || 2} auth={auth} onGenerate={async (img, p) => await generateInteriorDesign(img.base64, img.mimeType, p || 'Modern', 'home', 'Living Room')} />;
            case 'apparel':
                 return <StandardFeature title="Magic Apparel" description="Virtual Try-On." icon={<UsersIcon className="w-6 h-6 text-teal-500"/>} cost={appConfig?.featureCosts['Magic Apparel'] || 3} auth={auth} onGenerate={async (img) => await generateApparelTryOn(img.base64, img.mimeType, [])} />;
            case 'mockup':
                 return <StandardFeature title="Magic Mockup" description="Product Mockups." icon={<MockupIcon className="w-6 h-6 text-indigo-500"/>} cost={appConfig?.featureCosts['Magic Mockup'] || 2} auth={auth} onGenerate={async (img, p) => await generateMockup(img.base64, img.mimeType, p || 'T-Shirt')} />;
            case 'caption':
                 return <CaptionAI auth={auth} appConfig={appConfig} />;
            case 'billing':
                if (auth.user) {
                    return <Billing user={auth.user} setUser={auth.setUser} appConfig={appConfig} />;
                }
                return null;
            case 'admin':
                return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
            default:
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} onStartMission={handleStartMission} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
             <Header 
                navigateTo={navigateTo} 
                auth={{
                    ...auth, 
                    isDashboard: true, 
                    setActiveView, 
                    openConversation: () => setIsConversationOpen(true)
                }} 
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    user={auth.user} 
                    activeView={activeView} 
                    setActiveView={setActiveView} 
                    navigateTo={navigateTo}
                    appConfig={appConfig}
                />
                <main className="flex-1 overflow-y-auto bg-[#F6F7FA] relative">
                    {renderContent()}
                </main>
            </div>
            {isConversationOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[600px] flex flex-col relative overflow-hidden">
                         <button onClick={() => setIsConversationOpen(false)} className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                         <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                             <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                             </div>
                             <h2 className="text-2xl font-bold mb-2">Magic Conversation</h2>
                             <p className="text-gray-500">Voice mode is active. Speak to interact with the AI assistant.</p>
                         </div>
                    </div>
                </div>
            )}
            <div className="hidden">
                <input ref={useRef(null)} type="file" />
            </div>
        </div>
    );
};

export default DashboardPage;
