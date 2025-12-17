
import React, { useState, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { PlannerStyles } from '../styles/features/PixaPlanner.styles';
import { 
    CalendarIcon, SparklesIcon, CheckIcon, ArrowRightIcon, 
    ArrowLeftIcon, DownloadIcon, TrashIcon, RefreshIcon, 
    PencilIcon, MagicWandIcon, CreditCoinIcon, LockIcon,
    XIcon, BrandKitIcon, CubeIcon
} from '../components/icons';
import { generateContentPlan, generatePostImage, CalendarPost, PlanConfig } from '../services/plannerService';
import { deductCredits, saveCreation } from '../firebase';
import { base64ToBlobUrl, urlToBase64, downloadImage } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';
// @ts-ignore
import JSZip from 'jszip';

// Steps of the Wizard
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
        <div>
            <span className={`text-sm font-bold block ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>{title}</span>
            {description && <span className="text-[10px] text-gray-400 font-medium leading-tight block mt-1">{description}</span>}
        </div>
        {selected && <div className="absolute top-2 right-2 text-indigo-600"><CheckIcon className="w-4 h-4"/></div>}
    </button>
);

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

    // Get Active Brand
    const activeBrand = auth.user?.brandKit;
    const hasBrand = !!activeBrand;

    // Cost Calculation
    const costPerImage = 10;
    const totalCost = plan.length * costPerImage;
    const userCredits = auth.user?.credits || 0;

    // --- STEP 1: CONFIGURATION ---
    const goals = ['Brand Awareness', 'Sales & Promos', 'Education', 'Community Engagement'];
    const frequencies = ['Every Day (30 Posts)', 'Weekday Warrior (20 Posts)', 'Steady Growth (12 Posts)', 'Minimalist (4 Posts)'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const mixTypes = [
        { label: 'Balanced', desc: 'Mix of Photos, Ads & Greetings' },
        { label: 'Ads Only', desc: '100% Flyers & Text Overlays' },
        { label: 'Lifestyle Only', desc: 'Clean Photography (No Text)' }
    ];

    const handleGeneratePlan = async () => {
        if (!activeBrand) return;
        if (!config.goal || !config.frequency) {
            setToast({ msg: "Please select a goal and frequency.", type: "error" });
            return;
        }

        setLoadingText("Researching trends, holidays & scheduling content...");
        const prevStep = step;
        setStep('generating'); 

        try {
            const newPlan = await generateContentPlan(activeBrand, config);
            setPlan(newPlan);
            setStep('review');
        } catch (e: any) {
            console.error(e);
            setToast({ msg: e.message, type: "error" });
            setStep(prevStep);
        } finally {
            setLoadingText('');
        }
    };

    // --- STEP 2: REVIEW & EDIT ---
    const updatePost = (id: string, field: keyof CalendarPost, value: string) => {
        setPlan(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleStartGeneration = async () => {
        if (!auth.user || !activeBrand) return;
        if (userCredits < totalCost) {
            setToast({ msg: `Insufficient credits. Need ${totalCost}, have ${userCredits}.`, type: "error" });
            return;
        }
        
        if (!confirm(`Generate ${plan.length} creative assets for ${totalCost} credits?`)) return;

        setStep('generating');
        setProgress(0);
        
        try {
            // 1. Prepare Brand Assets (Logo & Product)
            let logoAsset = null;
            let productAsset = null;

            if (activeBrand.logos.primary) {
                try {
                    const b64 = await urlToBase64(activeBrand.logos.primary);
                    logoAsset = b64;
                } catch (e) { console.warn("Logo fetch failed", e); }
            }

            // For MVP, we use the FIRST product in the brand kit as the default product.
            // In a future version, we could let users select specific products per post.
            if (activeBrand.products && activeBrand.products.length > 0 && activeBrand.products[0].imageUrl) {
                try {
                    const b64 = await urlToBase64(activeBrand.products[0].imageUrl);
                    productAsset = b64;
                } catch (e) { console.warn("Product fetch failed", e); }
            }

            // Deduct credits upfront
            const updatedUser = await deductCredits(auth.user.uid, totalCost, `Pixa Planner (${config.month})`);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            // Process loop
            const results: Record<string, string> = {};
            
            for (let i = 0; i < plan.length; i++) {
                const post = plan[i];
                setLoadingText(`Designing Post ${i + 1}/${plan.length}: ${post.topic}`);
                
                try {
                    const b64 = await generatePostImage(post, activeBrand, logoAsset, productAsset);
                    const blobUrl = await base64ToBlobUrl(b64, 'image/jpeg');
                    results[post.id] = blobUrl;
                    
                    // Save to FireStore
                    const dataUri = `data:image/jpeg;base64,${b64}`;
                    await saveCreation(auth.user.uid, dataUri, `Planner: ${post.topic}`);
                    
                } catch (err) {
                    console.error(`Failed post ${post.id}`, err);
                }
                
                setProgress(((i + 1) / plan.length) * 100);
            }

            setGeneratedImages(results);
            setStep('done');

        } catch (e: any) {
            setToast({ msg: "Batch generation failed. Please contact support.", type: "error" });
            setStep('review');
        }
    };

    // --- STEP 3: DONE / EXPORT ---
    const handleDownloadAll = async () => {
        const zip = new JSZip();
        
        plan.forEach((post) => {
            const url = generatedImages[post.id];
            if (url) {
                zip.file(`${post.date}_${post.topic.replace(/\s+/g, '_')}.jpg`, fetch(url).then(r => r.blob()));
            }
        });
        
        const textContent = plan.map(p => 
            `Date: ${p.date}\nTopic: ${p.topic}\nHeadline: ${p.headline || 'N/A'}\nCaption: ${p.caption}\nHashtags: ${p.hashtags}\n\n---\n`
        ).join('\n');
        
        zip.file("content_plan.txt", textContent);

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = `${activeBrand?.companyName}_${config.month}_Content_Kit.zip`;
        link.click();
    };

    if (!hasBrand) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <LockIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Brand Kit Required</h2>
                <p className="text-gray-500 mb-8 max-w-md">Pixa Planner needs your Brand DNA (Logo, Colors, Tone) to generate on-brand ads. Please set up your brand profile first.</p>
                <button 
                    onClick={() => navigateTo('dashboard', 'brand_manager')}
                    className="bg-[#1A1A1E] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-colors"
                >
                    Go to Brand Kit
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-32 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <CalendarIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-gray-900">Pixa Planner</h1>
                        <p className="text-sm text-gray-500">
                            Auto-pilot content calendar for <span className="font-bold text-indigo-600">{activeBrand.companyName}</span>
                        </p>
                    </div>
                </div>
                
                {/* Brand Assets Indicator */}
                <div className="hidden md:flex gap-3">
                     <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${activeBrand.logos.primary ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                        <BrandKitIcon className="w-4 h-4"/> Logo {activeBrand.logos.primary ? 'Ready' : 'Missing'}
                     </div>
                     <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-2 ${activeBrand.products?.length ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                        <CubeIcon className="w-4 h-4"/> Product {activeBrand.products?.length ? 'Ready' : 'Generic'}
                     </div>
                </div>
            </div>

            {/* --- STEP 1: CONFIG --- */}
            {step === 'config' && (
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8 animate-fadeIn">
                    
                    {/* Month & Country */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Target Month</label>
                            <select 
                                value={config.month} 
                                onChange={e => setConfig({...config, month: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                            >
                                {months.map(m => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Target Country (For Holidays)</label>
                            <input 
                                type="text"
                                value={config.country} 
                                onChange={e => setConfig({...config, country: e.target.value})}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Goal */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Campaign Goal</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {goals.map(g => (
                                <OptionCard 
                                    key={g} 
                                    title={g} 
                                    icon={<SparklesIcon className="w-5 h-5"/>} 
                                    selected={config.goal === g} 
                                    onClick={() => setConfig({...config, goal: g})} 
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Content Mix (NEW) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Content Strategy</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {mixTypes.map(m => (
                                <OptionCard 
                                    key={m.label} 
                                    title={m.label} 
                                    description={m.desc}
                                    icon={<MagicWandIcon className="w-5 h-5"/>} 
                                    selected={config.mixType === m.label} 
                                    onClick={() => setConfig({...config, mixType: m.label as any})} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Frequency */}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Posting Frequency</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {frequencies.map(f => (
                                <OptionCard 
                                    key={f} 
                                    title={f} 
                                    icon={<CalendarIcon className="w-5 h-5"/>} 
                                    selected={config.frequency === f} 
                                    onClick={() => setConfig({...config, frequency: f})} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Action */}
                    <div className="pt-4 flex justify-end">
                        <button 
                            onClick={handleGeneratePlan}
                            className="bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:scale-105 flex items-center gap-2"
                        >
                            <SparklesIcon className="w-5 h-5 text-[#F9D230]" />
                            Create Strategy
                        </button>
                    </div>
                </div>
            )}

            {/* --- STEP 2: REVIEW PLAN --- */}
            {step === 'review' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                            <span className="bg-white p-2 rounded-lg shadow-sm font-bold text-indigo-600 text-lg border border-indigo-100">{plan.length}</span>
                            <div>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Posts Generated</p>
                                <p className="text-indigo-900 font-medium text-sm">Review text & headlines before generating designs.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep('config')} className="text-gray-400 hover:text-gray-600 font-bold text-sm px-3">Back</button>
                            <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-bold uppercase">Total Cost</span>
                                <span className="text-sm font-black text-gray-800">{totalCost} Credits</span>
                            </div>
                        </div>
                    </div>

                    {/* Plan Grid */}
                    <div className={PlannerStyles.gridContainer}>
                        {plan.map((post) => (
                            <div key={post.id} className={`${PlannerStyles.dayCard} ${post.postType !== 'Photo' ? 'ring-1 ring-purple-100' : ''}`}>
                                <div className={PlannerStyles.dayHeader}>
                                    <div className="flex items-center gap-2">
                                        <span className={PlannerStyles.dayLabel}>{post.dayLabel}</span>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            post.postType === 'Ad' ? 'bg-purple-100 text-purple-700' : 
                                            post.postType === 'Greeting' ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                            {post.postType}
                                        </span>
                                    </div>
                                </div>
                                <div className={PlannerStyles.dayContent}>
                                    <input 
                                        value={post.topic} 
                                        onChange={e => updatePost(post.id, 'topic', e.target.value)}
                                        className={PlannerStyles.topicInput}
                                        placeholder="Topic"
                                    />
                                    
                                    {/* Headline Input for Ads */}
                                    {(post.postType === 'Ad' || post.postType === 'Greeting') && (
                                        <div className="relative">
                                            <input 
                                                value={post.headline || ''}
                                                onChange={e => updatePost(post.id, 'headline', e.target.value)}
                                                className="w-full text-xs font-bold text-purple-700 bg-purple-50 p-2 rounded-lg border border-transparent focus:border-purple-300 focus:outline-none"
                                                placeholder="Ad Headline (Required)"
                                            />
                                            <span className="absolute top-1 right-2 text-[8px] text-purple-400 font-bold">TEXT ON IMG</span>
                                        </div>
                                    )}

                                    <textarea 
                                        value={post.visualIdea} 
                                        onChange={e => updatePost(post.id, 'visualIdea', e.target.value)}
                                        className={PlannerStyles.visualInput}
                                        rows={3}
                                        placeholder="Visual description..."
                                    />
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Caption</p>
                                        <p className="text-xs text-gray-600 line-clamp-2">{post.caption}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 shadow-2xl">
                         <button 
                            onClick={handleStartGeneration}
                            className="bg-[#F9D230] text-[#1A1A1E] px-10 py-4 rounded-full font-bold text-lg hover:bg-[#dfbc2b] transition-all hover:scale-105 flex items-center gap-3 border-4 border-white"
                        >
                            <SparklesIcon className="w-6 h-6" />
                            Generate Designs ({totalCost} Cr)
                        </button>
                    </div>
                </div>
            )}

            {/* --- STEP 3: GENERATING OVERLAY --- */}
            {step === 'generating' && (
                <div className={PlannerStyles.progressContainer}>
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <MagicWandIcon className="w-10 h-10 text-indigo-600 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Creating Magic...</h2>
                    <p className="text-gray-500 font-medium animate-pulse">{loadingText}</p>
                    
                    <div className={PlannerStyles.progressBar}>
                        <div className={PlannerStyles.progressFill} style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-mono">{Math.round(progress)}% Complete</p>
                    
                    <p className="mt-8 text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg font-bold border border-red-100">
                        Do not close this tab while generation is in progress.
                    </p>
                </div>
            )}

            {/* --- STEP 4: DONE / GALLERY --- */}
            {step === 'done' && (
                <div className="space-y-8 animate-fadeIn">
                     <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-green-50 p-6 rounded-2xl border border-green-100">
                        <div>
                            <h2 className="text-2xl font-bold text-green-800 flex items-center gap-2">
                                <CheckIcon className="w-6 h-6"/> Campaign Ready!
                            </h2>
                            <p className="text-green-600 mt-1">Successfully generated {Object.keys(generatedImages).length} assets.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep('config')} className="text-green-700 font-bold text-sm hover:underline px-4">Start New</button>
                            <button 
                                onClick={handleDownloadAll}
                                className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg flex items-center gap-2"
                            >
                                <DownloadIcon className="w-5 h-5"/> Download Kit (ZIP)
                            </button>
                        </div>
                    </div>

                    <div className={PlannerStyles.gridContainer}>
                        {plan.map((post) => {
                            const imgUrl = generatedImages[post.id];
                            return (
                                <div key={post.id} className={PlannerStyles.resultCard}>
                                    {imgUrl ? (
                                        <>
                                            <img src={imgUrl} className={PlannerStyles.resultImage} alt={post.topic} />
                                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
                                                {post.dayLabel}
                                            </div>
                                            {post.headline && (
                                                <div className="absolute bottom-16 left-2 bg-purple-600/90 text-white text-[9px] font-bold px-2 py-1 rounded-md max-w-[90%] truncate">
                                                    Ad: {post.headline}
                                                </div>
                                            )}
                                            <div className={PlannerStyles.resultOverlay}>
                                                <button 
                                                    onClick={() => downloadImage(imgUrl, `post_${post.date}.jpg`)}
                                                    className="bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-xs hover:bg-gray-100 flex items-center gap-2"
                                                >
                                                    <DownloadIcon className="w-4 h-4"/> Save Image
                                                </button>
                                                <button 
                                                    onClick={() => navigator.clipboard.writeText(post.caption)}
                                                    className="text-white text-xs font-bold hover:text-indigo-300 mt-2"
                                                >
                                                    Copy Caption
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-4 text-center">
                                            <XIcon className="w-8 h-8 mb-2 opacity-50"/>
                                            <span className="text-xs font-bold">Failed to Generate</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            
            {toast && (
                <ToastNotification 
                    message={toast.msg} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </div>
    );
};
