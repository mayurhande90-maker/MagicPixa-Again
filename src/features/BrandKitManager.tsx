
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit, BRAND_LIMITS, Page, View } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, PaletteIcon, 
    CaptionIcon, BrandKitIcon, 
    PlusIcon, MagicWandIcon, ChevronDownIcon, TrashIcon,
    SparklesIcon, CheckIcon, ArrowLeftIcon, LockIcon,
    CubeIcon, LightbulbIcon, ChartBarIcon, LightningIcon,
    GlobeIcon, CameraIcon, EyeIcon, FlagIcon, DocumentTextIcon,
    InformationCircleIcon
} from '../components/icons';
// FIX: Import InputField from FeatureLayout to resolve "Cannot find name 'InputField'" error.
import { InputField } from '../components/FeatureLayout';
import { fileToBase64, urlToBase64, resizeImage } from '../utils/imageUtils';
import { uploadBrandAsset, saveUserBrandKit, deleteBrandFromCollection, subscribeToUserBrands } from '../firebase';
import { generateBrandIdentity, processLogoAsset, analyzeCompetitorStrategy } from '../services/brandKitService';
import ToastNotification from '../components/ToastNotification';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';

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
                                className="bg-white text-red-500 p-2.5 rounded-xl shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-red-50"
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
    onDelete: () => void;
    onNameChange: (name: string) => void;
}> = ({ item, onDelete, onNameChange }) => {
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
                    placeholder="Product Name"
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

const MagicSetupModal: React.FC<{ 
    onClose: () => void; 
    onGenerate: (url: string, desc: string, compUrl: string) => void; 
    isGenerating: boolean 
}> = ({ onClose, onGenerate, isGenerating }) => {
    const [url, setUrl] = useState('');
    const [desc, setDesc] = useState('');
    const [compUrl, setCompUrl] = useState('');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5"/></button>
                
                <div className="text-center mb-8 pt-4">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Strategic Onboarding</h2>
                    <p className="text-sm text-gray-500 mt-2">Let AI build your brand identity and map your rival in one go.</p>
                </div>

                <div className="space-y-6">
                    <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4">Your Brand</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website / Social URL</label>
                                <input className={BrandKitManagerStyles.inputField} placeholder="e.g. www.yourbrand.com" value={url} onChange={e => setUrl(e.target.value)} />
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Brand Description</label>
                                <textarea className={`${BrandKitManagerStyles.inputField} h-20 resize-none`} placeholder="Describe your mission and products..." value={desc} onChange={e => setDesc(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                        <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4">Your Primary Rival</h3>
                        <div>
                            <label className={BrandKitManagerStyles.inputLabel}>Competitor Website</label>
                            <input className={BrandKitManagerStyles.inputField} placeholder="e.g. www.competitor.com" value={compUrl} onChange={e => setCompUrl(e.target.value)} />
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => onGenerate(url, desc, compUrl)} 
                        disabled={isGenerating || !url}
                        className="w-full py-4 bg-[#1A1A1E] text-white rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 hover:bg-black hover:scale-[1.02] transition-all disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                Researching Both Brands...
                            </>
                        ) : (
                            <>
                                <MagicWandIcon className="w-5 h-5" />
                                Generate Unified Strategy
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View) => void }> = ({ auth, navigateTo }) => {
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState(true);
    
    const [kit, setKit] = useState<BrandKit>({
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

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
    const [processingState, setProcessingState] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [isMagicGen, setIsMagicGen] = useState(false);
    
    const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);

    const productInputRef = useRef<HTMLInputElement>(null);
    const moodInputRef = useRef<HTMLInputElement>(null);
    const competitorAdRef = useRef<HTMLInputElement>(null);

    const userPlan = auth.user?.plan || 'Free';
    const matchedPlanKey = Object.keys(BRAND_LIMITS).find(k => userPlan.includes(k)) || 'Free';
    const limit = BRAND_LIMITS[matchedPlanKey] || 1;
    const usage = brands.length;
    const isLimitReached = usage >= limit;

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

    const createEmptyBrand = (name: string): BrandKit => ({
        name,
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

    const handleAddNewBrand = () => {
        if (isLimitReached) {
            setToast({ msg: `Plan limit reached (${usage}/${limit}). Please upgrade.`, type: 'error' });
            return;
        }
        const newBrand = createEmptyBrand('New Brand');
        setKit(newBrand);
        setViewMode('detail');
        setLastSaved(null);
    };

    const handleSelectBrand = (brand: BrandKit) => {
        setKit({
            ...brand,
            products: brand.products || [],
            moodBoard: brand.moodBoard || [],
            competitor: brand.competitor || { website: '', adScreenshots: [] }
        });
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
            setToast({ msg: "Delete failed.", type: "error" });
        }
    };

    const performSave = async (updatedKit: BrandKit) => {
        if (!auth.user) return;
        setIsSaving(true);
        let finalKit = { ...updatedKit };
        if (finalKit.name === 'New Brand' && finalKit.companyName) finalKit.name = finalKit.companyName;
        try {
            const savedKit = await saveUserBrandKit(auth.user.uid, finalKit);
            setKit(savedKit as BrandKit);
            setLastSaved(new Date());
            setToast({ msg: "Brand strategy saved.", type: "success" });
        } catch (e) {
            setToast({ msg: "Failed to save.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleBackToList = () => setViewMode('list');
    const handleTextChange = (field: keyof BrandKit, value: string) => setKit(prev => ({ ...prev, [field]: value }));
    const updateDeepLocal = (section: keyof BrandKit, key: string, value: any) => setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    const handleSave = () => performSave(kit);
    const handleSelectChange = (field: keyof BrandKit, value: string) => setKit(prev => ({ ...prev, [field]: value }));

    const handleUpload = async (key: 'primary', file: File) => {
        if (!auth.user) return;
        setProcessingState(prev => ({ ...prev, [key]: true }));
        try {
            const base64Data = await fileToBase64(file);
            let processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
            if (key === 'primary') processedUri = await processLogoAsset(base64Data.base64, base64Data.mimeType);
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: true }));
            const url = await uploadBrandAsset(auth.user.uid, processedUri, key);
            setKit(prev => ({ ...prev, logos: { ...prev.logos, [key]: url } }));
            setToast({ msg: "Logo added.", type: "success" });
        } catch (e) {
            setToast({ msg: "Upload failed.", type: "error" });
        } finally {
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: true }));
        }
    };

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files?.length) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, products: true }));
        try {
            const newProducts = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const url = await uploadBrandAsset(auth.user!.uid, `data:${base64Data.mimeType};base64,${base64Data.base64}`, `prod_${Date.now()}`);
                return { id: Math.random().toString(36).substring(7), name: file.name.split('.')[0], imageUrl: url };
            }));
            setKit(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
        } finally {
            setUploadingState(prev => ({ ...prev, products: false }));
        }
    };

    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files?.length) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, mood: true }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const url = await uploadBrandAsset(auth.user!.uid, `data:${base64Data.mimeType};base64,${base64Data.base64}`, `mood_${Date.now()}`);
                return { id: Math.random().toString(36).substring(7), imageUrl: url };
            }));
            setKit(prev => ({ ...prev, moodBoard: [...(prev.moodBoard || []), ...newItems] }));
        } finally {
            setUploadingState(prev => ({ ...prev, mood: false }));
        }
    };

    const handleCompetitorAdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files?.length) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, competitor: true }));
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const url = await uploadBrandAsset(auth.user!.uid, `data:${base64Data.mimeType};base64,${base64Data.base64}`, `comp_${Date.now()}`);
                return { id: Math.random().toString(36).substring(7), imageUrl: url };
            }));
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor!, adScreenshots: [...(prev.competitor?.adScreenshots || []), ...newItems] } }));
        } finally {
            setUploadingState(prev => ({ ...prev, competitor: false }));
        }
    };

    const runCompetitorAnalysis = async () => {
        if (!kit.competitor?.website || !kit.competitor.adScreenshots.length) return;
        setIsAnalyzingCompetitor(true);
        try {
            const screenshots = await Promise.all(kit.competitor.adScreenshots.map(async (item) => {
                const response = await fetch(item.imageUrl);
                const blob = await response.blob();
                const optimizedDataUrl = await resizeImage(await new Promise(r => { const reader = new FileReader(); reader.onloadend = () => r(reader.result as string); reader.readAsDataURL(blob); }), 512, 0.7);
                return { data: optimizedDataUrl.split(',')[1], mimeType: 'image/jpeg' };
            }));
            const result = await analyzeCompetitorStrategy(kit.competitor.website, screenshots);
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor!, analysis: { ...result, lastUpdated: new Date().toISOString() } } }));
            setToast({ msg: "Analysis Complete!", type: "success" });
        } finally {
            setIsAnalyzingCompetitor(false);
        }
    };

    const handleMagicGenerate = async (url: string, desc: string, compUrl: string) => {
        setIsMagicGen(true);
        try {
            const generatedData = await generateBrandIdentity(url, desc, compUrl);
            
            // PERFORM DEEP MERGE: Keep existing data (like logo) if AI missed it
            setKit(prev => ({ 
                ...prev, 
                ...generatedData,
                // Ensure nested objects are merged carefully
                colors: generatedData.colors || prev.colors,
                fonts: generatedData.fonts || prev.fonts,
                logos: { ...prev.logos, ...(generatedData.logos || {}) },
                competitor: { ...prev.competitor, ...(generatedData.competitor || {}) }
            }));
            
            setToast({ msg: "Unified strategy generated!", type: "success" });
            setShowMagicModal(false);
        } catch (e: any) {
            console.error("Magic Generation Error:", e);
            setToast({ msg: e.message || "Research failed.", type: "error" });
        } finally {
            setIsMagicGen(false);
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
                    <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-xs font-bold uppercase tracking-wide">Brands: {usage} / {limit}</span>
                </div>
            </div>
            <div className={BrandKitManagerStyles.brandGrid}>
                <button onClick={handleAddNewBrand} className={`${BrandKitManagerStyles.addCard} ${isLimitReached ? 'opacity-90 cursor-default' : ''}`}>
                    {isLimitReached ? (
                        <div className="flex flex-col items-center p-4">
                            <LockIcon className="w-6 h-6 text-red-500 mb-3" />
                            <span className="text-xs font-bold text-red-500 uppercase">Limit Reached</span>
                        </div>
                    ) : (
                        <><div className={BrandKitManagerStyles.addCardIcon}><PlusIcon className="w-8 h-8" /></div><span className={BrandKitManagerStyles.addCardText}>Create New Brand</span></>
                    )}
                </button>
                {isLoadingBrands ? [1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm" />) : (
                    brands.map((brand, idx) => (
                        <div key={brand.id || idx} onClick={() => handleSelectBrand(brand)} className={BrandKitManagerStyles.brandCard}>
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" /> : <span className={BrandKitManagerStyles.brandCardFallback}>{(brand.name || brand.companyName || '?').substring(0, 2)}</span>}
                                {brand.id && <button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id!); }} className={BrandKitManagerStyles.deleteBtn}><TrashIcon className="w-4 h-4" /></button>}
                            </div>
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div><h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.name || brand.companyName || 'Untitled Brand'}</h3><p className={BrandKitManagerStyles.brandCardMeta}>{brand.toneOfVoice || 'Professional'}</p></div>
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
                    {isSaving ? <div className={BrandKitManagerStyles.savingBadge}><div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>Saving...</div> : lastSaved && <div className={BrandKitManagerStyles.savedBadge}><CheckIcon className="w-4 h-4" /> Saved</div>}
                    <button onClick={() => setShowMagicModal(true)} className={BrandKitManagerStyles.magicBtn}>Auto-Fill with AI</button>
                    <button onClick={handleSave} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>Save Changes</button>
                </div>
            </div>

            <div className="space-y-8">
                {/* ZONE A: VISUAL DNA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`${BrandKitManagerStyles.card} lg:col-span-1`}>
                        <div className={BrandKitManagerStyles.cardHeader}><ShieldCheckIcon className="w-5 h-5 text-blue-600"/><h2 className={BrandKitManagerStyles.cardTitle}>Identity Assets</h2></div>
                        <div className={BrandKitManagerStyles.cardContent}>
                            <AssetUploader label="Main Logo" subLabel="Transparent PNG Preferred" currentUrl={kit.logos.primary} onUpload={(f) => handleUpload('primary', f)} onRemove={() => updateDeepLocal('logos', 'primary', null)} isLoading={uploadingState['primary']} isProcessing={processingState['primary']} />
                        </div>
                    </div>
                    <div className={`${BrandKitManagerStyles.card} lg:col-span-2`}>
                        <div className={BrandKitManagerStyles.cardHeader}><PaletteIcon className="w-5 h-5 text-indigo-600"/><h2 className={BrandKitManagerStyles.cardTitle}>Visual DNA</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                            <div className="space-y-4">
                                <ColorInput label="Primary" value={kit.colors.primary} onChange={(v) => updateDeepLocal('colors', 'primary', v)} onBlur={() => {}} />
                                <ColorInput label="Secondary" value={kit.colors.secondary} onChange={(v) => updateDeepLocal('colors', 'secondary', v)} onBlur={() => {}} />
                                <ColorInput label="Accent" value={kit.colors.accent} onChange={(v) => updateDeepLocal('colors', 'accent', v)} onBlur={() => {}} />
                            </div>
                            <div className="space-y-4">
                                <div><label className={BrandKitManagerStyles.inputLabel}>Heading Font</label><select value={kit.fonts.heading} onChange={(e) => updateDeepLocal('fonts', 'heading', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Modern Sans</option><option>Classic Serif</option><option>Bold Display</option><option>Minimal Mono</option></select></div>
                                <div><label className={BrandKitManagerStyles.inputLabel}>Body Font</label><select value={kit.fonts.body} onChange={(e) => updateDeepLocal('fonts', 'body', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Clean Sans</option><option>Readable Serif</option><option>System Default</option></select></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ZONE B & C: STRATEGY & COMPETITOR */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-5 space-y-6">
                        <div className={BrandKitManagerStyles.card}>
                            <div className={BrandKitManagerStyles.cardHeader}><CaptionIcon className="w-5 h-5 text-green-600"/><h2 className={BrandKitManagerStyles.cardTitle}>Brand Strategy</h2></div>
                            <div className="p-6 space-y-5">
                                <InputField label="Company Legal Name" value={kit.companyName} onChange={(e: any) => handleTextChange('companyName', e.target.value)} />
                                <InputField label="Main Website" value={kit.website} onChange={(e: any) => handleTextChange('website', e.target.value)} />
                                <div><label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label><select value={kit.toneOfVoice} onChange={(e) => handleSelectChange('toneOfVoice', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Professional</option><option>Luxury</option><option>Playful</option><option>Urgent</option><option>Casual</option></select></div>
                                <InputField label="Target Audience" value={kit.targetAudience || ''} onChange={(e: any) => handleTextChange('targetAudience', e.target.value)} />
                                <InputField label="Negative Prompts (What to Avoid)" value={kit.negativePrompts || ''} onChange={(e: any) => handleTextChange('negativePrompts', e.target.value)} />
                                
                                {/* Grounding display */}
                                {kit.searchLinks && kit.searchLinks.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <InformationCircleIcon className="w-4 h-4 text-indigo-500" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Research Sources</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {kit.searchLinks.map((link, i) => (
                                                <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors truncate max-w-[150px]">
                                                    {link.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className={BrandKitManagerStyles.card}>
                            <div className={BrandKitManagerStyles.cardHeader}><CubeIcon className="w-5 h-5 text-orange-600"/><h2 className={BrandKitManagerStyles.cardTitle}>Product Catalog</h2></div>
                            <div className="p-6">
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {kit.products?.map(p => <ProductItem key={p.id} item={p} onDelete={() => updateDeepLocal('products', '', kit.products?.filter(pr => pr.id !== p.id))} onNameChange={(n) => updateDeepLocal('products', '', kit.products?.map(pr => pr.id === p.id ? {...pr, name: n} : pr))} />)}
                                    <button onClick={() => productInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"><PlusIcon className="w-6 h-6 text-gray-300"/></button>
                                </div>
                                <input ref={productInputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleProductUpload} />
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-7 bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-amber-50/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><ChartBarIcon className="w-5 h-5"/></div>
                                <div><h3 className="font-black text-gray-900 uppercase tracking-tight">Competitor Intel</h3><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Forensic Strategy Map</p></div>
                            </div>
                            <button onClick={runCompetitorAnalysis} disabled={isAnalyzingCompetitor || !kit.competitor?.website || !kit.competitor.adScreenshots.length} className="bg-[#1A1A1E] text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-black transition-all flex items-center gap-2 disabled:opacity-30">
                                {isAnalyzingCompetitor ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <LightningIcon className="w-3 h-3 text-amber-400"/>}
                                Analyze Rival DNA
                            </button>
                        </div>

                        <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <InputField label="Competitor Website" value={kit.competitor?.website || ''} onChange={(e: any) => updateDeepLocal('competitor', 'website', e.target.value)} />
                                    <div>
                                        <label className={BrandKitManagerStyles.inputLabel}>Ad Gallery</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {kit.competitor?.adScreenshots?.map(s => <div key={s.id} className="relative aspect-square rounded-xl overflow-hidden group"><img src={s.imageUrl} className="w-full h-full object-cover"/><button onClick={() => updateDeepLocal('competitor', 'adScreenshots', kit.competitor?.adScreenshots.filter(sc => sc.id !== s.id))} className="absolute top-1 right-1 bg-white/80 p-1 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3 h-3"/></button></div>)}
                                            <button onClick={() => competitorAdRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:bg-gray-50"><PlusIcon className="w-4 h-4 text-gray-300"/></button>
                                        </div>
                                        <input ref={competitorAdRef} type="file" className="hidden" multiple accept="image/*" onChange={handleCompetitorAdUpload} />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {kit.competitor?.analysis ? (
                                        <>
                                            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><EyeIcon className="w-3 h-3"/> Their Playbook</h4>
                                                <p className="text-xs text-gray-700 leading-relaxed font-medium">{kit.competitor.analysis.theirStrategy}</p>
                                            </div>
                                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                                                <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><LightningIcon className="w-3 h-3"/> Our Winning Angle</h4>
                                                <p className="text-sm text-indigo-900 font-black italic">"{kit.competitor.analysis.winningAngle}"</p>
                                            </div>
                                            <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                                                <h4 className="text-[9px] font-black text-amber-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2"><LightbulbIcon className="w-3 h-3"/> Visual Opportunity</h4>
                                                <p className="text-xs text-amber-900 leading-relaxed font-medium">{kit.competitor.analysis.visualGap}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 p-8">
                                            <ChartBarIcon className="w-12 h-12 text-gray-300 mb-3" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Reports Pending</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {isAnalyzingCompetitor && <div className="absolute inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center flex-col"><div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"/><p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em]">Scanning Rival DNA...</p></div>}
                    </div>
                </div>
            </div>

            {showMagicModal && <MagicSetupModal onClose={() => setShowMagicModal(false)} onGenerate={handleMagicGenerate} isGenerating={isMagicGen} />}
            {toast && <ToastNotification message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );

    return viewMode === 'list' ? renderBrandList() : renderBrandDetail();
};
