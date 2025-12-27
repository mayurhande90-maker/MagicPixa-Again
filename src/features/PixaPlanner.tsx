
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
    CopyIcon, ChevronRightIcon, CampaignStudioIcon, StrategyStarIcon,
    CogIcon, PlusIcon, EyeIcon
} from '../components/icons';
import { generateContentPlan, generatePostImage, extractPlanFromDocument, analyzeProductPhysically, CalendarPost, PlanConfig } from '../services/plannerService';
import { deductCredits, saveCreation, getUserBrands, activateBrand } from '../firebase';
import { base64ToBlobUrl, urlToBase64, downloadImage, rawFileToBase64, resizeImage } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';
// @ts-ignore
import JSZip from 'jszip';

type Step = 'config' | 'review' | 'done';

// --- COMPONENTS ---

const BrandSelectionGate: React.FC<{
    brands: BrandKit[];
    onSelect: (brand: BrandKit) => void;
    onCreate: () => void;
    isLoading: boolean;
    activatingId: string | null;
}> = ({ brands, onSelect, onCreate, isLoading, activatingId }) => {
    return (
        <div className="relative h-full w-full flex flex-col items-center justify-center p-6 overflow-hidden min-h-[600px]">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-50 to-white -z-20"></div>
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] -z-10 animate-pulse"></div>
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -z-10"></div>

            <div className="relative z-10 max-w-4xl w-full text-center">
                {isLoading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                        <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">Loading Agency Data...</p>
                    </div>
                ) : brands.length > 0 ? (
                    <div className="animate-fadeIn">
                        <div className="mb-10">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-gray-100 transform rotate-6 hover:rotate-0 transition-transform duration-500">
                                <BrandKitIcon className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Select Brand Strategy</h2>
                            <p className="text-gray-500 font-medium">Which brand campaign are we planning today?</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
                            {brands.map(brand => (
                                <button
                                    key={brand.id}
                                    onClick={() => onSelect(brand)}
                                    disabled={!!activatingId}
                                    className={`group relative bg-white/60 backdrop-blur-md p-6 rounded-3xl border transition-all duration-300 text-left flex flex-col gap-4 ${
                                        activatingId === brand.id 
                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-white scale-[1.02]' 
                                        : !!activatingId 
                                            ? 'opacity-50 grayscale border-gray-200 cursor-not-allowed' 
                                            : 'border-gray-200 hover:border-indigo-500 hover:bg-white hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer'
                                    }`}
                                >
                                    {activatingId === brand.id && (
                                        <div className="absolute inset-0 z-20 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-3xl">
                                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-110 transition-transform">
                                            {brand.logos.primary ? (
                                                <img src={brand.logos.primary} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-black text-gray-300 uppercase">{brand.companyName ? brand.companyName.substring(0,2) : (brand.name || '??').substring(0,2)}</span>
                                            )}
                                        </div>
                                        <div className={`transition-opacity p-2 rounded-full ${activatingId === brand.id ? 'opacity-100 bg-indigo-50 text-indigo-600' : 'opacity-0 group-hover:opacity-100 bg-indigo-50 text-indigo-600'}`}>
                                            <ArrowRightIcon className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 leading-tight truncate">{brand.companyName || brand.name}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 group-hover:text-indigo-500 transition-colors">
                                            {activatingId === brand.id ? 'Activating...' : 'Activate Context'}
                                        </p>
                                    </div>
                                </button>
                            ))}
                            
                            {/* Create New Card */}
                            <button
                                onClick={onCreate}
                                disabled={!!activatingId}
                                className={`group relative border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 p-6 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[160px] ${!!activatingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-white group-hover:text-indigo-600 text-gray-400 flex items-center justify-center transition-colors shadow-sm">
                                    <PlusIcon className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wide">Create New Brand</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fadeIn bg-white/80 backdrop-blur-xl p-10 rounded-[2.5rem] shadow-2xl border border-white/50 max-w-lg mx-auto">
                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LockIcon className="w-10 h-10 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-3">Agency Setup Required</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            Campaign Studio needs a Brand Kit (Logo, Colors, Products) to generate high-fidelity posts. Let's set up your first client profile.
                        </p>
                        <button
                            onClick={onCreate}
                            className="bg-[#1A1A1E] text-white px-8 py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2 mx-auto w-full"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Create Brand Kit</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

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
            <span className={`text-[clamp(12px,1.6vh,14px)] font-bold block ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>{title}</span>
            {description && <span className="text-[clamp(9px,1.2vh,11px)] text-gray-400 font-medium leading-tight block mt-1">{description}</span>}
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
        <div className={PlannerStyles.logContainer}>
            <div className={PlannerStyles.logHeader}>
                <LightningIcon className="w-3 h-3 text-indigo-400 animate-pulse" />
                <h4 className={PlannerStyles.logTitle}>Deep Strategy Intelligence</h4>
            </div>
            <div className="space-y-3">
                {logs.map((log, idx) => {
                    const isLast = idx === logs.length - 1;
                    return (
                        <div key={idx} className={`${PlannerStyles.logItem} ${!isLast ? 'opacity-60' : 'animate-fadeIn'}`}>
                            <div className="shrink-0 mt-1">
                                {!isLast ? (
                                    <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-sm animate-scaleIn">
                                        <CheckIcon className="w-2.5 h-2.5 text-white stroke-[3px]" />
                                    </div>
                                ) : (
                                    <div className={`${PlannerStyles.logDot} bg-indigo-500 animate-pulse ring-4 ring-indigo-500/20`}></div>
                                )}
                            </div>
                            <p className={`${PlannerStyles.logText} ${isLast ? 'text-white font-bold' : 'text-gray-400'}`}>
                                {log}
                            </p>
                        </div>
                    );
                })}
                <div ref={logEndRef} />
            </div>
        </div>
    );
};

const ProgressModal: React.FC<{ loadingText: string; logs: string[]; progress: number }> = ({ loadingText, logs, progress }) => {
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-[2.5rem] p-[min(6vh,32px)] md:p-[min(8vh,64px)] max-w-lg w-full shadow-2xl flex flex-col items-center text-center relative overflow-hidden transform scale-100 animate-bounce-slight" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                <div className="w-[clamp(48px,10vh,80px)] h-[clamp(48px,10vh,80px)] border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-[min(4vh,32px)]"></div>
                <h2 className="text-[clamp(18px,3vh,24px)] font-black text-gray-900 mb-2">Agency processing active.</h2>
                <p className="text-[clamp(12px,1.6vh,14px)] text-gray-500 font-medium mb-[min(4vh,32px)] h-10">{loadingText || 'Architecting High-Fidelity Assets...'}</p>
                
                <ThinkingLog logs={logs} />

                <div className={PlannerStyles.progressBar + " mt-[min(4vh,32px)] w-full h-2 bg-gray-100 rounded-full overflow-hidden"}>
                    <div className={PlannerStyles.progressFill + " h-full bg-indigo-600 transition-all duration-300"} style={{ width: `${progress}%` }}></div>
                </div>
                <p className="text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 mt-4 tracking-widest uppercase">{Math.round(progress)}% COMPLETE</p>
            </div>
        </div>,
        document.body
    );
};

/**
 * Settings Modal for Refinement
 */
const SettingsModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    config: PlanConfig; 
    onApply: (newConfig: PlanConfig) => void;
}> = ({ isOpen, onClose, config, onApply }) => {
    // Prefill Month/Country, clear Frequency/MixType as requested
    const [localConfig, setLocalConfig] = useState<PlanConfig>({
        ...config,
        frequency: '',
        mixType: '' as any
    });
    
    // Reset local state when modal opens to ensure Frequency/MixType are cleared every time it pops up
    useEffect(() => {
        if (isOpen) {
            setLocalConfig({
                ...config,
                frequency: '',
                mixType: '' as any
            });
        }
    }, [isOpen, config]);

    // Button is disabled until ALL fields are entered
    const isFormComplete = !!(localConfig.month && localConfig.country && localConfig.frequency && localConfig.mixType);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] p-[min(6vh,32px)] md:p-[min(8vh,48px)] max-w-3xl w-full shadow-2xl relative overflow-y-auto max-h-[90vh] animate-bounce-slight" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-[min(4vh,32px)] border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3 text-indigo-600">
                        <h2 className="text-[clamp(18px,2.5vh,24px)] font-black text-gray-900 uppercase tracking-tight">Refine Strategy</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-[min(4vh,32px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 uppercase tracking-widest mb-2">Target Month</label>
                            <select value={localConfig.month} onChange={e => setLocalConfig({...localConfig, month: e.target.value})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 appearance-none">
                                <option value="" disabled>Select Month</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 uppercase tracking-widest mb-2">Target Market</label>
                            <input value={localConfig.country} onChange={e => setLocalConfig({...localConfig, country: e.target.value})} className="w-full p-3.5 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Pune, India" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 uppercase tracking-widest mb-3">Posting Frequency</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                                    icon={<CalendarIcon className="w-8 h-8"/>} 
                                    selected={localConfig.frequency === f.label} 
                                    onClick={() => setLocalConfig({...localConfig, frequency: f.label})} 
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 uppercase tracking-widest mb-3">Strategy Algorithm</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                { label: 'Balanced', desc: '70/20/10 Hybrid Mix' },
                                { label: 'Ads Only', desc: 'Performance Marketing' },
                                { label: 'Lifestyle Only', desc: 'Aesthetic Storytelling' }
                            ].map(m => (
                                <OptionCard 
                                    key={m.label} 
                                    title={m.label} 
                                    description={m.desc} 
                                    icon={<StrategyStarIcon className="w-8 h-8"/>} 
                                    selected={localConfig.mixType === m.label} 
                                    onClick={() => setLocalConfig({...localConfig, mixType: m.label as any})} 
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mt-[min(6vh,48px)] border-t border-gray-100 pt-6">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 text-gray-500 font-bold text-sm hover:bg-gray-50 rounded-2xl transition-all"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => isFormComplete && onApply(localConfig)} 
                        disabled={!isFormComplete}
                        className={`flex-[2] py-4 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                            !isFormComplete 
                            ? 'bg-gray-100 text-gray-400 cursor-default grayscale' 
                            : 'bg-[#F9D230] text-[#1A1A1E] hover:bg-[#dfbc2b] hover:scale-[1.02] shadow-yellow-500/10'
                        }`}
                    >
                        Apply Strategy
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/**
 * Multi-image Full-screen Gallery Viewer
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
                            onClick={() => downloadImage(imageUrl, `CampaignStudio_${post.date.replace(/\//g, '-')}.jpg`)}
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
                                        isCopied ? 'bg-green-50 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
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
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    
    // Initial configuration with no pre-selections
    const [config, setConfig] = useState<PlanConfig>({
        month: '',
        year: new Date().getFullYear(),
        goal: 'Sales & Promos',
        frequency: '',
        country: '', 
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
    
    // Brand Gate States
    const [userBrands, setUserBrands] = useState<BrandKit[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [activatingBrandId, setActivatingBrandId] = useState<string | null>(null);

    const activeBrand = useMemo(() => auth.activeBrandKit, [auth.activeBrandKit]);
    const documentInputRef = useRef<HTMLInputElement>(null);

    const costPerImage = 10;
    const totalCost = plan.length * costPerImage;
    const userCredits = auth.user?.credits || 0;

    // Validation for enabling the generation button
    const isConfigValid = config.month && config.country && config.frequency && config.mixType;

    // Fetch Brands if no active brand
    useEffect(() => {
        if (auth.user?.uid && !activeBrand) {
            setIsLoadingBrands(true);
            getUserBrands(auth.user.uid).then(brands => {
                setUserBrands(brands);
                setIsLoadingBrands(false);
            }).catch(e => {
                console.error("Failed to load brands", e);
                setIsLoadingBrands(false);
            });
        }
    }, [auth.user?.uid, !!activeBrand]);

    const handleActivateBrand = async (brand: BrandKit) => {
        if (!auth.user) return;
        if (!brand.id) {
            setToast({ msg: "Error: Invalid Brand ID", type: 'error' });
            return;
        }

        setActivatingBrandId(brand.id);
        try {
            const brandData = await activateBrand(auth.user.uid, brand.id);
            auth.setActiveBrandKit(brandData || null);
        } catch (e) {
            console.error("Activation failed", e);
            setToast({ msg: "Failed to switch brand.", type: 'error' });
        } finally {
            setActivatingBrandId(null);
        }
    };

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeBrand) return;

        setIsGenerating(true);
        setLogs([]);
        setProgress(10);
        addLog("Initializing High-Precision Document Scanner...");
        addLog("Syncing with Brand Kit Product Catalog...");
        
        try {
            const raw = await rawFileToBase64(file);
            addLog("Executing Deep Reasoning Engine (Gemini 3 Pro)...");
            addLog("Normalizing date structures and extracting topics...");
            addLog("Intelligently mapping calendar items to specific products...");
            
            const importedPlan = await extractPlanFromDocument(activeBrand, raw.base64, raw.mimeType);
            setPlan(importedPlan);
            setProgress(100);
            setStep('review');
            setToast({ msg: `Successfully imported ${importedPlan.length} posts from document!`, type: 'success' });
        } catch (error: any) {
            console.error(error);
            setToast({ msg: error.message, type: 'error' });
        } finally {
            setIsGenerating(false);
            e.target.value = '';
        }
    };

    const handleGeneratePlan = async (configOverride?: PlanConfig) => {
        if (!activeBrand) return;
        const targetConfig = configOverride || config;
        
        setIsGenerating(true); 
        setLogs([]);
        setProgress(0);
        
        try {
            addLog("Initiating Art Direction Protocol...");
            const products = activeBrand.products || [];
            const audits: Record<string, ProductAnalysis> = { ...productAudits };
            
            // Only analyze products if not already audited to save tokens/time
            const unAudited = products.filter(p => !audits[p.id]);
            for (let i = 0; i < unAudited.length; i++) {
                const p = unAudited[i];
                addLog(`Analyzing geometry for: ${p.name}...`);
                const res = await urlToBase64(p.imageUrl);
                const audit = await analyzeProductPhysically(p.id, res.base64, res.mimeType);
                audits[p.id] = audit;
                setProgress(((i + 1) / unAudited.length) * 40); 
            }
            setProductAudits(audits);

            addLog(`Deep Research: Scanning trends for "${targetConfig.country}"...`);
            addLog(`Applying "Rule of Thirds" and negative space logic...`);
            
            const newPlan = await generateContentPlan(activeBrand, targetConfig, audits);
            setPlan(newPlan);
            
            // If images were already generated, we clear them as the strategy changed
            setGeneratedImages({});
            
            setProgress(100);
            setStep('review');
            if (configOverride) setConfig(configOverride);
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
                    await saveCreation(auth.user.uid, storageUri, `CampaignStudio: ${post.topic}`);
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

    const handleRefineSettings = () => {
        setIsSettingsModalOpen(true);
    };

    const handleApplySettings = async (newConfig: PlanConfig) => {
        setIsSettingsModalOpen(false); // Close immediately so user can see the progress modal
        await handleGeneratePlan(newConfig);
    };

    const handleStartNew = () => {
        if (confirm("Heads up! Starting a new project will clear your current campaign plan. Do you want to proceed?")) {
            setStep('config');
            setPlan([]);
            setGeneratedImages({});
        }
    };

    // --- BRAND SELECTION GATE ---
    if (!activeBrand) {
        return (
            <BrandSelectionGate 
                brands={userBrands} 
                onSelect={handleActivateBrand} 
                onCreate={() => navigateTo('dashboard', 'brand_manager')}
                isLoading={isLoadingBrands}
                activatingId={activatingBrandId}
            />
        );
    }

    return (
        <div className="p-[min(3.5vh,24px)] max-w-7xl mx-auto pb-32 animate-fadeIn relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-[min(4vh,32px)] gap-4">
                <div className="flex items-center gap-4">
                    <div className="text-indigo-600"><CampaignStudioIcon className="w-14 h-14" /></div>
                    <div>
                        <h1 className="text-[clamp(24px,3.5vh,30px)] font-black text-gray-900 tracking-tight">Campaign Studio</h1>
                        <p className="text-[clamp(11px,1.5vh,14px)] text-gray-500">Agency Strategy for <span className="font-bold text-indigo-600">{activeBrand.companyName}</span></p>
                    </div>
                </div>
                {step === 'config' && (
                    <button onClick={() => documentInputRef.current?.click()} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border-2 border-indigo-100 rounded-xl text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm group">
                        <DocumentTextIcon className="w-5 h-5 group-hover:scale-110 transition-transform"/> Import CSV / PDF / Excel
                    </button>
                )}
            </div>

            {/* Step 1: Config */}
            {step === 'config' && (
                <div className="space-y-[min(4vh,32px)] bg-white p-[min(5vh,32px)] rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                        <div>
                            <label className="block text-[clamp(8px,1.1vh,10px)] font-bold text-gray-400 uppercase mb-2">Target Month</label>
                            <select value={config.month} onChange={e => setConfig({...config, month: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 appearance-none">
                                <option value="" disabled>Select Month</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[clamp(8px,1.1vh,10px)] font-bold text-gray-400 uppercase mb-2">Target Market</label>
                            <input value={config.country} onChange={e => setConfig({...config, country: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Pune, India or Bangalore" />
                        </div>
                    </div>

                    <div className="relative z-10">
                        <label className="block text-[clamp(8px,1.1vh,10px)] font-bold text-gray-400 uppercase mb-3">Posting Frequency</label>
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
                                    icon={<CalendarIcon className="w-8 h-8"/>} 
                                    selected={config.frequency === f.label} 
                                    onClick={() => setConfig({...config, frequency: f.label})} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10">
                        <label className="block text-[clamp(8px,1.1vh,10px)] font-bold text-gray-400 uppercase mb-3">Strategy Algorithm</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                { label: 'Balanced', desc: '70/20/10 Hybrid Mix' },
                                { label: 'Ads Only', desc: 'Performance Marketing' },
                                { label: 'Lifestyle Only', desc: 'Aesthetic Storytelling' }
                            ].map(m => (
                                <OptionCard 
                                    key={m.label} 
                                    title={m.label} 
                                    description={m.desc} 
                                    icon={<StrategyStarIcon className="w-10 h-10"/>} 
                                    selected={config.mixType === m.label} 
                                    onClick={() => setConfig({...config, mixType: m.label as any})} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 relative z-10">
                        <button 
                            onClick={() => handleGeneratePlan()} 
                            disabled={!isConfigValid}
                            className={`bg-[#F9D230] text-[#1A1A1E] px-10 py-4 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-3 ${!isConfigValid ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-[#dfbc2b] hover:scale-105 shadow-yellow-500/20'}`}
                        >
                            Generate Strategy
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
                <div className="space-y-[min(4vh,24px)] animate-fadeIn">
                    <div className="bg-indigo-600 rounded-3xl p-[min(5vh,32px)] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <h2 className="text-[clamp(20px,3.5vh,28px)] font-black mb-2 flex items-center gap-3"><CheckIcon className="w-8 h-8 p-1 bg-white/20 rounded-full"/> Strategy Engineered</h2>
                            <p className="text-indigo-100 font-medium text-[clamp(11px,1.5vh,15px)]">Verified {plan.length} entries for {activeBrand.companyName}. Each post is designed to maximize engagement and ROI.</p>
                        </div>
                        <button 
                            onClick={handleRefineSettings} 
                            className="relative z-10 bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl text-sm font-bold transition-all border border-white/20"
                        >
                            Refine Settings
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plan.map((post) => {
                            const product = activeBrand.products?.find(p => p.id === post.selectedProductId) || activeBrand.products?.[0];
                            const isCopied = copiedIds.has(post.id);
                            return (
                                <div key={post.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-[min(4vh,28px)] shadow-sm hover:shadow-xl transition-all flex flex-col gap-[min(3vh,24px)] group relative">
                                    {/* Card Top: Date and Meta */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[clamp(8px,1.1vh,10px)] font-black text-gray-400 uppercase tracking-widest">{post.date}</span>
                                            <span className="text-[clamp(12px,1.6vh,14px)] font-black text-indigo-600 uppercase tracking-tight">{post.dayLabel}</span>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wide ${post.postType === 'Ad' ? 'bg-purple-600 text-white shadow-sm' : 'bg-green-600 text-white shadow-sm'}`}>{post.postType}</span>
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
                                        <div className="bg-white border-2 border-gray-100 rounded-3xl p-[min(3vh,20px)] shadow-inner relative group-hover:border-indigo-100 transition-colors">
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

                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                        <button 
                            onClick={handleStartGeneration}
                            className="bg-[#1A1A1E] text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all transform hover:-translate-y-1 hover:scale-105 flex items-center justify-center gap-3"
                        >
                            <SparklesIcon className="w-5 h-5 text-yellow-400" />
                            <span>Launch {plan.length}-Post Campaign</span>
                        </button>
                        <p className="text-[10px] font-bold text-gray-500 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                            Estimated Cost: {totalCost} Credits
                        </p>
                    </div>
                </div>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
                <div className="space-y-10 animate-fadeIn">
                     <div className="bg-emerald-600 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10 text-center md:text-left">
                            <h2 className="text-4xl font-black mb-2 flex items-center justify-center md:justify-start gap-4">
                                <div className="p-2 bg-white/20 rounded-full">
                                    <CheckIcon className="w-10 h-10"/>
                                </div>
                                Campaign Ready!
                            </h2>
                            <p className="text-emerald-50 font-medium text-lg">Your high-fidelity assets for {activeBrand.companyName} have been rendered and saved to your gallery.</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                            <button 
                                onClick={handleDownloadAll}
                                className="bg-white text-emerald-700 px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2"
                            >
                                <DownloadIcon className="w-5 h-5"/> Download All (ZIP)
                            </button>
                            <button 
                                onClick={handleStartNew}
                                className="bg-black/20 hover:bg-black/30 text-white px-8 py-4 rounded-2xl font-bold transition-all border border-white/20"
                            >
                                Start New Project
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {plan.map((post, idx) => (
                            <div 
                                key={post.id} 
                                className={PlannerStyles.resultCard}
                                onClick={() => setViewingIndex(idx)}
                            >
                                <img src={generatedImages[post.id]} className={PlannerStyles.resultImage} alt={post.topic} />
                                <div className={PlannerStyles.resultOverlay}>
                                    <span className="text-white font-bold text-xs">{post.date}</span>
                                    <button className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white border border-white/20">
                                        <EyeIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {isGenerating && (
                <ProgressModal loadingText={loadingText} logs={logs} progress={progress} />
            )}
            
            {isSettingsModalOpen && (
                <SettingsModal 
                    isOpen={isSettingsModalOpen} 
                    onClose={() => setIsSettingsModalOpen(false)} 
                    config={config} 
                    onApply={handleApplySettings} 
                />
            )}

            {viewingIndex !== null && (
                <MultiGalleryViewer 
                    posts={plan} 
                    images={generatedImages} 
                    initialIndex={viewingIndex} 
                    onClose={() => setViewingIndex(null)}
                    onToast={(msg) => setToast({ msg, type: 'info' })}
                />
            )}

            {toast && (
                <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />
            )}

            <input 
                type="file" 
                ref={documentInputRef} 
                className="hidden" 
                accept=".csv,.pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" 
                onChange={handleImportDocument} 
            />
        </div>
    );
};
