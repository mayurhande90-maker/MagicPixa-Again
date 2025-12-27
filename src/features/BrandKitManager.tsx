import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit, BRAND_LIMITS, Page, View, IndustryType } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, PaletteIcon, 
    CaptionIcon, BrandKitIcon, 
    PlusIcon, MagicWandIcon, ChevronDownIcon, TrashIcon,
    SparklesIcon, CheckIcon, ArrowLeftIcon, LockIcon,
    CubeIcon, LightbulbIcon, ChartBarIcon, LightningIcon,
    BuildingIcon, ApparelIcon, UserIcon, MockupIcon,
    ArrowRightIcon, GlobeIcon
} from '../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';

// CORRECTED IMPORTS: Separated Database vs AI Service
import { 
    uploadBrandAsset, 
    saveUserBrandKit, 
    deleteBrandFromCollection, 
    subscribeToUserBrands,
    getUserBrands,      
    saveBrandToCollection,
    activateBrand
} from '../firebase';

import { 
    generateBrandIdentity, 
    processLogoAsset, 
    analyzeCompetitorStrategy,
    extractBrandColors 
} from '../services/brandKitService';

import ToastNotification from '../components/ToastNotification';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';

// --- NEW INDUSTRY ICON ---
const BrandRealtyIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
        <path fill="currentColor" d="M37.24 50.284h12.255c1.076 0 1.93-.35 2.56-1.05c.63-.702.945-1.64.945-2.815V19.316c0-1.175-.315-2.113-.945-2.814c-.63-.701-1.484-1.052-2.56-1.052H38.28v30.97c0 .722-.088 1.405-.265 2.05a7.24 7.24 0 0 1-.776 1.815m5.862-24.086V22.8c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .51-.247.765-.743.765h-3.526c-.495 0-.743-.255-.743-.765m0 8.369v-3.399c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .495-.247.743-.743.743h-3.526c-.495 0-.743-.248-.743-.743m0 8.368v-3.398c0-.51.248-.765.743-.765h3.526c.496 0 .743.255.743.765v3.398c0 .496-.247.744-.743.744h-3.526c-.495 0-.743-.248-.743-.744M3 46.42c0 1.175.315 2.113.945 2.814c.63.701 1.49 1.051 2.58 1.051h25.32c1.09 0 1.95-.35 2.58-1.05c.63-.702.945-1.64.945-2.815V8.866c0-1.19-.315-2.131-.945-2.825c-.63-.694-1.49-1.041-2.58-1.041H6.524c-1.09 0-1.95.347-2.58 1.04C3.315 6.736 3 7.677 3 8.867zm8.836.446v-6.903c0-.496.149-.889.446-1.18c.297-.29.687-.435 1.168-.435h11.661c.496 0 .889.146 1.179.436c.29.29.435.683.435 1.179v6.903zm-.701-30.459v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.913v4.121c0 .609-.304.913-.913.913h-4.248c-.58 0-.871-.304-.871-.913m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.913v4.121c0 .609-.304.913-.913.913h-4.227c-.594 0-.892-.304-.892-.913m-10.26 8.666v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.914v4.12c0 .609-.304.913-.913.913h-4.248c-.58 0-.871-.304-.871-.913m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.914v4.12c0 .609-.304.913-.913.913h-4.227c-.594 0-.892-.304-.892-.913m-10.26 8.666v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.248c-.58 0-.871-.305-.871-.914m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.227c-.594 0-.892-.305-.892-.914"/>
    </svg>
);

// --- INDUSTRY CONFIGURATION ---
const INDUSTRY_CONFIG: Record<string, { label: string; catalogTitle: string; catalogDesc: string; itemLabel: string; itemPlaceholder: string; btn: string; icon: any; color: string; sub: string }> = {
    'physical': { 
        label: 'Physical Goods', 
        sub: 'E-commerce products',
        catalogTitle: 'Product Catalog', 
        catalogDesc: 'Upload your core products.', 
        itemLabel: 'Product', 
        itemPlaceholder: 'e.g. Serum Bottle',
        btn: 'Add Product',
        icon: CubeIcon,
        color: 'orange'
    },
    'digital': { 
        label: 'SaaS / Digital', 
        sub: 'Software & Apps',
        catalogTitle: 'Interface Assets', 
        catalogDesc: 'Upload screenshots, mockups, or UI elements.', 
        itemLabel: 'Screen', 
        itemPlaceholder: 'e.g. Dashboard Home',
        btn: 'Add Asset',
        icon: MockupIcon,
        color: 'blue'
    },
    'realty': { 
        label: 'Real Estate', 
        sub: 'Property & Interior',
        catalogTitle: 'Property Portfolio', 
        catalogDesc: 'Upload key listings, rooms, or building exteriors.', 
        itemLabel: 'Property', 
        itemPlaceholder: 'e.g. Penthouse Listing',
        btn: 'Add Property',
        icon: BrandRealtyIcon,
        color: 'purple'
    },
    'fashion': { 
        label: 'Apparel', 
        sub: 'Fashion & Wearables',
        catalogTitle: 'Collection & Looks', 
        catalogDesc: 'Upload garments, flat lays, or model shots.', 
        itemLabel: 'Look', 
        itemPlaceholder: 'e.g. Summer Dress',
        btn: 'Add Look',
        icon: ApparelIcon,
        color: 'pink'
    },
    'service': { 
        label: 'Service', 
        sub: 'Personal Brand / Agency',
        catalogTitle: 'Key Personas', 
        catalogDesc: 'Upload headshots of team members or experts.', 
        itemLabel: 'Persona', 
        itemPlaceholder: 'e.g. CEO Headshot',
        btn: 'Add Persona',
        icon: UserIcon,
        color: 'indigo'
    }
};

const ColorInput: React.FC<{ 
    label: string; 
    value: string; 
    onChange: (val: string) => void;
    onBlur: () => void;
}> = ({ label, value, onChange, onBlur }) => (
    <div className={BrandKitManagerStyles.colorInputWrapper}>
        <label className={BrandKitManagerStyles.colorLabel}>{label}</label>
        <div className={BrandKitManagerStyles.colorBox}>
            <div className={BrandKitManagerStyles.colorPreview}>
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer border-none p-0" 
                />
            </div>
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                className={BrandKitManagerStyles.colorField}
            />
        </div>
    </div>
);

const AssetUploader: React.FC<{
    label: string;
    subLabel?: string;
    currentUrl: string | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
    isLoading: boolean;
    isProcessing?: boolean;
}> = ({ label, subLabel, currentUrl, onUpload, onRemove, isLoading, isProcessing }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onUpload(e.target.files[0]);
        }
        e.target.value = '';
    };

    return (
        <div className={BrandKitManagerStyles.uploaderContainer}>
            <div className={BrandKitManagerStyles.uploaderHeader}>
                <div>
                    <label className={BrandKitManagerStyles.uploaderLabel}>{label}</label>
                    {subLabel && <span className={BrandKitManagerStyles.uploaderSubLabel}>{subLabel}</span>}
                </div>
            </div>
            
            <div 
                onClick={() => !currentUrl && !isLoading && !isProcessing && inputRef.current?.click()}
                className={`${BrandKitManagerStyles.uploaderBox} ${
                    currentUrl ? BrandKitManagerStyles.uploaderBoxFilled : BrandKitManagerStyles.uploaderBoxEmpty
                }`}
            >
                {isLoading || isProcessing ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        <span className="text-xs text-indigo-500 font-medium">{isProcessing ? 'Processing...' : 'Uploading...'}</span>
                    </div>
                ) : currentUrl ? (
                    <>
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <img src={currentUrl} className="max-w-full max-h-full object-contain drop-shadow-sm" alt={label} />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="bg-gray-100 text-gray-600 p-2.5 rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-gray-200"
                                title="Remove Image"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center p-4 transition-transform group-hover:scale-105">
                        <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3 text-indigo-400 group-hover:text-indigo-600">
                            <UploadIcon className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">Click to Upload</p>
                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG</p>
                    </div>
                )}
            </div>
            <input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleChange} />
        </div>
    );
};

