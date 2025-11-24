
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CopyIcon, CheckIcon, DownloadIcon } from '../components/icons';
import { fileToBase64, Base64File, downloadImage } from '../utils/imageUtils';
import { generateStyledBrandAsset, generateBrandCopy } from '../services/brandStylistService';
import { deductCredits, saveCreation } from '../firebase';

// Compact Upload Component
const CompactUpload: React.FC<{
    label: string;
    image: { url: string } | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    colorClass?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-48", colorClass = "border-yellow-400 hover:border-yellow-500 bg-yellow-50 hover:bg-yellow-100" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-yellow-300 transition-colors`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
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
                    className={`w-full ${heightClass} border-2 border-dashed ${colorClass} rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide text-center">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const BrandStylistAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [context, setContext] = useState('');
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [adCopy, setAdCopy] = useState<{ headline: string; caption: string } | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [copiedField, setCopiedField] = useState<'headline' | 'caption' | null>(null);

    const cost = appConfig?.featureCosts['Brand Stylist AI'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Fallback ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            // Reset results if new input
            setResultImage(null);
            setAdCopy(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !referenceImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setLoadingText("Analyzing Style...");
        
        try {
            // 1. Generate Image
            const assetUrl = await generateStyledBrandAsset(
                productImage.base64.base64,
                productImage.base64.mimeType,
                referenceImage.base64.base64,
                referenceImage.base64.mimeType,
                context
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

            // 2. Generate Copy
            setLoadingText("Writing Marketing Copy...");
            const copy = await generateBrandCopy(
                assetUrl, // Use the raw base64 from generation
                'image/png',
                context
            );
            setAdCopy(copy);

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyText = (text: string, field: 'headline' | 'caption') => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleNewSession = () => {
        setProductImage(null);
        setReferenceImage(null);
        setResultImage(null);
        setAdCopy(null);
        setContext('');
    };

    const canGenerate = !!productImage && !!referenceImage && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Brand Stylist AI"
                description="Replicate the style of any image with your product. Includes AI-written ad copy."
                icon={<LightbulbIcon className="w-6 h-6 text-yellow-500" />}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={() => { setResultImage(null); setAdCopy(null); }}
                onNewSession={handleNewSession}
                resultHeightClass="h-[650px]"
                hideGenerateButton={isLowCredits || !!resultImage} // Hide main button if result is shown (we show copy instead)
                leftContent={
                    resultImage ? (
                        <div className="relative h-full w-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-inner group">
                             <img src={resultImage} className="w-full h-full object-contain shadow-2xl" alt="Result"/>
                             <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none">
                                <button onClick={() => downloadImage(resultImage, 'styled-brand-asset.png')} className="pointer-events-auto bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] px-6 py-2.5 rounded-xl transition-all shadow-lg text-sm font-bold flex items-center gap-2 transform hover:scale-105">
                                    <DownloadIcon className="w-5 h-5"/> <span>Download</span>
                                </button>
                             </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-4 p-4 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                            {/* Split Upload View */}
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                <CompactUpload
                                    label="1. Your Product"
                                    image={productImage}
                                    onUpload={handleUpload(setProductImage)}
                                    onClear={() => setProductImage(null)}
                                    icon={<UploadTrayIcon className="w-8 h-8 text-blue-400" />}
                                    colorClass="border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100"
                                    heightClass="h-full min-h-[200px]"
                                />
                                
                                {/* Divider / Arrow */}
                                <div className="hidden sm:flex items-center justify-center">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-gray-400 font-bold">+</span>
                                    </div>
                                </div>

                                <CompactUpload
                                    label="2. Style Reference"
                                    image={referenceImage}
                                    onUpload={handleUpload(setReferenceImage)}
                                    onClear={() => setReferenceImage(null)}
                                    icon={<LightbulbIcon className="w-8 h-8 text-yellow-500" />}
                                    colorClass="border-yellow-200 hover:border-yellow-400 bg-yellow-50 hover:bg-yellow-100"
                                    heightClass="h-full min-h-[200px]"
                                />
                            </div>
                            <div className="text-center text-xs text-gray-400 py-2 bg-gray-50 rounded-lg border border-gray-100">
                                <p>AI will extract the lighting, mood, and composition from Image 2 and apply it to Image 1.</p>
                            </div>
                        </div>
                    )
                }
                rightContent={
                    <div className="space-y-6 p-1 h-full flex flex-col">
                        {/* Context Input */}
                        <div>
                            <InputField
                                label="3. Brand/Product Context"
                                placeholder="e.g. LuxeSip Organic Coffee, Morning Vibes"
                                value={context}
                                onChange={(e: any) => setContext(e.target.value)}
                            />
                        </div>

                        {!resultImage && !loading && (
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="bg-yellow-50 p-5 rounded-2xl border border-yellow-100 mb-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="p-2 bg-yellow-100 rounded-full text-yellow-600"><SparklesIcon className="w-5 h-5"/></div>
                                        <h3 className="text-sm font-bold text-yellow-800">What you get</h3>
                                    </div>
                                    <ul className="text-xs text-yellow-900/80 space-y-2 list-disc list-inside">
                                        <li><b>Style Transfer:</b> Your product in the exact aesthetic of the reference.</li>
                                        <li><b>Smart Copy:</b> AI-written headline and caption matching the mood.</li>
                                        <li><b>High Resolution:</b> Professional grade output.</li>
                                    </ul>
                                </div>
                                
                                <button
                                    onClick={handleGenerate}
                                    disabled={!canGenerate}
                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                                        !canGenerate
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-[#1A1A1E] text-white hover:bg-black hover:scale-[1.02]'
                                    }`}
                                >
                                    <SparklesIcon className="w-5 h-5 text-yellow-400" />
                                    <span>Generate Asset</span>
                                </button>
                                <p className="text-center text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wide">Cost: {cost} Credits</p>
                            </div>
                        )}

                        {/* Generated Copy Section */}
                        {adCopy && (
                            <div className="animate-fadeIn flex-1 flex flex-col">
                                <div className="h-px w-full bg-gray-200 mb-4"></div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">AI Marketing Copy</h3>
                                
                                <div className="space-y-4">
                                    {/* Headline */}
                                    <div className="group relative bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                                        <p className="text-xs font-bold text-blue-500 mb-1">HEADLINE</p>
                                        <p className="text-lg font-black text-gray-800 leading-tight pr-8">{adCopy.headline}</p>
                                        <button 
                                            onClick={() => handleCopyText(adCopy.headline, 'headline')}
                                            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        >
                                            {copiedField === 'headline' ? <CheckIcon className="w-4 h-4 text-green-500"/> : <CopyIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>

                                    {/* Caption */}
                                    <div className="group relative bg-white p-4 rounded-2xl border border-gray-200 hover:border-blue-300 transition-colors shadow-sm">
                                        <p className="text-xs font-bold text-blue-500 mb-1">CAPTION</p>
                                        <p className="text-sm text-gray-600 leading-relaxed pr-8">{adCopy.caption}</p>
                                        <button 
                                            onClick={() => handleCopyText(adCopy.caption, 'caption')}
                                            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        >
                                            {copiedField === 'caption' ? <CheckIcon className="w-4 h-4 text-green-500"/> : <CopyIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />
            {/* Dummy input ref to satisfy shared layouts if needed */}
            <input ref={fileInputRef} type="file" className="hidden" />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
