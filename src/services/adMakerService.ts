import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

const optimizeImage = async (base64: string, mimeType: string, width: number = 1280): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

/**
 * Lehman Vibe Mappings - Translates simple names to technical prompts
 */
const VIBE_PROMPTS: Record<string, string> = {
    // E-com / Products / Fashion
    "Luxury & Elegant": "Luxury focus, premium aesthetic, minimal high-end composition, elegant lighting with deep soft shadows, expensive materials like marble or silk.",
    "Big Sale / Discount": "High-energy urgency, bold typography, vibrant attention-grabbing colors, aggressive retail focus for deal-seekers.",
    "Lifestyle": "Lifestyle setting, natural organic environment, warm sunlight, blurred living room/kitchen background, relatable and emotional.",
    "Clean Studio": "Minimalist product listing, seamless grey or white background, perfect balanced studio softbox lighting.",
    "Nature": "Eco-friendly focus, sunlight dapples, plants, wood and stone textures, soft earthy tones.",
    "Cinematic": "Dramatic low-key lighting, moody shadows, neon blue or orange accents, high-end editorial feel.",

    // Realty
    "Grand & Expensive": "Architectural showcase style, high-contrast luxury photography, premium status, dusk/blue hour lighting with warm interior glow.",
    "Bright & Airy": "Clean real estate listing style, high exposure, informative and bright, spacious and welcoming daylight feel.",
    "Cozy & Warm": "Residential inviting feel, golden hour sunlight, soft textures, warm homey atmosphere.",
    "Modern & Sharp": "Modern architecture, clean lines, high sharpness, neutral tones, tech-forward presentation.",
    "Lush & Green": "Focus on landscaping and exterior beauty, vibrant greenery, bright clear sky, spacious outdoor context.",

    // Food
    "Delicious & Fresh": "Mouth-watering focus, vibrant saturated colors, fresh ingredients visible, bright natural light, energetic appetite-hook style.",
    "Classy & Dim": "Fine dining atmosphere, low-key moody lighting, elegant and sophisticated, focus on texture and intimacy.",
    "Rustic & Homemade": "Warm wood surfaces, farmhouse aesthetic, organic textures, natural flour or herb dustings, cozy kitchen vibe.",
    "Vibrant Street": "High-energy, colorful, pop-art style food photography, sharp contrast, urban food stall context.",
    "Clean & Healthy": "Minimalist, bright whites and greens, clean porcelain surfaces, very light and airy health-conscious look.",

    // Tech / SaaS / Services
    "Modern & Sleek": "Modern tech aesthetic, Apple-style gradients, clean glass and metal surfaces, futuristic and professional.",
    "Professional & Trust": "Clean corporate blue and white theme, high clarity, trustworthy and stable business presentation.",
    "Cyberpunk / Neon": "Futuristic dark mode, glowing purple and blue neon lines, high-tech digital grid elements.",
    "Minimalistic": "Bold massive typography, extreme white space, ultra-minimalist focus on a single core message.",
    "High Energy": "Dynamic camera angles, action-oriented visuals, vibrant speed lines, high-impact motion feel."
};

/**
 * --- PHASE 1: THE AD-INTELLIGENCE ENGINE ---
 */
interface CreativeBrief {
    forensicReport: string;
    marketTrends: string;
    strategicCopy: {
        headline: string;
        subheadline: string;
        cta: string;
    };
    visualDirection: string;
    interactionLogic: string;
    perspectiveAnchor: string;
}

const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 2).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `You are a World-Class Advertising Director for a high-end agency.
    
    *** AD BRIEF ***
    Product: ${inputs.productName || 'Unknown'}
    Vibe requested: ${inputs.vibe || 'Professional'}
    Target Industry: ${inputs.industry}
    
    **TASK 1: VISUAL SCAN**
    Analyze the attached photo(s). Detect material type and camera perspective (e.g. eye-level, low-angle).
    
    **TASK 2: TREND PULSE (Google Search)**
    Search for trending 2025 ${inputs.industry} ads matching "${inputs.vibe}".
    
    **TASK 3: STRATEGIC COPY**
    Rewrite the ad copy for maximum conversion based on the vibe.
    
    OUTPUT JSON ONLY:
    {
        "forensicReport": "Technical physics report...",
        "marketTrends": "Trend summary...",
        "strategicCopy": { "headline": "string", "subheadline": "string", "cta": "string" },
        "visualDirection": "Style notes...",
        "interactionLogic": "How items relate...",
        "perspectiveAnchor": "Camera angle"
    }`;

    const parts: any[] = lowResAssets.map((asset, i) => ({ text: `ASSET ${i+1}:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { forensicReport: "", marketTrends: "", strategicCopy: { headline: inputs.productName || "Premium", subheadline: "", cta: "Order Now" }, visualDirection: "", interactionLogic: "", perspectiveAnchor: "" };
    }
};

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    visualFocus?: 'product' | 'lifestyle' | 'conceptual'; 
    aspectRatio?: '1:1' | '4:5' | '9:16';
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    vibe?: string; // Preset name OR custom description
    productName?: string;
    offer?: string;
    description?: string;
    project?: string;
    location?: string;
    config?: string;
    features?: string[];
    dishName?: string;
    restaurant?: string;
    headline?: string;
    cta?: string;
    subheadline?: string;
    occasion?: string;
    audience?: string;
    layoutTemplate?: string;
    modelSource?: 'ai' | 'upload';
    modelImage?: { base64: string; mimeType: string } | null;
    modelParams?: {
        gender: string;
        ethnicity: string;
        skinTone: string;
        bodyType: string;
    };
}

/**
 * --- PHASE 2: THE PRODUCTION ENGINE ---
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    const [brief, optimizedMains, optLogo, optModel, optRef] = await Promise.all([
        performAdIntelligence(inputs, brand),
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    // Style Mapping: Use Reference OR Preset OR Raw User Input
    let styleInstructions = "";
    if (optRef) {
        styleInstructions = `*** STYLE GUIDE: REFERENCE IMAGE ***\nCopy the layout and lighting of the reference exactly.`;
        parts.push({ text: "REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
    } else {
        // If it's a known preset, use mapped instructions. 
        // If it's not a known key, it's a custom user description.
        const vibeDesc = VIBE_PROMPTS[inputs.vibe || ''] || inputs.vibe || "Professional studio lighting.";
        styleInstructions = `*** THE VIBE: ${inputs.vibe} ***\n${vibeDesc}`;
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `PRODUCT ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "MODEL:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    const finalPrompt = `You are a High-End Ad Production Engine.
    
    *** THE STRATEGY ***
    ${styleInstructions}
    ${brief.visualDirection}
    
    *** DESIGN RULES ***
    1. **Identity**: Do NOT alter the product pixels. Keep labels sharp.
    2. **Interaction**: ${brief.interactionLogic}
    3. **Perspective**: Background MUST match camera angle: ${brief.perspectiveAnchor}.
    4. **Typography**: Render "${brief.strategicCopy.headline}" and "${brief.strategicCopy.subheadline}" professionally.
    
    OUTPUT: A single 4K commercial-grade image.`;

    parts.push({ text: finalPrompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1" }
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (e) { throw e; }
};