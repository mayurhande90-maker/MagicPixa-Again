import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, UploadPlaceholder } from '../components/FeatureLayout';
import { 
    MagicAdsIcon, ArrowRightIcon, ArrowLeftIcon, CubeIcon, UsersIcon, XIcon, SparklesIcon, PlusIcon, FlagIcon, PencilIcon, CreditCoinIcon, GlobeIcon, ImageIcon
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
    { id: '1:1', label: 'Square', desc: 'Feed (1:1)', icon: <div className="w-6 h-6 border-2 border-indigo-500 rounded-sm" /> },
    { id: '9:16', label: 'Vertical', desc: 'Story (9:16)', icon: <div className="w-4 h-7 border-2 border-indigo-500 rounded-sm" /> },
    { id: '16:9', label: 'Web', desc: 'Banner (16:9)', icon: <div className="w-8 h-4 border-2 border-indigo-500 rounded-sm" /> },
];

const LANGUAGES = [
    { id: 'english', label: 'English', desc: 'Standard English', icon: '🇺🇸' },
    { id: 'hindi', label: 'Hindi', desc: 'Authentic Hindi', icon: '🇮🇳' },
    { id: 'marathi', label: 'Marathi', desc: 'Authentic Marathi', icon: '🚩' },
    { id: 'hinglish_hindi', label: 'Hinglish-Hindi', desc: 'Hindi in Latin script', icon: '💬' },
    { id: 'hinglish_marathi', label: 'Hinglish-Marathi', desc: 'Marathi in Latin script', icon: '🗣️' },
];

