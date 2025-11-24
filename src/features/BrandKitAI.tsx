
import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, UploadPlaceholder, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { BrandKitIcon, SparklesIcon, DownloadIcon, CopyIcon, CheckIcon, XIcon, UploadTrayIcon } from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { analyzeCampaignTrends, generateCampaignAsset, CampaignAnalysis } from '../services/brandKitService';
import { deductCredits, saveCreation } from '../firebase';

// --- Components ---

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

const OccasionSelector: React.FC<{ selected: string; onSelect: (occ: string) => void }> = ({ selected, onSelect }) => {
    const occasions = [
        { id: 'General', label: 'General', emoji: '✨' },
        { id: 'Christmas', label: 'Christmas', emoji: '🎄' },
        { id: 'New Year', label: 'New Year', emoji: '🎉' },
        { id: 'Black Friday', label: 'Black Friday', emoji: '🖤' },
        { id: 'Summer Sale', label: 'Summer', emoji: '☀️' },
        { id: 'Valentine', label: 'Valentine', emoji: '❤️' },
        { id: 'Diwali', label: 'Diwali', emoji: '🪔' },
    ];

    return (
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Select Occasion</label>
            <div className="grid grid-cols-3 gap-2">
                {occasions.map(occ => (
                    <button
                        key={occ.id}
                        onClick={() => onSelect(occ.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            selected === occ.id 
                            ? 'bg-green-50 border-green-500 text-green-700 shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <span className="text-xl mb-1">{occ.emoji}</span>
                        <span className="text-[10px] font-bold uppercase">{occ.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Canvas Merger Helper
const mergeAndDownload = async (
    backgroundUrl: string, 
    logoUrl: string | null, 
    offerText: string, 
    filename: string,
    format: 'square' | 'portrait' | 'landscape'
) => {
    return new Promise<void>((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const bgImg = new Image();
        
        // Determine dimensions based on format
        // Using higher res for better quality
        let width = 1024;
        let height = 1024;
        if (format === 'portrait') { width = 1024; height = 1792; } // 9:16
        if (format === 'landscape') { width = 1792; height = 1024; } // 16:9

        canvas.width = width;
        canvas.height = height;

        bgImg.crossOrigin = "anonymous";
        bgImg.src = backgroundUrl;
        bgImg.onload = () => {
            if (!ctx) return;
            
            // Draw Background
            ctx.drawImage(bgImg, 0, 0, width, height);

            // Draw Offer Badge (Bottom Center)
            if (offerText) {
                const fontSize = Math.round(width * 0.05); // 5% of width
                ctx.font = `bold ${fontSize}px Poppins, sans-serif`;
                const padding = fontSize * 0.8;
                const textMetrics = ctx.measureText(offerText);
                const textWidth = textMetrics.width;
                const badgeWidth = textWidth + (padding * 2);
                const badgeHeight = fontSize * 2;
                const badgeX = (width - badgeWidth) / 2;
                const badgeY = height - (height * 0.15); // 15% from bottom

                // Shadow
                ctx.shadowColor = "rgba(0,0,0,0.3)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;

                // Badge Background
                ctx.fillStyle = "#FFFFFF";
                ctx.beginPath();
                ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 100); // Pill shape
                ctx.fill();

                // Reset Shadow
                ctx.shadowColor = "transparent";

                // Text
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(offerText, width / 2, badgeY + (badgeHeight / 2));
            }

            // Draw Logo (Top Left)
            if (logoUrl) {
                const logoImg = new Image();
                logoImg.crossOrigin = "anonymous";
                logoImg.src = logoUrl;
                logoImg.onload = () => {
                    const logoSize = Math.round(width * 0.15); // 15% of width
                    const margin = Math.round(width * 0.05); // 5% margin
                    
                    // Maintain aspect ratio of logo
                    const aspect = logoImg.width / logoImg.height;
                    let dw = logoSize;
                    let dh = logoSize / aspect;
                    
                    if (dh > logoSize) {
                        dh = logoSize;
                        dw = logoSize * aspect;
                    }

                    ctx.drawImage(logoImg, margin, margin, dw, dh);
                    triggerDownload();
                };
                logoImg.onerror = () => {
                    triggerDownload(); // Download anyway if logo fails
                };
            } else {
                triggerDownload();
            }
        };

        const triggerDownload = () => {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
            resolve();
        };
    });
};

export const BrandKitAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Inputs
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [brandName, setBrandName] = useState('');
    const [occasion, setOccasion] = useState('General');
    const [offerText, setOfferText] = useState('');

    // State
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<CampaignAnalysis | null>(null);
    const [generatedAssets, setGeneratedAssets] = useState<{
        square: string | null;
        portrait: string | null;
        landscape: string | null;
    }>({ square: null, portrait: null, landscape: null });
    
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['BrandKit AI'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setProductImage({ url: URL.createObjectURL(file), base64 });
            // Reset results
            setGeneratedAssets({ square: null, portrait: null, landscape: null });
            setAnalysis(null);
        }
        e.target.value = '';
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setLogoImage({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !auth.user) return;
        if (isLowCredits) {
            alert("Insufficient credits.");
            return;
        }

        setLoading(true);
        setGeneratedAssets({ square: null, portrait: null, landscape: null });

        try {
            // 1. Analyze & Research
            const analysisResult = await analyzeCampaignTrends(
                productImage.base64.base64,
                productImage.base64.mimeType,
                occasion,
                brandName
            );
            setAnalysis(analysisResult);

            // Deduct Credits
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Campaign Builder');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            // 2. Parallel Generation
            const [sq, pt, ls] = await Promise.all([
                generateCampaignAsset(productImage.base64.base64, productImage.base64.mimeType, analysisResult.visualDirection, '1:1'),
                generateCampaignAsset(productImage.base64.base64, productImage.base64.mimeType, analysisResult.visualDirection, '9:16'),
                generateCampaignAsset(productImage.base64.base64, productImage.base64.mimeType, analysisResult.visualDirection, '16:9')
            ]);

            const formatUrl = (b64: string) => `data:image/png;base64,${b64}`;
            
            // Save main asset to history (Square)
            await saveCreation(auth.user.uid, formatUrl(sq), `Campaign: ${occasion}`);

            setGeneratedAssets({
                square: formatUrl(sq),
                portrait: formatUrl(pt),
                landscape: formatUrl(ls)
            });

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

    const canGenerate = !!productImage && !isLowCredits && !!brandName;

    const AssetPreview: React.FC<{ 
        url: string | null; 
        ratio: string; 
        label: string; 
        format: 'square' | 'portrait' | 'landscape' 
    }> = ({ url, ratio, label, format }) => (
        <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-full relative group`}>
            <div className={`relative w-full bg-gray-100 flex items-center justify-center overflow-hidden ${ratio}`}>
                {loading ? (
                    <div className="flex flex-col items-center">
                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-[10px] text-green-600 font-bold animate-pulse">Designing...</p>
                    </div>
                ) : url ? (
                    <>
                        {/* The Image */}
                        <img src={url} className="w-full h-full object-cover" alt={label} />
                        
                        {/* Overlays Preview (HTML Overlay) */}
                        {/* Logo Overlay - Top Left */}
                        {logoImage && (
                            <div className="absolute top-4 left-4 w-[15%] aspect-square z-10">
                                <img src={logoImage.url} className="w-full h-full object-contain drop-shadow-lg" alt="logo" />
                            </div>
                        )}
                        {/* Offer Overlay - Bottom Center */}
                        {offerText && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1.5 rounded-full shadow-lg z-10 whitespace-nowrap">
                                <p className="text-xs font-bold">{offerText}</p>
                            </div>
                        )}

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                            <button 
                                onClick={() => mergeAndDownload(url, logoImage?.url || null, offerText, `${brandName}-${format}.png`, format)}
                                className="bg-white text-black px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:scale-105 transition-transform"
                            >
                                <DownloadIcon className="w-4 h-4" /> Download Ad
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-gray-300 flex flex-col items-center">
                        <BrandKitIcon className="w-8 h-8 mb-2 opacity-50"/>
                        <p className="text-[10px] font-bold uppercase tracking-wider">Pending</p>
                    </div>
                )}
            </div>
            <div className="p-3 bg-white border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-700">{label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{format}</span>
            </div>
        </div>
    );

    return (
        <>
            <FeatureLayout
                title="Campaign Builder"
                description="Create multi-format ad campaigns instantly. Upload your product, logo, and offer."
                icon={<BrandKitIcon className="w-6 h-6 text-green-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={null} 
                hideGenerateButton={true} // Custom layout
                resultHeightClass="h-auto"
                // LEFT: Inputs
                leftContent={
                    <div className="flex flex-col gap-6 h-full">
                        {/* 1. Brand Assets */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">1. Brand Assets</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <CompactUpload 
                                    label="Product Image" 
                                    image={productImage} 
                                    onUpload={handleProductUpload} 
                                    onClear={() => setProductImage(null)}
                                    icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>}
                                />
                                <CompactUpload 
                                    label="Brand Logo" 
                                    image={logoImage} 
                                    onUpload={handleLogoUpload} 
                                    onClear={() => setLogoImage(null)}
                                    icon={<UploadTrayIcon className="w-6 h-6 text-purple-400"/>}
                                />
                            </div>
                            <InputField 
                                label="Brand Name" 
                                placeholder="e.g. LuxeSkin" 
                                value={brandName} 
                                onChange={(e: any) => setBrandName(e.target.value)} 
                            />
                        </div>

                        {/* 2. Campaign Config */}
                        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex-1">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">2. Campaign Details</h3>
                            
                            <OccasionSelector selected={occasion} onSelect={setOccasion} />
                            
                            <InputField 
                                label="Offer Text (Will appear on ad)" 
                                placeholder="e.g. 50% OFF - Limited Time" 
                                value={offerText} 
                                onChange={(e: any) => setOfferText(e.target.value)} 
                            />

                            <button 
                                onClick={handleGenerate}
                                disabled={!canGenerate || loading}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all mt-4 flex items-center justify-center gap-2 ${
                                    !canGenerate || loading
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-black text-white hover:bg-gray-800 hover:scale-[1.02]'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Creating Campaign...</span>
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5 text-green-400" />
                                        <span>Generate Campaign</span>
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wide">Cost: {cost} Credits</p>
                        </div>
                    </div>
                }
                // RIGHT: Results (Campaign Board)
                rightContent={
                    <div className="h-full flex flex-col">
                        {analysis && (
                            <div className="bg-green-50 border border-green-100 p-4 rounded-2xl mb-6 flex flex-col gap-2 animate-fadeIn shrink-0">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-white rounded-full shadow-sm">
                                        <SparklesIcon className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-green-800 text-sm">AI Strategy: {analysis.headline}</h4>
                                        <p className="text-xs text-green-700 mt-1 line-clamp-2">{analysis.visualDirection}</p>
                                    </div>
                                </div>
                                {/* Copy Caption Button */}
                                <div className="bg-white rounded-lg p-2 flex items-center justify-between mt-1 border border-green-100">
                                    <p className="text-xs text-gray-600 truncate flex-1 pr-2 italic">"{analysis.caption}"</p>
                                    <button onClick={() => navigator.clipboard.writeText(analysis.caption)} className="text-green-600 hover:text-green-800">
                                        <CopyIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 h-full pb-4">
                            {/* Feed (Square) */}
                            <div className="col-span-1 h-64 sm:h-auto">
                                <AssetPreview 
                                    url={generatedAssets.square} 
                                    ratio="aspect-square" 
                                    label="Social Feed" 
                                    format="square" 
                                />
                            </div>
                            
                            {/* Story (Portrait) */}
                            <div className="col-span-1 h-64 sm:h-auto">
                                <AssetPreview 
                                    url={generatedAssets.portrait} 
                                    ratio="aspect-[9/16]" 
                                    label="Story / Reel" 
                                    format="portrait" 
                                />
                            </div>

                            {/* Banner (Landscape) - Spans full width on small grids */}
                            <div className="col-span-2 h-48 sm:h-auto">
                                <AssetPreview 
                                    url={generatedAssets.landscape} 
                                    ratio="aspect-[16/9]" 
                                    label="Web Banner" 
                                    format="landscape" 
                                />
                            </div>
                        </div>
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleProductUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
