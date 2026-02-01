import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, Creation } from '../../types';
import { 
    PixaTogetherIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, UserIcon, UsersIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, LocationIcon, EngineIcon, FlagIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage, Base64File } from '../../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../../services/imageToolsService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation, claimMilestoneBonus } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

// --- CONFIGURATION ---

const TOGETHER_STEPS = [
    { id: 'engine', label: 'Engine', options: ['Creative', 'Pose Match'] },
    { id: 'subjects', label: 'Subjects' },
    { id: 'bond', label: 'Bond', options: ['Couple', 'Friends', 'Family', 'Siblings', 'Business'] },
    { id: 'timeline', label: 'Timeline', options: ['Present Day', 'Future Sci-Fi', '1990s Vintage', '1920s Noir', 'Medieval'] },
    { id: 'notes', label: 'Notes' }
];

const TIMELINE_ENVIRONMENTS: Record<string, string[]> = {
    'Present Day': ['Outdoor Park', 'Beach', 'Luxury Rooftop', 'City Street', 'Cozy Home', 'Cafe', 'Deep Forest', 'Modern Studio'],
    'Future Sci-Fi': ['Neon City', 'Space Station', 'Cyberpunk Rooftop', 'Holo-Deck', 'Alien Planet', 'Starship Bridge'],
    '1990s Vintage': ['90s Mall', 'Retro Arcade', 'Grunge Garage', 'Neon Diner', 'Video Store', 'Suburban Street'],
    '1920s Noir': ['Jazz Club', 'Art Deco Hotel', 'Rainy Street', 'Speakeasy', 'Vintage Train', 'Classic Theater'],
    'Medieval': ['Castle Courtyard', 'Throne Room', 'Ancient Forest', 'Stone Village', 'Old Tavern', 'Battlefield']
};

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

interface MobileTogetherProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileTogether: React.FC<MobileTogetherProps> = ({ auth, appConfig, onGenerationStart }) => {
    // --- 1. PRE-INITIALIZE ---
    const cost = appConfig?.featureCosts?.['Pixa Together'] || 8;
    const refineCost = 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // --- 2. STATE ---
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

    const inputARef = useRef<HTMLInputElement>(null);
    const inputBRef = useRef<HTMLInputElement>(null);
    const inputPoseRef = useRef<HTMLInputElement>(null);

    // --- 3. LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!mode;
        if (idx === 2) {
             const photosReady = !!personA && !!personB;
             return mode === 'reenact' ? (photosReady && !!refPose) : photosReady;
        }
        if (idx === 3) return !!relationship;
        if (idx === 4) return !!timeline && !!environment;
        return false;
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

