import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, IndustryType } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid, TextAreaField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { 
    MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, LockIcon, PencilIcon, UploadIcon, PlusIcon, InformationCircleIcon, LightningIcon, CollectionModeIcon, ApparelIcon, BrandKitIcon, UserIcon, SparklesIcon, ShieldCheckIcon, MagicWandIcon, PaperAirplaneIcon, RefreshIcon,
    UsersIcon
} from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, refineAdCreative, analyzeProductForAdConcepts, AdConcept } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, getUserBrands, activateBrand, getRandomVaultImage } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { RefundModal } from '../components/RefundModal';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';

// --- CONSTANTS ---
const MODEL_TYPES = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
const MODEL_REGIONS = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
const SKIN_TONES = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
const BODY_TYPES = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
const COMPOSITION_TYPES = ['Single Model', 'Group Shot'];
const SHOT_TYPES = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

const INDUSTRY_PLACEHOLDERS: Record<string, string> = {
    'ecommerce': "e.g. Organic lavender soap. Focus on artisanal texture and luxury packaging. Target: Eco-conscious gift shoppers.",
    'realty': "e.g. Modern 3BHK penthouse with floor-to-ceiling glass. Highlight the sunset view and spacious balcony.",
    'food': "e.g. Triple-stack wagyu burger with melted cheddar. Focus on the juice and steam. Use warm, rustic kitchen lighting.",
    'saas': "e.g. Project management dashboard. Focus on the 'clean' interface and task completion charts. Minimalist tech vibe.",
    'fmcg': "e.g. Eco-friendly laundry detergent pods. Highlight the dissolvable packaging and clean scent. Fresh laundry environment.",
    'fashion': "e.g. Summer linen collection. Model in a sunny beach setting. Focus on fabric texture and natural lighting.",
    'education': "e.g. Online MBA course. Professional student in a modern workspace. Focus on career growth and flexibility.",
    'services': "e.g. Business consulting firm. Collaborative meeting room setting. Focus on trust, growth, and teamwork."
};

// --- HELPERS ---
const MAP_KIT_TO_AD_INDUSTRY = (type?: IndustryType): any => {
    switch (type) {
        case 'physical': return 'ecommerce';
        case 'digital': return 'saas';
        case 'realty': return 'realty';
        case 'fashion': return 'fashion';
        case 'service': return 'services';
        case 'food': return 'food';
        case 'fmcg': return 'fmcg';
        case 'education': return 'education';
        default: return null;
    }
};

