
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
    deductCredits 
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
    SunIcon
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
                                                Generate
                                            </>
                                        )}
                                    </button>
                                    <div className="text-center mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                                            <span className="w-1.5 h-1.5 bg-[#6EFACC] rounded-full animate-pulse"></span>
                                            Cost: {creditCost} Credits
                                        </div>
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

// --- Enhanced Upload Placeholder Component ---
const UploadPlaceholder: React.FC<{ label: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, onClick, icon }) => (
    <div 
        onClick={onClick}
        className="w-full h-full border-2 border-dashed border-gray-300 hover:border-[#4D7CFF] bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-md aspect-video max-h-[450px]"
    >
        <div className="relative z-10 p-6 bg-gray-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
            {icon || <UploadIcon className="w-12 h-12 text-gray-400 group-hover:text-[#4D7CFF] transition-colors duration-300" />}
        </div>
        
        <div className="relative z-10 mt-6 text-center space-y-2 px-6">
            <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">{label}</p>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest group-hover:text-[#4D7CFF] transition-colors delay-75 bg-gray-50 px-3 py-1 rounded-full">Click to Browse</p>
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

const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);

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
            setStudioMode(null);
            setCategory(''); setBrandStyle(''); setVisualType('');
            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
            setModelComposition(''); setModelFraming('');
            setSuggestedPrompts([]);
            setSuggestedModelPrompts([]);
            setSelectedPrompt(null);
            
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
            saveCreation(auth.user.uid, url, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            const updated = await deductCredits(auth.user.uid, cost, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            auth.setUser(prev => prev ? { ...prev, credits: updated.credits } : null);
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
    };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && (
        studioMode === 'product' 
            ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType))
            : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming))
    );

    const currentCost = studioMode === 'model' 
        ? (appConfig?.featureCosts['Model Shot'] || 3) 
        : (appConfig?.featureCosts['Magic Photo Studio'] || 2);

    return (
        <FeatureLayout 
            title="Magic Photo Studio"
            description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
            icon={<PhotoStudioIcon className="w-6 h-6 text-blue-500"/>}
            creditCost={currentCost}
            isGenerating={loading}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            onNewSession={handleNewSession}
            resultHeightClass="h-[560px]"
            generateButtonStyle={{
                className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                hideIcon: true
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
                    <div className="w-full flex justify-center">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-[560px] w-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl mx-auto"
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <UploadIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Product Photo</p>
                                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                                    <div className="bg-gray-50 rounded-full px-3 py-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                                            Click to Browse
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                         <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>
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
                    <div className="space-y-4 animate-fadeIn p-1">
                        
                        {/* STEP 1: Mode Selection (Product vs Model) */}
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <button 
                                    onClick={() => handleModeSelect('product')}
                                    className="group relative p-6 bg-white border-2 border-gray-100 hover:border-blue-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <CubeIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-lg font-bold text-gray-800">Product Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Studio lighting, podiums, and nature settings.</p>
                                </button>

                                <button 
                                    onClick={() => handleModeSelect('model')}
                                    className="group relative p-6 bg-white border-2 border-gray-100 hover:border-purple-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <UsersIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-lg font-bold text-gray-800">Model Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Realistic human models holding or wearing your product.</p>
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Configuration (Visible if Mode Selected) */}
                        {studioMode && (
                            <div className="animate-fadeIn relative">
                                {/* Back Button - FIXED LAYOUT */}
                                <div className="flex items-center mb-4 -ml-2"> 
                                    <button 
                                        onClick={() => {
                                            setStudioMode(null);
                                            setSelectedPrompt(null);
                                            setCategory(''); setBrandStyle(''); setVisualType('');
                                            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                                            setModelComposition(''); setModelFraming('');
                                        }} 
                                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
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
                                                        <button onClick={() => setSelectedPrompt(null)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">
                                                            Clear Selection
                                                        </button>
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
                                                                    <span className={`text-xs font-medium italic text-left ${selectedPrompt === promptValue ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'}`}>
                                                                        "{displayText}"
                                                                    </span>
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
                                                        {category && (
                                                             <button onClick={() => { setCategory(''); setBrandStyle(''); setVisualType(''); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">
                                                                 Clear
                                                             </button>
                                                        )}
                                                     </div>
                                                     <div className="flex flex-wrap gap-2">
                                                        {categories.map(opt => (
                                                            <button 
                                                                key={opt}
                                                                onClick={() => handleCategorySelect(opt)}
                                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform ${
                                                                    category === opt 
                                                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' 
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm active:scale-95'
                                                                }`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                     </div>
                                                </div>
                                                {category && (
                                                    <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={handleBrandStyleSelect} />
                                                )}
                                                {category && brandStyle && (
                                                    <SelectionGrid label="3. Visual Type" options={visualTypes} value={visualType} onChange={setVisualType} />
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {/* Composition & Shot Types only appear AFTER AI suggestions are ready (which is handled by parent check) */}
                                                <SelectionGrid 
                                                    label="1. Composition" 
                                                    options={compositionTypes} 
                                                    value={modelComposition} 
                                                    onChange={setModelComposition} 
                                                />

                                                {modelComposition && (
                                                    <SelectionGrid 
                                                        label="2. Model Type" 
                                                        options={modelTypes} 
                                                        value={modelType} 
                                                        onChange={(val) => {
                                                            setModelType(val);
                                                            setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming('');
                                                        }} 
                                                    />
                                                )}
                                                
                                                {modelType && (
                                                    <SelectionGrid 
                                                        label="3. Region" 
                                                        options={modelRegions} 
                                                        value={modelRegion} 
                                                        onChange={(val) => {
                                                            setModelRegion(val);
                                                            setSkinTone(''); setBodyType('');
                                                        }} 
                                                    />
                                                )}
                                                
                                                {modelRegion && (
                                                    <SelectionGrid 
                                                        label="4. Skin Tone" 
                                                        options={skinTones} 
                                                        value={skinTone} 
                                                        onChange={(val) => {
                                                            setSkinTone(val);
                                                            setBodyType('');
                                                        }} 
                                                    />
                                                )}

                                                {skinTone && (
                                                    <SelectionGrid 
                                                        label="5. Body Type" 
                                                        options={bodyTypes} 
                                                        value={bodyType} 
                                                        onChange={(val) => {
                                                            setBodyType(val);
                                                            setModelFraming('');
                                                        }}
                                                    />
                                                )}

                                                {bodyType && (
                                                    <SelectionGrid 
                                                        label="6. Shot Type" 
                                                        options={shotTypes} 
                                                        value={modelFraming} 
                                                        onChange={setModelFraming} 
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }
        />
    );
};

// --- Luminous Studio Dashboard Home Components ---

const InspirationTicker = () => (
    <div className="w-full bg-white/50 backdrop-blur-sm border-b border-gray-100 py-2 overflow-hidden flex items-center">
        <div className="flex animate-marquee whitespace-nowrap gap-12 text-xs font-medium text-gray-400">
            <span>✨ Try: "Neon Cyberpunk Sneakers"</span>
            <span>🌿 Try: "Minimalist Skincare on Marble"</span>
            <span>👗 Try: "Summer Dress Beach Lifestyle"</span>
            <span>🎨 Try: "Vintage Film Portrait"</span>
            <span>🏠 Try: "Scandinavian Living Room Redesign"</span>
            <span>✨ Try: "Neon Cyberpunk Sneakers"</span>
            <span>🌿 Try: "Minimalist Skincare on Marble"</span>
            <span>👗 Try: "Summer Dress Beach Lifestyle"</span>
            <span>🎨 Try: "Vintage Film Portrait"</span>
            <span>🏠 Try: "Scandinavian Living Room Redesign"</span>
        </div>
    </div>
);

const OmniBar = () => (
    <div className="relative w-full max-w-2xl mx-auto group z-20">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        <div className="relative bg-white rounded-full shadow-xl flex items-center px-6 py-4 cursor-text transition-transform duration-300 hover:scale-[1.01]">
            <SparklesIcon className="w-6 h-6 text-[#4D7CFF] mr-4 animate-pulse" />
            <span className="text-gray-400 text-lg font-medium select-none">What do you want to create today?</span>
            <div className="ml-auto flex items-center gap-2">
                <kbd className="hidden sm:inline-block px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded font-mono">⌘ K</kbd>
            </div>
        </div>
    </div>
);

const SunDial: React.FC<{ credits: number }> = ({ credits }) => (
    <div className="relative group cursor-pointer">
        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
        <div className="relative bg-white p-2 rounded-full shadow-lg border border-yellow-100 flex items-center gap-2 pr-4 transition-all duration-300 group-hover:scale-105">
            <SunIcon className={`w-8 h-8 text-yellow-400 ${credits > 0 ? 'animate-[spin_10s_linear_infinite]' : ''}`} />
            <div className="flex flex-col items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Energy</span>
                <span className="text-lg font-bold text-[#1A1A1E] leading-none">{credits}</span>
            </div>
        </div>
    </div>
);

const BentoGrid: React.FC<{ navigateTo: any }> = ({ navigateTo }) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full max-w-6xl mx-auto px-4">
        {/* Hero Card - Product Studio */}
        <div onClick={() => navigateTo('dashboard', 'product_studio')} className="md:col-span-2 md:row-span-2 bg-white rounded-[2rem] shadow-lg border border-gray-100 p-8 relative overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-100/50 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-200/50"></div>
            <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                    <div className="p-3 bg-green-100 w-fit rounded-2xl mb-4 text-green-600"><ProductStudioIcon className="w-8 h-8"/></div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Product Studio</h3>
                    <p className="text-gray-500 max-w-xs">Generate a complete marketing pack from a single photo.</p>
                </div>
                <div className="mt-8 flex gap-4">
                     <div className="h-32 w-32 bg-gray-100 rounded-xl rotate-[-6deg] shadow-sm border border-gray-200 group-hover:rotate-[-12deg] transition-transform duration-500"></div>
                     <div className="h-32 w-32 bg-gray-200 rounded-xl rotate-[3deg] shadow-md border border-gray-300 z-10 group-hover:rotate-[6deg] transition-transform duration-500 group-hover:scale-110"></div>
                </div>
            </div>
        </div>

        {/* Tall Card - Magic Model */}
        <div onClick={() => navigateTo('dashboard', 'studio')} className="md:col-span-1 md:row-span-2 bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 relative overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-purple-50 to-transparent"></div>
            <div className="relative z-10 h-full flex flex-col items-center text-center">
                <div className="p-3 bg-purple-100 w-fit rounded-2xl mb-4 text-purple-600"><UsersIcon className="w-6 h-6"/></div>
                <h3 className="text-xl font-bold text-gray-800 mb-1">Magic Model</h3>
                <p className="text-xs text-gray-500 mb-6">Turn products into lifestyle shots.</p>
                <div className="flex-1 w-full bg-gray-100 rounded-xl relative overflow-hidden group-hover:shadow-inner">
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-xs">Model Preview</div>
                </div>
            </div>
        </div>

        {/* Widget - Quick Caption */}
        <div onClick={() => navigateTo('dashboard', 'caption')} className="md:col-span-1 bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-100 w-fit rounded-2xl text-amber-600"><CaptionIcon className="w-6 h-6"/></div>
                <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">FAST</span>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800">Caption AI</h3>
                <p className="text-xs text-gray-500">Instant social text.</p>
            </div>
        </div>

        {/* Small Tool - Thumbnail */}
        <div onClick={() => navigateTo('dashboard', 'thumbnail_studio')} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
             <div className="p-3 bg-red-100 w-fit rounded-2xl mb-3 text-red-600"><ThumbnailIcon className="w-6 h-6"/></div>
             <h3 className="text-lg font-bold text-gray-800">Thumbnails</h3>
        </div>

         {/* Small Tool - Brand Stylist */}
         <div onClick={() => navigateTo('dashboard', 'brand_stylist')} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
             <div className="p-3 bg-yellow-100 w-fit rounded-2xl mb-3 text-yellow-600"><LightbulbIcon className="w-6 h-6"/></div>
             <h3 className="text-lg font-bold text-gray-800">Brand Stylist</h3>
        </div>
        
         {/* Small Tool - Interior */}
         <div onClick={() => navigateTo('dashboard', 'interior')} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 p-6 cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
             <div className="p-3 bg-orange-100 w-fit rounded-2xl mb-3 text-orange-600"><HomeIcon className="w-6 h-6"/></div>
             <h3 className="text-lg font-bold text-gray-800">Interior AI</h3>
        </div>
    </div>
);

const FilmStrip: React.FC<{ user: User | null, navigateTo: any }> = ({ user, navigateTo }) => {
    const [recent, setRecent] = useState<Creation[]>([]);
    
    useEffect(() => {
        if (user) getCreations(user.uid).then(data => setRecent(data.slice(0, 5)));
    }, [user]);

    if (recent.length === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 hidden md:flex">
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 p-2 rounded-[2rem] shadow-2xl flex items-center gap-4 px-6">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">Recent</span>
                {recent.map(item => (
                    <div key={item.id} className="w-12 h-12 rounded-xl overflow-hidden border border-white/50 shadow-sm cursor-pointer hover:scale-150 transition-transform duration-300 origin-bottom relative group">
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </div>
                ))}
                <button onClick={() => navigateTo('dashboard', 'creations')} className="ml-2 w-10 h-10 rounded-full bg-white/50 flex items-center justify-center hover:bg-white transition-colors">
                    <ArrowRightIcon className="w-4 h-4 text-gray-600"/>
                </button>
            </div>
        </div>
    );
};

const DashboardHome: React.FC<{ user: User | null, navigateTo: any, setActiveView: any }> = ({ user, navigateTo, setActiveView }) => {
    return (
        <div className="min-h-full pb-32 relative overflow-hidden">
            {/* Background Blobs for Luminous Theme */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-yellow-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10">
                <InspirationTicker />
                
                <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-12">
                    {/* Hero Area */}
                    <div className="flex flex-col items-center gap-8 pt-8">
                        <div className="w-full flex justify-end px-4">
                            {user && <SunDial credits={user.credits} />}
                        </div>
                        
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1E]">
                                Good {new Date().getHours() < 12 ? 'Morning' : 'Evening'}, {user?.name?.split(' ')[0]}.
                            </h1>
                            <p className="text-gray-500 text-lg">Your studio is ready.</p>
                        </div>

                        <OmniBar />
                    </div>

                    {/* Main Navigation */}
                    <BentoGrid navigateTo={navigateTo} />
                </div>

                <FilmStrip user={user} navigateTo={navigateTo} />
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
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
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
    
    const renderContent = () => {
        switch (activeView) {
            case 'home_dashboard':
            case 'dashboard':
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} />;
            case 'creations':
                return <Creations auth={auth} navigateTo={navigateTo} />;
            case 'studio':
                 return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
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
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} />;
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