type AdMakerPhase = 'industry_select' | 'style_format_select' | 'mode_select';

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
    const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
    const [customStyleText, setCustomStyleText] = useState<string>("");
    const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [mode, setMode] = useState<'product' | 'model' | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState(false);
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
    const [editingSuggestionIndex, setEditingSuggestionIndex] = useState<number | null>(null);
    const [editingSuggestionData, setEditingSuggestionData] = useState<{ headline: string; displayPrompt: string } | null>(null);
    const [brandUrl, setBrandUrl] = useState<string>("");
    const [includeCta, setIncludeCta] = useState<boolean>(true);
    const [brandLogo, setBrandLogo] = useState<string | null>(null);
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [base64ReferenceImage, setBase64ReferenceImage] = useState<string | null>(null);
    const [isFetchingLogo, setIsFetchingLogo] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

    const progress = useSimulatedProgress(isGenerating || isRefining);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const referenceInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const isIndustryMismatch = auth.activeBrandKit?.industry && industry && auth.activeBrandKit.industry !== industry;

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

    // Brand Kit Integration: Auto-populate from active brand
    React.useEffect(() => {
        if (auth.activeBrandKit) {
            if (auth.activeBrandKit.industry && !industry) {
                setIndustry(auth.activeBrandKit.industry);
                setPhase('style_format_select');
            }
            if (auth.activeBrandKit.website && !brandUrl) {
                setBrandUrl(auth.activeBrandKit.website);
            }
            if (auth.activeBrandKit.logos?.primary && !brandLogo) {
                const logoUrl = auth.activeBrandKit.logos.primary;
                if (logoUrl.startsWith('data:')) {
                    setBrandLogo(logoUrl);
                } else {
                    setIsFetchingLogo(true);
                    urlToBase64(logoUrl).then(res => {
                        setBrandLogo(`data:${res.mimeType};base64,${res.base64}`);
                    }).catch(err => {
                        console.error("Failed to fetch brand logo from Brand Kit:", err);
                        setBrandLogo(null);
                    }).finally(() => {
                        setIsFetchingLogo(false);
                    });
                }
            }
        }
    }, [auth.activeBrandKit]);

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
        setScanError(false);
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

            const tools: any[] = [{ googleSearch: {} }];
            if (brandUrl && brandUrl.trim()) {
                tools.push({ urlContext: {} });
            }

            const isPhysical = industry ? INDUSTRY_CONFIG[industry]?.isPhysical : true;
            const industryLabel = industry ? INDUSTRY_CONFIG[industry]?.label : 'General';
            const styleLabel = selectedStyle === 'custom' ? customStyleText : (industry && selectedStyle ? INDUSTRY_STYLES[industry]?.find(s => s.id === selectedStyle)?.label : 'General');
            const formatLabel = AD_FORMATS.find(f => f.id === selectedFormat)?.label || 'Square';
            const languageConfig = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];

            const isGraphicEditorial = selectedStyle === 'graphic_editorial';

            const creativeBriefs: Record<string, string> = {
                'ecommerce': 'Focus on high-end studio lighting, clean backgrounds, and premium textures. Make the product look tactile and high-quality.',
                'fashion': 'Focus on style, elegance, and mood. Use editorial lighting and trendy backgrounds.',
                'fmcg': 'Focus on vibrancy, freshness, and energy. Use bright colors and action cues like splashes or fresh ingredients.',
                'realty': 'Focus on aspiration, space, and lifestyle. Use wide-angle shots, warm natural sunlight, and inviting atmospheres.',
                'food': 'Focus on appetite appeal. Use warm lighting, macro shots, and sensory cues like steam or glistening textures.',
                'saas': isGraphicEditorial ? 'Create a high-impact "Software-as-a-Service" graphic post. Use a modern "Bento Box" layout with rounded-corner tiles, glassmorphic overlays for screenshots, and bold maximalist typography. Highlight key features with text in a clean, high-tech grid.' : 'Focus on modern tech and productivity. Treat the uploaded image as a software screenshot and place it inside a sleek device mockup (like a MacBook or iPhone) in a professional high-tech office.',
                'education': isGraphicEditorial ? 'Create a professional "Educational" graphic post. Use inspiring maximalist typography, clean editorial layouts, and brand colors. Focus on key benefits and learning outcomes using a structured grid with soft shadows and premium textures.' : 'Focus on learning and growth. Treat the uploaded image as a logo and place it on a screen or banner in a bright, modern classroom or campus setting.',
                'services': isGraphicEditorial ? 'Create a trustworthy "Professional Services" graphic post. Use clean, authoritative maximalist typography, brand-aligned colors, and a sophisticated "Bento Box" layout. Highlight service offerings with text in organized, rounded-corner tiles.' : 'Focus on trust and professionalism. Treat the uploaded image as a logo and place it on a branded uniform, a professional service vehicle, or a clean office environment.'
            };

            const brief = industry ? creativeBriefs[industry] : 'Create a professional and high-converting advertisement.';

            const brandKitContext = auth.activeBrandKit ? `
BRAND KIT CONTEXT:
- Brand Name: ${auth.activeBrandKit.companyName}
- Industry: ${auth.activeBrandKit.industry}
- Tone of Voice: ${auth.activeBrandKit.toneOfVoice}
- Target Audience: ${auth.activeBrandKit.targetAudience || 'General'}
- Brand Colors: ${auth.activeBrandKit.colors?.primary || 'Auto-detect'}, ${auth.activeBrandKit.colors?.secondary || 'Auto-detect'}
` : '';

            const parts: any[] = [
                { text: `You are Pixa AI, a world-class creative director and marketing expert. 
${brandKitContext}
Analyze this ${isPhysical ? 'product' : 'logo/screenshot'} image (identify the ${isPhysical ? 'product' : 'brand/software'}, its ${isPhysical ? 'material' : 'purpose'}, category, and unique selling points).
${brandUrl ? `The user has provided their brand website: ${brandUrl}. Visit this website to understand their brand guidelines, color palette, typography, and existing marketing voice. Use this information to ensure the ad suggestions are perfectly aligned with their brand identity. 
MANDATORY: Identify the official brand name and the primary website URL or social handle that should be used as a Call to Action (CTA). 
ALSO: Try to find the direct URL of the brand's official logo (preferably a high-quality PNG or SVG).` : ''}
${base64ReferenceImage ? `CRITICAL: The user has provided a REFERENCE IMAGE. Analyze this reference image's layout, composition, color palette, lighting, and overall vibe. 
MANDATORY MODEL ANALYSIS: Check if the reference image contains a human model. If so, your suggestion MUST replicate the model's pose, interaction with the product, and placement in the scene. 
INDIAN ETHNICITY OVERRIDE: Regardless of the model's ethnicity in the reference image, your suggestions MUST feature an INDIAN model with authentic features and styling. If a model is present in the reference, treat this as a "Model Ad" regardless of the user's mode selection.
Your goal is to "Visual Reverse Engineer" this style and replicate it for the current ${isPhysical ? 'product' : 'brand'}. Ensure the text placement, subject positioning, and graphic style in your suggestions are heavily inspired by this reference image.` : ''}
${base64ReferenceImage ? '' : `Use Google Search to find current trends and successful ad campaigns for similar ${isPhysical ? 'products' : 'services'} in the ${industryLabel} industry. ${isGraphicEditorial ? 'Also search for "trendy graphic design ads 2026" and "editorial ad layouts" to incorporate the latest visual design patterns.' : ''}`}

CREATIVE BRIEF FOR THIS INDUSTRY:
${brief}

VISUAL STYLE & MOOD:
The user has requested a "${styleLabel}" style. 
${base64ReferenceImage ? `REPLICATE REFERENCE STYLE: The user wants their ad to look like the provided reference image. Incorporate its specific visual cues (lighting, texture, color palette, layout, and mood) into your suggestions while featuring the ${isPhysical ? 'product' : 'brand logo'}.` : (isGraphicEditorial ? `SPECIAL INSTRUCTION: This is a "Graphic/Editorial" style. Do NOT create a realistic photographic scene. Instead, design a professional "Graphic Design" layout using 2026 design trends. Incorporate a "Bento Box" layout (organized tiles with rounded corners), "Glassmorphism" (frosted glass panels with soft shadows), and "Maximalist Typography" (oversized, bold, high-contrast fonts). The uploaded logo/screenshot should be integrated as a key element within a glassmorphic panel or a central tile. Use stylized brand colors and add abstract 3D geometric accents (like high-gloss spheres or blobs) that match the brand identity. Focus on a premium "Textual Post" look that highlights brand values and features with clear typographic hierarchy.` : (selectedStyle === 'custom' ? `DEEP ANALYSIS OF CUSTOM STYLE: Analyze the user's requested style "${customStyleText}" and incorporate its specific visual cues (lighting, texture, color palette, and mood) into your suggestions.` : `Incorporate the essence of "${styleLabel}" into the visual concepts.`))}

AD FORMAT:
The ad is intended for a ${formatLabel} (${selectedFormat}) aspect ratio. Ensure the visual compositions you suggest work perfectly for this format.

LANGUAGE & LOCALIZATION:
The user has selected the language: "${languageConfig.label}".
${selectedLanguage === 'hindi' ? 'MANDATORY: Generate all marketing copy (headlines and display prompts) in authentic Hindi using the Devanagari script.' : ''}
${selectedLanguage === 'marathi' ? 'MANDATORY: Generate all marketing copy (headlines and display prompts) in authentic Marathi using the Devanagari script.' : ''}
${selectedLanguage === 'hinglish_hindi' ? 'MANDATORY: Generate all marketing copy in "Hinglish" (a conversational mix of Hindi and English) using the Latin (English) script. Example: "Ab brand banega aur bhi bada!".' : ''}
${selectedLanguage === 'hinglish_marathi' ? 'MANDATORY: Generate all marketing copy in "Hinglish-Marathi" (a conversational mix of Marathi and English) using the Latin (English) script. Example: "Tumcha brand, aata navya style madhe!".' : ''}
${selectedLanguage === 'english' ? 'MANDATORY: Generate all marketing copy in standard professional English.' : ''}

${mode === 'model' ? 'The user has selected "Model Ad" mode. Your suggestions MUST feature Indian models (male, female, or diverse groups as appropriate) interacting with the subject in lifestyle settings that resonate with the Indian market. Strictly avoid foreign or ambiguous models. MANDATORY: You MUST explicitly describe the Indian model character (e.g., "A young Indian professional woman", "A cheerful Indian family") as the primary subject in the displayPrompt. This is a strict requirement for Model Ad mode.' : 'The user has selected "Product Ad" mode. Your suggestions should focus on high-end, clean studio setups or creative environments.'}

Then, generate ${base64ReferenceImage ? '1' : '5'} highly creative and high-converting ad prompt${base64ReferenceImage ? '' : 's'} for this ${isPhysical ? 'product' : 'brand'}.
Each suggestion should include:
1. A catchy 'displayPrompt' for the user to see in the selected language (${languageConfig.label}). This should be 2-3 detailed and descriptive sentences explaining the visual concept, the background, the lighting, and the overall vibe. For Model Ad mode, this MUST include a description of the Indian model character.
2. A very detailed 'detailedPrompt' for an AI image generator. ${isGraphicEditorial ? 'For this style, describe a high-end graphic design layout, specifying typography, grid structure, design elements, and brand-centric accents instead of photographic details. Focus on layout composition, color theory, and graphic elements.' : 'Describing the scene, lighting, placement, and professional photography details.'} This should be the "secret" prompt. For Model Ad mode, this MUST include specific instructions for an Indian model. MANDATORY: Instruct the image generator to include text overlays or background text in the selected language (${languageConfig.label}) where appropriate.
3. A catchy marketing 'headline' in the selected language (${languageConfig.label}).

Output ONLY a JSON object with:
- 'suggestions': an array of ${base64ReferenceImage ? '1' : '5'} object${base64ReferenceImage ? '' : 's'} with 'headline', 'displayPrompt', and 'detailedPrompt' keys.
- 'brandInfo': an object with 'brandName', 'ctaUrl' (the exact URL to use), and 'logoUrl' (if found).
Do not include any other text or markdown formatting.` },
                { inlineData: { data: imageData, mimeType } }
            ];

            if (base64ReferenceImage) {
                parts.push({ inlineData: { data: base64ReferenceImage, mimeType: 'image/jpeg' } });
            }

            const response = await ai.models.generateContent({
                model: "gemini-3.1-pro-preview",
                contents: [
                    {
                        parts: parts
                    }
                ],
                config: {
                    tools: tools
                }
            });

            const text = response.text;
            if (!text) throw new Error("AI response text is empty");
            
            // Robust JSON parsing to handle potential markdown blocks or extra text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            const data = JSON.parse(jsonStr);
            
            if (data.suggestions && Array.isArray(data.suggestions)) {
                setSuggestions(data.suggestions);
                
                let fetchedLogo: string | undefined = undefined;

                // Auto-fetch logo if found and not already set manually
                if (data.brandInfo?.logoUrl && !brandLogo) {
                    setIsFetchingLogo(true);
                    try {
                        const res = await fetch(data.brandInfo.logoUrl);
                        const blob = await res.blob();
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        setBrandLogo(base64);
                        fetchedLogo = base64;
                    } catch (e) {
                        console.error("Logo fetch failed (likely CORS):", e);
                    } finally {
                        setIsFetchingLogo(false);
                    }
                }

                // DIRECT GENERATION FLOW
                if (base64ReferenceImage && data.suggestions.length > 0) {
                    setSelectedSuggestion(0);
                    await executeAdGeneration(data.suggestions[0], fetchedLogo);
                }
            } else {
                throw new Error("AI response format is incorrect");
            }
        } catch (error: any) {
            console.error("Scan failed:", error);
            setScanError(true);
            setNotification({ msg: `Scan failed: ${error.message || "Unknown error"}`, type: 'error' });
        } finally {
            setIsScanning(false);
        }
    };

    const handleIndustrySelect = (ind: string) => {
        setIndustry(ind);
        setPhase('style_format_select');
    };

    const handleStyleFormatNext = () => {
        if (selectedStyle && selectedFormat) {
            setPhase('mode_select');
        }
    };

    const handleBack = () => {
        if (phase === 'mode_select') {
            setPhase('style_format_select');
            setMode(null);
            setSuggestions([]);
            setSelectedSuggestion(null);
        } else if (phase === 'style_format_select') {
            setPhase('industry_select');
            setIndustry(null);
        }
    };

    const handleModeSelect = (m: 'product' | 'model') => {
        setMode(m);
    };

    const executeAdGeneration = async (suggestion: { headline: string; detailedPrompt: string }, logoOverride?: string) => {
        if (!base64Image || !auth.user) return;
        if (auth.user.credits < cost) {
            setNotification({ msg: "Insufficient credits.", type: 'error' });
            return;
        }
        setIsGenerating(true);
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("API Key missing");
            const ai = new GoogleGenAI({ apiKey });
            
            const mimeTypeMatch = base64Image.match(/^data:([^;]+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
            const imageData = base64Image.split(',')[1];

            const isPhysical = industry ? INDUSTRY_CONFIG[industry]?.isPhysical : true;
            const styleLabel = selectedStyle === 'custom' ? customStyleText : (industry && selectedStyle ? INDUSTRY_STYLES[industry]?.find(s => s.id === selectedStyle)?.label : 'General');
            const languageConfig = LANGUAGES.find(l => l.id === selectedLanguage) || LANGUAGES[0];

            const logoToUse = logoOverride || brandLogo;

            const brandKitContext = auth.activeBrandKit ? `
BRAND KIT CONTEXT:
- Brand Name: ${auth.activeBrandKit.companyName}
- Tone of Voice: ${auth.activeBrandKit.toneOfVoice}
- Target Audience: ${auth.activeBrandKit.targetAudience || 'General'}
- Brand Colors: ${auth.activeBrandKit.colors?.primary || 'Auto-detect'}, ${auth.activeBrandKit.colors?.secondary || 'Auto-detect'}
` : '';

            const contents: any[] = [
                {
                    parts: [
                        { text: `Generate a highly professional, high-converting advertisement image for this ${isPhysical ? 'product' : 'brand'}. 
${brandKitContext}
Concept: ${suggestion.detailedPrompt}
Visual Style: ${styleLabel}
Ad Format: ${selectedFormat} aspect ratio.
Language: ${languageConfig.label}
Marketing Headline to include in the design: "${suggestion.headline}"
${mode === 'model' || base64ReferenceImage ? 'MANDATORY REQUIREMENT: If the scene includes a person (as requested in the concept or inspired by the reference image), they MUST be a professional Indian model (male or female as per the scene). The model MUST have clear Indian ethnicity, features, and skin tone. Strictly forbid foreign, Caucasian, East Asian, or ambiguous models. The scene MUST feel authentic to the Indian lifestyle context.' : ''}

${base64ReferenceImage ? 'REFERENCE STYLE: I have provided a reference image. Replicate its layout, composition, lighting, and vibe. If it contains a model, match the pose and interaction but ensure the model is Indian.' : ''}

${includeCta && brandUrl ? `CALL TO ACTION (CTA): Include the official brand website "${brandUrl}" or a relevant social handle clearly but elegantly in the design. 
HARD NEGATIVE: NEVER use generic placeholders like 'www.website.com' or 'yourbrand.com'. ONLY use the provided URL.` : 'HARD NEGATIVE: DO NOT include any website URLs, social handles, or generic CTA text in the design.'}

${logoToUse && logoToUse.startsWith('data:') ? `BRAND LOGO: I have provided the brand's official logo as an additional image. Integrate it naturally and professionally into the ad design (e.g., in a corner, on a branded element, or as a watermark as appropriate for a high-end ad).` : ''}

The ad should be trend-ready, social media optimized, with perfect text placement and professional graphic design elements. 
The ${isPhysical ? 'product' : 'logo/screenshot'} from the primary image should be the central focus.` },
                        { inlineData: { data: imageData, mimeType } }
                    ]
                }
            ];

            // Add reference image if available
            if (base64ReferenceImage) {
                contents[0].parts.push({ inlineData: { data: base64ReferenceImage, mimeType: 'image/jpeg' } });
            }

            // Add logo if available and in correct format
            if (logoToUse && logoToUse.startsWith('data:')) {
                const logoMimeMatch = logoToUse.match(/^data:([^;]+);base64,/);
                const logoMime = logoMimeMatch ? logoMimeMatch[1] : "image/png";
                const logoData = logoToUse.split(',')[1];
                if (logoData) {
                    contents[0].parts.push({ inlineData: { data: logoData, mimeType: logoMime } });
                }
            }

            const response = await ai.models.generateContent({
                model: "gemini-3.1-flash-image-preview",
                contents: contents,
                config: {
                    imageConfig: {
                        aspectRatio: selectedFormat as any
                    }
                }
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

    const handleGenerateAd = async () => {
        if (selectedSuggestion === null) return;
        await executeAdGeneration(suggestions[selectedSuggestion]);
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
        setEditingSuggestionIndex(null);
        setEditingSuggestionData(null);
        setBrandUrl(auth.activeBrandKit?.website || "");
        
        // Manual sync for new project to ensure base64 conversion
        const logoUrl = auth.activeBrandKit?.logos?.primary;
        if (logoUrl) {
            if (logoUrl.startsWith('data:')) {
                setBrandLogo(logoUrl);
            } else {
                setIsFetchingLogo(true);
                urlToBase64(logoUrl).then(res => {
                    setBrandLogo(`data:${res.mimeType};base64,${res.base64}`);
                }).catch(() => setBrandLogo(null)).finally(() => setIsFetchingLogo(false));
            }
        } else {
            setBrandLogo(null);
        }

        setSelectedLanguage(null);
        setSelectedProductId(null);
    };

    const handleStartEdit = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setEditingSuggestionIndex(index);
        setEditingSuggestionData({
            headline: suggestions[index].headline,
            displayPrompt: suggestions[index].displayPrompt
        });
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingSuggestionIndex !== null && editingSuggestionData) {
            const newSuggestions = [...suggestions];
            newSuggestions[editingSuggestionIndex] = {
                ...newSuggestions[editingSuggestionIndex],
                headline: editingSuggestionData.headline,
                displayPrompt: editingSuggestionData.displayPrompt
            };
            setSuggestions(newSuggestions);
            setEditingSuggestionIndex(null);
            setEditingSuggestionData(null);
            setNotification({ msg: "Suggestion updated!", type: 'success' });
        }
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingSuggestionIndex(null);
        setEditingSuggestionData(null);
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
            disableScroll={true}
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
                <div className="relative h-full w-full flex flex-col p-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    <LoadingOverlay isVisible={isGenerating || isRefining} loadingText={loadingText} progress={progress} />
                    
                    <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden">
                        {phase === 'mode_select' && !image ? (
                            <div className="w-full h-full flex flex-col items-center justify-center">
                                <UploadPlaceholder 
                                    label={industry && !INDUSTRY_CONFIG[industry].isPhysical ? "Upload Logo or Screenshot" : "Upload Product Image"} 
                                    onClick={() => fileInputRef.current?.click()} 
                                    icon={<MagicAdsIcon className="w-12 h-12 text-gray-400 group-hover:text-indigo-600 transition-colors" />}
                                />
                            </div>
                        ) : image ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img 
                                    src={image} 
                                    className={`max-w-full max-h-full object-contain rounded-2xl transition-all duration-700 ${(isGenerating || isRefining) ? 'blur-md grayscale-[0.2] brightness-75 scale-105' : ''}`} 
                                    referrerPolicy="no-referrer"
                                />
                                
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
                                        onClick={() => { setImage(null); setBase64Image(null); setSuggestions([]); setMode(null); setSelectedProductId(null); }}
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
                    </div>

                    {/* Horizontal Inventory Strip */}
                    {phase === 'mode_select' && auth.activeBrandKit?.products && auth.activeBrandKit.products.length > 0 && (
                        <div className={`mt-4 pt-4 border-t border-gray-100 animate-fadeInUp transition-all duration-300 ${isScanning || isGenerating || isRefining ? 'opacity-40 grayscale-[0.5] pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between mb-3 px-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Brand Inventory</span>
                                <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{auth.activeBrandKit.products.length} Products</span>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-2 px-2 custom-scrollbar snap-x">
                                {auth.activeBrandKit.products.map((product) => (
                                    <button
                                        key={product.id}
                                        disabled={isScanning || isGenerating || isRefining}
                                        onClick={async () => {
                                            if (isScanning || isGenerating || isRefining) return;
                                            setSelectedProductId(product.id);
                                            setIsScanning(true);
                                            try {
                                                const { base64, mimeType } = await urlToBase64(product.imageUrl);
                                                const blobUrl = await base64ToBlobUrl(base64, mimeType);
                                                setImage(blobUrl);
                                                setBase64Image(`data:${mimeType};base64,${base64}`);
                                                setSuggestions([]);
                                                setSelectedSuggestion(null);
                                            } catch (err) {
                                                setNotification({ msg: "Failed to load product from inventory.", type: 'error' });
                                            } finally {
                                                setIsScanning(false);
                                            }
                                        }}
                                        className={`flex-shrink-0 w-20 group relative aspect-square rounded-xl border-2 overflow-hidden transition-all duration-300 snap-start ${selectedProductId === product.id ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-95 shadow-inner' : 'border-gray-100 hover:border-indigo-200 bg-gray-50'}`}
                                    >
                                        <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={product.name} referrerPolicy="no-referrer" />
                                        {selectedProductId === product.id && (
                                            <div className="absolute inset-0 bg-indigo-600/20 flex items-center justify-center">
                                                <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                                                    <SparklesIcon className="w-3 h-3" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-1 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-[7px] font-black text-white uppercase tracking-tighter truncate">{product.name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
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
                <div className={`${AdMakerStyles.formContainer} ${(phase === 'mode_select' && !image) || isScanning || isGenerating || isRefining ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                    {isIndustryMismatch && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 animate-fadeIn">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <FlagIcon className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-tight">Industry Mismatch Detected</p>
                                <p className="text-[9px] text-amber-600 font-bold mt-0.5">Your brand "{auth.activeBrandKit?.companyName}" is set to {auth.activeBrandKit?.industry}. Pixa generation might be less accurate for {industry}.</p>
                            </div>
                        </div>
                    )}
                    {mode && (
                        <div className="flex items-center gap-2 mb-4 animate-fadeIn">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm flex items-center gap-2 ${
                                mode === 'product' 
                                ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                : 'bg-purple-50 text-purple-600 border-purple-100'
                            }`}>
                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${mode === 'product' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
                                {mode === 'product' ? 'Product Ad Mode' : 'Model Ad Mode'}
                            </div>
                            {(isScanning || isGenerating || isRefining) && (
                                <div className="text-[10px] font-bold text-gray-400 animate-pulse uppercase tracking-widest">
                                    Panel Locked
                                </div>
                            )}
                        </div>
                    )}
                    {resultImage && (
                        <div className="mb-6">
                        </div>
                    )}
                    {phase === 'industry_select' && (
                        <div className="animate-fadeIn flex flex-col h-full">
                            <div className="mb-6 px-4 flex-none">
                                <h3 className="text-xl font-black text-gray-900">Select Industry</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Choose your business category</p>
                            </div>
                            <div className={`${AdMakerStyles.modeGrid} flex-1 overflow-y-auto custom-scrollbar`}>
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

                    {phase === 'style_format_select' && (
                        <div className="animate-fadeIn flex flex-col h-full p-4">
                            <div className="flex-none mb-4">
                                <button 
                                    onClick={handleBack} 
                                    className={AdMakerStyles.backButton}
                                >
                                    <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                                <div>
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <SparklesIcon className="w-3 h-3 text-indigo-500" />
                                        Choose Visual Style
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {industry && INDUSTRY_STYLES[industry]?.map((style) => (
                                            <div
                                                key={style.id}
                                                onClick={() => setSelectedStyle(style.id)}
                                                className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-center ${selectedStyle === style.id ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                                            >
                                                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">{style.icon}</span>
                                                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">{style.label}</span>
                                            </div>
                                        ))}
                                        <div
                                            onClick={() => setSelectedStyle('custom')}
                                            className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-center ${selectedStyle === 'custom' ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                                        >
                                            <span className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">🎨</span>
                                            <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">Custom</span>
                                        </div>
                                    </div>

                                    {selectedStyle === 'custom' && (
                                        <div className="animate-fadeIn">
                                            <textarea
                                                placeholder="Describe your custom mood (e.g., 90s Retro, Cyberpunk, Rainy Night)..."
                                                className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-300 text-sm font-medium text-gray-700 placeholder:text-gray-300 bg-white mt-2"
                                                value={customStyleText}
                                                onChange={(e) => setCustomStyleText(e.target.value)}
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <GlobeIcon className="w-3 h-3 text-indigo-500" />
                                        Select Language
                                    </h3>
                                    <div className="grid grid-cols-5 gap-2 mb-6">
                                        {LANGUAGES.map((lang) => (
                                            <div
                                                key={lang.id}
                                                onClick={() => setSelectedLanguage(lang.id)}
                                                className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-center ${selectedLanguage === lang.id ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                                            >
                                                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">{lang.icon}</span>
                                                <span className="text-[8px] font-black text-gray-900 uppercase tracking-tight leading-tight">{lang.label}</span>
                                                <span className="text-[6px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{lang.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3 text-indigo-500" />
                                        Select Ad Format
                                    </h3>
                                    <div className="flex gap-3 mb-8">
                                        {AD_FORMATS.map((format) => (
                                            <div
                                                key={format.id}
                                                onClick={() => setSelectedFormat(format.id)}
                                                className={`flex-1 group relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 cursor-pointer text-center ${selectedFormat === format.id ? 'bg-indigo-50 border-indigo-500 shadow-md ring-2 ring-indigo-500/10' : 'bg-white border-gray-100 hover:border-indigo-200 hover:shadow-md'}`}
                                            >
                                                <span className="text-xl mb-1">{format.icon}</span>
                                                <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">{format.label}</span>
                                                <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">{format.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleStyleFormatNext}
                                    disabled={!selectedStyle || !selectedFormat || !selectedLanguage || (selectedStyle === 'custom' && !customStyleText.trim())}
                                    className={AdMakerStyles.generateButton}
                                >
                                    Next Step
                                    <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'mode_select' && (
                        <div className="animate-fadeIn flex flex-col h-full p-4">
                            <div className="flex-none mb-4">
                                <button 
                                    onClick={handleBack} 
                                    disabled={isScanning || isGenerating}
                                    className={`${AdMakerStyles.backButton} ${(isScanning || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Styles
                                </button>
                            </div>

                            {((!isScanning || base64ReferenceImage) && (suggestions.length === 0 || base64ReferenceImage) && !scanError) ? (
                                <div className="flex-1 flex flex-col overflow-hidden relative">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                        {/* Vertical Timeline Line */}
                                        <div className="absolute left-[21px] top-[140px] bottom-[100px] w-0.5 bg-gradient-to-b from-indigo-500/50 via-indigo-200 to-transparent rounded-full hidden sm:block"></div>

                                        <div className="text-center mb-10">
                                            <h3 className="text-2xl font-black text-gray-900 mb-1">Final Configuration</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Refine your brand identity</p>
                                        </div>

                                        <div className="space-y-12 relative pb-10">
                                            {/* Step 01: Brand Website */}
                                            <section className="relative pl-0 sm:pl-12">
                                                <div className="absolute left-0 top-0 w-11 h-11 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-sm font-black text-indigo-600 z-10 hidden sm:flex">01</div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.15em]">Brand Website</h3>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">(Optional)</span>
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                            <GlobeIcon className="h-4 w-4 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" strokeWidth={2.5} />
                                                        </div>
                                                        <input 
                                                            type="url"
                                                            value={brandUrl}
                                                            onChange={(e) => setBrandUrl(e.target.value)}
                                                            disabled={isScanning || isGenerating}
                                                            placeholder="https://yourbrand.com"
                                                            className="w-full bg-white/40 backdrop-blur-sm border border-gray-200/60 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                        />
                                                    </div>
                                                </div>
                                            </section>

                                            {/* Step 02: Reference Style */}
                                            <section className="relative pl-0 sm:pl-12">
                                                <div className="absolute left-0 top-0 w-11 h-11 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-sm font-black text-indigo-600 z-10 hidden sm:flex">02</div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.15em]">Reference Style</h3>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">(Optional)</span>
                                                    </div>
                                                    <div 
                                                        onClick={() => !(isScanning || isGenerating) && referenceInputRef.current?.click()}
                                                        className={`group relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer text-center ${referenceImage ? 'bg-indigo-50/30 border-indigo-500/50' : 'bg-white/40 border-gray-200 hover:border-indigo-300 hover:bg-white/60'} ${(isScanning || isGenerating) ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        {referenceImage ? (
                                                            <div className="relative w-full h-64 rounded-xl overflow-hidden bg-gray-50/50">
                                                                <img src={referenceImage} className="w-full h-full object-contain" alt="Reference" />
                                                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">Change Image</span>
                                                                </div>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setReferenceImage(null);
                                                                        setBase64ReferenceImage(null);
                                                                    }}
                                                                    disabled={isScanning || isGenerating}
                                                                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-all hover:scale-110 disabled:opacity-50"
                                                                >
                                                                    <XIcon className="w-4 h-4 text-red-500" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                                                                </div>
                                                                <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Upload Reference Ad</span>
                                                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-1">We'll replicate the layout & vibe</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <input 
                                                        type="file" 
                                                        ref={referenceInputRef} 
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const { base64, mimeType } = await fileToBase64(file);
                                                                setReferenceImage(`data:${mimeType};base64,${base64}`);
                                                                setBase64ReferenceImage(base64);
                                                            }
                                                        }} 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                    />
                                                </div>
                                            </section>

                                            {/* Step 03: Brand Identity & CTA */}
                                            <section className="relative pl-0 sm:pl-12">
                                                <div className="absolute left-0 top-0 w-11 h-11 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-sm font-black text-indigo-600 z-10 hidden sm:flex">03</div>
                                                <div className="flex flex-col gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.15em]">Brand Identity</h3>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {/* CTA Toggle */}
                                                        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${includeCta ? 'bg-indigo-50/30 border-indigo-200/50 shadow-sm' : 'bg-white/40 border-gray-100/60'} ${(isScanning || isGenerating) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Include CTA Overlay</span>
                                                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">Show URL/Handle in design</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => setIncludeCta(!includeCta)}
                                                                disabled={isScanning || isGenerating}
                                                                className={`w-10 h-5 rounded-full transition-all relative ${includeCta ? 'bg-indigo-600' : 'bg-gray-200'} disabled:opacity-50`}
                                                            >
                                                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300 shadow-sm ${includeCta ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                                            </button>
                                                        </div>

                                                        {/* Logo Section */}
                                                        <div className={`bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/60 flex items-center gap-4 ${(isScanning || isGenerating) ? 'opacity-50 pointer-events-none' : ''}`}>
                                                            <div className="w-14 h-14 rounded-xl border border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-white/50 group hover:border-indigo-300 transition-colors cursor-pointer relative" onClick={() => !(isScanning || isGenerating) && logoInputRef.current?.click()}>
                                                                {brandLogo ? (
                                                                    <img src={brandLogo} className="w-full h-full object-contain p-1.5" alt="Logo" />
                                                                ) : (
                                                                    <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                                                                )}
                                                                {isFetchingLogo && (
                                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Brand Logo</span>
                                                                    <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">(Optional)</span>
                                                                </div>
                                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                                                                    {brandLogo ? "Logo ready for integration" : "Auto-fetch or upload logo"}
                                                                </p>
                                                                {brandLogo && (
                                                                    <button 
                                                                        onClick={() => setBrandLogo(null)} 
                                                                        disabled={isScanning || isGenerating}
                                                                        className="text-[8px] font-black text-red-500 uppercase tracking-widest mt-2 hover:underline flex items-center gap-1 disabled:opacity-50"
                                                                    >
                                                                        <XIcon className="w-2.5 h-2.5" /> Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <input type="file" ref={logoInputRef} onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const { base64, mimeType } = await fileToBase64(file);
                                                        setBrandLogo(`data:${mimeType};base64,${base64}`);
                                                    }
                                                }} className="hidden" accept="image/*" />
                                            </section>

                                            {/* Step 04: Ad Strategy */}
                                            {!base64ReferenceImage && (
                                                <section className="relative pl-0 sm:pl-12">
                                                    <div className="absolute left-0 top-0 w-11 h-11 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-sm font-black text-indigo-600 z-10 hidden sm:flex">04</div>
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.15em]">Ad Strategy</h3>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <button 
                                                                onClick={() => handleModeSelect('product')} 
                                                                disabled={isScanning || isGenerating}
                                                                className={`relative overflow-hidden group p-4 rounded-2xl border transition-all duration-500 text-left ${mode === 'product' ? 'bg-indigo-50/50 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-white/40 border-gray-100/60 hover:border-indigo-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${mode === 'product' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                                    <CubeIcon className="w-5 h-5" />
                                                                </div>
                                                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Product Ad</h4>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Studio Setup</p>
                                                                {mode === 'product' && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleModeSelect('model')} 
                                                                disabled={isScanning || isGenerating}
                                                                className={`relative overflow-hidden group p-4 rounded-2xl border transition-all duration-500 text-left ${mode === 'model' ? 'bg-indigo-50/50 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-white/40 border-gray-100/60 hover:border-indigo-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${mode === 'model' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                                                                    <UsersIcon className="w-5 h-5" />
                                                                </div>
                                                                <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Model Ad</h4>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Indian Lifestyle</p>
                                                                {mode === 'model' && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-auto">
                                        <button
                                            onClick={performPixaVisionScan}
                                            disabled={(!mode && !base64ReferenceImage) || isScanning || isGenerating}
                                            className={`${AdMakerStyles.generateButton} ${((!mode && !base64ReferenceImage) || isScanning || isGenerating) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] shadow-xl shadow-indigo-500/20'}`}
                                        >
                                            {(isScanning || isGenerating) ? (base64ReferenceImage ? 'Generating Ad' : 'Analyzing Brand...') : (base64ReferenceImage ? 'Generate Ad' : 'Generate AI Suggestions')}
                                            {!base64ReferenceImage && <ArrowRightIcon className="w-4 h-4" />}
                                        </button>
                                        {!mode && !base64ReferenceImage && (
                                            <p className="text-[8px] text-center text-gray-400 font-bold uppercase tracking-widest mt-3 animate-pulse">
                                                Please select an Ad Strategy to proceed
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {isScanning && !base64ReferenceImage ? (
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
                                                        onClick={() => editingSuggestionIndex === null && setSelectedSuggestion(i)}
                                                        className={`${AdMakerStyles.suggestionCapsule} ${selectedSuggestion === i ? AdMakerStyles.suggestionCapsuleActive : ''} ${editingSuggestionIndex === i ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''}`}
                                                    >
                                                        <div className={`${AdMakerStyles.suggestionGradientBorder} ${selectedSuggestion === i ? AdMakerStyles.suggestionGradientBorderActive : ''}`}></div>
                                                        
                                                        {editingSuggestionIndex === i ? (
                                                            <div className="space-y-3 p-1" onClick={(e) => e.stopPropagation()}>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Headline</label>
                                                                    <input 
                                                                        type="text"
                                                                        value={editingSuggestionData?.headline || ''}
                                                                        onChange={(e) => setEditingSuggestionData(prev => prev ? {...prev, headline: e.target.value} : null)}
                                                                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 ring-indigo-500/20"
                                                                        placeholder="Enter headline..."
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Visual Prompt</label>
                                                                    <textarea 
                                                                        value={editingSuggestionData?.displayPrompt || ''}
                                                                        onChange={(e) => setEditingSuggestionData(prev => prev ? {...prev, displayPrompt: e.target.value} : null)}
                                                                        className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 ring-indigo-500/20 resize-none"
                                                                        rows={3}
                                                                        placeholder="Describe the visual..."
                                                                    />
                                                                </div>
                                                                <div className="flex gap-2 pt-1">
                                                                    <button 
                                                                        onClick={handleSaveEdit}
                                                                        className="flex-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button 
                                                                        onClick={handleCancelEdit}
                                                                        className="flex-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <span className={AdMakerStyles.suggestionHeadline}>{s.headline}</span>
                                                                    <button 
                                                                        onClick={(e) => handleStartEdit(e, i)}
                                                                        className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                                                                        title="Edit Suggestion"
                                                                    >
                                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                                <p className={AdMakerStyles.suggestionText}>"{s.displayPrompt}"</p>
                                                            </>
                                                        )}
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
                                    ) : scanError ? (
                                        <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                            <p className="text-sm font-bold text-gray-400">Something went wrong. Please try again.</p>
                                            <button 
                                                onClick={() => performPixaVisionScan()}
                                                className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                            >
                                                Retry Scan
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center flex-col gap-4">
                                            <p className="text-sm font-bold text-gray-400">Pixa AI is ready to analyze your product.</p>
                                            <button 
                                                onClick={() => setMode(null)}
                                                className="text-indigo-600 font-bold text-xs uppercase tracking-widest hover:underline"
                                            >
                                                Change Ad Strategy
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
