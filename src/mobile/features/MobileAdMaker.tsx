import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    MagicAdsIcon, ArrowRightIcon, ArrowLeftIcon, CubeIcon, UsersIcon, XIcon, SparklesIcon, PlusIcon, 
    DownloadIcon, RegenerateIcon, CreditCoinIcon, RefreshIcon, LockIcon, GlobeIcon, ImageIcon, CameraIcon,
    PencilIcon
} from '../../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../../components/icons/adMakerIcons';
import { AdMakerStyles } from '../../styles/features/PixaAdMaker.styles';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { GoogleGenAI } from "@google/genai";
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';
import { ImageModal } from '../../components/FeatureLayout';
import { refineStudioImage } from '../../services/photoStudioService';

// --- CONSTANTS ---
const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; isPhysical: boolean }> = {
    'ecommerce': { label: 'Ecommerce', icon: EcommerceAdIcon, isPhysical: true },
    'fmcg': { label: 'FMCG', icon: FMCGIcon, isPhysical: true },
    'fashion': { label: 'Fashion', icon: EcommerceAdIcon, isPhysical: true },
    'realty': { label: 'Real Estate', icon: RealtyAdIcon, isPhysical: true },
    'food': { label: 'Food and Dining', icon: FoodIcon, isPhysical: true },
    'saas': { label: 'SaaS/Tech', icon: SaaSRequestIcon, isPhysical: false },
    'education': { label: 'Education', icon: EducationAdIcon, isPhysical: false },
    'services': { label: 'Services', icon: ServicesAdIcon, isPhysical: false },
};

const INDUSTRY_STYLES: Record<string, { id: string; label: string; icon: string }[]> = {
    'ecommerce': [
        { id: 'clean_studio', label: 'Clean Studio', icon: '⚪' },
        { id: 'outdoor_street', label: 'Outdoor/Street', icon: '🌳' },
        { id: 'luxury_premium', label: 'Luxury/Premium', icon: '✨' },
        { id: 'vintage_retro', label: 'Vintage/Retro', icon: '🎞️' },
        { id: 'minimalist', label: 'Minimalist', icon: '🔍' },
    ],
    'fmcg': [
        { id: 'bright_colorful', label: 'Bright & Colorful', icon: '🌈' },
        { id: 'fresh_natural', label: 'Fresh & Natural', icon: '🍃' },
        { id: 'home_kitchen', label: 'Home/Kitchen', icon: '🏠' },
        { id: 'energetic_action', label: 'Energetic/Action', icon: '⚡' },
        { id: 'modern_sleek', label: 'Modern/Sleek', icon: '💎' },
    ],
    'realty': [
        { id: 'modern_sleek', label: 'Modern/Sleek', icon: '🏢' },
        { id: 'cozy_warm', label: 'Cozy/Warm', icon: '🛋️' },
        { id: 'luxury_grand', label: 'Luxury/Grand', icon: '🏰' },
        { id: 'nature_green', label: 'Nature/Green', icon: '🌳' },
        { id: 'sunset_evening', label: 'Sunset/Evening', icon: '🌇' },
    ],
    'food': [
        { id: 'rustic_wooden', label: 'Rustic/Wooden', icon: '🪵' },
        { id: 'modern_clean', label: 'Modern/Clean', icon: '🍽️' },
        { id: 'moody_elegant', label: 'Moody/Elegant', icon: '🕯️' },
        { id: 'fresh_healthy', label: 'Fresh/Healthy', icon: '🥗' },
        { id: 'casual_cafe', label: 'Casual/Cafe', icon: '☕' },
    ],
    'saas': [
        { id: 'high_tech_neon', label: 'High-Tech/Neon', icon: '💻' },
        { id: 'graphic_editorial', label: 'Graphic/Editorial', icon: '🎨' },
        { id: 'creative_startup', label: 'Creative/Startup', icon: '🚀' },
        { id: 'clean_minimalist', label: 'Clean/Minimalist', icon: '⚪' },
        { id: 'sleek_dark_mode', label: 'Sleek Dark Mode', icon: '🌑' },
    ],
    'education': [
        { id: 'academic_classic', label: 'Academic/Classic', icon: '📚' },
        { id: 'modern_digital', label: 'Modern/Digital', icon: '💻' },
        { id: 'graphic_editorial', label: 'Graphic/Editorial', icon: '🎨' },
        { id: 'focus_minimal', label: 'Focus/Minimal', icon: '🎯' },
        { id: 'inspirational', label: 'Inspirational', icon: '🌟' },
    ],
    'services': [
        { id: 'trust_professional', label: 'Trust/Professional', icon: '🤝' },
        { id: 'action_onsite', label: 'Action/On-site', icon: '🛠️' },
        { id: 'graphic_editorial', label: 'Graphic/Editorial', icon: '🎨' },
        { id: 'sleek_office', label: 'Sleek/Office', icon: '🏢' },
        { id: 'industrial_strong', label: 'Industrial/Strong', icon: '🏗️' },
    ],
    'fashion': [
        { id: 'editorial', label: 'Editorial', icon: '📸' },
        { id: 'street_urban', label: 'Street/Urban', icon: '🏙️' },
        { id: 'minimalist', label: 'Minimalist', icon: '⚪' },
        { id: 'vintage_film', label: 'Vintage/Film', icon: '🎞️' },
        { id: 'luxury_glamour', label: 'Luxury/Glamour', icon: '💎' },
    ]
};

