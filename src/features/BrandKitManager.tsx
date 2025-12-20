
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
import { fileToBase64, urlToBase64 } from '../utils/imageUtils';
import { uploadBrandAsset, saveUserBrandKit, deleteBrandFromCollection, subscribeToUserBrands } from '../firebase';
import { generateBrandIdentity, processLogoAsset, analyzeCompetitorStrategy } from '../services/brandKitService';
import ToastNotification from '../components/ToastNotification';
import { BrandKitManagerStyles } from '../styles/features/BrandKitManager.styles';

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
        icon: BuildingIcon,
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

// --- BRAND CREATION WIZARD ---
const BrandCreationWizard: React.FC<{ 
    onClose: () => void; 
    onComplete: (kit: BrandKit) => Promise<void>;
    userId: string;
}> = ({ onClose, onComplete, userId }) => {
    const [step, setStep] = useState(0);
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
    
    // Auto-Gen State
    const [magicUrl, setMagicUrl] = useState('');
    const [magicDesc, setMagicDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Manual Flow Steps:
    // 0: Fork (Magic vs Manual)
    // 1: Identity (Name & Industry)
    // 2: Strategy (Web & Tone)
    // 3: Audience (Target & Negative)
    // 4: Visuals (Colors & Fonts)
    // 5: Assets (Logo)
    // 6: Success
    const TOTAL_STEPS = 6;

    const handleMagicGenerate = async () => {
        if (!magicUrl && !magicDesc) return;
        setIsGenerating(true);
        try {
            const generated = await generateBrandIdentity(magicUrl, magicDesc);
            setKit(prev => ({ ...prev, ...generated }));
            // Skip to final step or review? Let's go to step 4 (Visuals) so they can tweak colors/fonts
            setStep(4);
        } catch (e) {
            console.error(e);
            alert("Auto-generation failed. Please try manual mode.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
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
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            try {
                const base64Data = await fileToBase64(file);
                // Process (remove bg if jpg)
                const processedUri = await processLogoAsset(base64Data.base64, base64Data.mimeType);
                // Upload
                const url = await uploadBrandAsset(userId, processedUri, 'primary');
                setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: url } }));
            } catch (err) {
                console.error(err);
                alert("Logo upload failed.");
            }
        }
    };

    // Render Steps
    const renderStepContent = () => {
        switch (step) {
            case 0: // FORK
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-stretch">
                        {/* Option A: Magic */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-xl transition-all duration-300">
                            <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                <SparklesIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Magic Auto-Pilot</h3>
                            <p className="text-sm text-gray-600 mb-6">Enter a URL or description. AI will analyze your niche and generate the full kit instantly.</p>
                            
                            <div className="w-full space-y-3 mt-auto relative z-10">
                                <input 
                                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Website (e.g. nike.com)"
                                    value={magicUrl}
                                    onChange={e => setMagicUrl(e.target.value)}
                                />
                                <textarea 
                                    className="w-full p-3 bg-white border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                                    placeholder="Or describe your brand..."
                                    value={magicDesc}
                                    onChange={e => setMagicDesc(e.target.value)}
                                />
                                <button 
                                    onClick={handleMagicGenerate}
                                    disabled={isGenerating || (!magicUrl && !magicDesc)}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><LightningIcon className="w-4 h-4"/> Auto-Generate</>}
                                </button>
                            </div>
                        </div>

                        {/* Option B: Manual */}
                        <button 
                            onClick={() => setStep(1)}
                            className="bg-white p-8 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 group"
                        >
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 text-gray-400 group-hover:text-gray-600 group-hover:scale-110 transition-transform">
                                <PaletteIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Manual Crafting</h3>
                            <p className="text-sm text-gray-500 max-w-xs">Build your brand step-by-step. Perfect for granular control over colors, fonts, and assets.</p>
                            <span className="mt-8 px-6 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-bold group-hover:bg-gray-200 transition-colors">Start Wizard &rarr;</span>
                        </button>
                    </div>
                );

            case 1: // IDENTITY
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Identity</h2>
                            <p className="text-gray-500">Let's start with the basics.</p>
                        </div>
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Brand Name</label>
                                <input 
                                    className="w-full text-2xl font-black p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 placeholder-gray-300"
                                    placeholder="e.g. Acme Corp"
                                    value={kit.companyName}
                                    onChange={e => setKit({...kit, companyName: e.target.value})}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-4">Industry / Niche</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {Object.entries(INDUSTRY_CONFIG).map(([k, conf]) => (
                                        <button
                                            key={k}
                                            onClick={() => setKit({...kit, industry: k as IndustryType})}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${kit.industry === k ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/20' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${kit.industry === k ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <conf.icon className="w-4 h-4" />
                                            </div>
                                            <p className={`text-xs font-bold ${kit.industry === k ? 'text-indigo-900' : 'text-gray-700'}`}>{conf.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 2: // STRATEGY
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Digital Presence</h2>
                            <p className="text-gray-500">Where does your brand live?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Website URL</label>
                                <input 
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                                    placeholder="www.yourbrand.com"
                                    value={kit.website}
                                    onChange={e => setKit({...kit, website: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tone of Voice</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setKit({...kit, toneOfVoice: t})}
                                            className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${kit.toneOfVoice === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
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
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Target Audience</h2>
                            <p className="text-gray-500">Who are we talking to?</p>
                        </div>
                        <div className="max-w-xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Primary Customer</label>
                                <input 
                                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Gen-Z Gamers, Busy Moms, Tech CEOs"
                                    value={kit.targetAudience}
                                    onChange={e => setKit({...kit, targetAudience: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Negative Constraints</label>
                                <p className="text-xs text-gray-400 mb-2">Things AI should NEVER generate (e.g. cartoons, neon colors)</p>
                                <input 
                                    className="w-full p-4 bg-red-50/50 border border-red-100 rounded-xl focus:border-red-300 outline-none text-red-800 placeholder-red-300"
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
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Visual DNA</h2>
                            <p className="text-gray-500">Define the look and feel.</p>
                        </div>
                        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Color Palette</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.primary} onChange={e => setKit({...kit, colors: {...kit.colors, primary: e.target.value}})} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-xs font-bold text-gray-700">Primary</p><p className="text-[10px] text-gray-400 uppercase">{kit.colors.primary}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.secondary} onChange={e => setKit({...kit, colors: {...kit.colors, secondary: e.target.value}})} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-xs font-bold text-gray-700">Secondary</p><p className="text-[10px] text-gray-400 uppercase">{kit.colors.secondary}</p></div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={kit.colors.accent} onChange={e => setKit({...kit, colors: {...kit.colors, accent: e.target.value}})} className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent"/>
                                        <div><p className="text-xs font-bold text-gray-700">Accent</p><p className="text-[10px] text-gray-400 uppercase">{kit.colors.accent}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Typography</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Headings</label>
                                        <select value={kit.fonts.heading} onChange={e => setKit({...kit, fonts: {...kit.fonts, heading: e.target.value}})} className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm font-bold outline-none">
                                            <option>Modern Sans</option><option>Classic Serif</option><option>Bold Display</option><option>Elegant Script</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Body</label>
                                        <select value={kit.fonts.body} onChange={e => setKit({...kit, fonts: {...kit.fonts, body: e.target.value}})} className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm outline-none">
                                            <option>Clean Sans</option><option>Readable Serif</option><option>System Default</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 5: // ASSETS
                return (
                    <div className="space-y-8 animate-[slideIn_0.5s_ease-out]">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Brand Assets</h2>
                            <p className="text-gray-500">Upload your logo to finalize the identity.</p>
                        </div>
                        <div className="max-w-md mx-auto">
                            <div className="bg-white p-8 rounded-3xl border-2 border-dashed border-indigo-100 hover:border-indigo-300 transition-colors text-center relative group">
                                {kit.logos.primary ? (
                                    <div className="relative">
                                        <img src={kit.logos.primary} className="max-h-40 mx-auto object-contain" />
                                        <button onClick={() => setKit({...kit, logos: {...kit.logos, primary: null}})} className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1.5 rounded-full hover:bg-red-200"><XIcon className="w-4 h-4"/></button>
                                    </div>
                                ) : (
                                    <div onClick={() => document.getElementById('wizard-logo-upload')?.click()} className="cursor-pointer py-10">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <UploadIcon className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-indigo-900">Upload Main Logo</p>
                                        <p className="text-xs text-gray-400 mt-1">PNG (Transparent) Recommended</p>
                                    </div>
                                )}
                                <input id="wizard-logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-white/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-5xl h-[85vh] bg-white rounded-[2.5rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col relative">
                
                {/* Header / Progress */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <BrandKitIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-gray-900 leading-none">Brand Wizard</h1>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Step {step} of {TOTAL_STEPS}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Bar */}
                {step > 0 && (
                    <div className="w-full h-1 bg-gray-100">
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500 ease-out" 
                            style={{ width: `${(step / 5) * 100}%` }}
                        ></div>
                    </div>
                )}

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 relative">
                    {renderStepContent()}
                </div>

                {/* Footer Navigation */}
                {step > 0 && (
                    <div className="px-8 py-6 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={handleBack}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors flex items-center gap-2"
                        >
                            <ArrowLeftIcon className="w-4 h-4" /> Back
                        </button>
                        
                        <div className="flex gap-3">
                             <button 
                                onClick={handleFinish}
                                disabled={isSaving}
                                className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                                    step === 5 
                                    ? 'bg-[#1A1A1E] text-white hover:bg-black hover:scale-105' 
                                    : 'bg-white border border-gray-200 text-gray-400 cursor-not-allowed hidden' // Only show finish on last step or maybe allow early finish?
                                }`}
                            >
                                {isSaving ? 'Saving...' : <><CheckIcon className="w-4 h-4" /> Finish & Save</>}
                            </button>

                            {step < 5 && (
                                <button 
                                    onClick={handleNext}
                                    disabled={!kit.companyName && step === 1} // Basic validation example
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        moodBoard: []
    });
    
    const [isAutoDetected, setIsAutoDetected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
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
                return { id: tempId, name: file.name.split('.')[0] || `New ${industryConf.itemLabel}`, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, products: [...(prev.products || []), ...newProducts] }));
            setToast({ msg: `${newProducts.length} items added.`, type: "success" });
        } catch (error: any) { console.error("Product upload failed", error); setToast({ msg: "Failed to upload items.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, products: false })); e.target.value = ''; }
    };
    const deleteProduct = (id: string) => setKit(prev => ({ ...prev, products: prev.products?.filter(p => p.id !== id) || [] }));
    const updateProductName = (id: string, newName: string) => setKit(prev => ({ ...prev, products: prev.products?.map(p => p.id === id ? { ...p, name: newName } : p) || [] }));
    
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
                return { id: tempId, imageUrl: url };
            }));
            setKit(prev => ({ ...prev, moodBoard: [...(prev.moodBoard || []), ...newItems] }));
            setToast({ msg: `${newItems.length} images added.`, type: "success" });
        } catch (error: any) { console.error("Mood upload failed", error); setToast({ msg: "Failed to upload images.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, mood: false })); e.target.value = ''; }
    };
    const deleteMoodItem = (id: string) => setKit(prev => ({ ...prev, moodBoard: prev.moodBoard?.filter(m => m.id !== id) || [] }));

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
            setKit(prev => ({ ...prev, competitor: { ...prev.competitor || { website: '', adScreenshots: [] }, adScreenshots: [...(prev.competitor?.adScreenshots || []), ...newItems] } }));
            setToast({ msg: `${newItems.length} screenshots added.`, type: "success" });
        } catch (error: any) { console.error(error); setToast({ msg: "Upload failed.", type: "error" }); } finally { setUploadingState(prev => ({ ...prev, competitor: false })); e.target.value = ''; }
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
                    <div className={`w-2 h-2 rounded-full ${isLimitReached ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
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
                    {/* Re-trigger Wizard for edits? Maybe simpler to just let them edit manually here. Wizard is for creation flow primarily. */}
                    {/* <button onClick={() => setShowCreationWizard(true)} className={BrandKitManagerStyles.magicBtn}>Restart Wizard</button> */}
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
                                <div className={`grid grid-cols-1 gap-6 ${BrandKitManagerStyles.cardContent}`}><AssetUploader label="Main Logo" subLabel="Auto-Processed" currentUrl={kit.logos.primary} onUpload={(f) => handleUpload('primary', f)} onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: null } }))} isLoading={uploadingState['primary']} isProcessing={processingState['primary']} /></div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-purple-100 text-purple-600 ${BrandKitManagerStyles.cardIconBox}`}><PaletteIcon className="w-5 h-5" /></div><div><h2 className={BrandKitManagerStyles.cardTitle}>Visual DNA</h2><p className={BrandKitManagerStyles.cardDesc}>Colors and typography.</p></div></div>
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-10 ${BrandKitManagerStyles.cardContent}`}>
                                    <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span> Color Palette</h3><div className="space-y-4"><ColorInput label="Primary (Brand Color)" value={kit.colors.primary} onChange={(v) => updateDeepLocal('colors', 'primary', v)} onBlur={() => {}} /><ColorInput label="Secondary (Backgrounds)" value={kit.colors.secondary} onChange={(v) => updateDeepLocal('colors', 'secondary', v)} onBlur={() => {}} /><ColorInput label="Accent (CTAs / Highlights)" value={kit.colors.accent} onChange={(v) => updateDeepLocal('colors', 'accent', v)} onBlur={() => {}} /></div></div>
                                    <div><h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> Typography</h3><div className="space-y-5"><div><label className={BrandKitManagerStyles.inputLabel}>Heading Style</label><select value={kit.fonts.heading} onChange={(e) => updateDeepImmediate('fonts', 'heading', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Modern Sans (Clean)</option><option>Classic Serif (Luxury)</option><option>Bold Display (Impact)</option><option>Elegant Script (Soft)</option><option>Minimal Mono (Tech)</option></select></div><div><label className={BrandKitManagerStyles.inputLabel}>Body Text Style</label><select value={kit.fonts.body} onChange={(e) => updateDeepImmediate('fonts', 'body', e.target.value)} className={BrandKitManagerStyles.selectField}><option>Clean Sans (Readable)</option><option>Readable Serif (Traditional)</option><option>System Default (Neutral)</option></select></div></div></div>
                                </div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-${industryConf.color}-100 text-${industryConf.color}-600 ${BrandKitManagerStyles.cardIconBox}`}><industryConf.icon className="w-5 h-5" /></div><div className="flex-1"><h2 className={BrandKitManagerStyles.cardTitle}>{industryConf.catalogTitle}</h2><p className={BrandKitManagerStyles.cardDesc}>{industryConf.catalogDesc}</p></div><button onClick={() => productInputRef.current?.click()} disabled={uploadingState['products']} className={`bg-${industryConf.color}-50 text-${industryConf.color}-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-${industryConf.color}-100 transition-colors flex items-center gap-1.5`}>{uploadingState['products'] ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> {industryConf.btn}</>}</button><input ref={productInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleProductUpload} /></div>
                                <div className={`${BrandKitManagerStyles.cardContent}`}>{(!kit.products || kit.products.length === 0) ? (<div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200"><p className="text-sm text-gray-400 font-medium">No items added yet.</p></div>) : (<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">{kit.products.map(product => (<ProductItem key={product.id} item={product} placeholder={industryConf.itemLabel} onDelete={() => deleteProduct(product.id)} onNameChange={(name) => updateProductName(product.id, name)} />))}</div>)}</div>
                            </div>

                            <div className={BrandKitManagerStyles.card}>
                                <div className={BrandKitManagerStyles.cardHeader}><div className={`bg-pink-100 text-pink-600 ${BrandKitManagerStyles.cardIconBox}`}><LightbulbIcon className="w-5 h-5" /></div><div className="flex-1"><h2 className={BrandKitManagerStyles.cardTitle}>Mood Board</h2><p className={BrandKitManagerStyles.cardDesc}>Upload inspiration for AI style matching.</p></div><button onClick={() => moodInputRef.current?.click()} disabled={uploadingState['mood']} className="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors flex items-center gap-1.5">{uploadingState['mood'] ? 'Uploading...' : <><PlusIcon className="w-3 h-3" /> Add Image</>}</button><input ref={moodInputRef} type="file" className="hidden" accept="image/*" multiple onChange={handleMoodUpload} /></div>
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
                                            <div className="flex justify-between items-center mb-2"><label className={BrandKitManagerStyles.inputLabel}>Competitor Ad Screenshots</label><button onClick={() => competitorAdRef.current?.click()} disabled={uploadingState['competitor']} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">{uploadingState['competitor'] ? 'Uploading...' : <><PlusIcon className="w-3 h-3"/> Add Image</>}</button><input ref={competitorAdRef} type="file" className="hidden" accept="image/*" multiple onChange={handleCompetitorAdUpload} /></div>
                                            {(!kit.competitor?.adScreenshots || kit.competitor.adScreenshots.length === 0) ? (<div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50"><p className="text-xs text-gray-400">Upload screenshots of their ads or social posts.</p></div>) : (<div className="grid grid-cols-3 gap-2">{kit.competitor.adScreenshots.map(ad => (<div key={ad.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-100"><img src={ad.imageUrl} className="w-full h-full object-cover" /><button onClick={() => deleteCompetitorAd(ad.id)} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50"><XIcon className="w-3 h-3" /></button></div>))}</div>)}
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
