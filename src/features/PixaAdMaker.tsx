import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, UploadPlaceholder } from '../components/FeatureLayout';
import { 
    MagicAdsIcon, ArrowRightIcon, ArrowLeftIcon, CubeIcon, UsersIcon, XIcon, SparklesIcon, PlusIcon, FlagIcon, PencilIcon, CreditCoinIcon
} from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';
import { fileToBase64, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { GoogleGenAI } from "@google/genai";
import { ResultToolbar } from '../components/ResultToolbar';
import { RefinementPanel } from '../components/RefinementPanel';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { RefundModal } from '../components/RefundModal';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import { refineStudioImage } from '../services/photoStudioService';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { saveCreation, updateCreation, deductCredits } from '../firebase';
import { checkMilestone, MilestoneSuccessModal } from '../components/FeatureLayout';

// --- CONSTANTS ---
const INDUSTRY_CONFIG: Record<string, { label: string; icon: any }> = {
    'ecommerce': { label: 'Ecommerce', icon: EcommerceAdIcon },
    'fmcg': { label: 'FMCG', icon: FMCGIcon },
    'fashion': { label: 'Fashion', icon: EcommerceAdIcon }, // Using Ecommerce icon as fallback if Fashion icon not in adMakerIcons
    'realty': { label: 'Real Estate', icon: RealtyAdIcon },
    'food': { label: 'Food and Dining', icon: FoodIcon },
    'saas': { label: 'SaaS/Tech', icon: SaaSRequestIcon },
    'education': { label: 'Education', icon: EducationAdIcon },
    'services': { label: 'Services', icon: ServicesAdIcon },
};

type AdMakerPhase = 'industry_select' | 'mode_select';

const IndustryCard: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    styles: { card: string; orb: string; icon: string; };
}> = ({ title, icon, onClick, styles }) => (
    <button onClick={onClick} className={`${AdMakerStyles.modeCard} ${styles.card}`}>
        <div className={`${AdMakerStyles.orb} ${styles.orb}`}></div>
        <div className={`${AdMakerStyles.iconGlass} ${styles.icon}`}>{icon}</div>
        <div className={AdMakerStyles.contentWrapper}>
            <h3 className={AdMakerStyles.title}> {title} </h3>
            <p className={AdMakerStyles.desc}> Optimized for {title} </p>
        </div>
        <div className={AdMakerStyles.actionBtn}>
            <ArrowRightIcon className={AdMakerStyles.actionIcon}/>
        </div>
    </button>
);

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [phase, setPhase] = useState<AdMakerPhase>('industry_select');
    const [industry, setIndustry] = useState<string | null>(null);
    const [mode, setMode] = useState<'product' | 'model' | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [suggestions, setSuggestions] = useState<{ headline: string; displayPrompt: string; detailedPrompt: string }[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const progress = useSimulatedProgress(isGenerating || isRefining);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;

    React.useEffect(() => { 
        let interval: any; 
        if (isGenerating || isRefining) { 
            const steps = isRefining 
                ? ["Analyzing ad structure...", "Refining visual hook...", "Polishing marketing elements...", "Finalizing production..."] 
                : ["Pixa is analyzing industry trends...", "Pixa is enhancing product assets...", "Pixa is blending creative elements...", "Pixa is designing ad layout...", "Pixa is polishing..."]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 5000); 
        } 
        return () => clearInterval(interval); 
    }, [isGenerating, isRefining]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { base64, mimeType } = await fileToBase64(file);
                const blobUrl = await base64ToBlobUrl(base64, mimeType);
                setImage(blobUrl);
                setBase64Image(`data:${mimeType};base64,${base64}`);
            } catch (err) {
                console.error("Upload failed:", err);
            }
        }
    };

    const performPixaVisionScan = async () => {
        if (!base64Image) return;
        setIsScanning(true);
        setSuggestions([]);
        setSelectedSuggestion(null);

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("GEMINI_API_KEY is missing from environment. Please ensure it is set in the platform settings.");
            }
            
            const ai = new GoogleGenAI({ apiKey });
            
            // Extract mimeType and data from base64Image
            const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
            const imageData = base64Image.split(',')[1];

            const response = await ai.models.generateContent({
                model: "gemini-3.1-pro-preview",
                contents: [
                    {
                        parts: [
                            { text: `You are Pixa AI, a world-class creative director and marketing expert. 
Analyze this product image (identify the product, its material, category, and unique selling points).
Use Google Search to find current trends and successful ad campaigns for similar products in the ${industry} industry.
Search for the best creative ads available in Google Search for this type of product.

Then, generate 5 highly creative and high-converting ad prompts for this product.
Each suggestion should include:
1. A catchy 'displayPrompt' for the user to see. This should be 2-3 detailed and descriptive sentences explaining the visual concept, the background, the lighting, and the overall vibe (e.g., "A clean, minimalist studio setup with soft top-down lighting and a neutral grey background to make the product colors pop. The scene feels premium and modern.").
2. A very detailed 'detailedPrompt' for an AI image generator (describing the scene, lighting, product placement, and professional photography details). This should be the "secret" prompt.
3. A catchy marketing 'headline'.

Output ONLY a JSON array of 5 objects with 'headline', 'displayPrompt', and 'detailedPrompt' keys. Do not include any other text or markdown formatting.` },
                            { inlineData: { data: imageData, mimeType } }
                        ]
                    }
                ],
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const text = response.text;
            if (!text) throw new Error("AI response text is empty");
            
            // Robust JSON parsing to handle potential markdown blocks or extra text
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            const data = JSON.parse(jsonStr);
            
            if (Array.isArray(data)) {
                setSuggestions(data);
            } else {
                throw new Error("AI response is not a JSON array");
            }
        } catch (error: any) {
            console.error("Scan failed:", error);
            setNotification({ msg: `Scan failed: ${error.message || "Unknown error"}`, type: 'error' });
        } finally {
            setIsScanning(false);
        }
    };

    const handleIndustrySelect = (ind: string) => {
        setIndustry(ind);
        setPhase('mode_select');
    };

    const handleModeSelect = (m: 'product' | 'model') => {
        setMode(m);
        if (m === 'product' || m === 'model') {
            performPixaVisionScan();
        }
    };

    const handleGenerateAd = async () => {
        if (selectedSuggestion === null || !base64Image || !auth.user) return;
        if (auth.user.credits < cost) {
            setNotification({ msg: "Insufficient credits.", type: 'error' });
            return;
        }
        setIsGenerating(true);
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");
            const ai = new GoogleGenAI({ apiKey });
            
            const suggestion = suggestions[selectedSuggestion];
            const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
            const imageData = base64Image.split(',')[1];

            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-image-preview",
                contents: [
                    {
                        parts: [
                            { text: `Generate a highly professional, high-converting advertisement image for this product. 
Concept: ${suggestion.detailedPrompt}
Marketing Headline to include in the design: "${suggestion.headline}"
The ad should be trend-ready, social media optimized, with perfect text placement and professional graphic design elements. 
The product from the image should be the central focus.` },
                            { inlineData: { data: imageData, mimeType } }
                        ]
                    }
                ]
            });

            let generatedB64 = "";
            const candidates = response.candidates;
            if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.inlineData) {
                        generatedB64 = part.inlineData.data || "";
                        break;
                    }
                }
            }

            if (generatedB64) {
                const blobUrl = await base64ToBlobUrl(generatedB64, 'image/png');
                setResultImage(blobUrl);
                
                const dataUri = `data:image/png;base64,${generatedB64}`;
                const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa AdMaker');
                setLastCreationId(creationId);

                const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
                if (updatedUser.lifetimeGenerations) {
                    const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                    if (bonus !== false) setMilestoneBonus(bonus);
                }
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            } else {
                throw new Error("No image generated by AI");
            }
        } catch (error: any) {
            console.error("Generation failed:", error);
            setNotification({ msg: `Generation failed: ${error.message}`, type: 'error' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !base64Image || !auth.user) return;
        const refineCost = 5;
        if (auth.user.credits < refineCost) {
            setNotification({ msg: "Insufficient credits for refinement.", type: 'error' });
            return;
        }

        setIsRefining(true);
        setIsRefineActive(false);
        try {
            const currentB64 = await urlToBase64(resultImage);
            const originalMimeMatch = base64Image.match(/^data:([^;]+);base64,/);
            const originalMime = originalMimeMatch ? originalMimeMatch[1] : "image/jpeg";
            const originalData = base64Image.split(',')[1];

            const res = await refineStudioImage(
                currentB64.base64, 
                currentB64.mimeType, 
                refineText, 
                "Professional Advertisement", 
                auth.user?.basePlan || undefined,
                { base64: originalData, mimeType: originalMime },
                suggestions[selectedSuggestion || 0]?.detailedPrompt
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa AdMaker (Refined)');
                setLastCreationId(id);
            }

            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa AdMaker Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Ad Retoucher: Masterpiece updated!", type: 'success' });
        } catch (error: any) {
            console.error("Refinement failed:", error);
            setNotification({ msg: `Refinement failed: ${error.message}`, type: 'error' });
        } finally {
            setIsRefining(false);
        }
    };

    const handleRefundRequest = async (reason: string) => { 
        if (!auth.user || !resultImage) return; 
        setIsRefunding(true); 
        try { 
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "AdMaker Generation", lastCreationId || undefined); 
            if (res.success) { 
                if (res.type === 'refund') { 
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); 
                    setResultImage(null); 
                    setNotification({ msg: res.message, type: 'success' }); 
                } else { 
                    setNotification({ msg: res.message, type: 'info' }); 
                } 
            } 
            setShowRefundModal(false); 
        } catch (e: any) { 
            alert("Refund processing failed: " + e.message); 
        } finally { 
            setIsRefunding(false); 
        } 
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const { claimMilestoneBonus } = await import('../firebase');
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        setMilestoneBonus(undefined);
    };

    const handleNewProject = () => {
        setPhase('industry_select');
        setIndustry(null);
        setMode(null);
        setImage(null);
        setBase64Image(null);
        setSuggestions([]);
        setSelectedSuggestion(null);
        setResultImage(null);
        setIsRefineActive(false);
    };

    return (
        <>
            <FeatureLayout
            title="Pixa AdMaker"
            description="Create high-converting ads for your business in seconds."
            icon={<MagicAdsIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>}
            rawIcon={true}
            creditCost={cost}
            hideGenerateButton={true}
            onGenerate={handleGenerateAd}
            isGenerating={isGenerating || isRefining}
            canGenerate={selectedSuggestion !== null && !!image}
            resultImage={resultImage}
            resultOverlay={resultImage ? (
                <ResultToolbar 
                    onNew={handleNewProject} 
                    onRegen={handleGenerateAd} 
                    onReport={() => setShowRefundModal(true)} 
                />
            ) : null}
            canvasOverlay={
                <RefinementPanel 
                    isActive={isRefineActive && !!resultImage} 
                    isRefining={isRefining} 
                    onClose={() => setIsRefineActive(false)} 
                    onRefine={handleRefine} 
                    refineCost={5} 
                />
            }
            customActionButtons={resultImage ? (
                <button 
                    onClick={() => setIsRefineActive(!isRefineActive)}
                    className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-4 py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                >
                    <PencilIcon className="w-4 h-4" />
                    <span>Make Changes</span>
                </button>
            ) : null}
            leftContent={
                <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <LoadingOverlay isVisible={isGenerating || isRefining} loadingText={loadingText} progress={progress} />
                    {phase === 'mode_select' && !image ? (
                        <UploadPlaceholder 
                            label="Upload Product Image" 
                            onClick={() => fileInputRef.current?.click()} 
                            icon={<MagicAdsIcon className="w-12 h-12 text-gray-400 group-hover:text-indigo-600 transition-colors" />}
                        />
                    ) : image ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                             {!(isGenerating || isRefining) && (
                                 <img src={image} className="max-w-full max-h-full object-contain rounded-2xl transition-all duration-700" />
                             )}
                             
                             {isScanning && (
                                <div className={AdMakerStyles.scanOverlay}>
                                    <div className={AdMakerStyles.scanLine}></div>
                                    <div className={AdMakerStyles.scanGradient}></div>
                                    <div className={AdMakerStyles.analysisBadge}>
                                        <div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div>
                                        <span className={AdMakerStyles.scanText}>Pixa Vision Scan</span>
                                    </div>
                                </div>
                             )}

                             {!isScanning && !isGenerating && !isRefining && (
                                <button 
                                    onClick={() => { setImage(null); setBase64Image(null); setSuggestions([]); setMode(null); }}
                                    className="absolute top-4 right-4 bg-white/80 hover:bg-white text-red-500 p-2 rounded-full shadow-md backdrop-blur-sm transition-all z-30"
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                             )}
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                                <MagicAdsIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Pixa AdMaker</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                Select your industry and ad mode to start creating professional advertisements.
                            </p>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        accept="image/*" 
                    />
                </div>
            }
            rightContent={
                <div className={`${AdMakerStyles.formContainer} ${phase === 'mode_select' && !image ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                    {phase === 'industry_select' && (
                        <div className="animate-fadeIn">
                            <div className="mb-6 px-4">
                                <h3 className="text-xl font-black text-gray-900">Select Industry</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Choose your business category</p>
                            </div>
                            <div className={AdMakerStyles.modeGrid}>
                                {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => (
                                    <IndustryCard 
                                        key={key} 
                                        title={conf.label} 
                                        icon={<conf.icon className="w-8 h-8"/>} 
                                        onClick={() => handleIndustrySelect(key)}
                                        styles={{ 
                                            card: AdMakerStyles[`card${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.cardEcommerce, 
                                            orb: AdMakerStyles[`orb${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.orbEcommerce, 
                                            icon: AdMakerStyles[`icon${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.iconEcommerce 
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {phase === 'mode_select' && (
                        <div className="animate-fadeIn flex flex-col h-full">
                            <button 
                                onClick={() => { 
                                    setPhase('industry_select'); 
                                    setMode(null); 
                                    setSuggestions([]); 
                                    setSelectedSuggestion(null);
                                }} 
                                className={AdMakerStyles.backButton}
                            >
                                <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                            </button>

                            {!mode ? (
                                <>
                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-black text-gray-900 mb-2">Select Ad Mode</h3>
                                        <p className="text-sm text-gray-500">How should we feature your product?</p>
                                    </div>
                                    <div className={AdMakerStyles.engineGrid}>
                                        <button 
                                            onClick={() => handleModeSelect('product')} 
                                            className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-48`}
                                        >
                                            <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbProduct}`}></div>
                                            <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconProduct}`}>
                                                <CubeIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 mt-4">Product Ad</h4>
                                            <p className="text-xs text-gray-500 font-medium">Clean studio setup</p>
                                        </button>
                                        <button 
                                            onClick={() => handleModeSelect('model')} 
                                            className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-48`}
                                        >
                                            <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbModel}`}></div>
                                            <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconModel}`}>
                                                <UsersIcon className="w-8 h-8" />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 mt-4">Model Ad</h4>
                                            <p className="text-xs text-gray-500 font-medium">Human lifestyle context</p>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {isScanning ? (
                                        <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-sm font-bold text-indigo-600 animate-pulse">Pixa AI is analyzing your product...</p>
                                        </div>
                                    ) : suggestions.length > 0 ? (
                                        <div className="flex-1 flex flex-col overflow-hidden">
                                            <div className="mb-4">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Pixa AI Suggestions</h4>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Select a creative concept</p>
                                            </div>
                                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                                {suggestions.map((s, i) => (
                                                    <div 
                                                        key={i}
                                                        onClick={() => setSelectedSuggestion(i)}
                                                        className={`${AdMakerStyles.suggestionCapsule} ${selectedSuggestion === i ? AdMakerStyles.suggestionCapsuleActive : ''}`}
                                                    >
                                                        <div className={`${AdMakerStyles.suggestionGradientBorder} ${selectedSuggestion === i ? AdMakerStyles.suggestionGradientBorderActive : ''}`}></div>
                                                        <span className={AdMakerStyles.suggestionHeadline}>{s.headline}</span>
                                                        <p className={AdMakerStyles.suggestionText}>"{s.displayPrompt}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                            
                                            <div className="pt-6 mt-auto">
                                                <button 
                                                    disabled={selectedSuggestion === null || isGenerating}
                                                    className={AdMakerStyles.generateButton}
                                                    onClick={handleGenerateAd}
                                                >
                                                    Generate Ad
                                                </button>
                                                <p className="text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest mt-3">
                                                    Cost: {cost} Credits
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                            <p className="text-sm font-bold text-gray-400">Something went wrong. Please try again.</p>
                                            <button 
                                                onClick={() => performPixaVisionScan()}
                                                className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                            >
                                                Retry Scan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            }
        />
        {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="AdMaker" />}
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
        {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
    </>
    );
};
