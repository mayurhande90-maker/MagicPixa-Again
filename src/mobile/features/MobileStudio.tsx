
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CubeIcon, UsersIcon, CameraIcon, ImageIcon, 
    ArrowRightIcon, ArrowLeftIcon, InformationCircleIcon,
    MagicWandIcon, DownloadIcon, RegenerateIcon, PlusIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { editImageWithPrompt, analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

const PRODUCT_STEPS = [
    { id: 'category', label: 'Category', options: ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Medical Product', 'Jewellery', 'Footwear', 'Toys', 'Automotive', 'Other / Custom'] },
    { id: 'style', label: 'Style', options: ['Clean', 'Bold', 'Luxury', 'Playful', 'Natural', 'High-tech', 'Minimal'] },
    { id: 'theme', label: 'Theme', options: ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'] }
];

const MODEL_STEPS = [
    { id: 'persona', label: 'Persona', options: ['Adult Female', 'Adult Male', 'Young Female', 'Young Male', 'Senior', 'Kid Model'] },
    { id: 'region', label: 'Region', options: ['Indian', 'South Asian', 'East Asian', 'African', 'European', 'American'] },
    { id: 'skin', label: 'Skin', options: ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'] },
    { id: 'body', label: 'Body', options: ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'] },
    { id: 'composition', label: 'Layout', options: ['Single Model', 'Group Shot'] },
    { id: 'framing', label: 'Shot', options: ['Tight Close', 'Close-Up', 'Mid Shot', 'Wide Shot'] }
];

// Custom Refine Icon provided by user
const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // --- UI State ---
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing...");

    // Tray Navigation
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [customCategory, setCustomCategory] = useState('');
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;
    const refineCost = 5;

    const activeSteps = studioMode === 'model' ? MODEL_STEPS : PRODUCT_STEPS;
    
    // Updated validity check based on number of active steps
    const isStrategyComplete = useMemo(() => {
        if (!studioMode) return false;
        const requiredCount = activeSteps.length;
        const currentCount = Object.keys(selections).length;
        
        // Special check for Custom Category
        if (studioMode === 'product' && selections['category'] === 'Other / Custom' && !customCategory.trim()) {
            return false;
        }

        return currentCount >= requiredCount;
    }, [selections, studioMode, activeSteps, customCategory]);

    // --- Dynamic Loading Messages ---
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            const steps = [
                "Pixa Vision: Extracting material properties...",
                "Production Engine: Calibrating lighting rig...",
                "Ray-Tracing: Calculating contact shadows...",
                "Elite Retoucher: Harmonizing reflections...",
                "Finalizing: Polishing 8K output..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // --- Handlers ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            setStudioMode(null);
            setSelections({});
            setCustomCategory('');
            setCurrentStep(0);
            
            setIsAnalyzing(true);
            setTimeout(() => setIsAnalyzing(false), 2000);
        }
    };

    const handleModeSelect = (mode: 'product' | 'model') => {
        setStudioMode(mode);
        setSelections({});
        setCustomCategory('');
        setCurrentStep(0);
    };

    const handleSelectOption = (stepId: string, option: string) => {
        setSelections(prev => ({ ...prev, [stepId]: option }));
        
        // If not the last step, move forward
        if (currentStep < activeSteps.length - 1) {
            // Delay slightly for visual feedback on button tap
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 150);
        }
    };

    const handleGenerate = async () => {
        if (!image || !isStrategyComplete || !auth.user || isGenerating) return;
        
        setIsGenerating(true);
        try {
            const finalCategory = selections['category'] === 'Other / Custom' ? customCategory : selections['category'];
            const promptParts = Object.entries(selections).map(([key, val]) => {
                if (key === 'category') return finalCategory;
                return val;
            });
            const promptStr = promptParts.join(', ');

            let resB64;
            if (studioMode === 'product') {
                resB64 = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, promptStr, auth.activeBrandKit);
            } else {
                resB64 = await generateModelShot(image.base64.base64, image.base64.mimeType, { 
                    modelType: selections['persona'], 
                    region: selections['region'], 
                    skinTone: selections['skin'],
                    bodyType: selections['body'],
                    composition: selections['composition'],
                    framing: selections['framing']
                }, auth.activeBrandKit);
            }

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Studio (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');
            setLastCreationId(creationId);

        } catch (e: any) {
            alert("Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Studio Rendering");
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
            }

            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setImage(null);
        setResult(null);
        setStudioMode(null);
        setSelections({});
        setCustomCategory('');
        setCurrentStep(0);
        setLastCreationId(null);
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            
            {/* 1. TOP COMMAND BAR (Fixed) */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50">
                <button 
                    onClick={() => { setImage(null); setResult(null); setStudioMode(null); }} 
                    className={`p-2 rounded-full transition-all ${image && !result ? 'bg-gray-100 text-gray-500' : 'opacity-0 pointer-events-none'}`}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    {result && (
                        <button 
                            onClick={() => downloadImage(result, 'magicpixa-studio.png')}
                            className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                    )}
                    
                    {!result && (
                        <button 
                            onClick={handleGenerate}
                            disabled={!isStrategyComplete || isGenerating}
                            className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg ${
                                !isStrategyComplete || isGenerating
                                ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/20 scale-105 animate-pulse-slight'
                            }`}
                        >
                            {isGenerating ? 'Rendering...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. FIXED CANVAS (60% Viewport) */}
            <div className="relative h-[60%] w-full flex items-center justify-center p-6 select-none">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center ${image ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}`}>
                    
                    {/* Content */}
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                        {result ? (
                            <img src={result} className={`max-w-full max-h-full object-contain animate-fadeIn transition-all ${isGenerating ? 'blur-md grayscale brightness-75' : ''}`} />
                        ) : image ? (
                            <img src={image.url} className={`max-w-[85%] max-h-[85%] object-contain animate-fadeIn transition-all ${isAnalyzing || !studioMode || isGenerating ? 'blur-sm scale-95 opacity-50' : ''}`} />
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="text-center group active:scale-95 transition-all">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                    <ImageIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Drop Asset</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                            </div>
                        )}

                        {/* GENERATION / ANALYSIS OVERLAY (Centered Frosted Capsule) */}
                        {(isAnalyzing || isGenerating) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-md px-6 py-8 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-6">
                                    {/* Subtle Progress Bar */}
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative border border-white/5">
                                        <div className="h-full bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-bar-slide w-[40%] absolute top-0 rounded-full"></div>
                                    </div>
                                    
                                    {/* Status Text - Stacked */}
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
                                            {isAnalyzing ? 'Pixa Vision Scanning' : 'Reworking Identity'}
                                        </span>
                                        {isGenerating && (
                                            <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest animate-pulse">
                                                {loadingText}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODE PICKER */}
                        {image && !studioMode && !isAnalyzing && !isGenerating && !result && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-6 bg-white/40 backdrop-blur-sm animate-fadeIn">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Choose Your Path</h3>
                                <div className="flex gap-4 w-full max-w-sm">
                                    <button 
                                        onClick={() => handleModeSelect('product')}
                                        className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><CubeIcon className="w-6 h-6"/></div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider text-center">Product Shot</span>
                                    </button>
                                    <button 
                                        onClick={() => handleModeSelect('model')}
                                        className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all"
                                    >
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><UsersIcon className="w-6 h-6"/></div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider text-center">Model Shot</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. INTERACTIVE SECTION (Bottom 40%) */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {result ? (
                    /* POST-GENERATION ACTION DECK */
                    <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeIn">
                        <div className="w-full flex flex-col gap-4">
                            <button 
                                onClick={() => setIsRefineOpen(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                            >
                                <CustomRefineIcon className="w-5 h-5 text-white" />
                                Refine Image
                            </button>
                            
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button 
                                    onClick={handleNewProject}
                                    className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    New Project
                                </button>
                                <button 
                                    onClick={handleGenerate}
                                    className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 active:bg-indigo-50 transition-all shadow-sm"
                                >
                                    <RegenerateIcon className="w-4 h-4" />
                                    Regenerate
                                </button>
                            </div>
                        </div>
                        <p className="mt-8 text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Elite Production Environment Active</p>
                    </div>
                ) : (
                    /* DUAL TIER CONTROL TRAY */
                    <div className={`flex-1 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${studioMode ? 'translate-y-0' : 'translate-y-full'}`}>
                        {/* TIER 2: OPTION SCROLLER */}
                        <div className="flex-1 min-h-0 overflow-hidden relative">
                            {activeSteps.map((step, idx) => (
                                <div 
                                    key={step.id}
                                    className={`absolute inset-0 px-6 flex flex-col justify-center transition-all duration-500 ${
                                        currentStep === idx ? 'opacity-100 translate-y-0 pointer-events-auto' : 
                                        currentStep > idx ? 'opacity-0 -translate-y-8 pointer-events-none' : 
                                        'opacity-0 translate-y-8 pointer-events-none'
                                    }`}
                                >
                                    {/* Custom Input for 'Other' category */}
                                    {step.id === 'category' && selections['category'] === 'Other / Custom' ? (
                                        <div className="w-full flex flex-col gap-3 animate-fadeIn">
                                            <input 
                                                type="text" 
                                                value={customCategory}
                                                onChange={e => setCustomCategory(e.target.value)}
                                                className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none shadow-sm"
                                                placeholder="Define Product (e.g. Handmade Soap)..."
                                                autoFocus
                                            />
                                            <button 
                                                onClick={() => setCurrentStep(prev => prev + 1)}
                                                disabled={!customCategory.trim()}
                                                className="self-end px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50"
                                            >
                                                Lock Category
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                            {step.options.map(opt => {
                                                const isSelected = selections[step.id] === opt;
                                                return (
                                                    <button 
                                                        key={opt}
                                                        onClick={() => handleSelectOption(step.id, opt)}
                                                        className={`shrink-0 px-6 py-3.5 rounded-2xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${
                                                            isSelected 
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)] scale-105' 
                                                            : 'bg-gradient-to-b from-white to-gray-50 text-slate-600 border-slate-200 shadow-sm active:bg-gray-100'
                                                        }`}
                                                    >
                                                        {opt}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* TIER 1: MENU BAR (Fixed Bottom) */}
                        <div className="flex-none px-4 py-6 border-t border-gray-50 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center justify-between gap-1">
                                {activeSteps.map((step, idx) => {
                                    const isActive = currentStep === idx;
                                    const isFilled = !!selections[step.id];
                                    return (
                                        <button 
                                            key={step.id}
                                            onClick={() => setCurrentStep(idx)}
                                            className="flex flex-col items-center gap-2 group flex-1 min-w-0"
                                        >
                                            <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : 'text-gray-300'}`}>
                                                {step.label}
                                            </span>
                                            <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`}></div>
                                            <span className={`text-[7px] font-bold h-3 transition-opacity truncate w-full text-center px-1 ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                {step.id === 'category' && selections['category'] === 'Other / Custom' ? customCategory : selections[step.id]}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Refinement Modal */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="Studio Refinement">
                <div className="space-y-6 pb-6">
                    <textarea 
                        value={refineText}
                        onChange={e => setRefineText(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                        placeholder="e.g. Add luxury water droplets to the bottle surface..."
                    />
                    <button 
                        onClick={handleRefine}
                        disabled={!refineText.trim() || isGenerating}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                    >
                        Apply Changes
                    </button>
                </div>
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes bar-slide {
                    0% { left: -40%; }
                    100% { left: 100%; }
                }
                .animate-bar-slide { 
                    position: absolute;
                    animation: bar-slide 1.8s cubic-bezier(0.65, 0, 0.35, 1) infinite; 
                }
                
                @keyframes pulse-slight {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                .animate-pulse-slight { animation: pulse-slight 2s ease-in-out infinite; }
                
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