const AD_FORMATS = [
    { id: '1:1', label: 'Square', desc: 'Feed (1:1)', icon: <div className="w-5 h-5 border-2 border-current rounded-sm" /> },
    { id: '9:16', label: 'Vertical', desc: 'Story (9:16)', icon: <div className="w-3.5 h-6 border-2 border-current rounded-sm" /> },
    { id: '16:9', label: 'Web', desc: 'Banner (16:9)', icon: <div className="w-7 h-3.5 border-2 border-current rounded-sm" /> },
];

const LANGUAGES = [
    { id: 'english', label: 'English', desc: 'Standard English', icon: '🇺🇸' },
    { id: 'hindi', label: 'Hindi', desc: 'Authentic Hindi', icon: '🇮🇳' },
    { id: 'marathi', label: 'Marathi', desc: 'Authentic Marathi', icon: '🚩' },
    { id: 'hinglish_hindi', label: 'Hinglish-Hindi', desc: 'Hindi in Latin script', icon: '💬' },
    { id: 'hinglish_marathi', label: 'Hinglish-Marathi', desc: 'Marathi in Latin script', icon: '🗣️' },
];

const AD_STEPS = [
    { id: 'industry', label: 'Industry' },
    { id: 'style', label: 'Style' },
    { id: 'format', label: 'Format' },
    { id: 'language', label: 'Language' },
    { id: 'mode', label: 'Mode' },
    { id: 'config', label: 'Config' },
    { id: 'ai_suggestion', label: 'AI Suggestion' }
];

// Custom Refine Icon
const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

