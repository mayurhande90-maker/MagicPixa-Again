import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, IndustryType } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, LockIcon, PencilIcon, UploadIcon, PlusIcon, InformationCircleIcon, LightningIcon, CollectionModeIcon, ApparelIcon, BrandKitIcon, UserIcon, SparklesIcon, ShieldCheckIcon } from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';

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

// --- NEW COMBINED VIBES (LEHMAN FRIENDLY) ---
const VIBE_MAP: Record<string, string[]> = {
    'ecommerce': ["Luxury & Elegant", "Big Sale / Discount", "In a Real Home"],
    'fmcg': ["Luxury & Elegant", "Big Sale / Discount", "In a Real Home"],
    'fashion': ["Luxury & Elegant", "Big Sale / Discount", "In a Real Home"],
    'realty': ["Grand & Expensive", "Bright & Airy"],
    'food': ["Delicious & Fresh", "Classy & Dim"],
    'saas': ["Clean Studio", "Modern & Sleek"],
    'education': ["Clean Studio", "Modern & Sleek"],
    'services': ["Clean Studio", "Modern & Sleek"],
};

const LAYOUT_TEMPLATES = ['Hero Focus', 'Split Design', 'Bottom Strip', 'Social Proof'];
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
                     {loading ? (<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-indigo-600 rounded-full animate-spin"></div></div>) : brands.length === 0 ? (<div className="text-center py-10 flex flex-col items-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><BrandKitIcon className="w-8 h-8 text-gray-400" /></div><p className="text-gray-500 font-medium text-sm mb-6">No brand kits found.</p><button onClick={onCreateNew} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20">Create First Brand</button></div>) : (
                        <div className={`grid grid-cols-2 gap-4 ${activatingId ? 'pointer-events-none' : ''}`}>{brands.map(brand => {
                                const isActive = currentBrandId === brand.id;
                                const isActivating = activatingId === brand.id;
                                return (<button key={brand.id} onClick={(e) => { e.stopPropagation(); handleSelect(brand); }} disabled={!!activatingId || isActive} className={`group relative flex flex-col h-40 rounded-2xl border transition-all duration-300 overflow-hidden text-left ${isActive ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.01]' : 'border-gray-200 hover:border-indigo-400 hover:shadow-lg bg-white'} ${isActivating ? 'ring-2 ring-indigo-600' : ''}`}>
                                        <div className={`h-20 shrink-0 flex items-center justify-center p-2 border-b transition-colors ${isActive ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50/30 border-gray-100 group-hover:bg-white'}`}>{brand.logos.primary ? (<img src={brand.logos.primary} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" alt="Logo" />) : (<span className="text-2xl font-black text-gray-300">{(brand.companyName || brand.name || '?').substring(0,2).toUpperCase()}</span>)}{isActive && !isActivating && (<div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm animate-scaleIn"><CheckIcon className="w-2.5 h-2.5" /></div>)}{isActivating && (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>)}</div>
                                        <div className={`px-4 py-2 flex-1 min-h-0 flex flex-col justify-center ${isActive ? 'bg-indigo-50/10' : 'bg-white'}`}><div><h4 className={`font-bold text-xs truncate mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{brand.companyName || brand.name || 'Untitled'}</h4><p className="text-[9px] text-gray-500 font-medium truncate opacity-80 uppercase tracking-wide">{brand.industry ? brand.industry.charAt(0).toUpperCase() + brand.industry.slice(1) : 'General'}</p></div>{brand.colors && (<div className="flex gap-1 mt-1.5"><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.primary || '#ccc' }}></div><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.secondary || '#eee' }}></div><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.accent || '#999' }}></div></div>)}</div></button>);
                            })}<button onClick={onCreateNew} disabled={!!activatingId} className={`group relative flex flex-col h-40 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-6 transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 bg-gray-50/30 hover:shadow-md ${activatingId ? 'opacity-50 cursor-not-allowed' : ''}`}><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all border border-gray-200 group-hover:border-indigo-200"><PlusCircleIcon className="w-5 h-5" /></div><span className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-700 transition-colors uppercase tracking-wide">Create New</span></button></div>)}
                </div>
            </div>
        </div>,
        document.body
    );
};

const FocusCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; selected: boolean; onClick: () => void; colorClass: string }> = ({ title, desc, icon, selected, onClick, colorClass }) => (
    <button onClick={onClick} className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 w-full group overflow-hidden ${selected ? `bg-white ${colorClass.replace('text-', 'border-')} shadow-lg ring-1 ${colorClass.replace('text-', 'ring-').replace('600', '100')}` : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'}`}>
        <div className={`mb-3 p-2.5 rounded-xl transition-colors ${selected ? 'bg-opacity-10' : 'bg-gray-50 group-hover:bg-white'} ${selected ? colorClass.replace('text-', 'bg-') : ''}`}><div className={`${selected ? colorClass : 'text-gray-400 group-hover:text-gray-500'}`}>{icon}</div></div>
        <div className="text-left relative z-10"><h4 className={`text-sm font-bold ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{title}</h4><p className="text-[10px] font-medium text-gray-400 mt-1 leading-snug">{desc}</p></div>
        {selected && (<div className={`absolute top-3 right-3 p-1 rounded-full ${colorClass.replace('text-', 'bg-')} text-white shadow-sm`}><CheckIcon className="w-2.5 h-2.5" /></div>)}
    </button>
);

const RatioCard: React.FC<{ label: string; ratio: string; sub: string; selected: boolean; onClick: () => void; colorBase: string }> = ({ label, ratio, sub, selected, onClick, colorBase }) => {
    const getRatioStyle = () => { switch(ratio) { case '9:16': return 'w-3.5 h-6'; case '4:5': return 'w-5 h-6'; default: return 'w-6 h-6'; } };
    const activeBg = `bg-${colorBase}-50`;
    const activeBorder = `border-${colorBase}-500`;
    const activeRing = `ring-${colorBase}-100`;
    const activeText = `text-${colorBase}-700`;
    const activeBoxBorder = `border-${colorBase}-600`;
    const activeBoxBg = `bg-${colorBase}-200`;
    const hoverBorder = `hover:border-${colorBase}-200`;
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all w-full h-full min-h-[90px] ${selected ? `${activeBg} ${activeBorder} shadow-sm ring-1 ${activeRing}` : `bg-white border-gray-100 ${hoverBorder} hover:bg-gray-50`}`}>
            <div className={`border-2 rounded-sm mb-2 ${getRatioStyle()} ${selected ? `${activeBoxBorder} ${activeBoxBg}` : 'border-gray-300 bg-gray-100'}`}></div>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${selected ? activeText : 'text-gray-600'}`}>{label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
        </button>
    );
};

const CompactUpload: React.FC<{ label: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; optional?: boolean; uploadText?: string; isScanning?: boolean; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional, uploadText, isScanning }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>{optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}</div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-all`}>
                    {isScanning && (
                        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                            <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_10px_#60A5FA] absolute top-0 animate-[scan-vertical_1.5s_linear_infinite]"></div>
                            <div className="bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                                <p className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>AI Scanning</p>
                            </div>
                        </div>
                    )}
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    {!isScanning && (
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                    )}
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform relative z-10 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2 relative z-10">{uploadText || "Upload"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
            <style>{`@keyframes scan-vertical { 0% { top: 0%; } 100% { top: 100%; } }`}</style>
        </div>
    );
};

const SmartProductShelf: React.FC<{ activeBrand: BrandKit | null; selectedImageUrls: string[]; onSelect: (url: string) => Promise<void>; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string; isProcessing?: boolean; maxSelections?: number }> = ({ activeBrand, selectedImageUrls, onSelect, onUpload, label, isProcessing, maxSelections = 1 }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const products = activeBrand?.products || [];
    if (products.length === 0) return null;
    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-2 px-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label><span className="text-[9px] text-indigo-400 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Inventory Active</span></div>
            <div className={AdMakerStyles.shelfContainer}><div onClick={() => !isProcessing && inputRef.current?.click()} className={`${AdMakerStyles.shelfCard} ${AdMakerStyles.shelfCardInactive} ${AdMakerStyles.shelfAdd}`}><div className={AdMakerStyles.shelfAddIcon}><PlusIcon className="w-full h-full" /></div><span className={AdMakerStyles.shelfAddText}>New</span></div>{products.map(p => { const isSelected = selectedImageUrls.includes(p.imageUrl); return (<div key={p.id} onClick={() => !isProcessing && onSelect(p.imageUrl)} className={`${AdMakerStyles.shelfCard} ${isSelected ? AdMakerStyles.shelfCardSelected : AdMakerStyles.shelfCardInactive}`}><img src={p.imageUrl} className={AdMakerStyles.shelfImage} alt={p.name} />{isSelected && (<div className={AdMakerStyles.shelfCheck}><CheckIcon className="w-2.5 h-2.5" /></div>)}</div>); })}</div>
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [industry, setIndustry] = useState<'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services' | null>(null);
    const [visualFocus, setVisualFocus] = useState<'product' | 'lifestyle' | 'conceptual' | null>(null);
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | null>(null);
    
    const [mainImages, setMainImages] = useState<{ url: string; base64: Base64File }[]>([]);
    const isRangeMode = mainImages.length > 1;

    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [vibe, setVibe] = useState(''); // NEW COMBINED STATE
    const [layoutTemplate, setTemplate] = useState('');
    const [isRefScanning, setIsRefScanning] = useState(false);
    const [isFetchingProduct, setIsFetchingProduct] = useState(false);
    const [productName, setProductName] = useState('');
    const [offer, setOffer] = useState('');
    const [desc, setDesc] = useState('');
    const [project, setProject] = useState('');
    const [location, setLocation] = useState('');
    const [config, setConfig] = useState('');
    const [features, setFeatures] = useState<string[]>([]);
    const [currentFeature, setCurrentFeature] = useState('');
    const [dishName, setDishName] = useState('');
    const [restaurant, setRestaurant] = useState('');
    const [headline, setHeadline] = useState('');
    const [subheadline, setSubheadline] = useState('');
    const [cta, setCta] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showBrandModal, setShowBrandModal] = useState(false);
    
    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [aiGender, setAiGender] = useState('');
    const [aiEthnicity, setAiEthnicity] = useState('');
    const [aiSkinTone, setAiSkinTone] = useState('');
    const [aiBodyType, setAiBodyType] = useState('');

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const hasBrandProducts = !!auth.activeBrandKit && auth.activeBrandKit.products && auth.activeBrandKit.products.length > 0;
    
    const isIndustryMismatch = useMemo(() => {
        if (!auth.activeBrandKit || !industry) return false;
        const mappedIndustry = MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry);
        if (!mappedIndustry) return false;
        if (mappedIndustry === 'ecommerce' && (industry === 'ecommerce' || industry === 'fmcg')) return false;
        return mappedIndustry !== industry;
    }, [auth.activeBrandKit?.id, auth.activeBrandKit?.industry, industry]);

    useEffect(() => { if (auth.activeBrandKit) { const mapped = MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry); if (mapped) setIndustry(mapped); } }, [auth.activeBrandKit?.id, auth.activeBrandKit?.industry]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa is analyzing structure...", "Pixa is researching market trends...", "Pixa is drafting intelligent copy...", "Pixa is harmonizing layout & light...", "Pixa is polishing pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const getImageLabels = (ind: typeof industry) => { 
        switch(ind) { 
            case 'ecommerce': return { label: 'Product Range', uploadText: 'Add Product Image', item: 'Product', items: 'Products' }; 
            case 'realty': return { label: 'Real Estate Portfolio', uploadText: 'Add Property Photo', item: 'Property', items: 'Properties' }; 
            case 'food': return { label: 'Menu Items', uploadText: 'Add Food Photo', item: 'Dish', items: 'Dishes' }; 
            case 'fashion': return { label: 'Fashion Collection', uploadText: 'Add Outfit', item: 'Outfit', items: 'Outfits' }; 
            case 'saas': return { label: 'Feature Screenshots', uploadText: 'Add Screenshot', item: 'Screenshot', items: 'Screens' }; 
            case 'fmcg': return { label: 'Product Range', uploadText: 'Add Product Image', item: 'Product', items: 'Products' }; 
            case 'education': return { label: 'Institution Assets', uploadText: 'Add Image', item: 'Asset', items: 'Assets' }; 
            case 'services': return { label: 'Service Portfolio', uploadText: 'Add Project', item: 'Work', items: 'Projects' }; 
            default: return { label: 'Main Assets', uploadText: 'Add Hero', item: 'Asset', items: 'Assets' }; 
        } 
    };

    useEffect(() => { if (auth.activeBrandKit) { const kit = auth.activeBrandKit; if (kit.logos.primary) { urlToBase64(kit.logos.primary).then(base64 => { setLogoImage({ url: kit.logos.primary!, base64 }); }).catch(console.warn); } if (kit.website) setCta(`Visit ${kit.website}`); } else { setLogoImage(null); setCta(''); } }, [auth.activeBrandKit?.id, industry]);

    const handleUploadMain = async (e: React.ChangeEvent<HTMLInputElement>, slot?: number) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const data = { url: URL.createObjectURL(file), base64 };
            if (slot !== undefined) {
                const next = [...mainImages];
                next[slot] = data;
                setMainImages(next);
            } else {
                setMainImages([data]);
            }
        }
        e.target.value = '';
    };

    const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setLogoImage({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleUploadModel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setModelImage({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleInventorySelect = async (url: string) => {
        setIsFetchingProduct(true);
        try {
            const exists = mainImages.find(m => m.url === url);
            if (exists) {
                setMainImages(mainImages.filter(m => m.url !== url));
            } else {
                if (mainImages.length < 3) {
                    const base64 = await urlToBase64(url);
                    setMainImages([...mainImages, { url, base64 }]);
                } else {
                    const { items } = getImageLabels(industry);
                    setNotification({ msg: `Limit reached: Maximum 3 ${items.toLowerCase()}.`, type: 'info' });
                }
            }
        } catch (e) { console.error(e); } finally { setIsFetchingProduct(false); }
    };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setReferenceImage({ url: URL.createObjectURL(file), base64 });
            setIsRefScanning(true);
            setTimeout(() => { setIsRefScanning(false); }, 2500);
        }
        e.target.value = '';
    };

    const addFeature = () => {
        const trimmed = currentFeature.trim();
        if (trimmed && !features.includes(trimmed) && features.length < 5) {
            setFeatures([...features, trimmed]);
            setCurrentFeature('');
        }
    };

    const handleBrandSelect = async (brand: BrandKit) => { if (auth.user && brand.id) { try { const brandData = await activateBrand(auth.user.uid, brand.id); auth.setActiveBrandKit(brandData || null); const mapped = MAP_KIT_TO_AD_INDUSTRY(brandData?.industry); if (mapped) setIndustry(mapped); setNotification({ msg: `Applied ${brand.companyName || brand.name} strategy.`, type: 'success' }); setShowBrandModal(false); } catch (error) { console.error(error); } } };

    const handleGenerate = async () => {
        if (mainImages.length === 0 || !industry || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const inputs: AdMakerInputs = { 
                industry, visualFocus: visualFocus || undefined, aspectRatio: aspectRatio || undefined, mainImages: mainImages.map(m => m.base64), logoImage: logoImage?.base64, 
                vibe, // COMBINED VIBE
                productName, offer, description: desc, project, location, config, features, dishName, restaurant, headline, cta, subheadline, 
                occasion: vibe, 
                audience: vibe, 
                layoutTemplate: referenceImage ? undefined : layoutTemplate,
                referenceImage: referenceImage?.base64,
                modelSource: visualFocus === 'lifestyle' ? (modelSource || undefined) : undefined,
                modelImage: (visualFocus === 'lifestyle' && modelSource === 'upload') ? modelImage?.base64 : undefined,
                modelParams: (visualFocus === 'lifestyle' && modelSource === 'ai') ? { gender: aiGender, ethnicity: aiEthnicity, skinTone: aiSkinTone, bodyType: aiBodyType } : undefined
            };
            const assetUrl = await generateAdCreative(inputs, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const finalImageUrl = `data:image/png;base64,${assetUrl}`;
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, `Pixa AdMaker (${industry})`); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { setIndustry(null); setMainImages([]); setResultImage(null); setReferenceImage(null); setVisualFocus(null); setAspectRatio(null); setProductName(''); setOffer(''); setDesc(''); setProject(''); setLocation(''); setConfig(''); setFeatures([]); setDishName(''); setRestaurant(''); setHeadline(''); setCta(''); setSubheadline(''); setVibe(''); setTemplate(''); setLastCreationId(null); setModelSource(null); setModelImage(null); };
    
    const handleEditorSave = async (newUrl: string) => { setResultImage(newUrl); if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl); };

    // --- MISSING HANDLERS ADDED BELOW ---

    // FIX: Added handleClaimBonus to resolve ReferenceError
    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    // FIX: Added handleDeductEditCredit to resolve ReferenceError
    const handleDeductEditCredit = async () => {
        if (auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser (AdMaker)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    // FIX: Added handleRefundRequest to resolve ReferenceError
    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "AdMaker Image", lastCreationId || undefined);
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

    const canGenerate = mainImages.length > 0 && !!industry && !!vibe && (referenceImage ? true : !!layoutTemplate) && (
        (visualFocus !== 'lifestyle' || (modelSource === 'ai' && !!aiGender) || (modelSource === 'upload' && !!modelImage))
    ) && !!aspectRatio && !!visualFocus && (
        ((industry === 'ecommerce' || industry === 'fmcg' || industry === 'fashion') && !!productName) || (industry === 'realty' && !!project) || (industry === 'food' && !!dishName) || ((industry === 'saas' || industry === 'education' || industry === 'services') && !!headline)
    );
    
    const activeConfig = industry ? INDUSTRY_CONFIG[industry] : null;
    const vibes = industry ? VIBE_MAP[industry] : [];

    return (
        <>
            <FeatureLayout title="Pixa AdMaker" description="Create high-converting ad creatives instantly. Simply pick a vibe and go." icon={<MagicAdsIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId} activeBrandKit={auth.activeBrandKit} isBrandCritical={true} onNewSession={handleNewSession} onEdit={() => setShowMagicEditor(true)} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null} resultHeightClass={aspectRatio === '9:16' ? "h-[950px]" : "h-[750px]"} hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Ad" }} scrollRef={scrollRef}
                leftContent={<div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">{loading || isFetchingProduct ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{isFetchingProduct ? 'Loading from inventory...' : loadingText}</p></div>) : (<div className="text-center opacity-50 select-none"><div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-50`}><MagicAdsIcon className="w-12 h-12 text-gray-400" /></div><h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3><p className="text-sm text-gray-300 mt-2">{industry ? 'Enter details on the right' : 'Select an industry to start'}</p></div>)}</div>}
                rightContent={isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                    <div className={`h-full flex flex-col ${loading ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>{!industry ? (<div className={AdMakerStyles.modeGrid}>
                                {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => (<IndustryCard key={key} title={conf.label} desc={`Marketing for ${conf.label}`} icon={<conf.icon className={`w-8 h-8 ${AdMakerStyles.iconEcommerce}`}/>} onClick={() => setIndustry(key as any)} styles={{ card: `bg-gradient-to-br ${conf.bg.replace('50/50', '100')} border-${conf.base}-100`, orb: `bg-${conf.base}-300 -top-20 -right-20`, icon: conf.color }} />))}
                            </div>) : (
                                <div className={AdMakerStyles.formContainer}>
                                    {/* FIX: Introduced scope for missing variables using an immediate function */}
                                    {(() => {
                                        const { label: mainLabel, item, items } = getImageLabels(industry);
                                        return (
                                            <>
                                                <div className="mb-4 animate-fadeIn"><div className="grid grid-cols-2 gap-3">{activeConfig && (<button onClick={() => setIndustry(null)} className={`p-3 rounded-xl border transition-all group ${activeConfig.bg} ${activeConfig.border} flex items-center gap-3`}><div className={`p-2 rounded-lg bg-white shadow-sm ${activeConfig.color}`}><activeConfig.icon className="w-5 h-5" /></div><div className="min-w-0 flex-1"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Category</p><h2 className={`text-sm font-black ${activeConfig.color} truncate leading-tight`}>{activeConfig.label}</h2></div></button>)}<button onClick={() => setShowBrandModal(true)} className="p-3 rounded-xl border border-indigo-100 bg-white hover:bg-indigo-50 transition-all flex items-center gap-3 group text-left overflow-hidden">{auth.activeBrandKit ? (<><div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-indigo-50 shadow-sm shrink-0 p-0.5">{auth.activeBrandKit.logos.primary ? <img src={auth.activeBrandKit.logos.primary} className="w-full h-full object-contain" /> : <BrandKitIcon className="w-5 h-5 text-indigo-500" />}</div><div className="min-w-0 flex-1"><p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Identity</p><h3 className="text-xs font-black text-indigo-900 truncate leading-tight">{auth.activeBrandKit.companyName || auth.activeBrandKit.name}</h3></div></>) : (<><div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-indigo-500"><PlusCircleIcon className="w-5 h-5" /></div><span className="text-xs font-bold text-gray-400 group-hover:text-indigo-600">Brand Kit</span></>)}</button></div></div>

                                                {/* ASSETS */}
                                                <div>
                                                    <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>1</span><label className={AdMakerStyles.sectionTitle}>Visual Assets</label></div>
                                                    {hasBrandProducts ? (
                                                        <SmartProductShelf activeBrand={auth.activeBrandKit} selectedImageUrls={mainImages.map(m => m.url)} onSelect={handleInventorySelect} onUpload={(e) => handleUploadMain(e, mainImages.length)} label={mainLabel} isProcessing={isFetchingProduct} maxSelections={3} />
                                                    ) : (
                                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                                            {/* FIX: Resolved 'item' and 'mainLabel' find name errors by using extracted variables */}
                                                            {[0, 1, 2].map(slot => (<CompactUpload key={slot} label={slot === 0 ? `Hero ${item}` : `${item} ${slot + 1}`} uploadText="Add" image={mainImages[slot] || null} onUpload={(e) => handleUploadMain(e, slot)} onClear={() => setMainImages(mainImages.filter((_, i) => i !== slot))} icon={slot === 0 ? <CloudUploadIcon className="w-4 h-4 text-indigo-500"/> : <PlusIcon className="w-4 h-4 text-gray-400"/>} heightClass="h-24" />))}
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                        <CompactUpload label="Logo" image={logoImage} onUpload={handleUploadLogo} onClear={() => setLogoImage(null)} icon={<CloudUploadIcon className="w-4 h-4 text-indigo-500"/>} optional={true} heightClass="h-20" />
                                                        <CompactUpload label="Style Reference" image={referenceImage} onUpload={handleRefUpload} onClear={() => setReferenceImage(null)} icon={<UploadIcon className="w-4 h-4 text-pink-500"/>} optional={true} heightClass="h-20" isScanning={isRefScanning} />
                                                    </div>
                                                </div>

                                                {/* NEW COMBINED VIBE SECTION */}
                                                <div>
                                                    <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>2</span><label className={AdMakerStyles.sectionTitle}>Campaign Vibe</label></div>
                                                    <SelectionGrid label="Choose a Vibe" options={vibes} value={vibe} onChange={setVibe} />
                                                    {!referenceImage && vibe && (
                                                        <SelectionGrid label="Layout Composition" options={isRangeMode ? COLLECTION_TEMPLATES : LAYOUT_TEMPLATES} value={layoutTemplate} onChange={setTemplate} />
                                                    )}
                                                </div>

                                                {/* DETAILS */}
                                                <div>
                                                    <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>3</span><label className={AdMakerStyles.sectionTitle}>Ad Settings</label></div>
                                                    <div className="grid grid-cols-3 gap-2 mb-4"><RatioCard label="Square" sub="Feed" ratio="1:1" selected={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} colorBase={activeConfig?.base || 'indigo'} /><RatioCard label="Portrait" sub="4:5" ratio="4:5" selected={aspectRatio === '4:5'} onClick={() => setAspectRatio('4:5')} colorBase={activeConfig?.base || 'indigo'} /><RatioCard label="Story" sub="Reels" ratio="9:16" selected={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} colorBase={activeConfig?.base || 'indigo'} /></div>
                                                    <div className="flex gap-2 mb-4"><FocusCard title={item} desc="Studio lighting focus" icon={<CubeIcon className="w-5 h-5"/>} selected={visualFocus === 'product'} onClick={() => setVisualFocus('product')} colorClass={activeConfig?.color || "text-indigo-600"} /><FocusCard title="Lifestyle" desc="Model using item" icon={<UserIcon className="w-5 h-5"/>} selected={visualFocus === 'lifestyle'} onClick={() => setVisualFocus('lifestyle')} colorClass={activeConfig?.color || "text-indigo-600"} /></div>
                                                    
                                                    {visualFocus === 'lifestyle' && (
                                                        <div className="animate-fadeInUp space-y-4 pt-2">
                                                            <div className={AdMakerStyles.modelSelectionGrid}>
                                                                <button onClick={() => setModelSource('ai')} className={`${AdMakerStyles.modelSelectionCard} ${modelSource === 'ai' ? 'border-indigo-500 bg-indigo-50' : ''}`}><SparklesIcon className="w-5 h-5"/> <span className="text-[10px] font-bold">Pixa Model</span></button>
                                                                <button onClick={() => setModelSource('upload')} className={`${AdMakerStyles.modelSelectionCard} ${modelSource === 'upload' ? 'border-indigo-500 bg-indigo-50' : ''}`}><UserIcon className="w-5 h-5"/> <span className="text-[10px] font-bold">Own Model</span></button>
                                                            </div>
                                                            {modelSource === 'ai' && <div className="space-y-3"><SelectionGrid label="Gender" options={['Female', 'Male']} value={aiGender} onChange={setAiGender} /><SelectionGrid label="Ethnicity" options={['International', 'Indian', 'Asian']} value={aiEthnicity} onChange={setAiEthnicity} /></div>}
                                                            {modelSource === 'upload' && <CompactUpload label="Model Photo" image={modelImage} onUpload={handleUploadModel} onClear={() => setModelImage(null)} icon={<UserIcon className="w-6 h-6 text-blue-400"/>} heightClass="h-40" />}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* COPY */}
                                                <div>
                                                    <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>4</span><label className={AdMakerStyles.sectionTitle}>Campaign Copy</label></div>
                                                    {industry === 'ecommerce' || industry === 'fmcg' || industry === 'fashion' ? (
                                                        <div className="space-y-3"><InputField placeholder={`${item} Name`} value={productName} onChange={(e:any) => setProductName(e.target.value)} /><InputField placeholder="Highlights / Offer" value={desc} onChange={(e:any) => setDesc(e.target.value)} /></div>
                                                    ) : industry === 'realty' ? (
                                                        <div className="space-y-3"><InputField placeholder="Project Name" value={project} onChange={(e:any) => setProject(e.target.value)} /><InputField placeholder="Location & Details" value={location} onChange={(e:any) => setLocation(e.target.value)} /></div>
                                                    ) : (
                                                        <div className="space-y-3"><InputField placeholder="Main Headline" value={headline} onChange={(e:any) => setHeadline(e.target.value)} /><InputField placeholder="CTA Text" value={cta} onChange={(e:any) => setCta(e.target.value)} /></div>
                                                    )}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                    </div>
                )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="AdMaker" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            {showBrandModal && auth.user && <BrandSelectionModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} userId={auth.user.uid} currentBrandId={auth.activeBrandKit?.id} onSelect={handleBrandSelect} onCreateNew={() => navigateTo('dashboard', 'brand_manager')} />}
        </>
    );
};
