import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CubeIcon, UsersIcon, CameraIcon, ImageIcon, 
    ArrowRightIcon, ArrowLeftIcon, InformationCircleIcon,
    MagicWandIcon, DownloadIcon, RegenerateIcon, PlusIcon,
    CreditCoinIcon
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
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

interface MobileStudioProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileStudio: React.FC<MobileStudioProps> = ({ auth, appConfig, onGenerationStart }) => {
    // --- UI State ---
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing...");
    const [progressPercent, setProgressPercent] = useState(0);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

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
    
    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        const prevStep = activeSteps[idx - 1];
        if (!prevStep) return false;
        
        // Check if previous step is filled
        const prevFilled = !!selections[prevStep.id];
        if (prevStep.id === 'category' && selections['category'] === 'Other / Custom') {
            return !!customCategory.trim();
        }
        return prevFilled;
    };

    const isStrategyComplete = useMemo(() => {
        if (!studioMode) return false;
        const requiredCount = activeSteps.length;
        const currentCount = Object.keys(selections).length;
        if (studioMode === 'product' && selections['category'] === 'Other / Custom' && !customCategory.trim()) {
            return false;
        }
        return currentCount >= requiredCount;
    }, [selections, studioMode, activeSteps, customCategory]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
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
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 4), 98);
                });
            }, 1800);
        } else {
            setProgressPercent(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

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
        if (isGenerating) return;
        setSelections(prev => ({ ...prev, [stepId]: option }));
        if (currentStep < activeSteps.length - 1) {
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 150);
        }
    };

    const handleGenerate = async () => {
        if (!image || !isStrategyComplete || !auth.user || isGenerating) return;
        
        onGenerationStart();

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
            setIsGenerating(false);

            try {
                const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Studio (Mobile)');
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');
                setLastCreationId(creationId);
            } catch (persistenceError) {
                console.warn("Persistence background error:", persistenceError);
            }

        } catch (e: any) {
            console.error("AI Generation Critical Error:", e);
            alert("Generation failed. Please try again with a clearer photo.");
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
            setIsGenerating(false);
            
            try {
                if (lastCreationId) {
                    await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
                } else {
                    const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots (Refined)');
                    setLastCreationId(id);
                }
                const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            } catch (bgError) {
                console.warn("Refine background update failed:", bgError);
            }
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
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

    const handleBack = () => {
        if (isGenerating) return;
        if (result) {
            setResult(null);
        } else if (studioMode) {
            setStudioMode(null);
            setSelections({});
            setCurrentStep(0);
        } else if (image) {
            setImage(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header Command Bar */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleBack} 
                        className={`p-2 rounded-full transition-all ${image && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    {image && !result && !isGenerating && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn">
                            <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {result && !isGenerating && (
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
                            className={`px-10 py-3.5 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                !isStrategyComplete || isGenerating
                                ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                            }`}
                        >
                            {isGenerating ? 'Rendering...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stage / Canvas Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${image ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : image ? (
                            <img src={image.url} className={`max-w-[85%] max-h-[85%] object-contain animate-fadeIn transition-all ${isAnalyzing || !studioMode || isGenerating ? 'blur-sm scale-95 opacity-50' : ''}`} />
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="text-center group active:scale-95 transition-all">
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                    <ImageIcon className="w-10 h-10 text-indigo-50" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Product Photo</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                            </div>
                        )}
                        {(isAnalyzing || isGenerating) && (
                            <div className="absolute inset-0 z-40 pointer-events-none">
                                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1] absolute top-0 left-0 animate-neural-scan opacity-80"></div>
                                <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 z-30 pointer-events-none opacity-[0.03] overflow-hidden">
                                <div className="absolute inset-[-100%] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] animate-grain"></div>
                            </div>
                        )}
                        {(isAnalyzing || isGenerating) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full max-w-[300px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-500" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">
                                            {isAnalyzing ? 'Vision Scan' : 'Neural Core'}
                                        </span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        {isGenerating && (
                                            <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse max-w-[180px] leading-relaxed">
                                                {loadingText}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {image && !studioMode && !isAnalyzing && !isGenerating && !result && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-6 bg-white/40 backdrop-blur-sm animate-fadeIn">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Choose Your Path</h3>
                                <div className="flex gap-4 w-full max-w-sm">
                                    <button onClick={() => handleModeSelect('product')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><CubeIcon className="w-6 h-6"/></div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider text-center">Product Shot</span>
                                    </button>
                                    <button onClick={() => handleModeSelect('model')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center"><UsersIcon className="w-6 h-6"/></div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider text-center">Model Shot</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controller / Bottom Tray */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex-1 flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <CustomRefineIcon className="w-5 h-5" /> Refine image
                            </button>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={handleNewProject} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                    <PlusIcon className="w-4 h-4" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm">
                                    <RegenerateIcon className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`flex-1 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${studioMode ? 'translate-y-0' : 'translate-y-full'}`}>
                            {/* Step Option Container */}
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {activeSteps.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {step.id === 'category' && selections['category'] === 'Other / Custom' ? (
                                            <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn">
                                                <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none shadow-sm" placeholder="Define Product (e.g. Handmade Soap)..." autoFocus />
                                                <button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!customCategory.trim()} className="self-end px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-50">Lock Category</button>
                                            </div>
                                        ) : (
                                            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
                                                {step.options.map(opt => {
                                                    const isSelected = selections[step.id] === opt;
                                                    return (
                                                        <button key={opt} onClick={() => handleSelectOption(step.id, opt)} className={`shrink-0 px-6 py-3.5 rounded-2xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                                            {opt}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Step Navigator (Progress Bar Tray) */}
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {activeSteps.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = !!selections[step.id] || (step.id === 'category' && selections['category'] === 'Other / Custom' && !!customCategory.trim());
                                        
                                        return (
                                            <button 
                                                key={step.id} 
                                                onClick={() => isAccessible && setCurrentStep(idx)} 
                                                disabled={!isAccessible}
                                                className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed'}`}
                                            >
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : isAccessible ? 'bg-gray-200' : 'bg-gray-100'}`}></div>
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
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
            </div>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <div className="absolute top-10 right-6 flex items-center gap-4 z-50">
                        <button onClick={(e) => { e.stopPropagation(); downloadImage(result, 'magicpixa-studio.png'); }} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10"><DownloadIcon className="w-6 h-6" /></button>
                        <button onClick={() => setIsFullScreenOpen(false)} className="p-3 bg-white/10 hover:bg-red-50 text-white rounded-full backdrop-blur-md transition-all border border-white/10"><XIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="w-full h-full flex items-center justify-center p-2">
                        <img src={result} className="max-w-full max-h-full object-contain animate-materialize rounded-lg" onClick={e => e.stopPropagation()} />
                    </div>
                </div>
            )}

            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title={
                    <div className="flex items-center gap-3">
                        <span>Studio Refinement</span>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0">
                            <CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Add luxury water droplets to the bottle surface..." />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button>
                </div>
            </MobileSheet>
            
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            
            <style>{`
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes grain { 0%, 100% { transform: translate(0, 0); } 10% { transform: translate(-1%, -1%); } 30% { transform: translate(-2%, 2%); } 50% { transform: translate(1%, -2%); } 70% { transform: translate(-1%, 1%); } 90% { transform: translate(2%, 0); } }
                .animate-grain { animation: grain 1s steps(4) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
