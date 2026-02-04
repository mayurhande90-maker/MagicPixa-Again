
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    PixaInteriorIcon, HomeIcon, BuildingIcon, UploadIcon, SparklesIcon, 
    XIcon, CheckIcon, ArrowLeftIcon, ImageIcon, ArrowRightIcon, 
    MagicWandIcon, DownloadIcon, RegenerateIcon, PlusIcon,
    CreditCoinIcon, ShieldCheckIcon, InformationCircleIcon, LockIcon, RefreshIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { generateInteriorDesign } from '../../services/interiorService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { MobileInteriorStyles as styles } from '../../styles/features/MobileInterior.styles';

const INTERIOR_STEPS = [
    { id: 'space', label: 'Space' },
    { id: 'room', label: 'Room' },
    { id: 'style', label: 'Style' },
    { id: 'notes', label: 'Notes' }
];

const HOME_ROOMS = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Bathroom', 'Home Office', 'Balcony/Patio', 'Gaming Room'];
const OFFICE_ROOMS = ['Open Workspace', 'Private Office', 'Conference Room', 'Reception / Lobby', 'Break Room', 'Meeting Pod'];
const HOME_STYLES = ['Modern', 'Minimalist', 'Japanese', 'American', 'Coastal', 'Traditional Indian', 'Arabic', 'Futuristic', 'African'];
const OFFICE_STYLES = ['Modern Corporate', 'Minimalist', 'Industrial', 'Creative / Artistic', 'Luxury Executive', 'Biophilic / Nature-Inspired', 'Tech Futuristic', 'Traditional Indian'];

