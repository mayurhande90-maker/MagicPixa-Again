
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    ApparelIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, UserIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, ShieldCheckIcon, GarmentTrousersIcon, PixaTryOnIcon, LockIcon, RefreshIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage, Base64File } from '../../utils/imageUtils';
import { generateApparelTryOn } from '../../services/apparelService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation, claimMilestoneBonus } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { MobileTryOnStyles as styles } from '../../styles/features/MobileTryOn.styles';

// --- CONFIGURATION ---

const TRYON_STEPS = [
    { id: 'model', label: 'Model' },
    { id: 'closet', label: 'Closet' },
    { id: 'tailoring', label: 'Tailoring', options: ['Regular', 'Slim Fit', 'Oversized'] },
    { id: 'finish', label: 'Finish', options: ['Untucked', 'Tucked In', 'Long Sleeves', 'Rolled Sleeves'] },
    { id: 'addons', label: 'Add-ons' }
];

const LOADING_MESSAGES = [
    "Pixa Vision: Auditing body silhoutte...",
    "Neural Core: Calculating fabric tension...",
    "Physics Engine: Simulating drape & gravity...",
    "Identity Lock: Harmonizing lighting highlights...",
    "Tailor Engine: Adjusting seams & depth...",
    "Finalizing: Exporting 8K fashion render..."
];

// --- COMPONENTS ---

const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

const TrousersIconCustom = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none"><g fill="none"><path d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01l-.184-.092Z"/><path fill="currentColor" d="M7.895 2a2 2 0 0 0-1.988 1.78L5.883 4h12.234l-.024-.22A2 2 0 0 0 16.105 2h-8.21Zm10.444 4H5.66L4.13 19.78A2 2 0 0 0 6.116 22h3.08a2 2 0 0 0 1.953-1.566L12 13.61l.85 6.824A2 2 0 0 0 14.802 22h3.08a2 2 0 0 0 1.988-2.22L18.34 6Z"/></g></svg>
);

