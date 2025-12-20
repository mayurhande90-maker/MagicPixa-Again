import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit, BRAND_LIMITS, Page, View } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, PaletteIcon, 
    CaptionIcon, BrandKitIcon, 
    PlusIcon, MagicWandIcon, ChevronDownIcon, TrashIcon,
    SparklesIcon, CheckIcon, ArrowLeftIcon, LockIcon,
    CubeIcon, LightbulbIcon, ChartBarIcon, LightningIcon,
    GlobeIcon, CameraIcon, EyeIcon, FlagIcon, DocumentTextIcon
} from '../components/icons';
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

// --- NEW COMPONENT: PRODUCT CATALOG ITEM ---
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

// --- NEW COMPONENT: MOOD BOARD / AD ITEM ---
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

const MagicSetupModal: React.FC<{ onClose: () => void; onGenerate: (url: string, desc: string) => void; isGenerating: boolean }> = ({ onClose, onGenerate, isGenerating }) => {
    const [url, setUrl] = useState('');
    const [desc, setDesc] = useState('');

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5"/></button>
                
                <div className="text-center mb-6 pt-4">
                    <h2 className="text-2xl font-bold text-gray-900">Auto-Generate Brand</h2>
                    <p className="text-sm text-gray-500 mt-2">Enter your details and let AI build your kit instantly.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className={BrandKitManagerStyles.inputLabel}>Website / Social URL</label>
                        <input className={BrandKitManagerStyles.inputField} placeholder="e.g. www.nike.com" value={url} onChange={e => setUrl(e.target.value)} />
                    </div>
                    <div>
                        <label className={BrandKitManagerStyles.inputLabel}>Brand Description</label>
                        <textarea className={`${BrandKitManagerStyles.inputField} h-24 resize-none`} placeholder="e.g. A premium athletic wear brand for runners." value={desc} onChange={e => setDesc(e.target.value)} />
                    </div>
                    
                    <button 
                        onClick={() => onGenerate(url, desc)} 
                        disabled={isGenerating || !url}
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center"
                    >
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"/> : "Generate Magic Kit"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View) => void }> = ({ auth, navigateTo }) => {
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [detailTab, setDetailTab] = useState<'identity' | 'competitor'>('identity');

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
        moodBoard: []
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
    const [processingState, setProcessingState] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [isMagicGen, setIsMagicGen] = useState(false);
    
    // Competitor Analysis States
    const [isAnalyzingCompetitor, setIsAnalyzingCompetitor] = useState(false);

    // Refs for hidden inputs
    const productInputRef = useRef<HTMLInputElement>(null);
    const moodInputRef = useRef<HTMLInputElement>(null);
    const competitorAdRef = useRef<HTMLInputElement>(null);

    // LIMIT LOGIC
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
        setDetailTab('identity');
        setViewMode('detail');
        setLastSaved(null);
    };

    const handleSelectBrand = (brand: BrandKit) => {
        // Ensure arrays exist for old data
        setKit({
            ...brand,
            products: brand.products || [],
            moodBoard: brand.moodBoard || [],
            competitor: brand.competitor || { website: '', adScreenshots: [] }
        });
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

    const handleBackToList = () => {
        setViewMode('list');
    };

    const handleTextChange = (field: keyof BrandKit, value: string) => {
        setKit(prev => ({ ...prev, [field]: value }));
    };

    const updateDeepLocal = (section: keyof BrandKit, key: string, value: any) => {
        setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    };

    const handleSave = () => {
        performSave(kit);
    };

    const handleSelectChange = (field: keyof BrandKit, value: string) => {
        setKit(prev => ({ ...prev, [field]: value }));
    };

    const updateDeepImmediate = (section: keyof BrandKit, key: string, value: any) => {
        setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    };

    const handleUpload = async (key: 'primary', file: File) => {
        if (!auth.user) return;
        
        setProcessingState(prev => ({ ...prev, [key]: true }));
        try {
            const base64Data = await fileToBase64(file);
            let processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
            
            if (key === 'primary') {
                processedUri = await processLogoAsset(base64Data.base64, base64Data.mimeType);
            }
            
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: true }));

            const url = await uploadBrandAsset(auth.user.uid, processedUri, key);
            
            setKit(prev => ({ ...prev, logos: { ...prev.logos, [key]: url } }));
            setToast({ msg: "Asset processed & uploaded.", type: "success" });

        } catch (e: any) {
            console.error("Upload failed", e);
            setToast({ msg: "Failed to upload asset.", type: "error" });
        } finally {
            setProcessingState(prev => ({ ...prev, [key]: false }));
            setUploadingState(prev => ({ ...prev, [key]: false }));
        }
    };

    // --- PRODUCT CATALOG HANDLERS ---
    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, products: true }));
        
        try {
            const newProducts = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `product_${tempId}`);
                
                return {
                    id: tempId,
                    name: file.name.split('.')[0] || 'New Product',
                    imageUrl: url
                };
            }));
            
            setKit(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
            setToast({ msg: `${newProducts.length} product(s) added.`, type: "success" });
        } catch (error: any) {
            console.error("Product upload failed", error);
            setToast({ msg: "Failed to upload products.", type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, products: false }));
            e.target.value = '';
        }
    };

    const deleteProduct = (id: string) => {
        setKit(prev => ({
            ...prev,
            products: prev.products?.filter(p => p.id !== id) || []
        }));
    };

    const updateProductName = (id: string, newName: string) => {
        setKit(prev => ({
            ...prev,
            products: prev.products?.map(p => p.id === id ? { ...p, name: newName } : p) || []
        }));
    };

    // --- MOOD BOARD HANDLERS ---
    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, mood: true }));
        
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `mood_${tempId}`);
                
                return {
                    id: tempId,
                    imageUrl: url
                };
            }));
            
            setKit(prev => ({ ...prev, moodBoard: [...(prev.moodBoard || []), ...newItems] }));
            setToast({ msg: `${newItems.length} image(s) added.`, type: "success" });
        } catch (error: any) {
            console.error("Mood upload failed", error);
            setToast({ msg: "Failed to upload images.", type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, mood: false }));
            e.target.value = '';
        }
    };

    const deleteMoodItem = (id: string) => {
        setKit(prev => ({
            ...prev,
            moodBoard: prev.moodBoard?.filter(m => m.id !== id) || []
        }));
    };

    // --- COMPETITOR INTEL HANDLERS ---
    const handleCompetitorAdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!auth.user || !e.target.files || e.target.files.length === 0) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, competitor: true }));
        
        try {
            const newItems = await Promise.all(files.map(async (file) => {
                const base64Data = await fileToBase64(file);
                const processedUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
                const tempId = Math.random().toString(36).substring(7);
                const url = await uploadBrandAsset(auth.user!.uid, processedUri, `comp_ad_${tempId}`);
                
                return { id: tempId, imageUrl: url };
            }));
            
            setKit(prev => ({
                ...prev,
                competitor: {
                    ...prev.competitor || { website: '', adScreenshots: [] },
                    adScreenshots: [...(prev.competitor?.adScreenshots || []), ...newItems]
                }
            }));
            setToast({ msg: `${newItems.length} screenshot(s) added.`, type: "success" });
        } catch (error: any) {
            console.error(error);
            setToast({ msg: "Upload failed.", type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, competitor: false }));
            e.target.value = '';
        }
    };

    const deleteCompetitorAd = (id: string) => {
        setKit(prev => ({
            ...prev,
            competitor: {
                ...prev.competitor || { website: '', adScreenshots: [] },
                adScreenshots: prev.competitor?.adScreenshots.filter(i => i.id !== id) || []
            }
        }));
    };

    const runCompetitorAnalysis = async () => {
        if (!kit.competitor?.website || kit.competitor.adScreenshots.length === 0) {
            alert("Please provide a Competitor Website and at least one Ad Screenshot.");
            return;
        }

        setIsAnalyzingCompetitor(true);
        try {
            // Fetch images and optimize them before analysis to prevent payload limit errors
            const screenshots = await Promise.all(kit.competitor.adScreenshots.map(async (item) => {
                const response = await fetch(item.imageUrl);
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                
                // Optimize to 512px for reliable analysis payload
                const optimizedDataUrl = await resizeImage(dataUrl, 512, 0.7);
                
                return {
                    data: optimizedDataUrl.split(',')[1],
                    mimeType: 'image/jpeg'
                };
            }));

            const result = await analyzeCompetitorStrategy(kit.competitor.website, screenshots);
            
            setKit(prev => ({
                ...prev,
                competitor: {
                    ...prev.competitor!,
                    analysis: {
                        ...result,
                        lastUpdated: new Date().toISOString()
                    }
                }
            }));
            setToast({ msg: "Analysis Complete!", type: "success" });
        } catch (e: any) {
            console.error(e);
            setToast({ msg: "Analysis failed. Try fewer images or check connection.", type: "error" });
        } finally {
            setIsAnalyzingCompetitor(false);
        }
    };

    const applyNegativePrompts = () => {
        if (kit.competitor?.analysis?.avoidTags) {
            const current = kit.negativePrompts || "";
            const toAdd = kit.competitor.analysis.avoidTags;
            const combined = current ? `${current}, ${toAdd}` : toAdd;
            setKit(prev => ({ ...prev, negativePrompts: combined }));
            setToast({ msg: "Negative constraints applied to Brand Strategy.", type: "success" });
        }
    };

    const handleMagicGenerate = async (url: string, desc: string) => {
        setIsMagicGen(true);
        try {
            const generated = await generateBrandIdentity(url, desc);
            const newKit = { ...kit, ...generated };
            if (generated.companyName && newKit.name === 'New Brand') {
                newKit.name = generated.companyName;
            }
            setKit(newKit);
            setToast({ msg: "Brand identity generated! Review and save.", type: "success" });
            setShowMagicModal(false);
        } catch (e) {
            console.error(e);
            setToast({ msg: "Generation failed.", type: "error" });
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
                
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
                    isLimitReached 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-white border-gray-200 text-gray-600'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-xs font-bold uppercase tracking-wide">
                        Brands: {usage} / {limit}
                    </span>
                </div>
            </div>

            <div className={BrandKitManagerStyles.brandGrid}>
                <button 
                    onClick={handleAddNewBrand}
                    className={`${BrandKitManagerStyles.addCard} ${isLimitReached ? 'opacity-90 cursor-default hover:shadow-none bg-gray-50' : ''}`}
                >
                    {isLimitReached ? (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-3 text-red-500">
                                <LockIcon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Limit Reached</span>
                            <span className="text-[10px] text-gray-500 mt-1 max-w-[150px] leading-tight mb-3">
                                You've used all {limit} brand slots.
                            </span>
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigateTo('dashboard', 'billing');
                                }}
                                className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#dfbc2b] transition-all shadow-md hover:scale-105"
                            >
                                Upgrade Plan
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className={BrandKitManagerStyles.addCardIcon}>
                                <PlusIcon className="w-8 h-8" />
                            </div>
                            <span className={BrandKitManagerStyles.addCardText}>Create New Brand</span>
                        </>
                    )}
                </button>
                
                {isLoadingBrands ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                             <div className="h-32 bg-gray-100"></div>
                             <div className="p-5 flex-1 flex flex-col justify-between">
                                 <div>
                                    <div className="h-5 w-3/4 bg-gray-100 rounded mb-2"></div>
                                    <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                                 </div>
                                 <div className="flex gap-2 mt-4">
                                     <div className="w-6 h-6 rounded-full bg-gray-100"></div>
                                     <div className="w-6 h-6 rounded-full bg-gray-100"></div>
                                     <div className="w-6 h-6 rounded-full bg-gray-100"></div>
                                 </div>
                             </div>
                        </div>
                    ))
                ) : (
                    brands.map((brand, idx) => (
                        <div 
                            key={brand.id || idx} 
                            onClick={() => handleSelectBrand(brand)}
                            className={BrandKitManagerStyles.brandCard}
                        >
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (
                                    <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" />
                                ) : (
                                    <span className={BrandKitManagerStyles.brandCardFallback}>
                                        {(brand.name || brand.companyName || '?').substring(0, 2)}
                                    </span>
                                )}
                                
                                {brand.id && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand.id!); }}
                                        className={BrandKitManagerStyles.deleteBtn}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div>
                                    <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.name || brand.companyName || 'Untitled Brand'}</h3>
                                    <p className={BrandKitManagerStyles.brandCardMeta}>{brand.toneOfVoice || 'Professional'} • {brand.website ? 'Web Linked' : 'No URL'}</p>
                                </div>
                                
                                <div className={BrandKitManagerStyles.brandCardPalette}>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.primary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.secondary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.accent }}></div>
                                </div>
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
                    <button onClick={handleBackToList} className={BrandKitManagerStyles.backBtn}>
                        <ArrowLeftIcon className="w-3 h-3" /> Back to Brands
                    </button>
                    <input 
                        type="text" 
                        value={kit.name || ''}
                        onChange={(e) => handleTextChange('name', e.target.value)}
                        placeholder="Brand Name"
                        className={BrandKitManagerStyles.brandNameInput}
                    />
                </div>

                <div className={BrandKitManagerStyles.actionGroup}>
                    {isSaving ? (
                        <div className={BrandKitManagerStyles.savingBadge}>
                            <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                        </div>
                    ) : lastSaved ? (
                        <div className={BrandKitManagerStyles.savedBadge}>
                            <CheckIcon className="w-4 h-4" /> Saved
                        </div>
                    ) : null}

                    <button onClick={() => setShowMagicModal(true)} className={BrandKitManagerStyles.magicBtn}>
                        Auto-Fill with AI
                    </button>
                    
                    <button onClick={handleSave} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>
                        Save Changes
                    </button>
                </div>
            </div>

            {/* NEW: TABS NAVIGATION */}
            <div className="flex gap-4 mb-6 border-b border-gray-100 pb-1">
                <button 
                    onClick={() => setDetailTab('identity')} 
                    className={`pb-3 px-2 text-sm font-bold transition-all ${detailTab === 'identity' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Brand Identity
                </button>
                <button 
                    onClick={() => setDetailTab('competitor')} 
                    className={`pb-3 px-2 text-sm font-bold transition-all flex items-center gap-2 ${detailTab === 'competitor' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ChartBarIcon className="w-4 h-4" /> Competitor Intel
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LEFT COLUMN: EDITING AREA (2/3 Width) */}
                <div className="xl:col-span-2 space-y-8">
                    
                    {/* --- TAB CONTENT: BRAND IDENTITY (EXISTING) --- */}
                    {detailTab === 'identity' && (
                        <>
                            {/* 1. Identity Assets Card */}
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-blue-100 text-blue-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                        <ShieldCheckIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className={BrandKitManagerStyles.cardTitle}>Identity Assets</h2>
                                        <p className={BrandKitManagerStyles.cardDesc}>We'll auto-remove backgrounds for you.</p>
                                    </div>
                                </div>
                                
                                <div className={`grid grid-cols-1 gap-6 ${BrandKitManagerStyles.cardContent}`}>
                                    <AssetUploader 
                                        label="Main Logo" 
                                        subLabel="Auto-Processed"
                                        currentUrl={kit.logos.primary} 
                                        onUpload={(f) => handleUpload('primary', f)} 
                                        onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: null } }))}
                                        isLoading={uploadingState['primary']}
                                        isProcessing={processingState['primary']}
                                    />
                                </div>
                            </div>

                            {/* 2. Visual DNA Card (Colors & Fonts) */}
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-purple-100 text-purple-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                        <PaletteIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className={BrandKitManagerStyles.cardTitle}>Visual DNA</h2>
                                        <p className={BrandKitManagerStyles.cardDesc}>Colors and typography.</p>
                                    </div>
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${BrandKitManagerStyles.cardContent}`}>
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Color Palette
                                        </h3>
                                        <div className="space-y-4">
                                            <ColorInput 
                                                label="Primary (Brand Color)" 
                                                value={kit.colors.primary} 
                                                onChange={(v) => updateDeepLocal('colors', 'primary', v)}
                                                onBlur={() => {}}
                                            />
                                            <ColorInput 
                                                label="Secondary (Backgrounds)" 
                                                value={kit.colors.secondary} 
                                                onChange={(v) => updateDeepLocal('colors', 'secondary', v)} 
                                                onBlur={() => {}}
                                            />
                                            <ColorInput 
                                                label="Accent (CTAs / Highlights)" 
                                                value={kit.colors.accent} 
                                                onChange={(v) => updateDeepLocal('colors', 'accent', v)} 
                                                onBlur={() => {}}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Typography
                                        </h3>
                                        <div className="space-y-5">
                                            <div>
                                                <label className={BrandKitManagerStyles.inputLabel}>Heading Style</label>
                                                <select 
                                                    value={kit.fonts.heading}
                                                    onChange={(e) => updateDeepImmediate('fonts', 'heading', e.target.value)}
                                                    className={BrandKitManagerStyles.selectField}
                                                >
                                                    <option>Modern Sans (Clean)</option>
                                                    <option>Classic Serif (Luxury)</option>
                                                    <option>Bold Display (Impact)</option>
                                                    <option>Elegant Script (Soft)</option>
                                                    <option>Minimal Mono (Tech)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={BrandKitManagerStyles.inputLabel}>Body Text Style</label>
                                                <select 
                                                    value={kit.fonts.body}
                                                    onChange={(e) => updateDeepImmediate('fonts', 'body', e.target.value)}
                                                    className={BrandKitManagerStyles.selectField}
                                                >
                                                    <option>Clean Sans (Readable)</option>
                                                    <option>Readable Serif (Traditional)</option>
                                                    <option>System Default (Neutral)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Product Catalog (NEW) */}
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-orange-100 text-orange-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                        <CubeIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className={BrandKitManagerStyles.cardTitle}>Product Catalog</h2>
                                        <p className={BrandKitManagerStyles.cardDesc}>Upload core products once, use everywhere.</p>
                                    </div>
                                    <button 
                                        onClick={() => productInputRef.current?.click()}
                                        disabled={uploadingState['products']}
                                        className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                                    >
                                        {uploadingState['products'] ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> Add Product</>}
                                    </button>
                                    <input ref={productInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} />
                                </div>
                                <div className={`${BrandKitManagerStyles.cardContent}`}>
                                    {(!kit.products || kit.products.length === 0) ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400 font-medium">No products added yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {kit.products.map(product => (
                                                <ProductItem 
                                                    key={product.id} 
                                                    item={product} 
                                                    onDelete={() => deleteProduct(product.id)}
                                                    onNameChange={(name) => updateProductName(product.id, name)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 4. Mood Board (NEW) */}
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-pink-100 text-pink-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                        <LightbulbIcon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className={BrandKitManagerStyles.cardTitle}>Mood Board</h2>
                                        <p className={BrandKitManagerStyles.cardDesc}>Upload inspiration for AI style matching.</p>
                                    </div>
                                    <button 
                                        onClick={() => moodInputRef.current?.click()}
                                        disabled={uploadingState['mood']}
                                        className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors flex items-center gap-1.5"
                                    >
                                        {uploadingState['mood'] ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> Add Image</>}
                                    </button>
                                    <input ref={moodInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} />
                                </div>
                                <div className={`${BrandKitManagerStyles.cardContent}`}>
                                    {(!kit.moodBoard || kit.moodBoard.length === 0) ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400 font-medium">No inspiration images added.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                            {kit.moodBoard.map(item => (
                                                <MoodItem 
                                                    key={item.id} 
                                                    item={item} 
                                                    onDelete={() => deleteMoodItem(item.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Brand Strategy (Expanded) */}
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`bg-green-100 text-green-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                        <CaptionIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className={BrandKitManagerStyles.cardTitle}>Brand Strategy</h2>
                                        <p className={BrandKitManagerStyles.cardDesc}>Defining your voice and audience.</p>
                                    </div>
                                </div>

                                <div className={`space-y-5 ${BrandKitManagerStyles.cardContent}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={BrandKitManagerStyles.inputLabel}>Company Legal Name</label>
                                            <input 
                                                type="text" 
                                                value={kit.companyName}
                                                onChange={(e) => handleTextChange('companyName', e.target.value)}
                                                placeholder="e.g. Skyline Realty LLC"
                                                className={BrandKitManagerStyles.inputField}
                                            />
                                        </div>
                                        <div>
                                            <label className={BrandKitManagerStyles.inputLabel}>Website</label>
                                            <input 
                                                type="text" 
                                                value={kit.website}
                                                onChange={(e) => handleTextChange('website', e.target.value)}
                                                placeholder="e.g. www.skyline.com"
                                                className={BrandKitManagerStyles.inputField}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label>
                                            <select 
                                                value={kit.toneOfVoice}
                                                onChange={(e) => handleSelectChange('toneOfVoice', e.target.value)}
                                                className={BrandKitManagerStyles.selectField}
                                            >
                                                <option>Professional</option>
                                                <option>Luxury</option>
                                                <option>Playful</option>
                                                <option>Urgent / Sales</option>
                                                <option>Friendly / Casual</option>
                                                <option>Technical</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={BrandKitManagerStyles.inputLabel}>Target Audience</label>
                                            <input 
                                                type="text" 
                                                value={kit.targetAudience || ''}
                                                onChange={(e) => handleTextChange('targetAudience', e.target.value)}
                                                placeholder="e.g. Tech-savvy millennials"
                                                className={BrandKitManagerStyles.inputField}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={BrandKitManagerStyles.inputLabel}>Negative Prompts (What to Avoid)</label>
                                        <input 
                                            type="text" 
                                            value={kit.negativePrompts || ''}
                                            onChange={(e) => handleTextChange('negativePrompts', e.target.value)}
                                            placeholder="e.g. No cartoons, no neon colors, no clutter"
                                            className={BrandKitManagerStyles.inputField}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* --- TAB CONTENT: COMPETITOR INTELLIGENCE (REVAMPED 2.0) --- */}
                    {detailTab === 'competitor' && (
                        <div className="animate-fadeIn space-y-8">
                            {/* Dashboard Header */}
                            <div className={BrandKitManagerStyles.intelHeader}>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Competitor Intel</h2>
                                    <p className="text-sm text-gray-500 font-medium">Map their strategy to find your winning angle.</p>
                                </div>
                                <div className={BrandKitManagerStyles.intelBadge}>
                                    Strategic Analysis Active
                                </div>
                            </div>

                            <div className={BrandKitManagerStyles.intelGrid}>
                                {/* LEFT: DATA GATHERING */}
                                <div className={BrandKitManagerStyles.intelInputArea}>
                                    
                                    {/* STEP 1: Rival Website */}
                                    <div className={BrandKitManagerStyles.intelStep}>
                                        <div className={BrandKitManagerStyles.intelStepNumber}>1</div>
                                        <div className={BrandKitManagerStyles.intelStepContent}>
                                            <h3 className={BrandKitManagerStyles.intelStepTitle}>Define Rival</h3>
                                            <p className={BrandKitManagerStyles.intelStepDesc}>Which brand are we benchmarking against?</p>
                                            <div className="mt-4 flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-gray-200 shadow-sm focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-500 transition-all">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                                    <GlobeIcon className="w-5 h-5" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    placeholder="e.g. www.competitor.com"
                                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-800 placeholder-gray-400"
                                                    value={kit.competitor?.website || ''}
                                                    onChange={(e) => setKit(prev => ({ 
                                                        ...prev, 
                                                        competitor: { 
                                                            ...prev.competitor || { adScreenshots: [] }, 
                                                            website: e.target.value 
                                                        } 
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* STEP 2: Ad Content */}
                                    <div className={BrandKitManagerStyles.intelStep}>
                                        <div className={BrandKitManagerStyles.intelStepNumber}>2</div>
                                        <div className={BrandKitManagerStyles.intelStepContent}>
                                            <h3 className={BrandKitManagerStyles.intelStepTitle}>Capture Content</h3>
                                            <p className={BrandKitManagerStyles.intelStepDesc}>Upload screenshots of their ads or social posts.</p>
                                            
                                            <div className="mt-4">
                                                <div className={BrandKitManagerStyles.intelGallery}>
                                                    {kit.competitor?.adScreenshots?.map(ad => (
                                                        <div key={ad.id} className={BrandKitManagerStyles.intelGalleryImg}>
                                                            <img src={ad.imageUrl} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center backdrop-blur-[1px]">
                                                                <button 
                                                                    onClick={() => deleteCompetitorAd(ad.id)}
                                                                    className="p-2 bg-white text-red-500 rounded-xl shadow-lg hover:scale-110 transition-transform"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    
                                                    {(!kit.competitor?.adScreenshots || kit.competitor.adScreenshots.length < 6) && (
                                                        <button 
                                                            onClick={() => competitorAdRef.current?.click()}
                                                            disabled={uploadingState['competitor']}
                                                            className={BrandKitManagerStyles.intelGalleryAdd}
                                                        >
                                                            {uploadingState['competitor'] ? (
                                                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                            ) : (
                                                                <>
                                                                    <PlusIcon className="w-6 h-6 text-gray-400 mb-1" />
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Add Screenshot</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                <input ref={competitorAdRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompetitorAdUpload} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-4">
                                        <button 
                                            onClick={runCompetitorAnalysis}
                                            disabled={isAnalyzingCompetitor || !kit.competitor?.website || kit.competitor.adScreenshots.length === 0}
                                            className="w-full py-4 bg-[#1A1A1E] hover:bg-black text-white rounded-2xl font-black text-sm shadow-2xl shadow-indigo-500/10 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale disabled:transform-none"
                                        >
                                            {isAnalyzingCompetitor ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Extracting Rival Strategy...
                                                </>
                                            ) : (
                                                <>
                                                    <LightningIcon className="w-5 h-5 text-indigo-400" />
                                                    Analyze & Outsmart
                                                </>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-gray-400 font-bold text-center mt-4 uppercase tracking-[0.1em]">
                                            AI-Powered Forensic Audit (Gemini 3 Pro)
                                        </p>
                                    </div>
                                </div>

                                {/* RIGHT: STRATEGIC REPORT */}
                                <div className={BrandKitManagerStyles.intelResultArea}>
                                    {kit.competitor?.analysis ? (
                                        <div className="p-8 space-y-6 flex-1 flex flex-col overflow-y-auto">
                                            <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                                        <DocumentTextIcon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-gray-900 uppercase tracking-tight">Strategic Blueprint</h3>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Updated {new Date(kit.competitor.analysis.lastUpdated).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                   onClick={() => setKit(prev => ({ ...prev, competitor: { ...prev.competitor!, analysis: undefined } }))}
                                                   className="text-[10px] font-black text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors uppercase tracking-widest"
                                                >
                                                    Clear Report
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 gap-6">
                                                {/* Card 1: Their Strategy */}
                                                <div className={`${BrandKitManagerStyles.intelInsightCard} bg-gray-50/50 border-gray-100`}>
                                                    <div className={`${BrandKitManagerStyles.intelInsightTitle} text-gray-400`}>
                                                        <EyeIcon className="w-3.5 h-3.5" /> Their Current Playbook
                                                    </div>
                                                    <p className={BrandKitManagerStyles.intelInsightText}>{kit.competitor.analysis.theirStrategy}</p>
                                                </div>

                                                {/* Card 2: Your Winning Angle */}
                                                <div className={`${BrandKitManagerStyles.intelInsightCard} bg-indigo-50/50 border-indigo-100 relative overflow-hidden`}>
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500 opacity-[0.03] rounded-bl-full -mr-4 -mt-4"></div>
                                                    <div className={`${BrandKitManagerStyles.intelInsightTitle} text-indigo-600`}>
                                                        <LightningIcon className="w-3.5 h-3.5" /> Your Winning Angle
                                                    </div>
                                                    <p className="text-sm font-black text-indigo-900 leading-relaxed italic">
                                                        "{kit.competitor.analysis.winningAngle}"
                                                    </p>
                                                </div>

                                                {/* Card 3: Visual Gap */}
                                                <div className={`${BrandKitManagerStyles.intelInsightCard} bg-white border-gray-100 shadow-sm`}>
                                                    <div className={`${BrandKitManagerStyles.intelInsightTitle} text-amber-600`}>
                                                        <LightbulbIcon className="w-3.5 h-3.5" /> Aesthetic Opportunity
                                                    </div>
                                                    <p className={BrandKitManagerStyles.intelInsightText}>{kit.competitor.analysis.visualGap}</p>
                                                </div>

                                                {/* Card 4: Avoid Tags */}
                                                <div className={`${BrandKitManagerStyles.intelInsightCard} bg-rose-50 border-rose-100`}>
                                                    <div className={`${BrandKitManagerStyles.intelInsightTitle} text-rose-600`}>
                                                        <XIcon className="w-3.5 h-3.5" /> Differentiation Rules (Avoid)
                                                    </div>
                                                    <p className="text-xs text-rose-800 font-mono mb-4 leading-relaxed">
                                                        {kit.competitor.analysis.avoidTags}
                                                    </p>
                                                    <button 
                                                        onClick={applyNegativePrompts}
                                                        className="w-full py-3 bg-white text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border border-rose-200 hover:bg-rose-100 transition-all shadow-sm active:scale-95"
                                                    >
                                                        Apply to Negative Prompts
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 animate-pixa-float">
                                                <ChartBarIcon className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Intelligence Pending</h3>
                                            <p className="text-sm text-gray-400 mt-2 max-w-[280px] leading-relaxed font-medium">
                                                Add a competitor website and at least one screenshot to unlock your strategic report.
                                            </p>
                                            
                                            <div className="mt-10 grid grid-cols-1 gap-4 w-full max-w-sm">
                                                <div className="flex items-center gap-3 text-left bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                                                    <p className="text-[10px] font-bold text-gray-500 leading-tight">Gemini analyzes rival visuals to find holes in their branding.</p>
                                                </div>
                                                <div className="flex items-center gap-3 text-left bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                    <div className="w-6 h-6 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">?</div>
                                                    <p className="text-[10px] font-bold text-gray-500 leading-tight">We look for color gaps and emotional voids in their ads.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Interactive Scan Effect during analysis */}
                                    {isAnalyzingCompetitor && (
                                        <div className="absolute inset-0 z-50 bg-white/40 backdrop-blur-md flex flex-col items-center justify-center">
                                            <div className="relative">
                                                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white animate-pulse">
                                                        <LightningIcon className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mt-8 animate-pulse">Scanning Rival DNA...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: PREVIEW (Sticky) */}
                <div className="space-y-8">
                    {/* LIVE PREVIEW CARD */}
                    <div className="sticky top-28">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</h3>
                        </div>
                        <div className={BrandKitManagerStyles.previewCard}>
                            <div className={BrandKitManagerStyles.previewInner}>
                                <div className={BrandKitManagerStyles.previewHeader}>
                                    <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Brand Card</h3>
                                    <div className={BrandKitManagerStyles.previewTag}>{kit.toneOfVoice}</div>
                                </div>

                                {/* Logo Area */}
                                <div className="mb-8 pb-6 border-b border-white/10">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Light Theme Context */}
                                        <div className={`bg-white ${BrandKitManagerStyles.previewLogoBox}`}>
                                            <span className="absolute top-2 left-3 text-[9px] font-bold text-gray-300 uppercase tracking-wider">On Light</span>
                                            {kit.logos.primary ? (
                                                <img src={kit.logos.primary} className="w-full h-full object-contain" alt="Primary Logo" />
                                            ) : (
                                                <div className="text-gray-200 text-center">
                                                    <span className="text-[9px] font-bold uppercase block mt-1">No Logo</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dark Theme Context */}
                                        <div className={`bg-[#121212] border border-white/10 ${BrandKitManagerStyles.previewLogoBox}`}>
                                            <span className="absolute top-2 left-3 text-[9px] font-bold text-gray-600 uppercase tracking-wider">On Dark</span>
                                            {kit.logos.primary ? (
                                                <img src={kit.logos.primary} className="w-full h-full object-contain brightness-0 invert" alt="Logo White" />
                                            ) : (
                                                <div className="text-gray-800 text-center">
                                                    <span className="text-[9px] font-bold uppercase block mt-1">No Logo</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Typography Preview */}
                                <div className="space-y-3 mb-8">
                                    <h2 className="text-3xl font-bold leading-tight" style={{ 
                                        fontFamily: kit.fonts.heading.includes('Serif') ? 'serif' : 'sans-serif' 
                                    }}>
                                        {kit.companyName || "Your Company Name"}
                                    </h2>
                                    <p className="text-sm opacity-70" style={{ 
                                        fontFamily: kit.fonts.body.includes('Serif') ? 'serif' : 'sans-serif' 
                                    }}>
                                        Building the future of {kit.website || "your brand"}.
                                    </p>
                                    {kit.targetAudience && (
                                        <p className={BrandKitManagerStyles.previewTag}>Target: {kit.targetAudience}</p>
                                    )}
                                </div>

                                {/* Color Palette Swatches */}
                                <div className="flex gap-2">
                                    <div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.primary }}></div>
                                    <div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.secondary }}></div>
                                    <div className="h-3 flex-1 rounded-full" style={{ background: kit.colors.accent }}></div>
                                </div>
                                <div className="flex justify-between text-[9px] text-white/40 mt-2 font-mono uppercase">
                                    <span>Primary</span>
                                    <span>Secondary</span>
                                    <span>Accent</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showMagicModal && (
                <MagicSetupModal 
                    onClose={() => setShowMagicModal(false)} 
                    onGenerate={handleMagicGenerate}
                    isGenerating={isMagicGen}
                />
            )}
        </div>
    );

    return (
        <>
            {viewMode === 'list' ? renderBrandList() : renderBrandDetail()}
            
            {toast && (
                <ToastNotification 
                    message={toast.msg} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </>
    );
};