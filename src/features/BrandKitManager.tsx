
import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, Page, View, BrandKit } from '../types';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';
import { 
    PlusIcon, UploadIcon, XIcon, CheckIcon, TrashIcon, 
    ArrowLeftIcon, ArrowRightIcon, SparklesIcon, BrandKitIcon,
    CloudUploadIcon, GlobeIcon
} from '../components/icons';
import { 
    getUserBrands, 
    saveUserBrandKit, 
    deleteBrandFromCollection,
    uploadBrandAsset
} from '../firebase';
import { generateBrandIdentity } from '../services/brandKitService';
import { fileToBase64 } from '../utils/imageUtils';

// Helper Components
const UploadSkeleton = () => (
    <div className="w-full h-32 bg-gray-100 rounded-xl animate-pulse"></div>
);

const MoodItem = ({ item, onDelete }: { item: { id: string, imageUrl: string }, onDelete: () => void }) => (
    <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-gray-200">
        <img src={item.imageUrl} className="w-full h-full object-cover" alt="Mood" />
        <button onClick={onDelete} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <XIcon className="w-5 h-5"/>
        </button>
    </div>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className={BrandKitManagerStyles.colorInputWrapper}>
        <label className={BrandKitManagerStyles.colorLabel}>{label}</label>
        <div className={BrandKitManagerStyles.colorBox}>
            <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: value }}>
                <input 
                    type="color" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
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

