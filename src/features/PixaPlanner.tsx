
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { PlannerStyles } from '../styles/features/PixaPlanner.styles';
import { 
    CalendarIcon, SparklesIcon, CheckIcon, ArrowRightIcon, 
    ArrowLeftIcon, DownloadIcon, TrashIcon, RefreshIcon, 
    PencilIcon, MagicWandIcon, CreditCoinIcon, LockIcon,
    XIcon, BrandKitIcon, CubeIcon, UploadIcon, DocumentTextIcon
} from '../components/icons';
import { generateContentPlan, generatePostImage, CalendarPost, PlanConfig } from '../services/plannerService';
import { deductCredits, saveCreation } from '../firebase';
import { base64ToBlobUrl, urlToBase64, downloadImage } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';
// @ts-ignore
import JSZip from 'jszip';

type Step = 'config' | 'review' | 'generating' | 'done';

export const PixaPlanner: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [step, setStep] = useState<Step>('config');
    const [config, setConfig] = useState<PlanConfig>({
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
        goal: '',
        frequency: '',
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
    const csvInputRef = useRef<HTMLInputElement>(null);

    const costPerImage = 10;
    const totalCost = plan.length * costPerImage;
    const userCredits = auth.user?.credits || 0;

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            const header = lines[0].split(',');
            
            const importedPlan: CalendarPost[] = lines.slice(1).map((line, idx) => {
                const cols = line.split(',');
                return {
                    id: `csv_${Date.now()}_${idx}`,
                    date: cols[0] || '',
                    dayLabel: cols[0] || `Day ${idx + 1}`,
                    topic: cols[1] || 'Imported Post',
                    postType: (cols[2] as any) || 'Photo',
                    headline: cols[3] || '',
                    visualIdea: cols[4] || '',
                    caption: cols[5] || '',
                    hashtags: cols[6] || '',
                    imagePrompt: cols[7] || '',
                    selectedProductId: activeBrand?.products?.[0]?.id || ''
                };
            });
            setPlan(importedPlan);
            setStep('review');
        };
        reader.readAsText(file);
    };

    const handleGeneratePlan = async () => {
        if (!activeBrand) return;
        if (!config.goal || !config.frequency) {
            setToast({ msg: "Select goal and frequency.", type: "error" });
            return;
        }
        setLoadingText(`Pixa is analyzing your ${activeBrand.products?.length || 0} products and trends...`);
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

    const updatePostProduct = (postId: string, productId: string) => {
        setPlan(prev => prev.map(p => p.id === postId ? { ...p, selectedProductId: productId } : p));
    };

    const handleStartGeneration = async () => {
        if (!auth.user || !activeBrand) return;
        if (userCredits < totalCost) {
            setToast({ msg: `Need ${totalCost} credits.`, type: "error" });
            return;
        }
        
        setStep('generating');
        setProgress(0);
        
        try {
            // Pre-load mood board
            const moodAssets = await Promise.all((activeBrand.moodBoard || []).map(async m => {
                const b64 = await urlToBase64(m.imageUrl);
                return b64;
            }));

            const logoB64 = activeBrand.logos?.primary ? await urlToBase64(activeBrand.logos.primary) : null;

            const results: Record<string, string> = {};
            for (let i = 0; i < plan.length; i++) {
                const post = plan[i];
                setLoadingText(`Designing creative for ${post.topic}...`);
                
                // Get the specific product selected for this post
                const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                const productB64 = product ? await urlToBase64(product.imageUrl) : null;

                try {
                    const b64 = await generatePostImage(post, activeBrand, logoB64, productB64, moodAssets);
                    const blobUrl = await base64ToBlobUrl(b64, 'image/jpeg');
                    results[post.id] = blobUrl;
                    await saveCreation(auth.user.uid, `data:image/jpeg;base64,${b64}`, `Planner: ${post.topic}`);
                } catch (err) {
                    console.error(err);
                }
                setProgress(((i + 1) / plan.length) * 100);
            }

            await deductCredits(auth.user.uid, totalCost, "Planner Batch");
            setGeneratedImages(results);
            setStep('done');
        } catch (e) {
            setStep('review');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-32 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><CalendarIcon className="w-8 h-8" /></div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Pixa Planner</h1>
                        <p className="text-sm text-gray-500">Auto-pilot calendar for <span className="font-bold text-indigo-600">{activeBrand?.companyName}</span></p>
                    </div>
                </div>
                {step === 'config' && (
                    <button onClick={() => csvInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                        <DocumentTextIcon className="w-4 h-4"/> Import CSV
                    </button>
                )}
            </div>

            {step === 'config' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Month</label>
                            <select value={config.month} onChange={e => setConfig({...config, month: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl font-bold">
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Goal</label>
                            <select value={config.goal} onChange={e => setConfig({...config, goal: e.target.value})} className="w-full p-3 bg-gray-50 border rounded-xl font-bold">
                                <option value="">Select Goal</option>
                                <option>Sales & Promos</option>
                                <option>Brand Awareness</option>
                                <option>Education</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleGeneratePlan} className="bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-yellow-400" /> Create Strategy
                        </button>
                    </div>
                </div>
            )}

            {step === 'review' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {plan.map((post) => (
                            <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-black text-indigo-600">{post.dayLabel}</span>
                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold">{post.postType}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-2">{post.topic}</h4>
                                
                                {/* Product Selector */}
                                <div className="mb-3">
                                    <label className="text-[9px] font-bold text-gray-400 uppercase block mb-1">Product Asset</label>
                                    <select 
                                        value={post.selectedProductId} 
                                        onChange={(e) => updatePostProduct(post.id, e.target.value)}
                                        className="w-full text-xs p-2 bg-indigo-50 border border-indigo-100 rounded-lg outline-none font-medium"
                                    >
                                        {activeBrand?.products?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>

                                <p className="text-[11px] text-gray-500 line-clamp-3 mb-2 italic">"{post.visualIdea}"</p>
                            </div>
                        ))}
                    </div>
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <button onClick={handleStartGeneration} className="bg-[#F9D230] text-[#1A1A1E] px-10 py-4 rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 border-4 border-white">
                            <SparklesIcon className="w-6 h-6" /> Generate {plan.length} Designs
                        </button>
                    </div>
                </div>
            )}

            {step === 'generating' && (
                <div className={PlannerStyles.progressContainer}>
                    <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h2 className="text-xl font-bold mb-2">Pixa Designer is Working...</h2>
                    <p className="text-sm text-gray-500">{loadingText}</p>
                    <div className="w-64 h-2 bg-gray-200 rounded-full mt-6 overflow-hidden">
                        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {step === 'done' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {plan.map(p => (
                        <div key={p.id} className="aspect-[4/5] bg-gray-100 rounded-xl overflow-hidden relative">
                            {generatedImages[p.id] ? <img src={generatedImages[p.id]} className="w-full h-full object-cover"/> : <div className="p-4 text-xs">Failed</div>}
                        </div>
                    ))}
                </div>
            )}
            
            <input type="file" ref={csvInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
            {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
