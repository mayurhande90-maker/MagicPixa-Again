
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
    ArrowLeftIcon
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
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<string[]>([]);
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
                 // Fallback
                 setSuggestedModelPrompts([
                    "Young female model holding the product near her face",
                    "Male model holding the product in a studio setting",
                    "Lifestyle shot of the product on a table next to a person",
                    "Close up of hands interacting with the product"
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

    const canGenerate = !!image && !isAnalyzing && !!isAnalyzingModel && !!studioMode && (
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
                                                    {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((prompt, idx) => {
                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => handlePromptSelect(prompt)}
                                                                style={!selectedPrompt ? { animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' } : {}}
                                                                className={`group relative w-auto inline-flex rounded-full p-[2px] transition-all duration-300 transform active:scale-95 ${!selectedPrompt && 'animate-[fadeInUp_0.5s_ease-out]'} ${
                                                                    selectedPrompt === prompt ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
                                                                }`}
                                                            >
                                                                <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 ${selectedPrompt === prompt ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-300`}></div>
                                                                
                                                                <div className={`relative h-full w-full rounded-full flex items-center justify-center px-4 py-2 transition-colors duration-300 ${selectedPrompt === prompt ? 'bg-transparent' : 'bg-white'}`}>
                                                                    <span className={`text-xs font-medium italic text-left ${selectedPrompt === prompt ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'}`}>
                                                                        "{prompt}"
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

// --- Conversation Overlay Component ---
const ConversationOverlay: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const sessionRef = useRef<any>(null);

    const startSession = async () => {
        setStatus('connecting');
        setError(null);
        try {
            sessionRef.current = await startLiveSession({
                onopen: () => setStatus('connected'),
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle messages (simplified for overlay)
                },
                onerror: (e) => {
                   console.error(e);
                   setError("Connection error.");
                   setStatus('disconnected');
                },
                onclose: () => setStatus('disconnected'),
            });
        } catch (err) {
            setError("Failed to start session.");
            setStatus('disconnected');
        }
    };

    useEffect(() => {
        if (isOpen) startSession();
        return () => {
             // Cleanup session
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
                <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><XIcon className="w-5 h-5"/></button>
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${status === 'connected' ? 'bg-blue-100 animate-pulse shadow-[0_0_40px_rgba(59,130,246,0.3)]' : 'bg-gray-100'}`}>
                        <AudioWaveIcon className={`w-12 h-12 ${status === 'connected' ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{status === 'connected' ? 'Listening...' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}</h2>
                    <p className="text-gray-500 text-center">Speak naturally to Pixa for help or guidance.</p>
                </div>
            </div>
        </div>
    )
}


// --- Creations Grid ---
const CreationsGrid: React.FC<{ user: User | null }> = ({ user }) => {
    const [creations, setCreations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setCreations(data);
                setIsLoading(false);
            });
        }
    }, [user]);

    if (isLoading) return <div className="p-8 text-center">Loading creations...</div>;
    if (creations.length === 0) return <div className="p-8 text-center text-gray-500">No creations yet. Start creating!</div>;

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">My Creations</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {creations.map(c => (
                    <div key={c.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 group relative">
                        <img src={c.imageUrl} alt={c.feature} className="w-full aspect-square object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                             <button onClick={() => downloadImage(c.imageUrl, `creation-${c.id}.png`)} className="p-2 bg-white rounded-full hover:bg-gray-100"><DownloadIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-3">
                            <p className="text-xs font-bold text-gray-500 uppercase">{c.feature}</p>
                            <p className="text-xs text-gray-400">{c.createdAt?.toDate().toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Dashboard Home ---
const DashboardHome: React.FC<{ user: User | null; setActiveView: (view: View) => void }> = ({ user, setActiveView }) => (
    <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#1A1A1E]">Welcome back, {user?.name.split(' ')[0]}!</h1>
            <p className="text-[#5F6368]">What would you like to create today?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div onClick={() => setActiveView('studio')} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                 <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <PhotoStudioIcon className="w-6 h-6 text-blue-600" />
                 </div>
                 <h3 className="font-bold text-lg mb-2">Magic Studio</h3>
                 <p className="text-sm text-gray-500">Create professional product shots and model images.</p>
             </div>
             <div onClick={() => setActiveView('thumbnail_studio')} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                 <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <ThumbnailIcon className="w-6 h-6 text-red-600" />
                 </div>
                 <h3 className="font-bold text-lg mb-2">Thumbnail Studio</h3>
                 <p className="text-sm text-gray-500">Generate click-worthy YouTube thumbnails.</p>
             </div>
             <div onClick={() => setActiveView('interior')} className="bg-white p-6 rounded-2xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer group">
                 <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <HomeIcon className="w-6 h-6 text-orange-600" />
                 </div>
                 <h3 className="font-bold text-lg mb-2">Magic Interior</h3>
                 <p className="text-sm text-gray-500">Redesign rooms in any style instantly.</p>
             </div>
        </div>
    </div>
);

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
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const renderContent = () => {
         switch(activeView) {
             case 'dashboard': return <DashboardHome user={auth.user} setActiveView={setActiveView} />;
             case 'studio': return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
             case 'billing': return <Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} />;
             case 'creations': return <CreationsGrid user={auth.user} />;
             case 'admin': return auth.user?.isAdmin ? <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={(cfg) => setAppConfig(cfg)} /> : <DashboardHome user={auth.user} setActiveView={setActiveView} />;
             case 'thumbnail_studio': return <div className="p-10 text-center">Thumbnail Studio (Coming Soon)</div>; // Placeholder
             case 'interior': return <div className="p-10 text-center">Magic Interior (Coming Soon)</div>; // Placeholder
             default: return <div className="p-10 text-center text-gray-500">Feature Coming Soon</div>;
         }
    }
    
    return (
        <div className="min-h-screen bg-[#F9FAFB]">
            <Header navigateTo={navigateTo} auth={{ ...auth, isDashboard: true, setActiveView, openConversation: () => setIsConversationOpen(true) }} />
            <div className="flex pt-0">
                 <Sidebar user={auth.user} activeView={activeView} setActiveView={setActiveView} navigateTo={navigateTo} appConfig={appConfig} />
                 <main className="flex-1 min-h-[calc(100vh-73px)]">
                    {renderContent()}
                 </main>
            </div>
            <ConversationOverlay isOpen={isConversationOpen} onClose={() => setIsConversationOpen(false)} />
        </div>
    )
}

export default DashboardPage;
