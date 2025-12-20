
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit, Page, View } from '../types';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';
import { 
    PlusIcon, UploadIcon, XIcon, ArrowLeftIcon, ArrowRightIcon, 
    CheckIcon, TrashIcon, SparklesIcon, SaveIcon 
} from '../components/icons';
import { fileToBase64, urlToBase64, Base64File } from '../utils/imageUtils';
import { 
    saveBrandToCollection, getUserBrands, deleteBrandFromCollection, 
    uploadBrandAsset
} from '../firebase';
import { generateBrandIdentity, extractBrandColors } from '../services/brandKitService';
import ToastNotification from '../components/ToastNotification';

// Helper
const isValidUrl = (urlString: string) => {
    try { 
        return Boolean(new URL(urlString)); 
    }
    catch(e){ 
        return false; 
    }
}

const UploadSkeleton = () => (
    <div className="animate-pulse bg-gray-100 rounded-xl h-20 w-20"></div>
);

const MoodItem = ({ item, onDelete }: any) => (
    <div className="relative group w-full h-32 rounded-xl overflow-hidden border border-gray-200">
        <img src={item.imageUrl} className="w-full h-full object-cover" alt="Mood" />
        <button onClick={onDelete} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
            <XIcon className="w-6 h-6" />
        </button>
    </div>
);

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth, navigateTo }) => {
    const [mode, setMode] = useState<'list' | 'edit'>('list');
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [kit, setKit] = useState<Partial<BrandKit>>({});
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploadingState, setUploadingState] = useState<Record<string, number>>({});
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Refs
    const wizardLogoRef = useRef<HTMLInputElement>(null);
    const wizardMoodRef = useRef<HTMLInputElement>(null);
    const wizardCompRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (auth.user) {
            loadBrands();
        }
    }, [auth.user]);

    const loadBrands = async () => {
        if (!auth.user) return;
        const list = await getUserBrands(auth.user.uid);
        setBrands(list);
    };

    const handleCreateNew = () => {
        setKit({
            colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
            fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
            logos: { primary: null, secondary: null, mark: null },
            products: [],
            moodBoard: [],
            competitor: { website: '', adScreenshots: [] }
        });
        setStep(1);
        setMode('edit');
    };

    const handleEdit = (brand: BrandKit) => {
        setKit(brand);
        setStep(1);
        setMode('edit');
    };

    const handleDelete = async (brandId: string) => {
        if (window.confirm("Delete this brand kit?")) {
            await deleteBrandFromCollection(auth.user!.uid, brandId);
            loadBrands();
        }
    };

    const handleSave = async () => {
        if (!auth.user || !kit.companyName) {
            setNotification({ msg: "Company Name is required.", type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await saveBrandToCollection(auth.user.uid, kit as BrandKit);
            setNotification({ msg: "Brand Kit Saved!", type: 'success' });
            loadBrands();
            setMode('list');
        } catch (e: any) {
            setNotification({ msg: e.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!kit.companyName && !kit.website) {
            setNotification({ msg: "Please enter a Company Name or Website first.", type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const generated = await generateBrandIdentity(kit.website || '', kit.companyName || '');
            setKit(prev => ({
                ...prev,
                ...generated,
                // Preserve existing manual uploads if any, unless overwritten by generation logic (usually gen logic only returns text/hex)
                logos: prev.logos || generated.logos, 
                colors: generated.colors || prev.colors
            }));
            setNotification({ msg: "Brand Identity Generated!", type: 'success' });
        } catch (e: any) {
            setNotification({ msg: "Generation failed.", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMoodUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !auth.user) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, mood: (prev['mood'] || 0) + files.length }));
        
        for (const file of files) {
            try {
                const base64 = await fileToBase64(file);
                // In a real app we'd upload to storage. Here simulating or using base64.
                // Assuming uploadBrandAsset handles storage:
                const url = await uploadBrandAsset(auth.user.uid, URL.createObjectURL(file), 'mood'); 
                setKit(prev => ({
                    ...prev,
                    moodBoard: [...(prev.moodBoard || []), { id: Date.now().toString(), imageUrl: url }]
                }));
            } catch (err) {
                console.error(err);
            } finally {
                setUploadingState(prev => ({ ...prev, mood: Math.max(0, (prev['mood'] || 0) - 1) }));
            }
        }
    };

    const deleteMoodItem = (id: string) => {
        setKit(prev => ({ ...prev, moodBoard: prev.moodBoard?.filter(i => i.id !== id) }));
    };

    const handleCompUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !auth.user) return;
        const files = Array.from(e.target.files);
        setUploadingState(prev => ({ ...prev, competitor: (prev['competitor'] || 0) + files.length }));

        for (const file of files) {
            try {
                const url = await uploadBrandAsset(auth.user.uid, URL.createObjectURL(file), 'competitor');
                setKit(prev => ({
                    ...prev,
                    competitor: {
                        ...prev.competitor || { website: '', adScreenshots: [] },
                        adScreenshots: [...(prev.competitor?.adScreenshots || []), { id: Date.now().toString(), imageUrl: url }]
                    }
                }));
            } catch (err) {
                console.error(err);
            } finally {
                setUploadingState(prev => ({ ...prev, competitor: Math.max(0, (prev['competitor'] || 0) - 1) }));
            }
        }
    };
    
    const deleteCompItem = (id: string) => {
        setKit(prev => ({
            ...prev,
            competitor: {
                ...prev.competitor!,
                adScreenshots: prev.competitor?.adScreenshots.filter(i => i.id !== id) || []
            }
        }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !auth.user) return;
        const file = e.target.files[0];
        setLoading(true);
        try {
            const url = await uploadBrandAsset(auth.user.uid, URL.createObjectURL(file), 'logo');
            setKit(prev => ({ ...prev, logos: { ...prev.logos!, primary: url } }));
            
            // Extract colors from logo if not set
            const b64 = await fileToBase64(file);
            const colors = await extractBrandColors(b64.base64, b64.mimeType);
            setKit(prev => ({ ...prev, colors }));
            
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    // Render Logic
    if (mode === 'list') {
        return (
            <div className={BrandKitManagerStyles.container}>
                <h1 className={BrandKitManagerStyles.sectionTitle}>My Brands</h1>
                <p className={BrandKitManagerStyles.sectionSubtitle}>Manage your brand kits and assets.</p>

                <div className={BrandKitManagerStyles.brandGrid}>
                    <button onClick={handleCreateNew} className={BrandKitManagerStyles.addCard}>
                        <div className={BrandKitManagerStyles.addCardIcon}><PlusIcon className="w-8 h-8" /></div>
                        <span className={BrandKitManagerStyles.addCardText}>Create Brand Kit</span>
                    </button>

                    {brands.map(brand => (
                        <div key={brand.id} className={BrandKitManagerStyles.brandCard} onClick={() => handleEdit(brand)}>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(brand.id!); }} className={BrandKitManagerStyles.deleteBtn}><TrashIcon className="w-4 h-4"/></button>
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (
                                    <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" />
                                ) : (
                                    <span className={BrandKitManagerStyles.brandCardFallback}>{brand.companyName?.substring(0, 2) || "??"}</span>
                                )}
                            </div>
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div>
                                    <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.companyName || "Untitled"}</h3>
                                    <p className={BrandKitManagerStyles.brandCardMeta}>{brand.industry} • {brand.toneOfVoice}</p>
                                </div>
                                <div className={BrandKitManagerStyles.brandCardPalette}>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.primary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.secondary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ background: brand.colors.accent }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            </div>
        );
    }

    // Edit Mode (Wizard)
    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Header */}
            <div className={BrandKitManagerStyles.detailHeader}>
                <div className="flex flex-col">
                    <button onClick={() => setMode('list')} className={BrandKitManagerStyles.backBtn}>
                        <ArrowLeftIcon className="w-4 h-4" /> Back to Brands
                    </button>
                    <input 
                        value={kit.companyName || ''}
                        onChange={e => setKit(prev => ({ ...prev, companyName: e.target.value }))}
                        className={BrandKitManagerStyles.brandNameInput}
                        placeholder="Untitled Brand"
                    />
                </div>
                <div className={BrandKitManagerStyles.actionGroup}>
                    {step === 1 && (
                        <button onClick={handleAutoGenerate} disabled={loading} className={BrandKitManagerStyles.magicBtn}>
                            <SparklesIcon className="w-4 h-4" /> {loading ? 'Analyzing...' : 'Auto-Generate DNA'}
                        </button>
                    )}
                    <button onClick={handleSave} disabled={loading} className={BrandKitManagerStyles.saveBtn}>
                        <SaveIcon className="w-4 h-4" /> {loading ? 'Saving...' : 'Save Brand'}
                    </button>
                </div>
            </div>

            <div className={BrandKitManagerStyles.container}>
                {/* Wizard Steps */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    {['Identity', 'DNA', 'Visuals', 'Typography', 'Logo', 'Mood Board', 'Competitor'].map((s, i) => (
                        <button 
                            key={s} 
                            onClick={() => setStep(i + 1)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${step === i + 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                        >
                            {i + 1}. {s}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
                    {step === 1 && (
                        <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Identity</h2>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website URL</label>
                                <input className={BrandKitManagerStyles.inputField} placeholder="https://www.example.com" value={kit.website || ''} onChange={e => setKit({...kit, website: e.target.value})} />
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Brand Description</label>
                                <textarea className={BrandKitManagerStyles.inputField} rows={4} placeholder="Describe your brand, products, and mission..." value={kit.targetAudience || ''} onChange={e => setKit({...kit, targetAudience: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                             <h2 className="text-2xl font-bold text-gray-900">Brand DNA</h2>
                             <div className={BrandKitManagerStyles.industryGrid}>
                                {['physical', 'digital', 'realty', 'fashion', 'service'].map(ind => (
                                    <div key={ind} onClick={() => setKit({...kit, industry: ind as any})} className={`${BrandKitManagerStyles.industryCard} ${kit.industry === ind ? BrandKitManagerStyles.industryCardSelected : BrandKitManagerStyles.industryCardInactive}`}>
                                        <p className="font-bold capitalize">{ind}</p>
                                        {kit.industry === ind && <div className={BrandKitManagerStyles.industryCheck}><CheckIcon className="w-3 h-3"/></div>}
                                    </div>
                                ))}
                             </div>
                             <div className="max-w-xl">
                                <label className={BrandKitManagerStyles.inputLabel}>Tone of Voice</label>
                                <select className={BrandKitManagerStyles.selectField} value={kit.toneOfVoice} onChange={e => setKit({...kit, toneOfVoice: e.target.value})}>
                                    {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map(t => <option key={t}>{t}</option>)}
                                </select>
                             </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900">Color Palette</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {['primary', 'secondary', 'accent'].map(key => (
                                    <div key={key}>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{key}</label>
                                        <div className="flex items-center gap-2 p-2 border rounded-xl">
                                            <input type="color" className="w-10 h-10 rounded-lg cursor-pointer" value={(kit.colors as any)?.[key] || '#000000'} onChange={e => setKit({...kit, colors: { ...kit.colors!, [key]: e.target.value }})} />
                                            <span className="text-xs font-mono font-bold">{(kit.colors as any)?.[key]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                            <h2 className="text-2xl font-bold text-gray-900">Typography</h2>
                             <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Heading Font Style</label>
                                <select className={BrandKitManagerStyles.selectField} value={kit.fonts?.heading} onChange={e => setKit({...kit, fonts: {...kit.fonts!, heading: e.target.value}})}>
                                    {['Modern Sans', 'Classic Serif', 'Bold Slab', 'Handwritten', 'Minimal'].map(f => <option key={f}>{f}</option>)}
                                </select>
                             </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-6 animate-fadeIn max-w-xl mx-auto text-center">
                             <h2 className="text-2xl font-bold text-gray-900">Logo Assets</h2>
                             <div className={BrandKitManagerStyles.uploaderBox} onClick={() => wizardLogoRef.current?.click()}>
                                {kit.logos?.primary ? (
                                    <img src={kit.logos.primary} className="max-h-32 object-contain" />
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <UploadIcon className="w-12 h-12 mb-2" />
                                        <span className="text-sm font-bold">Upload Primary Logo</span>
                                    </div>
                                )}
                             </div>
                             <input ref={wizardLogoRef} type="file" className="hidden" onChange={handleLogoUpload} />
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
                                    <input 
                                        className={`w-full p-4 bg-gray-50 border rounded-xl focus:outline-none transition-colors ${kit.competitor?.website && !isValidUrl(kit.competitor.website) ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-amber-500'}`}
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
                                        <span className="text-[10px] text-gray-400 font-medium">{kit.competitor?.adScreenshots?.length || 0} added</span>
                                        <input ref={wizardCompRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompUpload} />
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {kit.competitor?.adScreenshots?.map(ad => (
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

                {/* Footer Navigation */}
                <div className="flex justify-between mt-8">
                     <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-50 transition-all flex items-center gap-2">
                        <ArrowLeftIcon className="w-4 h-4"/> Previous
                     </button>
                     <button onClick={() => setStep(s => Math.min(7, s + 1))} disabled={step === 7} className="px-6 py-3 rounded-xl bg-[#1A1A1E] text-white font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center gap-2">
                        Next <ArrowRightIcon className="w-4 h-4"/>
                     </button>
                </div>

            </div>
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};
