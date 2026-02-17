
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View, BrandKit } from '../../types';
import { 
    MagicAdsIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    PaletteIcon, ChevronRightIcon, CreditCoinIcon, ArrowLeftIcon, 
    LockIcon, CubeIcon, UsersIcon, CameraIcon, ImageIcon,
    DownloadIcon, RegenerateIcon, PlusIcon, RefreshIcon,
    BuildingIcon, ApparelIcon
} from '../../components/icons';
import { 
    FoodIcon, 
    SaaSRequestIcon, 
    EcommerceAdIcon, 
    FMCGIcon, 
    RealtyAdIcon, 
    EducationAdIcon, 
    ServicesAdIcon 
} from '../../components/icons/adMakerIcons';
import { fileToBase64, base64ToBlobUrl, downloadImage, urlToBase64 } from '../../utils/imageUtils';
import { generateAdCreative } from '../../services/adMakerService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { SelectionGrid } from '../../components/FeatureLayout';
import { AdMakerStyles as styles } from '../../styles/features/PixaAdMaker.styles';

const AD_STEPS = [
    { id: 'niche', label: 'Niche' },
    { id: 'engine', label: 'Engine' },
    { id: 'assets', label: 'Assets' },
    { id: 'direction', label: 'Creative' },
    { id: 'copy', label: 'Copy' }
];

const INDUSTRIES = [
    { id: 'ecommerce', label: 'E-Commerce', icon: EcommerceAdIcon, color: 'bg-blue-500' },
    { id: 'fmcg', label: 'FMCG / CPG', icon: FMCGIcon, color: 'bg-green-600' },
    { id: 'fashion', label: 'Fashion', icon: ApparelIcon, color: 'bg-pink-500' },
    { id: 'realty', label: 'Real Estate', icon: RealtyAdIcon, color: 'bg-purple-500' },
    { id: 'food', label: 'Food & Dining', icon: FoodIcon, color: 'bg-orange-500' },
    { id: 'saas', label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'bg-teal-500' },
    { id: 'education', label: 'Education', icon: EducationAdIcon, color: 'bg-amber-500' },
    { id: 'services', label: 'Services', icon: ServicesAdIcon, color: 'bg-indigo-600' },
];

const MOODS = ['Luxury', 'Cinematic', 'Minimalist', 'Vibrant', 'Organic', 'Cyberpunk'];

const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

