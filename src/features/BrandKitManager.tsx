
import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, Page, View, BrandKit, IndustryType } from '../types';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';
import { 
    BrandKitIcon, PlusIcon, XIcon, GlobeIcon, ArrowRightIcon, 
    TrashIcon, CheckIcon, CloudUploadIcon, PaletteIcon, 
    PencilIcon, LightbulbIcon, MagicWandIcon, ArrowLeftIcon 
} from '../components/icons';
import { generateBrandIdentity, processLogoAsset } from '../services/brandKitService';
import { getUserBrands, saveUserBrandKit, deleteBrandFromCollection, uploadBrandAsset } from '../firebase';
import { fileToBase64 } from '../utils/imageUtils';

interface BrandKitManagerProps {
    auth: AuthProps;
    navigateTo: (page: Page, view?: View) => void;
}

const TOTAL_STEPS = 4;

const isValidUrl = (urlString: string) => {
    try { 
        return Boolean(new URL(urlString)); 
    }
    catch(e){ 
        return false; 
    }
};

const getIndustryConfig = (type: IndustryType) => {
    switch (type) {
        case 'fashion': return { itemLabel: 'Look/Item', icon: '👕' };
        case 'realty': return { itemLabel: 'Property', icon: '🏠' };
        case 'food': return { itemLabel: 'Dish', icon: '🍔' };
        default: return { itemLabel: 'Product', icon: '📦' };
    }
};

const EMPTY_KIT: BrandKit = {
    companyName: '',
    industry: 'physical',
    website: '',
    toneOfVoice: 'Professional',
    targetAudience: '',
    negativePrompts: '',
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
    fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
    logos: { primary: null, secondary: null, mark: null },
    products: [],
    moodBoard: [],
    competitor: { website: '', adScreenshots: [], analysis: undefined }
};

