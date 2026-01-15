import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, IndustryType } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid, TextAreaField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, LockIcon, PencilIcon, UploadIcon, PlusIcon, InformationCircleIcon, LightningIcon, CollectionModeIcon, ApparelIcon, BrandKitIcon, UserIcon, SparklesIcon, ShieldCheckIcon, MagicWandIcon, PaperAirplaneIcon, RefreshIcon } from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, refineAdCreative } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
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

const VIBE_MAP: Record<string, string[]> = {
    'ecommerce': ["Luxury & Elegant", "Big Sale / Discount", "Lifestyle", "Clean Studio", "Nature", "Cinematic", CUSTOM_VIBE_KEY],
    'fmcg': ["Luxury & Elegant", "Big Sale / Discount", "Lifestyle", "Clean Studio", "Nature", "Cinematic", CUSTOM_VIBE_KEY],
    'fashion': ["Luxury & Elegant", "Big Sale / Discount", "Lifestyle", "Clean Studio", "Nature", "Cinematic", CUSTOM_VIBE_KEY],
    'realty': ["Grand & Expensive", "Bright & Airy", "Cozy & Warm", "Modern & Sharp", "Lush & Green", CUSTOM_VIBE_KEY],
    'food': ["Delicious & Fresh", "Classy & Dim", "Rustic & Homemade", "Vibrant Street", "Clean & Healthy", CUSTOM_VIBE_KEY],
    'saas': ["Modern & Sleek", "Professional & Trust", "Cyberpunk / Neon", "Minimalistic", "High Energy", CUSTOM_VIBE_KEY],
    'education': ["Modern & Sleek", "Professional & Trust", "Cyberpunk / Neon", "Minimalistic", "High Energy", CUSTOM_VIBE_KEY],
    'services': ["Modern & Sleek", "Professional & Trust", "Cyberpunk / Neon", "Minimalistic", "High Energy", CUSTOM_VIBE_KEY],
};