export const MobileAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [industry, setIndustry] = useState<any>(null);
    const [engineMode, setEngineMode] = useState<'product' | 'subject' | null>(null);
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [logo, setLogo] = useState<{ url: string; base64: any } | null>(null);
    const [vibe, setVibe] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
    const [productName, setProductName] = useState('');
    const [description, setDescription] = useState('');

    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const refineCost = 5;
    const isLowCredits = (auth.user?.credits || 0) < cost;

    // --- LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!industry;
        if (idx === 2) return !!engineMode;
        if (idx === 3) return !!image;
        if (idx === 4) return !!vibe && !!aspectRatio;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        return !!industry && !!engineMode && !!image && !!vibe && !!productName && description.length > 5;
    }, [industry, engineMode, image, vibe, productName, description]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "CMO Researching 2025 Market Trends...",
                "Art Direction: Architecting visual hierarchy...",
                "Optical Audit: Locking product identity...",
                "VFX Architect: Rigging ray-traced physics...",
                "Finalizing: Exporting high-fidelity ad..."
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

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !isStrategyComplete || !auth.user || isGenerating) return;
        if (isLowCredits) return;

        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await generateAdCreative({
                industry: industry.id,
                mainImages: [image.base64],
                logoImage: logo?.base64,
                vibe: vibe,
                productName: productName,
                description: description,
                aspectRatio: aspectRatio,
                layoutTemplate: 'Hero Focus',
                modelSource: engineMode === 'subject' ? 'ai' : null
            }, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa AdMaker');
            setLastCreationId(id);
        } catch (e) {
            console.error(e);
            alert("Ad design failed. Please check your inputs.");
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user || isGenerating) return;
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Advertising Creative");
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

    const handleReset = () => {
        setResult(null); setImage(null); setLogo(null); setIndustry(null); setEngineMode(null);
        setVibe(''); setProductName(''); setDescription(''); setCurrentStep(0);
    };

    const renderStepContent = () => {
        const step = AD_STEPS[currentStep].id;
        switch (step) {
            case 'niche':
                return (
                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
                        {INDUSTRIES.map(ind => (
                            <button key={ind.id} onClick={() => { setIndustry(ind); setCurrentStep(1); }} className={`shrink-0 w-28 h-28 rounded-3xl border flex flex-col items-center justify-center gap-2 transition-all ${industry?.id === ind.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-105' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                <ind.icon className="w-7 h-7" />
                                <span className="text-[10px] font-black uppercase tracking-tight">{ind.label}</span>
                            </button>
                        ))}
                    </div>
                );
            case 'engine':
                return (
                    <div className="w-full flex gap-4 px-6 py-2">
                        <button onClick={() => { setEngineMode('product'); setCurrentStep(2); }} className={`flex-1 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${engineMode === 'product' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><CubeIcon className="w-6 h-6 text-blue-500"/></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Product Ad</span>
                        </button>
                        <button onClick={() => { setEngineMode('subject'); setCurrentStep(2); }} className={`flex-1 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${engineMode === 'subject' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><UsersIcon className="w-6 h-6 text-purple-500"/></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Model Ad</span>
                        </button>
                    </div>
                );
            case 'assets':
                return (
                    <div className="w-full px-6 flex gap-4 py-2">
                        <div onClick={() => fileInputRef.current?.click()} className={`flex-1 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${image ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                            {image ? <CheckIcon className="w-6 h-6"/> : <UploadIcon className="w-6 h-6"/>}
                            <span className="text-[9px] font-black uppercase">{image ? 'Product Set' : 'Product Photo'}</span>
                        </div>
                        <div onClick={() => logoInputRef.current?.click()} className={`flex-1 h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${logo ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                            {logo ? <CheckIcon className="w-6 h-6"/> : <CheckIcon className="w-6 h-6 opacity-30"/>}
                            <span className="text-[9px] font-black uppercase">{logo ? 'Logo Set' : 'Logo (Optional)'}</span>
                        </div>
                    </div>
                );
            case 'direction':
                return (
                    <div className="w-full flex flex-col gap-4 px-6 py-2">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {MOODS.map(m => (
                                <button key={m} onClick={() => setVibe(m)} className={`shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${vibe === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>{m}</button>
                            ))}
                        </div>
                        <div className="flex gap-4 justify-center">
                            {(['1:1', '4:5', '9:16'] as const).map(ratio => (
                                <button key={ratio} onClick={() => { setAspectRatio(ratio); if(vibe) setCurrentStep(4); }} className={`p-3 rounded-xl border-2 transition-all ${aspectRatio === ratio ? 'bg-indigo-50 border-indigo-600 text-indigo-900' : 'bg-white border-gray-100 text-gray-400'}`}>
                                    <div className={`border-2 border-current rounded-sm mx-auto mb-1 ${ratio === '1:1' ? 'w-4 h-4' : ratio === '4:5' ? 'w-4 h-5' : 'w-3 h-6'}`}></div>
                                    <span className="text-[8px] font-black">{ratio}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'copy':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 py-2">
                        <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[15px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Product Name..." />
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[15px] font-medium focus:border-indigo-500 outline-none shadow-inner h-20 resize-none" placeholder="The Hook / Context (e.g. Summer sale vibes)..." />
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* 1. Header */}
            <div className="flex-none flex flex-col bg-white z-50">
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <MagicAdsIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter text-black">Pixa AdMaker</span>
                </div>
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
                            <button onClick={() => downloadImage(result, 'ad-creative.png')} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : !result && (
                            <button onClick={handleGenerate} disabled={!isStrategyComplete || isGenerating || isLowCredits} className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating || isLowCredits ? 'bg-gray-100 text-gray-400 grayscale' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Drafting...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Stage */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 overflow-hidden pb-10">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative bg-gray-50 shadow-inner">
                    <div className="relative w-full h-full flex flex-col items-center justify-center z-10">
                        {result ? (
                            <img src={result} onClick={() => setIsFullScreenOpen(true)} className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30' : 'animate-materialize'}`} />
                        ) : isGenerating ? null : (
                            <div className="relative w-full h-full p-4 flex flex-col items-center justify-center animate-fadeIn">
                                {image ? (
                                    <div className="relative w-72 h-72 animate-fadeIn flex flex-col items-center justify-center">
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent blur-3xl opacity-60"></div>
                                        <div className="relative p-8 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-2xl flex items-center justify-center overflow-hidden">
                                            <img src={image.url} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        {logo && (
                                            <div className="absolute top-0 left-0 w-14 h-14 bg-white rounded-2xl shadow-xl p-2.5 border border-indigo-100 z-20 animate-fadeIn">
                                                <img src={logo.url} className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <div className="mt-8 flex flex-col items-center gap-2">
                                            <div className="px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 shadow-lg">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Asset Sync Active</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div onClick={() => fileInputRef.current?.click()} className="text-center group">
                                        <div className="w-20 h-20 bg-white rounded-[1.8rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                            <UploadIcon className="w-8 h-8 text-indigo-200" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Product</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Pixa Vision will audit lighting</p>
                                    </div>
                                )}
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
                            <div className="absolute inset-0 z-50 flex items-center justify-center animate-fadeIn px-10">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-12 rounded-[3.5rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-10 animate-breathe">
                                    <div className="relative w-24 h-24 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90"><circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/10" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                        <div className="absolute text-sm font-black text-white">{Math.round(progressPercent)}%</div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.4em] opacity-80">Neural Core</span>
                                        <div className="h-px w-8 bg-indigo-500/50 mx-auto my-3" />
                                        <span className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isGenerating && <div className="absolute inset-0 z-40 pointer-events-none"><div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_20px_#6366f1] absolute top-0 left-0 animate-neural-scan opacity-70"></div></div>}
                    </div>
                </div>
            </div>

            {/* 3. Controller (Step Wizard) */}
            <div className="flex-none bg-white border-t border-gray-100">
                <div className={`transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><CustomRefineIcon className="w-5 h-5" /> Refine image</button>
                            <div className="grid grid-cols-2 gap-3"><button onClick={handleReset} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2">New Project</button><button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2">Regenerate</button></div>
                        </div>
                    ) : (
                        <div className={`flex flex-col transition-all duration-700 ${industry ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}`}>
                            <div className="h-[160px] flex items-center relative overflow-hidden">
                                {AD_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent()}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {AD_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!industry) || (idx === 1 && !!engineMode) || (idx === 2 && !!image) || (idx === 3 && !!vibe) || (idx === 4 && !!productName);
                                        
                                        const showNextCue = idx === 2 && !!image && !logo;

                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all">
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`} />
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled || showNextCue ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {idx === 0 ? industry?.label : 
                                                     idx === 1 ? (engineMode === 'product' ? 'Product' : 'Model') : 
                                                     idx === 2 ? (showNextCue ? 'NEXT' : 'Ready') :
                                                     idx === 3 ? vibe : 
                                                     isFilled ? 'Ready' : ''}
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

            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title={<div className="flex items-center gap-3"><span>Ad Refinement</span><div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0"><CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" /><span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span></div></div>}>
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Change the headline text to 'New Arrivals', make the logo slightly bigger..." />
                    <button onClick={handleRefine} disabled={!refineText.trim() || isGenerating} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>Apply Changes</button>
                </div>
            </MobileSheet>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setImage)} />
            <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setLogo)} />

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(255, 255, 255, 0.2); } 50% { transform: scale(1.02); border-color: rgba(255, 255, 255, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileAdMaker;
