
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCardIcon } from '../components/icons';
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
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-yellow-100 flex items-center justify-center overflow-hidden shadow-sm`}>
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
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-yellow-400 bg-gray-50 hover:bg-yellow-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-yellow-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const BrandStylistAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
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
        if (!productImage || !referenceImage || !description || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setLoadingText("Analyzing Style & Fonts...");
        setResultImage(null);
        
        try {
            const assetUrl = await generateStyledBrandAsset(
                productImage.base64.base64,
                productImage.base64.mimeType,
                referenceImage.base64.base64,
                referenceImage.base64.mimeType,
                description
            );
            
            const finalImageUrl = `data:image/png;base64,${assetUrl}`;
            setResultImage(finalImageUrl);
            
            // Deduct Credits & Save
            saveCreation(auth.user.uid, finalImageUrl, 'Brand Stylist AI');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Brand Stylist AI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setProductImage(null);
        setReferenceImage(null);
        setResultImage(null);
        setDescription('');
    };

    const canGenerate = !!productImage && !!referenceImage && !!description && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Brand Stylist AI"
                description="Replicate any visual style. AI analyzes the reference image and creates a new ad with your product and matching text."
                icon={<LightbulbIcon className="w-6 h-6 text-yellow-500" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={() => setResultImage(null)}
                onNewSession={handleNewSession}
                resultHeightClass="h-[750px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Design"
                }}
                scrollRef={scrollRef}
                // LEFT CONTENT: Canvas
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <LightbulbIcon className="w-10 h-10 text-yellow-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Design Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Your styled ad will appear here.</p>
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
                        <div className="space-y-8 p-1 animate-fadeIn flex flex-col h-full">
                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <SparklesIcon className="w-4 h-4 text-yellow-600"/>
                                    <span className="text-xs font-bold text-yellow-800 uppercase">How it works</span>
                                </div>
                                <p className="text-[10px] text-yellow-800/80 leading-relaxed">
                                    Upload a reference image. AI will clone its lighting, font, and layout, then insert your product and write matching text automatically.
                                </p>
                            </div>

                            {/* Uploads */}
                            <div className="grid grid-cols-2 gap-4">
                                <CompactUpload
                                    label="1. Your Product"
                                    image={productImage}
                                    onUpload={handleUpload(setProductImage)}
                                    onClear={() => setProductImage(null)}
                                    icon={<UploadTrayIcon className="w-6 h-6 text-blue-400" />}
                                />
                                <CompactUpload
                                    label="2. Reference Style"
                                    image={referenceImage}
                                    onUpload={handleUpload(setReferenceImage)}
                                    onClear={() => setReferenceImage(null)}
                                    icon={<LightbulbIcon className="w-6 h-6 text-yellow-500" />}
                                />
                            </div>

                            {/* Description Input */}
                            <div>
                                <InputField
                                    label="3. Product Description"
                                    placeholder="e.g. Premium Organic Coffee, start your morning right."
                                    value={description}
                                    onChange={(e: any) => setDescription(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 px-1 -mt-4 italic">
                                    AI will use this to write the Headline on the image.
                                </p>
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