export const MobileInterior: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void; }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- STATE ---
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [spaceType, setSpaceType] = useState<'home' | 'office' | null>(null);
    const [roomType, setRoomType] = useState('');
    const [designStyle, setDesignStyle] = useState('');
    const [notes, setNotes] = useState('');
    
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Spatial Audit...");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts?.['Pixa Interior Design'] || 8;
    const refineCost = 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const isLowRefineCredits = userCredits < refineCost;

    const activeRooms = spaceType === 'office' ? OFFICE_ROOMS : HOME_ROOMS;
    const activeStyles = spaceType === 'office' ? OFFICE_STYLES : HOME_STYLES;

    // --- LOGIC ---

    const handleReset = () => {
        setImage(null);
        setSpaceType(null);
        setRoomType('');
        setDesignStyle('');
        setNotes('');
        setResult(null);
        setCurrentStep(0);
        setLastCreationId(null);
    };

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return !!image;
        if (idx === 1) return !!spaceType;
        if (idx === 2) return !!roomType;
        if (idx === 3) return !!designStyle;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        return !!image && !!spaceType && !!roomType && !!designStyle;
    }, [image, spaceType, roomType, designStyle]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Spatial Audit: Locking architecture...",
                "Pixel Map: Extracting surfaces...",
                "Lighting Engine: Triangulating source...",
                "Neural Core: Synthesizing materials...",
                "Finalizing: Polishing 8K render..."
            ];
            let step = 0;
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => (prev >= 98 ? 98 : prev + Math.random() * 4));
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const base64 = await fileToBase64(e.target.files[0]);
            setImage({ url: URL.createObjectURL(e.target.files[0]), base64 });
            setResult(null);
            if (currentStep === 0) setCurrentStep(0); // Trigger re-render of step
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!isStrategyComplete || !auth.user || isGenerating) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await generateInteriorDesign(
                image!.base64.base64,
                image!.base64.mimeType,
                designStyle,
                spaceType!,
                roomType,
                auth.activeBrandKit
            );

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Interior (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Interior Design');
            setLastCreationId(id);
        } catch (e) {
            console.error(e);
            alert("Spatial rendering failed. Please try a clearer room photo.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        if (isLowRefineCredits) return;
        
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Architectural Render");
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

    const renderStepContent = () => {
        const stepId = INTERIOR_STEPS[currentStep].id;
        switch (stepId) {
            case 'space':
                return (
                    <div className={styles.modeGrid}>
                        <button 
                            onClick={() => { setSpaceType('home'); setCurrentStep(1); }} 
                            className={`${styles.modeCard} ${spaceType === 'home' ? styles.modeCardSelected : styles.modeCardInactive}`}
                        >
                            <div className={`${styles.modeOrb} ${styles.modeOrbHome}`}></div>
                            <div className={`${styles.modeIconBox} ${styles.modeIconHome}`}><HomeIcon className="w-6 h-6"/></div>
                            <h4 className={styles.modeTitle}>Home</h4>
                            <p className={styles.modeDesc}>Residential</p>
                        </button>
                        <button 
                            onClick={() => { setSpaceType('office'); setCurrentStep(1); }} 
                            className={`${styles.modeCard} ${spaceType === 'office' ? styles.modeCardSelected : styles.modeCardInactive}`}
                        >
                            <div className={`${styles.modeOrb} ${styles.modeOrbOffice}`}></div>
                            <div className={`${styles.modeIconBox} ${styles.modeIconOffice}`}><BuildingIcon className="w-6 h-6"/></div>
                            <h4 className={styles.modeTitle}>Office</h4>
                            <p className={styles.modeDesc}>Commercial</p>
                        </button>
                    </div>
                );
            case 'room':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeRooms.map(opt => (
                            <button key={opt} onClick={() => { setRoomType(opt); setCurrentStep(2); }} className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all ${roomType === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>{opt}</button>
                        ))}
                    </div>
                );
            case 'style':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStyles.map(opt => (
                            <button key={opt} onClick={() => { setDesignStyle(opt); setCurrentStep(3); }} className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all ${designStyle === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>{opt}</button>
                        ))}
                    </div>
                );
            case 'notes':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Optional: e.g. add a wooden coffee table..." />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            <div className="flex-none flex flex-col bg-white z-50">
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <PixaInteriorIcon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter text-black">Pixa Interior Design</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm">
                            <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button onClick={() => downloadImage(result, 'interior.png')} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : !result && (
                            <button onClick={handleGenerate} disabled={!isStrategyComplete || isGenerating || isLowCredits} className={`px-10 py-3.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating || isLowCredits ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Analyzing...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative flex-grow w-full flex items-center justify-center p-6 overflow-hidden pb-10">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative bg-gray-50 shadow-inner">
                    {result ? (
                        <img src={result} onClick={() => setIsFullScreenOpen(true)} className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30' : 'animate-materialize'}`} />
                    ) : image ? (
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            <img src={image.url} className={`max-w-full max-h-full object-contain transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : ''}`} />
                            {!isGenerating && (
                                <div className="absolute top-4 left-4">
                                    <div className={styles.statusBadge}>
                                        <div className={styles.statusDot}></div>
                                        <span className={styles.statusText}>Architecture Locked</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="text-center group active:scale-95 transition-all">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                <PixaInteriorIcon className="w-14 h-14 text-indigo-500/20" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Redesign Room</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to upload space</p>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </div>
                    )}

                    {image && !result && !isGenerating && (
                        <button 
                            onClick={handleReset}
                            className="absolute top-4 right-4 z-[60] bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-700" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-700">Reset</span>
                        </button>
                    )}

                    {isGenerating && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl animate-fadeIn">
                            <div className="flex flex-col items-center gap-8 text-center px-10">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                    <div className="absolute text-sm font-mono font-black text-white">{Math.round(progressPercent)}%</div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-80">Spatial Scan</span>
                                    <div className="h-px w-8 bg-indigo-500/50 mx-auto My-3" />
                                    <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {isGenerating && <div className={styles.scanLine} />}
                </div>
            </div>

            <div className="flex-none bg-white min-h-0 border-t border-gray-100">
                <div className={`transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <MagicWandIcon className="w-5 h-5 brightness-0 invert" /> Refine Image
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleReset} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2">
                                    <PlusIcon className="w-3.5 h-3.5" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2">
                                    <RegenerateIcon className="w-3.5 h-3.5" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : isLowCredits && image ? (
                        <div className="p-6 animate-fadeIn bg-red-50/50 flex flex-col items-center gap-4 mx-6 mb-6 rounded-[2rem] border border-red-100">
                             <div className="flex items-center gap-3 text-red-900">
                                 <LockIcon className="w-5 h-5" />
                                 <div className="text-left">
                                    <p className="text-sm font-black uppercase tracking-tight">Insufficient Credits</p>
                                    <p className="text-[10px] font-bold opacity-70">Redesigning requires {cost} credits.</p>
                                 </div>
                             </div>
                             <button onClick={() => setActiveTab('billing')} className="w-full py-4 bg-[#1A1A1E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={`flex flex-col transition-all duration-700 ${image ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
                            <div className="h-[150px] flex items-center relative overflow-hidden">
                                {INTERIOR_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent()}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {INTERIOR_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!spaceType) || (idx === 1 && !!roomType) || (idx === 2 && !!designStyle) || (idx === 3 && notes.trim().length > 0);
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                                <span className={`${styles.stepLabel} ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`${styles.stepBar} ${isActive ? 'bg-indigo-600' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : (step.id === 'notes' ? 'opacity-100 text-gray-400' : 'opacity-0')}`}>
                                                    {idx === 0 ? spaceType : idx === 1 ? roomType : idx === 2 ? designStyle : (isFilled ? 'Note Set' : 'Optional')}
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

            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title={<div className="flex items-center gap-3"><span>Redesign Refinement</span><div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0"><CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" /><span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span></div></div>}>
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Change the sofa color to emerald green, add more plants..." />
                    
                    {isLowRefineCredits ? (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center gap-3 animate-fadeIn">
                            <div className="flex items-center gap-2 text-red-700">
                                <LockIcon className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-tight">Insufficient Balance</span>
                            </div>
                            <p className="text-[10px] text-red-600/80 font-medium text-center px-4">
                                Refinement requires {refineCost} credits. Your balance: {auth.user?.credits || 0}
                            </p>
                            <button 
                                onClick={() => { setIsRefineOpen(false); setActiveTab('billing'); }}
                                className="w-full py-3 bg-[#1A1A1E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Recharge Credits
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Update Space</button>
                    )}
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}
            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileInterior;
