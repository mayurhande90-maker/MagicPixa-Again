
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View, Creation } from '../../types';
import { 
    PixaEcommerceIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon, RefreshIcon,
    CubeIcon, ApparelIcon, CreditCoinIcon, ImageIcon, UsersIcon,
    MagicWandIcon, ChevronRightIcon, UserIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, downloadImage, urlToBase64, resizeImage } from '../../utils/imageUtils';
import { generateMerchantBatch } from '../../services/merchantService';
import { refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
// @ts-ignore
import JSZip from 'jszip';

const ECOM_STEPS = [
    { id: 'engine', label: 'Engine' },
    { id: 'assets', label: 'Assets' },
    { id: 'intensity', label: 'Size' },
    { id: 'context', label: 'Vibe' },
    { id: 'talent', label: 'Talent' }
];

const PACK_SIZES = [
    { tier: 'Standard', size: 5, sub: 'Essential Shots', costKey: 'Pixa Ecommerce Kit (5 Assets)' },
    { tier: 'Extended', size: 7, sub: 'Creative Mix', costKey: 'Pixa Ecommerce Kit (7 Assets)' },
    { tier: 'Ultimate', size: 10, sub: 'Full Portfolio', costKey: 'Pixa Ecommerce Kit (10 Assets)' }
];

const VIBES = ['Clean Studio', 'Luxury', 'Organic/Nature', 'Tech/Neon', 'Lifestyle'];

const TALENT_AI_PHASES = [
    { id: 'gender', label: 'Persona', options: ['Female', 'Male'] },
    { id: 'ethnicity', label: 'Region', options: ['Indian', 'Asian', 'International', 'African'] },
    { id: 'skinTone', label: 'Skin', options: ['Fair', 'Wheatish', 'Dusky'] },
    { id: 'bodyType', label: 'Build', options: ['Slim', 'Average', 'Athletic', 'Plus Size'] }
];

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
                    <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-bold text-gray-600 group-hover:text-indigo-600 uppercase tracking-wide text-center px-4`}>{uploadText || "Add Photo"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MobileEcommerceKit: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [mode, setMode] = useState<'product' | 'apparel' | null>(null);
    const [mainImage, setMainImage] = useState<{ url: string; base64: any } | null>(null);
    const [packSize, setPackSize] = useState<5 | 7 | 10 | null>(null);
    const [productName, setProductName] = useState('');
    const [vibe, setVibe] = useState('');
    
    // Apparel specifics
    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: any } | null>(null);
    const [talentParams, setTalentParams] = useState<Record<string, string>>({});
    const [talentAiPhase, setTalentAiPhase] = useState(0);

    // Results
    const [results, setResults] = useState<string[]>([]);
    const [activeResultIdx, setActiveResultIdx] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [isZipping, setIsZipping] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = useMemo(() => {
        if (packSize === null) return 0;
        const key = PACK_SIZES.find(p => p.size === packSize)?.costKey || 'Pixa Ecommerce Kit';
        return appConfig?.featureCosts[key] || 25;
    }, [packSize, appConfig]);

    const isLowCredits = (auth.user?.credits || 0) < cost;

    // --- LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!mode;
        if (idx === 2) return !!mainImage;
        if (idx === 3) return packSize !== null;
        if (idx === 4) return !!vibe && !!productName.trim();
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        const base = !!mode && !!mainImage && !!productName.trim() && !!vibe && packSize !== null;
        if (mode === 'apparel') {
            if (modelSource === 'upload') return base && !!modelImage;
            if (modelSource === 'ai') return base && Object.keys(talentParams).length === TALENT_AI_PHASES.length;
            return false;
        }
        return base;
    }, [mode, mainImage, productName, vibe, packSize, modelSource, modelImage, talentParams]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Forensic Audit: Identifying material physics...",
                "Strategic Architect: Planning visual storytelling...",
                "Production Engine: Simulating ray-traced shadows...",
                "Production Engine: Finalizing 8K Global Illumination...",
                "Elite Retoucher: Final pixel polish..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 3), 98);
                });
            }, 2200);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            if (setter === setMainImage) {
                setTimeout(() => setCurrentStep(2), 600);
            }
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!mainImage || !isStrategyComplete || !auth.user || isGenerating) return;
        if (isLowCredits) return;

        onGenerationStart();
        setIsGenerating(true);
        try {
            const outputBase64s = await generateMerchantBatch({
                type: mode!,
                mainImage: mainImage.base64,
                modelImage: modelSource === 'upload' ? modelImage?.base64 : undefined,
                modelParams: modelSource === 'ai' ? { ...talentParams, age: 'Young Adult' } as any : undefined,
                productType: productName,
                productVibe: vibe,
                packSize: packSize as any
            }, auth.activeBrandKit);

            if (!outputBase64s || outputBase64s.length === 0) {
                throw new Error("No images were returned from the engine.");
            }

            const blobUrls = await Promise.all(outputBase64s.map(b64 => base64ToBlobUrl(b64, 'image/jpeg')));
            setResults(blobUrls);
            setActiveResultIdx(0);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Ecommerce Kit (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            for (let i = 0; i < outputBase64s.length; i++) {
                const rawUri = `data:image/jpeg;base64,${outputBase64s[i]}`;
                const storedUri = await resizeImage(rawUri, 1024, 0.7);
                await saveCreation(auth.user.uid, storedUri, `Ecommerce Kit Asset ${i+1}`);
            }
        } catch (e) {
            console.error(e);
            alert("Kit generation failed. Please check your connection and try again.");
            setIsGenerating(false);
        }
    };

    const handleDownloadAll = async () => {
        if (results.length === 0) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const promises = results.map(async (url, idx) => {
                const response = await fetch(url);
                const blob = await response.blob();
                zip.file(`pixa_ecommerce_${idx + 1}.jpg`, blob);
            });
            await Promise.all(promises);
            const content = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `pixa-ecommerce-pack.zip`;
            link.click();
        } catch (e) {
            alert("Zip failed.");
        } finally {
            setIsZipping(false);
        }
    };

    const handleReset = () => {
        setResults([]); setMainImage(null); setModelImage(null); setMode(null);
        setProductName(''); setVibe(''); setCurrentStep(0); setModelSource(null);
        setTalentParams({}); setTalentAiPhase(0); setPackSize(null);
    };

    const getAssetLabel = (idx: number) => {
        const labels = mode === 'apparel' 
            ? ['Hero Portrait', 'Editorial', 'Side Profile', 'Detail', 'Action', 'Atmospheric', 'Macro', 'High-Fashion', 'Candid', 'Minimal']
            : ['Hero Front', 'Perspective', 'Lifestyle', 'Macro Detail', 'Packaging', 'Usage', 'Creative Set', 'Top Down', 'Reflection', 'Shadow Play'];
        return labels[idx] || `Asset ${idx + 1}`;
    };

    const renderStepContent = () => {
        const step = ECOM_STEPS[currentStep].id;
        switch (step) {
            case 'engine':
                return (
                    <div className="w-full flex gap-4 px-6 py-2">
                        <button onClick={() => { setMode('product'); setTimeout(() => setCurrentStep(1), 600); }} className={`flex-1 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${mode === 'product' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><CubeIcon className="w-6 h-6 text-blue-500"/></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Product Pack</span>
                        </button>
                        <button onClick={() => { setMode('apparel'); setTimeout(() => setCurrentStep(1), 600); }} className={`flex-1 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${mode === 'apparel' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><ApparelIcon className="w-6 h-6 text-purple-500"/></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Model Pack</span>
                        </button>
                    </div>
                );
            case 'assets':
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center text-center">
                        <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 w-full max-w-[280px] transition-colors ${mainImage ? 'bg-green-50 border-green-100 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                            {mainImage ? <CheckIcon className="w-4 h-4" /> : <UploadIcon className="w-4 h-4" />}
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                {mainImage ? 'Product Synchronized' : 'Tap canvas to upload'}
                            </p>
                        </div>
                    </div>
                );
            case 'intensity':
                return (
                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {PACK_SIZES.map(p => (
                            <button 
                                key={p.size} 
                                onClick={() => { setPackSize(p.size as any); setTimeout(() => setCurrentStep(3), 600); }} 
                                className={`shrink-0 min-w-[100px] px-5 py-4 rounded-2xl border transition-all duration-300 transform active:scale-95 flex flex-col items-center gap-1 ${packSize === p.size ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                            >
                                <span className="text-[11px] font-black uppercase tracking-wider">{p.tier}</span>
                                <div className="h-px w-6 bg-gray-200 group-hover:bg-indigo-300 my-1"></div>
                                <span className={`text-[9px] font-bold ${packSize === p.size ? 'text-indigo-200' : 'text-gray-400'} uppercase tracking-widest`}>{p.size} Assets</span>
                            </button>
                        ))}
                    </div>
                );
            case 'context':
                return (
                    <div className="w-full px-6 flex flex-col gap-4 py-2">
                        <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-[16px] font-bold focus:border-indigo-500 outline-none shadow-inner" placeholder="Product Name..." />
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {VIBES.map(v => (
                                <button 
                                    key={v} 
                                    onClick={() => { 
                                        if (productName.trim()) {
                                            setVibe(v); 
                                            setTimeout(() => setCurrentStep(4), 600); 
                                        } else {
                                            alert("Please enter product name first.");
                                        }
                                    }} 
                                    className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase border transition-all ${vibe === v ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'talent':
                if (mode === 'product') return (
                    <div className="w-full px-6 flex flex-col items-center justify-center py-4 animate-fadeIn">
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] flex flex-col items-center gap-2 w-full max-w-[280px]">
                            <CheckIcon className="w-6 h-6 text-indigo-600" />
                            <p className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] text-center">Ready for Launch</p>
                        </div>
                    </div>
                );
                
                if (modelSource === 'ai') {
                    const phase = TALENT_AI_PHASES[talentAiPhase];
                    return (
                        <div className="w-full px-6 flex flex-col gap-2 py-2 animate-fadeIn">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{phase.label}</label>
                                <button onClick={() => setModelSource(null)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Change type</button>
                            </div>
                            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                {phase.options.map(opt => (
                                    <button 
                                        key={opt}
                                        onClick={() => {
                                            setTalentParams(prev => ({ ...prev, [phase.id]: opt }));
                                            if (talentAiPhase < TALENT_AI_PHASES.length - 1) {
                                                setTimeout(() => setTalentAiPhase(prev => prev + 1), 600);
                                            }
                                        }}
                                        className={`shrink-0 px-6 py-3 rounded-2xl text-[11px] font-black uppercase border transition-all ${talentParams[phase.id] === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                }

                if (modelSource === 'upload') {
                    return (
                        <div className="w-full px-6 flex flex-col gap-2 py-2 animate-fadeIn">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Digital Twin</label>
                                <button onClick={() => setModelSource(null)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Change type</button>
                            </div>
                            <div className="animate-fadeIn">
                                <PremiumUpload 
                                    label="Person Reference" 
                                    uploadText="Full body photo" 
                                    image={modelImage} 
                                    onUpload={handleUpload(setModelImage)} 
                                    onClear={() => setModelImage(null)} 
                                    icon={<UserIcon className="w-6 h-6 text-blue-400"/>} 
                                    heightClass="h-28" 
                                    compact 
                                />
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="w-full px-6 flex flex-col gap-4 py-2">
                        <div className="flex gap-3">
                            <button onClick={() => { setModelSource('ai'); setTalentAiPhase(0); setTalentParams({}); }} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all bg-white border-gray-100 text-gray-400 hover:border-indigo-200`}>
                                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">AI Model</span>
                            </button>
                            <button onClick={() => setModelSource('upload')} className={`flex-1 py-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all bg-white border-gray-100 text-gray-400 hover:border-indigo-200`}>
                                <UserIcon className="w-5 h-5 text-blue-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">My Model</span>
                            </button>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            <div className="flex-none flex flex-col bg-white z-50">
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <PixaEcommerceIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter text-black">Pixa Ecommerce Kit</span>
                </div>
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!isGenerating && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm min-w-[90px]">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">
                                    {packSize ? `${cost} Credits` : 'Select Pack'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {results.length > 0 && !isGenerating ? (
                            <button onClick={handleDownloadAll} disabled={isZipping} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : results.length === 0 && (
                            <button onClick={handleGenerate} disabled={!isStrategyComplete || isGenerating || isLowCredits} className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating || isLowCredits ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Rendering...' : 'Generate Kit'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 overflow-hidden pb-10">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative bg-gray-50 shadow-inner">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center gap-6 px-10 animate-fadeIn text-center">
                            <div className="relative w-24 h-24 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                                    <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={276.4} strokeDashoffset={276.4 - (276.4 * (progressPercent / 100))} strokeLinecap="round" />
                                </svg>
                                <div className="absolute text-sm font-black text-indigo-900">{Math.round(progressPercent)}%</div>
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-900 opacity-60">Production Pipeline</span>
                                <p className="text-[10px] font-bold text-indigo-600 animate-pulse uppercase tracking-widest">{loadingText}</p>
                            </div>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="w-full h-full flex flex-col animate-fadeIn relative">
                            {/* Main Hero Viewer */}
                            <div className="flex-1 relative flex items-center justify-center p-6 bg-white overflow-hidden" onClick={() => setIsFullScreenOpen(true)}>
                                <img src={results[activeResultIdx]} className="max-w-full max-h-full object-contain drop-shadow-2xl animate-materialize" />
                                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">{getAssetLabel(activeResultIdx)}</div>
                            </div>
                            
                            {/* Immersive Film-strip Overlay */}
                            <div className="absolute bottom-6 left-0 right-0 z-20 px-4">
                                <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-[2.5rem] p-3 shadow-2xl overflow-hidden flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth h-24">
                                    {results.map((res, idx) => (
                                        <button 
                                            key={idx} 
                                            onClick={(e) => { e.stopPropagation(); setActiveResultIdx(idx); }} 
                                            className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-500 ${activeResultIdx === idx ? 'border-indigo-600 scale-110 shadow-lg' : 'border-white/50 opacity-60 grayscale-[0.5]'}`}
                                        >
                                            <img src={res} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                            {!mode ? (
                                <div className="text-center animate-fadeIn px-8 opacity-40">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <PixaEcommerceIcon className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Identity Hub</h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Select Engine below to start</p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <div className="relative w-72 h-80 mx-auto">
                                        {mainImage && (
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`absolute top-0 left-0 w-48 h-64 bg-gray-50 rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white transition-all duration-700 z-10 cursor-pointer ${mode === 'product' || !modelImage ? 'left-1/2 -translate-x-1/2 rotate-0 top-8' : 'rotate-[-6deg]'}`}
                                            >
                                                <img src={mainImage.url} className="w-full h-full object-contain p-4" />
                                                <div className="absolute bottom-4 left-4 bg-indigo-600 text-white text-[8px] font-black px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 uppercase">
                                                    <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                                                    Subject
                                                </div>
                                            </div>
                                        )}
                                        {mode === 'apparel' && modelImage && (
                                            <div className="absolute top-12 right-0 w-48 h-64 bg-gray-50 rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-white transition-all duration-700 z-20 rotate-[6deg] animate-fadeInUp">
                                                <img src={modelImage.url} className="w-full h-full object-cover" />
                                                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md text-white text-[8px] font-black px-3 py-1.5 rounded-full border border-white/10 uppercase">Digital Twin</div>
                                            </div>
                                        )}
                                        {!mainImage && (
                                            <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center h-full gap-4 active:scale-95 transition-transform">
                                                <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl border border-gray-100">
                                                    <PixaEcommerceIcon className="w-10 h-10 text-indigo-400" />
                                                </div>
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Product</h3>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pixa Vision will audit assets</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {mainImage && results.length === 0 && !isGenerating && (
                        <button onClick={handleReset} className="absolute top-4 right-4 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5 active:scale-95 transition-all z-40">
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-700" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-700">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Controller */}
            <div className="flex-none bg-white border-t border-gray-100">
                <div className={`transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {results.length > 0 ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={handleReset} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                    <PlusIcon className="w-4 h-4" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[9px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm">
                                    <RegenerateIcon className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={`flex flex-col transition-all duration-700 ${mode ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}`}>
                            <div className="h-[160px] flex items-center relative overflow-hidden">
                                {ECOM_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent()}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {ECOM_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!mode) || 
                                                        (idx === 1 && !!mainImage) || 
                                                        (idx === 2 && packSize !== null) || 
                                                        (idx === 3 && !!vibe && !!productName.trim()) || 
                                                        (idx === 4 && (mode === 'product' || !!modelSource));
                                        
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all">
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : isAccessible ? 'bg-gray-200' : 'bg-gray-100'}`} />
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {idx === 0 ? mode : idx === 2 ? `${packSize} Assets` : idx === 3 ? vibe : isFilled ? 'Ready' : ''}
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

            {/* Full Screen Viewer */}
            {isFullScreenOpen && results.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <div className="absolute top-10 right-6 flex items-center gap-4 z-50">
                        <button onClick={(e) => { e.stopPropagation(); downloadImage(results[activeResultIdx], 'pixa-ecom.png'); }} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10"><DownloadIcon className="w-6 h-6" /></button>
                        <button onClick={() => setIsFullScreenOpen(false)} className="p-3 bg-white/10 hover:bg-red-50 text-white rounded-full backdrop-blur-md transition-all border border-white/10"><XIcon className="w-6 h-6" /></button>
                    </div>
                    <img src={results[activeResultIdx]} className="max-w-full max-h-full object-contain animate-materialize rounded-lg" />
                </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setMainImage)} />

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileEcommerceKit;
