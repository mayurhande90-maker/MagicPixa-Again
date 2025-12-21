
import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, Page, View, BrandKit } from '../types';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';
import { 
    BrandKitIcon, PlusIcon, TrashIcon, CheckIcon, XIcon, 
    ArrowLeftIcon, ArrowRightIcon, CloudUploadIcon, PaletteIcon, 
    GlobeIcon, MagicWandIcon, LockIcon 
} from '../components/icons';
import { 
    getUserBrands, saveBrandToCollection, deleteBrandFromCollection, 
    activateBrand, uploadBrandAsset 
} from '../firebase';
import { generateBrandIdentity, extractBrandColors } from '../services/brandKitService';
import { fileToBase64 } from '../utils/imageUtils';
import ToastNotification from '../components/ToastNotification';

interface BrandWizardProps {
    initialKit?: BrandKit;
    userId: string;
    onClose: () => void;
    onSave: () => void;
}

const DEFAULT_KIT: BrandKit = {
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
    competitor: undefined
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className={BrandKitManagerStyles.colorInputWrapper}>
            <label className={BrandKitManagerStyles.colorLabel}>{label}</label>
            <div className={BrandKitManagerStyles.colorBox} onClick={() => inputRef.current?.click()}>
                <div className={BrandKitManagerStyles.colorPreview} style={{ backgroundColor: value }}></div>
                <input 
                    type="text" 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className={BrandKitManagerStyles.colorField}
                />
                <input 
                    type="color" 
                    ref={inputRef}
                    value={value} 
                    onChange={(e) => onChange(e.target.value)} 
                    className="opacity-0 w-0 h-0"
                />
            </div>
        </div>
    );
};

