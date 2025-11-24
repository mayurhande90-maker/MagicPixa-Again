
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, UploadPlaceholder, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { BrandKitIcon, SparklesIcon, DownloadIcon, CopyIcon, CheckIcon, XIcon, UploadIcon } from '../components/icons';
import { fileToBase64, Base64File, downloadImage } from '../utils/imageUtils';
import { analyzeBrandKit, generateBrandAsset, BrandAnalysis } from '../services/brandKitService';
import { deductCredits, saveCreation } from '../firebase';

interface AssetStatus {
    [key: string]: {
        loading: boolean;
        url: string | null;
        error: boolean;
    };
}

export const BrandKitAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [productName, setProductName] = useState('');
    
    // Analysis State
    const [analyzing, setAnalyzing] = useState(false);
    const [brandData, setBrandData] = useState<BrandAnalysis | null>(null);
    
    // Asset Generation State
    const [assets, setAssets] = useState<AssetStatus>({
        ecommerce: { loading: false, url: null, error: false },
        lifestyle: { loading: false, url: null, error: false },
        model: { loading: false, url: null, error: false },
        adCreative: { loading: false, url: null, error: false },
    });
    
    const [generatedCount, setGeneratedCount] = useState(0); // To track when to show milestone
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['BrandKit AI'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            // Reset state on new upload
            setBrandData(null);
            setAssets({
                ecommerce: { loading: false, url: null, error: false },
                lifestyle: { loading: false, url: null, error: false },
                model: { loading: false, url: null, error: false },
                adCreative: { loading: false, url: null, error: false },
            });
            setGeneratedCount(0);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        if (isLowCredits) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        // 1. Analysis Phase
        setAnalyzing(true);
        try {
            const analysis = await analyzeBrandKit(image.base64.base64, image.base64.mimeType, productName);
            setBrandData(analysis);
            setAnalyzing(false);

            // Deduct credits once analysis is successful and we commit to generation
            const updatedUser = await deductCredits(auth.user.uid, cost, 'BrandKit AI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            // 2. Asset Generation Phase (Parallel)
            triggerAssetGeneration('ecommerce', analysis.prompts.ecommerce);
            triggerAssetGeneration('lifestyle', analysis.prompts.lifestyle);
            triggerAssetGeneration('model', analysis.prompts.model);
            triggerAssetGeneration('adCreative', analysis.prompts.adCreative);

        } catch (e) {
            console.error(e);
            alert("Failed to analyze product. Please try again with a clearer photo.");
            setAnalyzing(false);
        }
    };

    const triggerAssetGeneration = async (type: string, prompt: string) => {
        if (!image || !auth.user) return;

        setAssets(prev => ({ ...prev, [type]: { loading: true, url: null, error: false } }));

        try {
            const resBase64 = await generateBrandAsset(image.base64.base64, image.base64.mimeType, prompt, type);
            const url = `data:image/png;base64,${resBase64}`;
            
            // Save to history
            await saveCreation(auth.user.uid, url, `BrandKit: ${type}`);
            
            setAssets(prev => ({ ...prev, [type]: { loading: false, url, error: false } }));
            setGeneratedCount(prev => {
                const newCount = prev + 1;
                // Check milestone on the last image (4th)
                if (newCount === 4 && auth.user?.lifetimeGenerations) {
                     // We added 1 to lifetime gens in deductCredits, but that was for the batch.
                     // If we want to check milestone, we use the user object returned from deductCredits.
                     // For simplicity, we assume the bonus check happened in deductCredits or we check locally.
                     // We can just check the updated user state in `auth.user`.
                     const bonus = checkMilestone(auth.user.lifetimeGenerations);
                     if (bonus !== false) setMilestoneBonus(bonus);
                }
                return newCount;
            });

        } catch (e) {
            console.error(`Error generating ${type}:`, e);
            setAssets(prev => ({ ...prev, [type]: { loading: false, url: null, error: true } }));
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const AssetCard: React.FC<{ type: string; title: string; data: any }> = ({ type, title, data }) => (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm group relative h-64 w-full flex flex-col">
            {data.loading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-xs font-bold text-blue-500 animate-pulse uppercase tracking-wider">Generating...</p>
                </div>
            ) : data.url ? (
                <>
                    <div className="flex-1 relative overflow-hidden bg-gray-100 cursor-pointer" onClick={() => window.open(data.url, '_blank')}>
                        <img src={data.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={title} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button 
                                onClick={(e) => { e.stopPropagation(); downloadImage(data.url, `${title}.png`); }}
                                className="bg-white text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                                <DownloadIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                    <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-white absolute bottom-0 w-full">
                        <span className="text-xs font-bold text-gray-700 uppercase">{title}</span>
                    </div>
                </>
            ) : data.error ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-red-50 text-center p-4">
                    <p className="text-xs font-bold text-red-500 mb-2">Generation Failed</p>
                    <button onClick={() => brandData && triggerAssetGeneration(type, (brandData.prompts as any)[type])} className="text-xs bg-white border border-red-200 text-red-600 px-3 py-1 rounded-lg shadow-sm hover:bg-red-50">Retry</button>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-300">
                    <p className="text-xs font-bold uppercase tracking-wider">Pending</p>
                </div>
            )}
        </div>
    );

    return (
        <>
            <FeatureLayout
                title="BrandKit AI"
                description="One photo in, full brand pack out. Get e-commerce shots, lifestyle images, ads, and copy instantly."
                icon={<BrandKitIcon className="w-6 h-6 text-green-500"/>}
                creditCost={cost}
                isGenerating={analyzing || Object.values(assets).some(a => a.loading)}
                canGenerate={!!image && !isLowCredits && !analyzing}
                onGenerate={handleGenerate}
                resultImage={null} // Custom layout
                resultHeightClass="h-auto" // Flexible height
                hideGenerateButton={!!brandData} // Hide button if results are showing
                // Left: Input & Identity
                leftContent={
                    <div className="flex flex-col h-full gap-6">
                        {/* Product Upload */}
                        <div className="relative w-full aspect-square bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group shadow-sm">
                            {image ? (
                                <>
                                    <img src={image.url} className="w-full h-full object-contain p-4" alt="Product Source" />
                                    {!analyzing && !brandData && (
                                        <button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-all">
                                            <UploadIcon className="w-5 h-5"/>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <UploadPlaceholder label="Upload Raw Product Photo" onClick={() => fileInputRef.current?.click()} />
                            )}
                            {analyzing && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10">
                                    <div className="w-16 h-16 border-4 border-t-green-400 border-white/20 rounded-full animate-spin mb-4"></div>
                                    <p className="font-bold tracking-widest uppercase animate-pulse text-sm">Analyzing Brand DNA...</p>
                                </div>
                            )}
                        </div>

                        {/* Brand Identity Card (Visible after analysis) */}
                        {brandData && (
                            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm animate-fadeIn">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Brand Identity</h3>
                                
                                {/* Colors */}
                                <div className="flex gap-2 mb-6">
                                    {brandData.identity.colors.map((color, i) => (
                                        <div key={i} className="flex-1 group relative cursor-pointer" onClick={() => handleCopy(color)}>
                                            <div className="h-12 rounded-lg shadow-sm border border-gray-100 transition-transform hover:scale-105 hover:shadow-md" style={{ backgroundColor: color }}></div>
                                            <span className="text-[10px] font-mono text-gray-500 mt-1 block text-center opacity-0 group-hover:opacity-100 transition-opacity">{color}</span>
                                            {copiedText === color && <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded">Copied</div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Fonts & Vibe */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500">Vibe</span>
                                        <span className="text-sm font-bold text-[#1A1A1E] capitalize">{brandData.identity.vibe}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                        <span className="text-xs font-bold text-gray-500">Fonts</span>
                                        <span className="text-sm font-medium text-[#1A1A1E]">{brandData.identity.fonts.join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
                // Right: Assets & Copy
                rightContent={
                    <div className="h-full flex flex-col gap-6">
                        {!brandData ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                <div className="bg-white p-4 rounded-full mb-4 shadow-sm">
                                    <SparklesIcon className="w-8 h-8 text-green-500"/>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">No Assets Generated Yet</h3>
                                <p className="text-sm text-gray-500 max-w-xs">Upload a product photo and click generate to get your full brand kit.</p>
                                {!image && (
                                    <InputField 
                                        label="Product Name (Optional)" 
                                        placeholder="e.g. Luxe Serum" 
                                        value={productName} 
                                        onChange={(e: any) => setProductName(e.target.value)} 
                                        className="mt-6"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="animate-fadeIn space-y-6">
                                {/* 1. Visual Assets Grid */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        Visual Assets <span className="bg-green-100 text-green-600 text-[10px] px-2 py-0.5 rounded-full">AI Generated</span>
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <AssetCard type="ecommerce" title="Ecommerce" data={assets.ecommerce} />
                                        <AssetCard type="lifestyle" title="Lifestyle" data={assets.lifestyle} />
                                        <AssetCard type="model" title="Model Shot" data={assets.model} />
                                        <AssetCard type="adCreative" title="Ad Creative" data={assets.adCreative} />
                                    </div>
                                </div>

                                {/* 2. Copywriting Assets */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Copywriting</h3>
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                                        {/* Slogans */}
                                        <div className="p-4">
                                            <span className="text-xs font-bold text-purple-500 uppercase mb-2 block">Slogans</span>
                                            <div className="space-y-2">
                                                {brandData.copywriting.slogans.map((slogan, i) => (
                                                    <div key={i} className="flex justify-between items-center group">
                                                        <p className="text-sm font-medium text-gray-800 italic">"{slogan}"</p>
                                                        <button onClick={() => handleCopy(slogan)} className="text-gray-300 hover:text-purple-600 transition-colors">
                                                            {copiedText === slogan ? <CheckIcon className="w-4 h-4"/> : <CopyIcon className="w-4 h-4"/>}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Captions */}
                                        <div className="p-4">
                                            <span className="text-xs font-bold text-blue-500 uppercase mb-2 block">Social Captions</span>
                                            <div className="space-y-3">
                                                {brandData.copywriting.socialCaptions.map((cap, i) => (
                                                    <div key={i} className="bg-gray-50 p-3 rounded-xl relative group">
                                                        <p className="text-xs text-gray-600 leading-relaxed pr-6">{cap}</p>
                                                        <button onClick={() => handleCopy(cap)} className="absolute top-2 right-2 text-gray-300 hover:text-blue-600 transition-colors">
                                                            {copiedText === cap ? <CheckIcon className="w-3 h-3"/> : <CopyIcon className="w-3 h-3"/>}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Hashtags */}
                                        <div className="p-4 bg-gray-50">
                                            <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Hashtags</span>
                                            <div className="flex flex-wrap gap-2">
                                                {brandData.copywriting.hashtags.map((tag, i) => (
                                                    <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md font-medium">{tag}</span>
                                                ))}
                                                <button onClick={() => handleCopy(brandData.copywriting.hashtags.join(' '))} className="text-xs font-bold text-gray-500 hover:text-black ml-auto flex items-center gap-1">
                                                    <CopyIcon className="w-3 h-3"/> Copy All
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
