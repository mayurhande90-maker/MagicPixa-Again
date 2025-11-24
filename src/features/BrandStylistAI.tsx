
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCardIcon, PhotoStudioIcon, BrandKitIcon, MagicWandIcon, CopyIcon, CheckIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateStyledBrandAsset } from '../services/brandStylistService';
import { deductCredits, saveCreation } from '../firebase';

// Compact Upload Component (Reused)
const CompactUpload: React.FC<{
    label: string;
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group h-full">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-3 h-3"/>
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const BrandStylistAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Assets
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Mode
    const [genMode, setGenMode] = useState<'replica' | 'remix'>('replica');

    // Data Inputs
    const [productName, setProductName] = useState('');
    const [website, setWebsite] = useState('');
    const [specialOffer, setSpecialOffer] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const cost = appConfig?.featureCosts['Brand Stylist AI'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Fallback ref for shared layout compliance
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            // Reset result if inputs change to avoid confusion
            if (resultImage) setResultImage(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !referenceImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setLoadingText(genMode === 'replica' ? "Analyzing Layout & Style..." : "Reimagining Concept...");
        setResultImage(null);
        
        try {
            const assetUrl = await generateStyledBrandAsset(
                productImage.base64.base64,
                productImage.base64.mimeType,
                referenceImage.base64.base64,
                referenceImage.base64.mimeType,
                logoImage?.base64.base64, // Optional Logo
                logoImage?.base64.mimeType,
                productName,
                website,
                specialOffer,
                address,
                description,
                genMode // Pass the selected mode
            );
            
            const finalImageUrl = `data:image/png;base64,${assetUrl}`;
            setResultImage(finalImageUrl);
            
            // Deduct Credits & Save
            saveCreation(auth.user.uid, finalImageUrl, `Brand Stylist (${genMode})`);
            const updatedUser = await deductCredits(auth.user.uid, cost, `Brand Stylist (${genMode})`);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }

        } catch (e: any) {
            console.error(e);
            alert(`Generation failed: ${e.message || "Please try again."}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setProductImage(null);
        setLogoImage(null);
        setReferenceImage(null);
        setResultImage(null);
        setProductName('');
        setWebsite('');
        setSpecialOffer('');
        setAddress('');
        setDescription('');
        setGenMode('replica');
    };

    const canGenerate = !!productImage && !!referenceImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Brand Stylist AI"
                description="Smartly replicate ads. Choose 'Exact Replica' to copy a layout 1:1, or 'Reimagine' to let AI upgrade it with modern trends."
                icon={<LightbulbIcon className="w-6 h-6 text-blue-500" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={() => setResultImage(null)}
                onNewSession={handleNewSession}
                resultHeightClass="h-[850px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: genMode === 'remix' 
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 border-none hover:scale-[1.02]"
                        : "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: genMode === 'remix' ? "Reimagine Design" : "Generate Replica"
                }}
                scrollRef={scrollRef}
                // LEFT CONTENT: Canvas
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className={`h-full rounded-full animate-[progress_2s_ease-in-out_infinite] ${genMode === 'remix' ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${genMode === 'remix' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                                    {genMode === 'remix' ? <MagicWandIcon className="w-10 h-10 text-purple-500" /> : <LightbulbIcon className="w-10 h-10 text-blue-500" />}
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Smart Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">
                                    {genMode === 'remix' ? 'Your reimagined design will appear here.' : 'Your exact replica will appear here.'}
                                </p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                // RIGHT CONTENT: Control Deck
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                This generation requires <span className="font-bold text-gray-800">{cost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                            </p>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn flex flex-col h-full">
                            {/* Row 1: Product & Logo */}
                            <div className="grid grid-cols-2 gap-4">
                                <CompactUpload
                                    label="1. Product Image"
                                    image={productImage}
                                    onUpload={handleUpload(setProductImage)}
                                    onClear={() => setProductImage(null)}
                                    icon={<UploadTrayIcon className="w-6 h-6 text-blue-400" />}
                                />
                                <CompactUpload
                                    label="Brand Logo"
                                    image={logoImage}
                                    onUpload={handleUpload(setLogoImage)}
                                    onClear={() => setLogoImage(null)}
                                    icon={<BrandKitIcon className="w-6 h-6 text-indigo-400" />}
                                    optional={true}
                                />
                            </div>

                            {/* Row 2: Reference Image */}
                            <div>
                                <CompactUpload
                                    label="2. Reference Style (Ad/Design)"
                                    image={referenceImage}
                                    onUpload={handleUpload(setReferenceImage)}
                                    onClear={() => setReferenceImage(null)}
                                    icon={<LightbulbIcon className="w-6 h-6 text-yellow-500" />}
                                    heightClass="h-40"
                                />
                            </div>

                            {/* Row 3: Mode Toggle */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">3. Generation Mode</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setGenMode('replica')}
                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center group hover:-translate-y-0.5 ${
                                            genMode === 'replica' 
                                            ? 'border-[#4D7CFF] bg-blue-50/50 text-[#4D7CFF] shadow-sm' 
                                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`p-2.5 rounded-full transition-colors ${genMode === 'replica' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-white'}`}>
                                            <CopyIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold">Exact Replica</span>
                                            <span className="block text-[10px] font-medium mt-1 opacity-80">Copy layout 100%</span>
                                        </div>
                                        {genMode === 'replica' && (
                                            <div className="absolute top-3 right-3 text-[#4D7CFF]">
                                                <CheckIcon className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setGenMode('remix')}
                                        className={`relative p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center group hover:-translate-y-0.5 ${
                                            genMode === 'remix' 
                                            ? 'border-purple-500 bg-purple-50/50 text-purple-600 shadow-sm' 
                                            : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`p-2.5 rounded-full transition-colors ${genMode === 'remix' ? 'bg-purple-100' : 'bg-gray-100 group-hover:bg-white'}`}>
                                            <MagicWandIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold">Reimagine</span>
                                            <span className="block text-[10px] font-medium mt-1 opacity-80">Creative AI Upgrade</span>
                                        </div>
                                        {genMode === 'remix' && (
                                            <div className="absolute top-3 right-3 text-purple-500">
                                                <CheckIcon className="w-4 h-4" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Row 4: Smart Inputs */}
                            <div className="space-y-4 pt-2">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider -mb-2 ml-1">Product Details (Auto-inserted if detected)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField
                                        placeholder="Product Name"
                                        value={productName}
                                        onChange={(e: any) => setProductName(e.target.value)}
                                    />
                                    <InputField
                                        placeholder="Special Offer (e.g. 50% OFF)"
                                        value={specialOffer}
                                        onChange={(e: any) => setSpecialOffer(e.target.value)}
                                    />
                                    <InputField
                                        placeholder="Website / URL"
                                        value={website}
                                        onChange={(e: any) => setWebsite(e.target.value)}
                                    />
                                    <InputField
                                        placeholder="Address"
                                        value={address}
                                        onChange={(e: any) => setAddress(e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <InputField
                                        label="Product Description (Context)"
                                        placeholder="e.g. Organic Coffee, morning energy boost. Use this for the headline."
                                        value={description}
                                        onChange={(e: any) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            {/* Dummy input to satisfy shared layout types */}
            <input ref={fileInputRef} type="file" className="hidden" />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