const LAYOUT_TEMPLATES = [
    'Hero Focus', 
    'Split Design', 
    'Bottom Strip', 
    'Social Proof',
    'Magazine Cover',
    'Minimalist Zen',
    'Feature Callout',
    'Action Dynamic',
    'Contrast Grid'
];
const COLLECTION_TEMPLATES = ['The Trio', 'Range Lineup', 'Hero & Variants'];

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
                                            {brand.logos.primary ? (
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
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
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

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [industry, setIndustry] = useState<AdMakerInputs['industry'] | null>(null);
    const [mainImages, setMainImages] = useState<{ url: string; base64: Base64File }[]>([]);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Config
    const [vibe, setVibe] = useState('');
    const [customVibe, setCustomVibe] = useState('');
    const [layoutTemplate, setLayoutTemplate] = useState('Hero Focus');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
    const [isCollectionMode, setIsCollectionMode] = useState(false);
    
    // Model Config
    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelParams, setModelParams] = useState<AdMakerInputs['modelParams']>({
        modelType: '', region: '', skinTone: '', bodyType: '', composition: '', framing: ''
    });

    // Strategy Logic
    const [productName, setProductName] = useState('');
    const [website, setWebsite] = useState('');
    const [offer, setOffer] = useState('');
    const [description, setDescription] = useState('');

    // Results
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement Panel
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 5;

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // --- IDENTITY GUARD LOGIC ---
    const brandIndustry = useMemo(() => auth.activeBrandKit ? MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry) : null, [auth.activeBrandKit]);
    const isMismatch = auth.activeBrandKit && industry && brandIndustry !== industry;

    // SYNC WITH BRAND KIT
    useEffect(() => {
        if (auth.activeBrandKit) {
            const kit = auth.activeBrandKit;
            const mapped = MAP_KIT_TO_AD_INDUSTRY(kit.industry);
            if (mapped) setIndustry(mapped);
            setProductName(kit.companyName || kit.name || '');
            setWebsite(kit.website || '');
            
            // 1. Auto-load Logo
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(res => {
                    setLogoImage({ url: kit.logos.primary!, base64: res });
                }).catch(err => console.warn("Failed to auto-load brand logo", err));
            }

            // USER REQUEST: Inventory products are automatically loaded into shelf, but unselected by default.
            setMainImages([]);
            setIsCollectionMode(false);
            setLayoutTemplate('Hero Focus');
        }
    }, [auth.activeBrandKit]);

    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining 
                ? ["Elite Retoucher: Analyzing ad depth...", "Optical Audit: Tracing branding spill...", "Contact Correction: Recalculating typography shadows...", "Global Illumination: Polishing masterpiece..."]
                : ["CMO Intelligence: Researching 2025 Market Trends...", "Art Direction: Architecting visual hierarchy...", "Optical Audit: Locking product identity...", "Production: Simulating lighting & physics...", "Elite Retoucher: Final pixel polish..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1800);
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
                    setMainImages(prev => [...prev, ...processed].slice(0, 3));
                } else {
                    // In single mode, selecting new upload replaces
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
            // UNSELECT
            setMainImages(prev => prev.filter((_, i) => i !== existingIdx));
        } else {
            // SELECT
            if (isCollectionMode) {
                if (mainImages.length < 3) {
                    try {
                        const b64 = await urlToBase64(imgUrl);
                        setMainImages(prev => [...prev, { url: imgUrl, base64: b64 }]);
                    } catch (e) {
                        console.error("Failed to load product", e);
                    }
                } else {
                    setNotification({ msg: "Max 3 products allowed for collections.", type: 'info' });
                }
            } else {
                // SINGLE MODE: REPLACEMENT LOGIC
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
        if (!industry || mainImages.length === 0 || !auth.user || !description) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const inputs: AdMakerInputs = {
                industry, mainImages: mainImages.map(i => i.base64), logoImage: logoImage?.base64, referenceImage: referenceImage?.base64,
                vibe: vibe === CUSTOM_VIBE_KEY ? customVibe : vibe, productName, website, offer, description, layoutTemplate, aspectRatio,
                modelSource, modelImage: modelImage?.base64, modelParams
            };
            
            const resB64 = await generateAdCreative(inputs, auth.activeBrandKit);
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
            const res = await refineAdCreative(currentB64.base64, currentB64.mimeType, refineText);
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
        setIndustry(null); setMainImages([]); setLogoImage(null); setReferenceImage(null); setResultImage(null);
        setVibe(''); setCustomVibe(''); setProductName(''); setWebsite(''); setOffer(''); setDescription('');
        setModelSource(null); setModelImage(null); setIsRefineActive(false);
    };

    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl);
    };

    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

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

    const canGenerate = !!industry && mainImages.length > 0 && !!description && !isLowCredits;
    const vibes = industry ? VIBE_MAP[industry] : [];

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
                resultImage={resultImage}
                creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
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
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Render Masterpiece Ad" }}
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {(loading || isRefining) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">{loadingText}</p>
                            </div>
                        )}
                        {!industry ? (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MagicAdsIcon className="w-10 h-10 text-blue-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Select an industry to start.</p>
                            </div>
                        ) : mainImages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40 select-none">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                                    <CloudUploadIcon className="w-8 h-8" />
                                </div>
                                <p className="text-lg font-bold text-gray-300">Awaiting Product Selection</p>
                                <p className="text-xs text-gray-300 mt-1 uppercase tracking-widest font-black">Choose items from the shelf on the right</p>
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center p-12">
                                <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                                    {mainImages.map((img, idx) => {
                                        // DYNAMIC STACKING LOGIC (Photo Print Aesthetic)
                                        let transformStyle = '';
                                        let zIndex = 10;
                                        
                                        if (mainImages.length === 1) {
                                            transformStyle = 'rotate(0deg) scale(1.1)';
                                            zIndex = 20;
                                        } else if (mainImages.length === 2) {
                                            transformStyle = idx === 0 ? 'rotate(-6deg) translateX(-15px)' : 'rotate(6deg) translateX(15px)';
                                            zIndex = idx === 1 ? 20 : 10;
                                        } else if (mainImages.length === 3) {
                                            if (idx === 0) transformStyle = 'rotate(-12deg) translateX(-30px)';
                                            else if (idx === 1) transformStyle = 'rotate(0deg) scale(1.05)';
                                            else transformStyle = 'rotate(12deg) translateX(30px)';
                                            zIndex = idx === 1 ? 30 : idx === 2 ? 20 : 10;
                                        }

                                        return (
                                            <div 
                                                key={img.url} 
                                                className="absolute w-[70%] aspect-square transition-all duration-500 ease-out"
                                                style={{ transform: transformStyle, zIndex }}
                                            >
                                                <div className="w-full h-full bg-white p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                                                    <img src={img.url} className="w-full h-full object-contain" alt="Selected Product" />
                                                </div>
                                                {/* Identity Badge Overlay for Photo Prints */}
                                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-tighter shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Pixa Identity Locked
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    <div className={AdMakerStyles.formContainer}>
                        {!industry ? (
                            <div className={AdMakerStyles.modeGrid}>
                                {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => (
                                    <IndustryCard 
                                        key={key} 
                                        title={conf.label} 
                                        desc={`Engineered for ${conf.label} standards.`} 
                                        icon={<conf.icon className="w-8 h-8"/>} 
                                        onClick={() => setIndustry(key as any)}
                                        styles={{ card: AdMakerStyles[`card${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.cardEcommerce, orb: AdMakerStyles[`orb${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.orbEcommerce, icon: AdMakerStyles[`icon${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.iconEcommerce }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <>
                                <button onClick={handleNewSession} className={AdMakerStyles.backButton}>
                                    <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                                </button>

                                {/* 1. Dual-Context Strategy Panel (Now includes Square Logo at Top) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    {/* Brand Identity & Logo Slot */}
                                    <div className={`rounded-3xl p-5 flex flex-col gap-4 animate-fadeIn transition-all border ${
                                        auth.activeBrandKit 
                                        ? 'bg-indigo-50 border-indigo-100 shadow-sm' 
                                        : 'bg-white border-dashed border-gray-200 hover:border-indigo-300'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Active Identity</p>
                                                <p className="text-sm font-black text-indigo-900 truncate">
                                                    {auth.activeBrandKit?.companyName || auth.activeBrandKit?.name || "No Brand Kit"}
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setShowBrandModal(true)} 
                                                className="p-2 bg-white text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm shrink-0"
                                                title={auth.activeBrandKit ? "Change Brand" : "Add Brand"}
                                            >
                                                {auth.activeBrandKit ? <PencilIcon className="w-3.5 h-3.5"/> : <PlusIcon className="w-3.5 h-3.5"/>}
                                            </button>
                                        </div>

                                        <div className="relative group/logo-container w-full flex justify-center">
                                            {logoImage ? (
                                                <div className={AdMakerStyles.logoPreviewBox}>
                                                    <div className={AdMakerStyles.logoBlueprintBg}></div>
                                                    <img src={logoImage.url} className="h-full object-contain relative z-10" />
                                                    <button onClick={() => setLogoImage(null)} className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-xl shadow-md text-red-500 hover:bg-red-50 transition-all z-20 border border-gray-100 opacity-0 group-hover/logo-container:opacity-100"><XIcon className="w-3 h-3"/></button>
                                                </div>
                                            ) : (
                                                <button onClick={() => document.getElementById('logo-upload-ad')?.click()} className="w-full aspect-square max-w-[110px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-[9px] font-bold text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-all bg-white hover:bg-indigo-50/10">
                                                    <CloudUploadIcon className="w-6 h-6"/> <span>Upload Logo</span>
                                                </button>
                                            )}
                                            <input id="logo-upload-ad" type="file" className="hidden" accept="image/*" onChange={handleUpload(setLogoImage)} />
                                        </div>
                                        <p className="text-[8px] text-gray-400 italic text-center px-2">
                                            Identity Lock: Sacred Assets stay identical.
                                        </p>
                                    </div>

                                    {/* Industry Context Slot */}
                                    {industry && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-5 flex flex-col justify-between animate-fadeIn shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Market Focus</p>
                                                    <p className="text-sm font-black text-blue-900 truncate">
                                                        {INDUSTRY_CONFIG[industry].label}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => setIndustry(null)} 
                                                    className="p-2 bg-white text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100 shadow-sm shrink-0"
                                                    title="Change Industry"
                                                >
                                                    <RefreshIcon className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                            <div className="w-full flex justify-center py-4">
                                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm overflow-hidden shrink-0">
                                                    {React.createElement(INDUSTRY_CONFIG[industry].icon, { className: "w-8 h-8 text-blue-600" })}
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-gray-400 italic text-center px-2">
                                                Pixa Agent optimized for {INDUSTRY_CONFIG[industry].label}.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* IDENTITY GUARD MISMATCH WARNING */}
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
                                    {/* 2. Layout & Template */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>1</span>
                                            <label className={AdMakerStyles.sectionTitle}>Composition Blueprint</label>
                                        </div>
                                        
                                        <div className="flex bg-gray-50 p-1 rounded-xl mb-3 border border-gray-100 w-fit">
                                            <button onClick={() => { 
                                                setIsCollectionMode(false); 
                                                setLayoutTemplate('Hero Focus');
                                                // Truncate to 1 item when switching to single mode
                                                if (mainImages.length > 1) {
                                                    setMainImages(prev => prev.slice(0, 1));
                                                }
                                            }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${!isCollectionMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Single Hero</button>
                                            <button onClick={() => { setIsCollectionMode(true); setLayoutTemplate('The Trio'); }} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${isCollectionMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Collection</button>
                                        </div>

                                        <div className={AdMakerStyles.blueprintGrid}>
                                            {(isCollectionMode ? COLLECTION_TEMPLATES : LAYOUT_TEMPLATES).map(temp => (
                                                <button key={temp} onClick={() => setLayoutTemplate(temp)} className={`${AdMakerStyles.blueprintCard} ${layoutTemplate === temp ? AdMakerStyles.blueprintCardSelected : AdMakerStyles.blueprintCardInactive}`}>
                                                    <span className={AdMakerStyles.blueprintLabel}>{temp}</span>
                                                    {layoutTemplate === temp && <div className={AdMakerStyles.blueprintCheck}><CheckIcon className="w-3 h-3"/></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Product Selection / Multi-Upload */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>2</span>
                                            <label className={AdMakerStyles.sectionTitle}>Product Inventory</label>
                                        </div>
                                        <div className={AdMakerStyles.shelfContainer}>
                                            {/* BRAND KIT PRODUCTS - Displayed as toggleable tiles */}
                                            {auth.activeBrandKit?.products?.map((p) => {
                                                const isSelected = mainImages.some(img => img.url === p.imageUrl);
                                                return (
                                                    <div 
                                                        key={p.id} 
                                                        className={`${AdMakerStyles.shelfCard} ${isSelected ? AdMakerStyles.shelfCardSelected : AdMakerStyles.shelfCardInactive}`}
                                                        onClick={() => toggleProduct(p.imageUrl)}
                                                    >
                                                        <img src={p.imageUrl} className={AdMakerStyles.shelfImage} />
                                                        {isSelected && <div className={AdMakerStyles.shelfCheck}><CheckIcon className="w-2.5 h-2.5 text-white"/></div>}
                                                    </div>
                                                );
                                            })}

                                            {/* MANUAL UPLOADS (not from brand kit) */}
                                            {mainImages.filter(img => !auth.activeBrandKit?.products?.some(p => p.imageUrl === img.url)).map((img, idx) => (
                                                <div 
                                                    key={`manual-${idx}`} 
                                                    className={`${AdMakerStyles.shelfCard} ${AdMakerStyles.shelfCardSelected}`}
                                                    onClick={() => setMainImages(prev => prev.filter(i => i.url !== img.url))}
                                                >
                                                    <img src={img.url} className={AdMakerStyles.shelfImage} />
                                                    <div className={AdMakerStyles.shelfCheck}><XIcon className="w-2.5 h-2.5"/></div>
                                                </div>
                                            ))}

                                            {/* ADD BUTTON */}
                                            <div onClick={() => fileInputRef.current?.click()} className={`${AdMakerStyles.shelfCard} ${AdMakerStyles.shelfCardInactive} flex items-center justify-center`}>
                                                <div className={AdMakerStyles.shelfAdd}>
                                                    <PlusIcon className="w-5 h-5 text-gray-300"/>
                                                    <span className={AdMakerStyles.shelfAddText}>Upload</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2 italic px-1">
                                            {isCollectionMode ? "Select up to 3 products. Click again to unselect." : "Select your hero product. Selection replaces the current one."}
                                        </p>
                                    </div>

                                    {/* 4. Model Inclusion (Fashion/Lifestyle) */}
                                    {(industry === 'fashion' || industry === 'ecommerce') && (
                                        <div>
                                            <div className={AdMakerStyles.sectionHeader}>
                                                <span className={AdMakerStyles.stepBadge}>3</span>
                                                <label className={AdMakerStyles.sectionTitle}>Persona & Context</label>
                                            </div>
                                            <div className={AdMakerStyles.modelSelectionGrid}>
                                                <button onClick={() => setModelSource('ai')} className={`${AdMakerStyles.modelSelectionCard} ${modelSource === 'ai' ? AdMakerStyles.modelSelectionCardSelected : AdMakerStyles.modelSelectionCardInactive}`}>
                                                    <div className={`p-2 rounded-full ${modelSource === 'ai' ? 'bg-white text-indigo-600' : 'bg-gray-50 text-gray-400'}`}><SparklesIcon className="w-5 h-5"/></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">AI Human</span>
                                                </button>
                                                <button onClick={() => setModelSource('upload')} className={`${AdMakerStyles.modelSelectionCard} ${modelSource === 'upload' ? AdMakerStyles.modelSelectionCardSelected : AdMakerStyles.modelSelectionCardInactive}`}>
                                                    <div className={`p-2 rounded-full ${modelSource === 'upload' ? 'bg-white text-indigo-600' : 'bg-gray-50 text-gray-400'}`}><UserIcon className="w-5 h-5"/></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Custom Model</span>
                                                </button>
                                            </div>
                                            
                                            {modelSource === 'ai' && (
                                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-fadeIn">
                                                    <select value={modelParams?.modelType} onChange={e => setModelParams({...modelParams!, modelType: e.target.value})} className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                                                        <option value="">Select Persona</option>{MODEL_TYPES.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                    <select value={modelParams?.region} onChange={e => setModelParams({...modelParams!, region: e.target.value})} className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                                                        <option value="">Select Region</option>{MODEL_REGIONS.map(t => <option key={t}>{t}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 5. Campaign Content */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>{ (industry === 'fashion' || industry === 'ecommerce') ? '4' : '3' }</span>
                                            <label className={AdMakerStyles.sectionTitle}>Campaign Intelligence</label>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <SelectionGrid label="Visual Mood / Vibe" options={vibes} value={vibe} onChange={setVibe} />
                                            {vibe === CUSTOM_VIBE_KEY && (
                                                <div className="animate-fadeIn -mt-2">
                                                    <InputField placeholder="e.g. 90s Polaroid, neon midnight, bright spring..." value={customVibe} onChange={(e: any) => setCustomVibe(e.target.value)} />
                                                </div>
                                            )}
                                            <TextAreaField 
                                                label="Ad Context (AIDA Protocol)" 
                                                placeholder="e.g. Organic skincare for glowing morning routine. Focus on texture and ingredients." 
                                                value={description} 
                                                onChange={(e: any) => setDescription(e.target.value)} 
                                            />
                                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                                <ShieldCheckIcon className="w-4 h-4 text-indigo-600"/>
                                                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">AIDA Strategy Engine Active</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 6. Advanced Settings */}
                                    <div className="pt-4 border-t border-gray-100 pb-20">
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>{ (industry === 'fashion' || industry === 'ecommerce') ? '5' : '4' }</span>
                                            <label className={AdMakerStyles.sectionTitle}>Format Settings</label>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 block px-1">Choose Aspect Ratio</label>
                                            <div className="flex flex-wrap gap-2.5">
                                                {(['1:1', '4:5', '9:16'] as const).map(r => (
                                                    <button 
                                                        key={r} 
                                                        onClick={() => setAspectRatio(r)} 
                                                        className={`${AdMakerStyles.ratioButton} ${aspectRatio === r ? AdMakerStyles.ratioButtonActive : AdMakerStyles.ratioButtonInactive}`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={claimMilestoneBonus as any} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
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
            {/* Hidden master product upload input */}
            <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={handleUpload(null, true)} />
        </>
    );
};

export default PixaAdMaker;