
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCardIcon, BrandKitIcon, MagicWandIcon, CopyIcon, MagicAdsIcon, PlusIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateStyledBrandAsset } from '../services/brandStylistService';
import { deductCredits, saveCreation } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

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
    
    // Mode - Changed default to 'replica'
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
    
    const [showMagicEditor, setShowMagicEditor] = useState(false);

    const cost = appConfig?.featureCosts['Brand Stylist AI'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            // Note: We do NOT clear resultImage here, allowing user to swap assets while seeing the old result
            // until they hit Generate again.
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !referenceImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setLoadingText("Analyzing, Relighting & Harmonizing...");
        // Clear result image to show loading state on the canvas and indicate a FRESH start
        setResultImage(null);
        
        try {
            const assetUrl = await generateStyledBrandAsset(
                productImage.base64.base64,
                productImage.base64.mimeType,
                referenceImage.base64.base64,
                referenceImage.base64.mimeType,
                logoImage?.base64.base64,
                logoImage?.base64.mimeType,
                productName,
                website,
                specialOffer,
                address,
                description,
                genMode, 
                'English', // Default
                'physical', // Strict Physical Mode
                undefined, // Default branding
                'Modern Sans' // Default font
            );
            
            const finalImageUrl = `data:image/png;base64,${assetUrl}`;
            setResultImage(finalImageUrl);
            
            saveCreation(auth.user.uid, finalImageUrl, 'Magic Ads');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Magic Ads');
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

    // Logic for Magic Editor
    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Magic Ads (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const canGenerate = !!productImage && !!referenceImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Magic Ads"
                description="Turn your product photos into high-converting ad creatives by mimicking successful styles."
                icon={<MagicAdsIcon className="w-6 h-6 text-blue-500" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                // Hooking up Regenerate to handleGenerate re-runs the process with all current inputs
                // This satisfies the "treat as fresh generation" requirement
                onResetResult={handleGenerate}
                // Remove standard New Project button from bottom bar to use custom overlay
                onNewSession={undefined}
                resultHeightClass="h-[850px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: genMode === 'remix'
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 border-none hover:scale-[1.02]"
                        : "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Ad Creative"
                }}
                scrollRef={scrollRef}
                
                // Add Magic Editor button
                customActionButtons={
                    resultImage ? (
                        <button 
                            onClick={() => setShowMagicEditor(true)}
                            className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap"
                        >
                            <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> 
                            <span>Magic Editor</span>
                        </button>
                    ) : null
                }

                // Place New Project button in the top corner of result image
                resultOverlay={
                    <button 
                        onClick={handleNewSession}
                        className="bg-white/90 backdrop-blur-md hover:bg-gray-100 text-gray-600 hover:text-[#1A1A1E] px-4 py-2 rounded-full text-xs font-bold shadow-sm border border-gray-200 transition-all flex items-center gap-2 transform hover:scale-105"
                        title="Start a completely new project"
                    >
                        <PlusIcon className="w-4 h-4"/> New Project
                    </button>
                }
                
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
                                    <UploadTrayIcon className={`w-10 h-10 ${genMode === 'remix' ? 'text-purple-500' : 'text-blue-500'}`} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload Product & Reference to preview.</p>
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
                        // Disable controls while generating
                        <div className={`space-y-6 p-1 animate-fadeIn flex flex-col h-full relative ${loading ? 'opacity-50 pointer-events-none cursor-not-allowed grayscale-[0.5]' : ''}`}>
                            
                            {/* Row 1: Assets */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Upload Assets</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload
                                        label="Product Image"
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
                            </div>

                            {/* Row 2: Reference */}
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

                            {/* Row 3: Mode */}
                            <div>
                                <div className="flex items-center justify-between mb-2 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Creativity Level</label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <button 
                                        onClick={() => setGenMode('replica')} 
                                        className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border transition-all ${genMode === 'replica' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-full ${genMode === 'replica' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <CopyIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className={`text-xs font-bold ${genMode === 'replica' ? 'text-blue-700' : 'text-gray-700'}`}>Replica</span>
                                        </div>
                                        <p className={`text-[10px] font-medium leading-tight ml-1 ${genMode === 'replica' ? 'text-blue-600/80' : 'text-gray-400'}`}>
                                            Copy exact layout & lighting structure.
                                        </p>
                                    </button>

                                    <button 
                                        onClick={() => setGenMode('remix')} 
                                        className={`flex flex-col items-start gap-1.5 p-4 rounded-xl border transition-all ${genMode === 'remix' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-full ${genMode === 'remix' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                <MagicWandIcon className="w-3.5 h-3.5" />
                                            </div>
                                            <span className={`text-xs font-bold ${genMode === 'remix' ? 'text-purple-700' : 'text-gray-700'}`}>Reimagine</span>
                                        </div>
                                        <p className={`text-[10px] font-medium leading-tight ml-1 ${genMode === 'remix' ? 'text-purple-600/80' : 'text-gray-400'}`}>
                                            Use style but invent a new layout.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Row 4: Text Content */}
                            <div className="space-y-4 pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider -mb-2 ml-1">4. Ad Copy (Auto-inserted)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField placeholder="Title / Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                    <InputField placeholder="CTA / Offer" value={specialOffer} onChange={(e: any) => setSpecialOffer(e.target.value)} />
                                    <InputField placeholder="Website" value={website} onChange={(e: any) => setWebsite(e.target.value)} />
                                    <InputField placeholder="Address/Location" value={address} onChange={(e: any) => setAddress(e.target.value)} />
                                </div>
                                <InputField
                                    label="Description / Context (Important)"
                                    placeholder="e.g. Organic Coffee, morning energy boost"
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}
        </>
    );
};
