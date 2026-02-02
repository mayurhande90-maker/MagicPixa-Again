
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, Page, View } from '../../types';
import { 
    PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon, UploadIcon, CheckIcon, LockIcon, UsersIcon, EngineIcon, BuildingIcon, DocumentTextIcon, ArrowLeftIcon, DownloadIcon, RegenerateIcon, PlusIcon, ImageIcon
} from '../../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../../services/imageToolsService';
import { refineStudioImage } from '../../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

// --- CONFIGURATION CONSTANTS ---

const TIMELINE_ENVIRONMENTS: Record<string, string[]> = {
    'Present Day': ['Outdoor Park', 'Beach', 'Luxury Rooftop', 'City Street', 'Cozy Home', 'Cafe', 'Deep Forest', 'Modern Studio', 'Snowy Mountain', 'Sunset Beach'],
    'Future Sci-Fi': ['Neon City', 'Space Station', 'Cyberpunk Rooftop', 'Holo-Deck', 'Alien Planet', 'Starship Bridge', 'Crystal Forest', 'High-Tech Lab'],
    '1990s Vintage': ['90s Mall', 'Retro Arcade', 'Grunge Garage', 'Neon Diner', 'Video Store', 'High School Hallway', 'Suburban Street', 'Vintage Bedroom'],
    '1920s Noir': ['Jazz Club', 'Art Deco Hotel', 'Rainy Street', 'Speakeasy', 'Vintage Train', 'Gatsby Mansion', 'Smoky Bar', 'Classic Theater'],
    'Medieval': ['Castle Courtyard', 'Throne Room', 'Ancient Forest', 'Stone Village', 'Old Tavern', 'Battlefield', 'Mystic Ruins', 'Royal Garden']
};

// Local helper to track milestones for rewarding credits
const checkMilestoneLocal = (gens: number): number | false => {
    if (gens === 10) return 5;
    if (gens === 25) return 10;
    if (gens === 50) return 15;
    if (gens === 75) return 20;
    if (gens === 100) return 30;
    if (gens > 100 && gens % 100 === 0) return 30;
    return false;
};

// Custom Refine Icon component
const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

// --- PREMIUM UI COMPONENTS ---

