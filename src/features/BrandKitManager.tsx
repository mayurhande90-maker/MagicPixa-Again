
import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, Page, View, BrandKit, IndustryType } from '../types';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';
import { 
    BrandKitIcon, PlusIcon, TrashIcon, ArrowLeftIcon, CheckIcon, XIcon, 
    LightbulbIcon, CloudUploadIcon, SparklesIcon, PaletteIcon, ArrowRightIcon,
    GlobeIcon, DocumentTextIcon
} from '../components/icons';
import { 
    getUserBrands, saveBrandToCollection, deleteBrandFromCollection, 
    uploadBrandAsset, generateBrandIdentity, extractBrandColors
} from '../services/brandKitService';
import { fileToBase64, urlToBase64, rawFileToBase64 } from '../utils/imageUtils';

// --- Internal Components ---

const ColorInput: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => (
    <div className={BrandKitManagerStyles.colorInputWrapper}>
        <label className={BrandKitManagerStyles.colorLabel}>{label}</label>
        <div className={BrandKitManagerStyles.colorBox}>
            <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: value }}>
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
            </div>
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className={BrandKitManagerStyles.colorField}
                maxLength={7}
            />
        </div>
    </div>
);

const UploadSkeleton = () => (
    <div className="animate-pulse bg-gray-100 rounded-xl w-full h-32 flex items-center justify-center border border-gray-200">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
);

const MoodItem: React.FC<{ item: { id: string; imageUrl: string }; onDelete: () => void }> = ({ item, onDelete }) => (
    <div className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200">
        <img src={item.imageUrl} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 transition-colors">
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
);

