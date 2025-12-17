
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
// Added resizeImage to imports
import { base64ToBlobUrl, urlToBase64, downloadImage, rawFileToBase64, resizeImage } from '../utils/imageUtils';
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
            // FIX: Using rawFileToBase64 instead of fileToBase64 to allow PDFs and CSVs
            const raw = await rawFileToBase64(file);
            const importedPlan = await extractPlanFromDocument(activeBrand, raw.base64, raw.mimeType);
            setPlan(importedPlan);
            setStep('review');
            setToast({ msg: `Imported ${importedPlan.length} posts successfully!`, type: 'success' });
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
        setLoadingText(`AI is analyzing your ${activeBrand.products?.length || 0} products and current trends...`);
        setStep('generating'); 
        try {
            const newPlan = await generateContentPlan(activeBrand, config);
            setPlan(newPlan);
            setStep('review');
        } catch (e: any) {
            setToast({ msg: "Failed to generate strategy. Please try again.", type: "error" });
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
            setToast({ msg: `Insufficient credits. Need ${totalCost}, have ${userCredits}.`, type: "error" });
            return;
        }
        
        setStep('generating');
        setProgress(0);
        
        try {
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
                setLoadingText(`Rendering post ${i + 1} of ${plan.length}: ${post.topic}`);
                
                const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                const prodRes = product ? await urlToBase64(product.imageUrl) : null;
                const productB64 = prodRes ? { data: prodRes.base64, mimeType: prodRes.mimeType } : null;

                try {
                    const b64 = await generatePostImage(post, activeBrand, logoB64, productB64, moodAssets);
                    const blobUrl = await base64ToBlobUrl(b64, 'image/png');
                    results[post.id] = blobUrl;
                    
                    const storageUri = await resizeImage(`data:image/png;base64,${b64}`, 1024, 0.7);
                    await saveCreation(auth.user.uid, storageUri, `Planner: ${post.topic}`);
                } catch (err) {
                    console.error(err);
                }
                setProgress(((i + 1) / plan.length) * 100);
            }

            await deductCredits(auth.user.uid, totalCost, "Pixa Planner Campaign");
            setGeneratedImages(results);
            setStep('done');
        } catch (e) {
            setStep('review');
        }
    };

    const handleDownloadAll = async () => {
        setIsZipping(true);
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
        link.download = `${activeBrand?.companyName}_Planner_Kit.zip`;
        link.click();
        setIsZipping(false);
    };

    const [isZipping, setIsZipping] = useState(false);

    if (!hasBrand) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <LockIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Brand Kit Required</h2>
                <p className="text-gray-500 mb-8 max-w-md">Pixa Planner needs your catalog and mood boards to generate high-quality visual calendars.</p>
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
                        <p className="text-sm text-gray-500">Intelligent Scheduling for <span className="font-bold text-indigo-600">{activeBrand.companyName}</span></p>
                    </div>
                </div>
                {step === 'config' && (
                    <button onClick={() => documentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm group">
                        <DocumentTextIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/> Import Schedule (CSV / PDF)
                    </button>
                )}
            </div>

            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-8 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Target Month</label>
                            <select value={config.month} onChange={e => setConfig({...config, month: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500">
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Country (Cultural Context)</label>
                            <input value={config.country} onChange={e => setConfig({...config, country: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. India, USA" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Posting Frequency</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Every Day (30 Posts)', desc: 'Maximum organic reach' },
                                { label: 'Weekday Warrior (20 Posts)', desc: 'Focus on business days' },
                                { label: 'Steady Growth (12 Posts)', desc: '3 times per week' },
                                { label: 'Minimalist (4 Posts)', desc: '1 core post per week' }
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

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-3">Creative Mix</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Balanced', desc: 'Mix of Ads, Lifestyle & Greetings' },
                                { label: 'Ads Only', desc: '100% Sales & Conversion focus' },
                                { label: 'Lifestyle Only', desc: 'Aesthetic raw photography' }
                            ].map(m => (
                                <OptionCard 
                                    key={m.label} 
                                    title={m.label} 
                                    description={m.desc} 
                                    icon={<SparklesIcon className="w-5 h-5"/>} 
                                    selected={config.mixType === m.label} 
                                    onClick={() => setConfig({...config, mixType: m.label as any})} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleGeneratePlan} className="bg-[#1A1A1E] text-white px-10 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-xl hover:scale-105 flex items-center gap-3">
                            <MagicWandIcon className="w-6 h-6 text-yellow-400" />
                            Engineer Calendar Strategy
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                        <div>
                            <p className="text-sm font-bold text-indigo-700">Strategy Finalized: {plan.length} Scheduled Posts.</p>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase mt-0.5 tracking-wider">Review copy and assign specific catalog items below</p>
                        </div>
                        <button onClick={() => setStep('config')} className="text-xs font-bold text-indigo-400 hover:text-indigo-600 transition-colors">Edit Parameters</button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plan.map((post) => (
                            <div key={post.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 group">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">{post.dayLabel}</span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        post.postType === 'Ad' ? 'bg-purple-100 text-purple-700' : 
                                        post.postType === 'Greeting' ? 'bg-amber-100 text-amber-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>{post.postType}</span>
                                </div>
                                
                                <input 
                                    value={post.topic} 
                                    onChange={e => updatePost(post.id, 'topic', e.target.value)} 
                                    className="font-bold text-gray-800 text-lg bg-transparent border-none p-0 focus:ring-0 truncate" 
                                />
                                
                                <div>
                                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 ml-1">Target Product</label>
                                    <select 
                                        value={post.selectedProductId} 
                                        onChange={(e) => updatePost(post.id, 'selectedProductId', e.target.value)}
                                        className="w-full text-xs font-bold p-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none"
                                    >
                                        {activeBrand.products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1 ml-1">Visual Direction</label>
                                        <textarea value={post.visualIdea} onChange={e => updatePost(post.id, 'visualIdea', e.target.value)} className="w-full text-[11px] text-gray-500 leading-relaxed bg-gray-50/50 p-3 rounded-xl border-none h-20 resize-none focus:ring-2 focus:ring-indigo-500" />
                                    </div>
                                    <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-50">
                                        <label className="text-[9px] font-bold text-indigo-400 uppercase block mb-1">Social Caption</label>
                                        <p className="text-[11px] text-indigo-900 line-clamp-3 leading-relaxed">{post.caption}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                        <button onClick={handleStartGeneration} className="bg-[#F9D230] text-[#1A1A1E] px-12 py-5 rounded-full font-black text-xl shadow-2xl flex items-center gap-4 hover:scale-105 transition-all border-4 border-white active:scale-95">
                            <SparklesIcon className="w-7 h-7" />
                            Produce Campaign ({totalCost} CR)
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
                <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
                    <div className="relative">
                        <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                        <div className="absolute inset-0 flex items-center justify-center -mt-8">
                            <MagicWandIcon className="w-8 h-8 text-indigo-600 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2">Architecting Brilliance...</h2>
                    <p className="text-lg text-gray-500 font-medium animate-pulse text-center max-w-md">{loadingText}</p>
                    <div className="w-full max-w-md h-3 bg-gray-100 rounded-full mt-10 overflow-hidden border border-gray-100 shadow-inner">
                        <div className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-sm font-bold text-gray-400 mt-4 font-mono">{Math.round(progress)}% COMPLETE</p>
                </div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-10 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                        <div className="relative z-10">
                            <h2 className="text-4xl font-black mb-2 flex items-center gap-4"><CheckIcon className="w-10 h-10 p-2 bg-white/20 rounded-full"/> Kit Ready!</h2>
                            <p className="text-green-50 font-medium text-lg">We've generated {plan.length} high-fidelity assets for your campaign.</p>
                        </div>
                        <div className="flex gap-4 relative z-10 w-full md:w-auto">
                            <button onClick={() => setStep('config')} className="flex-1 md:flex-none bg-white/20 hover:bg-white/30 px-8 py-4 rounded-2xl font-bold transition-all border border-white/20">New Calendar</button>
                            <button onClick={handleDownloadAll} disabled={isZipping} className="flex-1 md:flex-none bg-white text-green-700 px-10 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                                {isZipping ? <div className="w-5 h-5 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin"/> : <DownloadIcon className="w-6 h-6"/>}
                                Export Kit (ZIP)
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
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3 backdrop-blur-[2px]">
                                                <button onClick={() => downloadImage(generatedImages[p.id], `${p.date}.jpg`)} className="w-full bg-white text-gray-900 py-3 rounded-xl font-bold shadow-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                                                    <DownloadIcon className="w-5 h-5"/> Save Image
                                                </button>
                                                <button onClick={() => {
                                                    navigator.clipboard.writeText(`${p.caption}\n\n${p.hashtags}`);
                                                    setToast({ msg: "Caption copied to clipboard!", type: "success" });
                                                }} className="text-white text-xs font-bold hover:underline">Copy Caption</button>
                                            </div>
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-lg border border-white/10 shadow-sm uppercase tracking-wider">
                                                {p.dayLabel}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                            <XIcon className="w-10 h-10 mb-2 opacity-50"/>
                                            <span className="text-xs font-bold">Rendering Failed</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 border-t border-gray-50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                            p.postType === 'Ad' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'
                                        }`}>{p.postType}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{p.date}</span>
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
