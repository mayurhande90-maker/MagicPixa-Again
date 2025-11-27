import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, BrandKit, User } from '../types';
import { 
    ShieldCheckIcon, UploadIcon, XIcon, SparklesIcon, PaletteIcon, 
    CaptionIcon, UserIcon, CheckIcon, BrandKitIcon
} from '../components/icons';
import { fileToBase64 } from '../utils/imageUtils';
import { uploadBrandAsset, saveUserBrandKit } from '../firebase';
import { extractBrandColors } from '../services/brandKitService';
import ToastNotification from '../components/ToastNotification';

const ColorInput: React.FC<{ 
    label: string; 
    value: string; 
    onChange: (val: string) => void 
}> = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
            <input 
                type="color" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0" 
            />
            <input 
                type="text" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
                className="text-xs font-mono text-gray-600 bg-transparent border-none focus:ring-0 w-20 uppercase"
            />
        </div>
    </div>
);

const AssetUploader: React.FC<{
    label: string;
    currentUrl: string | null;
    onUpload: (file: File) => void;
    onRemove: () => void;
    isLoading: boolean;
}> = ({ label, currentUrl, onUpload, onRemove, isLoading }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            onUpload(e.target.files[0]);
        }
        e.target.value = '';
    };

    return (
        <div className="relative group">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
            <div 
                onClick={() => !currentUrl && inputRef.current?.click()}
                className={`w-full h-32 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center relative overflow-hidden ${
                    currentUrl 
                    ? 'border-green-200 bg-white' 
                    : 'border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50 cursor-pointer'
                }`}
            >
                {isLoading ? (
                    <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
                ) : currentUrl ? (
                    <>
                        <img src={currentUrl} className="max-w-full max-h-full object-contain p-2" alt={label} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="bg-white/90 p-2 rounded-full text-red-500 hover:text-red-700 shadow-lg transform hover:scale-110 transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center p-4">
                        <UploadIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 font-medium">Click to Upload</p>
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
    const [isExtractingColors, setIsExtractingColors] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // Load initial data
    useEffect(() => {
        if (auth.user?.brandKit) {
            setKit(auth.user.brandKit);
        }
    }, [auth.user]);

    const handleUpload = async (key: 'primary' | 'secondary' | 'mark', file: File) => {
        if (!auth.user) return;
        setUploadingState(prev => ({ ...prev, [key]: true }));
        
        try {
            const base64Data = await fileToBase64(file);
            // 1. Upload to Storage
            const url = await uploadBrandAsset(auth.user.uid, base64Data.base64, key);
            
            // 2. Update Local State
            setKit(prev => ({ ...prev, logos: { ...prev.logos, [key]: url } }));
            
            // 3. Auto-Extract Colors (only for primary logo if colors are default)
            if (key === 'primary' && kit.colors.primary === '#000000') {
                setIsExtractingColors(true);
                const colors = await extractBrandColors(base64Data.base64, base64Data.mimeType);
                setKit(prev => ({ ...prev, colors }));
                setIsExtractingColors(false);
                setToast({ msg: "Brand colors extracted from logo!", type: "success" });
            }
        } catch (e) {
            console.error("Upload failed", e);
            setToast({ msg: "Failed to upload asset.", type: "error" });
        } finally {
            setUploadingState(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleSave = async () => {
        if (!auth.user) return;
        setIsSaving(true);
        try {
            await saveUserBrandKit(auth.user.uid, kit);
            // Update global user object
            auth.setUser(prev => prev ? { ...prev, brandKit: kit } : null);
            setToast({ msg: "Brand Kit saved successfully!", type: "success" });
        } catch (e) {
            console.error("Save failed", e);
            setToast({ msg: "Failed to save Brand Kit.", type: "error" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-[#1A1A1E] flex items-center gap-3">
                    <BrandKitIcon className="w-8 h-8 text-indigo-600" />
                    My Brand Kit
                </h1>
                <p className="text-gray-500 mt-2 max-w-2xl">
                    Centralize your brand identity. These assets will be automatically applied to your AI generations in Magic Realty, Ads, and Thumbnails.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* SECTION 1: IDENTITY ASSETS */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-500" />
                            <h2 className="font-bold text-gray-800">Identity Assets</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <AssetUploader 
                                label="Primary Logo (Dark)" 
                                currentUrl={kit.logos.primary} 
                                onUpload={(f) => handleUpload('primary', f)} 
                                onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, primary: null } }))}
                                isLoading={uploadingState['primary']}
                            />
                            <AssetUploader 
                                label="Secondary Logo (Light)" 
                                currentUrl={kit.logos.secondary} 
                                onUpload={(f) => handleUpload('secondary', f)} 
                                onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, secondary: null } }))}
                                isLoading={uploadingState['secondary']}
                            />
                            <AssetUploader 
                                label="Brand Mark / Icon" 
                                currentUrl={kit.logos.mark} 
                                onUpload={(f) => handleUpload('mark', f)} 
                                onRemove={() => setKit(prev => ({ ...prev, logos: { ...prev.logos, mark: null } }))}
                                isLoading={uploadingState['mark']}
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <PaletteIcon className="w-5 h-5 text-purple-500" />
                                <h2 className="font-bold text-gray-800">Visual DNA</h2>
                            </div>
                            {isExtractingColors && (
                                <span className="text-xs text-purple-600 font-bold flex items-center gap-2 animate-pulse">
                                    <SparklesIcon className="w-4 h-4"/> Extracting from Logo...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Color Palette</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <ColorInput 
                                        label="Primary" 
                                        value={kit.colors.primary} 
                                        onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, primary: v } }))} 
                                    />
                                    <ColorInput 
                                        label="Secondary" 
                                        value={kit.colors.secondary} 
                                        onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, secondary: v } }))} 
                                    />
                                    <ColorInput 
                                        label="Accent" 
                                        value={kit.colors.accent} 
                                        onChange={(v) => setKit(prev => ({ ...prev, colors: { ...prev.colors, accent: v } }))} 
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Typography</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Heading Style</label>
                                        <select 
                                            value={kit.fonts.heading}
                                            onChange={(e) => setKit(prev => ({ ...prev, fonts: { ...prev.fonts, heading: e.target.value } }))}
                                            className="w-full text-sm border-gray-200 rounded-lg p-2 bg-gray-50"
                                        >
                                            <option>Modern Sans</option>
                                            <option>Classic Serif</option>
                                            <option>Bold Display</option>
                                            <option>Elegant Script</option>
                                            <option>Minimal Mono</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 block mb-1">Body Style</label>
                                        <select 
                                            value={kit.fonts.body}
                                            onChange={(e) => setKit(prev => ({ ...prev, fonts: { ...prev.fonts, body: e.target.value } }))}
                                            className="w-full text-sm border-gray-200 rounded-lg p-2 bg-gray-50"
                                        >
                                            <option>Clean Sans</option>
                                            <option>Readable Serif</option>
                                            <option>System Default</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: CONTEXT & PREVIEW */}
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
                        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                            <CaptionIcon className="w-5 h-5 text-blue-500" />
                            <h2 className="font-bold text-gray-800">Brand Context</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company Name</label>
                                <input 
                                    type="text" 
                                    value={kit.companyName}
                                    onChange={(e) => setKit(prev => ({ ...prev, companyName: e.target.value }))}
                                    placeholder="e.g. Skyline Realty"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Website</label>
                                <input 
                                    type="text" 
                                    value={kit.website}
                                    onChange={(e) => setKit(prev => ({ ...prev, website: e.target.value }))}
                                    placeholder="e.g. www.skyline.com"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tone of Voice</label>
                                <select 
                                    value={kit.toneOfVoice}
                                    onChange={(e) => setKit(prev => ({ ...prev, toneOfVoice: e.target.value }))}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-indigo-500 outline-none"
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

                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-xl text-white shadow-lg">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                        {kit.logos.mark ? <img src={kit.logos.mark} className="w-5 h-5 object-contain" /> : <UserIcon className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ background: kit.colors.primary }}></div>
                                        <div className="w-2 h-2 rounded-full" style={{ background: kit.colors.secondary }}></div>
                                        <div className="w-2 h-2 rounded-full" style={{ background: kit.colors.accent }}></div>
                                    </div>
                                </div>
                                <p className="text-xs font-bold opacity-50 mb-1">BRAND CARD PREVIEW</p>
                                <h3 className="text-lg font-bold">{kit.companyName || "Your Company"}</h3>
                                <p className="text-xs opacity-70">{kit.website || "yourwebsite.com"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* FLOATING SAVE BAR */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#1A1A1E] text-white px-8 py-3 rounded-full font-bold shadow-2xl hover:scale-105 transition-transform flex items-center gap-3 disabled:opacity-70 disabled:transform-none"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <CheckIcon className="w-5 h-5 text-green-400" />
                            Save Brand Kit
                        </>
                    )}
                </button>
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