import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PaletteIcon, LightbulbIcon, ApparelIcon, BrandKitIcon, SparklesIcon, UserIcon, PlusCircleIcon, LockIcon, PencilIcon, UploadIcon } from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon, BlueprintStarIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, getBlueprintsForIndustry } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';

// --- CONFIGURATION FOR INDUSTRY DISPLAY ---
const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    'ecommerce': { label: 'E-Commerce', icon: EcommerceAdIcon, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200' },
    'fmcg': { label: 'FMCG / CPG', icon: FMCGIcon, color: 'text-green-600', bg: 'bg-green-50/50', border: 'border-green-200' },
    'fashion': { label: 'Fashion', icon: ApparelIcon, color: 'text-pink-500', bg: 'bg-pink-50/50', border: 'border-pink-200' },
    'realty': { label: 'Real Estate', icon: RealtyAdIcon, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-200' },
    'food': { label: 'Food & Dining', icon: FoodIcon, color: 'text-orange-600', bg: 'bg-orange-50/50', border: 'border-orange-200' },
    'saas': { label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-teal-200' },
    'education': { label: 'Education', icon: EducationAdIcon, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200' },
    'services': { label: 'Services', icon: ServicesAdIcon, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-200' },
};

// --- COMPONENT: INDUSTRY CARD ---
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
            <h3 className={AdMakerStyles.title}>{title}</h3>
            <p className={AdMakerStyles.desc}>{desc}</p>
        </div>
        <div className={AdMakerStyles.actionBtn}>
            <ArrowRightIcon className={AdMakerStyles.actionIcon}/>
        </div>
    </button>
);

// --- COMPONENT: BRAND SELECTION MODAL ---
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
        // Simulate slight delay for "activation" feel
        await new Promise(r => setTimeout(r, 500));
        try {
            await onSelect(brand);
        } catch (e) {
            console.error("Selection failed", e);
            setActivatingId(null);
        }
    };

    // LOCK: Prevent closing if processing
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (activatingId) return; // Locked
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div 
            className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn ${activatingId ? 'cursor-wait' : ''}`} 
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100 relative" 
                onClick={e => e.stopPropagation()}
            >
                
                {/* Header (Fixed) */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10 relative">
                    <div className="flex items-center gap-3">
                         <div className="flex items-center justify-center">
                            <BrandKitIcon className="w-7 h-7 text-indigo-600" />
                         </div>
                         <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Select Identity</h3>
                            <p className="text-xs text-gray-500 font-medium">Apply a brand kit to your ad.</p>
                         </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={!!activatingId}
                        className={`p-2 rounded-full transition-colors ${activatingId ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400'}`}
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Grid Content (Scrollable) */}
                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1 relative">
                     {loading ? (
                        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>
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
                                        } ${isActivating ? 'ring-2 ring-indigo-600' : ''} ${activatingId && !isActivating ? 'opacity-50 grayscale' : ''}`}
                                    >
                                        {/* Header / Logo Area - Fixed height h-20 (5rem) to ensure body has space */}
                                        <div className={`h-20 shrink-0 flex items-center justify-center p-2 border-b transition-colors ${isActive ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50/30 border-gray-100 group-hover:bg-white'}`}>
                                            {brand.logos.primary ? (
                                                <img src={brand.logos.primary} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" alt="Logo" />
                                            ) : (
                                                <span className="text-2xl font-black text-gray-300">{(brand.companyName || brand.name || '?').substring(0,2).toUpperCase()}</span>
                                            )}
                                            
                                            {/* Active Badge */}
                                            {isActive && !isActivating && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm animate-scaleIn">
                                                    <CheckIcon className="w-2.5 h-2.5" />
                                                </div>
                                            )}
                                            
                                            {/* Loading Spinner */}
                                            {isActivating && (
                                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20">
                                                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Body - Flex 1 to fill remaining space */}
                                        <div className={`px-4 py-2 flex-1 min-h-0 flex flex-col justify-center ${isActive ? 'bg-indigo-50/10' : 'bg-white'}`}>
                                            <div>
                                                <h4 className={`font-bold text-xs truncate mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                    {brand.companyName || brand.name || 'Untitled'}
                                                </h4>
                                                <p className="text-[9px] text-gray-500 font-medium truncate opacity-80 uppercase tracking-wide">
                                                    {brand.industry ? brand.industry.charAt(0).toUpperCase() + brand.industry.slice(1) : 'General'}
                                                </p>
                                            </div>
                                            
                                            {/* Color Palette Preview - Safe Check */}
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
                            
                            {/* "Add New" Card injected into grid */}
                            <button 
                                onClick={onCreateNew}
                                disabled={!!activatingId}
                                className={`group relative flex flex-col h-40 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-6 rounded-3xl transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 bg-gray-50/30 hover:shadow-md ${activatingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all border border-gray-200 group-hover:border-indigo-200">
                                    <PlusCircleIcon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500 group-hover:text-indigo-700 transition-colors uppercase tracking-wide">Create New</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- COMPONENT: VISUAL FOCUS CARD ---
const FocusCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; selected: boolean; onClick: () => void; colorClass: string }> = ({ title, desc, icon, selected, onClick, colorClass }) => (
    <button 
        onClick={onClick} 
        className={`relative flex flex-col items-start p-4 rounded-2xl border-2 transition-all duration-300 w-full group overflow-hidden ${
            selected 
            ? `bg-white ${colorClass.replace('text-', 'border-')} shadow-lg ring-1 ${colorClass.replace('text-', 'ring-').replace('600', '100')}` 
            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
        }`}
    >
        <div className={`mb-3 p-2.5 rounded-xl transition-colors ${selected ? 'bg-opacity-10' : 'bg-gray-50 group-hover:bg-white'} ${selected ? colorClass.replace('text-', 'bg-') : ''}`}>
             <div className={`${selected ? colorClass : 'text-gray-400 group-hover:text-gray-500'}`}>
                {icon}
             </div>
        </div>
        <div className="text-left relative z-10">
            <h4 className={`text-sm font-bold ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{title}</h4>
            <p className="text-[10px] font-medium text-gray-400 mt-1 leading-snug">{desc}</p>
        </div>
        {selected && (
            <div className={`absolute top-3 right-3 p-1 rounded-full ${colorClass.replace('text-', 'bg-')} text-white shadow-sm`}>
                <CheckIcon className="w-2.5 h-2.5" />
            </div>
        )}
    </button>
);

// --- COMPONENT: RATIO CARD ---
const RatioCard: React.FC<{ label: string; ratio: string; sub: string; selected: boolean; onClick: () => void }> = ({ label, ratio, sub, selected, onClick }) => {
    const getRatioStyle = () => {
        switch(ratio) {
            case '9:16': return 'w-3.5 h-6'; // Taller, narrower for Story
            case '4:5': return 'w-5 h-6';    // Wider vertical for Portrait (approx 0.83 ratio)
            default: return 'w-6 h-6';       // Perfect square 1:1
        }
    };
    
    return (
        <button 
            onClick={onClick} 
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all w-full h-full min-h-[90px] ${
                selected 
                ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                : 'bg-white border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
            }`}
        >
            <div className={`border-2 rounded-sm mb-2 ${getRatioStyle()} ${selected ? 'border-indigo-600 bg-indigo-200' : 'border-gray-300 bg-gray-100'}`}></div>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>{label}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>
        </button>
    );
};

// --- COMPONENT: COMPACT UPLOAD ---
const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    optional?: boolean;
    uploadText?: string;
    isScanning?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional, uploadText, isScanning }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-all`}>
                    
                    {/* Scanning Overlay Effect */}
                    {isScanning && (
                        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                            <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_10px_#60A5FA] absolute top-0 animate-[scan-vertical_1.5s_linear_infinite]"></div>
                            <div className="bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                                <p className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                                    AI Scanning
                                </p>
                            </div>
                        </div>
                    )}
                    
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    {!isScanning && (
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                    )}
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
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

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // 1. SELECTION STATE
    const [industry, setIndustry] = useState<'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services' | null>(null);
    const [visualFocus, setVisualFocus] = useState<'product' | 'lifestyle' | 'conceptual'>('product');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');

    // 2. COMMON ASSETS
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // TONE: Initialized to empty string to ensure user selection
    const [tone, setTone] = useState('');
    
    const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
    
    // Scan State
    const [isRefScanning, setIsRefScanning] = useState(false);
    const [refAnalysisDone, setRefAnalysisDone] = useState(false);

    // 3. INDUSTRY SPECIFIC FIELDS
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

    // 4. UI STATE
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [showBrandModal, setShowBrandModal] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Cost Logic
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    // Helper to get labels based on industry
    const getImageLabels = (ind: typeof industry) => {
        switch(ind) {
            case 'ecommerce': return { label: 'Product Image', uploadText: 'Upload Product Image' };
            case 'realty': return { label: 'Property Image', uploadText: 'Upload Property Photo' };
            case 'food': return { label: 'Dish Image', uploadText: 'Upload Dish Photo' };
            case 'fashion': return { label: 'Apparel Image', uploadText: 'Upload Clothing/Model' };
            case 'saas': return { label: 'Software Interface', uploadText: 'Upload Screenshot' };
            case 'fmcg': return { label: 'Product Package', uploadText: 'Upload Package' };
            case 'education': return { label: 'Institution/Class', uploadText: 'Upload Image' };
            case 'services': return { label: 'Service Context', uploadText: 'Upload Image' };
            default: return { label: 'Main Image', uploadText: 'Upload Hero' };
        }
    };

    // Dynamic Tone Options based on Industry
    const getToneOptions = (ind: string | null) => {
        switch(ind) {
            case 'fashion': return ['Chic', 'Street', 'Luxury', 'Minimal', 'Vintage'];
            case 'food': return ['Spicy', 'Fresh', 'Sweet', 'Comfort', 'Gourmet'];
            case 'realty': return ['Luxury', 'Modern', 'Cozy', 'Classic', 'Rustic'];
            case 'saas':
            case 'education':
            case 'services': return ['Modern', 'Trustworthy', 'Creative', 'Clean', 'Corporate'];
            default: return ['Modern', 'Bold', 'Minimalist', 'Playful', 'Luxury']; // Default for E-com/FMCG
        }
    };

    // AUTO-FILL FROM SESSION BRAND KIT & INDUSTRY CHANGE
    useEffect(() => {
        if (auth.activeBrandKit) {
            const kit = auth.activeBrandKit;
            
            // 1. Assets (Logo/Website) - Only need to load once or if kit changes
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(base64 => {
                    setLogoImage({ url: kit.logos.primary!, base64 });
                }).catch(console.warn);
            }
            if (kit.website) setCta(`Visit ${kit.website}`);
        } else {
            // BRAND INTEGRATION OFF: Clear the fetched assets
            setLogoImage(null);
            setCta('');
        }
    }, [auth.activeBrandKit, industry]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = '';
    };

    // Special handler for Reference Upload
    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setReferenceImage({ url: URL.createObjectURL(file), base64 });
            setSelectedBlueprint(null); 
            
            setIsRefScanning(true);
            setRefAnalysisDone(false);
            
            setTimeout(() => {
                setIsRefScanning(false);
                setRefAnalysisDone(true);
            }, 2500);
        }
        e.target.value = '';
    };

    const handleClearRef = () => {
        setReferenceImage(null);
        setRefAnalysisDone(false);
    };

    const addFeature = () => {
        if (currentFeature.trim() && features.length < 4) {
            setFeatures([...features, currentFeature.trim()]);
            setCurrentFeature('');
        }
    };

    const handleBrandSelect = async (brand: BrandKit) => {
        if (auth.user && brand.id) {
            try {
                // Fetch brand data (session-based)
                const brandData = await activateBrand(auth.user.uid, brand.id);
                auth.setActiveBrandKit(brandData || null);
                setNotification({ msg: `Applied ${brand.companyName || brand.name} session strategy.`, type: 'success' });
                setShowBrandModal(false);
            } catch (error) {
                console.error("Brand switch failed", error);
                setNotification({ msg: "Failed to switch brand", type: 'error' });
            }
        }
    };

    const handleGenerate = async () => {
        // Reference is now optional
        if (!mainImage || !industry || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        setLoadingText("Constructing intelligent layout...");

        try {
            const inputs: AdMakerInputs = {
                industry,
                visualFocus,
                aspectRatio,
                mainImage: mainImage.base64,
                logoImage: logoImage?.base64,
                tone: selectedBlueprint ? '' : tone, // Enforce One Pilot Rule
                blueprintId: selectedBlueprint || undefined,
                productName, offer, description: desc,
                project, location, config, features,
                dishName, restaurant,
                headline, cta, subheadline
            };

            const assetUrl = await generateAdCreative(inputs, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const finalImageUrl = `data:image/png;base64,${assetUrl}`; 
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, `Pixa AdMaker (${industry})`); setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) { 
            console.error(e); 
            alert(`Generation failed: ${e.message}`); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleNewSession = () => {
        setIndustry(null);
        setMainImage(null);
        setResultImage(null);
        setReferenceImage(null);
        setSelectedBlueprint(null);
        setRefAnalysisDone(false);
        setVisualFocus('product');
        setAspectRatio('1:1');
        // Clear forms
        setProductName(''); setOffer(''); setDesc('');
        setProject(''); setLocation(''); setConfig(''); setFeatures([]);
        setDishName(''); setRestaurant('');
        setHeadline(''); setCta(''); setSubheadline('');
        setLastCreationId(null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Ad Creative", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsRefunding(false); } };
    
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa AdMaker (Edited)'); 
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const u = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };
    const handleClaimBonus = async () => { if (auth.user && milestoneBonus) { const u = await claimMilestoneBonus(auth.user.uid, milestoneBonus); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };

    // Validation Logic
    const isValid = !!mainImage && !isLowCredits && (
        (industry === 'ecommerce' && !!productName) ||
        (industry === 'fmcg' && !!productName) ||
        (industry === 'fashion' && !!productName) ||
        (industry === 'realty' && !!project) ||
        (industry === 'food' && !!dishName) ||
        ((industry === 'saas' || industry === 'education' || industry === 'services') && !!headline)
    );
    
    // Result Height Class depends on ratio
    const getResultHeight = () => {
        if (aspectRatio === '9:16') return "h-[950px]";
        if (aspectRatio === '4:5') return "h-[850px]";
        return "h-[750px]";
    };

    const { label: mainLabel, uploadText: mainText } = getImageLabels(industry);

    // Get Active Config for Header
    const activeConfig = industry ? INDUSTRY_CONFIG[industry] : null;
    const activeToneOptions = getToneOptions(industry);

    // Dynamic Blueprints based on Industry
    const currentBlueprints = industry ? getBlueprintsForIndustry(industry) : [];

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker" 
                description="Intelligent ad creation. Supports Instagram Reels, Stories, and Feeds with safe-zone logic." 
                icon={<MagicAdsIcon className="w-14 h-14" />} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={isValid} 
                onGenerate={handleGenerate} 
                resultImage={resultImage} 
                creationId={lastCreationId}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                onResetResult={undefined}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null} 
                resultHeightClass={getResultHeight()}
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Smart Ad" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-50`}>
                                    <MagicAdsIcon className="w-12 h-12 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3>
                                <p className="text-sm text-gray-300 mt-2">{industry ? 'Ready for inputs' : 'Select an industry to start'}</p>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {!industry ? (
                                <div className={AdMakerStyles.modeGrid}>
                                    <IndustryCard 
                                        title="E-Commerce" desc="Product ads, Sales" 
                                        icon={<EcommerceAdIcon className={`w-8 h-8 ${AdMakerStyles.iconEcommerce}`}/>} 
                                        onClick={() => setIndustry('ecommerce')}
                                        styles={{ card: AdMakerStyles.cardEcommerce, orb: AdMakerStyles.orbEcommerce, icon: AdMakerStyles.iconEcommerce }}
                                    />
                                    <IndustryCard 
                                        title="FMCG / CPG" desc="Packaged Goods" 
                                        icon={<FMCGIcon className={`w-8 h-8 text-green-600`}/>} 
                                        onClick={() => setIndustry('fmcg')}
                                        styles={{ card: "bg-gradient-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#DCEDC8]", orb: "bg-gradient-to-tr from-green-300 to-lime-200 -top-20 -right-20", icon: "text-green-600" }}
                                    />
                                    <IndustryCard 
                                        title="Fashion" desc="Lifestyle & Apparel" 
                                        icon={<ApparelIcon className={`w-8 h-8 text-pink-500`}/>} 
                                        onClick={() => setIndustry('fashion')}
                                        styles={{ card: "bg-gradient-to-br from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]", orb: "bg-gradient-to-tr from-pink-300 to-rose-200 -top-20 -right-20", icon: "text-pink-500" }}
                                    />
                                    <IndustryCard 
                                        title="Real Estate" desc="Property flyers" 
                                        icon={<RealtyAdIcon className={`w-8 h-8 ${AdMakerStyles.iconRealty}`}/>} 
                                        onClick={() => setIndustry('realty')}
                                        styles={{ card: AdMakerStyles.cardRealty, orb: AdMakerStyles.orbRealty, icon: AdMakerStyles.iconRealty }}
                                    />
                                    <IndustryCard 
                                        title="Food & Dining" desc="Menus, Promos" 
                                        icon={<FoodIcon className={`w-8 h-8 ${AdMakerStyles.iconFood}`}/>} 
                                        onClick={() => setIndustry('food')}
                                        styles={{ card: AdMakerStyles.cardFood, orb: AdMakerStyles.orbFood, icon: AdMakerStyles.iconFood }}
                                    />
                                    <IndustryCard 
                                        title="SaaS / Tech" desc="B2B, Software" 
                                        icon={<SaaSRequestIcon className={`w-8 h-8 ${AdMakerStyles.iconSaaS}`}/>} 
                                        onClick={() => setIndustry('saas')}
                                        styles={{ card: AdMakerStyles.cardSaaS, orb: AdMakerStyles.orbSaaS, icon: AdMakerStyles.iconSaaS }}
                                    />
                                    <IndustryCard 
                                        title="Education" desc="Courses, Schools" 
                                        icon={<EducationAdIcon className={`w-8 h-8 text-amber-600`}/>} 
                                        onClick={() => setIndustry('education')}
                                        styles={{ card: "bg-gradient-to-br from-[#FFF3E0] via-[#FFE0B2] to-[#FFCC80]", orb: "bg-gradient-to-tr from-amber-300 to-orange-200 -top-20 -right-20", icon: "text-amber-600" }}
                                    />
                                    <IndustryCard 
                                        title="Services" desc="Consulting, Agency" 
                                        icon={<ServicesAdIcon className={`w-8 h-8 text-indigo-600`}/>} 
                                        onClick={() => setIndustry('services')}
                                        styles={{ card: "bg-gradient-to-br from-[#EDE7F6] via-[#D1C4E9] to-[#B39DDB]", orb: "bg-gradient-to-tr from-indigo-300 to-purple-200 -top-20 -right-20", icon: "text-indigo-600" }}
                                    />
                                </div>
                            ) : (
                                <div className={AdMakerStyles.formContainer}>
                                    {/* COMPACT HEADER GRID */}
                                    <div className="mb-6 animate-fadeIn">
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* 1. Industry Box (Click to Change) */}
                                            {activeConfig && (
                                                <button 
                                                    onClick={() => setIndustry(null)}
                                                    className={`relative overflow-hidden p-3 rounded-xl border transition-all group hover:shadow-md hover:scale-[1.02] active:scale-95 text-left ${activeConfig.bg} ${activeConfig.border} flex items-center gap-3`}
                                                >
                                                    <div className={`p-2 rounded-lg bg-white shadow-sm ${activeConfig.color}`}>
                                                        <activeConfig.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Industry</p>
                                                            <div className="bg-white/50 px-1.5 py-0.5 rounded text-[8px] font-bold text-gray-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <span>Switch</span> <ArrowRightIcon className="w-2 h-2" />
                                                            </div>
                                                        </div>
                                                        <h2 className={`text-sm font-black ${activeConfig.color} truncate leading-tight`}>{activeConfig.label}</h2>
                                                    </div>
                                                </button>
                                            )}

                                            {/* 2. Brand Box (Status Indicator + Edit Modal Trigger) */}
                                            {auth.activeBrandKit ? (
                                                <button 
                                                    onClick={() => setShowBrandModal(true)}
                                                    className="relative overflow-hidden p-3 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/30 to-white hover:shadow-md hover:border-indigo-200 transition-all flex items-center gap-3 group text-left"
                                                >
                                                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border border-indigo-50 shadow-sm overflow-hidden shrink-0 p-0.5">
                                                        {auth.activeBrandKit.logos.primary ? (
                                                            <img src={auth.activeBrandKit.logos.primary} className="w-full h-full object-contain" alt="Brand" />
                                                        ) : (
                                                            <BrandKitIcon className="w-5 h-5 text-indigo-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                                                <LockIcon className="w-2.5 h-2.5" /> Strategy
                                                            </span>
                                                            <span className="text-[9px] font-bold text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                                                        </div>
                                                        <h3 className="text-xs font-black text-indigo-900 truncate leading-tight">
                                                            {auth.activeBrandKit.companyName || auth.activeBrandKit.name || 'Active Brand'}
                                                        </h3>
                                                    </div>
                                                </button>
                                            ) : (
                                                <button onClick={() => setShowBrandModal(true)} className="p-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/10 transition-all flex items-center justify-center gap-2 group hover:shadow-sm">
                                                    <div className="p-1 bg-white rounded-full shadow-sm">
                                                         <PlusCircleIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wide">Add Brand Kit</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 1. ASSETS */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>1</span><label className={AdMakerStyles.sectionTitle}>Visual Assets</label></div>
                                        <div className={AdMakerStyles.grid2}>
                                            <CompactUpload label={mainLabel} uploadText={mainText} image={mainImage} onUpload={handleUpload(setMainImage)} onClear={() => setMainImage(null)} icon={<CloudUploadIcon className="w-6 h-6 text-indigo-500"/>} />
                                            <CompactUpload label="Logo" uploadText="Upload Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<UploadIcon className="w-5 h-5 text-gray-400"/>} optional={true} />
                                        </div>
                                    </div>

                                    {/* 2. STYLE INTELLIGENCE */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>2</span>
                                            <label className={AdMakerStyles.sectionTitle}>Style Intelligence</label>
                                        </div>
                                        
                                        {/* Reference Upload */}
                                        <div className="mb-4">
                                            <CompactUpload 
                                                label="Style Reference" 
                                                uploadText="Upload Reference Image" 
                                                image={referenceImage} 
                                                onUpload={handleRefUpload} 
                                                onClear={handleClearRef} 
                                                icon={<CloudUploadIcon className="w-6 h-6 text-pink-500"/>} 
                                                heightClass="h-28"
                                                optional={true}
                                                isScanning={isRefScanning}
                                            />
                                            {refAnalysisDone && (
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 animate-fadeIn">
                                                    <CheckIcon className="w-3 h-3" />
                                                    <span>Structure Analyzed! Layout will match this reference.</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Blueprints (Only show if NO reference uploaded) */}
                                        {!referenceImage && (
                                            <div className="animate-fadeIn">
                                                <div className="flex items-center justify-between mb-2 px-1">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Or Choose a Blueprint</label>
                                                     {selectedBlueprint && (
                                                         <button 
                                                             onClick={() => setSelectedBlueprint(null)} 
                                                             className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors"
                                                         >
                                                             Clear
                                                         </button>
                                                     )}
                                                </div>
                                                <div className={AdMakerStyles.blueprintGrid}>
                                                    {currentBlueprints.map(bp => (
                                                        <button 
                                                            key={bp.id}
                                                            onClick={() => setSelectedBlueprint(bp.id)}
                                                            className={`${AdMakerStyles.blueprintCard} ${selectedBlueprint === bp.id ? AdMakerStyles.blueprintCardSelected : AdMakerStyles.blueprintCardInactive}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full mb-1 flex items-center justify-center">
                                                                <BlueprintStarIcon className="w-5 h-5" /> 
                                                            </div>
                                                            <span className={`${AdMakerStyles.blueprintLabel} ${selectedBlueprint === bp.id ? 'text-indigo-700' : 'text-gray-600'}`}>{bp.label}</span>
                                                            {selectedBlueprint === bp.id && (
                                                                <div className={AdMakerStyles.blueprintCheck}><CheckIcon className="w-3 h-3"/></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* VISUAL STYLE SELECTOR */}
                                        {!selectedBlueprint && (
                                            <div className="mt-6 pt-4 border-t border-gray-100 animate-fadeIn">
                                                 <SelectionGrid
                                                    label={industry === 'food' ? "Taste Vibe" : "Campaign Vibe"}
                                                    options={activeToneOptions}
                                                    value={tone}
                                                    onChange={setTone}
                                                 />
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. SMART DETAILS & STRATEGY */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>3</span><label className={AdMakerStyles.sectionTitle}>Smart Details</label></div>
                                        
                                        {/* AD FORMAT SELECTOR */}
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Format</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <RatioCard label="Square" sub="Feed" ratio="1:1" selected={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} />
                                                <RatioCard label="Portrait" sub="4:5" ratio="4:5" selected={aspectRatio === '4:5'} onClick={() => setAspectRatio('4:5')} />
                                                <RatioCard label="Story" sub="Reels" ratio="9:16" selected={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} />
                                            </div>
                                        </div>

                                        {/* VISUAL FOCUS SELECTOR */}
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Visual Focus</label>
                                            <div className="flex gap-2">
                                                <FocusCard 
                                                    title="Product" 
                                                    desc="Studio lighting & clean background" 
                                                    icon={<CubeIcon className="w-5 h-5"/>}
                                                    selected={visualFocus === 'product'} 
                                                    onClick={() => setVisualFocus('product')} 
                                                    colorClass="text-blue-600"
                                                />
                                                <FocusCard 
                                                    title="Lifestyle" 
                                                    desc="Realistic real-world environment" 
                                                    icon={<UserIcon className="w-5 h-5"/>}
                                                    selected={visualFocus === 'lifestyle'} 
                                                    onClick={() => setVisualFocus('lifestyle')} 
                                                    colorClass="text-orange-600"
                                                />
                                                <FocusCard 
                                                    title="Concept" 
                                                    desc="Abstract, surreal & artistic" 
                                                    icon={<SparklesIcon className="w-5 h-5"/>}
                                                    selected={visualFocus === 'conceptual'} 
                                                    onClick={() => setVisualFocus('conceptual')} 
                                                    colorClass="text-purple-600"
                                                />
                                            </div>
                                        </div>

                                        {(industry === 'ecommerce' || industry === 'fmcg') && (
                                            <div className="space-y-4">
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                                    <InputField placeholder="Offer / Discount" value={offer} onChange={(e: any) => setOffer(e.target.value)} />
                                                </div>
                                                <InputField label="Short Description / Vibe" placeholder="e.g. Organic, Summer Sale, Minimalist" value={desc} onChange={(e: any) => setDesc(e.target.value)} />
                                            </div>
                                        )}

                                        {industry === 'fashion' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Brand / Product" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                                <InputField placeholder="Collection / Offer" value={offer} onChange={(e: any) => setOffer(e.target.value)} />
                                            </div>
                                        )}

                                        {industry === 'realty' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Project Name" value={project} onChange={(e: any) => setProject(e.target.value)} />
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Location" value={location} onChange={(e: any) => setLocation(e.target.value)} />
                                                    <InputField placeholder="Config (e.g. 3BHK)" value={config} onChange={(e: any) => setConfig(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Selling Points</label>
                                                    <div className="flex gap-2 mb-2 flex-wrap">{features.map((f, i) => <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs border border-indigo-100">{f}</span>)}</div>
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none" placeholder="Add feature..." value={currentFeature} onChange={e => setCurrentFeature(e.target.value)} />
                                                        <button onClick={addFeature} className="bg-indigo-100 text-indigo-600 px-3 rounded-xl font-bold">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {industry === 'food' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Dish Name" value={dishName} onChange={(e: any) => setDishName(e.target.value)} />
                                                <InputField placeholder="Restaurant Name" value={restaurant} onChange={(e: any) => setRestaurant(e.target.value)} />
                                            </div>
                                        )}

                                        {(industry === 'saas' || industry === 'education' || industry === 'services') && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Main Headline" value={headline} onChange={(e: any) => setHeadline(e.target.value)} />
                                                <InputField placeholder="Sub-headline / Value Prop" value={subheadline} onChange={(e: any) => setSubheadline(e.target.value)} />
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Call to Action" value={cta} onChange={(e: any) => setCta(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
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
            
            {showBrandModal && auth.user && (
                <BrandSelectionModal 
                    isOpen={showBrandModal}
                    onClose={() => setShowBrandModal(false)}
                    userId={auth.user.uid}
                    currentBrandId={auth.activeBrandKit?.id}
                    onSelect={handleBrandSelect}
                    onCreateNew={() => {
                        setShowBrandModal(false);
                        navigateTo('dashboard', 'brand_manager');
                    }}
                />
            )}
        </>
    );
};