const PremiumUpload: React.FC<{ label: string; uploadText?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; compact?: boolean; }> = ({ label, uploadText, image, onUpload, onClear, icon, heightClass = "h-40", compact }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">{label}</label>
                {image && <CheckIcon className="w-3 h-3 text-green-500"/>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-gray-50 rounded-2xl border border-indigo-100 flex items-center justify-center overflow-hidden group-hover:border-indigo-300 transition-all shadow-inner`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1 transition-transform duration-500 group-hover:scale-105" alt={label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-1.5">
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white/90 p-1.5 rounded-lg shadow-lg text-gray-500 hover:text-red-500 active:scale-90 transition-all backdrop-blur-sm"><XIcon className="w-3.5 h-3.5"/></button>
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-200 bg-white hover:bg-indigo-50/30 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group`}>
                    <div className={`${compact ? 'p-2' : 'p-3'} bg-gray-50 group-hover:bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-all text-gray-400 group-hover:text-indigo-500 border border-gray-100`}>{icon}</div>
                    <p className={`${compact ? 'text-[9px]' : 'text-xs'} font-bold text-gray-600 group-hover:text-indigo-600 uppercase tracking-wide text-center px-4`}>{uploadText || "Add Photo"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

interface MobileTogetherProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileTogether: React.FC<MobileTogetherProps> = ({ auth, appConfig, onGenerationStart }) => {
    // --- 1. STATE ---
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | false>(false);

    const [currentStep, setCurrentStep] = useState(0);
    const [mode, setMode] = useState<'creative' | 'reenact' | null>(null);
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [refPose, setRefPose] = useState<{ url: string; base64: Base64File } | null>(null);
    const [relationship, setRelationship] = useState('');
    const [timeline, setTimeline] = useState('');
    const [environment, setEnvironment] = useState('');
    const [customDescription, setCustomDescription] = useState('');

    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    // Fixed typo from previous implementation
    const inputARef = useRef<HTMLInputElement>(null);
    const inputBRef = useRef<HTMLInputElement>(null);
    const inputPoseRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts?.['Pixa Together'] || appConfig?.featureCosts?.['Magic Soul'] || 8;
    const refineCost = 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // --- 2. DYNAMIC STEPS ---
    const activeSteps = useMemo(() => {
        const steps = [
            { id: 'engine', label: 'Engine', options: ['Creative', 'Pose Match'] },
            { id: 'subjects', label: 'People' }
        ];
        if (mode === 'reenact') {
            steps.push({ id: 'pose_ref', label: 'Pose' });
        }
        steps.push(
            { id: 'bond', label: 'Bond', options: ['Couple', 'Friends', 'Family', 'Siblings', 'Business'] },
            { id: 'timeline', label: 'Scene', options: ['Present Day', 'Future Sci-Fi', '1990s Vintage', '1920s Noir', 'Medieval'] },
            { id: 'notes', label: 'Notes' }
        );
        return steps;
    }, [mode]);

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        const prevStep = activeSteps[idx - 1];
        if (!prevStep) return false;

        switch (prevStep.id) {
            case 'engine': return !!mode;
            case 'subjects': return !!personA && !!personB;
            case 'pose_ref': return !!refPose;
            case 'bond': return !!relationship;
            case 'timeline': return !!timeline && !!environment;
            default: return true;
        }
    };

    const isStrategyComplete = useMemo(() => {
        if (!mode || !personA || !personB || !relationship || !timeline || !environment) return false;
        if (mode === 'reenact' && !refPose) return false;
        return true;
    }, [mode, personA, personB, refPose, relationship, timeline, environment]);

    // Progress Animation
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Forensic Analyst: Scanning facial biometrics...", 
                "Identity Lock: Mapping bone topology...", 
                "VFX Architect: Rigging interaction physics...", 
                "Production: Calculating global illumination...", 
                "Production: Simulating sub-surface scattering...",
                "Finalizing: Rendering 8K Masterpiece..."
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
        const currentId = activeSteps[currentStep]?.id;
        if (currentId === 'subjects' && personA && personB) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 600);
        } else if (currentId === 'pose_ref' && refPose) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 600);
        }
    }, [personA, personB, refPose, currentStep, activeSteps]);

    // --- 3. HANDLERS ---

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user || isGenerating) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const config: PixaTogetherConfig = {
                mode: mode!,
                relationship, mood: 'Happy', environment, timeline, customDescription,
                referencePoseBase64: refPose?.base64.base64,
                referencePoseMimeType: refPose?.base64.mimeType,
                faceStrength: 0.8, clothingMode: 'Match Vibe',
                locks: { age: true, hair: true, accessories: false },
                autoFix: true
            };

            const resB64 = await generateMagicSoul(personA!.base64.base64, personA!.base64.mimeType, personB!.base64.base64, personB!.base64.mimeType, config, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Together');
            setLastCreationId(id);

            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestoneLocal(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) {
            console.error(e);
            alert("Generation failed. Please try clearer face photos.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async (text: string) => {
        if (!result || !text.trim() || !auth.user || isGenerating) return;
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, text, "Duo Portrait");
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);
            if (lastCreationId) await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            alert("Refinement failed.");
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setResult(null); setPersonA(null); setPersonB(null); setRefPose(null);
        setRelationship(''); setTimeline(''); setEnvironment(''); setCustomDescription('');
        setCurrentStep(0); setMode(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) setResult(null);
        else if (currentStep > 0) setCurrentStep(prev => prev - 1);
        else if (mode) setMode(null);
    };

    const handleSelectOption = (stepId: string, option: string) => {
        if (isGenerating) return;
        if (stepId === 'engine') setMode(option === 'Creative' ? 'creative' : 'reenact');
        else if (stepId === 'bond') setRelationship(option);
        else if (stepId === 'timeline') {
            setTimeline(option);
            setEnvironment('');
        }

        if (currentStep < activeSteps.length - 1 && stepId !== 'timeline') {
            setTimeout(() => setCurrentStep(prev => prev + 1), 150);
        }
    };

    // --- 4. RENDERERS ---

    const renderStepContent = (stepId: string) => {
        const activeStep = activeSteps[currentStep];
        if (!activeStep) return null;
        
        switch (stepId) {
            case 'engine':
            case 'bond':
            case 'timeline':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStep.options?.map(opt => {
                            const isSelected = (stepId === 'engine' && ((mode === 'creative' && opt === 'Creative') || (mode === 'reenact' && opt === 'Pose Match'))) ||
                                             (stepId === 'bond' && relationship === opt) ||
                                             (stepId === 'timeline' && timeline === opt);
                            return (
                                <button key={opt} onClick={() => handleSelectOption(stepId, opt)} className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'subjects':
                return (
                    <div className="w-full px-6 flex gap-4 animate-fadeIn py-2 items-center h-full">
                        <PremiumUpload label="Person A" image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-5 h-5 text-indigo-400"/>} heightClass="h-28" compact />
                        <PremiumUpload label="Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-5 h-5 text-pink-400"/>} heightClass="h-28" compact />
                    </div>
                );
            case 'pose_ref':
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center h-full">
                        <PremiumUpload label="Pose Architecture" uploadText="Add Pose Reference" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<CameraIcon className="w-6 h-6 text-amber-500"/>} heightClass="h-28" />
                    </div>
                );
            case 'notes':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Optional notes for AI..." />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header (Stacked Layout) */}
            <div className="flex-none flex flex-col bg-white z-50">
                {/* Top Row: Identity (Gradient Text Design) */}
                <div className="pt-4 pb-1 flex justify-center">
                    <span className="text-[11px] font-black uppercase tracking-widest pointer-events-none text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                        Pixa Together
                    </span>
                </div>

                {/* Bottom Row: Commands */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={handleBack} className={`p-2 rounded-full transition-all ${mode && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}>
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        {mode && !result && !isGenerating && (
                            <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn">
                                <CreditCoinIcon className="w-3 h-3 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button onClick={() => downloadImage(result, 'together.png')} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : !result && (
                            <button onClick={handleGenerate} disabled={!isStrategyComplete || isGenerating} className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Syncing...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${mode ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img src={result} onClick={() => !isGenerating && setIsFullScreenOpen(true)} className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} />
                        ) : !mode ? (
                            <div className="text-center animate-fadeIn px-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><PixaTogetherIcon className="w-10 h-10 text-indigo-400" /></div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Identity Hub</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Select Engine below to initialize</p>
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                <div className="relative w-64 h-80">
                                    <div 
                                        onClick={() => !isGenerating && inputARef.current?.click()}
                                        className={`absolute top-0 left-0 w-44 h-60 bg-gray-50 rounded-2xl overflow-hidden shadow-xl border-4 border-white transition-all duration-700 z-10 cursor-pointer ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : personA ? 'scale-100 rotate-[-6deg]' : 'scale-90 opacity-40 grayscale border-dashed border-gray-200'}`}
                                    >
                                        {personA ? <img src={personA.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-10 h-10 text-gray-200" /></div>}
                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-black px-2 py-1 rounded backdrop-blur-sm uppercase">Subject A</div>
                                    </div>
                                    <div 
                                        onClick={() => !isGenerating && inputBRef.current?.click()}
                                        className={`absolute top-12 right-0 w-44 h-60 bg-gray-50 rounded-2xl overflow-hidden shadow-xl border-4 border-white transition-all duration-700 z-20 cursor-pointer ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : personB ? 'scale-100 rotate-[6deg]' : 'scale-90 opacity-40 grayscale border-dashed border-gray-200'}`}
                                    >
                                        {personB ? <img src={personB.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><UserIcon className="w-10 h-10 text-gray-200" /></div>}
                                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[8px] font-black px-2 py-1 rounded backdrop-blur-sm uppercase">Subject B</div>
                                    </div>
                                    {mode === 'reenact' && (
                                        <div 
                                            onClick={() => !isGenerating && inputPoseRef.current?.click()}
                                            className={`absolute -bottom-4 right-0 w-32 h-44 bg-white rounded-xl shadow-2xl border-4 border-amber-500/30 transition-all duration-700 z-30 transform cursor-pointer ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : refPose ? 'scale-100 rotate-[-3deg]' : 'scale-75 opacity-40 grayscale rotate-[-3deg]'}`}>
                                            {refPose ? <img src={refPose.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><CameraIcon className="w-8 h-8 text-gray-200" /></div>}
                                            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm">Target Pose</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {isGenerating && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                        <div className="absolute"><span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span></div>
                                    </div>
                                    <div className="text-center"><span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Soul Merge</span><div className="h-px w-8 bg-indigo-500/50 mx-auto my-3" /><span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span></div>
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
                    ) : (
                        <div className="flex flex-col">
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {activeSteps.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {step.id === 'timeline' && timeline ? (
                                            <div className="w-full flex flex-col gap-2 animate-fadeIn">
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 py-1">
                                                    {step.options?.map(opt => (
                                                        <button key={opt} onClick={() => handleSelectOption(step.id, opt)} className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${timeline === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-slate-400 border-slate-100'}`}>{opt}</button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 pb-2">
                                                    {TIMELINE_ENVIRONMENTS[timeline]?.map(env => (
                                                        <button key={env} onClick={() => { setEnvironment(env); setCurrentStep(idx + 1); }} className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${environment === env ? 'bg-pink-600 text-white border-pink-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>{env}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>

                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {activeSteps.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (step.id === 'engine' && !!mode) || (step.id === 'subjects' && !!personA && !!personB) || (step.id === 'pose_ref' && !!refPose) || (step.id === 'bond' && !!relationship) || (step.id === 'timeline' && !!timeline && !!environment);
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed'}`}>
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : isAccessible ? 'bg-gray-200' : 'bg-gray-100'}`}></div>
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {step.id === 'engine' ? mode : step.id === 'subjects' ? 'Ready' : step.id === 'pose_ref' ? 'Locked' : step.id === 'bond' ? relationship : step.id === 'timeline' ? environment : ''}
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

            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title={
                    <div className="flex items-center gap-3">
                        <span>Together Refinement</span>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0">
                            <CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[16px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Make us smile more, change the lighting to sunset..." />
                    <button onClick={() => handleRefine(refineText)} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button>
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

            {/* Hidden Inputs for Canvas Interaction */}
            <input ref={inputARef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonA)} />
            <input ref={inputBRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonB)} />
            <input ref={inputPoseRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setRefPose)} />

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

export default MobileTogether;
