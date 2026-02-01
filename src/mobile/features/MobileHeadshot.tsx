import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, Creation } from '../../types';
import { 
    PixaHeadshotIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, UserIcon, UsersIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, LocationIcon
} from '../../components/icons';
import { 
    CorporateExecutiveIcon, 
    TechFounderIcon, 
    CreativeDirectorIcon, 
    MedicalProIcon, 
    LegalFinanceIcon, 
    RealtorSalesIcon 
} from '../../components/icons/headshotIcons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage, Base64File } from '../../utils/imageUtils';
import { generateProfessionalHeadshot } from '../../services/headshotService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation, claimMilestoneBonus } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

// --- CONFIGURATION ---

const HEADSHOT_STEPS = [
    { id: 'mode', label: 'Mode', options: ['Individual', 'Duo'] },
    { id: 'assets', label: 'Assets' },
    { id: 'archetype', label: 'Style', options: ['Executive', 'Tech', 'Creative', 'Medical', 'Legal', 'Realtor'] },
    { id: 'background', label: 'Scene' },
    { id: 'notes', label: 'Notes' }
];

const ARCHETYPES = [
    { id: 'Executive', label: 'Corporate', icon: <CorporateExecutiveIcon className="w-6 h-6"/> },
    { id: 'Tech', label: 'Founder', icon: <TechFounderIcon className="w-6 h-6"/> },
    { id: 'Creative', label: 'Creative', icon: <CreativeDirectorIcon className="w-6 h-6"/> },
    { id: 'Medical', label: 'Medical', icon: <MedicalProIcon className="w-6 h-6"/> },
    { id: 'Legal', label: 'Legal', icon: <LegalFinanceIcon className="w-6 h-6"/> },
    { id: 'Realtor', label: 'Realtor', icon: <RealtorSalesIcon className="w-6 h-6"/> }
];

const PERSONA_BACKGROUNDS: Record<string, string[]> = {
    'Executive': ['Studio Photoshoot', 'Modern Office', 'Meeting Room', 'Building Lobby', 'Personal Cabin'],
    'Tech': ['Studio Photoshoot', 'Startup Office', 'Server Room', 'Cool Lounge', 'City Street'],
    'Creative': ['Studio Photoshoot', 'Art Studio', 'Photo Gallery', 'Modern Loft', 'Green Garden'],
    'Medical': ['Studio Photoshoot', 'Clean Clinic', 'Doctor\'s Room', 'Bright Studio', 'Health Center'],
    'Legal': ['Studio Photoshoot', 'Book Library', 'Classic Boardroom', 'Formal Office', 'Courthouse'],
    'Realtor': ['Studio Photoshoot', 'Living Room', 'Modern Kitchen', 'Outside House', 'Nice Street']
};

// --- LOCAL HELPERS ---

const checkMilestoneLocal = (gens: number): number | false => {
    if (gens === 10) return 5;
    if (gens === 25) return 10;
    if (gens === 50) return 15;
    if (gens === 100) return 30;
    return false;
};

const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

interface MobileHeadshotProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileHeadshot: React.FC<MobileHeadshotProps> = ({ auth, appConfig, onGenerationStart }) => {
    // --- 1. PRE-INITIALIZE CONSTANTS (Prevents TDZ Crash) ---
    const cost = appConfig?.featureCosts?.['Pixa Headshot Pro'] || 4;
    const refineCost = 2;
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
    const [mode, setMode] = useState<'individual' | 'duo'>('individual');
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [partnerImage, setPartnerImage] = useState<{ url: string; base64: Base64File } | null>(null);
    // FIXED: Styled (Archetype) initialized as empty string so user must select it.
    const [archetype, setArchetype] = useState('');
    const [background, setBackground] = useState('');
    const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const partnerInputRef = useRef<HTMLInputElement>(null);

