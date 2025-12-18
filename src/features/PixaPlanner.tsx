
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, ProductAnalysis } from '../types';
import { PlannerStyles } from '../styles/features/PixaPlanner.styles';
import { 
    CalendarIcon, SparklesIcon, CheckIcon, ArrowRightIcon, 
    ArrowLeftIcon, DownloadIcon, TrashIcon, RefreshIcon, 
    PencilIcon, MagicWandIcon, CreditCoinIcon, LockIcon,
    XIcon, BrandKitIcon, CubeIcon, UploadIcon, DocumentTextIcon,
    ShieldCheckIcon, LightningIcon, InformationCircleIcon, CameraIcon, CaptionIcon,
    CopyIcon, ChevronRightIcon
} from '../components/icons';
import { generateContentPlan, generatePostImage, extractPlanFromDocument, analyzeProductPhysically, CalendarPost, PlanConfig } from '../services/plannerService';
import { deductCredits, saveCreation } from '../firebase';
import { base64ToBlobUrl, urlToBase64, downloadImage, rawFileToBase64, resizeImage } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';
// @ts-ignore
import JSZip from 'jszip';

type Step = 'config' | 'review' | 'done';

const OptionCard: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void;
    description?: string;
}> = ({ title, icon, selected, onClick, description }) => (
    <button 
        onClick={onClick}
        className={`${PlannerStyles.optionCard} ${selected ? PlannerStyles.optionCardSelected : PlannerStyles.optionCardInactive}`}
    >
        <div className={`${PlannerStyles.optionIcon} ${selected ? PlannerStyles.optionIconSelected : PlannerStyles.optionIconInactive}`}>
            {icon}
        </div>
        <div className="text-left">
            <span className={`text-sm font-bold block ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>{title}</span>
            {description && <span className="text-[10px] text-gray-400 font-medium leading-tight block mt-1">{description}</span>}
        </div>
        {selected && <div className="absolute top-3 right-3 text-indigo-600"><CheckIcon className="w-4 h-4"/></div>}
    </button>
);

const ThinkingLog: React.FC<{ logs: string[] }> = ({ logs }) => {
    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom whenever logs update
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className={PlannerStyles.logContainer + " max-h-40 overflow-y-auto custom-scrollbar scroll-smooth"}>
            <div className={PlannerStyles.logHeader}>
                <LightningIcon className="w-3 h-3 text-indigo-400 animate-pulse" />
                <h4 className={PlannerStyles.logTitle}>Deep Strategy Intelligence</h4>
            </div>
            <div className="space-y-3">
                {logs.map((log, idx) => (
                    <div key={idx} className={PlannerStyles.logItem}>
                        <div className={`${PlannerStyles.logDot} ${idx === logs.length - 1 ? 'bg-indigo-50 animate-ping' : 'bg-green-50'}`}></div>
                        <p className={PlannerStyles.logText}>{log}</p>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

const ProgressModal: React.FC<{ loadingText: string; logs: string[]; progress: number }> = ({ loadingText, logs, progress }) => {
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden transform scale-100 animate-bounce-slight" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Agency processing active.</h2>
                <p className="text-sm text-gray-500 font-medium mb-8 h-10">{loadingText || 'Architecting High-Fidelity Assets...'}</p>
                
                <ThinkingLog logs={logs} />

                <div className={PlannerStyles.progressBar + " mt-8 w-full h-2 bg-gray-100 rounded-full overflow-hidden"}>
                    <div className={PlannerStyles.progressFill + " h-full bg-indigo-600 transition-all duration-300"} style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-[10px] font-black text-gray-400 mt-4 tracking-widest uppercase">{Math.round(progress)}% COMPLETE</p>
            </div>
        </div>,
        document.body
    );
};

/**
 * NEW: Multi-image Full-screen Gallery Viewer
 */
const MultiGalleryViewer: React.FC<{ 
    posts: CalendarPost[]; 
    images: Record<string, string>;
    initialIndex: number; 
    onClose: () => void;
    onToast: (msg: string) => void;
}> = ({ posts, images, initialIndex, onClose, onToast }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const post = posts[currentIndex];
    const imageUrl = images[post.id];
    const [isCopied, setIsCopied] = useState(false);

    const handleNext = () => setCurrentIndex(prev => (prev + 1) % posts.length);
    const handlePrev = () => setCurrentIndex(prev => (prev - 1 + posts.length) % posts.length);

    const handleCopy = () => {
        navigator.clipboard.writeText(`${post.caption}\n\n${post.hashtags}`);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        onToast("Campaign copy copied to clipboard!");
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    return createPortal(
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-fadeIn" onClick={onClose}>
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4 md:p-10" onClick={e => e.stopPropagation()}>
                
                {/* Header Controls */}
                <div className="absolute top-6 left-0 right-0 px-6 flex justify-between items-center z-50">
                    <div className="flex flex-col">
                        <span className="text-white font-black text-xl tracking-tight">{post.topic}</span>
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{post.date} • {post.dayLabel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => downloadImage(imageUrl, `PixaPlanner_${post.date.replace(/\//g, '-')}.jpg`)}
                            className="bg-white/10 hover:bg-white text-white hover:text-black p-3 rounded-full transition-all border border-white/10 shadow-xl"
                            title="Download Image"
                        >
                            <DownloadIcon className="w-6 h-6"/>
                        </button>
                        <button 
                            onClick={onClose}
                            className="bg-white/10 hover:bg-red-500 text-white p-3 rounded-full transition-all border border-white/10 shadow-xl"
                            title="Close"
                        >
                            <XIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full flex items-center justify-center relative">
                    {/* Navigation Arrows */}
                    <button onClick={handlePrev} className="absolute left-4 p-4 text-white/50 hover:text-white transition-all hover:scale-110 z-50 bg-black/20 hover:bg-black/50 rounded-full">
                        <ArrowLeftIcon className="w-10 h-10" />
                    </button>
                    
                    <div className="max-w-4xl w-full flex flex-col items-center gap-8 animate-[scaleIn_0.4s_cubic-bezier(0.16,1,0.3,1)]">
                        {/* The Image */}
                        <div className="relative group max-h-[60vh]">
                             <img src={imageUrl} className="max-w-full max-h-[60vh] rounded-2xl shadow-2xl object-contain border border-white/5" alt={post.topic} />
                        </div>

                        {/* Caption Area */}
                        <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl max-w-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <CaptionIcon className="w-4 h-4 text-indigo-400" />
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Campaign Copy</span>
                                </div>
                                <button 
                                    onClick={handleCopy}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
                                        isCopied ? 'bg-green-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    {isCopied ? <><CheckIcon className="w-3 h-3"/> Copied</> : <><CopyIcon className="w-3 h-3"/> Copy All</>}
                                </button>
                            </div>
                            <p className="text-gray-200 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{post.caption}</p>
                            <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-indigo-300 line-clamp-2">
                                {post.hashtags}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleNext} className="absolute right-4 p-4 text-white/50 hover:text-white transition-all hover:scale-110 z-50 bg-black/20 hover:bg-black/50 rounded-full">
                        <ChevronRightIcon className="w-10 h-10" />
                    </button>
                </div>
                
                {/* Counter */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                    <span className="text-white/40 text-xs font-black tracking-widest">{currentIndex + 1} / {posts.length}</span>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const PixaPlanner: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [step, setStep] = useState<Step>('config');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Initial configuration with no pre-selections
    const [config, setConfig] = useState<PlanConfig>({
        month: '',
        year: new Date().getFullYear(),
        goal: 'Sales & Promos',
        frequency: '',
        country: '', // UI label: Target Market
        mixType: '' as any
    });
    
    const [plan, setPlan] = useState<CalendarPost[]>([]);
    const [productAudits, setProductAudits] = useState<Record<string, ProductAnalysis>>({});
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({}); 
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [copiedIds, setCopiedIds] = useState<Set<string>>(new Set());
    const [viewingIndex, setViewingIndex] = useState<number | null>(null);

    const activeBrand = useMemo(() => auth.user?.brandKit, [auth.user?.brandKit]);
    const hasBrand = !!activeBrand;
    const documentInputRef = useRef<HTMLInputElement>(null);

    const costPerImage = 10;
    const totalCost = plan.length * costPerImage;
    const userCredits = auth.user?.credits || 0;

    // Validation for enabling the generation button
    const isConfigValid = config.month && config.country && config.frequency && config.mixType;

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeBrand) return;

        setIsGenerating(true);
        setLogs(["Parsing provided document structure...", "Mapping data to product catalog..."]);
        
        try {
            const raw = await rawFileToBase64(file);
            const importedPlan = await extractPlanFromDocument(activeBrand, raw.base64, raw.mimeType);
            setPlan(importedPlan);
            setStep('review');
            setToast({ msg: `Imported ${importedPlan.length} posts successfully!`, type: 'success' });
        } catch (error: any) {
            setToast({ msg: error.message, type: 'error' });
        } finally {
            setIsGenerating(false);
            e.target.value = '';
        }
    };

    const handleGeneratePlan = async () => {
        if (!activeBrand) return;
        setIsGenerating(true); 
        setLogs([]);
        setProgress(0);
        
        try {
            addLog("Initiating Art Direction Protocol...");
            const products = activeBrand.products || [];
            const audits: Record<string, ProductAnalysis> = {};
            
            for (let i = 0; i < products.length; i++) {
                const p = products[i];
                addLog(`Analyzing geometry for: ${p.name}...`);
                const res = await urlToBase64(p.imageUrl);
                const audit = await analyzeProductPhysically(p.id, res.base64, res.mimeType);
                audits[p.id] = audit;
                setProgress(((i + 1) / products.length) * 40); 
            }
            setProductAudits(audits);

            addLog(`Deep Research: Scanning trends for "${config.country}"...`);
            addLog(`Applying "Rule of Thirds" and negative space logic...`);
            
            const newPlan = await generateContentPlan(activeBrand, config, audits);
            setPlan(newPlan);
            setProgress(100);
            setStep('review');
        } catch (e: any) {
            console.error(e);
            setToast({ msg: "Strategy Engine failed. Try again.", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleStartGeneration = async () => {
        if (!auth.user || !activeBrand) return;
        if (userCredits < totalCost) {
            setToast({ msg: `Insufficient credits. Need ${totalCost}.`, type: "error" });
            return;
        }
        
        setIsGenerating(true);
        setLogs(["Activating Production Engine...", "Anchoring to Brand Visual DNA..."]);
        setProgress(0);
        
        try {
            const moodAssets = await Promise.all((activeBrand.moodBoard || []).map(async m => {
                const res = await urlToBase64(m.imageUrl);
                return { data: res.base64, mimeType: res.mimeType };
            }));
            
            const logoRes = activeBrand.logos?.primary ? await urlToBase64(activeBrand.logos.primary) : null;
            const logoB64 = logoRes ? { data: logoRes.base64, mimeType: logoRes.mimeType } : null;

            const results: Record<string, string> = {};
            for (let i = 0; i < plan.length; i++) {
                const post = plan[i];
                setLoadingText(`Rendering Scene ${i + 1}/${plan.length}: ${post.topic}`);
                
                const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                const prodRes = product ? await urlToBase64(product.imageUrl) : null;
                const productB64 = prodRes ? { data: prodRes.base64, mimeType: prodRes.mimeType } : null;
                const audit = productAudits[post.selectedProductId] || null;

                try {
                    const b64 = await generatePostImage(post, activeBrand, logoB64, productB64, audit, moodAssets);
                    const blobUrl = await base64ToBlobUrl(b64, 'image/png');
                    results[post.id] = blobUrl;
                    
                    const storageUri = await resizeImage(`data:image/png;base64,${b64}`, 1024, 0.7);
                    await saveCreation(auth.user.uid, storageUri, `Planner: ${post.topic}`);
                } catch (err) {
                    console.error(err);
                }
                setProgress(((i + 1) / plan.length) * 100);
            }

            await deductCredits(auth.user.uid, totalCost, "Campaign Rendering");
            setGeneratedImages(results);
            setStep('done');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        for (const post of plan) {
            const url = generatedImages[post.id];
            if (url) {
                const blob = await fetch(url).then(r => r.blob());
                // Handle slashes in dates for filename safety
                zip.file(`${post.date.replace(/\//g, '-')}_${post.topic.replace(/\s+/g, '_')}.jpg`, blob);
            }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${activeBrand?.companyName}_Campaign.zip`;
        link.click();
    };

    const handleCopyText = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
        setTimeout(() => {
            setCopiedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }, 2000);
    };

    if (!hasBrand) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <LockIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Agency Setup Required</h2>
                <p className="text-gray-500 mb-8 max-w-md">Planner acts as your dedicated AI agency. You must have a Brand Kit with products to start.</p>
                <button onClick={() => navigateTo('dashboard', 'brand_manager')} className="bg-[#1A1A1E] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors">Setup Brand Kit</button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-32 animate-fadeIn relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CalendarIcon className="w-8 h-8" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pixa Planner</h1>
                        <p className="text-sm text-gray-500">Agency Strategy for <span className="font-bold text-indigo-600">{activeBrand.companyName}</span></p>
                    </div>
                </div>
                {step === 'config' && (
                    <button onClick={() => documentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm group">
                        <DocumentTextIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/> Import CSV / PDF
                    </button>
                )}
            </div>

            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-8 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Month</label>
                            <select value={config.month} onChange={e => setConfig({...config, month: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 appearance-none">
                                <option value="" disabled>Select Month</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Market</label>
                            <input value={config.country} onChange={e => setConfig({...config, country: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Pune, Maharashtra or Bangalore" />
                        </div>
                    </div>

                    <div className="relative z-10">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Posting Frequency</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Every Day (30 Posts)', desc: 'Organic Dominance' },
                                { label: 'Weekday Warrior (20 Posts)', desc: 'Standard B2B' },
                                { label: 'Steady Growth (12 Posts)', desc: 'Balanced Presence' },
                                { label: 'Minimalist (4 Posts)', desc: 'Brand Placeholder' }
                            ].map(f => (
                                <OptionCard 
                                    key={f.label} 
                                    title={f.label} 
                                    description={f.desc} 
                                    icon={<CalendarIcon className="w-5 h-5"/>} 
                                    selected={config.frequency === f.label} 
                                    onClick={() => setConfig({...config, frequency: f.label})} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Strategy Algorithm</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Balanced', desc: '70/20/10 Hybrid Mix' },
                                { label: 'Ads Only', desc: 'Performance Marketing' },
                                { label: 'Lifestyle Only', desc: 'Aesthetic Storytelling' }
                            ].map(m => (
                                <OptionCard key={m.label} title={m.label} description={m.desc} icon={<SparklesIcon className="w-5 h-5"/>} selected={config.mixType === m.label} onClick={() => setConfig({...config, mixType: m.label as any})} />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 relative z-10">
                        <button 
                            onClick={handleGeneratePlan} 
                            disabled={!isConfigValid}
                            className={`bg-[#1A1A1E] text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-3 ${!isConfigValid ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-black hover:scale-105 shadow-indigo-500/20'}`}
                        >
                            <MagicWandIcon className="w-6 h-6 text-yellow-400" />
                            Engineer Pro Strategy
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-2 flex items-center gap-3"><CheckIcon className="w-8 h-8 p-1 bg-white/20 rounded-full"/> Strategy Engineered</h2>
                            <p className="text-indigo-100 font-medium">Verified {plan.length} entries for {activeBrand.companyName}. Each post is designed to maximize engagement and ROI.</p>
                        </div>
                        <button onClick={() => setStep('config')} className="relative z-10 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-sm font-bold transition-all border border-white/20">Refine Settings</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plan.map((post) => {
                            const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                            const isCopied = copiedIds.has(post.id);
                            return (
                                <div key={post.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-7 shadow-sm hover:shadow-xl transition-all flex flex-col gap-6 group relative">
                                    {/* Card Top: Date and Meta */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{post.date}</span>
                                            <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">{post.dayLabel}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide ${post.postType === 'Ad' ? 'bg-purple-600 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm'}`}>{post.postType}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Campaign Topic Section */}
                                    <div className="flex gap-5 items-center bg-gray-50/50 p-4 rounded-3xl border border-gray-100/50">
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shrink-0 bg-white flex items-center justify-center relative shadow-sm">
                                            {product?.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-contain p-1" /> : <CubeIcon className="w-5 h-5 text-gray-300"/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Topic</h4>
                                            <input value={post.topic} onChange={e => setPlan(prev => prev.map(p => p.id === post.id ? {...p, topic: e.target.value} : p))} className="w-full font-black text-gray-900 text-base bg-transparent border-none p-0 focus:ring-0 truncate" />
                                        </div>
                                    </div>

                                    {/* Post Content Box (Smart Caption) */}
                                    <div className="flex-1 flex flex-col gap-4">
                                        <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-inner relative group-hover:border-indigo-100 transition-colors">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><CaptionIcon className="w-4 h-4"/></div>
                                                    <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Smart Caption</h4>
                                                </div>
                                                <button 
                                                    onClick={() => handleCopyText(post.id, `${post.caption}\n\n${post.hashtags}`)}
                                                    className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 transform active:scale-95 ${
                                                        isCopied 
                                                        ? 'bg-green-100 text-green-600 border border-green-200' 
                                                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                                                    }`}
                                                >
                                                    <span className={`inline-block animate-fadeIn ${isCopied ? 'scale-110' : ''}`}>
                                                        {isCopied ? 'Copied' : 'Copy'}
                                                    </span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <textarea 
                                                    value={post.caption} 
                                                    onChange={e => setPlan(prev => prev.map(p => p.id === post.id ? {...p, caption: e.target.value} : p))}
                                                    className="w-full text-xs text-gray-700 leading-relaxed font-medium bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[80px]" 
                                                />
                                                <div className="mt-3 pt-3 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-[10px] font-bold text-indigo-500/70">Hashtags</p>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-mono leading-relaxed line-clamp-2">{post.hashtags}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* AI Image Generation Details (Editable) */}
                                        <div className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/50 group-hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-500"/>
                                                    <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">AI Image Engine</span>
                                                </div>
                                                <div className="p-1 bg-white rounded-md shadow-sm border border-indigo-50">
                                                    <CameraIcon className="w-2.5 h-2.5 text-indigo-400"/>
                                                </div>
                                            </div>
                                            <textarea 
                                                value={post.imagePrompt} 
                                                onChange={e => setPlan(prev => prev.map(p => p.id === post.id ? {...p, imagePrompt: e.target.value} : p))}
                                                className="w-full text-[10px] text-indigo-900/80 leading-relaxed font-medium bg-transparent border-none p-0 focus:ring-0 resize-none min-h-[50px] custom-scrollbar" 
                                                placeholder="Describe the visual style..."
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <label className="text-[9px] font-black text-gray-400 uppercase block mb-2 px-1">Selected Product</label>
                                        <select 
                                            value={post.selectedProductId} 
                                            onChange={(e) => setPlan(prev => prev.map(p => p.id === post.id ? {...p, selectedProductId: e.target.value} : p))}
                                            className="w-full text-[11px] font-black p-3.5 bg-white border-2 border-gray-100 rounded-2xl focus:border-indigo-500 focus:ring-0 cursor-pointer appearance-none shadow-sm transition-all"
                                        >
                                            {activeBrand.products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button onClick={handleStartGeneration} className="bg-[#F9D230] text-[#1A1A1E] px-12 py-5 rounded-full font-black text-xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-all border-4 border-white active:scale-95">
                            <SparklesIcon className="w-7 h-7" />
                            Render HD Campaign ({totalCost} CR)
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-10 rounded-[3rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black mb-2 flex items-center gap-4"><CheckIcon className="w-10 h-10 p-2 bg-white/20 rounded-full"/> Kit Finalized!</h2>
                            <p className="text-green-50 font-medium text-lg opacity-90">Your commercial campaign has been rendered to brand standards.</p>
                        </div>
                        <div className="flex gap-4 relative z-10 w-full md:w-auto">
                            <button onClick={() => setStep('config')} className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 px-8 py-4 rounded-2xl font-bold transition-all border border-white/10">Start New</button>
                            <button onClick={handleDownloadAll} className="flex-1 md:flex-none bg-white text-emerald-700 px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-3">
                                <DownloadIcon className="w-6 h-6"/> Export ZIP
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {plan.map((p, idx) => (
                            <div key={p.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all">
                                <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden cursor-zoom-in" onClick={() => setViewingIndex(idx)}>
                                    {generatedImages[p.id] ? (
                                        <>
                                            <img src={generatedImages[p.id]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            
                                            {/* Top Right Quick Download Button */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadImage(generatedImages[p.id], `PixaPlanner_${p.date.replace(/\//g, '-')}.jpg`);
                                                }}
                                                className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-xl text-gray-800 shadow-lg border border-white/20 hover:bg-white hover:scale-110 transition-all z-20 opacity-0 group-hover:opacity-100"
                                                title="Quick Download"
                                            >
                                                <DownloadIcon className="w-4 h-4"/>
                                            </button>

                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white">
                                                    <SparklesIcon className="w-6 h-6"/>
                                                </div>
                                            </div>

                                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-lg border border-white/10 shadow-sm uppercase tracking-[0.1em]">
                                                {p.dayLabel}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <XIcon className="w-10 h-10 mb-2 opacity-50"/>
                                            <span className="text-xs font-bold uppercase tracking-widest">Failed</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-gray-50">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                                                p.postType === 'Ad' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                            }`}>{p.postType}</span>
                                            <span className={`text-[9px] font-bold text-gray-400 uppercase`}>{p.archetype}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-full">{p.date}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm truncate mb-3">{p.topic}</h4>
                                    
                                    {/* Card Preview Text */}
                                    <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 group-hover:bg-indigo-50/30 transition-colors">
                                        <p className="text-[11px] text-gray-500 italic line-clamp-2 leading-relaxed">"{p.caption}"</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Full Screen Gallery Viewer */}
            {viewingIndex !== null && (
                <MultiGalleryViewer 
                    posts={plan}
                    images={generatedImages}
                    initialIndex={viewingIndex}
                    onClose={() => setViewingIndex(null)}
                    onToast={(msg) => setToast({ msg, type: 'success' })}
                />
            )}

            {isGenerating && <ProgressModal loadingText={loadingText} logs={logs} progress={progress} />}
            
            <input type="file" ref={documentInputRef} className="hidden" accept=".csv, .pdf" onChange={handleImportDocument} />
            {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
