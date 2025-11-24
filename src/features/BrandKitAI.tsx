
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, UploadPlaceholder, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { BrandKitIcon, SparklesIcon, DownloadIcon, CheckIcon, XIcon, UploadTrayIcon, LightbulbIcon } from '../components/icons';
import { fileToBase64, Base64File, downloadImage } from '../utils/imageUtils';
import { analyzeAdStrategy, generateAdVariantImage, AdStrategy } from '../services/brandKitService';
import { deductCredits, saveCreation } from '../firebase';

// Compact Upload Component (Reused pattern)
const CompactUpload: React.FC<{
    label: string;
    image: { url: string } | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-green-100 flex items-center justify-center overflow-hidden shadow-sm`}>
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
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-green-400 bg-gray-50 hover:bg-green-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-green-500 uppercase tracking-wide text-center">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const AdVariantCard: React.FC<{
    strategy: string;
    imageUrl: string | null;
    reasoning: string;
    isLoading: boolean;
}> = ({ strategy, imageUrl, reasoning, isLoading }) => (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
        <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{strategy}</span>
        </div>
        <div className="relative w-full aspect-square bg-gray-100 flex items-center justify-center overflow-hidden group">
            {isLoading ? (
                <div className="flex flex-col items-center p-4 text-center">
                    <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs text-gray-500 animate-pulse">{reasoning ? "Generating..." : "Thinking..."}</p>
                </div>
            ) : imageUrl ? (
                <>
                    <img src={imageUrl} className="w-full h-full object-cover" alt={strategy} />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[1px]">
                        <button
                            onClick={() => downloadImage(imageUrl, `Ad-Variant-${strategy}.png`)}
                            className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                        >
                            <DownloadIcon className="w-4 h-4" /> Save
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-gray-300 flex flex-col items-center p-4 text-center">
                    <BrandKitIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-[10px] font-bold uppercase tracking-wider">Ready to Generate</p>
                </div>
            )}
        </div>
        <div className="p-3 bg-white text-[10px] text-gray-500 leading-relaxed border-t border-gray-100 h-16 overflow-y-auto custom-scrollbar">
            {reasoning || "Analysis pending..."}
        </div>
    </div>
);

export const BrandKitAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [productName, setProductName] = useState('');
    const [targetAudience, setTargetAudience] = useState('');

    // Define fileInputRef for compatibility with potential future drag/drop logic or fallback input
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loadingState, setLoadingState] = useState<'idle' | 'analyzing' | 'generating'>('idle');
    const [strategies, setStrategies] = useState<AdStrategy[]>([]);
    const [generatedImages, setGeneratedImages] = useState<string[]>([null, null, null, null] as any);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const cost = appConfig?.featureCosts['BrandKit AI'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setProductImage({ url: URL.createObjectURL(file), base64 });
            // Reset
            setStrategies([]);
            setGeneratedImages([null, null, null, null] as any);
            setLoadingState('idle');
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoadingState('analyzing');
        setStrategies([]);
        setGeneratedImages([null, null, null, null] as any);

        try {
            // 1. Analyze Strategy
            const strategyResults = await analyzeAdStrategy(
                productImage.base64.base64,
                productImage.base64.mimeType,
                productName,
                targetAudience
            );
            setStrategies(strategyResults);
            setLoadingState('generating');

            // Deduct Credits
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Ad Variant Engine');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            // 2. Parallel Generation of 4 Variants
            // We map over the 4 strategies and fire requests
            const promises = strategyResults.map(async (strat, index) => {
                try {
                    const url = await generateAdVariantImage(productImage.base64.base64, productImage.base64.mimeType, strat.visualPrompt);
                    const dataUrl = `data:image/png;base64,${url}`;
                    // Update state incrementally as they finish
                    setGeneratedImages(prev => {
                        const next = [...prev];
                        next[index] = dataUrl;
                        return next;
                    });
                    // Save to history (silently)
                    saveCreation(auth.user!.uid, dataUrl, `Ad Variant: ${strat.type}`);
                    return dataUrl;
                } catch (err) {
                    console.error(`Failed to generate variant ${index}`, err);
                    return null;
                }
            });

            await Promise.all(promises);

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }

        } catch (e) {
            console.error(e);
            alert("Process failed. Please try again.");
        } finally {
            setLoadingState('idle');
        }
    };

    const canGenerate = !!productImage && !isLowCredits && !!productName && !!targetAudience;

    // Default placeholder strategies for UI before generation
    const displayStrategies = strategies.length > 0 ? strategies : [
        { type: 'Pain/Solution', reasoning: '', visualPrompt: '' },
        { type: 'Social Proof', reasoning: '', visualPrompt: '' },
        { type: 'Luxury/Authority', reasoning: '', visualPrompt: '' },
        { type: 'Urgency/Impact', reasoning: '', visualPrompt: '' },
    ];

    return (
        <>
            <FeatureLayout
                title="Ad Variant Engine"
                description="Generate 4 distinct psychological ad creatives from a single product photo. Perfect for A/B testing."
                icon={<BrandKitIcon className="w-6 h-6 text-green-500" />}
                creditCost={cost}
                isGenerating={loadingState !== 'idle'}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={null}
                hideGenerateButton={true} // Custom layout
                resultHeightClass="h-auto"
                // LEFT: Inputs
                leftContent={
                    <div className="flex flex-col gap-6 h-full">
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">1. Product Source</h3>
                            <CompactUpload
                                label="Product Image"
                                image={productImage}
                                onUpload={handleProductUpload}
                                onClear={() => setProductImage(null)}
                                icon={<UploadTrayIcon className="w-6 h-6 text-blue-400" />}
                            />
                            <div className="mt-4">
                                <InputField
                                    label="Product Name"
                                    placeholder="e.g. HydraBurst Water Bottle"
                                    value={productName}
                                    onChange={(e: any) => setProductName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex-1">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">2. Targeting</h3>
                            
                            <InputField
                                label="Target Audience"
                                placeholder="e.g. Busy Moms, PC Gamers, Fitness Freaks"
                                value={targetAudience}
                                onChange={(e: any) => setTargetAudience(e.target.value)}
                            />

                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mt-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <LightbulbIcon className="w-4 h-4 text-green-600"/>
                                    <span className="text-xs font-bold text-green-700">What you get</span>
                                </div>
                                <p className="text-[10px] text-green-800 leading-relaxed">
                                    We will analyze your audience and automatically generate 4 psychological hooks:
                                    <br/>• <b>Pain/Solution</b> (Problem solver)
                                    <br/>• <b>Social Proof</b> (Lifestyle/UGC)
                                    <br/>• <b>Authority</b> (Premium look)
                                    <br/>• <b>Impact</b> (High CTR)
                                </p>
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!canGenerate || loadingState !== 'idle'}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all mt-6 flex items-center justify-center gap-2 ${
                                    !canGenerate || loadingState !== 'idle'
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-black text-white hover:bg-gray-800 hover:scale-[1.02]'
                                }`}
                            >
                                {loadingState === 'analyzing' ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Analyzing Audience...</span>
                                    </>
                                ) : loadingState === 'generating' ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Creating Variants...</span>
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5 text-green-400" />
                                        <span>Generate 4 Variants</span>
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wide">Cost: {cost} Credits</p>
                        </div>
                    </div>
                }
                // RIGHT: Results Grid
                rightContent={
                    <div className="h-full flex flex-col">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full pb-2">
                            {displayStrategies.map((strat, index) => (
                                <AdVariantCard 
                                    key={index}
                                    strategy={strat.type}
                                    imageUrl={generatedImages?.[index] || null}
                                    reasoning={strat.reasoning}
                                    isLoading={loadingState !== 'idle' && !generatedImages?.[index]}
                                />
                            ))}
                        </div>
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
