import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, PaletteIcon, 
    CaptionIcon, UserIcon, CheckIcon, BrandKitIcon, 
    CloudUploadIcon // Using generic icon if CloudUpload doesn't exist, will fallback
} from '../components/icons';
import { fileToBase64 } from '../utils/imageUtils';
import { uploadBrandAsset, saveUserBrandKit } from '../firebase';
import ToastNotification from '../components/ToastNotification';

// Elegant Color Input Component with onBlur support
const ColorInput: React.FC<{ 
    label: string; 
    value: string; 
    onChange: (val: string) => void;
    onBlur: () => void;
}> = ({ label, value, onChange, onBlur }) => (
    <div className="group">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block group-hover:text-gray-600 transition-colors">{label}</label>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm group-hover:border-blue-300 group-hover:shadow-md transition-all">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0">
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
                className="text-sm font-mono font-medium text-gray-700 bg-transparent border-none focus:ring-0 w-full uppercase outline-none"
            />
        </div>
    </div>
);

// Premium Asset Uploader
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
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <label className="text-xs font-bold text-gray-700 block">{label}</label>
                    {subLabel && <span className="text-[10px] text-gray-400 font-medium">{subLabel}</span>}
                </div>
            </div>
            
            <div 
                onClick={() => !currentUrl && inputRef.current?.click()}
                className={`group relative flex-1 min-h-[140px] rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden ${
                    currentUrl 
                    ? 'border-gray-200 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] bg-white' 
                    : 'border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 cursor-pointer'
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

export const BrandKitManager: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [kit, setKit] = useState<BrandKit>({
        companyName: '',
        website: '',
        toneOfVoice: 'Professional',
        colors: { primary: '#000000', secondary: '#ffffff', accent: '#3b82f6' },
        fonts: { heading: 'Modern Sans', body: 'Clean Sans' },
        logos: { primary: null, secondary: null, mark: null }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingState, setUploadingState] = useState<{ [key: string]: boolean }>({});
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Load initial data
    useEffect(() => {
        if (auth.user?.brandKit) {
            setKit(auth.user.brandKit);
        }
    }, [auth.user]);

    // Perform the actual save to Firebase and update global context
    const performSave = async (updatedKit: BrandKit) => {
        if (!auth.user) return;
        setIsSaving(true);
        try {
            await saveUserBrandKit(auth.user.uid, updatedKit);
            auth.setUser(prev => prev ? { ...prev, brandKit: updatedKit } : null);
            setLastSaved(new Date());
        } catch (e) {
            console.error("Auto-save failed", e);
            setToast({ msg: "Failed to save changes. Please try again.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    // --- HANDLERS ---

    // 1. Text/Color Fields (Local Update Only)
    const handleTextChange = (field: keyof BrandKit, value: string) => {
        setKit(prev => ({ ...prev, [field]: value }));
    };

    const updateDeepLocal = (section: keyof BrandKit, key: string, value: any) => {
        setKit(prev => ({ ...prev, [section]: { ...(prev[section] as any), [key]: value } }));
    };

    // 2. Commit Changes (Save on Blur)
    const handleSave = () => {
        performSave(kit);
    };

    // 3. Select Fields (Immediate Save)
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

    // 4. Asset Upload (Immediate Save + Feedback)
    const handleUpload = async (key: 'primary' | 'secondary' | 'mark', file: File) => {
        if (!auth.user) return;
        setUploadingState(prev => ({ ...prev, [key]: true }));
        
        try {
            const base64Data = await fileToBase64(file);
            const dataUri = `data:${base64Data.mimeType};base64,${base64Data.base64}`;
            
            const url = await uploadBrandAsset(auth.user.uid, dataUri, key);
            
            // CRITICAL FIX: Use functional update to ensure we don't overwrite if other state changed
            let newKitState: BrandKit | null = null;
            
            setKit(prev => {
                const updated = { ...prev, logos: { ...prev.logos, [key]: url } };
                newKitState = updated;
                return updated;
            });

            // Save the state we just calculated
            if (newKitState) await performSave(newKitState);
            
            setToast({ msg: "Asset uploaded & saved!", type: "success" });

            // Removed Auto-Color Extraction based on user feedback.
            // Colors are now strictly manual.
        } catch (e: any) {
            console.error("Upload failed", e);
            let errorMsg = "Failed to upload asset.";
            if (e.message.includes('permission') || e.code === 'storage/unauthorized') {
                errorMsg = "Permission Denied. Check Storage Rules.";
            }
            setToast({ msg: errorMsg, type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, [key]: false }));
        }
    };

    return (
        <div className="p-6 lg:p-10 max-w-[1400px] mx-auto pb-32 animate-fadeIn">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-4xl font-bold text-[#1A1A1E] flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <BrandKitIcon className="w-8 h-8" />
                        </div>
                        Brand Vault
                    </h1>
                    <p className="text-gray-500 mt-2 text-lg max-w-2xl">
                        Define your visual identity once. MagicPixa will apply it to every generation automatically.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* ENHANCED SAVE INDICATOR */}
                    {isSaving ? (
                        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full border border-indigo-100 shadow-sm transition-all animate-pulse">
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold uppercase tracking-wider">Saving changes...</span>
                        </div>
                    ) : lastSaved ? (
                        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100 shadow-sm transition-all">
                            <CheckIcon className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">All changes saved</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                
                {/* LEFT COLUMN: EDITING AREA (2/3 Width) */}
                {/* We grouped all inputs here for better vertical alignment */}
                <div className="xl:col-span-2 space-y-8">
                    
                    {/* 1. Identity Assets Card */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <ShieldCheckIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">Identity Assets</h2>
                                <p className="text-xs text-gray-500">Upload high-res PNGs for best results.</p>
                            </div>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                    <PaletteIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-800 text-lg">Visual DNA</h2>
                                    <p className="text-xs text-gray-500">Colors and typography.</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                        <label className="text-xs text-gray-500 font-medium block mb-2">Heading Style</label>
                                        <select 
                                            value={kit.fonts.heading}
                                            onChange={(e) => updateDeepImmediate('fonts', 'heading', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-xl p-3 bg-gray-50 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                        >
                                            <option>Modern Sans (Clean)</option>
                                            <option>Classic Serif (Luxury)</option>
                                            <option>Bold Display (Impact)</option>
                                            <option>Elegant Script (Soft)</option>
                                            <option>Minimal Mono (Tech)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium block mb-2">Body Text Style</label>
                                        <select 
                                            value={kit.fonts.body}
                                            onChange={(e) => updateDeepImmediate('fonts', 'body', e.target.value)}
                                            className="w-full text-sm border-gray-200 rounded-xl p-3 bg-gray-50 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
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

                    {/* 3. Brand Context (Moved to Left Column for Alignment) */}
                    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                <CaptionIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-800 text-lg">Brand Voice</h2>
                                <p className="text-xs text-gray-500">How you speak to customers.</p>
                            </div>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Company Name</label>
                                <input 
                                    type="text" 
                                    value={kit.companyName}
                                    onChange={(e) => handleTextChange('companyName', e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="e.g. Skyline Realty"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Website</label>
                                <input 
                                    type="text" 
                                    value={kit.website}
                                    onChange={(e) => handleTextChange('website', e.target.value)}
                                    onBlur={handleSave}
                                    placeholder="e.g. www.skyline.com"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tone of Voice</label>
                                <select 
                                    value={kit.toneOfVoice}
                                    onChange={(e) => handleSelectChange('toneOfVoice', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all cursor-pointer"
                                >
                                    <option>Professional</option>
                                    <option>Luxury</option>
                                    <option>Playful</option>
                                    <option>Urgent / Sales</option>
                                    <option>Friendly / Casual</option>
                                    <option>Technical</option>
                                </select>
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
                        <div className="bg-gradient-to-br from-[#1A1A1E] to-[#2C2C2E] p-1 rounded-3xl shadow-2xl">
                            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[20px] border border-white/10 text-white">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xs font-bold tracking-widest text-white/50 uppercase">Brand Card</h3>
                                    <div className="px-2 py-1 bg-white/10 rounded text-[10px] font-mono">{kit.toneOfVoice}</div>
                                </div>

                                {/* Logo Area */}
                                <div className="h-20 mb-6 flex items-center justify-start border-b border-white/10 pb-6">
                                    {kit.logos.secondary ? (
                                        <img src={kit.logos.secondary} className="h-full w-auto object-contain" alt="Logo Light" />
                                    ) : kit.logos.primary ? (
                                        <img src={kit.logos.primary} className="h-full w-auto object-contain p-1 bg-white rounded" alt="Logo Dark" />
                                    ) : (
                                        <div className="h-16 w-16 bg-white/10 rounded-lg flex items-center justify-center border border-dashed border-white/30 text-white/30">
                                            <UserIcon className="w-8 h-8" />
                                        </div>
                                    )}
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