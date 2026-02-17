
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View, Creation } from '../../types';
import { 
    PixaEcommerceIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RegenerateIcon, PlusIcon, RefreshIcon,
    CubeIcon, ApparelIcon, CreditCoinIcon, ImageIcon, UsersIcon,
    // Fix: Removed missing CheckCircleIcon and added required UserIcon
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
    { size: 5, label: 'Standard (5)', costKey: 'Pixa Ecommerce Kit (5 Assets)' },
    { size: 7, label: 'Extended (7)', costKey: 'Pixa Ecommerce Kit (7 Assets)' },
    { size: 10, label: 'Ultimate (10)', costKey: 'Pixa Ecommerce Kit (10 Assets)' }
];

const VIBES = ['Clean Studio', 'Luxury', 'Organic/Nature', 'Tech/Neon', 'Lifestyle'];

const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

export const MobileEcommerceKit: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [mode, setMode] = useState<'product' | 'apparel' | null>(null);
    const [mainImage, setMainImage] = useState<{ url: string; base64: any } | null>(null);
    const [packSize, setPackSize] = useState<5 | 7 | 10>(5);
    const [productName, setProductName] = useState('');
    const [vibe, setVibe] = useState('');
    
    // Apparel specifics
    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: any } | null>(null);
    const [talentParams, setTalentParams] = useState({ gender: '', ethnicity: '', skinTone: '', bodyType: '' });

    // Results
    const [results, setResults] = useState<string[]>([]);
    const [activeResultIdx, setActiveResultIdx] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [isZipping, setIsZipping] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const modelInputRef = useRef<HTMLInputElement>(null);

    const cost = useMemo(() => {
        const key = PACK_SIZES.find(p => p.size === packSize)?.costKey || 'Pixa Ecommerce Kit';
        return appConfig?.featureCosts[key] || 25;
    }, [packSize, appConfig]);

    const isLowCredits = (auth.user?.credits || 0) < cost;

    // --- LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!mode;
        if (idx === 2) return !!mainImage;
        if (idx === 3) return !!packSize;
        if (idx === 4) return mode === 'apparel' && !!productName && !!vibe;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        const base = !!mode && !!mainImage && !!productName && !!vibe;
        if (mode === 'apparel') {
            if (modelSource === 'upload') return base && !!modelImage;
            if (modelSource === 'ai') return base && !!talentParams.gender && !!talentParams.ethnicity;
            return false;
        }
        return base;
    }, [mode, mainImage, productName, vibe, modelSource, modelImage, talentParams]);

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
            if (setter === setMainImage) setTimeout(() => setCurrentStep(2), 600);
            if (setter === setModelImage) setTimeout(() => setCurrentStep(4), 600);
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
                modelParams: modelSource === 'ai' ? { ...talentParams, age: 'Young Adult' } : undefined,
                productType: productName,
                productVibe: vibe,
                packSize: packSize
            }, auth.activeBrandKit);

            const blobUrls = await Promise.all(outputBase64s.map(b64 => base64ToBlobUrl(b64, 'image/jpeg')));
            setResults(blobUrls);
            setActiveResultIdx(0);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Ecommerce Kit (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            // Save each as creation
            for (let i = 0; i < outputBase64s.length; i++) {
                const rawUri = `data:image/jpeg;base64,${outputBase64s[i]}`;
                const storedUri = await resizeImage(rawUri, 1024, 0.7);
                await saveCreation(auth.user.uid, storedUri, `Ecommerce Kit Asset ${i+1}`);
            }
        } catch (e) {
            console.error(e);
            alert("Kit generation failed.");
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
                            <CubeIcon className="w-6 h-6 text-blue-500"/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Product Pack</span>
                        </button>
                        <button onClick={() => { setMode('apparel'); setTimeout(() => setCurrentStep(1), 600); }} className={`flex-1 h-32 rounded-[2rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${mode === 'apparel' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-lg' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <ApparelIcon className="w-6 h-6 text-purple-500"/>
                            <span className="text-[10px] font-black uppercase tracking-widest">Model Pack</span>
                        </button>
                    </div>
                );
            case 'assets':
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center text-center">
                        <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 w-full max-w-[280px] transition-colors ${mainImage ? 'bg-green-50 border-green-100 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                            {mainImage ? <CheckIcon className="w-4 h-4" /> : <UploadIcon className="w-4 h-4" />}
                            <p className="text-[10px] font-black uppercase tracking-widest">{mainImage ? 'Main Asset Set' : 'Tap canvas to upload'}</p>
                        </div>
                    </div>
                );
            case 'intensity':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {PACK_SIZES.map(p => (
                            <button key={p.size} onClick={() => { setPackSize(p.size as any); setTimeout(() => setCurrentStep(3), 600); }} className={`shrink-0 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all ${packSize === p.size ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                );
            case 'context':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 py-2">
                        <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-[15px] font-bold focus:border-indigo-500 outline-none" placeholder="Product Name..." />
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            {VIBES.map(v => (
                                <button key={v} onClick={() => { setVibe(v); if(mode === 'product') setTimeout(() => setCurrentStep(4), 600); }} className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border transition-all ${vibe === v ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-500 border-gray-100'}`}>{v}</button>
                            ))}
                        </div>
                    </div>
                );
            case 'talent':
                if (mode === 'product') return <div className="w-full text-center py-4"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No talent configuration required</span></div>;
                return (
                    <div className="w-full px-6 flex flex-col gap-4 py-2">
                        <div className="flex gap-3">
                            <button onClick={() => setModelSource('ai')} className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${modelSource === 'ai' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                                <SparklesIcon className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase">Pixa Model</span>
                            </button>
                            <button onClick={() => setModelSource('upload')} className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center gap-1.5 transition-all ${modelSource === 'upload' ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>
                                <UserIcon className="w-4 h-4" />
                                <span className="text-[9px] font-black uppercase">My Model</span>
                            </button>
                        </div>
                        {modelSource === 'ai' && (
                            <div className="grid grid-cols-2 gap-2 animate-fadeIn">
                                <select value={talentParams.gender} onChange={e => setTalentParams({...talentParams, gender: e.target.value})} className="p-2.5 bg-gray-50 rounded-xl text-[10px] font-black border-none outline-none"><option value="">Gender</option><option>Female</option><option>Male</option></select>
                                <select value={talentParams.ethnicity} onChange={e => setTalentParams({...talentParams, ethnicity: e.target.value})} className="p-2.5 bg-gray-50 rounded-xl text-[10px] font-black border-none outline-none"><option value="">Ethnicity</option><option>Indian</option><option>Asian</option><option>International</option><option>African</option></select>
                            </div>
                        )}
                        {modelSource === 'upload' && (
                            <div onClick={() => modelInputRef.current?.click()} className={`w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${modelImage ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                                {modelImage ? <CheckIcon className="w-5 h-5"/> : <UploadIcon className="w-5 h-5"/>}
                                <span className="text-[9px] font-black uppercase tracking-widest">{modelImage ? 'Model Ready' : 'Upload Model'}</span>
                            </div>
                        )}
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
                        {!results.length && !isGenerating && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {results.length > 0 && !isGenerating ? (
                            <button onClick={handleDownloadAll} disabled={isZipping} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-indigo-600 animate-fadeIn"><DownloadIcon className="w-5 h-5" /></button>
                        ) : !results.length && (
                            <button onClick={handleGenerate} disabled={!isStrategyComplete || isGenerating || isLowCredits} className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating || isLowCredits ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}>
                                {isGenerating ? 'Rendering...' : 'Generate Pack'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 overflow-hidden pb-10">
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex flex-col items-center justify-center relative bg-gray-50 shadow-inner">
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
                        <div className="w-full h-full flex flex-col animate-fadeIn">
                            <div className="flex-1 relative flex items-center justify-center p-6 bg-white" onClick={() => setIsFullScreenOpen(true)}>
                                <img src={results[activeResultIdx]} className="max-w-full max-h-full object-contain drop-shadow-2xl animate-materialize" />
                                <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-white text-[9px] font-black uppercase tracking-widest">{getAssetLabel(activeResultIdx)}</div>
                            </div>
                            <div className="flex-none h-32 bg-gray-50 border-t border-gray-100 flex items-center gap-3 overflow-x-auto px-6 no-scrollbar">
                                {results.map((res, idx) => (
                                    <button key={idx} onClick={() => setActiveResultIdx(idx)} className={`shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${activeResultIdx === idx ? 'border-indigo-600 scale-105 shadow-md shadow-indigo-500/20' : 'border-white opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}>
                                        <img src={res} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                            {mainImage ? (
                                <div className="relative w-72 h-72 animate-fadeIn flex items-center justify-center">
                                    <div className="absolute inset-0 bg-indigo-500/10 blur-[80px] rounded-full"></div>
                                    <div className="relative p-6 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-2xl flex items-center justify-center">
                                        <img src={mainImage.url} className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <div className="absolute bottom-[-1rem] bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg text-[8px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        Asset Synced
                                    </div>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="text-center active:scale-95 transition-transform">
                                    <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100">
                                        <ImageIcon className="w-10 h-10 text-indigo-100" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Product</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                                </div>
                            )}
                        </div>
                    )}

                    {mainImage && !results.length && !isGenerating && (
                        <button onClick={handleReset} className="absolute top-4 right-4 bg-white/70 backdrop-blur-md p-2 rounded-full shadow-sm border border-white/50 active:scale-90 transition-all">
                            <RefreshIcon className="w-4 h-4 text-gray-700" />
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
                                        const isFilled = (idx === 0 && !!mode) || (idx === 1 && !!mainImage) || (idx === 2 && !!packSize) || (idx === 3 && !!productName && !!vibe) || (idx === 4 && (mode === 'product' || !!modelSource));
                                        
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className="flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all">
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`} />
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
            <input ref={modelInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setModelImage)} />

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