export const BrandKitManager: React.FC<BrandKitManagerProps> = ({ auth, navigateTo }) => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Editor State
    const [kit, setKit] = useState<BrandKit>(EMPTY_KIT);
    const [step, setStep] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [magicUrl, setMagicUrl] = useState('');
    const [magicDesc, setMagicDesc] = useState('');
    const [uploadingState, setUploadingState] = useState<Record<string, number>>({});

    const userId = auth.user?.uid;

    useEffect(() => {
        if (userId) {
            loadBrands();
        }
    }, [userId]);

    const loadBrands = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const data = await getUserBrands(userId);
            setBrands(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setKit(EMPTY_KIT);
        setStep(0);
        setMagicUrl('');
        setMagicDesc('');
        setView('editor');
    };

    const handleEdit = (brand: BrandKit) => {
        setKit(brand);
        setStep(1); // Skip setup, go to identity
        setMagicUrl(brand.website || '');
        setView('editor');
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!userId || !confirm("Delete this Brand Kit?")) return;
        await deleteBrandFromCollection(userId, id);
        setBrands(prev => prev.filter(b => b.id !== id));
    };

    const handleSave = async (finalKit: BrandKit) => {
        if (!userId) return;
        try {
            await saveUserBrandKit(userId, finalKit);
            await loadBrands();
            setView('list');
        } catch (e) {
            console.error(e);
            alert("Failed to save Brand Kit");
        }
    };

    if (view === 'list') {
        return (
            <div className={BrandKitManagerStyles.container}>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className={BrandKitManagerStyles.sectionTitle}>Brand Kits</h1>
                        <p className={BrandKitManagerStyles.sectionSubtitle}>Manage your brand identities and assets.</p>
                    </div>
                </div>

                <div className={BrandKitManagerStyles.brandGrid}>
                    <button onClick={handleCreateNew} className={BrandKitManagerStyles.addCard}>
                        <div className={BrandKitManagerStyles.addCardIcon}><PlusIcon className="w-8 h-8"/></div>
                        <span className={BrandKitManagerStyles.addCardText}>Create New Brand</span>
                    </button>

                    {loading ? (
                         <div className="h-64 flex items-center justify-center text-gray-400">Loading brands...</div>
                    ) : brands.map(brand => (
                        <div key={brand.id} className={BrandKitManagerStyles.brandCard} onClick={() => handleEdit(brand)}>
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (
                                    <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo"/>
                                ) : (
                                    <span className={BrandKitManagerStyles.brandCardFallback}>{brand.companyName?.substring(0,2) || '??'}</span>
                                )}
                            </div>
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div>
                                    <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.companyName || 'Untitled Brand'}</h3>
                                    <p className={BrandKitManagerStyles.brandCardMeta}>{brand.products?.length || 0} Products • {brand.industry}</p>
                                </div>
                                <div className={BrandKitManagerStyles.brandCardPalette}>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.primary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.secondary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.accent }}></div>
                                </div>
                            </div>
                            {brand.id && (
                                <button onClick={(e) => handleDelete(e, brand.id!)} className={BrandKitManagerStyles.deleteBtn}>
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <BrandEditor 
            kit={kit} 
            setKit={setKit} 
            step={step} 
            setStep={setStep} 
            onClose={() => setView('list')} 
            onComplete={handleSave}
            userId={userId || ''}
            magicUrl={magicUrl}
            setMagicUrl={setMagicUrl}
            magicDesc={magicDesc}
            setMagicDesc={setMagicDesc}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            uploadingState={uploadingState}
            setUploadingState={setUploadingState}
        />
    );
};

// --- BrandEditor Component ---

interface BrandEditorProps {
    kit: BrandKit;
    setKit: React.Dispatch<React.SetStateAction<BrandKit>>;
    step: number;
    setStep: (step: number) => void;
    onClose: () => void;
    onComplete: (kit: BrandKit) => Promise<void>;
    userId: string;
    magicUrl: string;
    setMagicUrl: (url: string) => void;
    magicDesc: string;
    setMagicDesc: (desc: string) => void;
    isGenerating: boolean;
    setIsGenerating: (v: boolean) => void;
    isSaving: boolean;
    setIsSaving: (v: boolean) => void;
    uploadingState: Record<string, number>;
    setUploadingState: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const BrandEditor: React.FC<BrandEditorProps> = ({ 
    kit, setKit, step, setStep, onClose, onComplete, userId, 
    magicUrl, setMagicUrl, magicDesc, setMagicDesc, 
    isGenerating, setIsGenerating, isSaving, setIsSaving, 
    uploadingState, setUploadingState 
}) => {
    
    const industryConf = getIndustryConfig(kit.industry || 'physical');
    
    const isStepValid = () => {
        if (step === 1) return !!kit.companyName && !!kit.industry;
        if (step === 2) return !!kit.colors.primary;
        return true;
    };

    const handleMagicGenerate = async () => {
        if (!magicUrl) {
            alert("Website URL is required for Auto-fill.");
            return;
        }
        if (!isValidUrl(magicUrl)) {
            alert("Please enter a valid website URL (e.g. www.yourbrand.com)");
            return;
        }
        setIsGenerating(true);
        try {
            const generated = await generateBrandIdentity(magicUrl, magicDesc);
            setKit(prev => ({ ...prev, ...generated }));
            // Skip to Step 4 (Visuals) to allow refinement if needed, but here we just populate
            setStep(1); 
        } catch (e) {
            console.error(e);
            alert("Auto-generation failed. Please try manual mode.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS && isStepValid()) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };
    
    const handleSkip = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
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
            case 0: // SETUP CARD (AI + Manual Option)
                return (
                    <div className="h-full flex flex-col items-center justify-center p-8 relative">
                        {/* Close button for Step 0 (Hero) */}
                        <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white/80 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-all shadow-sm z-50 backdrop-blur-sm">
                            <XIcon className="w-6 h-6" />
                        </button>

                        <div className="w-full max-w-lg text-center animate-fadeInUp relative z-10">
                            {/* Brand Kit Icon */}
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                                <BrandKitIcon className="w-10 h-10 text-indigo-600" />
                            </div>
                            
                            {/* Headings */}
                            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3 tracking-tight">Setup Your Brand Kit</h1>
                            <p className="text-gray-500 mb-10 text-sm md:text-base leading-relaxed max-w-md mx-auto">
                                Auto-fill with <span className="text-indigo-600 font-bold">Pixa AI</span>. Our agents will scan your website and build your visual identity instantly.
                            </p>

                            {/* Main Input Card */}
                            <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100 relative z-20">
                                <div className="space-y-5 text-left">
                                    <div className="group">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">Website URL (Required)</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-4 text-gray-400">
                                                <GlobeIcon className="w-5 h-5"/>
                                            </div>
                                            <input 
                                                className={`w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-900 focus:ring-4 outline-none transition-all placeholder-gray-400 ${
                                                    magicUrl && !isValidUrl(magicUrl) 
                                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100' 
                                                    : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                                                }`}
                                                placeholder="e.g. www.yourbrand.com"
                                                value={magicUrl}
                                                onChange={e => setMagicUrl(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        {magicUrl && !isValidUrl(magicUrl) && (
                                            <p className="text-xs text-red-500 mt-2 font-medium ml-1 flex items-center gap-1"><XIcon className="w-3 h-3"/> Please enter a valid URL (e.g. example.com)</p>
                                        )}
                                    </div>
                                    
                                    <div className="group">
                                         <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">About the Brand (Optional)</label>
                                         <textarea 
                                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-gray-400 resize-none h-24 leading-relaxed"
                                            placeholder="Describe your products, vibe, and audience..."
                                            value={magicDesc}
                                            onChange={e => setMagicDesc(e.target.value)}
                                        />
                                    </div>

                                    <button 
                                        onClick={handleMagicGenerate}
                                        disabled={isGenerating || !magicUrl || !isValidUrl(magicUrl)}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-bold hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-2 transition-all shadow-lg"
                                    >
                                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Generate Identity"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Manual Toggle - Bottom Right */}
                        <button 
                            onClick={() => setStep(1)}
                            className="absolute bottom-8 right-8 z-30 bg-white border border-gray-200 hover:border-gray-400 hover:shadow-lg text-gray-600 hover:text-black px-6 py-3 rounded-full text-xs font-bold transition-all flex items-center gap-3 group"
                        >
                            Or Build from Scratch
                            <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-black group-hover:text-white flex items-center justify-center transition-colors">
                                <ArrowRightIcon className="w-3 h-3" />
                            </div>
                        </button>
                    </div>
                );
            case 1: // IDENTITY
                return (
                    <div className={BrandKitManagerStyles.cardContent}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className={BrandKitManagerStyles.inputLabel}>
                                <label className={BrandKitManagerStyles.inputLabel}>Brand Name</label>
                                <input value={kit.companyName} onChange={e => setKit({...kit, companyName: e.target.value})} className={BrandKitManagerStyles.inputField} placeholder="e.g. Nike" />
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website</label>
                                <input value={kit.website} onChange={e => setKit({...kit, website: e.target.value})} className={BrandKitManagerStyles.inputField} placeholder="e.g. nike.com" />
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className={BrandKitManagerStyles.inputLabel}>Business Category</label>
                            <div className={BrandKitManagerStyles.industryGrid}>
                                {[
                                    { id: 'physical', label: 'Physical Goods', sub: 'E-commerce / Retail', icon: '📦' },
                                    { id: 'digital', label: 'Digital / SaaS', sub: 'Software / Apps', icon: '💻' },
                                    { id: 'realty', label: 'Real Estate', sub: 'Property / Interior', icon: '🏠' },
                                    { id: 'fashion', label: 'Fashion', sub: 'Apparel / Style', icon: '👕' },
                                    { id: 'service', label: 'Service / Personal', sub: 'Agency / Creator', icon: '🤝' },
                                ].map((ind) => (
                                    <button 
                                        key={ind.id}
                                        onClick={() => setKit({...kit, industry: ind.id as any})}
                                        className={`${BrandKitManagerStyles.industryCard} ${kit.industry === ind.id ? BrandKitManagerStyles.industryCardSelected : BrandKitManagerStyles.industryCardInactive}`}
                                    >
                                        <div className={`${BrandKitManagerStyles.industryIconBox} ${kit.industry === ind.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                                            <span className="text-lg">{ind.icon}</span>
                                        </div>
                                        <div>
                                            <p className={BrandKitManagerStyles.industryLabel}>{ind.label}</p>
                                            <p className={BrandKitManagerStyles.industrySub}>{ind.sub}</p>
                                        </div>
                                        {kit.industry === ind.id && <div className={BrandKitManagerStyles.industryCheck}><CheckIcon className="w-3 h-3 text-white"/></div>}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label>
                                <select value={kit.toneOfVoice} onChange={e => setKit({...kit, toneOfVoice: e.target.value})} className={BrandKitManagerStyles.selectField}>
                                    {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Target Audience</label>
                                <input value={kit.targetAudience} onChange={e => setKit({...kit, targetAudience: e.target.value})} className={BrandKitManagerStyles.inputField} placeholder="e.g. Startups, Moms" />
                            </div>
                        </div>
                    </div>
                );
            case 2: // VISUALS
                return (
                    <div className={BrandKitManagerStyles.cardContent}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Left: Uploader */}
                            <div className={BrandKitManagerStyles.uploaderContainer}>
                                <div className={BrandKitManagerStyles.uploaderHeader}>
                                    <label className={BrandKitManagerStyles.uploaderLabel}>Primary Logo</label>
                                    <span className={BrandKitManagerStyles.uploaderSubLabel}>PNG (Transparent) Recommended</span>
                                </div>
                                <div className={`${BrandKitManagerStyles.uploaderBox} ${kit.logos.primary ? BrandKitManagerStyles.uploaderBoxFilled : BrandKitManagerStyles.uploaderBoxEmpty}`}>
                                    {kit.logos.primary ? (
                                        <img src={kit.logos.primary} className="max-w-[80%] max-h-[80%] object-contain" />
                                    ) : (
                                        <div className="text-center p-6" onClick={() => (document.getElementById('logo-upload') as HTMLInputElement)?.click()}>
                                            <CloudUploadIcon className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
                                            <p className="text-xs font-bold text-gray-500">Click to Upload Logo</p>
                                        </div>
                                    )}
                                    <input id="logo-upload" type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                                    {uploadingState['primary'] > 0 && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Right: Colors */}
                            <div className="space-y-6">
                                <label className={BrandKitManagerStyles.inputLabel}>Brand Colors</label>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className={BrandKitManagerStyles.colorInputWrapper}>
                                        <label className={BrandKitManagerStyles.colorLabel}>Primary (Brand)</label>
                                        <div className={BrandKitManagerStyles.colorBox}>
                                            <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: kit.colors.primary }}>
                                                <input type="color" value={kit.colors.primary} onChange={e => setKit({...kit, colors: {...kit.colors, primary: e.target.value}})} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <input type="text" value={kit.colors.primary} onChange={e => setKit({...kit, colors: {...kit.colors, primary: e.target.value}})} className={BrandKitManagerStyles.colorField} />
                                        </div>
                                    </div>
                                    <div className={BrandKitManagerStyles.colorInputWrapper}>
                                        <label className={BrandKitManagerStyles.colorLabel}>Secondary (Background)</label>
                                        <div className={BrandKitManagerStyles.colorBox}>
                                            <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: kit.colors.secondary }}>
                                                 <input type="color" value={kit.colors.secondary} onChange={e => setKit({...kit, colors: {...kit.colors, secondary: e.target.value}})} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <input type="text" value={kit.colors.secondary} onChange={e => setKit({...kit, colors: {...kit.colors, secondary: e.target.value}})} className={BrandKitManagerStyles.colorField} />
                                        </div>
                                    </div>
                                    <div className={BrandKitManagerStyles.colorInputWrapper}>
                                        <label className={BrandKitManagerStyles.colorLabel}>Accent (CTA/Highlight)</label>
                                        <div className={BrandKitManagerStyles.colorBox}>
                                            <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: kit.colors.accent }}>
                                                 <input type="color" value={kit.colors.accent} onChange={e => setKit({...kit, colors: {...kit.colors, accent: e.target.value}})} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <input type="text" value={kit.colors.accent} onChange={e => setKit({...kit, colors: {...kit.colors, accent: e.target.value}})} className={BrandKitManagerStyles.colorField} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Preview Card */}
                        <div className="mt-10">
                            <label className={BrandKitManagerStyles.inputLabel}>Live Preview</label>
                            <div className={BrandKitManagerStyles.previewCard}>
                                <div className={BrandKitManagerStyles.previewInner} style={{ backgroundColor: kit.colors.secondary }}>
                                    <div className={BrandKitManagerStyles.previewHeader}>
                                         {kit.logos.primary ? (
                                             <img src={kit.logos.primary} className="h-8 object-contain" />
                                         ) : (
                                             <span className="font-bold text-lg" style={{ color: kit.colors.primary }}>{kit.companyName}</span>
                                         )}
                                         <button className="px-4 py-2 rounded-lg text-xs font-bold shadow-sm" style={{ backgroundColor: kit.colors.accent, color: '#fff' }}>Shop Now</button>
                                    </div>
                                    <div className="h-40 rounded-xl bg-black/5 flex items-center justify-center border border-black/5 mb-4">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Product Image</span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2" style={{ color: kit.colors.primary }}>The New Collection</h3>
                                    <p className="text-sm opacity-60" style={{ color: kit.colors.primary }}>Experience the future of {kit.industry}. Premium quality designed for you.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3: // ASSETS
                return (
                    <div className={BrandKitManagerStyles.cardContent}>
                        <div className="space-y-10">
                            {/* Product Inventory */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><PaletteIcon className="w-4 h-4"/> {industryConf.itemLabel} Inventory</h4>
                                        <p className="text-xs text-gray-500 mt-1">Upload transparent PNGs for best results.</p>
                                    </div>
                                    <button onClick={() => wizardProductRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><PlusIcon className="w-3 h-3"/> Add {industryConf.itemLabel}</button>
                                </div>
                                
                                {(!kit.products || kit.products.length === 0) ? (
                                     <div onClick={() => wizardProductRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group">
                                         <CloudUploadIcon className="w-10 h-10 text-gray-300 group-hover:text-indigo-400 mb-2 transition-colors"/>
                                         <p className="text-xs font-bold text-gray-500 group-hover:text-indigo-600">Upload your {industryConf.itemLabel}s</p>
                                         <p className="text-[10px] text-gray-400 mt-1">Supports multiple files</p>
                                     </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {kit.products.map(p => (
                                            <div key={p.id} className="relative group aspect-square bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center p-2">
                                                <img src={p.imageUrl} className="max-w-full max-h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                                                    <button onClick={() => deleteProduct(p.id)} className="self-end bg-white p-1.5 rounded-full shadow-sm text-red-500 hover:bg-red-50"><TrashIcon className="w-3 h-3"/></button>
                                                    <input 
                                                        value={p.name} 
                                                        onChange={e => updateProductName(p.id, e.target.value)} 
                                                        onClick={e => e.stopPropagation()}
                                                        className="w-full text-[10px] font-bold text-center bg-white/90 rounded px-1 py-1 outline-none"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => wizardProductRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-gray-400 hover:text-indigo-500">
                                            <PlusIcon className="w-6 h-6 mb-1"/>
                                            <span className="text-[10px] font-bold">Add More</span>
                                        </button>
                                    </div>
                                )}
                                <input ref={wizardProductRef} type="file" multiple className="hidden" accept="image/*" onChange={handleProductUpload} />
                                {uploadingState['products'] > 0 && <p className="text-xs text-indigo-600 font-bold mt-2 animate-pulse">Uploading {uploadingState['products']} files...</p>}
                            </div>

                            {/* Mood Board */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><LightbulbIcon className="w-4 h-4"/> Aesthetic Mood Board</h4>
                                        <p className="text-xs text-gray-500 mt-1">Upload images that represent the brand vibe (e.g. lifestyle, textures).</p>
                                    </div>
                                    <button onClick={() => wizardMoodRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><PlusIcon className="w-3 h-3"/> Add Vibe</button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {kit.moodBoard?.map(m => (
                                        <div key={m.id} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden group">
                                            <img src={m.imageUrl} className="w-full h-full object-cover" />
                                            <button onClick={() => deleteMoodItem(m.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => wizardMoodRef.current?.click()} className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all">
                                        <PlusIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                                <input ref={wizardMoodRef} type="file" multiple className="hidden" accept="image/*" onChange={handleMoodUpload} />
                            </div>

                            {/* Competitor Analysis (Optional) */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2"><MagicWandIcon className="w-4 h-4"/> Competitor Intel</h4>
                                        <p className="text-xs text-gray-500 mt-1">Upload competitor ads to analyze their strategy.</p>
                                    </div>
                                    <button onClick={() => wizardCompRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"><PlusIcon className="w-3 h-3"/> Add Competitor Ad</button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {kit.competitor?.adScreenshots.map(m => (
                                        <div key={m.id} className="relative w-24 h-32 shrink-0 rounded-xl overflow-hidden group border border-gray-100">
                                            <img src={m.imageUrl} className="w-full h-full object-cover" />
                                            <button onClick={() => deleteCompItem(m.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-3 h-3"/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => wizardCompRef.current?.click()} className="w-24 h-32 shrink-0 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all">
                                        <PlusIcon className="w-6 h-6"/>
                                    </button>
                                </div>
                                <input ref={wizardCompRef} type="file" multiple className="hidden" accept="image/*" onChange={handleCompUpload} />
                            </div>
                        </div>
                    </div>
                );
            case 4: // COMPLETION / PREVIEW
                return (
                    <div className="text-center py-10">
                        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-green-100">
                            <CheckIcon className="w-12 h-12 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">All Set!</h2>
                        <p className="text-gray-500 max-w-md mx-auto mb-8">
                            Your Brand Kit <span className="font-bold text-gray-800">{kit.companyName}</span> is ready. 
                            Campaign Studio will use these assets to generate on-brand content.
                        </p>
                        
                        <div className="bg-gray-50 max-w-sm mx-auto rounded-2xl p-6 border border-gray-200 text-left mb-8">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-gray-200 pb-2">Summary</h4>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Identity</span><span className="font-bold text-gray-800">{kit.industry}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Colors</span><div className="flex gap-1"><div className="w-4 h-4 rounded-full" style={{background:kit.colors.primary}}></div><div className="w-4 h-4 rounded-full" style={{background:kit.colors.secondary}}></div><div className="w-4 h-4 rounded-full" style={{background:kit.colors.accent}}></div></div></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Assets</span><span className="font-bold text-gray-800">{kit.products?.length || 0} Products</span></div>
                            </div>
                        </div>

                        <button onClick={handleFinish} disabled={isSaving} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 mx-auto disabled:opacity-70">
                            {isSaving ? 'Saving...' : 'Finish Setup'}
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#F8FAFC] flex flex-col animate-fadeIn">
            {step === 0 ? (
                // Step 0: Full Screen Hero Setup
                renderStepContent()
            ) : (
                // Steps 1-4: Editor Layout
                <>
                    {/* Header */}
                    <div className={BrandKitManagerStyles.detailHeader}>
                        <div>
                            <button onClick={onClose} className={BrandKitManagerStyles.backBtn}><ArrowLeftIcon className="w-3 h-3"/> Exit</button>
                            <div className="flex items-center gap-2">
                                <input value={kit.name || kit.companyName} onChange={e => setKit({...kit, name: e.target.value})} className={BrandKitManagerStyles.brandNameInput} placeholder="Brand Name" />
                                <PencilIcon className="w-4 h-4 text-gray-300"/>
                            </div>
                        </div>
                        <div className={BrandKitManagerStyles.actionGroup}>
                            {step < 3 && <button onClick={handleSkip} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors px-4 py-2">Skip Step</button>}
                            <button onClick={step === 3 ? handleFinish : handleNext} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>
                                {step === 3 ? (isSaving ? 'Saving...' : 'Save & Finish') : 'Next Step'} <ArrowRightIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="max-w-[1000px] mx-auto w-full px-6 mb-8">
                        <div className="flex justify-between mb-2">
                            {['Identity', 'Visuals', 'Assets', 'Review'].map((label, idx) => (
                                <span key={label} className={`text-[10px] font-bold uppercase tracking-widest ${idx + 1 === step ? 'text-indigo-600' : idx + 1 < step ? 'text-green-500' : 'text-gray-300'}`}>{label}</span>
                            ))}
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full w-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${(step / 3) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto pb-32">
                        <div className="max-w-[1000px] mx-auto px-6">
                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}>
                                    <div className={`${BrandKitManagerStyles.cardIconBox} ${step === 1 ? 'bg-blue-100 text-blue-600' : step === 2 ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                        {step === 1 ? <GlobeIcon className="w-6 h-6"/> : step === 2 ? <PaletteIcon className="w-6 h-6"/> : <CloudUploadIcon className="w-6 h-6"/>}
                                    </div>
                                    <div>
                                        <h3 className={BrandKitManagerStyles.cardTitle}>
                                            {step === 1 ? 'Brand Identity' : step === 2 ? 'Visual Style' : step === 3 ? 'Asset Library' : 'Confirmation'}
                                        </h3>
                                        <p className={BrandKitManagerStyles.cardDesc}>
                                            {step === 1 ? 'Define who you are.' : step === 2 ? 'Set your colors and logo.' : step === 3 ? 'Upload products and mood images.' : 'Review details.'}
                                        </p>
                                    </div>
                                </div>
                                {renderStepContent()}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