const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; base: string }> = {
    'ecommerce': { label: 'E-Commerce', icon: EcommerceAdIcon, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200', base: 'blue' },
    'fmcg': { label: 'FMCG / CPG', icon: FMCGIcon, color: 'text-green-600', bg: 'bg-green-50/50', border: 'border-green-200', base: 'green' },
    'fashion': { label: 'Fashion', icon: ApparelIcon, color: 'text-pink-500', bg: 'bg-pink-50/50', border: 'border-pink-200', base: 'pink' },
    'realty': { label: 'Real Estate', icon: RealtyAdIcon, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-200', base: 'purple' },
    'food': { label: 'Food & Dining', icon: FoodIcon, color: 'text-orange-600', bg: 'bg-orange-50/50', border: 'border-orange-200', base: 'orange' },
    'saas': { label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-teal-200', base: 'teal' },
    'education': { label: 'Education', icon: EducationAdIcon, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200', base: 'amber' },
    'services': { label: 'Services', icon: ServicesAdIcon, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-200', base: 'indigo' },
};

const CUSTOM_VIBE_KEY = "Custom / Describe Your Own";

const SIMPLE_ARCHETYPES = ["Luxury", "Modern", "Natural", "Moody", "Bright", "Colorful", "Studio", "Simple", CUSTOM_VIBE_KEY];

type AdMakerPhase = 'industry_select' | 'upload' | 'mode_select' | 'scanning' | 'suggestions' | 'manual_config';

const IndustryCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    styles: { card: string; orb: string; icon: string; };
}> = ({ title, desc, icon, onClick, styles }) => (
    <button onClick={onClick} className={`${AdMakerStyles.modeCard} ${styles.card}`}>
        <div className={`${AdMakerStyles.orb} ${styles.orb}`}></div>
        <div className={`${AdMakerStyles.iconGlass} ${styles.icon}`}>{icon}</div>
        <div className={AdMakerStyles.contentWrapper}>
            <h3 className={AdMakerStyles.title}> {title} </h3>
            <p className={AdMakerStyles.desc}> {desc} </p>
        </div>
        <div className={AdMakerStyles.actionBtn}>
            <ArrowRightIcon className={AdMakerStyles.actionIcon}/>
        </div>
    </button>
);

const BrandSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentBrandId?: string;
    onSelect: (brand: BrandKit) => Promise<void>;
    onCreateNew: () => void;
}> = ({ isOpen, onClose, userId, currentBrandId, onSelect, onCreateNew }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [activatingId, setActivatingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getUserBrands(userId).then(list => {
                setBrands(list);
                setLoading(false);
            });
        }
    }, [isOpen, userId]);

    const handleSelect = async (brand: BrandKit) => {
        if (!brand.id) return;
        setActivatingId(brand.id);
        await new Promise(r => setTimeout(r, 500));
        try {
            await onSelect(brand);
        } catch (e) {
            console.error("Selection failed", e);
            setActivatingId(null);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn ${activatingId ? 'cursor-wait' : ''}`} onClick={onClose}>
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10 relative">
                    <div className="flex items-center gap-3">
                         <div className="flex items-center justify-center"><BrandKitIcon className="w-7 h-7 text-indigo-600" /></div>
                         <div><h3 className="text-lg font-black text-gray-900 tracking-tight">Select Identity</h3><p className="text-xs text-gray-500 font-medium">Apply a brand kit to your ad.</p></div>
                    </div>
                    <button onClick={onClose} disabled={!!activatingId} className={`p-2 rounded-full transition-colors ${activatingId ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400'}`}><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1 relative">
                     {loading ? (
                         <div className="flex justify-center py-20">
                             <div className="w-8 h-8 border-4 border-indigo-600 border-t-indigo-600 rounded-full animate-spin"></div>
                         </div>
                     ) : brands.length === 0 ? (
                         <div className="text-center py-10 flex flex-col items-center">
                             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                 <BrandKitIcon className="w-8 h-8 text-gray-400" />
                             </div>
                             <p className="text-gray-500 font-medium text-sm mb-6">No brand kits found.</p>
                             <button onClick={onCreateNew} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20">Create First Brand</button>
                         </div>
                     ) : (
                        <div className={`grid grid-cols-2 gap-4 ${activatingId ? 'pointer-events-none' : ''}`}>
                            {brands.map(brand => {
                                const isActive = currentBrandId === brand.id;
                                const isActivating = activatingId === brand.id;
                                return (
                                    <button 
                                        key={brand.id} 
                                        onClick={(e) => { e.stopPropagation(); handleSelect(brand); }} 
                                        disabled={!!activatingId || isActive}
                                        className={`group relative flex flex-col h-40 rounded-2xl border transition-all duration-300 overflow-hidden text-left ${
                                            isActive 
                                            ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.01]' 
                                            : 'border-gray-200 hover:border-indigo-400 hover:shadow-lg bg-white'
                                        } ${isActivating ? 'ring-2 ring-indigo-600' : ''}`}
                                    >
                                        <div className={`h-20 shrink-0 flex items-center justify-center p-2 border-b transition-colors ${isActive ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50/30 border-gray-100 group-hover:bg-white'}`}>
                                            {brand.logos?.primary ? (
                                                <img src={brand.logos.primary} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" alt="Logo" />
                                            ) : (
                                                <span className="text-2xl font-black text-gray-300">{(brand.companyName || brand.name || '?').substring(0,2).toUpperCase()}</span>
                                            )}
                                            {isActive && !isActivating && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm animate-scaleIn">
                                                    <CheckIcon className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                            {isActivating && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
                                            )}
                                        </div>
                                        <div className={`px-4 py-2 flex-1 min-h-0 flex flex-col justify-center ${isActive ? 'bg-indigo-50/10' : 'bg-white'}`}>
                                            <div>
                                                <h4 className={`font-bold text-xs truncate mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{brand.companyName || brand.name || 'Untitled'}</h4>
                                                <p className="text-[9px] text-gray-500 font-medium truncate opacity-80 uppercase tracking-wide">{brand.industry ? brand.industry.charAt(0).toUpperCase() + brand.industry.slice(1) : 'General'}</p>
                                            </div>
                                            {brand.colors && (
                                                <div className="flex gap-1 mt-1.5">
                                                    <div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.primary || '#ccc' }}></div>
                                                    <div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.secondary || '#eee' }}></div>
                                                    <div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.accent || '#999' }}></div>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                            <button 
                                onClick={onCreateNew} 
                                disabled={!!activatingId}
                                className={`group relative flex flex-col h-40 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-6 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[160px] ${!!activatingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-white group-hover:text-indigo-600 text-gray-400 flex items-center justify-center transition-colors shadow-sm">
                                    <PlusCircleIcon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-700 transition-colors uppercase tracking-wide">Create New</span>
                            </button>
                        </div>
                     )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const CompactUpload: React.FC<{ 
    label: string; 
    subLabel?: string;
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
}> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {subLabel && <span className="text-[9px] text-gray-300 font-medium">{subLabel}</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-indigo-300 transition-all`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-10 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-lg shadow-sm mb-2 group-hover:scale-110 transition-transform border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wide text-center px-2">Upload</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [phase, setPhase] = useState<AdMakerPhase>('industry_select');
    const [industry, setIndustry] = useState<AdMakerInputs['industry'] | null>(null);
    const [uploadedImage, setUploadedImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [suggestedConcepts, setSuggestedConcepts] = useState<AdConcept[]>([]);
    const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);
    
    const [mainImages, setMainImages] = useState<{ url: string; base64: Base64File }[]>([]);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [customReferenceImage, setCustomReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    const [integrationMode, setIntegrationMode] = useState<'product' | 'subject' | null>(null);

    const [vibe, setVibe] = useState('');
    const [customVibe, setCustomVibe] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | ''>(''); 
    const [isCollectionMode, setIsCollectionMode] = useState(false);
    
    const [customTitle, setCustomTitle] = useState('');

    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelParams, setModelParams] = useState<AdMakerInputs['modelParams']>({
        modelType: '', region: '', skinTone: '', bodyType: '', composition: '', framing: ''
    });

    const [productName, setProductName] = useState('');
    const [website, setWebsite] = useState('');
    const [offer, setOffer] = useState('');
    const [description, setDescription] = useState('');

    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const progress = useSimulatedProgress(loading || isRefining);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const refineCost = 5;

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const brandIndustry = useMemo(() => auth.activeBrandKit ? MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry) : null, [auth.activeBrandKit]);
    const isMismatch = auth.activeBrandKit && industry && brandIndustry !== industry;

    const filteredVibes = useMemo(() => {
        if (!industry) return [];
        return SIMPLE_ARCHETYPES;
    }, [industry]);

    useEffect(() => {
        if (vibe && !filteredVibes.includes(vibe)) {
            setVibe('');
        }
    }, [filteredVibes]);

    useEffect(() => {
        if (auth.activeBrandKit) {
            const kit = auth.activeBrandKit;
            const mapped = MAP_KIT_TO_AD_INDUSTRY(kit.industry);
            if (mapped) setIndustry(mapped);
            setProductName(kit.companyName || kit.name || '');
            setWebsite(kit.website || '');
            
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(res => {
                    setLogoImage({ url: kit.logos.primary!, base64: res });
                }).catch(err => console.warn("Failed to auto-load brand logo", err));
            }

            setMainImages([]);
            setIsCollectionMode(false);
            setIntegrationMode(null);
        }
    }, [auth.activeBrandKit]);

    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining 
                ? ["Elite Retoucher: Analyzing ad depth...", "Optical Audit: Tracing branding spill...", "Contact Correction: Recalculating typography shadows...", "Global Illumination: Polishing masterpiece..."]
                : [
                    "CMO Intelligence: Researching March 2026 Market Trends...",
                    "Trend Analysis: Identifying Viral Visual Aesthetics...",
                    "Art Direction: Architecting High-Conversion Hierarchy...",
                    "Optical Audit: Locking Sacred Product Identity...",
                    "Production: Simulating Ray-Traced Global Illumination...",
                    "Elite Retoucher: Final 8K Pixel Polish..."
                ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

    const handleUpload = (setter: any, multi = false) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const processed = await Promise.all(files.map(async f => {
                const b64 = await fileToBase64(f);
                return { url: URL.createObjectURL(f), base64: b64 };
            }));
            
            if (multi) {
                if (isCollectionMode) {
                    setMainImages(prev => [...prev, ...processed].slice(0, 5));
                } else {
                    setMainImages(processed.slice(0, 1));
                }
            }
            else setter(processed[0]);
        }
        e.target.value = '';
    };

    const toggleProduct = async (imgUrl: string) => {
        const existingIdx = mainImages.findIndex(img => img.url === imgUrl);
        if (existingIdx > -1) {
            setMainImages(prev => prev.filter((_, i) => i !== existingIdx));
        } else {
            if (isCollectionMode) {
                if (mainImages.length < 5) {
                    try {
                        const b64 = await urlToBase64(imgUrl);
                        setMainImages(prev => [...prev, { url: imgUrl, base64: b64 }]);
                    } catch (e) {
                        console.error("Failed to load product", e);
                    }
                } else {
                    setNotification({ msg: "Max 5 products allowed for collections.", type: 'info' });
                }
            } else {
                try {
                    const b64 = await urlToBase64(imgUrl);
                    setMainImages([{ url: imgUrl, base64: b64 }]);
                } catch (e) {
                    console.error("Failed to load product", e);
                }
            }
        }
    };

    const handleGenerate = async () => {
        if (!industry || mainImages.length === 0 || !auth.user || !aspectRatio) return;
        if (phase === 'manual_config' && (!description || !productName || !integrationMode)) return;
        if (phase === 'suggestions' && selectedConceptIndex === null) return;
        
        if (isLowCredits) { alert("Insufficient credits."); return; }

        // PRODUCTION MANDATE: Check for selected API key when using pro models
        if (window.aistudio) {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                if (confirm("MagicPixa AdMaker requires a professional AI processing key for high-fidelity 8K output. Would you like to select yours now? (Billing documentation provided in the dialog)")) {
                    await window.aistudio.openSelectKey();
                } else {
                    return;
                }
            }
        }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            // Fetch random reference image from Style Vault based on industry if no custom reference is provided
            let vaultRef = null;
            if (industry && !customReferenceImage) {
                console.log("Fetching vault reference for:", industry);
                vaultRef = await getRandomVaultImage('brand_stylist', industry);
                console.log("Vault reference found:", vaultRef ? "YES" : "NO");
            }

            const inputs: AdMakerInputs = {
                industry, 
                mainImages: mainImages.map(i => i.base64), 
                logoImage: logoImage?.base64, 
                referenceImage: customReferenceImage 
                    ? { base64: customReferenceImage.base64.base64, mimeType: customReferenceImage.base64.mimeType }
                    : (vaultRef ? await urlToBase64(vaultRef.imageUrl) : null),
                vibe: vibe === CUSTOM_VIBE_KEY ? customVibe : vibe, 
                productName, 
                website, 
                offer, 
                description, 
                aspectRatio: aspectRatio as any,
                modelSource: integrationMode === 'subject' ? modelSource : null, 
                modelImage: integrationMode === 'subject' && modelSource === 'upload' ? modelImage?.base64 : null, 
                modelParams: integrationMode === 'subject' && modelSource === 'ai' ? modelParams : undefined,
                customTitle,
                selectedConcept: phase === 'suggestions' && selectedConceptIndex !== null ? suggestedConcepts[selectedConceptIndex] : undefined
            };
            
            const resB64 = await generateAdCreative(inputs, auth.activeBrandKit, auth.user?.basePlan || undefined);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${resB64}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa AdMaker');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
        } catch (e: any) {
            console.error(e);
            alert("Generation failed. Please check your inputs and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            
            const originalImageParam = mainImages.length > 0 ? { base64: mainImages[0].base64.base64, mimeType: mainImages[0].base64.mimeType } : undefined;
            const originalPromptParam = `Product: ${productName}. Description: ${description}. Vibe: ${vibe === CUSTOM_VIBE_KEY ? customVibe : vibe}. Aspect Ratio: ${aspectRatio}.`;

            const res = await refineAdCreative(
                currentB64.base64, 
                currentB64.mimeType, 
                refineText, 
                auth.user?.basePlan || undefined,
                originalImageParam,
                originalPromptParam
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) await updateCreation(auth.user.uid, lastCreationId, dataUri);
            else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa AdMaker (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Elite Ad Retoucher: Changes applied!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleNewSession = () => {
        setIndustry(null); setMainImages([]); setLogoImage(null); setResultImage(null);
        setCustomReferenceImage(null);
        setVibe(''); setCustomVibe(''); setProductName(''); setWebsite(''); setOffer(''); setDescription('');
        setModelSource(null); setModelImage(null); setIsRefineActive(false); setAspectRatio(''); setIntegrationMode(null);
        setCustomTitle(''); setPhase('industry_select'); setUploadedImage(null); setSuggestedConcepts([]); setSelectedConceptIndex(null);
    };

    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl);
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "AdMaker", lastCreationId || undefined);
            if (res.success) {
                if (res.type === 'refund') {
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null);
                    setNotification({ msg: res.message, type: 'success' });
                } else {
                    setNotification({ msg: res.message, type: 'info' });
                }
            }
            setShowRefundModal(false);
        } catch (e: any) {
            alert("Refund processing failed: " + e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const handleBrandSelect = async (brand: BrandKit) => {
        if (auth.user && brand.id) {
            try {
                const brandData = await activateBrand(auth.user.uid, brand.id);
                auth.setActiveBrandKit(brandData || null);
                setShowBrandModal(false);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleIndustrySelect = (ind: AdMakerInputs['industry']) => {
        setIndustry(ind);
        setPhase('upload');
    };

    const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const b64 = await fileToBase64(file);
            const url = URL.createObjectURL(file);
            setUploadedImage({ url, base64: b64 });
            setMainImages([{ url, base64: b64 }]);
            setPhase('mode_select');
        }
    };

    const handleModeSelect = async (mode: 'product' | 'subject') => {
        setIntegrationMode(mode);
        setPhase('scanning');
        
        try {
            if (uploadedImage) {
                const concepts = await analyzeProductForAdConcepts(
                    uploadedImage.base64.base64,
                    uploadedImage.base64.mimeType,
                    mode === 'product' ? 'product' : 'model',
                    auth.activeBrandKit
                );
                setSuggestedConcepts(concepts);
                setPhase('suggestions');
            }
        } catch (error) {
            console.error("Scan failed", error);
            setPhase('manual_config');
        }
    };

    const handleConceptSelect = (index: number) => {
        setSelectedConceptIndex(index);
        const concept = suggestedConcepts[index];
        setCustomTitle(concept.title);
        setDescription(concept.description);
        // We can also pre-fill other fields if needed
        setPhase('manual_config');
    };

    const canGenerate = !!industry && mainImages.length > 0 && !!aspectRatio && !isLowCredits && (
        phase === 'suggestions' ? (selectedConceptIndex !== null) : (
            !!description && !!productName && !!integrationMode && (
                integrationMode === 'product' ? true : (modelSource === 'ai' ? (!!modelParams?.modelType && !!modelParams?.region) : (!!modelImage))
            )
        )
    );

    const ratioIcons = {
        '1:1': <div className="w-3.5 h-3.5 border-2 border-current rounded-sm shadow-sm"></div>,
        '4:5': <div className="w-3 h-4 border-2 border-current rounded-sm shadow-sm"></div>,
        '9:16': <div className="w-2.5 h-5 border-2 border-current rounded-sm shadow-sm"></div>
    };

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker"
                description="Turn product photos into high-converting ads. The CMO engine researches 2025 trends, applies AIDA copywriting, and engineers world-class visuals."
                icon={<MagicAdsIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading || isRefining}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                hideGenerateButton={true}
                resultImage={resultImage}
                creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate}
                onNewSession={handleNewSession}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onReport={() => setShowRefundModal(true)} /> : null}
                canvasOverlay={<RefinementPanel isActive={isRefineActive && !!resultImage} isRefining={isRefining} onClose={() => setIsRefineActive(false)} onRefine={handleRefine} refineCost={refineCost} />}
                customActionButtons={resultImage ? (
                    <button 
                        onClick={() => setIsRefineActive(!isRefineActive)}
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        <span>Make Changes</span>
                    </button>
                ) : null}
                resultHeightClass="h-[850px]"
                generateButtonStyle={{ className: "!bg-[#F9D230] !text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] hover:!bg-[#dfbc2b]", hideIcon: true, label: "Generate Ad" }}
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 overflow-hidden group mx-auto shadow-sm">
                        <LoadingOverlay isVisible={loading || isRefining} loadingText={loadingText} progress={progress} />
                        
                        {phase === 'scanning' && (
                            <div className={AdMakerStyles.analysisOverlay}>
                                <div className={AdMakerStyles.scanLine}></div>
                                <div className={AdMakerStyles.scanGradient}></div>
                                <div className={AdMakerStyles.analysisBadge}>
                                    <SparklesIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-sm font-black uppercase tracking-widest">Deep Scanning Image...</span>
                                </div>
                            </div>
                        )}

                        {phase === 'upload' && !uploadedImage && (
                            <div 
                                onClick={() => document.getElementById('main-upload-ad')?.click()}
                                className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50/20 transition-all group p-8"
                            >
                                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center text-gray-300 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-6 border border-gray-100">
                                    <CloudUploadIcon className="w-12 h-12" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900">Upload Product</h3>
                                <p className="text-xs text-gray-400 mt-2 uppercase tracking-[0.2em] font-bold">PNG, JPG or WEBP</p>
                                <input id="main-upload-ad" type="file" className="hidden" accept="image/*" onChange={handleMainImageUpload} />
                            </div>
                        )}

                        {uploadedImage && (
                            <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
                                <div className="absolute top-6 left-6 z-40">
                                    <div className="flex flex-col gap-2">
                                        <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                                {integrationMode === 'product' ? 'Hero Product Locked' : integrationMode === 'subject' ? 'Subject Context Locked' : 'AI Layout Engine Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                                    <div className="w-full h-full bg-white p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                                        <img src={uploadedImage.url} className="w-full h-full object-contain" alt="Selected Product" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                Generating high-fidelity ads requires <span className="font-bold text-gray-800">{cost} credits</span>.
                            </p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#dfbc2b] transition-all shadow-xl shadow-yellow-500/20 hover:scale-105 active:scale-95">
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className={`${AdMakerStyles.formContainer} ${(loading || isRefining) ? 'opacity-50 pointer-events-none select-none grayscale-[0.2]' : ''}`}>
                            {phase === 'industry_select' && (
                                <div className={AdMakerStyles.modeGrid}>
                                    {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => (
                                        <IndustryCard 
                                            key={key} 
                                            title={conf.label} 
                                            desc={`Engineered for ${conf.label} standards.`} 
                                            icon={<conf.icon className="w-8 h-8"/>} 
                                            onClick={() => handleIndustrySelect(key as any)}
                                            styles={{ card: AdMakerStyles[`card${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.cardEcommerce, orb: AdMakerStyles[`orb${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.orbEcommerce, icon: AdMakerStyles[`icon${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.iconEcommerce }}
                                        />
                                    ))}
                                </div>
                            )}

                            {phase === 'upload' && (
                                <div className="animate-fadeIn">
                                    <button onClick={() => setPhase('industry_select')} className={AdMakerStyles.backButton}>
                                        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                                    </button>
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">Select Ad Mode</h3>
                                        <p className="text-sm text-gray-500">
                                            {!uploadedImage ? "Upload an image on the canvas to enable modes." : "How should we feature your product?"}
                                        </p>
                                    </div>
                                    <div className={AdMakerStyles.engineGrid}>
                                        <button 
                                            disabled={!uploadedImage}
                                            onClick={() => handleModeSelect('product')} 
                                            className={`${AdMakerStyles.engineCard} ${!uploadedImage ? 'opacity-40 grayscale cursor-not-allowed border-gray-100 bg-gray-50' : AdMakerStyles.engineCardInactive} !h-48`}
                                        >
                                            <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbProduct}`}></div>
                                            <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconProduct}`}>
                                                <CubeIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 mt-4">Product Ad</h4>
                                            <p className="text-xs text-gray-500 font-medium">Clean studio setup</p>
                                        </button>
                                        <button 
                                            disabled={!uploadedImage}
                                            onClick={() => handleModeSelect('subject')} 
                                            className={`${AdMakerStyles.engineCard} ${!uploadedImage ? 'opacity-40 grayscale cursor-not-allowed border-gray-100 bg-gray-50' : AdMakerStyles.engineCardInactive} !h-48`}
                                        >
                                            <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbModel}`}></div>
                                            <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconModel}`}>
                                                <UsersIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 mt-4">Model Ad</h4>
                                            <p className="text-xs text-gray-500 font-medium">Human lifestyle context</p>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {phase === 'scanning' && (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-pulse">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                                        <SparklesIcon className="w-12 h-12 text-indigo-600 animate-spin-slow" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 mb-2">Deep Scanning...</h3>
                                    <p className="text-sm text-gray-500 max-w-xs">Analyzing product physics, lighting, and 2025 market trends.</p>
                                </div>
                            )}

                            {phase === 'suggestions' && (
                                <div className="animate-fadeIn">
                                    <button onClick={() => setPhase('upload')} className={AdMakerStyles.backButton}>
                                        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Modes
                                    </button>
                                    <div className="mb-6">
                                        <h3 className="text-xl font-black text-gray-900">AI Suggestions</h3>
                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Select a concept to customize</p>
                                    </div>
                                    
                                    <div className={AdMakerStyles.suggestionGrid}>
                                        {suggestedConcepts.map((concept, idx) => (
                                            <div 
                                                key={idx}
                                                onClick={() => handleConceptSelect(idx)}
                                                className={`${AdMakerStyles.suggestionCard} ${selectedConceptIndex === idx ? AdMakerStyles.suggestionCardSelected : AdMakerStyles.suggestionCardInactive}`}
                                            >
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <h4 className={AdMakerStyles.suggestionTitle}>{concept.title}</h4>
                                                    <p className={AdMakerStyles.suggestionDesc}>{concept.description}</p>
                                                </div>
                                                <div className={AdMakerStyles.suggestionIcon}>
                                                    <SparklesIcon className="w-5 h-5" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {selectedConceptIndex !== null && (
                                        <div className="mt-8 pt-6 border-t border-gray-100 animate-fadeInUp">
                                            <div className={AdMakerStyles.sectionHeader}>
                                                <span className={AdMakerStyles.stepBadge}>+</span>
                                                <label className={AdMakerStyles.sectionTitle}>Finalize Delivery</label>
                                            </div>
                                            <SelectionGrid 
                                                label="Aspect Ratio" 
                                                options={['1:1', '4:5', '9:16']} 
                                                value={aspectRatio} 
                                                onChange={(val: any) => setAspectRatio(val)} 
                                                icons={ratioIcons}
                                            />

                                            {aspectRatio && (
                                                <button 
                                                    onClick={handleGenerate}
                                                    disabled={!canGenerate || loading}
                                                    className={`w-full mt-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                                                        canGenerate && !loading
                                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-indigo-500/25'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {loading ? (
                                                        <><RefreshIcon className="w-5 h-5 animate-spin" /> Generating...</>
                                                    ) : (
                                                        <><SparklesIcon className="w-5 h-5" /> Generate Ad</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => setPhase('manual_config')}
                                        className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-black text-xs uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-600 transition-all"
                                    >
                                        Skip to Manual Config
                                    </button>
                                </div>
                            )}

                            {phase === 'manual_config' && (
                                <>
                                    <button onClick={() => setPhase('suggestions')} className={AdMakerStyles.backButton}>
                                        <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Suggestions
                                    </button>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between animate-fadeIn shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-blue-100 shadow-sm overflow-hidden shrink-0">
                                                    {React.createElement(INDUSTRY_CONFIG[industry!].icon, { className: "w-6 h-6 text-blue-600" })}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Niche</p>
                                                    <p className="text-sm font-black text-blue-900 truncate">
                                                        {INDUSTRY_CONFIG[industry!].label}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setIndustry(null)} 
                                                className="p-2 bg-white text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm shrink-0"
                                                title="Change Industry"
                                            >
                                                <RefreshIcon className="w-3.5 h-3.5"/>
                                            </button>
                                        </div>

                                        {auth.activeBrandKit ? (
                                            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between animate-fadeIn shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm overflow-hidden shrink-0">
                                                        {auth.activeBrandKit.logos?.primary ? (
                                                            <img src={auth.activeBrandKit.logos.primary} className="w-full h-full object-contain p-1" alt="Logo" />
                                                        ) : (
                                                            <BrandKitIcon className="w-6 h-6 text-indigo-600" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Brand</p>
                                                        <p className="text-sm font-black text-indigo-900 truncate">
                                                            {auth.activeBrandKit.companyName || auth.activeBrandKit.name}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setShowBrandModal(true)} 
                                                    className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-blue-100 transition-all border border-indigo-100 shadow-sm shrink-0"
                                                    title="Change Brand"
                                                >
                                                    <RefreshIcon className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setShowBrandModal(true)}
                                                className="group relative flex items-center justify-center gap-3 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl p-4 transition-all duration-300 shadow-sm overflow-hidden"
                                            >
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all">
                                                    <PlusIcon className="w-6 h-6" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Identity</p>
                                                    <p className="text-sm font-black text-indigo-900">Select Brand Kit</p>
                                                </div>
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/10"></div>
                                            </button>
                                        )}
                                    </div>

                                    {/* STEP 1: ENGINE MODE */}
                                    <div className="mb-8">
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>1</span>
                                            <label className={AdMakerStyles.sectionTitle}>Ad Engine Mode</label>
                                        </div>
                                        <div className={AdMakerStyles.engineGrid}>
                                            <button 
                                                onClick={() => setIntegrationMode('product')} 
                                                className={`${AdMakerStyles.engineCard} ${integrationMode === 'product' ? AdMakerStyles.engineCardSelected : AdMakerStyles.engineCardInactive}`}
                                            >
                                                <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbProduct}`}></div>
                                                <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconProduct}`}>
                                                    <CubeIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className={AdMakerStyles.engineTitle}>Product Ad</h4>
                                                <p className={AdMakerStyles.engineDesc}>Studio Setup</p>
                                                {integrationMode === 'product' && <div className={AdMakerStyles.engineCheckBadge}><CheckIcon className="w-3 h-3" /></div>}
                                            </button>
                                            <button 
                                                onClick={() => setIntegrationMode('subject')} 
                                                className={`${AdMakerStyles.engineCard} ${integrationMode === 'subject' ? AdMakerStyles.engineCardSelected : AdMakerStyles.engineCardInactive}`}
                                            >
                                                <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbModel}`}></div>
                                                <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconModel}`}>
                                                    <UsersIcon className="w-6 h-6" />
                                                </div>
                                                <h4 className={AdMakerStyles.engineTitle}>Model Ad</h4>
                                                <p className={AdMakerStyles.engineDesc}>Human Context</p>
                                                {integrationMode === 'subject' && <div className={AdMakerStyles.engineCheckBadge}><CheckIcon className="w-3 h-3" /></div>}
                                            </button>
                                        </div>
                                    </div>

                                    {isMismatch && (
                                        <div className="mb-6 animate-[fadeInUp_0.4s_ease-out] relative group">
                                            <div className="absolute inset-0 bg-amber-400/10 rounded-2xl blur-lg group-hover:bg-amber-400/20 transition-all"></div>
                                            <div className="relative bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                                                <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                                                    <InformationCircleIcon className="w-5 h-5 animate-pulse" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Identity Guard: Context Conflict</p>
                                                    <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                                                        Your Brand Kit is optimized for <span className="font-black underline">{auth.activeBrandKit?.industry}</span>. 
                                                        Generating a <span className="font-black underline">{industry}</span> ad may cause visual errors.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
                                        <div>
                                            <div className={AdMakerStyles.sectionHeader}>
                                                <span className={AdMakerStyles.stepBadge}>1</span>
                                                <label className={AdMakerStyles.sectionTitle}>Product Details</label>
                                            </div>
                                            <div className="space-y-4">
                                                <InputField 
                                                    label="Product Name" 
                                                    placeholder="e.g. Aura Chronograph, Zen Candle, etc." 
                                                    value={productName} 
                                                    onChange={(e: any) => setProductName(e.target.value)} 
                                                />
                                                <TextAreaField 
                                                    label="Ad Context" 
                                                    placeholder={industry ? INDUSTRY_PLACEHOLDERS[industry] : "e.g. 10 Secret features of the new iPhone 15 Pro. Focus on luxury and speed."} 
                                                    value={description} 
                                                    onChange={(e: any) => setDescription(e.target.value)} 
                                                />
                                                <div className="animate-fadeIn">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Manual Title (Optional)</label>
                                                    <InputField 
                                                        placeholder="Leave empty for AI Trendy Title..." 
                                                        value={customTitle} 
                                                        onChange={(e: any) => setCustomTitle(e.target.value)} 
                                                    />
                                                    <p className="text-[9px] text-gray-400 mt-1 italic">If empty, our AI will do a deep search and generate a trendy title.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className={AdMakerStyles.sectionHeader}>
                                                <span className={AdMakerStyles.stepBadge}>2</span>
                                                <label className={AdMakerStyles.sectionTitle}>Visual Mood (Vibes)</label>
                                            </div>
                                            <SelectionGrid 
                                                label="Vibes" 
                                                options={filteredVibes} 
                                                value={vibe} 
                                                onChange={setVibe} 
                                            />
                                            {vibe === CUSTOM_VIBE_KEY && (
                                                <div className="animate-fadeIn mt-2">
                                                    <InputField placeholder="e.g. 90s Polaroid, neon midnight, bright spring..." value={customVibe} onChange={(e: any) => setCustomVibe(e.target.value)} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 pb-20">
                                            <div className={AdMakerStyles.sectionHeader}>
                                                <span className={AdMakerStyles.stepBadge}>3</span>
                                                <label className={AdMakerStyles.sectionTitle}>Final Delivery</label>
                                            </div>
                                            
                                            <SelectionGrid 
                                                label="Aspect Ratio" 
                                                options={['1:1', '4:5', '9:16']} 
                                                value={aspectRatio} 
                                                onChange={(val: any) => setAspectRatio(val)} 
                                                icons={ratioIcons}
                                            />

                                            {aspectRatio && (
                                                <button 
                                                    onClick={handleGenerate}
                                                    disabled={!canGenerate || loading}
                                                    className={`w-full mt-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
                                                        canGenerate && !loading
                                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:scale-[1.02] active:scale-[0.98] shadow-indigo-500/25'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {loading ? (
                                                        <><RefreshIcon className="w-5 h-5 animate-spin" /> Generating...</>
                                                    ) : (
                                                        <><SparklesIcon className="w-5 h-5" /> Generate Ad</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={claimMilestoneBonus as any} onClose={() => setMilestoneBonus(undefined)} />}
            {showBrandModal && auth.user && (
                <BrandSelectionModal 
                    isOpen={showBrandModal} 
                    onClose={() => setShowBrandModal(false)} 
                    userId={auth.user.uid} 
                    currentBrandId={auth.activeBrandKit?.id} 
                    onSelect={handleBrandSelect} 
                    onCreateNew={() => navigateTo('dashboard', 'brand_manager')} 
                />
            )}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="AdMaker" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={handleUpload(null, true)} />
        </>
    );
};

export default PixaAdMaker;
