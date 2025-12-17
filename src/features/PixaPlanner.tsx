import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { PlannerStyles } from '../styles/features/PixaPlanner.styles';
import { 
    CalendarIcon, SparklesIcon, CheckIcon, ArrowRightIcon, 
    ArrowLeftIcon, DownloadIcon, TrashIcon, RefreshIcon, 
    PencilIcon, MagicWandIcon, CreditCoinIcon, LockIcon,
    XIcon, BrandKitIcon, CubeIcon, UploadIcon, DocumentTextIcon
} from '../components/icons';
import { generateContentPlan, generatePostImage, extractPlanFromDocument, CalendarPost, PlanConfig } from '../services/plannerService';
import { deductCredits, saveCreation } from '../firebase';
// Added missing import fileToBase64 and kept others
import { base64ToBlobUrl, urlToBase64, downloadImage, fileToBase64 } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';
// @ts-ignore
import JSZip from 'jszip';

type Step = 'config' | 'review' | 'generating' | 'done';

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

export const PixaPlanner: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [step, setStep] = useState<Step>('config');
    const [config, setConfig] = useState<PlanConfig>({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        goal: 'Sales & Promos',
        frequency: 'Steady Growth (12 Posts)',
        country: 'United States',
        mixType: 'Balanced'
    });
    
    const [plan, setPlan] = useState<CalendarPost[]>([]);
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({}); 
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const activeBrand = useMemo(() => auth.user?.brandKit, [auth.user?.brandKit]);
    const hasBrand = !!activeBrand;
    const documentInputRef = useRef<HTMLInputElement>(null);

    const costPerImage = 10;
    const totalCost = plan.length * costPerImage;
    const userCredits = auth.user?.credits || 0;

    const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeBrand) return;

        setLoadingText("Extracting schedule from document...");
        setStep('generating');
        
        try {
            // Added usage of fileToBase64
            const raw = await fileToBase64(file);
            const importedPlan = await extractPlanFromDocument(activeBrand, raw.base64, raw.mimeType);
            setPlan(importedPlan);
            setStep('review');
            setToast({ msg: `Imported ${importedPlan.length} posts!`, type: 'success' });
        } catch (error: any) {
            setToast({ msg: error.message, type: 'error' });
            setStep('config');
        } finally {
            setLoadingText('');
            e.target.value = '';
        }
    };

    const handleGeneratePlan = async () => {
        if (!activeBrand) return;
        setLoadingText(`AI is studying your mood boards and product catalog...`);
        setStep('generating'); 
        try {
            const newPlan = await generateContentPlan(activeBrand, config);
            setPlan(newPlan);
            setStep('review');
        } catch (e: any) {
            setToast({ msg: e.message, type: "error" });
            setStep('config');
        } finally {
            setLoadingText('');
        }
    };

    const updatePost = (id: string, field: keyof CalendarPost, value: string) => {
        setPlan(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleStartGeneration = async () => {
        if (!auth.user || !activeBrand) return;
        if (userCredits < totalCost) {
            setToast({ msg: `Insufficient credits. Need ${totalCost}.`, type: "error" });
            return;
        }
        
        setStep('generating');
        setProgress(0);
        
        try {
            // FIX: Map Base64File to the format { data: string; mimeType: string; } expected by generatePostImage
            // Pre-load common brand assets
            const moodAssets = await Promise.all((activeBrand.moodBoard || []).map(async m => {
                const res = await urlToBase64(m.imageUrl);
                return { data: res.base64, mimeType: res.mimeType };
            }));
            
            const logoRes = activeBrand.logos?.primary ? await urlToBase64(activeBrand.logos.primary) : null;
            const logoB64 = logoRes ? { data: logoRes.base64, mimeType: logoRes.mimeType } : null;

            const results: Record<string, string> = {};
            for (let i = 0; i < plan.length; i++) {
                const post = plan[i];
                setLoadingText(`Designing creative for ${post.topic}...`);
                
                const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                // FIX: Map Base64File to the format { data: string; mimeType: string; } for product asset
                const prodRes = product ? await urlToBase64(product.imageUrl) : null;
                const productB64 = prodRes ? { data: prodRes.base64, mimeType: prodRes.mimeType } : null;

                try {
                    const b64 = await generatePostImage(post, activeBrand, logoB64, productB64, moodAssets);
                    const blobUrl = await base64ToBlobUrl(b64, 'image/png');
                    results[post.id] = blobUrl;
                    await saveCreation(auth.user.uid, `data:image/jpeg;base64,${b64}`, `Planner: ${post.topic}`);
                } catch (err) {
                    console.error(err);
                }
                setProgress(((i + 1) / plan.length) * 100);
            }

            await deductCredits(auth.user.uid, totalCost, "Planner Campaign");
            setGeneratedImages(results);
            setStep('done');
        } catch (e) {
            setStep('review');
        }
    };

    const handleDownloadAll = async () => {
        const zip = new JSZip();
        for (const post of plan) {
            const url = generatedImages[post.id];
            if (url) {
                const blob = await fetch(url).then(r => r.blob());
                zip.file(`${post.date}_${post.topic.replace(/\s+/g, '_')}.jpg`, blob);
            }
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `${activeBrand?.companyName}_Campaign.zip`;
        link.click();
    };

    if (!hasBrand) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <LockIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Brand Kit Required</h2>
                <p className="text-gray-500 mb-8 max-w-md">Pixa Planner uses your Brand DNA and catalog to generate relevant content.</p>
                <button onClick={() => navigateTo('dashboard', 'brand_manager')} className="bg-[#1A1A1E] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors">Setup Brand Kit</button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-32 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CalendarIcon className="w-8 h-8" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Pixa Planner</h1>
                        <p className="text-sm text-gray-500">Scheduled for <span className="font-bold text-indigo-600">{activeBrand.companyName}</span></p>
                    </div>
                </div>
                {step === 'config' && (
                    <button onClick={() => documentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
                        <DocumentTextIcon className="w-5 h-5"/> Import CSV / PDF
                    </button>
                )}
            </div>

            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-8 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Month</label>
                            <select value={config.month} onChange={e => setConfig({...config, month: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500">
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Region</label>
                            <input value={config.country} onChange={e => setConfig({...config, country: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. India" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Content Mix</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Balanced', desc: 'Mix of ads, photos, and greetings' },
                                { label: 'Ads Only', desc: '100% Sales and marketing flyers' },
                                { label: 'Lifestyle Only', desc: 'Aesthetic product photography' }
                            ].map(m => (
                                <OptionCard key={m.label} title={m.label} description={m.desc} icon={<SparklesIcon className="w-5 h-5"/>} selected={config.mixType === m.label} onClick={() => setConfig({...config, mixType: m.label as any})} />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button onClick={handleGeneratePlan} className="bg-[#1A1A1E] text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:scale-105 flex items-center gap-3">
                            <MagicWandIcon className="w-6 h-6 text-yellow-400" />
                            Create Campaign Strategy
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <p className="text-sm font-bold text-indigo-700">Review your campaign and assign products to posts.</p>
                        <button onClick={() => setStep('config')} className="text-xs font-bold text-indigo-400 hover:text-indigo-600">Edit Config</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plan.map((post) => (
                            <div key={post.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-indigo-600 uppercase">{post.dayLabel}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${post.postType === 'Ad' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{post.postType}</span>
                                </div>
                                
                                <input value={post.topic} onChange={e => updatePost(post.id, 'topic', e.target.value)} className="font-bold text-gray-800 text-lg bg-transparent border-none p-0 focus:ring-0" />
                                
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Target Product</label>
                                    <select 
                                        value={post.selectedProductId} 
                                        onChange={(e) => updatePost(post.id, 'selectedProductId', e.target.value)}
                                        className="w-full text-xs font-bold p-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {activeBrand.products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <textarea value={post.visualIdea} onChange={e => updatePost(post.id, 'visualIdea', e.target.value)} className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-3 rounded-xl border-none h-24 resize-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button onClick={handleStartGeneration} className="bg-[#F9D230] text-[#1A1A1E] px-12 py-5 rounded-full font-black text-xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-all border-4 border-white">
                            <SparklesIcon className="w-7 h-7" />
                            Render Campaign ({totalCost} CR)
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
                <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
                    <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Designing Campaign...</h2>
                    <p className="text-lg text-gray-500 font-medium animate-pulse">{loadingText}</p>
                    <div className="w-full max-w-md h-3 bg-gray-100 rounded-full mt-10 overflow-hidden border border-gray-100">
                        <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 mt-4 font-mono">{Math.round(progress)}% COMPLETE</p>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-green-600 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <h2 className="text-3xl font-black mb-1 flex items-center gap-3"><CheckIcon className="w-8 h-8"/> Campaign Ready</h2>
                            <p className="text-green-100 font-medium text-lg">Your high-resolution assets have been generated and saved.</p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setStep('config')} className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-2xl font-bold transition-all">Start New</button>
                            <button onClick={handleDownloadAll} className="bg-white text-green-700 px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                                <DownloadIcon className="w-5 h-5"/> Export Kit (ZIP)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {plan.map(p => (
                            <div key={p.id} className="group relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all">
                                <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden">
                                    {generatedImages[p.id] ? (
                                        <>
                                            <img src={generatedImages[p.id]} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                                                <button onClick={() => downloadImage(generatedImages[p.id], `${p.date}.jpg`)} className="bg-white text-gray-900 p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                                                    <DownloadIcon className="w-6 h-6"/>
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <XIcon className="w-10 h-10 mb-2 opacity-50"/>
                                            <span className="text-xs font-bold">Failed</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase">{p.dayLabel}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{p.postType}</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-sm truncate">{p.topic}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <input type="file" ref={documentInputRef} className="hidden" accept=".csv, .pdf" onChange={handleImportDocument} />
            {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};