const isValidUrl = (urlString: string) => {
    try { 
        return Boolean(new URL(urlString)); 
    }
    catch(e){ 
        // Allow simple domains without protocol for user convenience, adding https if missing
        return /.+\..+/.test(urlString); 
    }
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View) => void }> = ({ auth, navigateTo }) => {
    // List View State
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isLoadingBrands, setIsLoadingBrands] = useState(true);
    
    // Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [kit, setKit] = useState<BrandKit>({
        companyName: '',
        industry: 'physical',
        website: '',
        toneOfVoice: 'Professional',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#0000ff' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null },
        products: [],
        moodBoard: [],
        competitor: { website: '', adScreenshots: [] }
    });
    
    const [uploadingState, setUploadingState] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Refs
    const wizardLogoRef = useRef<HTMLInputElement>(null);
    const wizardProductRef = useRef<HTMLInputElement>(null);
    const wizardMoodRef = useRef<HTMLInputElement>(null);
    const wizardCompRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    useEffect(() => {
        if (auth.user) {
            loadBrands();
        }
    }, [auth.user]);

    const loadBrands = async () => {
        setIsLoadingBrands(true);
        if (auth.user) {
            const userBrands = await getUserBrands(auth.user.uid);
            setBrands(userBrands);
        }
        setIsLoadingBrands(false);
    };

    // --- Handlers ---

    const handleCreateNew = () => {
        setKit({
            companyName: 'New Brand',
            industry: 'physical',
            website: '',
            toneOfVoice: 'Professional',
            colors: { primary: '#000000', secondary: '#ffffff', accent: '#3B82F6' },
            fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
            logos: { primary: null, secondary: null, mark: null },
            products: [],
            moodBoard: [],
            competitor: { website: '', adScreenshots: [] }
        });
        setCurrentStep(1);
        setIsEditing(true);
    };

    const handleEdit = (brand: BrandKit) => {
        setKit(brand);
        setCurrentStep(1);
        setIsEditing(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this brand kit?")) {
            if (auth.user && id) {
                await deleteBrandFromCollection(auth.user.uid, id);
                loadBrands();
            }
        }
    };

    const handleSave = async () => {
        if (!auth.user) return;
        setIsSaving(true);
        try {
            await saveBrandToCollection(auth.user.uid, kit);
            await loadBrands();
            setIsEditing(false);
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save brand kit.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!kit.website && !kit.companyName) {
            alert("Please enter a Website URL or Company Name to auto-generate.");
            return;
        }
        setIsGenerating(true);
        try {
            const genData = await generateBrandIdentity(kit.website, kit.companyName || "A modern brand");
            setKit(prev => ({
                ...prev,
                ...genData,
                // Preserve user logos/images if they exist
                logos: prev.logos,
                moodBoard: prev.moodBoard,
                products: prev.products
            }));
        } catch (e) {
            console.error(e);
            alert("Auto-generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    // Upload Handlers
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !auth.user) return;
        const file = e.target.files[0];
        setUploadingState(p => ({ ...p, logo: 1 }));
        try {
            const base64 = await fileToBase64(file);
            const { primary, secondary, accent } = await extractBrandColors(base64.base64, base64.mimeType);
            const rawBase64 = `data:${base64.mimeType};base64,${base64.base64}`;
            const url = await uploadBrandAsset(auth.user.uid, rawBase64, 'logo');
            
            setKit(prev => ({
                ...prev,
                logos: { ...prev.logos, primary: url },
                colors: { primary, secondary, accent }
            }));
        } catch (e) { console.error(e); }
        setUploadingState(p => ({ ...p, logo: 0 }));
    };

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !auth.user) return;
        const files = Array.from(e.target.files);
        setUploadingState(p => ({ ...p, product: files.length }));
        
        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                const rawBase64 = `data:${base64.mimeType};base64,${base64.base64}`;
                const url = await uploadBrandAsset(auth.user.uid, rawBase64, 'product');
                setKit(prev => ({
                    ...prev,
                    products: [...(prev.products || []), { id: Date.now().toString() + Math.random(), name: file.name.split('.')[0], imageUrl: url }]
                }));
            } catch (e) { console.error(e); }
        }
        setUploadingState(p => ({ ...p, product: 0 }));
    };

    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !auth.user) return;
        const files = Array.from(e.target.files);
        setUploadingState(p => ({ ...p, mood: files.length }));
        
        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                const rawBase64 = `data:${base64.mimeType};base64,${base64.base64}`;
                const url = await uploadBrandAsset(auth.user.uid, rawBase64, 'mood');
                setKit(prev => ({
                    ...prev,
                    moodBoard: [...(prev.moodBoard || []), { id: Date.now().toString() + Math.random(), imageUrl: url }]
                }));
            } catch (e) { console.error(e); }
        }
        setUploadingState(p => ({ ...p, mood: 0 }));
    };

    const handleCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !auth.user) return;
        const files = Array.from(e.target.files);
        setUploadingState(p => ({ ...p, competitor: files.length }));
        
        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                const rawBase64 = `data:${base64.mimeType};base64,${base64.base64}`;
                const url = await uploadBrandAsset(auth.user.uid, rawBase64, 'competitor');
                setKit(prev => ({
                    ...prev,
                    competitor: {
                        ...prev.competitor || { website: '' },
                        adScreenshots: [...(prev.competitor?.adScreenshots || []), { id: Date.now().toString() + Math.random(), imageUrl: url }]
                    }
                }));
            } catch (e) { console.error(e); }
        }
        setUploadingState(p => ({ ...p, competitor: 0 }));
    };

    // --- Render Logic ---

    if (!isEditing) {
        return (
            <div className={BrandKitManagerStyles.container}>
                <div className="mb-8">
                    <h1 className={BrandKitManagerStyles.sectionTitle}>Brand Kits</h1>
                    <p className={BrandKitManagerStyles.sectionSubtitle}>Manage your brand identities, assets, and styles in one place.</p>
                </div>

                <div className={BrandKitManagerStyles.brandGrid}>
                    <button onClick={handleCreateNew} className={BrandKitManagerStyles.addCard}>
                        <div className={BrandKitManagerStyles.addCardIcon}><PlusIcon className="w-8 h-8"/></div>
                        <span className={BrandKitManagerStyles.addCardText}>Create New Brand</span>
                    </button>

                    {isLoadingBrands ? (
                         [1,2].map(i => (
                             <div key={i} className="h-64 rounded-3xl bg-gray-100 animate-pulse border border-gray-200"></div>
                         ))
                    ) : (
                        brands.map(brand => (
                            <div key={brand.id} onClick={() => handleEdit(brand)} className={BrandKitManagerStyles.brandCard}>
                                <div className={BrandKitManagerStyles.brandCardHeader}>
                                    {brand.logos.primary ? (
                                        <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} />
                                    ) : (
                                        <span className={BrandKitManagerStyles.brandCardFallback}>{brand.companyName.substring(0, 2)}</span>
                                    )}
                                </div>
                                <div className={BrandKitManagerStyles.brandCardBody}>
                                    <div>
                                        <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.companyName || 'Untitled Brand'}</h3>
                                        <p className={BrandKitManagerStyles.brandCardMeta}>{brand.industry} • {brand.toneOfVoice}</p>
                                        <div className={BrandKitManagerStyles.brandCardPalette}>
                                            <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.primary }}></div>
                                            <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.secondary }}></div>
                                            <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.accent }}></div>
                                        </div>
                                    </div>
                                    <button onClick={(e) => handleDelete(e, brand.id!)} className={BrandKitManagerStyles.deleteBtn}>
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={BrandKitManagerStyles.container}>
            <div className={BrandKitManagerStyles.detailHeader}>
                <div className="flex flex-col">
                    <button onClick={() => setIsEditing(false)} className={BrandKitManagerStyles.backBtn}>
                        <ArrowLeftIcon className="w-4 h-4" /> Back to Brands
                    </button>
                    <input 
                        value={kit.companyName} 
                        onChange={(e) => setKit({...kit, companyName: e.target.value})} 
                        className={BrandKitManagerStyles.brandNameInput} 
                        placeholder="Brand Name"
                    />
                </div>
                <div className={BrandKitManagerStyles.actionGroup}>
                    {isGenerating && <span className={BrandKitManagerStyles.savingBadge}>Generating...</span>}
                    <button onClick={handleAutoGenerate} disabled={isGenerating} className={BrandKitManagerStyles.magicBtn}>
                        <SparklesIcon className="w-4 h-4" /> Auto-Fill
                    </button>
                    <button onClick={handleSave} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 flex flex-col gap-2">
                    {[
                        { id: 1, label: 'Identity', icon: DocumentTextIcon },
                        { id: 2, label: 'Colors', icon: PaletteIcon },
                        { id: 3, label: 'Fonts', icon: DocumentTextIcon }, // Using doc text for font icon
                        { id: 4, label: 'Logo', icon: BrandKitIcon },
                        { id: 5, label: 'Products', icon: CloudUploadIcon },
                        { id: 6, label: 'Mood Board', icon: LightbulbIcon },
                        { id: 7, label: 'Competitor', icon: GlobeIcon },
                    ].map(step => (
                        <button 
                            key={step.id} 
                            onClick={() => setCurrentStep(step.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentStep === step.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                        >
                            <step.icon className={`w-5 h-5 ${currentStep === step.id ? 'text-white' : 'text-gray-400'}`} />
                            <span className="text-sm font-bold">{step.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-sm p-8 min-h-[500px]">
                    {renderStepContent()}
                </div>
            </div>
        </div>
    );

    function renderStepContent() {
        switch (currentStep) {
            case 1: // IDENTITY
                return (
                    <div className="space-y-6 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Identity</h2>
                            <p className="text-gray-500">Define the core DNA of your brand.</p>
                        </div>
                        
                        <div className={BrandKitManagerStyles.industryGrid}>
                            {['physical', 'digital', 'realty', 'fashion', 'service'].map((ind) => (
                                <div 
                                    key={ind} 
                                    onClick={() => setKit({...kit, industry: ind as IndustryType})}
                                    className={`${BrandKitManagerStyles.industryCard} ${kit.industry === ind ? BrandKitManagerStyles.industryCardSelected : BrandKitManagerStyles.industryCardInactive}`}
                                >
                                    <span className="capitalize font-bold">{ind}</span>
                                    {kit.industry === ind && <div className={BrandKitManagerStyles.industryCheck}><CheckIcon className="w-3 h-3 text-white"/></div>}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website URL</label>
                                <input value={kit.website} onChange={e => setKit({...kit, website: e.target.value})} className={BrandKitManagerStyles.inputField} placeholder="https://example.com" />
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label>
                                <select value={kit.toneOfVoice} onChange={e => setKit({...kit, toneOfVoice: e.target.value})} className={BrandKitManagerStyles.selectField}>
                                    {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={BrandKitManagerStyles.inputLabel}>Target Audience</label>
                            <input value={kit.targetAudience || ''} onChange={e => setKit({...kit, targetAudience: e.target.value})} className={BrandKitManagerStyles.inputField} placeholder="e.g. Young professionals aged 25-35" />
                        </div>
                    </div>
                );

            case 2: // COLORS
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Colors</h2>
                            <p className="text-gray-500">Define your primary palette.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ColorInput label="Primary" value={kit.colors.primary} onChange={(v) => setKit({...kit, colors: {...kit.colors, primary: v}})} />
                            <ColorInput label="Secondary" value={kit.colors.secondary} onChange={(v) => setKit({...kit, colors: {...kit.colors, secondary: v}})} />
                            <ColorInput label="Accent" value={kit.colors.accent} onChange={(v) => setKit({...kit, colors: {...kit.colors, accent: v}})} />
                        </div>
                    </div>
                );

            case 3: // FONTS
                return (
                     <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Typography</h2>
                            <p className="text-gray-500">Select font styles for your brand.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Heading Font Style</label>
                                <select value={kit.fonts.heading} onChange={e => setKit({...kit, fonts: {...kit.fonts, heading: e.target.value}})} className={BrandKitManagerStyles.selectField}>
                                    {['Modern Sans', 'Classic Serif', 'Bold Display', 'Handwritten', 'Tech Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Body Font Style</label>
                                <select value={kit.fonts.body} onChange={e => setKit({...kit, fonts: {...kit.fonts, body: e.target.value}})} className={BrandKitManagerStyles.selectField}>
                                    {['Clean Sans', 'Readable Serif', 'Minimal Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                     </div>
                );

            case 4: // LOGO
                return (
                     <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Assets</h2>
                            <p className="text-gray-500">Upload your logo files.</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                             <div 
                                onClick={() => wizardLogoRef.current?.click()} 
                                className={`w-full md:w-96 h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all ${kit.logos.primary ? 'border-indigo-500 bg-white' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}`}
                             >
                                 {uploadingState['logo'] ? (
                                     <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                 ) : kit.logos.primary ? (
                                     <img src={kit.logos.primary} className="max-w-full max-h-full p-4 object-contain" />
                                 ) : (
                                     <>
                                        <CloudUploadIcon className="w-12 h-12 text-gray-300 mb-4" />
                                        <p className="text-sm font-bold text-gray-500">Upload Primary Logo</p>
                                     </>
                                 )}
                             </div>
                             <input ref={wizardLogoRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                             <p className="text-xs text-gray-400 mt-4">Pixa will automatically extract colors from your logo.</p>
                        </div>
                     </div>
                );

            case 5: // PRODUCTS
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Product Catalog</h2>
                            <p className="text-gray-500">Upload your product images for AI training.</p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {kit.products?.map((p, i) => (
                                <div key={i} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-200 bg-white">
                                    <img src={p.imageUrl} className="w-full h-full object-contain p-2" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button onClick={() => setKit({...kit, products: kit.products?.filter((_, idx) => idx !== i)})} className="p-2 bg-white rounded-full text-red-500">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="absolute bottom-0 left-0 right-0 bg-white/90 text-[10px] font-bold text-center py-1 truncate px-2">{p.name}</p>
                                </div>
                            ))}
                            
                            <div onClick={() => wizardProductRef.current?.click()} className="aspect-square border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                {uploadingState['product'] ? (
                                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <PlusIcon className="w-8 h-8 text-gray-300 mb-2" />
                                        <span className="text-xs font-bold text-gray-400">Add Product</span>
                                    </>
                                )}
                            </div>
                            <input ref={wizardProductRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} />
                        </div>
                    </div>
                );

            case 6: // MOOD BOARD
                const uploadingMoodCount = uploadingState['mood'] || 0;
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Inspiration Board</h2>
                            <p className="text-gray-500">Upload examples of the style you want.</p>
                        </div>
                        <div className="max-w-3xl mx-auto">
                            <div className="flex justify-between items-center mb-4">
                                <button onClick={() => wizardMoodRef.current?.click()} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                    {uploadingMoodCount > 0 ? 'Uploading...' : <><PlusIcon className="w-4 h-4"/> Add Image</>}
                                </button>
                                <span className="text-xs text-gray-400 font-medium">{kit.moodBoard?.length || 0} images added</span>
                                <input ref={wizardMoodRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} />
                            </div>
                            
                            {(!kit.moodBoard || kit.moodBoard.length === 0) ? (
                                uploadingMoodCount > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                                        {Array.from({ length: uploadingMoodCount }).map((_, i) => <UploadSkeleton key={i} />)}
                                    </div>
                                ) : (
                                    <div onClick={() => wizardMoodRef.current?.click()} className="h-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                            <LightbulbIcon className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500">Upload Inspiration</p>
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                    {kit.moodBoard.map(item => (
                                        <MoodItem key={item.id} item={item} onDelete={() => setKit({...kit, moodBoard: kit.moodBoard?.filter(i => i.id !== item.id)})} />
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
                     <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Competitor Intel</h2>
                            <p className="text-gray-500">Who are you up against?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Competitor Website <span className="text-red-500">*</span></label>
                                <input 
                                    className={`w-full p-4 bg-gray-50 border rounded-xl focus:outline-none transition-colors ${kit.competitor?.website && !isValidUrl(kit.competitor.website) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-indigo-500'}`}
                                    placeholder="e.g. www.competitor.com"
                                    value={kit.competitor?.website || ''}
                                    onChange={(e) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { adScreenshots: [] }, website: e.target.value } }))}
                                />
                                {kit.competitor?.website && !isValidUrl(kit.competitor.website) && (
                                    <p className="text-xs text-red-500 mt-1">Please enter a valid URL (e.g. example.com)</p>
                                )}
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-700">Ad Screenshots</label>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-gray-400 font-medium">{kit.competitor?.adScreenshots?.length || 0} added</span>
                                        <button onClick={() => wizardCompRef.current?.click()} disabled={uploadingState['competitor'] > 0} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                                            {uploadingState['competitor'] > 0 ? 'Uploading...' : <><PlusIcon className="w-3 h-3"/> Add Image</>}
                                        </button>
                                    </div>
                                    <input ref={wizardCompRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompUpload} />
                                </div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {kit.competitor?.adScreenshots?.map(ad => (
                                        <div key={ad.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                            <img src={ad.imageUrl} className="w-full h-full object-cover" />
                                            <button onClick={() => setKit(prev => ({ ...prev, competitor: { ...prev.competitor!, adScreenshots: prev.competitor!.adScreenshots.filter(a => a.id !== ad.id) } }))} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                <XIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    ))}
                                    {uploadingCompCount > 0 && Array.from({ length: uploadingCompCount }).map((_, i) => (
                                        <div key={i} className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center animate-pulse">
                                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"></div>
                                        </div>
                                    ))}
                                    {(!kit.competitor?.adScreenshots || kit.competitor.adScreenshots.length === 0) && (
                                        <div onClick={() => wizardCompRef.current?.click()} className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-all cursor-pointer">
                                            <PlusIcon className="w-6 h-6"/>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400">Upload screenshots of their ads or social posts for AI analysis.</p>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    }
};