const PremiumUpload: React.FC<{ 
    label: string; 
    uploadText?: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    compact?: boolean; 
    isPink?: boolean;
}> = ({ label, uploadText, image, onUpload, onClear, icon, heightClass = "h-40", compact, isPink }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{label}</label>
                {image && <CheckIcon className="w-3 h-3 text-green-500"/>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-gray-50 rounded-2xl border flex items-center justify-center overflow-hidden group-hover:border-indigo-300 transition-all shadow-inner ${isPink ? 'border-pink-100' : 'border-indigo-100'}`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1 transition-transform duration-500 group-hover:scale-105" alt={label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-1.5">
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white/90 p-1.5 rounded-lg shadow-lg text-gray-500 hover:text-red-500 active:scale-90 transition-all backdrop-blur-sm"><XIcon className="w-3.5 h-3.5"/></button>
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isPink ? 'border-pink-200 hover:bg-pink-50/30' : 'border-gray-200 hover:bg-indigo-50/30 hover:border-indigo-400'}`}>
                    <div className={`${compact ? 'p-2' : 'p-3'} rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-all border ${isPink ? 'bg-pink-50 text-pink-500 border-pink-100' : 'bg-gray-50 group-hover:bg-white text-gray-400 group-hover:text-indigo-500 border-gray-100'}`}>{icon}</div>
                    <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-bold text-gray-600 uppercase tracking-wide text-center px-2 leading-tight group-hover:text-indigo-600`}>{uploadText || "Add Photo"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

interface MobileTryOnProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
    setActiveTab: (tab: View) => void;
}

export const MobileTryOn: React.FC<MobileTryOnProps> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topGarment, setTopGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomGarment, setBottomGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    
    const [fitType, setFitType] = useState(''); 
    const [finishType, setFinishType] = useState<string[]>([]);
    const [accessories, setAccessories] = useState('');

    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState(LOADING_MESSAGES[0]);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts?.['Pixa TryOn'] || 8;
    const refineCost = 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const isLowRefineCredits = userCredits < refineCost;

    // --- LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!personImage;
        if (idx >= 2) return (!!topGarment || !!bottomGarment);
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        // Tailoring is now optional. Just need model + at least one garment.
        return !!personImage && (!!topGarment || !!bottomGarment);
    }, [personImage, topGarment, bottomGarment]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            let step = 0;
            interval = setInterval(() => {
                step = (step + 1) % LOADING_MESSAGES.length;
                setLoadingText(LOADING_MESSAGES[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 4), 98);
                });
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            
            if (setter === setPersonImage) {
                setTimeout(() => setCurrentStep(1), 500);
            }
        }
        e.target.value = '';
    };

    const handleToggleFinish = (option: string) => {
        setFinishType(prev => 
            prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]
        );
    };

    const handleGenerate = async () => {
        if (!personImage || !auth.user || isGenerating) return; 
        if (!topGarment && !bottomGarment) return; 
        if (isLowCredits) { alert("Insufficient credits."); return; } 

        onGenerationStart();
        setIsGenerating(true); 
        setResult(null); 
        setLastCreationId(null);
        
        try {
            const styling = {
                fit: fitType || 'Regular',
                tuck: finishType.find(f => f.includes('Tucked')) || 'Untucked',
                sleeve: finishType.find(f => f.includes('Sleeves')) || 'Original',
                accessories: accessories
            };

            const resB64 = await generateApparelTryOn(
                personImage!.base64.base64,
                personImage!.base64.mimeType,
                topGarment ? topGarment.base64 : null,
                bottomGarment ? bottomGarment.base64 : null,
                undefined,
                styling,
                auth.activeBrandKit
            );

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa TryOn (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa TryOn');
            setLastCreationId(id);
        } catch (e) {
            console.error(e);
            alert("TryOn rendering failed. Please try clearer images.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async (text: string) => {
        if (!result || !text.trim() || !auth.user || isGenerating) return;
        if (isLowRefineCredits) return;

        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, text, "Apparel Portrait");
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

    const handleNewSession = () => {
        setResult(null);
        setPersonImage(null);
        setTopGarment(null);
        setBottomGarment(null);
        setCurrentStep(0);
        setFitType('');
        setFinishType([]);
        setAccessories('');
        setLastCreationId(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) setResult(null);
        else if (currentStep > 0) setCurrentStep(prev => prev - 1);
        else if (personImage) setPersonImage(null);
    };

    // --- RENDERERS ---

    const renderStepContent = (stepId: string) => {
        const activeStep = TRYON_STEPS[currentStep];
        switch (stepId) {
            case 'model':
                return (
                    <div className="w-full px-6 flex flex-col items-center animate-fadeIn py-2">
                        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-4 w-full">
                            <CameraIcon className="w-6 h-6 text-indigo-500" />
                            <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Selfie / Photo</p>
                                <p className="text-[9px] text-indigo-400 font-medium uppercase tracking-wider">Tap the canvas to upload model</p>
                            </div>
                        </div>
                    </div>
                );
            case 'closet':
                return (
                    <div className="w-full px-6 flex flex-col gap-4 animate-fadeIn py-2">
                        <div className="flex gap-3 items-center h-full">
                            <PremiumUpload 
                                label="Upper Wear" 
                                uploadText="upload at least one item"
                                image={topGarment} 
                                onUpload={handleUpload(setTopGarment)} 
                                onClear={() => setTopGarment(null)} 
                                icon={<ApparelIcon className="w-6 h-6 text-indigo-400"/>} 
                                heightClass="h-32" 
                                compact 
                            />
                            <PremiumUpload 
                                label="Bottom Wear" 
                                uploadText="Full outfit? Use same photo"
                                image={bottomGarment} 
                                onUpload={handleUpload(setBottomGarment)} 
                                onClear={() => setBottomGarment(null)} 
                                icon={<TrousersIconCustom className="w-6 h-6"/>} 
                                heightClass="h-32" 
                                compact 
                                isPink={true}
                            />
                        </div>
                    </div>
                );
            case 'tailoring':
                return (
                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-4 animate-fadeIn">
                        {activeStep.options?.map(opt => (
                            <button key={opt} onClick={() => { setFitType(opt); setCurrentStep(3); }} className={`${styles.optionBtn} ${fitType === opt ? styles.optionActive : styles.optionInactive}`}>{opt}</button>
                        ))}
                    </div>
                );
            case 'finish':
                return (
                    <div className="w-full flex flex-wrap gap-2.5 px-6 py-2 animate-fadeIn justify-center">
                        {activeStep.options?.map(opt => {
                            const isSelected = finishType.includes(opt);
                            return (
                                <button key={opt} onClick={() => handleToggleFinish(opt)} className={`${styles.optionBtn} !px-4 !py-2.5 !shrink-1 ${isSelected ? styles.optionActive : styles.optionInactive}`}>{opt}</button>
                            );
                        })}
                        <button onClick={() => setCurrentStep(4)} className="px-6 py-2.5 rounded-2xl text-[10px] font-black bg-indigo-600 text-white uppercase tracking-widest shadow-lg border border-indigo-100">Done</button>
                    </div>
                );
            case 'addons':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input value={accessories} onChange={e => setAccessories(e.target.value)} className="w-full p-4 bg-gray-50 border border-indigo-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Optional: e.g. gold watch, sunglasses..." />
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
                    <PixaTryOnIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter pointer-events-none text-black">
                        Pixa TryOn
                    </span>
                </div>

                {/* Bottom Row: Commands */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!isGenerating && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button onClick={() => downloadImage(result, 'tryon.png')} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : !result && (
                            <button onClick={() => handleGenerate()} disabled={!isStrategyComplete || isGenerating || isLowCredits} className={`px-10 py-3 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating || isLowCredits ? 'bg-gray-100 text-gray-400 grayscale' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Tailoring...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 overflow-hidden pb-10">
                <div className={styles.canvasBox}>
                    {result ? (
                        <img src={result} onClick={() => setIsFullScreenOpen(true)} className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30' : 'animate-materialize'}`} />
                    ) : personImage ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                            <img src={personImage.url} className={`max-w-full max-h-full object-contain transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : ''}`} />
                            
                            {/* Garment Shelf Overlay */}
                            {(topGarment || bottomGarment) && !isGenerating && (
                                <div className={styles.garmentShelf}>
                                    {topGarment && <div className={styles.shelfItem}><img src={topGarment.url} className="w-full h-full object-contain" /></div>}
                                    {bottomGarment && <div className={styles.shelfItem}><img src={bottomGarment.url} className="w-full h-full object-contain" /></div>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div onClick={() => document.getElementById('tryon-mobile-upload')?.click()} className="text-center group active:scale-95 transition-all">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-indigo-100">
                                <PixaTryOnIcon className="w-14 h-14" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Model</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Selfie or Full-body</p>
                            <input id="tryon-mobile-upload" type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonImage)} />
                        </div>
                    )}

                    {personImage && !result && !isGenerating && (
                        <button 
                            onClick={handleNewSession}
                            className="absolute top-4 right-4 z-[60] bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-700" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-700">Reset</span>
                        </button>
                    )}
                    
                    {isGenerating && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl">
                            <div className="flex flex-col items-center gap-6 px-10 text-center animate-fadeIn">
                                <div className="relative w-24 h-24 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-50" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                    <div className="absolute"><span className="text-sm font-mono font-black text-white">{Math.round(progressPercent)}%</span></div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] opacity-80">Fabric Scan</span>
                                    <div className="h-px w-8 bg-indigo-500/50 mx-auto my-3" />
                                    <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isGenerating && <div className={styles.weaveScan}><div className={styles.scanLine} /></div>}
                </div>
            </div>

            {/* Controller */}
            <div className="flex-none bg-white overflow-hidden min-h-0 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className={`transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CustomRefineIcon className="w-5 h-5" /> Tailor's Adjustment</button>
                            <div className="grid grid-cols-2 gap-3"><button onClick={handleNewSession} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2">New Shoot</button>
                            <button onClick={() => handleGenerate()} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2">Regenerate</button></div>
                        </div>
                    ) : isLowCredits && personImage ? (
                        <div className="p-6 animate-fadeIn bg-red-50/50 flex flex-col items-center gap-4 rounded-[2rem] border border-red-100 mx-6 mb-6">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-red-100 rounded-full text-red-600">
                                    <LockIcon className="w-5 h-5" />
                                 </div>
                                 <div className="text-left">
                                    <p className="text-sm font-black text-red-900 uppercase tracking-tight">Insufficient Balance</p>
                                    <p className="text-[10px] font-bold text-red-700/70">Tailoring this outfit requires {cost} credits. Your balance: {auth.user?.credits || 0}</p>
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
                        <div className={`flex flex-col transition-all duration-700 ${personImage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
                            <div className="h-[160px] flex items-center relative overflow-hidden">
                                {TRYON_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {TRYON_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!personImage) || (idx === 1 && (!!topGarment || !!bottomGarment)) || (idx === 2 && !!fitType) || (idx === 3 && finishType.length > 0) || (idx === 4 && !!accessories);
                                        
                                        const showNextCue = currentStep === 1 && idx === 2 && (!!topGarment || !!bottomGarment);

                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all">
                                                <span className={`${styles.stepLabel} ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`${styles.stepBar} ${isActive ? 'bg-indigo-600' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                                                <div className="relative h-3 w-full">
                                                    {showNextCue ? (
                                                        <span className="absolute inset-0 text-[8px] font-black text-indigo-600 uppercase tracking-widest animate-flash-next text-center">NEXT</span>
                                                    ) : (
                                                        <span className={`absolute inset-0 text-[7px] font-black transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${idx === 3 || idx === 4 ? 'opacity-100' : isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'} ${((idx === 3 && finishType.length === 0) || (idx === 4 && !accessories)) ? 'text-gray-400' : (idx === 3 || idx === 4) ? 'text-indigo-500' : ''}`}>
                                                            {idx === 0 || idx === 1 ? 'Ready' : 
                                                             idx === 2 ? fitType : 
                                                             idx === 3 ? (finishType.length > 0 ? finishType.join(', ') : 'Optional') : 
                                                             idx === 4 ? (accessories ? (accessories.length > 8 ? accessories.substring(0, 8) + '...' : accessories) : 'Optional') : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title={<div className="flex items-center gap-3"><span>Tailor Refinement</span><div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0"><CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" /><span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span></div></div>}>
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Make the shirt a bit looser, adjust colors to match background..." />
                    
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
                        <button onClick={() => handleRefine(refineText)} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Update Outfit</button>
                    )}
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10">
                        <XIcon className="w-6 h-6" />
                    </button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonImage)} />
            <style>{`
                @keyframes weave-scan { 0% { left: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { left: 100%; opacity: 0; } }
                .animate-weave-scan { animation: weave-scan 3s ease-in-out infinite; }
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes pulse-next { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(1.1); } }
                .animate-flash-next { animation: pulse-next 1.2s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export const TrousersIconCustomComp = TrousersIconCustom;
export default MobileTryOn;
