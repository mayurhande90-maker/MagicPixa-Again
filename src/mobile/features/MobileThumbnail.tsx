import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    ThumbnailIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, UserIcon, UsersIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, LockIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { generateThumbnail } from '../../services/thumbnailService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

const THUMBNAIL_STEPS = [
    { id: 'category', label: 'Category', options: ['Podcast', 'Entertainment', 'Gaming', 'Vlogs', 'How-to & Style', 'Education', 'Comedy', 'Music', 'Technology', 'Sports', 'Travel & Events'] },
    { id: 'assets', label: 'Assets' },
    { id: 'mood', label: 'Visual Mood', options: ['Viral', 'Cinematic', 'Luxury/Premium', 'Minimalist/Clean', 'Gamer', 'Dark Mystery', 'Retro Style', 'Bright & Natural'] },
    { id: 'context', label: 'Context' },
    { id: 'hook', label: 'The Hook', options: ['Let AI decide the hook', 'Use exact title text'] }
];

// Custom Refine Icon
const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

interface MobileThumbnailProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
    setActiveTab: (tab: View) => void;
}

export const MobileThumbnail: React.FC<MobileThumbnailProps> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- UI State ---
    const [format, setFormat] = useState<'landscape' | 'portrait' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Researching...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    // --- Config State ---
    const [currentStep, setCurrentStep] = useState(0);
    const [category, setCategory] = useState('');
    const [mood, setMood] = useState('');
    const [context, setContext] = useState('');
    const [hookType, setHookType] = useState<'ai' | 'exact' | null>(null);
    const [exactTitle, setExactTitle] = useState('');
    
    // Assets
    const [hostImg, setHostImg] = useState<{ url: string; base64: any } | null>(null);
    const [guestImg, setGuestImg] = useState<{ url: string; base64: any } | null>(null);
    const [subjectImg, setSubjectImg] = useState<{ url: string; base64: any } | null>(null);

    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);

    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;
    const refineCost = 5;
    const isLowCredits = (auth.user?.credits || 0) < cost;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const hostInputRef = useRef<HTMLInputElement>(null);
    const guestInputRef = useRef<HTMLInputElement>(null);

    const isPodcast = category === 'Podcast';

    // Sequential Access Logic
    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!category;
        if (idx === 2) return isPodcast ? (!!hostImg && !!guestImg) : !!subjectImg;
        if (idx === 3) return !!mood;
        if (idx === 4) return context.trim().length >= 5;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        if (!format || !category || !mood || context.trim().length < 5) return false;
        if (isPodcast) {
            if (!hostImg || !guestImg) return false;
        } else {
            if (!subjectImg) return false;
        }
        if (!hookType) return false;
        if (hookType === 'exact' && !exactTitle.trim()) return false;
        return true;
    }, [format, category, mood, context, hostImg, guestImg, subjectImg, hookType, exactTitle, isPodcast]);

    // Auto-advance triggers for Assets
    useEffect(() => {
        if (currentStep === 1) {
            if (isPodcast) {
                if (hostImg && guestImg) {
                    setTimeout(() => setCurrentStep(2), 600);
                }
            } else {
                if (subjectImg) {
                    setTimeout(() => setCurrentStep(2), 600);
                }
            }
        }
    }, [hostImg, guestImg, subjectImg, isPodcast, currentStep]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "CTR Analytics: Researching trending hooks...",
                "Creative Engine: Designing visual hierarchy...",
                "Pixel Forge: Sharpening identity anchors...",
                "Vibe Sync: Applying cinematic grading...",
                "Finalizing: Exporting high-contrast hook..."
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
            }, 1600);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!isStrategyComplete || !auth.user || isGenerating) return;
        
        if (isLowCredits) {
            alert(`Insufficient credits. Required: ${cost}`);
            return;
        }

        onGenerationStart();
        setIsGenerating(true);
        try {
            const finalTitle = hookType === 'exact' ? exactTitle : context;
            const resB64 = await generateThumbnail({
                format: format!,
                category: category,
                mood: mood,
                title: context,
                customText: hookType === 'exact' ? exactTitle : undefined,
                hostImage: isPodcast ? hostImg?.base64 : undefined,
                guestImage: isPodcast ? guestImg?.base64 : undefined,
                subjectImage: !isPodcast ? subjectImg?.base64 : undefined,
                requestId: Math.random().toString(36).substring(7)
            }, auth.activeBrandKit);

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail (Mobile)');
            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Thumbnail Pro');
            setLastCreationId(id);
        } catch (e) {
            console.error(e);
            alert("Thumbnail generation failed.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "YouTube/Social Media Thumbnail");
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
        setFormat(null);
        setCategory('');
        setMood('');
        setContext('');
        setHookType(null);
        setExactTitle('');
        setHostImg(null);
        setGuestImg(null);
        setSubjectImg(null);
        setCurrentStep(0);
        setLastCreationId(null);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) {
            setResult(null);
        } else if (format) {
            if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            } else {
                setFormat(null);
            }
        }
    };

    const handleSelectOption = (stepId: string, option: string) => {
        if (isGenerating) return;
        if (stepId === 'category') {
            setCategory(option);
            setHostImg(null);
            setGuestImg(null);
            setSubjectImg(null);
        } else if (stepId === 'mood') {
            setMood(option);
        } else if (stepId === 'hook') {
            setHookType(option === 'Let AI decide the hook' ? 'ai' : 'exact');
        }

        if (currentStep < THUMBNAIL_STEPS.length - 1) {
            setTimeout(() => setCurrentStep(prev => prev + 1), 150);
        }
    };

    const renderStepContent = (stepId: string) => {
        const activeStep = THUMBNAIL_STEPS[currentStep];
        
        switch (stepId) {
            case 'category':
            case 'mood':
            case 'hook':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStep.options?.map(opt => {
                            const isSelected = (stepId === 'category' && category === opt) || 
                                             (stepId === 'mood' && mood === opt) ||
                                             (stepId === 'hook' && ((hookType === 'ai' && opt === 'Let AI decide the hook') || (hookType === 'exact' && opt === 'Use exact title text')));
                            
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
                    <div className="w-full px-6 flex flex-col justify-center items-center gap-2 animate-fadeIn py-2">
                        <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3 w-full">
                            <InformationCircleIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest leading-relaxed text-center">
                                Tap the canvas areas above <br/> to upload source photos
                            </p>
                        </div>
                    </div>
                );
            case 'context':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2">
                        <textarea 
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner resize-none h-24"
                            placeholder="What is the video about? (Context)..."
                        />
                        <button 
                            disabled={context.trim().length < 5}
                            onClick={() => setCurrentStep(4)} 
                            className="self-end px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30 active:scale-95 mb-2"
                        >
                            Next Step
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header (Stacked Layout) */}
            <div className="flex-none flex flex-col bg-white z-50">
                {/* Top Row: Identity (Solid Black Design) */}
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <ThumbnailIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter pointer-events-none text-black">
                        Pixa Thumbnail Pro
                    </span>
                </div>

                {/* Bottom Row: Commands */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleBack} 
                            className={`p-2 rounded-full transition-all ${format && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        {format && !result && !isGenerating && (
                            <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn">
                                <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button 
                                onClick={() => downloadImage(result, 'thumbnail-pro.png')}
                                className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        ) : !result && (
                            <button 
                                onClick={handleGenerate}
                                disabled={!isStrategyComplete || isGenerating || isLowCredits}
                                className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                    !isStrategyComplete || isGenerating || isLowCredits
                                    ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                    : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                                }`}
                            >
                                {isGenerating ? 'Drafting...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage (Canvas) */}
            <div className="relative flex-grow w-full flex items-center justify-center px-6 pb-6 pt-2 select-none overflow-hidden">
                <div className={`w-full h-full rounded-[2rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${format ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : format ? (
                            <div className="w-full h-full p-4 flex flex-col items-center justify-center">
                                {!category ? (
                                    <div className="text-center animate-fadeIn px-8">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <ThumbnailIcon className="w-10 h-10 text-indigo-400" />
                                        </div>
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Identity Pending</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Select Category below to unlock uploads</p>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center animate-fadeIn">
                                        {isPodcast ? (
                                            <div className="flex gap-4 w-[90%] max-w-[320px] animate-fadeIn">
                                                <button 
                                                    onClick={() => hostInputRef.current?.click()}
                                                    className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${hostImg ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-100 bg-gray-50'}`}
                                                >
                                                    {hostImg ? (
                                                        <img src={hostImg.url} className={`w-full h-full object-contain rounded-[1.4rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                                    ) : (
                                                        <><UserIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300">HOST</span></>
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => guestInputRef.current?.click()}
                                                    className={`flex-1 aspect-[3/4] border-2 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all ${guestImg ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-100 bg-gray-50'}`}
                                                >
                                                    {guestImg ? (
                                                        <img src={guestImg.url} className={`w-full h-full object-contain rounded-[1.4rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                                    ) : (
                                                        <><UsersIcon className="w-8 h-8 text-gray-200"/><span className="text-[8px] font-black text-gray-300">GUEST</span></>
                                                    )}
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`w-[90%] max-w-[320px] aspect-square border-2 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all animate-fadeIn ${subjectImg ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-100 bg-gray-50'}`}
                                            >
                                                {subjectImg ? (
                                                    <img src={subjectImg.url} className={`w-full h-full object-contain rounded-[1.8rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale-[0.3]' : ''}`} />
                                                ) : (
                                                    <><ImageIcon className="w-12 h-12 text-gray-200"/><span className="text-[10px] font-black text-gray-300 tracking-[0.2em]">UPLOAD SUBJECT</span></>
                                                )}
                                            </button>
                                        )}
                                        <div className={`mt-6 flex flex-col items-center gap-1 transition-opacity duration-700 ${isGenerating ? 'opacity-0' : 'opacity-40'}`}>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{format} Slate Ready</span>
                                            <div className="flex gap-1.5 mt-1">
                                                <div className="w-1 h-1 rounded-full bg-indigo-200"></div>
                                                <div className="w-1 h-1 rounded-full bg-indigo-200"></div>
                                                <div className="w-1 h-1 rounded-full bg-indigo-200"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 gap-6 animate-fadeIn">
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">Select Format</h3>
                                <div className="flex gap-4 w-full max-w-sm">
                                    <button onClick={() => setFormat('landscape')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                                            <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider">Landscape</span>
                                            <span className="text-[8px] font-bold text-gray-400 block uppercase mt-0.5">(YouTube)</span>
                                        </div>
                                    </button>
                                    <button onClick={() => setFormat('portrait')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-100 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center shadow-sm">
                                            <div className="w-4 h-6 border-2 border-current rounded-sm"></div>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider">Vertical</span>
                                            <span className="text-[8px] font-bold text-gray-400 block uppercase mt-0.5">(Instagram)</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Rendering Overlay */}
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
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Hook Factory</span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isGenerating && <div className="absolute inset-0 z-40 pointer-events-none"><div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1] absolute top-0 left-0 animate-neural-scan opacity-80"></div></div>}
                    </div>
                </div>
            </div>

            {/* Controller (Bottom Tray) */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CustomRefineIcon className="w-5 h-5" /> Refine image</button>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleNewProject} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                    <PlusIcon className="w-4 h-4" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm">
                                    <RegenerateIcon className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : isLowCredits && format ? (
                        <div className="p-6 animate-fadeIn bg-red-50/50 flex flex-col items-center gap-4 rounded-[2rem] border border-red-100 mx-6 mb-6">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-red-100 rounded-full text-red-600">
                                    <LockIcon className="w-5 h-5" />
                                 </div>
                                 <div className="text-left">
                                    <p className="text-sm font-black text-red-900 uppercase tracking-tight">Insufficient Balance</p>
                                    <p className="text-[10px] font-bold text-red-700/70">Generating this hook requires {cost} credits. Your balance: {auth.user?.credits || 0}</p>
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
                        <div className={`flex flex-col transition-all duration-700 ${format ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}`}>
                            {/* Step Container - Fixed Height increased to 170px to accommodate next button */}
                            <div className="h-[170px] flex items-center relative overflow-hidden">
                                {THUMBNAIL_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                        {step.id === 'hook' && (
                                            <div className="px-6 pb-2 animate-fadeIn">
                                                {hookType === 'exact' && (
                                                    <input 
                                                        value={exactTitle}
                                                        onChange={e => setExactTitle(e.target.value)}
                                                        className="w-full p-4 bg-gray-50 border-2 border-indigo-100 rounded-2xl text-[16px] font-black uppercase tracking-widest focus:border-indigo-500 outline-none"
                                                        placeholder="Enter exact title text..."
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Nav Bar (Tiers) */}
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {THUMBNAIL_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!category) || 
                                                        (idx === 1 && (isPodcast ? (!!hostImg && !!guestImg) : !!subjectImg)) ||
                                                        (idx === 2 && !!mood) ||
                                                        (idx === 3 && context.trim().length >= 5) ||
                                                        (idx === 4 && !!hookType);
                                        
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
                                                    {idx === 0 ? category : idx === 2 ? mood : isFilled ? 'Ready' : ''}
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

            {/* Refinement Sheet */}
            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title={
                    <div className="flex items-center gap-3">
                        <span>CTR Refinement</span>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0">
                            <CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-[16px] font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Make the text yellow and bigger, add more rim light..." />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button>
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}

            {/* Hidden Inputs */}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setSubjectImg)} />
            <input ref={hostInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setHostImg)} />
            <input ref={guestInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setGuestImg)} />

            <style>{`
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
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

export default MobileThumbnail;