    // --- 3. LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!mode;
        if (idx === 2) return mode === 'individual' ? !!image : (!!image && !!partnerImage);
        if (idx === 3) return !!archetype;
        if (idx === 4) return !!background;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        if (!mode || !archetype || !background) return false;
        if (mode === 'individual' && !image) return false;
        if (mode === 'duo' && (!image || !partnerImage)) return false;
        return true;
    }, [mode, image, partnerImage, archetype, background]);

    // Progress Animation
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Biometric Audit: Analyzing skin geometry...",
                "Identity Lock: Mapping ocular patterns...",
                "Studio Engine: Calibrating lighting rig...",
                "Fabric Engine: Simulating suit drape...",
                "Finalizing: Polishing 4K portrait..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 6), 98);
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Auto-advance triggers for Assets
    useEffect(() => {
        if (currentStep === 1) {
            if (mode === 'individual') {
                if (image) setTimeout(() => setCurrentStep(2), 600);
            } else {
                if (image && partnerImage) setTimeout(() => setCurrentStep(2), 600);
            }
        }
    }, [image, partnerImage, mode, currentStep]);

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
        if (!isStrategyComplete || !auth.user || isGenerating) return;
        if (isLowCredits) {
            alert("Insufficient credits. Required: " + cost);
            return;
        }
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await generateProfessionalHeadshot(
                image!.base64.base64, 
                image!.base64.mimeType, 
                archetype, 
                background === 'Custom' ? customBackgroundPrompt : background, 
                customDesc, 
                mode === 'duo' ? partnerImage?.base64.base64 : undefined, 
                mode === 'duo' ? partnerImage?.base64.mimeType : undefined
            );

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Headshot (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Headshot Pro');
            setLastCreationId(id);

            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestoneLocal(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) {
            console.error(e);
            alert("Generation failed. Please try a clearer photo.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Professional Headshot");
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
        setImage(null);
        setPartnerImage(null);
        setArchetype('');
        setBackground('');
        setCustomBackgroundPrompt('');
        setCustomDesc('');
        setCurrentStep(0);
        setLastCreationId(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) {
            setResult(null);
        } else if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        } else if (image || partnerImage) {
            setImage(null);
            setPartnerImage(null);
        }
    };

    const handleSelectOption = (stepId: string, option: string) => {
        if (isGenerating) return;
        if (stepId === 'mode') {
            setMode(option.toLowerCase() as any);
            setImage(null);
            setPartnerImage(null);
        } else if (stepId === 'archetype') {
            setArchetype(option);
            setBackground('');
            setCustomBackgroundPrompt('');
        }

        if (currentStep < HEADSHOT_STEPS.length - 1) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 150);
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
        const activeStep = HEADSHOT_STEPS[currentStep];
        
        switch (stepId) {
            case 'mode':
            case 'archetype':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStep.options?.map(opt => {
                            const isSelected = (stepId === 'mode' && mode === opt.toLowerCase()) || 
                                             (stepId === 'archetype' && archetype === opt);
                            
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
            case 'assets':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        {mode === 'individual' ? (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${image ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-indigo-600 text-white border border-indigo-600'}`}
                            >
                                <UploadIcon className="w-5 h-5" /> {image ? 'Change Photo' : 'Select Your Photo'}
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 active:scale-95 ${image ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-gray-400 border-gray-100'}`}
                                >
                                    <UserIcon className="w-4 h-4" /> {image ? 'Subject A OK' : 'Photo A'}
                                </button>
                                <button 
                                    onClick={() => partnerInputRef.current?.click()}
                                    className={`py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 active:scale-95 ${partnerImage ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-gray-400 border-gray-100'}`}
                                >
                                    <UserIcon className="w-4 h-4" /> {partnerImage ? 'Subject B OK' : 'Photo B'}
                                </button>
                            </div>
                        )}
                        <p className="text-[9px] text-gray-400 font-medium text-center uppercase tracking-wider">
                            Identity Lock 4.0 performs best with clear frontal selfies.
                        </p>
                    </div>
                );
            case 'background':
                return (
                    <div className="w-full flex flex-col gap-4">
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                            {(PERSONA_BACKGROUNDS[archetype] || []).map(bg => {
                                const isSelected = background === bg;
                                return (
                                    <button 
                                        key={bg} 
                                        onClick={() => { setBackground(bg); setCurrentStep(4); }} 
                                        className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                                    >
                                        {bg}
                                    </button>
                                );
                            })}
                            <button 
                                onClick={() => setBackground('Custom')} 
                                className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${background === 'Custom' ? 'bg-pink-600 text-white border-pink-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                            >
                                Custom
                            </button>
                        </div>
                        {background === 'Custom' && (
                            <div className="px-6 animate-fadeInUp">
                                <input 
                                    className="w-full p-4 bg-white border border-indigo-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none shadow-sm"
                                    placeholder="Describe custom scene (e.g. Modern library at night)..."
                                    value={customBackgroundPrompt}
                                    onChange={e => setCustomBackgroundPrompt(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                );
            case 'notes':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <input 
                            value={customDesc}
                            onChange={(e) => setCustomDesc(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner"
                            placeholder="Optional: e.g. slight smile, blue suit..."
                        />
                        <p className="text-[9px] text-gray-400 italic px-1">Identity Lock 4.0 ensures 1:1 facial recognition.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    // --- 5. MAIN JSX ---

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header Command Bar */}
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
                            onClick={() => downloadImage(result, 'headshot-pro.png')}
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
                            {isGenerating ? 'Rendering...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stage Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${mode ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : mode === 'individual' ? (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-[85%] aspect-square border-2 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all ${image ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                            >
                                {image ? (
                                    <img src={image.url} className={`w-full h-full object-cover rounded-[1.8rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                ) : (
                                    <><UserIcon className="w-12 h-12 text-gray-200"/><span className="text-[10px] font-black text-gray-300 tracking-[0.2em]">UPLOAD SELFIE</span></>
                                )}
                            </button>
                        ) : (
                            <div className="flex gap-4 w-[90%] max-w-[320px] animate-fadeIn">
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${image ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                                >
                                    {image ? (
                                        <img src={image.url} className="w-full h-full object-cover rounded-[1.4rem]" />
                                    ) : (
                                        <><UserIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300">SUBJECT A</span></>
                                    )}
                                </button>
                                <button 
                                    onClick={() => partnerInputRef.current?.click()}
                                    className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${partnerImage ? 'border-pink-500 bg-pink-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                                >
                                    {partnerImage ? (
                                        <img src={partnerImage.url} className="w-full h-full object-cover rounded-[1.4rem]" />
                                    ) : (
                                        <><UserIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300">SUBJECT B</span></>
                                    )}
                                </button>
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
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Identity Lock</span>
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

            {/* Controller Area */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <CustomRefineIcon className="w-5 h-5" /> Refine portrait
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
                                {HEADSHOT_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>

                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {HEADSHOT_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!mode) || 
                                                        (idx === 1 && (mode === 'individual' ? !!image : (!!image && !!partnerImage))) ||
                                                        (idx === 2 && !!archetype) ||
                                                        (idx === 3 && !!background);
                                        
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
                                                    {idx === 0 ? mode : idx === 2 ? archetype : idx === 3 ? 'Set' : ''}
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

            {/* Modals & Sheets */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="Headshot Refinement">
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[16px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Adjust hair color to slightly darker, make the lighting softer..." />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button>
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setImage)} />
            <input ref={partnerInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPartnerImage)} />

            {milestoneBonus !== undefined && milestoneBonus !== false && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={() => setMilestoneBonus(false)}>
                    <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-xs p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                            <SparklesIcon className="w-8 h-8 text-yellow-300 animate-spin-slow" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">Milestone!</h2>
                        <p className="text-indigo-100 mb-6 text-xs leading-relaxed">
                            You've hit a record number of generations.
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

export default MobileHeadshot;