const BrandWizard: React.FC<BrandWizardProps> = ({ initialKit, userId, onClose, onSave }) => {
    const [step, setStep] = useState(1);
    const [kit, setKit] = useState<BrandKit>(initialKit || DEFAULT_KIT);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Step 1: Identity
    const [description, setDescription] = useState('');

    const handleAutoGenerate = async () => {
        if (!kit.website && !description) {
            alert("Please enter a website or description to auto-generate.");
            return;
        }
        setIsGenerating(true);
        try {
            const generated = await generateBrandIdentity(kit.website, description);
            setKit(prev => ({ ...prev, ...generated }));
        } catch (e) {
            console.error(e);
            alert("Failed to auto-generate brand identity.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const dataUri = `data:${base64.mimeType};base64,${base64.base64}`;
            
            // Auto-extract colors
            const colors = await extractBrandColors(base64.base64, base64.mimeType);
            
            // Upload to storage
            const url = await uploadBrandAsset(userId, dataUri, 'logo_primary');
            
            setKit(prev => ({ 
                ...prev, 
                logos: { ...prev.logos, primary: url },
                colors: { ...prev.colors, ...colors }
            }));
        }
    };

    const handleNext = () => setStep(prev => Math.min(prev + 1, 8));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
    const handleSkip = () => handleNext();

    const handleFinish = async () => {
        setIsSaving(true);
        try {
            await saveBrandToCollection(userId, kit);
            onSave();
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save brand kit.");
        } finally {
            setIsSaving(false);
        }
    };

    const isStepValid = () => {
        if (step === 1) return !!kit.companyName;
        return true; 
    };

    const renderStepContent = () => {
        switch(step) {
            case 1:
                return (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Brand Identity</h2>
                            <p className="text-gray-500">Let's start with the basics. Pixa can auto-detect details from your website.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Website URL</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="url" 
                                        value={kit.website} 
                                        onChange={e => setKit({...kit, website: e.target.value})}
                                        className={BrandKitManagerStyles.inputField} 
                                        placeholder="https://example.com"
                                    />
                                    <button 
                                        onClick={handleAutoGenerate}
                                        disabled={isGenerating}
                                        className="bg-indigo-50 text-indigo-600 px-4 rounded-xl font-bold text-xs hover:bg-indigo-100 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {isGenerating ? 'Scanning...' : <><MagicWandIcon className="w-4 h-4"/> Auto-Fill</>}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Brand Name</label>
                                <input 
                                    type="text" 
                                    value={kit.companyName} 
                                    onChange={e => setKit({...kit, companyName: e.target.value})}
                                    className={BrandKitManagerStyles.inputField}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>

                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Short Description</label>
                                <textarea 
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className={BrandKitManagerStyles.inputField}
                                    rows={3}
                                    placeholder="What does your brand do?"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Industry & Niche</h2>
                            <p className="text-gray-500">Select the category that best fits your business.</p>
                        </div>
                        <div className={BrandKitManagerStyles.industryGrid}>
                            {['physical', 'digital', 'realty', 'fashion', 'service'].map((ind) => (
                                <button 
                                    key={ind}
                                    onClick={() => setKit({...kit, industry: ind as any})}
                                    className={`${BrandKitManagerStyles.industryCard} ${kit.industry === ind ? BrandKitManagerStyles.industryCardSelected : BrandKitManagerStyles.industryCardInactive}`}
                                >
                                    <span className="capitalize font-bold">{ind}</span>
                                    {kit.industry === ind && <div className={BrandKitManagerStyles.industryCheck}><CheckIcon className="w-3 h-3"/></div>}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 3:
                 return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Tone of Voice</h2>
                            <p className="text-gray-500">How should your brand sound in copy?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map((tone) => (
                                <button 
                                    key={tone}
                                    onClick={() => setKit({...kit, toneOfVoice: tone})}
                                    className={`p-4 rounded-xl border-2 text-sm font-bold transition-all ${kit.toneOfVoice === tone ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    {tone}
                                </button>
                            ))}
                        </div>
                    </div>
                 );
            case 4:
                return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Target Audience</h2>
                            <p className="text-gray-500">Who are you speaking to?</p>
                        </div>
                        <input 
                            type="text"
                            value={kit.targetAudience || ''}
                            onChange={e => setKit({...kit, targetAudience: e.target.value})}
                            className={BrandKitManagerStyles.inputField}
                            placeholder="e.g. Eco-conscious millennials"
                        />
                    </div>
                );
            case 5:
                 return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Visual Constraints</h2>
                            <p className="text-gray-500">What should AI avoid when generating images?</p>
                        </div>
                        <textarea 
                            value={kit.negativePrompts || ''}
                            onChange={e => setKit({...kit, negativePrompts: e.target.value})}
                            className={BrandKitManagerStyles.inputField}
                            rows={4}
                            placeholder="e.g. low quality, blurry, neon colors, cartoon style"
                        />
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Color Palette</h2>
                            <p className="text-gray-500">Define your brand colors.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ColorInput label="Primary" value={kit.colors.primary} onChange={v => setKit({...kit, colors: {...kit.colors, primary: v}})} />
                            <ColorInput label="Secondary" value={kit.colors.secondary} onChange={v => setKit({...kit, colors: {...kit.colors, secondary: v}})} />
                            <ColorInput label="Accent" value={kit.colors.accent} onChange={v => setKit({...kit, colors: {...kit.colors, accent: v}})} />
                        </div>
                    </div>
                );
            case 7:
                 return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Typography</h2>
                            <p className="text-gray-500">Select font styles for AI to emulate.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Heading Style</label>
                                <select 
                                    value={kit.fonts.heading}
                                    onChange={e => setKit({...kit, fonts: {...kit.fonts, heading: e.target.value}})}
                                    className={BrandKitManagerStyles.selectField}
                                >
                                    {['Modern Sans', 'Classic Serif', 'Bold Display', 'Elegant Script', 'Minimal Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={BrandKitManagerStyles.inputLabel}>Body Style</label>
                                <select 
                                    value={kit.fonts.body}
                                    onChange={e => setKit({...kit, fonts: {...kit.fonts, body: e.target.value}})}
                                    className={BrandKitManagerStyles.selectField}
                                >
                                    {['Modern Sans', 'Classic Serif', 'Clean Sans', 'Minimal Mono'].map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                 );
            case 8:
                return (
                    <div className="space-y-6 animate-fadeIn">
                         <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#1A1A1E]">Primary Logo</h2>
                            <p className="text-gray-500">Upload your main logo. We'll extract colors automatically.</p>
                        </div>
                        
                        <div className="flex justify-center">
                            {kit.logos.primary ? (
                                <div className="relative w-64 h-64 bg-white border border-gray-200 rounded-3xl flex items-center justify-center p-8 shadow-sm">
                                    <img src={kit.logos.primary} className="max-w-full max-h-full object-contain" alt="Logo" />
                                    <button 
                                        onClick={() => setKit({...kit, logos: {...kit.logos, primary: null}})}
                                        className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <label className="w-64 h-64 border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all">
                                    <CloudUploadIcon className="w-12 h-12 text-gray-300 mb-4" />
                                    <span className="text-sm font-bold text-gray-500">Upload Logo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                </label>
                            )}
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-4xl h-[85vh] bg-white rounded-[2.5rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col relative">
                
                {/* Header / Progress */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center text-indigo-600">
                            <BrandKitIcon className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 leading-none">Brand Wizard</h1>
                            <div className="flex items-center gap-2 mt-1.5">
                                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out" style={{ width: `${(step / 8) * 100}%` }}></div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 font-bold">Step {step} of 8</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 relative bg-gray-50/50">
                    {renderStepContent()}
                </div>

                {/* Footer Navigation */}
                <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
                    <button 
                        onClick={handleBack}
                        disabled={step === 1}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ArrowLeftIcon className="w-4 h-4" /> Back
                    </button>
                    
                    <div className="flex items-center gap-4">
                            {/* Skip Button: Starts appearing from Step 3 (Target Audience) onwards */}
                            {step >= 3 && step < 8 && (
                                <button onClick={handleSkip} className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors">
                                    Skip for now
                                </button>
                            )}

                            {step === 8 ? (
                                <button 
                                    onClick={handleFinish}
                                    disabled={isSaving}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-indigo-500/20 hover:scale-105 flex items-center gap-2 disabled:opacity-70"
                                >
                                    {isSaving ? 'Saving...' : <><CheckIcon className="w-4 h-4" /> Finish & Save</>}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleNext}
                                    disabled={!isStepValid()} 
                                    className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
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
            </div>
        </div>
    );
};

export const BrandKitManager: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth, navigateTo }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [showWizard, setShowWizard] = useState(false);
    const [editingBrand, setEditingBrand] = useState<BrandKit | undefined>(undefined);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    useEffect(() => {
        if (auth.user) {
            loadBrands();
        }
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

    const handleDelete = async (brand: BrandKit) => {
        if (!auth.user || !brand.id) return;
        if (confirm(`Are you sure you want to delete ${brand.companyName}?`)) {
            try {
                await deleteBrandFromCollection(auth.user.uid, brand.id);
                setBrands(prev => prev.filter(b => b.id !== brand.id));
                setNotification({ msg: "Brand deleted.", type: 'success' });
            } catch (e) {
                setNotification({ msg: "Delete failed.", type: 'error' });
            }
        }
    };

    const handleEdit = (brand: BrandKit) => {
        setEditingBrand(brand);
        setShowWizard(true);
    };

    const handleCreateNew = () => {
        setEditingBrand(undefined);
        setShowWizard(true);
    };

    const handleWizardSave = () => {
        loadBrands();
        setNotification({ msg: editingBrand ? "Brand updated!" : "Brand created!", type: 'success' });
        setShowWizard(false);
        setEditingBrand(undefined);
    };

    const handleActivate = async (brand: BrandKit) => {
        if (!auth.user || !brand.id) return;
        try {
            await activateBrand(auth.user.uid, brand.id);
            // Optimistic update of local user state in auth if possible or just rely on global sync
            // For now, reload brands to reflect active state logic if we add it visual
            setNotification({ msg: `Activated ${brand.companyName}`, type: 'success' });
        } catch (e) {
            setNotification({ msg: "Activation failed", type: 'error' });
        }
    };

    return (
        <div className={BrandKitManagerStyles.container}>
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className={BrandKitManagerStyles.sectionTitle}>Brand Kits</h1>
                    <p className={BrandKitManagerStyles.sectionSubtitle}>Manage your brand identities for consistent AI generation.</p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                >
                    <PlusIcon className="w-5 h-5"/> New Brand Kit
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : brands.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-100">
                        <BrandKitIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Brand Kits Yet</h3>
                    <p className="text-gray-500 max-w-sm mx-auto mb-8">Create a brand kit to auto-apply your logo, colors, and tone to every generation.</p>
                    <button onClick={handleCreateNew} className="text-indigo-600 font-bold hover:underline">Create First Brand</button>
                </div>
            ) : (
                <div className={BrandKitManagerStyles.brandGrid}>
                    {brands.map(brand => (
                        <div key={brand.id} className={BrandKitManagerStyles.brandCard} onClick={() => handleEdit(brand)}>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(brand); }}
                                className={BrandKitManagerStyles.deleteBtn}
                            >
                                <TrashIcon className="w-4 h-4"/>
                            </button>
                            
                            <div className={BrandKitManagerStyles.brandCardHeader}>
                                {brand.logos.primary ? (
                                    <img src={brand.logos.primary} className={BrandKitManagerStyles.brandCardLogo} alt="Logo" />
                                ) : (
                                    <span className={BrandKitManagerStyles.brandCardFallback}>
                                        {(brand.companyName || 'UB').substring(0, 2)}
                                    </span>
                                )}
                            </div>
                            
                            <div className={BrandKitManagerStyles.brandCardBody}>
                                <div>
                                    <h3 className={BrandKitManagerStyles.brandCardTitle}>{brand.companyName || 'Untitled Brand'}</h3>
                                    <p className={BrandKitManagerStyles.brandCardMeta}>{brand.industry}</p>
                                </div>
                                <div className={BrandKitManagerStyles.brandCardPalette}>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.primary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.secondary }}></div>
                                    <div className={BrandKitManagerStyles.brandCardSwatch} style={{ backgroundColor: brand.colors.accent }}></div>
                                </div>
                            </div>
                            
                            {/* Activation Button if not active logic can be added here */}
                        </div>
                    ))}
                    
                    {/* Add New Card in Grid */}
                    <div className={BrandKitManagerStyles.addCard} onClick={handleCreateNew}>
                        <div className={BrandKitManagerStyles.addCardIcon}>
                            <PlusIcon className="w-8 h-8"/>
                        </div>
                        <span className={BrandKitManagerStyles.addCardText}>Create New</span>
                    </div>
                </div>
            )}

            {showWizard && auth.user && (
                <BrandWizard 
                    initialKit={editingBrand} 
                    userId={auth.user.uid} 
                    onClose={() => setShowWizard(false)} 
                    onSave={handleWizardSave} 
                />
            )}

            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </div>
    );
};