    // Auto-advance for Subjects
    useEffect(() => {
        if (currentStep === 1) {
            const subjectsReady = !!personA && !!personB;
            const ready = mode === 'reenact' ? (subjectsReady && !!refPose) : subjectsReady;
            if (ready) setTimeout(() => setCurrentStep(2), 600);
        }
    }, [personA, personB, refPose, mode, currentStep]);

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
        if (!personA || (!personB) || !auth.user) return;
        if (isLowCredits) {
            alert("Insufficient credits. Required: " + cost);
            return;
        }
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const config: PixaTogetherConfig = {
                mode: mode!,
                relationship,
                mood: 'Happy',
                environment,
                timeline,
                customDescription,
                referencePoseBase64: refPose?.base64.base64,
                referencePoseMimeType: refPose?.base64.mimeType,
                faceStrength: 0.8,
                clothingMode: 'Match Vibe',
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

    const handleRefine = async (refineText: string) => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Duo Portrait");
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
            }
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setResult(null);
        setPersonA(null);
        setPersonB(null);
        setRefPose(null);
        setRelationship('');
        setTimeline('');
        setEnvironment('');
        setCustomDescription('');
        setCurrentStep(0);
        setMode(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) {
            setResult(null);
        } else if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        } else if (mode) {
            setMode(null);
            setPersonA(null);
            setPersonB(null);
            setRefPose(null);
        }
    };

    const handleSelectOption = (stepId: string, option: string) => {
        if (isGenerating) return;
        if (stepId === 'engine') {
            setMode(option === 'Creative' ? 'creative' : 'reenact');
        } else if (stepId === 'bond') {
            setRelationship(option);
        } else if (stepId === 'timeline') {
            setTimeline(option);
            setEnvironment('');
        }

        if (currentStep < TOGETHER_STEPS.length - 1) {
            if (stepId !== 'timeline') {
                setTimeout(() => setCurrentStep(prev => prev + 1), 150);
            }
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        setMilestoneBonus(false);
    };

    // --- 4. RENDER HELPERS ---

    const renderStepContent = (stepId: string) => {
        const activeStep = TOGETHER_STEPS.find(s => s.id === stepId);
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
                                <button 
                                    key={opt} 
                                    onClick={() => handleSelectOption(stepId, opt)} 
                                    className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'subjects':
                const subjectsReady = !!personA && !!personB;
                const totalReady = mode === 'reenact' ? (subjectsReady && !!refPose) : subjectsReady;
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center text-center">
                        <div className={`p-3.5 rounded-2xl border flex items-center justify-center gap-3 w-full max-w-[280px] transition-colors ${totalReady ? 'bg-green-50 border-green-100 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                            {totalReady ? <CheckIcon className="w-4 h-4" /> : <InformationCircleIcon className="w-4 h-4" />}
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                {totalReady ? 'Identities Locked' : 'Tap canvas slots to upload'}
                            </p>
                        </div>
                        {!totalReady && (
                            <p className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                                Pro Tip: Use two clear photos where both of you are looking at the camera.
                            </p>
                        )}
                    </div>
                );
            case 'notes':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input 
                            value={customDescription}
                            onChange={(e) => setCustomDescription(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner"
                            placeholder="Optional: e.g. standing in rain, neon highlights..."
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    // --- 5. MAIN JSX ---

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Command Bar */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50">
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleBack} 
                        className={`p-2 rounded-full transition-all ${mode && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}
                    >
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
                        <button 
                            onClick={() => downloadImage(result, 'together-pro.png')}
                            className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                    ) : !result && (
                        <button 
                            onClick={handleGenerate}
                            disabled={!isStrategyComplete || isGenerating}
                            className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                !isStrategyComplete || isGenerating
                                ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                            }`}
                        >
                            {isGenerating ? 'Syncing...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stage */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${mode ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : !mode ? (
                            <div className="text-center animate-fadeIn px-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <PixaTogetherIcon className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Identity Hub</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Select Engine below to initialize</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center w-full gap-4">
                                <div className="flex gap-4 w-[90%] max-w-[320px] animate-fadeIn">
                                    <button 
                                        onClick={() => inputARef.current?.click()}
                                        className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${personA ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        {personA ? (
                                            <img src={personA.url} className={`w-full h-full object-cover rounded-[1.4rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                        ) : (
                                            <><UserIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300 uppercase">Subject A</span></>
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => inputBRef.current?.click()}
                                        className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${personB ? 'border-pink-500 bg-pink-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        {personB ? (
                                            <img src={personB.url} className={`w-full h-full object-cover rounded-[1.4rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                        ) : (
                                            <><UserIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300 uppercase">Subject B</span></>
                                        )}
                                    </button>
                                </div>
                                {mode === 'reenact' && (
                                    <button 
                                        onClick={() => inputPoseRef.current?.click()}
                                        className={`w-[60%] h-14 border-2 rounded-2xl flex items-center justify-center gap-3 transition-all ${refPose ? 'border-amber-500 bg-amber-50/20' : 'border-gray-100 bg-gray-50'}`}
                                    >
                                        {refPose ? (
                                            <><CheckIcon className="w-4 h-4 text-amber-600"/><span className="text-[9px] font-black text-amber-900 uppercase">Target Pose Set</span></>
                                        ) : (
                                            <><CameraIcon className="w-4 h-4 text-gray-300"/><span className="text-[9px] font-black text-gray-300 uppercase">Upload Reference Pose</span></>
                                        )}
                                    </button>
                                )}
                                <span className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] animate-fadeIn transition-opacity duration-700 ${isGenerating ? 'opacity-0' : ''}`}>
                                    {isGenerating ? 'Identity Locked' : 'Upload Source Selfies'}
                                </span>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Soul Merge</span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controller */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <CustomRefineIcon className="w-5 h-5" /> Refine Merge
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleNewProject} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                    <PlusIcon className="w-4 h-4" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm">
                                    <RegenerateIcon className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {TOGETHER_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {step.id === 'timeline' && timeline ? (
                                            <div className="w-full flex flex-col gap-2 animate-fadeIn">
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 py-2">
                                                    {TOGETHER_STEPS.find(s => s.id === 'timeline')?.options?.map(opt => (
                                                        <button 
                                                            key={opt} 
                                                            onClick={() => handleSelectOption(step.id, opt)} 
                                                            className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${timeline === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-50 text-slate-400 border-slate-100'}`}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar px-6 pb-2">
                                                    {TIMELINE_ENVIRONMENTS[timeline]?.map(env => (
                                                        <button 
                                                            key={env} 
                                                            onClick={() => { setEnvironment(env); setCurrentStep(4); }} 
                                                            className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${environment === env ? 'bg-pink-600 text-white border-pink-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                                                        >
                                                            {env}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>

                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {TOGETHER_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!mode) || 
                                                        (idx === 1 && (mode === 'reenact' ? (!!personA && !!personB && !!refPose) : (!!personA && !!personB))) ||
                                                        (idx === 2 && !!relationship) ||
                                                        (idx === 3 && !!timeline && !!environment) ||
                                                        (idx === 4 && !!customDescription);
                                        
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
                                                    {idx === 0 ? mode : idx === 1 ? 'Ready' : idx === 2 ? relationship : idx === 3 ? environment : idx === 4 ? 'Set' : ''}
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

            {/* Fullscreen & Sheets */}
            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title={
                    <div className="flex items-center gap-3">
                        <span>Identity Refinement</span>
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
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}

            <input ref={inputARef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonA)} />
            <input ref={inputBRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonB)} />
            <input ref={inputPoseRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setRefPose)} />

            {milestoneBonus !== undefined && milestoneBonus !== false && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setMilestoneBonus(false)}>
                    <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-xs p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <SparklesIcon className="w-8 h-8 text-yellow-300 animate-spin-slow" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Milestone!</h2>
                        <p className="text-indigo-100 mb-6 text-xs leading-relaxed">
                            A record number of Duo generations!
                        </p>
                        <div className="bg-white/20 backdrop-blur-md text-white font-black text-3xl py-4 rounded-xl mb-6 border border-white/30">
                            +{milestoneBonus} <span className="text-sm font-bold opacity-80">Credits</span>
                        </div>
                        <button onClick={handleClaimBonus} className="w-full bg-white text-indigo-600 font-bold py-3 rounded-lg hover:bg-indigo-50 transition-all shadow-lg active:scale-95">Collect Bonus</button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileTogether;
