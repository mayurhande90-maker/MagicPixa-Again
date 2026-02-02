import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, Creation, View } from '../../types';
import { 
    PixaRestoreIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, ShieldCheckIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, EngineIcon, PaletteIcon, LockIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage, Base64File } from '../../utils/imageUtils';
import { colourizeImage } from '../../services/imageToolsService';
import { refineStudioImage } from '../../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { RestoreStyles } from '../../styles/features/PixaPhotoRestore.styles';

// --- CONFIGURATION ---

const RESTORE_STEPS = [
    { id: 'engine', label: 'Engine', options: ['Restore Only', 'Colorize & Fix'] },
    { id: 'asset', label: 'Photo' },
    { id: 'notes', label: 'Notes' }
];

const checkMilestoneLocal = (gens: number): number | false => {
    if (gens === 10) return 5;
    if (gens === 25) return 10;
    if (gens === 50) return 15;
    if (gens === 100) return 30;
    return false;
};

const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

interface MobileRestoreProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
    setActiveTab: (tab: View) => void;
}

export const MobileRestore: React.FC<MobileRestoreProps> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- 1. STATE ---
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | false>(false);

    const [currentStep, setCurrentStep] = useState(0);
    const [mode, setMode] = useState<'restore_color' | 'restore_only' | null>(null);
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [notes, setNotes] = useState('');

    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts?.['Pixa Photo Restore'] || 5;
    const refineCost = 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // --- 2. LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!mode;
        if (idx === 2) return !!image;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        return !!mode && !!image;
    }, [mode, image]);

    // Progress Animation
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Forensic Audit: Mapping chemical damage...", 
                "Identity Lock 6.0: Locking biometric structures...", 
                "Visual Forge: Synthesizing era-matched pigments...", 
                "Post-Production: Harmonizing pixel fidelity...", 
                "Finalizing: Rendering museum-grade output..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 5), 98);
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Auto-advance triggers
    useEffect(() => {
        if (currentStep === 1 && image) {
            setTimeout(() => setCurrentStep(2), 600);
        }
    }, [image, currentStep]);

    // --- 3. HANDLERS ---

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !mode || !auth.user || isGenerating) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await colourizeImage(image.base64.base64, image.base64.mimeType, mode, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Photo Restore (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Photo Restore');
            setLastCreationId(id);

            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestoneLocal(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) {
            console.error(e);
            alert("Restoration failed. Please try a clearer vintage photo.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Vintage Photo Restoration");
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);
            if (lastCreationId) await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setResult(null); setImage(null); setMode(null); setNotes('');
        setCurrentStep(0); setLastCreationId(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) setResult(null);
        else if (currentStep > 0) setCurrentStep(prev => prev - 1);
        else if (mode) setMode(null);
    };

    const handleSelectOption = (option: string) => {
        if (isGenerating) return;
        setMode(option === 'Restore Only' ? 'restore_only' : 'restore_color');
        if (currentStep < RESTORE_STEPS.length - 1) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 150);
        }
    };

    // --- 4. RENDERERS ---

    const renderStepContent = (stepId: string) => {
        const activeStep = RESTORE_STEPS[currentStep];
        
        switch (stepId) {
            case 'engine':
                return (
                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStep.options?.map(opt => {
                            const isSelected = (mode === 'restore_only' && opt === 'Restore Only') || (mode === 'restore_color' && opt === 'Colorize & Fix');
                            return (
                                <button key={opt} onClick={() => handleSelectOption(opt)} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'asset':
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center text-center">
                        <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 w-full max-w-[280px] transition-colors ${image ? 'bg-green-50 border-green-100 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                            {image ? <CheckIcon className="w-4 h-4" /> : <InformationCircleIcon className="w-4 h-4" />}
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                                {image ? 'Photo Synchronized' : 'Tap canvas to upload'}
                            </p>
                        </div>
                    </div>
                );
            case 'notes':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Optional notes (e.g. fix the tear on left)..." />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header (Stacked Layout) */}
            <div className="flex-none flex flex-col bg-white z-50">
                {/* Top Row: Identity (Solid Black Design) */}
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <PixaRestoreIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter pointer-events-none text-black">
                        Pixa Photo Restore
                    </span>
                </div>

                {/* Bottom Row: Commands */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleBack} 
                            className={`p-2 rounded-full transition-all ${mode && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        {mode && !result && !isGenerating && (
                            <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn">
                                <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button 
                                onClick={() => downloadImage(result, 'restored.png')}
                                className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        ) : !result && (
                            <button 
                                onClick={handleGenerate}
                                disabled={!isStrategyComplete || isGenerating}
                                className={`px-10 py-3.5 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                    !isStrategyComplete || isGenerating
                                    ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                    : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                                }`}
                            >
                                {isGenerating ? 'Restoring...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${mode ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img src={result} onClick={() => !isGenerating && setIsFullScreenOpen(true)} className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} />
                        ) : !mode ? (
                            <div className="text-center animate-fadeIn px-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><PixaRestoreIcon className="w-10 h-10 text-indigo-400" /></div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Identity Vault</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Select restoration engine to start</p>
                            </div>
                        ) : (
                            <button onClick={() => !isGenerating && fileInputRef.current?.click()} className={`w-[85%] aspect-square border-2 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${image ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-200 border-dashed bg-white active:bg-gray-50'}`}>
                                {image ? (
                                    <img src={image.url} className={`w-full h-full object-cover rounded-[1.8rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : ''}`} />
                                ) : (
                                    <><div className="p-4 bg-gray-50 rounded-2xl text-gray-200"><ImageIcon className="w-10 h-10"/></div><span className="text-[10px] font-black text-gray-300 tracking-[0.2em] text-center px-6">UPLOAD VINTAGE PHOTO</span></>
                                )}
                                {image && !isGenerating && (
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-lg animate-fadeIn">
                                        <div className="flex items-center gap-1.5">
                                            <ShieldCheckIcon className="w-3 h-3 text-indigo-500" />
                                            <span className="text-[8px] font-black text-indigo-900 uppercase tracking-widest">Identity Lock 6.0</span>
                                        </div>
                                    </div>
                                )}
                            </button>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                        <div className="absolute"><span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span></div>
                                    </div>
                                    <div className="text-center"><span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Deep Reconstruction</span><div className="h-px w-8 bg-indigo-500/50 mx-auto my-3" /><span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CustomRefineIcon className="w-5 h-5" /> Refine image</button>
                            <div className="grid grid-cols-2 gap-3"><button onClick={handleNewProject} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all"><PlusIcon className="w-4 h-4" /> New Project</button><button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm"><RegenerateIcon className="w-4 h-4" /> Regenerate</button></div>
                        </div>
                    ) : isLowCredits && mode ? (
                        <div className="p-6 animate-fadeIn bg-red-50/50 flex flex-col items-center gap-4 rounded-[2rem] border border-red-100 mx-6 mb-6">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-red-100 rounded-full text-red-600">
                                    <LockIcon className="w-5 h-5" />
                                 </div>
                                 <div className="text-left">
                                    <p className="text-sm font-black text-red-900 uppercase tracking-tight">Insufficient Balance</p>
                                    <p className="text-[10px] font-bold text-red-700/70">Generating this restoration requires {cost} credits. Your balance: {auth.user?.credits || 0}</p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setActiveTab('billing')}
                                className="w-full py-4 bg-[#1A1A1E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                             >
                                Recharge Credits
                             </button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {RESTORE_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {RESTORE_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!mode) || (idx === 1 && !!image) || (idx === 2 && notes.trim().length > 0);
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed'}`}>
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : isAccessible ? 'bg-gray-200' : 'bg-gray-100'}`}></div>
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {idx === 0 ? (mode === 'restore_only' ? 'BW Only' : 'Full Color') : idx === 1 ? 'Ready' : 'Note Set'}
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

            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title={<div className="flex items-center gap-3"><span>Restoration Refinement</span><div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0"><CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" /><span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span></div></div>}>
                <div className="space-y-6 pb-6"><textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[16px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Make the eyes sharper, reduce the background noise more..." /><button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button></div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}><button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button><img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" /></div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileRestore;