const DEFAULT_KIT: BrandKit = {
    companyName: '',
    industry: 'physical',
    website: '',
    toneOfVoice: 'Professional',
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#3B82F6' },
    fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
    logos: { primary: null, secondary: null, mark: null },
    products: [],
    moodBoard: [],
    competitor: { website: '', adScreenshots: [], analysis: { theirStrategy: '', winningAngle: '', visualGap: '', avoidTags: '', lastUpdated: '' } }
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: (page: Page, view?: View) => void }> = ({ auth, navigateTo }) => {
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [kit, setKit] = useState<BrandKit>(DEFAULT_KIT);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<Record<string, number>>({});
    
    // Refs
    const wizardMoodRef = useRef<HTMLInputElement>(null);
    const wizardCompRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBrands();
    }, [auth.user]);

    const loadBrands = async () => {
        if (!auth.user) return;
        setLoading(true);
        try {
            const list = await getUserBrands(auth.user.uid);
            setBrands(list);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setKit(DEFAULT_KIT);
        setStep(1);
        setView('edit');
    };

    const handleEdit = (brand: BrandKit) => {
        setKit(brand);
        setStep(1);
        setView('edit');
    };

    const handleDelete = async (brandId: string) => {
        if (!auth.user) return;
        if (confirm("Are you sure you want to delete this brand kit?")) {
            await deleteBrandFromCollection(auth.user.uid, brandId);
            loadBrands();
        }
    };

    const handleSave = async () => {
        if (!auth.user) return;
        setIsSaving(true);
        try {
            const cleanKit = {
                ...kit,
                // Ensure defaults if missing
                name: kit.companyName || 'Untitled Brand',
                competitor: kit.competitor || { website: '', adScreenshots: [] },
                moodBoard: kit.moodBoard || []
            };
            await saveUserBrandKit(auth.user.uid, cleanKit);
            await loadBrands();
            setView('list');
        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save brand kit.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!kit.website && !kit.companyName) {
            alert("Please enter a website or company description first.");
            return;
        }
        setLoading(true);
        try {
            const generated = await generateBrandIdentity(kit.website, kit.companyName);
            setKit(prev => ({ ...prev, ...generated }));
            setStep(2); // Move to review
        } catch (e) {
            console.error(e);
            alert("Auto-generation failed. Please fill manually.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth.user) return;
        
        try {
            const base64 = await fileToBase64(file);
            const url = await uploadBrandAsset(auth.user.uid, `data:${base64.mimeType};base64,${base64.base64}`, 'logo_primary');
            setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: url } }));
        } catch (e) {
            console.error(e);
        }
    };

    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !auth.user) return;
        
        const count = files.length;
        setUploadingState(prev => ({ ...prev, mood: count }));

        try {
            for (let i = 0; i < count; i++) {
                const file = files[i];
                const base64 = await fileToBase64(file);
                const url = await uploadBrandAsset(auth.user.uid, `data:${base64.mimeType};base64,${base64.base64}`, 'mood');
                setKit(prev => ({
                    ...prev,
                    moodBoard: [...(prev.moodBoard || []), { id: Date.now().toString() + i, imageUrl: url }]
                }));
                setUploadingState(prev => ({ ...prev, mood: (prev.mood || 1) - 1 }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUploadingState(prev => ({ ...prev, mood: 0 }));
        }
    };

    const deleteMoodItem = (id: string) => {
        setKit(prev => ({
            ...prev,
            moodBoard: prev.moodBoard?.filter(m => m.id !== id) || []
        }));
    };

    const handleCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !auth.user) return;
        
        const count = files.length;
        setUploadingState(prev => ({ ...prev, competitor: count }));

        try {
            for (let i = 0; i < count; i++) {
                const file = files[i];
                const base64 = await fileToBase64(file);
                const url = await uploadBrandAsset(auth.user.uid, `data:${base64.mimeType};base64,${base64.base64}`, 'competitor_ad');
                setKit(prev => ({
                    ...prev,
                    competitor: {
                        ...prev.competitor!,
                        adScreenshots: [...(prev.competitor?.adScreenshots || []), { id: Date.now().toString() + i, imageUrl: url }]
                    }
                }));
                setUploadingState(prev => ({ ...prev, competitor: (prev.competitor || 1) - 1 }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setUploadingState(prev => ({ ...prev, competitor: 0 }));
        }
    };

    const deleteCompItem = (id: string) => {
        setKit(prev => ({
            ...prev,
            competitor: {
                ...prev.competitor!,
                adScreenshots: prev.competitor?.adScreenshots.filter(a => a.id !== id) || []
            }
        }));
    };

    const isValidUrl = (urlString: string) => {
        try { 
            return Boolean(new URL(urlString)); 
        }
        catch(e){ 
            return false; 
        }
    };

    if (view === 'list') {
        return (
            <div className={BrandKitManagerStyles.container}>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className={BrandKitManagerStyles.sectionTitle}>Brand Kits</h1>
                        <p className={BrandKitManagerStyles.sectionSubtitle}>Manage identities for different clients or projects.</p>
                    </div>
                    <button onClick={handleCreateNew} className="bg-[#1A1A1E] text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2">
                        <PlusIcon className="w-5 h-5" /> New Brand
                    </button>
                </div>

                <div className={BrandKitManagerStyles.brandGrid}>
                    {/* Add New Card */}
                    <div onClick={handleCreateNew} className={BrandKitManagerStyles.addCard}>
                        <div className={BrandKitManagerStyles.addCardIcon}>
                            <PlusIcon className="w-8 h-8" />
                        </div>
                        <span className={BrandKitManagerStyles.addCardText}>Create New Brand</span>
                    </div>

                    {/* Existing Brands */}
                    {brands.map(brand => (
                        <div key={brand.id} onClick={() => handleEdit(brand)} className={BrandKitManagerStyles.brandCard}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); brand.id && handleDelete(brand.id); }} 
                                className={BrandKitManagerStyles.deleteBtn}
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                            
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (
                                    <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" />
                                ) : (
                                    <span className={BrandKitManagerStyles.brandCardFallback}>
                                        {(brand.companyName || brand.name || '??').substring(0, 2)}
                                    </span>
                                )}
                            </div>
                            
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div>
                                    <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.companyName || brand.name}</h3>
                                    <p className={BrandKitManagerStyles.brandCardMeta}>{brand.industry} • {brand.products?.length || 0} Products</p>
                                </div>
                                <div className={BrandKitManagerStyles.brandCardPalette}>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.primary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.secondary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.accent }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // EDITOR VIEW
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Editor Header */}
            <div className={BrandKitManagerStyles.detailHeader}>
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('list')} className={BrandKitManagerStyles.backBtn}>
                        <ArrowLeftIcon className="w-4 h-4"/> Back
                    </button>
                    <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
                    <input 
                        value={kit.companyName} 
                        onChange={(e) => setKit({ ...kit, companyName: e.target.value })}
                        placeholder="Brand Name" 
                        className={BrandKitManagerStyles.brandNameInput}
                    />
                </div>
                
                <div className={BrandKitManagerStyles.actionGroup}>
                    {isSaving && <span className={BrandKitManagerStyles.savingBadge}>Saving...</span>}
                    <button onClick={handleSave} disabled={isSaving} className={BrandKitManagerStyles.saveBtn}>
                        <CheckIcon className="w-4 h-4" /> Save Kit
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 pb-20">
                {/* Progress Stepper */}
                <div className="flex justify-between items-center mb-10 px-4">
                    {[1, 2, 3, 4, 5, 6, 7].map(s => (
                        <div key={s} className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => setStep(s)}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step === s ? 'bg-[#1A1A1E] text-white shadow-lg scale-110' : s < step ? 'bg-green-100 text-green-700' : 'bg-white text-gray-300 border border-gray-200'}`}>
                                {s < step ? <CheckIcon className="w-4 h-4" /> : s}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 min-h-[500px]">
                    {step === 1 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Brand Basics</h2>
                                <p className="text-gray-500">Let's start with the foundation.</p>
                            </div>
                            
                            <div className="max-w-xl mx-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Website URL</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                            placeholder="https://example.com"
                                            value={kit.website}
                                            onChange={(e) => setKit({ ...kit, website: e.target.value })}
                                        />
                                        <button onClick={handleAutoGenerate} disabled={loading} className="bg-indigo-50 text-indigo-600 px-6 rounded-xl font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                            {loading ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <><SparklesIcon className="w-5 h-5"/> Auto-Fill</>}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 ml-1">We can scan your website to auto-fill colors and fonts.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Industry</label>
                                    <div className={BrandKitManagerStyles.industryGrid}>
                                        {['physical', 'digital', 'realty', 'fashion', 'service'].map(ind => (
                                            <button 
                                                key={ind} 
                                                onClick={() => setKit({ ...kit, industry: ind as any })}
                                                className={`p-4 rounded-xl border-2 text-center capitalize font-bold text-sm transition-all ${kit.industry === ind ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                            >
                                                {ind}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                             <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Brand Logo</h2>
                                <p className="text-gray-500">Upload your primary brand mark.</p>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                <div onClick={() => logoInputRef.current?.click()} className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/10 transition-all group relative overflow-hidden">
                                    {kit.logos.primary ? (
                                        <img src={kit.logos.primary} className="w-full h-full object-contain p-8" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                                                <UploadIcon className="w-8 h-8" />
                                            </div>
                                            <p className="font-bold text-gray-600">Upload Logo</p>
                                            <p className="text-xs text-gray-400 mt-1">PNG, SVG or JPG</p>
                                        </div>
                                    )}
                                </div>
                                <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                {kit.logos.primary && (
                                    <button onClick={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: null } }))} className="mt-4 text-red-500 font-bold text-sm hover:underline">
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Color Palette</h2>
                                <p className="text-gray-500">Define your brand's visual identity.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
                                <ColorInput label="Primary Color" value={kit.colors.primary} onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, primary: v } }))} />
                                <ColorInput label="Secondary Color" value={kit.colors.secondary} onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, secondary: v } }))} />
                                <ColorInput label="Accent Color" value={kit.colors.accent} onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, accent: v } }))} />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                             <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Typography</h2>
                                <p className="text-gray-500">Choose fonts that match your brand voice.</p>
                            </div>
                            <div className="max-w-xl mx-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Heading Font Style</label>
                                    <select value={kit.fonts.heading} onChange={(e) => setKit(prev => ({ ...prev, fonts: { ...prev.fonts, heading: e.target.value } }))} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option>Modern Sans</option>
                                        <option>Classic Serif</option>
                                        <option>Bold Display</option>
                                        <option>Minimalist</option>
                                        <option>Handwritten</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Body Font Style</label>
                                    <select value={kit.fonts.body} onChange={(e) => setKit(prev => ({ ...prev, fonts: { ...prev.fonts, body: e.target.value } }))} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option>Clean Sans</option>
                                        <option>Readable Serif</option>
                                        <option>Monospace</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Tone of Voice</h2>
                                <p className="text-gray-500">How should your brand sound?</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                                {['Professional', 'Friendly', 'Luxury', 'Playful', 'Urgent', 'Technical', 'Minimal'].map(tone => (
                                    <button 
                                        key={tone}
                                        onClick={() => setKit(prev => ({ ...prev, toneOfVoice: tone }))}
                                        className={`p-4 rounded-xl border-2 font-bold text-sm transition-all ${kit.toneOfVoice === tone ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-500 hover:border-gray-200'}`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                         <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                             <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Inspiration Board</h2>
                                <p className="text-gray-500">Upload examples of the style you want.</p>
                            </div>
                            <div className="max-w-3xl mx-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <button onClick={() => wizardMoodRef.current?.click()} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                                        {uploadingState['mood'] > 0 ? 'Uploading...' : <><PlusIcon className="w-4 h-4"/> Add Image</>}
                                    </button>
                                    <span className="text-xs text-gray-400 font-medium">{kit.moodBoard?.length || 0} images added</span>
                                    <input ref={wizardMoodRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} />
                                </div>
                                
                                {(!kit.moodBoard || kit.moodBoard.length === 0) ? (
                                    uploadingState['mood'] > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeIn">
                                            {Array.from({ length: uploadingState['mood'] }).map((_, i) => <UploadSkeleton key={i} />)}
                                        </div>
                                    ) : (
                                        <div onClick={() => wizardMoodRef.current?.click()} className="h-48 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-gray-50 transition-all">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                                <UploadIcon className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-bold text-gray-500">Upload Inspiration</p>
                                            <p className="text-xs text-gray-400 mt-1">Supports multiple uploads</p>
                                        </div>
                                    )
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                        {kit.moodBoard.map(item => (
                                            <MoodItem key={item.id} item={item} onDelete={() => deleteMoodItem(item.id)} />
                                        ))}
                                        {uploadingState['mood'] > 0 && Array.from({ length: uploadingState['mood'] }).map((_, i) => <UploadSkeleton key={i} />)}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 7 && (
                        <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-gray-900">Competitor Intel</h2>
                                <p className="text-gray-500">Who are you up against?</p>
                            </div>
                            <div className="max-w-xl mx-auto space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Competitor Website <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <GlobeIcon className="absolute left-4 top-4 w-5 h-5 text-gray-400"/>
                                        <input 
                                            className={`w-full p-4 pl-12 bg-gray-50 border rounded-xl focus:outline-none transition-colors ${kit.competitor?.website && !isValidUrl(kit.competitor.website) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'}`}
                                            placeholder="e.g. https://www.competitor.com"
                                            value={kit.competitor?.website || ''}
                                            onChange={(e) => setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { adScreenshots: [], analysis: undefined }, website: e.target.value } }))}
                                        />
                                    </div>
                                    {kit.competitor?.website && !isValidUrl(kit.competitor.website) && (
                                        <p className="text-xs text-red-500 mt-1">Please enter a valid URL (e.g. https://example.com)</p>
                                    )}
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-bold text-gray-700">Ad Screenshots</label>
                                        <span className="text-[10px] text-gray-400 font-medium">{kit.competitor?.adScreenshots?.length || 0} added</span>
                                        <input ref={wizardCompRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompUpload} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {kit.competitor?.adScreenshots.map(ad => (
                                            <div key={ad.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={ad.imageUrl} className="w-full h-full object-cover" />
                                                <button onClick={() => deleteCompItem(ad.id)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                                    <XIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        ))}
                                        {uploadingState['competitor'] > 0 && Array.from({ length: uploadingState['competitor'] }).map((_, i) => (
                                            <div key={i} className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center animate-pulse">
                                                <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                                            </div>
                                        ))}
                                        <div onClick={() => wizardCompRef.current?.click()} className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-amber-400 hover:text-amber-500 transition-all cursor-pointer">
                                            <PlusIcon className="w-6 h-6"/>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400">Upload screenshots of their ads or social posts for AI analysis.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-8">
                    <button 
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        onClick={() => step < 7 ? setStep(s => s + 1) : handleSave()}
                        className="bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2"
                    >
                        {step === 7 ? 'Finish & Save' : 'Next Step'} <ArrowRightIcon className="w-4 h-4"/>
                    </button>
                </div>
            </div>
        </div>
    );
};
