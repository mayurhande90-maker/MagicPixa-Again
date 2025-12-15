
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, PaletteIcon, 
    CaptionIcon, BrandKitIcon, 
    PlusIcon, MagicWandIcon, ChevronDownIcon, TrashIcon,
    SparklesIcon, CheckIcon
} from '../components/icons';
import { fileToBase64 } from '../utils/imageUtils';
import { uploadBrandAsset, saveUserBrandKit, getUserBrands, deleteBrandFromCollection } from '../firebase';
import { generateBrandIdentity } from '../services/brandKitService';
import ToastNotification from '../components/ToastNotification';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';

// --- SUB-COMPONENTS (ISOLATED) ---

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
}> = ({ label, subLabel, currentUrl, onUpload, onRemove, isLoading }) => {
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
                onClick={() => !currentUrl && inputRef.current?.click()}
                className={`${BrandKitManagerStyles.uploaderBox} ${
                    currentUrl ? BrandKitManagerStyles.uploaderBoxFilled : BrandKitManagerStyles.uploaderBoxEmpty
                }`}
            >
                {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        <span className="text-xs text-indigo-500 font-medium">Uploading...</span>
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
                        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG (Max 5MB)</p>
                    </div>
                )}
            </div>
            <input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleChange} />
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
                
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                        <MagicWandIcon className="w-8 h-8 text-white animate-pulse" />
                    </div>
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
                        className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><SparklesIcon className="w-5 h-5"/> Generate Magic Kit</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const BrandKitManager: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
    const [kit, setKit] = useState<BrandKit>({
        companyName: '',
        website: '',
        toneOfVoice: 'Professional',
        targetAudience: '',
        negativePrompts: '',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showMagicModal, setShowMagicModal] = useState(false);
    const [isMagicGen, setIsMagicGen] = useState(false);
    const [showBrandMenu, setShowBrandMenu] = useState(false);

    useEffect(() => {
        if (auth.user) {
            loadBrands();
        }
    }, [auth.user]);

    const loadBrands = async () => {
        if (!auth.user) return;
        try {
            const userBrands = await getUserBrands(auth.user.uid);
            
            if (userBrands.length === 0 && auth.user.brandKit) {
                const defaultKit = { ...auth.user.brandKit, name: 'Default Brand', id: 'default' };
                setBrands([defaultKit]);
                setKit(defaultKit);
                setActiveBrandId('default');
            } else if (userBrands.length > 0) {
                setBrands(userBrands);
                const currentId = auth.user.brandKit?.id;
                const active = userBrands.find(b => b.id === currentId) || userBrands[0];
                setKit(active);
                setActiveBrandId(active.id || null);
            } else {
                const newBrand = createEmptyBrand('My Brand');
                setBrands([newBrand]);
                setKit(newBrand);
                setActiveBrandId('new');
            }
        } catch (e) {
            console.error("Failed to load brands", e);
        }
    };

    const createEmptyBrand = (name: string): BrandKit => ({
        name,
        companyName: '',
        website: '',
        toneOfVoice: 'Professional',
        targetAudience: '',
        negativePrompts: '',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null }
    });

    const handleSwitchBrand = (brand: BrandKit) => {
        setKit(brand);
        setActiveBrandId(brand.id || null);
        setShowBrandMenu(false);
    };

    const handleAddBrand = () => {
        const newBrand = createEmptyBrand(`Brand ${brands.length + 1}`);
        setBrands(prev => [...prev, newBrand]);
        setKit(newBrand);
        setActiveBrandId(null);
        setShowBrandMenu(false);
    };

    const handleDeleteBrand = async (brandId: string) => {
        if (!auth.user || !brandId) return;
        if (!confirm("Delete this brand profile?")) return;
        
        try {
            await deleteBrandFromCollection(auth.user.uid, brandId);
            const remaining = brands.filter(b => b.id !== brandId);
            setBrands(remaining);
            if (remaining.length > 0) {
                handleSwitchBrand(remaining[0]);
            } else {
                handleAddBrand();
            }
            setToast({ msg: "Brand deleted.", type: "success" });
        } catch(e) {
            console.error(e);
            setToast({ msg: "Delete failed.", type: "error" });
        }
    };

    const performSave = async (updatedKit: BrandKit) => {
        if (!auth.user) return;
        setIsSaving(true);
        try {
            const savedKit = await saveUserBrandKit(auth.user.uid, updatedKit);
            
            setKit(savedKit as BrandKit);
            setActiveBrandId(savedKit?.id || null);
            
            setBrands(prev => {
                const idx = prev.findIndex(b => b.id === savedKit?.id);
                if (idx >= 0) {
                    const newArr = [...prev];
                    newArr[idx] = savedKit as BrandKit;
                    return newArr;
                } else {
                    return [...prev.filter(b => b.id && b.id !== savedKit?.id), savedKit as BrandKit];
                }
            });

            auth.setUser(prev => prev ? { ...prev, brandKit: savedKit as BrandKit } : null);
            setLastSaved(new Date());
        } catch (e) {
            console.error("Auto-save failed", e);
            setToast({ msg: "Failed to save changes. Please try again.", type: "error" });
        } finally {
            setIsSaving(false);
        }
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
        setKit(prev => {
            const updated = { ...prev, [field]: value };
            performSave(updated);
            return updated;
        });
    };

    const updateDeepImmediate = (section: keyof BrandKit, key: string, value: any) => {
        setKit(prev => {
            const updated = { ...prev, [section]: { ...(prev[section] as any), [key]: value } };
            performSave(updated);
            return updated;
        });
    };

    const handleUpload = async (key: 'primary' | 'secondary' | 'mark', file: File) => {
        if (!auth.user) return;
        
        setUploadingState(prev => ({ ...prev, [key]: true }));
        try {
            const base64Data = await fileToBase64(file);
            const dataUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
            
            const url = await uploadBrandAsset(auth.user.uid, dataUri, key);
            
            let newKitState: BrandKit | null = null;
            setKit(prev => {
                const updated = { ...prev, logos: { ...prev.logos, [key]: url } };
                newKitState = updated;
                return updated;
            });

            if (newKitState) await performSave(newKitState);
            setToast({ msg: "Asset uploaded & saved!", type: "success" });

        } catch (e: any) {
            console.error("Upload failed", e);
            setToast({ msg: "Failed to upload asset.", type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleMagicGenerate = async (url: string, desc: string) => {
        setIsMagicGen(true);
        try {
            const generated = await generateBrandIdentity(url, desc);
            const newKit = { ...kit, ...generated };
            setKit(newKit);
            await performSave(newKit);
            setToast({ msg: "Brand identity generated!", type: "success" });
            setShowMagicModal(false);
        } catch (e) {
            console.error(e);
            setToast({ msg: "Generation failed.", type: "error" });
        } finally {
            setIsMagicGen(false);
        }
    };

    return (
        <div className={BrandKitManagerStyles.container}>
            {/* Header Section */}
            <div className={BrandKitManagerStyles.headerContainer}>
                <div>
                    <div className={BrandKitManagerStyles.headerTitleWrapper}>
                        <div className={BrandKitManagerStyles.headerIconBox}>
                            <BrandKitIcon className="w-8 h-8" />
                        </div>
                        
                        {/* Brand Switcher */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowBrandMenu(!showBrandMenu)}
                                className={BrandKitManagerStyles.headerTitle}
                            >
                                {kit.name || kit.companyName || "Untitled Brand"}
                                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                            </button>
                            
                            {showBrandMenu && (
                                <div className={BrandKitManagerStyles.menuDropdown}>
                                    <div className={BrandKitManagerStyles.menuHeader}>Select Brand</div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {brands.map((b, i) => (
                                            <div key={i} className={BrandKitManagerStyles.menuItem}>
                                                <button onClick={() => handleSwitchBrand(b)} className={BrandKitManagerStyles.menuItemText}>
                                                    {b.name || b.companyName || "Untitled"}
                                                </button>
                                                {b.id && brands.length > 1 && (
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBrand(b.id!); }} className="p-1 text-gray-400 hover:text-red-500">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={handleAddBrand} className={BrandKitManagerStyles.menuAddBtn}>
                                        <PlusIcon className="w-4 h-4"/> Create New Brand
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <p className={BrandKitManagerStyles.headerSubtitle}>Manage your visual identity.</p>
                        <button onClick={() => setShowMagicModal(true)} className={BrandKitManagerStyles.autoFillBtn}>
                            <MagicWandIcon className="w-3 h-3"/> Auto-Fill with AI
                        </button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {isSaving ? (
                        <div className={BrandKitManagerStyles.saveIndicator}>
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Saving...</span>
                        </div>
                    ) : lastSaved ? (
                        <div className={BrandKitManagerStyles.syncedIndicator}>
                            <CheckIcon className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Synced</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: EDITING AREA (2/3 Width) */}
                <div className="xl:col-span-2 space-y-8">
                    
                    {/* 1. Identity Assets Card */}
                    <div className={BrandKitManagerStyles.card}>
                        <div className={BrandKitManagerStyles.cardHeader}>
                            <div className={`bg-blue-100 text-blue-600 ${BrandKitManagerStyles.cardIconBox}`}>
                                <ShieldCheckIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className={BrandKitManagerStyles.cardTitle}>Identity Assets</h2>
                                <p className={BrandKitManagerStyles.cardDesc}>Upload high-res PNGs.</p>
                            </div>
                        </div>
                        
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 ${BrandKitManagerStyles.cardContent}`}>
                            <AssetUploader 
                                label="Primary Logo" 
                                subLabel="Dark / Colored"
                                currentUrl={kit.logos.primary} 
                                onUpload={(f) => handleUpload('primary', f)} 
                                onRemove={() => {
                                    setKit(prev => {
                                        const updated = { ...prev, logos: { ...prev.logos, primary: null } };
                                        performSave(updated);
                                        return updated;
                                    });
                                }}
                                isLoading={uploadingState['primary']}
                            />
                            <AssetUploader 
                                label="Secondary Logo" 
                                subLabel="Light / White"
                                currentUrl={kit.logos.secondary} 
                                onUpload={(f) => handleUpload('secondary', f)} 
                                onRemove={() => {
                                    setKit(prev => {
                                        const updated = { ...prev, logos: { ...prev.logos, secondary: null } };
                                        performSave(updated);
                                        return updated;
                                    });
                                }}
                                isLoading={uploadingState['secondary']}
                            />
                            <AssetUploader 
                                label="Brand Mark" 
                                subLabel="Icon / Favicon"
                                currentUrl={kit.logos.mark} 
                                onUpload={(f) => handleUpload('mark', f)} 
                                onRemove={() => {
                                    setKit(prev => {
                                        const updated = { ...prev, logos: { ...prev.logos, mark: null } };
                                        performSave(updated);
                                        return updated;
                                    });
                                }}
                                isLoading={uploadingState['mark']}
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
                            {/* Colors */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Color Palette
                                </h3>
                                <div className="space-y-4">
                                    <ColorInput 
                                        label="Primary (Brand Color)" 
                                        value={kit.colors.primary} 
                                        onChange={(v) => updateDeepLocal('colors', 'primary', v)}
                                        onBlur={handleSave}
                                    />
                                    <ColorInput 
                                        label="Secondary (Backgrounds)" 
                                        value={kit.colors.secondary} 
                                        onChange={(v) => updateDeepLocal('colors', 'secondary', v)} 
                                        onBlur={handleSave}
                                    />
                                    <ColorInput 
                                        label="Accent (CTAs / Highlights)" 
                                        value={kit.colors.accent} 
                                        onChange={(v) => updateDeepLocal('colors', 'accent', v)} 
                                        onBlur={handleSave}
                                    />
                                </div>
                            </div>
                            
                            {/* Typography */}
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

                    {/* 3. Brand Strategy (Expanded) */}
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
                                    <label className={BrandKitManagerStyles.inputLabel}>Profile Name</label>
                                    <input 
                                        type="text" 
                                        value={kit.name || ''}
                                        onChange={(e) => handleTextChange('name', e.target.value)}
                                        onBlur={handleSave}
                                        placeholder="e.g. Summer Campaign"
                                        className={BrandKitManagerStyles.inputField}
                                    />
                                </div>
                                <div>
                                    <label className={BrandKitManagerStyles.inputLabel}>Company Name</label>
                                    <input 
                                        type="text" 
                                        value={kit.companyName}
                                        onChange={(e) => handleTextChange('companyName', e.target.value)}
                                        onBlur={handleSave}
                                        placeholder="e.g. Skyline Realty"
                                        className={BrandKitManagerStyles.inputField}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website</label>
                                <input 
                                    type="text" 
                                    value={kit.website}
                                    onChange={(e) => handleTextChange('website', e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="e.g. www.skyline.com"
                                    className={BrandKitManagerStyles.inputField}
                                />
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
                                        onBlur={handleSave}
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
                                    onBlur={handleSave}
                                    placeholder="e.g. No cartoons, no neon colors, no clutter"
                                    className={BrandKitManagerStyles.inputField}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: PREVIEW (Sticky) */}
                <div className="space-y-8">
                    {/* LIVE PREVIEW CARD */}
                    <div className="sticky top-8">
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
                                                    <span className="text-[9px] font-bold uppercase block mt-1">No Primary</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Dark Theme Context */}
                                        <div className={`bg-[#121212] border border-white/10 ${BrandKitManagerStyles.previewLogoBox}`}>
                                            <span className="absolute top-2 left-3 text-[9px] font-bold text-gray-600 uppercase tracking-wider">On Dark</span>
                                            {kit.logos.secondary ? (
                                                <img src={kit.logos.secondary} className="w-full h-full object-contain" alt="Secondary Logo" />
                                            ) : (
                                                <div className="text-gray-800 text-center">
                                                    <span className="text-[9px] font-bold uppercase block mt-1">No Secondary</span>
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
                        <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
                            These settings will be automatically applied<br/>when you generate new content.
                        </p>
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

            {toast && (
                <ToastNotification 
                    message={toast.msg} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </div>
    );
};