const ProductItem: React.FC<{
    item: { id: string, name: string, imageUrl: string };
    placeholder: string;
    onDelete: () => void;
    onNameChange: (name: string) => void;
}> = ({ item, placeholder, onDelete, onNameChange }) => {
    return (
        <div className="relative group bg-gray-50 rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all">
            <div className="aspect-square relative bg-white">
                <img src={item.imageUrl} className="w-full h-full object-contain p-2" alt={item.name} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="bg-white text-red-500 p-1.5 rounded-lg shadow-sm hover:bg-red-50"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-2 border-t border-gray-100">
                <input 
                    type="text" 
                    value={item.name} 
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full text-xs font-bold text-gray-700 bg-transparent outline-none focus:text-indigo-600 placeholder-gray-400"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
};

const MoodItem: React.FC<{
    item: { id: string, imageUrl: string };
    onDelete: () => void;
}> = ({ item, onDelete }) => {
    return (
        <div className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 hover:shadow-md transition-all">
            <img src={item.imageUrl} className="w-full h-full object-cover" alt="Inspiration" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="bg-white text-red-500 p-1.5 rounded-lg shadow-sm hover:bg-red-50"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// Skeleton Loader for Grid Items
const UploadSkeleton: React.FC = () => (
    <div className="aspect-square rounded-xl bg-gray-50 border border-gray-100 animate-pulse flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
        <span className="text-[10px] font-bold text-gray-400">Uploading...</span>
    </div>
);

// URL Validator - Updated with regex to prevent random text
const isValidUrl = (url: string) => {
    if (!url) return false;
    // Pattern to match standard domains like google.com, https://site.io, etc.
    const pattern = /^(https?:\/\/)?([\w\d-]+\.)+[\w\d-]{2,}(\/.*)?$/i;
    return pattern.test(url.trim());
};

// --- BRAND CREATION WIZARD ---
const BrandCreationWizard: React.FC<{ 
    onClose: () => void; 
    onComplete: (kit: BrandKit) => Promise<void>;
    userId: string;
}> = ({ onClose, onComplete, userId }) => {
    const [step, setStep] = useState(0);
    const [kit, setKit] = useState<BrandKit>({
        industry: null as any, 
        companyName: '',
        website: '',
        toneOfVoice: '', 
        targetAudience: '',
        negativePrompts: '',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null },
        products: [],
        moodBoard: [],
        competitor: { website: '', adScreenshots: [] }
    });
    
    // Auto-Gen State
    const [magicUrl, setMagicUrl] = useState('');
    const [magicDesc, setMagicDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Local Upload State for Wizard (Tracks count of uploading files)
    const [uploadingState, setUploadingState] = useState<{ [key: string]: number }>({});

    // Fallback for rendering content before industry is selected
    const industryConf = INDUSTRY_CONFIG[kit.industry || 'physical'] || INDUSTRY_CONFIG['physical'];

    // Validation Logic
    const isStepValid = () => {
        switch(step) {
            case 1: return !!kit.companyName.trim() && !!kit.industry;
            case 2: return !!kit.website && isValidUrl(kit.website) && !!kit.toneOfVoice;
            case 3: return !!kit.targetAudience?.trim();
            case 5: return !!kit.products && kit.products.length > 0;
            case 6: return !!kit.moodBoard && kit.moodBoard.length > 0;
            case 7: return !!kit.competitor?.website && isValidUrl(kit.competitor.website);
            case 8: return !!kit.logos.primary && !uploadingState['primary'];
            default: return true;
        }
    };

    const handleMagicGenerate = async () => {
        if (!isValidUrl(magicUrl)) {
            alert("Please enter a valid website URL for Auto-fill.");
            return;
        }
        setIsGenerating(true);
        try {
            const generated = await generateBrandIdentity(magicUrl, magicDesc);
            setKit(prev => ({ ...prev, ...generated }));
            // Skip to Step 4 (Visuals) to allow refinement
            setStep(4);
        } catch (e) {
            console.error(e);
            alert("Auto-generation failed. Please try manual mode.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (step < 9 && isStepValid()) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };
    
    const handleSkip = () => {
        if (step < 9) setStep(step + 1);
    };

    const handleFinish = async () => {
        setIsSaving(true);
        // Ensure name is set
        const finalKit = { ...kit };
        if (!finalKit.name && finalKit.companyName) finalKit.name = finalKit.companyName;
        if (!finalKit.name) finalKit.name = "New Brand";

        await onComplete(finalKit);
        setIsSaving(false);
    };
    
    // --- File Upload Handlers for Wizard ---
    const wizardProductRef = useRef<HTMLInputElement>(null);
    const wizardMoodRef = useRef<HTMLInputElement>(null);
    const wizardCompRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setUploadingState(prev => ({ ...prev, primary: 1 }));
            const file = e.target.files[0];
            try {
                const base64Data = await fileToBase64(file);
                const processedUri = await processLogoAsset(base64Data.base64, base64Data.mimeType);
                const url = await uploadBrandAsset(userId, processedUri, 'primary');
                setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: url } }));
            } catch (err) { console.error(err); alert("Logo upload failed."); }
            finally { setUploadingState(prev => ({ ...prev, primary: 0 })); }
        }
    };
    
    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, products: files.length }));
        try {
            const newProducts = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(userId, processedUri, `product_${tempId}`);
                return { id: tempId, name: file.name.split('.')[0] || `New ${industryConf.itemLabel}`, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
        } catch (error) { console.error(error); alert("Upload failed."); } 
        finally { setUploadingState(prev => ({ ...prev, products: 0 })); e.target.value = ''; }
    };
    
    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, mood: files.length }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(userId, processedUri, `mood_${tempId}`);
                return { id: tempId, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, moodBoard: [...(prev.moodBoard || []), ...newItems] }));
        } catch (error) { console.error(error); alert("Upload failed."); } 
        finally { setUploadingState(prev => ({ ...prev, mood: 0 })); e.target.value = ''; }
    };

    const handleCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, competitor: files.length }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(userId, processedUri, `comp_ad_${tempId}`);
                return { id: tempId, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { website: '', adScreenshots: [] }, adScreenshots: [...(prev.competitor?.adScreenshots || []), ...newItems] } }));
        } catch (error) { console.error(error); alert("Upload failed."); } 
        finally { setUploadingState(prev => ({ ...prev, competitor: 0 })); e.target.value = ''; }
    };

    const deleteProduct = (id: string) => setKit(prev => ({ ...prev, products: prev.products?.filter(p => p.id !== id) || [] }));
    const updateProductName = (id: string, newName: string) => setKit(prev => ({ ...prev, products: prev.products?.map(p => p.id === id ? { ...p, name: newName } : p) || [] }));
    const deleteMoodItem = (id: string) => setKit(prev => ({ ...prev, moodBoard: prev.moodBoard?.filter(m => m.id !== id) || [] }));
    const deleteCompItem = (id: string) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { website: '', adScreenshots: [] }, adScreenshots: prev.competitor?.adScreenshots.filter(i => i.id !== id) || [] } }));

    // Render Steps
    const renderStepContent = () => {
        switch (step) {
            case 0: 
                return (
                    <div className="h-full flex flex-col items-center justify-center p-[min(4vh,40px)] relative">
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-all shadow-sm z-50 backdrop-blur-sm">
                            <XIcon className="w-6 h-6" />
                        </button>

                        <div className="w-full max-w-lg text-center animate-fadeInUp relative z-10">
                            <div className="w-[clamp(60px,10vh,80px)] h-[clamp(60px,10vh,80px)] bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-[min(3vh,24px)] shadow-sm border border-indigo-100 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                                <BrandKitIcon className="w-[45%] h-[45%] text-indigo-600" />
                            </div>
                            
                            <h1 className="text-[clamp(24px,4.5vh,40px)] font-black text-gray-900 mb-2 tracking-tight leading-tight">Setup Your Brand Kit</h1>
                            <p className="text-gray-500 mb-[min(5vh,40px)] text-[clamp(11px,1.6vh,16px)] leading-relaxed max-w-md mx-auto font-medium">
                                Auto-fill with <span className="text-indigo-600 font-bold">Pixa AI</span>. Our agents will scan your website and build your visual identity instantly.
                            </p>

                            <div className="bg-white p-[min(3vh,32px)] rounded-3xl shadow-xl border border-gray-100 relative z-20">
                                <div className="space-y-[min(2vh,20px)] text-left">
                                    <div className="group">
                                        <label className="block text-[clamp(8px,1.2vh,10px)] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Website URL (Required)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-[min(1.8vh,16px)] text-gray-400">
                                                <GlobeIcon className="w-5 h-5"/>
                                            </div>
                                            <input 
                                                className={`w-full pl-12 pr-4 py-[min(2vh,16px)] bg-gray-50 border rounded-2xl text-[clamp(12px,1.8vh,15px)] font-bold text-gray-900 focus:ring-4 outline-none transition-all placeholder-gray-400 ${
                                                    magicUrl && !isValidUrl(magicUrl) 
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10' 
                                                    : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                                }`}
                                                placeholder="e.g. www.yourbrand.com"
                                                value={magicUrl}
                                                onChange={e => setMagicUrl(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        {magicUrl && !isValidUrl(magicUrl) && (
                                            <p className="text-[10px] text-red-500 font-bold mt-1.5 ml-1 animate-fadeIn">Please enter a valid domain (e.g. yourbrand.com)</p>
                                        )}
                                    </div>
                                    
                                    <div className="group">
                                         <label className="block text-[clamp(8px,1.2vh,10px)] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">About the Brand (Optional)</label>
                                         <textarea 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-[clamp(11px,1.5vh,14px)] font-medium text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-gray-400 resize-none h-[clamp(70px,12vh,96px)] leading-relaxed"
                                            placeholder="Describe your products, vibe, and audience..."
                                            value={magicDesc}
                                            onChange={e => setMagicDesc(e.target.value)}
                                        />
                                    </div>

                                    <button 
                                        onClick={handleMagicGenerate}
                                        disabled={isGenerating || !isValidUrl(magicUrl)}
                                        className={`w-full py-[min(2.2vh,18px)] rounded-2xl text-[clamp(12px,1.8vh,16px)] font-bold transition-all shadow-lg ${
                                            isValidUrl(magicUrl) 
                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02] active:scale-95' 
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed grayscale'
                                        } flex items-center justify-center gap-2.5 mt-1`}
                                    >
                                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Generate Identity"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setStep(1)}
                            className="absolute bottom-5 right-5 z-30 bg-white border border-gray-200 hover:border-gray-400 text-gray-600 hover:text-black px-4 py-2 rounded-full text-[clamp(8px,1vh,9.5px)] font-black transition-all flex items-center gap-2 group shadow-xl hover:shadow-indigo-500/20 animate-[breathing-glow_4s_ease-in-out_infinite]"
                        >
                            Or Build from Scratch
                            <div className="w-5 h-5 rounded-full bg-gray-100 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
                                <ArrowRightIcon className="w-2.5 h-2.5" />
                            </div>
                        </button>
                        <style>{`
                            @keyframes breathing-glow {
                                0%, 100% { 
                                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); 
                                    border-color: #e5e7eb;
                                }
                                50% { 
                                    box-shadow: 0 0 20px 2px rgba(99, 102, 241, 0.25); 
                                    border-color: #a5b4fc;
                                }
                            }
                        `}</style>
                    </div>
                );

            case 1: // IDENTITY
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Brand Identity</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Let's start with the basics.</p>
                        </div>
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div>
                                <label className="block text-[clamp(10px,1.5vh,14px)] font-bold text-gray-700 mb-2">Brand Name <span className="text-red-500">*</span></label>
                                <input 
                                    className="w-full text-[clamp(20px,4vh,32px)] font-black p-[min(2vh,16px)] bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 placeholder-gray-300 text-center"
                                    placeholder="e.g. Acme Corp"
                                    value={kit.companyName}
                                    onChange={e => setKit({...kit, companyName: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[clamp(10px,1.5vh,14px)] font-bold text-gray-700 mb-4 text-center">Industry / Niche</label>
                                <div className={BrandKitManagerStyles.industryGrid}>
                                    {Object.entries(INDUSTRY_CONFIG).map(([k, conf]) => (
                                        <button
                                            key={k}
                                            onClick={() => setKit({...kit, industry: k as IndustryType})}
                                            className={`${BrandKitManagerStyles.industryCard} ${kit.industry === k ? BrandKitManagerStyles.industryCardSelected : BrandKitManagerStyles.industryCardInactive}`}
                                        >
                                            <div className={`${BrandKitManagerStyles.industryIconBox} ${kit.industry === k ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <conf.icon className="w-[50%] h-[50%]" />
                                            </div>
                                            <p className={BrandKitManagerStyles.industryLabel}>{conf.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2: // STRATEGY
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Digital Presence</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Where does your brand live?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Website URL <span className="text-red-500">*</span></label>
                                <input 
                                    className={`w-full p-[min(2vh,16px)] bg-gray-50 border rounded-xl focus:outline-none transition-colors ${kit.website && !isValidUrl(kit.website) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                                    placeholder="www.yourbrand.com"
                                    value={kit.website}
                                    onChange={e => setKit({...kit, website: e.target.value})}
                                />
                                {kit.website && !isValidUrl(kit.website) && (
                                    <p className="text-xs text-red-500 mt-1">Please enter a valid URL (e.g. example.com)</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tone of Voice</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setKit({...kit, toneOfVoice: t})}
                                            className={`px-[min(2.5vh,20px)] py-[min(1.2vh,10px)] rounded-full text-[clamp(10px,1.4vh,13px)] font-bold border transition-all ${kit.toneOfVoice === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            
            case 3: // AUDIENCE
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Target Audience</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Who are we talking to?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Primary Customer <span className="text-red-500">*</span></label>
                                <input 
                                    className="w-full p-[min(2vh,16px)] bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Gen-Z Gamers, Busy Moms, Tech CEOs"
                                    value={kit.targetAudience}
                                    onChange={e => setKit({...kit, targetAudience: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Negative Constraints</label>
                                <p className="text-[10px] text-gray-400 mb-2">Things AI should NEVER generate (e.g. cartoons, neon colors)</p>
                                <input 
                                    className="w-full p-[min(2vh,16px)] bg-white border border-red-300 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none text-gray-800 placeholder-gray-400 transition-all shadow-sm"
                                    placeholder="e.g. blurry, distorted, low quality, cartoon"
                                    value={kit.negativePrompts}
                                    onChange={e => setKit({...kit, negativePrompts: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 4: // VISUALS
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Visual DNA</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Define the look and feel.</p>
                        </div>
                        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-[min(4vh,32px)]">
                            <div className="bg-gray-50 p-[min(2.5vh,24px)] rounded-2xl border border-gray-100">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Color Palette</h3>
                                <div className="space-y-[min(1.5vh,16px)]">
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.primary} onChange={e => setKit({...kit, colors: {...kit.colors, primary: e.target.value}})} className="w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-[clamp(10px,1.4vh,13px)] font-bold text-gray-700">Primary</p><p className="text-[9px] text-gray-400 uppercase">{kit.colors.primary}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.secondary} onChange={e => setKit({...kit, colors: {...kit.colors, secondary: e.target.value}})} className="w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-[clamp(10px,1.4vh,13px)] font-bold text-gray-700">Secondary</p><p className="text-[9px] text-gray-400 uppercase">{kit.colors.secondary}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.accent} onChange={e => setKit({...kit, colors: {...kit.colors, accent: e.target.value}})} className="w-[clamp(32px,5vh,48px)] h-[clamp(32px,5vh,48px)] rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-[clamp(10px,1.4vh,13px)] font-bold text-gray-700">Accent</p><p className="text-[9px] text-gray-400 uppercase">{kit.colors.accent}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-[min(2.5vh,24px)] rounded-2xl border border-gray-100">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Typography</h3>
                                <div className="space-y-[min(2vh,20px)]">
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">Headings</label>
                                        <select value={kit.fonts.heading} onChange={e => setKit({...kit, fonts: {...kit.fonts, heading: e.target.value}})} className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm font-bold outline-none">
                                            <option>Modern Sans</option><option>Classic Serif</option><option>Bold Display</option><option>Elegant Script</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-500 mb-1 block">Body</label>
                                        <select value={kit.fonts.body} onChange={e => setKit({...kit, fonts: {...kit.fonts, body: e.target.value}})} className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none">
                                            <option>Clean Sans</option><option>Readable Serif</option><option>System Default</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            
            case 5: // PRODUCTS
                const uploadingProductsCount = uploadingState['products'] || 0;
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">{industryConf.catalogTitle}</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">{industryConf.catalogDesc}</p>
                        </div>
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => wizardProductRef.current?.click()} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    {uploadingProductsCount > 0 ? 'Uploading...' : <><PlusIcon className="w-4 h-4"/> Add Item</>}
                                </button>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{kit.products?.length || 0} items added</span>
                                <input ref={wizardProductRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} />
                            </div>
                            
                            {(!kit.products || kit.products.length === 0) ? (
                                uploadingProductsCount > 0 ? (
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                                        {Array.from({ length: uploadingProductsCount }).map((_, i) => <UploadSkeleton key={i} />)}
                                     </div>
                                ) : (
                                    <div onClick={() => wizardProductRef.current?.click()} className="h-[clamp(120px,20vh,180px)] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                            <UploadIcon className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500">Upload Inventory</p>
                                        <p className="text-xs text-gray-400 mt-1">Supports multiple files</p>
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[clamp(250px,40vh,400px)] overflow-y-auto pr-1 custom-scrollbar">
                                    {kit.products.map(product => (
                                        <ProductItem key={product.id} item={product} placeholder={industryConf.itemLabel} onDelete={() => deleteProduct(product.id)} onNameChange={(name) => updateProductName(product.id, name)} />
                                    ))}
                                    {uploadingProductsCount > 0 && Array.from({ length: uploadingProductsCount }).map((_, i) => <UploadSkeleton key={i} />)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            
            case 6: // MOOD BOARD
                const uploadingMoodCount = uploadingState['mood'] || 0;
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                         <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Inspiration Board</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Upload examples of the style you want.</p>
                        </div>
                        <div className="max-w-4xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => wizardMoodRef.current?.click()} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    {uploadingMoodCount > 0 ? 'Uploading...' : <><PlusIcon className="w-4 h-4"/> Add Image</>}
                                </button>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{kit.moodBoard?.length || 0} images added</span>
                                <input ref={wizardMoodRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} />
                            </div>
                            
                            {(!kit.moodBoard || kit.moodBoard.length === 0) ? (
                                uploadingMoodCount > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                                        {Array.from({ length: uploadingMoodCount }).map((_, i) => <UploadSkeleton key={i} />)}
                                    </div>
                                ) : (
                                    <div onClick={() => wizardMoodRef.current?.click()} className="h-[clamp(120px,20vh,180px)] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                            <UploadIcon className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500">Upload reference images</p>
                                        <p className="text-xs text-gray-400 mt-1">Supports multiple files</p>
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[clamp(250px,40vh,400px)] overflow-y-auto pr-1 custom-scrollbar">
                                    {kit.moodBoard.map(item => (
                                        <MoodItem key={item.id} item={item} onDelete={() => deleteMoodItem(item.id)} />
                                    ))}
                                    {uploadingMoodCount > 0 && Array.from({ length: uploadingMoodCount }).map((_, i) => <UploadSkeleton key={i} />)}
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 7: // COMPETITOR
                const uploadingCompCount = uploadingState['competitor'] || 0;
                return (
                     <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Competitor Intel</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Who are you up against?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-[min(2vh,20px)]">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Competitor Website <span className="text-red-500">*</span></label>
                                <input 
                                    className={`w-full p-[min(2vh,16px)] bg-gray-50 border rounded-xl focus:outline-none transition-colors ${kit.competitor?.website && !isValidUrl(kit.competitor.website) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'}`}
                                    placeholder="e.g. www.competitor.com"
                                    value={kit.competitor?.website || ''}
                                    onChange={(e) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { adScreenshots: [] }, website: e.target.value } }))}
                                />
                                {kit.competitor?.website && !isValidUrl(kit.competitor.website) && (
                                    <p className="text-[10px] text-red-500 mt-1">Please enter a valid URL (e.g. example.com)</p>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-gray-700">Ad Screenshots</label>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase">{kit.competitor?.adScreenshots?.length || 0} added</span>
                                    <input ref={wizardCompRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompUpload} />
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {kit.competitor?.adScreenshots.map(ad => (
                                        <div key={ad.id} className="relative group w-[clamp(40px,7vh,64px)] h-[clamp(40px,7vh,64px)] rounded-lg overflow-hidden border border-gray-200">
                                            <img src={ad.imageUrl} className="w-full h-full object-cover" />
                                            <button onClick={() => deleteCompItem(ad.id)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                <XIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                    {uploadingCompCount > 0 && Array.from({ length: uploadingCompCount }).map((_, i) => (
                                        <div key={i} className="w-[clamp(40px,7vh,64px)] h-[clamp(40px,7vh,64px)] bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center animate-pulse">
                                            <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                                        </div>
                                    ))}
                                    {(uploadingCompCount === 0) && (
                                        <div onClick={() => wizardCompRef.current?.click()} className="w-[clamp(40px,7vh,64px)] h-[clamp(40px,7vh,64px)] bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-all cursor-pointer">
                                            <PlusIcon className="w-5 h-5"/>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 italic leading-tight">Upload screenshots of their ads or social posts for AI strategy extraction.</p>
                            </div>
                        </div>
                    </div>
                );

            case 8: // ASSETS (LOGO)
                return (
                    <div className="space-y-[min(4vh,32px)] animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center">
                            <h2 className="text-[clamp(18px,3vh,24px)] font-bold text-gray-900">Final Asset</h2>
                            <p className="text-gray-500 text-[clamp(10px,1.5vh,14px)]">Upload your logo to finalize the identity.</p>
                        </div>
                        <div className="max-w-md mx-auto">
                            <div className="bg-white p-[min(4vh,32px)] rounded-3xl border-2 border-dashed border-indigo-100 hover:border-indigo-300 transition-colors text-center relative group">
                                {kit.logos.primary ? (
                                    <div className="relative">
                                        <img src={kit.logos.primary} className="max-h-[clamp(120px,25vh,200px)] mx-auto object-contain" />
                                        <button onClick={() => setKit({...kit, logos: {...kit.logos, primary: null}})} className="absolute -top-2 -right-2 bg-gray-100 text-gray-500 p-1.5 rounded-full hover:bg-gray-200 hover:text-red-500 transition-colors"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <div onClick={() => document.getElementById('wizard-logo-upload')?.click()} className="cursor-pointer py-[min(4vh,32px)]">
                                        <div className="w-[clamp(48px,8vh,64px)] h-[clamp(48px,8vh,64px)] bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <UploadIcon className="w-[50%] h-[50%]" />
                                        </div>
                                        <p className="font-bold text-indigo-900 text-sm">Upload Main Logo</p>
                                        <p className="text-[10px] text-gray-400 mt-1">PNG (Transparent) Recommended</p>
                                    </div>
                                )}
                                <input id="wizard-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                {uploadingState['primary'] > 0 && <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-3xl"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div></div>}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-4xl h-[clamp(450px,85vh,700px)] bg-white rounded-[2.5rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col relative">
                
                {step > 0 && (
                    <div className="px-[min(4vh,32px)] py-[min(1.8vh,16px)] border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center text-indigo-600">
                                <BrandKitIcon className="w-[clamp(24px,4vh,32px)] h-[clamp(24px,4vh,32px)]" />
                            </div>
                            <div>
                                <h1 className="text-[clamp(14px,2.2vh,18px)] font-black text-gray-900 leading-none">Brand Wizard</h1>
                                <div className="flex items-center gap-2 mt-1.5">
                                     <div className="w-[clamp(64px,10vh,128px)] h-1 bg-gray-100 rounded-full overflow-hidden">
                                         <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out" style={{ width: `${(step / 8) * 100}%` }}></div>
                                     </div>
                                     <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Step {step}/8</p>
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}

                <div className={`flex-1 overflow-y-auto relative ${step === 0 ? 'p-0' : 'p-[min(4vh,32px)] lg:p-[min(6vh,48px)]'}`}>
                    {renderStepContent()}
                </div>

                {step > 0 && (
                    <div className="px-[min(4vh,32px)] py-[min(1.8vh,16px)] border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0 z-10">
                        <button 
                            onClick={handleBack}
                            className="px-6 py-[min(1.5vh,12px)] rounded-xl font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center gap-2 text-xs"
                        >
                            <ArrowLeftIcon className="w-4 h-4" /> Back
                        </button>
                        
                        <div className="flex items-center gap-4">
                             {step >= 3 && step < 8 && (
                                 <button onClick={handleSkip} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-indigo-600 transition-colors">
                                     Skip for now
                                 </button>
                             )}

                             <button 
                                onClick={handleFinish}
                                disabled={isSaving || (step === 8 && !kit.logos.primary)}
                                className={`px-8 py-[min(1.8vh,14px)] rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    step === 8 
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed' 
                                    : 'bg-white border border-gray-200 text-gray-400 cursor-not-allowed hidden' 
                                }`}
                            >
                                {isSaving ? 'Saving...' : <><CheckIcon className="w-4 h-4" /> Finish & Save</>}
                            </button>

                            {step < 8 && (
                                <button 
                                    onClick={handleNext}
                                    disabled={!isStepValid()} 
                                    className={`px-8 py-[min(1.8vh,14px)] rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 ${
                                        isStepValid()
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-500/20'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    Next Step <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <style>{`@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`}</style>
            </div>
        </div>
    );
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View) => void }> = ({ auth, navigateTo }) => {
    // List View State
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [detailTab, setDetailTab] = useState<'identity' | 'competitor'>('identity');

    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState(true);
    
    // Wizard Visibility State
    const [showCreationWizard, setShowCreationWizard] = useState(false);

    const [kit, setKit] = useState<BrandKit>({
        industry: 'physical',
        companyName: '',
        website: '',
        toneOfVoice: 'Professional',
        targetAudience: '',
        negativePrompts: '',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null },
        products: [],
        moodBoard: [],
        competitor: { website: '', adScreenshots: [] }
    });
    
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: number }>({});
    const [processingState, setProcessingState] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const moodInputRef = useRef<HTMLInputElement>(null);
    const competitorAdRef = useRef<HTMLInputElement>(null);

    const userPlan = auth.user?.plan || 'Free';
    const matchedPlanKey = Object.keys(BRAND_LIMITS).find(k => userPlan.includes(k)) || 'Free';
    const limit = BRAND_LIMITS[matchedPlanKey] || 1;
    const usage = brands.length;
    const isLimitReached = usage >= limit;

    const currentIndustry = kit.industry || 'physical';
    const industryConf = INDUSTRY_CONFIG[currentIndustry] || INDUSTRY_CONFIG['physical'];

    useEffect(() => {
        if (auth.user) {
            setIsLoadingBrands(true);
            const unsubscribe = subscribeToUserBrands(auth.user.uid, (list) => {
                setBrands(list);
                setIsLoadingBrands(false);
            });
            return () => unsubscribe();
        }
    }, [auth.user]);

    const handleAddNewBrand = () => {
        if (isLimitReached) {
            setToast({ msg: `Plan limit reached (${usage}/${limit}). Please upgrade.`, type: 'error' });
            return;
        }
        setShowCreationWizard(true);
    };

    const handleWizardComplete = async (newKit: BrandKit) => {
        setShowCreationWizard(false);
        setKit(newKit);
        setIsAutoDetected(false); 
        setDetailTab('identity');
        setViewMode('detail');
        // Save immediately
        await performSave(newKit);
    };

    const handleSelectBrand = (brand: BrandKit) => {
        setKit({
            ...brand,
            industry: brand.industry || 'physical',
            products: brand.products || [],
            moodBoard: brand.moodBoard || [],
            competitor: brand.competitor || { website: '', adScreenshots: [] }
        });
        setIsAutoDetected(false);
        setDetailTab('identity');
        setViewMode('detail');
        setLastSaved(null);
    };

    const handleDeleteBrand = async (brandId: string) => {
        if (!auth.user || !brandId) return;
        if (!confirm("Are you sure you want to delete this brand?")) return;
        
        try {
            await deleteBrandFromCollection(auth.user.uid, brandId);
            setToast({ msg: "Brand deleted.", type: "success" });
        } catch(e) {
            console.error(e);
            setToast({ msg: "Delete failed.", type: "error" });
        }
    };

    const performSave = async (updatedKit: BrandKit) => {
        if (!auth.user) return;
        setIsSaving(true);
        
        let finalKit = { ...updatedKit };
        if (finalKit.name === 'New Brand' && finalKit.companyName) {
            finalKit.name = finalKit.companyName;
        }

        try {
            const savedKit = await saveUserBrandKit(auth.user.uid, finalKit);
            setKit(savedKit as BrandKit);
            auth.setUser(prev => prev ? { ...prev, brandKit: savedKit as BrandKit } : null);
            setLastSaved(new Date());
            setToast({ msg: "Brand saved successfully.", type: "success" });
        } catch (e) {
            console.error("Save failed", e);
            setToast({ msg: "Failed to save changes.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackToList = () => setViewMode('list');
    const handleTextChange = (field: keyof BrandKit, value: string) => setKit(prev => ({ ...prev, [field]: value }));
    const updateDeepLocal = (section: keyof BrandKit, key: string, value: any) => setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    const handleSave = () => performSave(kit);
    const handleSelectChange = (field: keyof BrandKit, value: string) => setKit(prev => ({ ...prev, [field]: value }));
    const updateDeepImmediate = (section: keyof BrandKit, key: string, value: any) => setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));

    const handleUpload = async (key: 'primary', file: File) => {
        if (!auth.user) return;
        setProcessingState(prev => ({ ...prev, [key]: true }));
        try {
            const base64Data = await fileToBase64(file);
            let processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
            if (key === 'primary') processedUri = await processLogoAsset(base64Data.base64, base64Data.mimeType);
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: 1 }));
            const url = await uploadBrandAsset(auth.user.uid, processedUri, key);
            setKit(prev => ({ ...prev, logos: { ...prev.logos, [key]: url } }));
            setToast({ msg: "Asset processed & uploaded.", type: "success" });
        } catch (e: any) {
            console.error("Upload failed", e);
            setToast({ msg: "Failed to upload asset.", type: "error" });
        } finally {
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: 0 }));
        }
    };

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, products: files.length }));
        try {
            const newProducts = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `product_${tempId}`);
                return { id: tempId, name: file.name.split('.')[0] || `New ${industryConf.itemLabel}`, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
            setToast({ msg: `${newProducts.length} items added.`, type: "success" });
        } catch (error: any) { console.error("Product upload failed", error); setToast({ msg: "Failed to upload items.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, products: 0 })); e.target.value = ''; }
    };
    const deleteProduct = (id: string) => setKit(prev => ({ ...prev, products: prev.products?.filter(p => p.id !== id) || [] }));
    const updateProductName = (id: string, newName: string) => setKit(prev => ({ ...prev, products: prev.products?.map(p => p.id === id ? { ...p, name: newName } : p) || [] }));
    
    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, mood: files.length }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `mood_${tempId}`);
                return { id: tempId, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, moodBoard: [...(prev.moodBoard || []), ...newItems] }));
            setToast({ msg: `${newItems.length} images added.`, type: "success" });
        } catch (error: any) { console.error("Mood upload failed", error); setToast({ msg: "Failed to upload images.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, mood: 0 })); e.target.value = ''; }
    };
    const deleteMoodItem = (id: string) => setKit(prev => ({ ...prev, moodBoard: prev.moodBoard?.filter(m => m.id !== id) || [] }));

    const handleCompetitorAdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, competitor: files.length }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `comp_ad_${tempId}`);
                return { id: tempId, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { website: '', adScreenshots: [] }, adScreenshots: [...(prev.competitor?.adScreenshots || []), ...newItems] } }));
            setToast({ msg: `${newItems.length} screenshots added.`, type: "success" });
        } catch (error: any) { console.error(error); setToast({ msg: "Upload failed.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, competitor: 0 })); e.target.value = ''; }
    };
    const deleteCompetitorAd = (id: string) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { website: '', adScreenshots: [] }, adScreenshots: prev.competitor?.adScreenshots.filter(i => i.id !== id) || [] } }));
    
    const runCompetitorAnalysis = async () => {
        if (!kit.competitor?.website || kit.competitor.adScreenshots.length === 0) { alert("Please provide a Competitor Website and at least one Ad Screenshot."); return; }
        setIsAnalyzingCompetitor(true);
        try {
            const screenshots = await Promise.all(kit.competitor.adScreenshots.map(async (item) => {
                const response = await fetch(item.imageUrl);
                const blob = await response.blob();
                return new Promise<{data: string, mimeType: string}>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve({ data: (reader.result as string).split(',')[1], mimeType: blob.type });
                    reader.readAsDataURL(blob);
                });
            }));
            const result = await analyzeCompetitorStrategy(kit.competitor.website, screenshots);
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor!, analysis: { ...result, lastUpdated: new Date().toISOString() } } }));
            setToast({ msg: "Analysis Complete!", type: "success" });
        } catch (e: any) { console.error(e); setToast({ msg: "Analysis failed. Try fewer images.", type: "error" }); } finally { setIsAnalyzingCompetitor(false); }
    };
    const applyNegativePrompts = () => {
        if (kit.competitor?.analysis?.avoidTags) {
            const current = kit.negativePrompts || "";
            const toAdd = kit.competitor.analysis.avoidTags;
            const combined = current ? `${current}, ${toAdd}` : toAdd;
            setKit(prev => ({ ...prev, negativePrompts: combined }));
            setToast({ msg: "Negative constraints applied.", type: "success" });
        }
    };

    const renderBrandList = () => (
        <div className={BrandKitManagerStyles.container}>
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className={BrandKitManagerStyles.sectionTitle}>My Brands</h1>
                    <p className={BrandKitManagerStyles.sectionSubtitle}>Manage your brand profiles and visual identities.</p>
                </div>
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${isLimitReached ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-green-50'}`}></div>
                    <span className="text-xs font-bold uppercase tracking-wide">Brands: {usage} / {limit}</span>
                </div>
            </div>

            <div className={BrandKitManagerStyles.brandGrid}>
                <button onClick={handleAddNewBrand} className={`${BrandKitManagerStyles.addCard} ${isLimitReached ? 'opacity-90 cursor-default hover:shadow-none bg-gray-50' : ''}`}>
                    {isLimitReached ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3 text-red-500"><LockIcon className="w-6 h-6" /></div>
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Limit Reached</span>
                            <span className="text-[10px] text-gray-500 mt-1 max-w-[150px] leading-tight mb-3">You've used all {limit} brand slots.</span>
                            <div onClick={(e) => { e.stopPropagation(); navigateTo('dashboard', 'billing'); }} className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#dfbc2b] transition-all shadow-md hover:scale-105">Upgrade Plan</div>
                        </div>
                    ) : (
                        <>
                            <div className={BrandKitManagerStyles.addCardIcon}><PlusIcon className="w-8 h-8" /></div>
                            <span className={BrandKitManagerStyles.addCardText}>Create New Brand</span>
                        </>
                    )}
                </button>
                
                {isLoadingBrands ? [1, 2, 3].map(i => (<div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm flex flex-col overflow-hidden"><div className="h-32 bg-gray-100"></div><div className="p-5 flex-1 flex flex-col justify-between"><div><div className="h-5 w-3/4 bg-gray-100 rounded mb-2"></div><div className="h-3 w-1/2 bg-gray-100 rounded"></div></div><div className="flex gap-2 mt-4"><div className="w-6 h-6 rounded-full bg-gray-100"></div><div className="w-6 h-6 rounded-full bg-gray-100"></div><div className="w-6 h-6 rounded-full bg-gray-100"></div></div></div></div>)) : (
                    brands.map((brand, idx) => (
                        <div key={brand.id || idx} onClick={() => handleSelectBrand(brand)} className={BrandKitManagerStyles.brandCard}>
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (<img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" />) : (<span className={BrandKitManagerStyles.brandCardFallback}>{(brand.name || brand.companyName || '?').substring(0, 2)}</span>)}
                                {brand.id && (<button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id!); }} className={BrandKitManagerStyles.deleteBtn}><TrashIcon className="w-4 h-4" /></button>)}
                            </div>
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div><h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.name || brand.companyName || 'Untitled Brand'}</h3><p className={BrandKitManagerStyles.brandCardMeta}>{brand.industry ? brand.industry.charAt(0).toUpperCase() + brand.industry.slice(1) : 'Physical'} • {brand.toneOfVoice || 'Professional'}</p></div>
                                <div className={BrandKitManagerStyles.brandCardPalette}><div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.primary }}></div><div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.secondary }}></div><div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.accent }}></div></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    const renderBrandDetail = () => (
        <div className={BrandKitManagerStyles.container}>
            <div className={BrandKitManagerStyles.detailHeader}>
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <button onClick={handleBackToList} className={BrandKitManagerStyles.backBtn}><ArrowLeftIcon className="w-3 h-3" /> Back to Brands</button>
                    <input type="text" value={kit.name || ''} onChange={(e) => handleTextChange('name', e.target.value)} placeholder="Brand Name" className={BrandKitManagerStyles.brandNameInput} />
                </div>

                <div className={BrandKitManagerStyles.actionGroup}>
                    {isSaving ? (<div className={BrandKitManagerStyles.savingBadge}><div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>Saving...</div>) : lastSaved ? (<div className={BrandKitManagerStyles.savedBadge}><CheckIcon className="w-4 h-4" /> Saved</div>) : null}
                    <button onClick={handleSave} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>Save Changes</button>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-100 pb-1">
                <button onClick={() => setDetailTab('identity')} className={`pb-3 px-2 text-sm font-bold transition-all ${detailTab === 'identity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Brand Identity</button>
                <button onClick={() => setDetailTab('competitor')} className={`pb-3 px-2 text-sm font-bold transition-all flex items-center gap-2 ${detailTab === 'competitor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}><ChartBarIcon className="w-4 h-4" /> Competitor Intel</button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-8">
                    {detailTab === 'identity' && (
                        <>
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-green-100 text-green-600 ${BrandKitManagerStyles.cardIconBox}`}><CaptionIcon className="w-5 h-5" /></div>
                                    <div><h2 className={BrandKitManagerStyles.cardTitle}>Brand Strategy</h2><p className={BrandKitManagerStyles.cardDesc}>Defining your voice and audience.</p></div>
                                </div>
                                <div className={`space-y-5 ${BrandKitManagerStyles.cardContent}`}>
                                    <div className="mb-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className={BrandKitManagerStyles.inputLabel}>Business Type (Industry)</label>
                                            {isAutoDetected && (<button onClick={() => setIsAutoDetected(false)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">Change Industry</button>)}
                                        </div>
                                        <div className={BrandKitManagerStyles.industryGrid}>
                                            {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => {
                                                const isSelected = (kit.industry || 'physical') === key;
                                                const isDisabled = isAutoDetected && !isSelected;
                                                return (
                                                    <button key={key} onClick={() => !isDisabled && setKit(prev => ({ ...prev, industry: key as IndustryType }))} disabled={isDisabled} className={`group ${BrandKitManagerStyles.industryCard} ${isSelected ? BrandKitManagerStyles.industryCardSelected : isDisabled ? BrandKitManagerStyles.industryCardDisabled : BrandKitManagerStyles.industryCardInactive}`}>
                                                        <div className={`${BrandKitManagerStyles.industryIconBox} ${isSelected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 group-hover:text-indigo-500'}`}><conf.icon className="w-5 h-5" /></div>
                                                        <div><span className={BrandKitManagerStyles.industryLabel}>{conf.label}</span><p className={BrandKitManagerStyles.industrySub}>{conf.sub}</p></div>
                                                        {isSelected && (<div className={BrandKitManagerStyles.industryCheck}><CheckIcon className="w-3 h-3" /></div>)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {isAutoDetected && (<p className="text-[10px] text-indigo-500 font-medium mt-3 flex items-center gap-1.5 animate-fadeIn"><SparklesIcon className="w-3 h-3" /> Industry automatically optimized based on your website analysis.</p>)}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div><label className={BrandKitManagerStyles.inputLabel}>Company Legal Name</label><input type="text" value={kit.companyName} onChange={(e) => handleTextChange('companyName', e.target.value)} placeholder="e.g. Skyline Realty LLC" className={BrandKitManagerStyles.inputField} /></div>
                                        <div><label className={BrandKitManagerStyles.inputLabel}>Website</label><input type="text" value={kit.website} onChange={(e) => handleTextChange('website', e.target.value)} placeholder="e.g. www.skyline.com" className={BrandKitManagerStyles.inputField} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div><label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label><select value={kit.toneOfVoice} onChange={(e) => handleSelectChange('toneOfVoice', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Professional</option><option>Luxury</option><option>Playful</option><option>Urgent / Sales</option><option>Friendly / Casual</option><option>Technical</option></select></div>
                                        <div><label className={BrandKitManagerStyles.inputLabel}>Target Audience</label><input type="text" value={kit.targetAudience || ''} onChange={(e) => handleTextChange('targetAudience', e.target.value)} placeholder="e.g. Tech-savvy millennials" className={BrandKitManagerStyles.inputField} /></div>
                                    </div>
                                    <div><label className={BrandKitManagerStyles.inputLabel}>Negative Prompts (What to Avoid)</label><input type="text" value={kit.negativePrompts || ''} onChange={(e) => handleTextChange('negativePrompts', e.target.value)} placeholder="e.g. No cartoons, no neon colors, no clutter" className={BrandKitManagerStyles.inputField} /></div>
                                </div>
                            </div>
                        
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-blue-100 text-blue-600 ${BrandKitManagerStyles.cardIconBox}`}><ShieldCheckIcon className="w-5 h-5" /></div><div><h2 className={BrandKitManagerStyles.cardTitle}>Identity Assets</h2><p className={BrandKitManagerStyles.cardDesc}>We'll auto-remove backgrounds for you.</p></div></div>
                                <div className={`grid grid-cols-1 gap-6 ${BrandKitManagerStyles.cardContent}`}><AssetUploader label="Main Logo" subLabel="Auto-Processed" currentUrl={kit.logos.primary} onUpload={(f) => handleUpload('primary', f)} onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: null } }))} isLoading={uploadingState['primary'] > 0} isProcessing={processingState['primary']} /></div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-purple-100 text-purple-600 ${BrandKitManagerStyles.cardIconBox}`}><PaletteIcon className="w-5 h-5" /></div><div><h2 className={BrandKitManagerStyles.cardTitle}>Visual DNA</h2><p className={BrandKitManagerStyles.cardDesc}>Colors and typography.</p></div></div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${BrandKitManagerStyles.cardContent}`}>
                                    <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Color Palette</h3><div className="space-y-4"><ColorInput label="Primary (Brand Color)" value={kit.colors.primary} onChange={(v) => updateDeepLocal('colors', 'primary', v)} onBlur={() => {}} /><ColorInput label="Secondary (Backgrounds)" value={kit.colors.secondary} onChange={(v) => updateDeepLocal('colors', 'secondary', v)} onBlur={() => {}} /><ColorInput label="Accent (CTAs / Highlights)" value={kit.colors.accent} onChange={(v) => updateDeepLocal('colors', 'accent', v)} onBlur={() => {}} /></div></div>
                                    <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Typography</h3><div className="space-y-5"><div><label className={BrandKitManagerStyles.inputLabel}>Heading Style</label><select value={kit.fonts.heading} onChange={(e) => updateDeepImmediate('fonts', 'heading', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Modern Sans (Clean)</option><option>Classic Serif (Luxury)</option><option>Bold Display (Impact)</option><option>Elegant Script (Soft)</option><option>Minimal Mono (Tech)</option></select></div><div><label className={BrandKitManagerStyles.inputLabel}>Body Text Style</label><select value={kit.fonts.body} onChange={(e) => updateDeepImmediate('fonts', 'body', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Clean Sans (Readable)</option><option>Readable Serif (Traditional)</option><option>System Default (Neutral)</option></select></div></div></div>
                                </div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-${industryConf.color}-100 text-${industryConf.color}-600 ${BrandKitManagerStyles.cardIconBox}`}><industryConf.icon className="w-5 h-5" /></div><div className="flex-1"><h2 className={BrandKitManagerStyles.cardTitle}>{industryConf.catalogTitle}</h2><p className={BrandKitManagerStyles.cardDesc}>{industryConf.catalogDesc}</p></div><button onClick={() => productInputRef.current?.click()} disabled={uploadingState['products'] > 0} className={`bg-${industryConf.color}-50 text-${industryConf.color}-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-${industryConf.color}-100 transition-colors flex items-center gap-1.5`}>{uploadingState['products'] > 0 ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> {industryConf.btn}</>}</button><input ref={productInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} /></div>
                                <div className={`${BrandKitManagerStyles.cardContent}`}>{(!kit.products || kit.products.length === 0) ? (<div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-sm text-gray-400 font-medium">No items added yet.</p></div>) : (<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{kit.products.map(product => (<ProductItem key={product.id} item={product} placeholder={industryConf.itemLabel} onDelete={() => deleteProduct(product.id)} onNameChange={(name) => updateProductName(product.id, name)} />))}</div>)}</div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-pink-100 text-pink-600 ${BrandKitManagerStyles.cardIconBox}`}><LightbulbIcon className="w-5 h-5" /></div><div className="flex-1"><h2 className={BrandKitManagerStyles.cardTitle}>Mood Board</h2><p className={BrandKitManagerStyles.cardDesc}>Upload inspiration for AI style matching.</p></div><button onClick={() => moodInputRef.current?.click()} disabled={uploadingState['mood'] > 0} className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors flex items-center gap-1.5">{uploadingState['mood'] > 0 ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> Add Image</>}</button><input ref={moodInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} /></div>
                                <div className={`${BrandKitManagerStyles.cardContent}`}>{(!kit.moodBoard || kit.moodBoard.length === 0) ? (<div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-sm text-gray-400 font-medium">No inspiration images added.</p></div>) : (<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">{kit.moodBoard.map(item => (<MoodItem key={item.id} item={item} onDelete={() => deleteMoodItem(item.id)} />))}</div>)}</div>
                            </div>
                        </>
                    )}

                    {detailTab === 'competitor' && (
                        <div className={BrandKitManagerStyles.card}>
                            <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-amber-100 text-amber-600 ${BrandKitManagerStyles.cardIconBox}`}><ChartBarIcon className="w-5 h-5" /></div><div className="flex-1"><h2 className={BrandKitManagerStyles.cardTitle}>Competitor Intelligence</h2><p className={BrandKitManagerStyles.cardDesc}>Analyze your rivals to outsmart them.</p></div></div>
                            <div className={BrandKitManagerStyles.cardContent}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div><label className={BrandKitManagerStyles.inputLabel}>Competitor Website</label><input type="text" placeholder="e.g. www.competitor.com" className={BrandKitManagerStyles.inputField} value={kit.competitor?.website || ''} onChange={(e) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { adScreenshots: [] }, website: e.target.value } }))} /></div>
                                        <div>
                                            <div className="flex justify-between items-center mb-2"><label className={BrandKitManagerStyles.inputLabel}>Competitor Ad Screenshots</label><button onClick={() => competitorAdRef.current?.click()} disabled={uploadingState['competitor'] > 0} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">{uploadingState['competitor'] > 0 ? 'Uploading...' : <><PlusIcon className="w-3 h-3"/> Add Image</>}</button><input ref={competitorAdRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompetitorAdUpload} /></div>
                                            {(!kit.competitor?.adScreenshots || kit.competitor.adScreenshots.length === 0) ? (<div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50"><p className="text-xs text-gray-400">Upload screenshots of their ads or social posts.</p></div>) : (<div className="grid grid-cols-3 gap-2">{kit.competitor.adScreenshots.map(ad => (<div key={ad.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200"><img src={ad.imageUrl} className="w-full h-full object-cover" /><button onClick={() => deleteCompetitorAd(ad.id)} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"><XIcon className="w-3 h-3" /></button></div>))}</div>)}
                                        </div>
                                        <button onClick={runCompetitorAnalysis} disabled={isAnalyzingCompetitor || !kit.competitor?.website} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none">{isAnalyzingCompetitor ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Analyzing Strategy...</>) : (<><LightningIcon className="w-4 h-4 text-white" /> Analyze & Outsmart</>)}</button>
                                    </div>

                                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 h-full">
                                        {kit.competitor?.analysis ? (
                                            <div className="space-y-6 animate-fadeIn">
                                                <div className="flex items-center justify-between"><h3 className="text-sm font-black text-gray-800 uppercase tracking-wide">Strategic Report</h3><span className="text-[10px] text-gray-400">Updated: {new Date(kit.competitor.analysis.lastUpdated).toLocaleDateString()}</span></div>
                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Their Strategy</p><p className="text-sm text-gray-700 leading-relaxed">{kit.competitor.analysis.theirStrategy}</p></div>
                                                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 opacity-10 rounded-bl-full -mr-4 -mt-4"></div><p className="text-[10px] font-bold text-indigo-500 uppercase mb-1 flex items-center gap-1"><SparklesIcon className="w-3 h-3" /> Your Winning Angle</p><p className="text-sm font-bold text-indigo-900 leading-relaxed">{kit.competitor.analysis.winningAngle}</p></div>
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Visual Gap (Opportunity)</p><p className="text-sm text-gray-700 leading-relaxed">{kit.competitor.analysis.visualGap}</p></div>
                                                    {kit.competitor.analysis.avoidTags && (<div className="bg-red-50 p-4 rounded-xl border border-red-100"><p className="text-[10px] font-bold text-red-500 uppercase mb-2">Avoid (Differentiation)</p><p className="text-xs text-red-800 italic mb-3">"{kit.competitor.analysis.avoidTags}"</p><button onClick={applyNegativePrompts} className="text-[10px] font-bold bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors shadow-sm w-full">Apply to Negative Prompts</button></div>)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60"><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm"><ChartBarIcon className="w-8 h-8 text-gray-300" /></div><h4 className="text-sm font-bold text-gray-500">No Intelligence Yet</h4><p className="text-xs text-gray-400 mt-1 max-w-[200px]">Add a website and ad screenshots, then run analysis to reveal their strategy.</p></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="sticky top-28">
                        <div className="flex items-center gap-2 mb-4"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span><h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</h3></div>
                        <div className={BrandKitManagerStyles.previewCard}>
                            <div className={BrandKitManagerStyles.previewInner}>
                                <div className={BrandKitManagerStyles.previewHeader}><h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Brand Card</h3><div className={BrandKitManagerStyles.previewTag}>{kit.industry?.toUpperCase() || 'PHYSICAL'}</div></div>
                                <div className="mb-8 pb-6 border-b border-white/10">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className={`bg-white ${BrandKitManagerStyles.previewLogoBox}`}><span className="absolute top-2 left-3 text-[9px] font-bold text-gray-300 uppercase tracking-wider">On Light</span>{kit.logos.primary ? (<img src={kit.logos.primary} className="w-full h-full object-contain" alt="Primary Logo" />) : (<div className="text-gray-200 text-center"><span className="text-[9px] font-bold uppercase block mt-1">No Logo</span></div>)}</div>
                                        <div className={`bg-[#121212] border border-white/10 ${BrandKitManagerStyles.previewLogoBox}`}><span className="absolute top-2 left-3 text-[9px] font-bold text-gray-600 uppercase tracking-wider">On Dark</span>{kit.logos.primary ? (<img src={kit.logos.primary} className="w-full h-full object-contain brightness-0 invert" alt="Logo White" />) : (<div className="text-gray-800 text-center"><span className="text-[9px] font-bold uppercase block mt-1">No Logo</span></div>)}</div>
                                    </div>
                                </div>
                                <div className="space-y-3 mb-8"><h2 className="text-3xl font-bold leading-tight" style={{ fontFamily: kit.fonts.heading.includes('Serif') ? 'serif' : 'sans-serif' }}>{kit.companyName || "Your Company Name"}</h2><p className="text-sm opacity-70" style={{ fontFamily: kit.fonts.body.includes('Serif') ? 'serif' : 'sans-serif' }}>Building the future of {kit.website || "your brand"}.</p>{kit.targetAudience && (<p className={BrandKitManagerStyles.previewTag}>Target: {kit.targetAudience}</p>)}</div>
                                <div className="flex gap-2"><div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.primary }}></div><div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.secondary }}></div><div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.accent }}></div></div>
                                <div className="flex justify-between text-[9px] text-white/40 mt-2 font-mono uppercase"><span>Primary</span><span>Secondary</span><span>Accent</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {viewMode === 'list' ? renderBrandList() : renderBrandDetail()}
            
            {showCreationWizard && auth.user && (
                <BrandCreationWizard 
                    onClose={() => setShowCreationWizard(false)} 
                    onComplete={handleWizardComplete}
                    userId={auth.user.uid}
                />
            )}
            
            {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </>
    );
};