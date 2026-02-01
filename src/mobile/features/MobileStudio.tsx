import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CubeIcon, UsersIcon, CameraIcon, ImageIcon, 
    ArrowRightIcon, ArrowLeftIcon, InformationCircleIcon,
    MagicWandIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64 } from '../../utils/imageUtils';
import { editImageWithPrompt, analyzeProductImage, analyzeProductForModelPrompts, generateModelShot } from '../../services/photoStudioService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

const PRODUCT_STEPS = [
    { id: 'category', label: 'Category', options: ['Beauty', 'Tech', 'Food', 'Fashion', 'Home', 'Jewelry', 'Footwear', 'Other'] },
    { id: 'style', label: 'Brand Style', options: ['Clean', 'Luxury', 'Minimalist', 'Bold', 'Natural', 'High-tech', 'Playful'] },
    { id: 'theme', label: 'Visual Theme', options: ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'] }
];

const MODEL_STEPS = [
    { id: 'persona', label: 'Persona', options: ['Adult Female', 'Adult Male', 'Young Female', 'Young Male', 'Senior', 'Kid Model'] },
    { id: 'region', label: 'Region', options: ['Global', 'South Asian', 'East Asian', 'African', 'European', 'American'] },
    { id: 'skin', label: 'Skin Tone', options: ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'] }
];

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // --- UI State ---
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing...");

    // Tray Navigation
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;

    const activeSteps = studioMode === 'model' ? MODEL_STEPS : PRODUCT_STEPS;
    const isStrategyComplete = Object.keys(selections).length === 3;

    // --- Handlers ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            setStudioMode(null);
            setSelections({});
            setCurrentStep(0);
            
            setIsAnalyzing(true);
            setTimeout(() => setIsAnalyzing(false), 2000);
        }
    };

    // FIX: Added missing handleModeSelect function to resolve 'Cannot find name' errors.
    const handleModeSelect = (mode: 'product' | 'model') => {
        setStudioMode(mode);
        setSelections({});
        setCurrentStep(0);
    };

    const handleSelectOption = (stepId: string, option: string) => {
        setSelections(prev => ({ ...prev, [stepId]: option }));
        if (currentStep < 2) {
            // Trigger "pop" animation by slight delay before moving to next step
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 150);
        }
    };

    const handleGenerate = async () => {
        if (!image || !isStrategyComplete || !auth.user || isGenerating) return;
        
        setIsGenerating(true);
        try {
            const promptStr = Object.values(selections).join(', ');
            let resB64;
            
            if (studioMode === 'product') {
                resB64 = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, promptStr, auth.activeBrandKit);
            } else {
                resB64 = await generateModelShot(image.base64.base64, image.base64.mimeType, { 
                    modelType: selections['persona'], 
                    region: selections['region'], 
                    skinTone: selections['skin'] 
                }, auth.activeBrandKit);
            }

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Studio (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');

        } catch (e: any) {
            alert("Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            
            {/* 1. TOP COMMAND BAR (Fixed) */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50">
                <button 
                    onClick={() => { setImage(null); setResult(null); }} 
                    className={`p-2 rounded-full transition-all ${image || result ? 'bg-gray-100 text-gray-500' : 'opacity-0 pointer-events-none'}`}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>

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
            </div>

            {/* 2. FIXED CANVAS (60% Viewport) */}
            <div className="relative h-[60%] w-full flex items-center justify-center p-6 select-none">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center ${image ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}`}>
                    
                    {/* Content */}
                    {result ? (
                        <img src={result} className="w-full h-full object-contain animate-fadeIn" />
                    ) : image ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img src={image.url} className={`max-w-[85%] max-h-[85%] object-contain animate-fadeIn transition-all ${isAnalyzing || !studioMode ? 'blur-sm scale-95 opacity-50' : ''}`} />
                            
                            {/* SCANNING OVERLAY */}
                            {isAnalyzing && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-scan-y"></div>
                                    <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 border border-white/10 shadow-2xl animate-bounce-slight">
                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-ping"></div>
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Pixa Vision Scanning...</span>
                                    </div>
                                </div>
                            )}

                            {/* POST-UPLOAD MODE PICKER */}
                            {image && !studioMode && !isAnalyzing && (
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
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center group active:scale-95 transition-all">
                            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Drop Asset</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                        </div>
                    )}

                    {/* Result Actions */}
                    {result && !isGenerating && (
                        <div className="absolute top-6 right-6 flex flex-col gap-3">
                            <button onClick={() => setIsRefineOpen(true)} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl active:scale-90">
                                <MagicWandIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. CONTROL TRAY (Bottom 40%) */}
            <div className={`flex-1 flex flex-col bg-white border-t border-gray-100 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${studioMode ? 'translate-y-0' : 'translate-y-full'}`}>
                
                {/* TIER 2: OPTION SCROLLER (Auto-advancing Area) */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                    {activeSteps.map((step, idx) => (
                        <div 
                            key={step.id}
                            className={`absolute inset-0 px-6 flex items-center transition-all duration-500 ${
                                currentStep === idx ? 'opacity-100 translate-y-0 pointer-events-auto' : 
                                currentStep > idx ? 'opacity-0 -translate-y-8 pointer-events-none' : 
                                'opacity-0 translate-y-8 pointer-events-none'
                            }`}
                        >
                            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {step.options.map(opt => {
                                    const isSelected = selections[step.id] === opt;
                                    return (
                                        <button 
                                            key={opt}
                                            onClick={() => handleSelectOption(step.id, opt)}
                                            className={`shrink-0 px-6 py-3.5 rounded-2xl text-xs font-bold border transition-all ${
                                                isSelected 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                                                : 'bg-gray-50 text-gray-500 border-gray-100 active:bg-gray-100'
                                            }`}
                                        >
                                            {opt}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* TIER 1: MENU BAR (Fixed Bottom) */}
                <div className="flex-none px-6 py-6 border-t border-gray-50 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between">
                        {activeSteps.map((step, idx) => {
                            const isActive = currentStep === idx;
                            const isFilled = !!selections[step.id];
                            return (
                                <button 
                                    key={step.id}
                                    onClick={() => setCurrentStep(idx)}
                                    className="flex flex-col items-center gap-2 group flex-1"
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'text-indigo-600' : 'text-gray-300'}`}>
                                        {step.label}
                                    </span>
                                    <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`}></div>
                                    <span className={`text-[9px] font-bold h-3 transition-opacity ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                        {selections[step.id]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Refinement Modal */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="Master Refinement">
                <div className="space-y-6 pb-6">
                    <textarea 
                        value={refineText}
                        onChange={e => setRefineText(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                        placeholder="e.g. Add luxury water droplets to the bottle surface..."
                    />
                    <button 
                        onClick={() => { alert("Manual Refinement: " + refineText); setIsRefineOpen(false); }}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
                    >
                        Apply Changes
                    </button>
                </div>
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes scan-y {
                    0% { top: 0%; }
                    100% { top: 100%; }
                }
                .animate-scan-y { animation: scan-y 2s linear infinite; }
                
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