export const MobileAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- UI State ---
    const [image, setImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing...");
    const [progressPercent, setProgressPercent] = useState(0);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);

    // Tray Navigation
    const [currentStep, setCurrentStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string>>({});
    const [customStyle, setCustomStyle] = useState('');
    const [brandUrl, setBrandUrl] = useState('');
    const [urlError, setUrlError] = useState(false);
    const [includeLogo, setIncludeLogo] = useState(true);
    const [includeCta, setIncludeCta] = useState(true);
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [isSuggestionTrayOpen, setIsSuggestionTrayOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [fetchedLogo, setFetchedLogo] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const refineCost = 5;
    const isLowCredits = (auth.user?.credits || 0) < cost;

    const validateUrl = (url: string) => {
        if (!url) {
            setUrlError(false);
            return;
        }
        const pattern = /^(https?:\/\/)?(www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
        setUrlError(!pattern.test(url));
    };

    const isStepAccessible = (idx: number): boolean => {
        // Step 0 (Industry) is always accessible to start
        if (idx === 0) return true;
        
        // Always allow clicking on previous steps
        if (idx <= currentStep) return true;
        
        // Cannot move to any step beyond 0 without an image
        if (!image) return false;
        
        // Industry is mandatory for all steps after 0
        if (!selections.industry) return false;
        
        const prevStep = AD_STEPS[idx - 1];
        if (!prevStep) return true;
        
        // Allow moving forward if previous step is filled or is optional (config)
        // Style is filled if either a preset is selected or custom style is provided
        const prevIsFilled = prevStep.id === 'style' 
            ? (!!selections.style || !!customStyle)
            : prevStep.id === 'config' 
                ? !urlError 
                : (!!selections[prevStep.id] || prevStep.id === 'ai_suggestion');

        return prevIsFilled;
    };

    const isStrategyComplete = useMemo(() => {
        return !!image && !!selections.industry && (!!selections.style || !!customStyle) && !!selections.format && !!selections.language && !!selections.mode && !!selectedSuggestion;
    }, [image, selections, customStyle, selectedSuggestion]);

    useEffect(() => {
        let interval: any;
        if (isGenerating || isScanning) {
            setProgressPercent(0);
            const steps = isScanning ? [
                "Pixa Vision: Scanning product details...",
                "AI Strategist: Crafting creative angles...",
                "Market Analysis: Optimizing for conversion...",
                "Finalizing: Preparing ad concepts..."
            ] : [
                "Pixa Engine: Setting up studio lighting...",
                "Neural Core: Rendering high-fidelity textures...",
                "Ray-Tracing: Calculating realistic shadows...",
                "Elite Retoucher: Harmonizing brand elements...",
                "Finalizing: Polishing 8K ad output..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 4), 98);
                });
            }, 1800);
        } else {
            setProgressPercent(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating, isScanning]);

    useEffect(() => {
        if (brandUrl && brandUrl.includes('.')) {
            try {
                const domain = brandUrl.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
                if (domain) {
                    setFetchedLogo(`https://logo.clearbit.com/${domain}`);
                }
            } catch (e) {
                setFetchedLogo(null);
            }
        } else {
            setFetchedLogo(null);
        }
    }, [brandUrl]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const { base64, mimeType } = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64, mimeType });
            setResult(null);
            setLastCreationId(null);
        }
    };

    const handleSelectOption = (stepId: string, option: string) => {
        if (isGenerating || isScanning) return;
        setSelections(prev => ({ ...prev, [stepId]: option }));
        if (currentStep < AD_STEPS.length - 1) {
            setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 150);
        }
    };

    const handleGenerate = async () => {
        if (!image || !isStrategyComplete || !auth.user || isGenerating || isScanning) return;
        
        if (isLowCredits) {
            alert(`Insufficient credits. Required: ${cost}`);
            return;
        }

        onGenerationStart();
        setIsGenerating(true); // Start animation immediately

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");
            const ai = new GoogleGenAI({ apiKey });

            const industry = selections.industry;
            const styleLabel = customStyle || INDUSTRY_STYLES[industry]?.find(s => s.id === selections.style)?.label || 'General';
            const languageConfig = LANGUAGES.find(l => l.id === selections.language) || LANGUAGES[0];

            // Generation Phase
            const genPrompt = `
                Generate a professional high-converting ad image based on this specific AI suggestion: "${selectedSuggestion}".
                
                Context:
                Industry: ${INDUSTRY_CONFIG[industry].label}
                Style: ${styleLabel}
                Format: ${selections.format}
                Language: ${languageConfig.label}
                ${selections.mode === 'model' ? 'MANDATORY: The scene MUST feature professional Indian models with clear Indian ethnicity and features.' : ''}
                ${brandUrl ? `Fetch brand logo and style from website: ${brandUrl}` : ''}
                
                DO NOT include any Call to Action (CTA) buttons or text in the image.
                Integrate the product/logo from the original image naturally.
            `;

            const genResponse = await ai.models.generateContent({
                model: "gemini-3.1-flash-image-preview",
                contents: [
                    { parts: [{ text: genPrompt }, { inlineData: { data: image.base64, mimeType: image.mimeType } }] }
                ],
                config: {
                    imageConfig: { aspectRatio: selections.format as any }
                }
            });

            let resB64 = "";
            const candidate = genResponse.candidates?.[0];
            if (candidate?.content?.parts) {
                for (const part of candidate.content.parts) {
                    if (part.inlineData?.data) {
                        resB64 = part.inlineData.data;
                        break;
                    }
                }
            }

            if (!resB64) throw new Error("No image generated");

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            // Persistence
            try {
                const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker (Mobile)');
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa AdMaker');
                setLastCreationId(creationId);
            } catch (e) { console.warn("Persistence error:", e); }

        } catch (e: any) {
            console.error("AdMaker Error:", e);
            alert("Generation failed. Please try again.");
            setIsGenerating(false);
        }
    };

    const generateAISuggestions = async () => {
        if (!image || !selections.industry || (!selections.style && !customStyle) || isGeneratingSuggestions) return;
        setIsGeneratingSuggestions(true);
        setIsSuggestionTrayOpen(true);

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");
            const ai = new GoogleGenAI({ apiKey });

            const industry = selections.industry;
            const styleLabel = customStyle || INDUSTRY_STYLES[industry]?.find(s => s.id === selections.style)?.label || 'General';
            const languageConfig = LANGUAGES.find(l => l.id === selections.language) || LANGUAGES[0];

            const prompt = `
                Generate 5 high-converting ad concept suggestions for a ${INDUSTRY_CONFIG[industry].label} product.
                Style: ${styleLabel}
                Language: ${languageConfig.label}
                
                Each suggestion should be a concise 1-2 sentence description of an ad scene and headline.
                Output ONLY a JSON array of 5 strings.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ parts: [{ text: prompt }, { inlineData: { data: image.base64, mimeType: image.mimeType } }] }],
                config: { responseMimeType: "application/json" }
            });

            const suggestions = JSON.parse(response.text || "[]");
            setAiSuggestions(suggestions);
        } catch (e) {
            console.error("Failed to generate suggestions:", e);
            setAiSuggestions([
                "A premium minimalist showcase of the product with soft studio lighting.",
                "Lifestyle shot featuring the product in a modern Indian home setting.",
                "Dynamic action shot emphasizing the product's durability and speed.",
                "Elegant flat-lay arrangement with organic elements and soft textures.",
                "Bold editorial style ad with high contrast and vibrant brand colors."
            ]);
        } finally {
            setIsGeneratingSuggestions(false);
        }
    };

    const handleRefine = async (text: string) => {
        if (!result || !text.trim() || !auth.user || isGenerating) return;
        setIsGenerating(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const resB64 = await refineStudioImage(
                currentB64.base64, 
                currentB64.mimeType, 
                text, 
                "Ad Design",
                auth.user?.basePlan || undefined,
                { base64: image!.base64, mimeType: image!.mimeType }
            );
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${resB64}`);
            }
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setResult(null);
        setSelections({});
        setCustomStyle('');
        setBrandUrl('');
        setUrlError(false);
        setSelectedSuggestion(null);
        setAiSuggestions([]);
        setFetchedLogo(null);
        setCurrentStep(0);
        setLastCreationId(null);
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header */}
            <div className="flex-none flex flex-col bg-white z-50">
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <MagicAdsIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter text-black">Pixa AdMaker</span>
                </div>

                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!result && !isGenerating && !isScanning && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button 
                                onClick={() => downloadImage(result, 'pixa-ad.png')}
                                className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        ) : !result && (
                            <button 
                                onClick={handleGenerate}
                                disabled={!isStrategyComplete || isGenerating || isScanning || isLowCredits}
                                className={`px-10 py-3.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                    !isStrategyComplete || isGenerating || isScanning || isLowCredits
                                    ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                    : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                                }`}
                            >
                                {isScanning ? 'Scanning...' : isGenerating ? 'Rendering...' : 'Generate'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage / Canvas Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${image ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : (isGenerating || isScanning) ? (
                            null 
                        ) : image ? (
                            <img src={image.url} className={`max-w-[85%] max-h-[85%] object-contain animate-fadeIn transition-all`} />
                        ) : (
                            <div 
                                onClick={() => {
                                    if (currentStep === 0) {
                                        fileInputRef.current?.click();
                                    } else {
                                        alert("Image must be uploaded in the first step (Industry).");
                                        setCurrentStep(0);
                                    }
                                }} 
                                className="text-center group active:scale-95 transition-all"
                            >
                                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100 group-hover:scale-110 transition-transform">
                                    <MagicAdsIcon className="w-10 h-10 text-indigo-50" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                    {selections.industry && !INDUSTRY_CONFIG[selections.industry].isPhysical ? 'Upload Screenshot/Logo' : 'Upload Product'}
                                </h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                            </div>
                        )}

                        {(isScanning || isGenerating) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] w-full max-w-[300px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-50" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">
                                            {isScanning ? 'Vision Scan' : 'Neural Core'}
                                        </span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse max-w-[180px] leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {image && !result && !isGenerating && !isScanning && (
                        <button 
                            onClick={handleReset}
                            className="absolute top-4 right-4 z-[60] bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-700" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-700">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Tray */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0 border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <div className={`flex-1 flex flex-col transition-all duration-300 ${isGenerating || isScanning ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                <CustomRefineIcon className="w-5 h-5" /> Make Changes
                            </button>
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button onClick={handleReset} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                    <PlusIcon className="w-4 h-4" /> New Project
                                </button>
                                <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 shadow-sm">
                                    <RegenerateIcon className="w-4 h-4" /> Regenerate
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {/* Step Option Container */}
                            <div className="h-[160px] flex items-center relative overflow-hidden">
                                {AD_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {step.id === 'industry' ? (
                                            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
                                                {Object.entries(INDUSTRY_CONFIG).map(([id, cfg]) => (
                                                    <button 
                                                        key={id} 
                                                        onClick={() => handleSelectOption('industry', id)}
                                                        className={`shrink-0 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all min-w-[100px] ${selections.industry === id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white border-gray-100 text-gray-600 shadow-sm'}`}
                                                    >
                                                        <cfg.icon className={`w-6 h-6 ${selections.industry === id ? 'text-white' : 'text-indigo-600'}`} />
                                                        <span className={`text-[10px] font-black uppercase tracking-wider`}>{cfg.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : step.id === 'style' ? (
                                            <div className="w-full flex flex-col gap-3 px-6 py-2">
                                                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                                                    {selections.industry ? INDUSTRY_STYLES[selections.industry].map(s => (
                                                        <button 
                                                            key={s.id} 
                                                            onClick={() => {
                                                                handleSelectOption('style', s.id);
                                                                setCustomStyle('');
                                                            }} 
                                                            className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-bold border transition-all ${selections.style === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                                                        >
                                                            <span className="mr-2">{s.icon}</span> {s.label}
                                                        </button>
                                                    )) : <p className="text-center w-full text-xs text-gray-400 font-bold uppercase tracking-widest">Select Industry First</p>}
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-inner">
                                                    <PencilIcon className="w-4 h-4 text-indigo-500" />
                                                    <input 
                                                        type="text" 
                                                        value={customStyle} 
                                                        onChange={e => {
                                                            setCustomStyle(e.target.value);
                                                            setSelections(prev => ({ ...prev, style: '' }));
                                                        }} 
                                                        placeholder="Or type custom style (e.g. Cyberpunk, Minimalist...)" 
                                                        className="bg-transparent text-[11px] font-bold outline-none flex-1 placeholder:text-gray-300" 
                                                    />
                                                </div>
                                            </div>
                                        ) : step.id === 'format' ? (
                                            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
                                                {AD_FORMATS.map(f => (
                                                    <button key={f.id} onClick={() => handleSelectOption('format', f.id)} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-2 ${selections.format === f.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                                        {f.icon}
                                                        <span className="text-[10px] uppercase tracking-widest">{f.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : step.id === 'language' ? (
                                            <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 py-2">
                                                {LANGUAGES.map(l => (
                                                    <button key={l.id} onClick={() => handleSelectOption('language', l.id)} className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${selections.language === l.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                                        <span className="text-lg">{l.icon}</span>
                                                        <span className="text-[10px] uppercase tracking-widest">{l.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : step.id === 'mode' ? (
                                            <div className="w-full flex gap-4 px-6 py-2">
                                                <button onClick={() => handleSelectOption('mode', 'product')} className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selections.mode === 'product' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                                    <CubeIcon className="w-6 h-6" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Product Ad</span>
                                                </button>
                                                <button onClick={() => handleSelectOption('mode', 'model')} className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selections.mode === 'model' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}>
                                                    <UsersIcon className="w-6 h-6" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Model Ad</span>
                                                </button>
                                            </div>
                                        ) : step.id === 'config' ? (
                                            <div className="w-full px-6 py-2 flex flex-col gap-3">
                                                <div className={`flex items-center gap-2 bg-gray-50 p-4 rounded-2xl border transition-all shadow-inner ${urlError ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                                                    <GlobeIcon className={`w-5 h-5 ${urlError ? 'text-red-500' : 'text-indigo-500'}`} />
                                                    <input 
                                                        type="text" 
                                                        value={brandUrl} 
                                                        onChange={e => {
                                                            setBrandUrl(e.target.value);
                                                            validateUrl(e.target.value);
                                                        }} 
                                                        placeholder="Website URL (Optional)" 
                                                        className="bg-transparent text-sm font-bold outline-none flex-1 placeholder:text-gray-300" 
                                                    />
                                                    {fetchedLogo && !urlError && (
                                                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 overflow-hidden flex items-center justify-center p-1">
                                                            <img src={fetchedLogo} alt="Logo" className="w-full h-full object-contain" onError={() => setFetchedLogo(null)} />
                                                        </div>
                                                    )}
                                                </div>
                                                {urlError ? (
                                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center animate-shake">
                                                        Please enter a valid URL (e.g. www.example.com)
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                                                        We'll fetch your brand logo & style from the URL
                                                    </p>
                                                )}
                                            </div>
                                        ) : step.id === 'ai_suggestion' ? (
                                            <div className="w-full px-6 py-2 flex flex-col items-center justify-center gap-4">
                                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                                                    <SparklesIcon className="w-8 h-8 text-indigo-600" />
                                                </div>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center">
                                                    {selectedSuggestion ? "Suggestion Selected" : "AI is ready to suggest ad concepts"}
                                                </p>
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>

                            {/* Step Navigator */}
                            <div className="px-4 pt-4 pb-6 border-t border-indigo-100 bg-indigo-50/30">
                                <div className="flex items-center justify-between gap-1">
                                    {AD_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (step.id === 'config' ? (!!brandUrl && !urlError) : step.id === 'ai_suggestion' ? !!selectedSuggestion : step.id === 'style' ? (!!selections.style || !!customStyle) : !!selections[step.id]);
                                        
                                        let selectionLabel = "";
                                        if (step.id === 'industry' && selections.industry) selectionLabel = INDUSTRY_CONFIG[selections.industry].label;
                                        if (step.id === 'style') selectionLabel = customStyle || INDUSTRY_STYLES[selections.industry]?.find(s => s.id === selections.style)?.label || "";
                                        if (step.id === 'format' && selections.format) selectionLabel = AD_FORMATS.find(f => f.id === selections.format)?.label || "";
                                        if (step.id === 'language' && selections.language) selectionLabel = LANGUAGES.find(l => l.id === selections.language)?.label || "";
                                        if (step.id === 'mode' && selections.mode) selectionLabel = selections.mode === 'model' ? 'Model' : 'Product';
                                        if (step.id === 'config' && brandUrl && !urlError) selectionLabel = "Set";
                                        if (step.id === 'ai_suggestion' && selectedSuggestion) selectionLabel = "Selected";

                                        const isFlashing = currentStep === AD_STEPS.findIndex(s => s.id === 'config') && step.id === 'ai_suggestion';

                                        return (
                                            <button 
                                                key={step.id} 
                                                onClick={() => {
                                                    if (isAccessible) {
                                                        setCurrentStep(idx);
                                                        if (step.id === 'ai_suggestion') {
                                                            if (aiSuggestions.length === 0) {
                                                                generateAISuggestions();
                                                            } else {
                                                                setIsSuggestionTrayOpen(true);
                                                            }
                                                        }
                                                    }
                                                }} 
                                                disabled={!isAccessible}
                                                className={`flex flex-col items-center gap-1 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed'}`}
                                            >
                                                {/* Title on Top */}
                                                <span className={`text-[7px] font-black uppercase tracking-tighter transition-all truncate w-full text-center px-0.5 ${isActive || isFilled ? 'text-indigo-600' : isAccessible ? 'text-indigo-400' : 'text-gray-300'}`}>
                                                    {step.label}
                                                </span>

                                                {/* Purple Bar */}
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive || isFilled ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isAccessible ? 'bg-indigo-200' : 'bg-gray-100'} ${isFlashing ? 'animate-pulse bg-indigo-400' : ''}`}></div>

                                                {/* Selection Label on Bottom */}
                                                <span className={`font-bold uppercase tracking-tighter transition-all truncate w-full text-center px-0.5 min-h-[10px] ${isActive || isFilled ? 'text-indigo-600' : 'text-gray-300'} ${isFlashing ? 'animate-pulse text-indigo-500 text-[9px]' : 'text-[6px]'}`}>
                                                    {isFlashing ? 'NEXT' : selectionLabel}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Suggestion Tray */}
            <MobileSheet 
                isOpen={isSuggestionTrayOpen} 
                onClose={() => setIsSuggestionTrayOpen(false)} 
                title="AI Ad Suggestions"
                footer={
                    <div className="pb-8">
                        <button 
                            onClick={() => {
                                setIsSuggestionTrayOpen(false);
                                setCurrentStep(AD_STEPS.findIndex(s => s.id === 'ai_suggestion'));
                            }}
                            disabled={!selectedSuggestion || isGeneratingSuggestions}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${(!selectedSuggestion || isGeneratingSuggestions) ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20 active:scale-95'}`}
                        >
                            Done
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col">
                    <div className="py-4 space-y-3 no-scrollbar">
                        {isGeneratingSuggestions ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Generating Ideas...</p>
                            </div>
                        ) : (
                            aiSuggestions.map((suggestion, idx) => (
                                <div key={idx} className="relative group">
                                    {editingIndex === idx ? (
                                        <div className="w-full p-4 bg-white rounded-2xl border-2 border-indigo-500 shadow-lg animate-fadeIn">
                                            <textarea 
                                                value={editValue} 
                                                onChange={e => setEditValue(e.target.value)}
                                                className="w-full bg-transparent text-sm font-bold outline-none h-20 resize-none"
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button 
                                                    onClick={() => setEditingIndex(null)}
                                                    className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-400"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const newSuggestions = [...aiSuggestions];
                                                        newSuggestions[idx] = editValue;
                                                        setAiSuggestions(newSuggestions);
                                                        setSelectedSuggestion(editValue);
                                                        setEditingIndex(null);
                                                    }}
                                                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setSelectedSuggestion(suggestion)}
                                            className={`w-full p-5 pr-12 rounded-2xl text-left text-sm font-bold transition-all border ${selectedSuggestion === suggestion ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-[1.02]' : 'bg-gray-50 text-gray-600 border-gray-100 active:bg-gray-100'}`}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <span className="flex-1 leading-relaxed">{suggestion}</span>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedSuggestion === suggestion ? 'border-white bg-white/20' : 'border-gray-300'}`}>
                                                    {selectedSuggestion === suggestion && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingIndex(idx);
                                                    setEditValue(suggestion);
                                                }}
                                                className={`absolute top-4 right-4 p-2 rounded-full transition-all ${selectedSuggestion === suggestion ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-gray-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <ImageModal 
                    imageUrl={result} 
                    onClose={() => setIsFullScreenOpen(false)}
                    onDownload={() => downloadImage(result, 'pixa-ad.png')}
                />
            )}

            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title="Refine Ad Design"
                footer={
                    <div className="pb-6">
                        <button 
                            onClick={() => handleRefine(refineText)} 
                            disabled={!refineText.trim() || isGenerating} 
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isGenerating ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                        >
                            Apply Changes
                        </button>
                    </div>
                }
            >
                <div className="pb-6">
                    <textarea 
                        value={refineText} 
                        onChange={e => setRefineText(e.target.value)} 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" 
                        placeholder="e.g. Make the text more bold and move the logo to bottom right..." 
                    />
                </div>
            </MobileSheet>
            
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            
            <style>{`
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes grain { 0%, 100% { transform: translate(0, 0); } 10% { transform: translate(-1%, -1%); } 30% { transform: translate(-2%, 2%); } 50% { transform: translate(1%, -2%); } 70% { transform: translate(-1%, 1%); } 90% { transform: translate(2%, 0); } }
                .animate-grain { animation: grain 1s steps(4) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default MobileAdMaker;
