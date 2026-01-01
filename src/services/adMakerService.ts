import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize image with customizable width
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
    "Big Studio": "Minimalist product listing, seamless grey or white background, perfect balanced studio softbox lighting.",
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

    const prompt = `You are a World-Class Advertising Director.
    
    *** AD BRIEF ***
    Product: ${inputs.productName || 'Unknown Item'}
    Context: ${inputs.description || 'General Marketing'}
    Specifications/USPs: ${inputs.productSpecs || 'Not provided'}
    Vibe requested: ${inputs.vibe || 'Professional'}
    Target Industry: ${inputs.industry}
    
    **TASK 1: VISUAL SCAN**
    Analyze the attached photo(s). Detect material type (glass, metal, fabric) and camera perspective (eye-level, top-down).
    
    **TASK 2: TREND PULSE (Google Search)**
    Search for trending 2025 ${inputs.industry} ads for ${inputs.productName}. Identify what typography and layout hooks are converting best.
    
    **TASK 3: STRATEGIC COPY (CRITICAL)**
    Transform the 'Specifications/USPs' into a high-conversion hook.
    1. **Headline**: One powerful, verb-led 3-6 word headline.
    2. **Subheadline**: A supporting 5-8 word line highlighting the biggest benefit.
    3. **CTA**: A standard conversion button text.
    
    Avoid AI fluff like "Discover" or "Unleash". Use human, punchy, "Apple-style" or "Nike-style" direct copy.
    
    OUTPUT JSON ONLY:
    {
        "forensicReport": "Physics audit of the product pixels...",
        "marketTrends": "Summary of current industry design cues...",
        "strategicCopy": { "headline": "STRICT_HEADLINE", "subheadline": "STRICT_SUB", "cta": "STRICT_CTA" },
        "visualDirection": "Detailed style notes for the image generator...",
        "interactionLogic": "How the product relates to the environment...",
        "perspectiveAnchor": "Specific camera angle to maintain"
    }`;

    const parts: any[] = lowResAssets.map((asset, i) => ({ text: `ASSET ${i+1}:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                // Note: responseMimeType is not allowed when tools: googleSearch is used in some versions,
                // but here we are using it for a flash-preview structured call.
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { forensicReport: "", marketTrends: "", strategicCopy: { headline: inputs.productName || "Premium Quality", subheadline: inputs.description || "", cta: "Order Now" }, visualDirection: "", interactionLogic: "", perspectiveAnchor: "" };
    }
};

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    visualFocus?: 'product' | 'lifestyle' | 'conceptual'; 
    aspectRatio?: '1:1' | '4:5' | '9:16';
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    vibe?: string;
    productName?: string;
    offer?: string;
    description?: string;
    productSpecs?: string; 
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
        modelType: string;
        region: string;
        skinTone: string;
        bodyType: string;
        composition: string;
        framing: string;
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
    
    // Style Mapping
    let styleInstructions = "";
    if (optRef) {
        styleInstructions = `*** STYLE GUIDE: REFERENCE IMAGE ***\nCopy the layout and lighting of the reference exactly. Use the same typography position.`;
        parts.push({ text: "REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
    } else {
        const vibeDesc = VIBE_PROMPTS[inputs.vibe || ''] || inputs.vibe || "Professional studio lighting.";
        styleInstructions = `*** THE VIBE: ${inputs.vibe} ***\n${vibeDesc}`;
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `PRODUCT ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    
    // Handle Model Details
    let modelDirective = "";
    if (optModel) {
        modelDirective = "Use the TARGET MODEL provided. Maintain facial identity and body shape exactly.";
        parts.push({ text: "MODEL:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    } else if (inputs.modelSource === 'ai' && inputs.modelParams) {
        modelDirective = `Render a photorealistic AI Model: ${inputs.modelParams.modelType}, Region: ${inputs.modelParams.region}, Skin: ${inputs.modelParams.skinTone}, Body: ${inputs.modelParams.bodyType}, Composition: ${inputs.modelParams.composition}, Framing: ${inputs.modelParams.framing}. The model should naturally interact with the product.`;
    }

    const finalPrompt = `You are a High-End Ad Production Engine.
    
    *** THE STRATEGY ***
    ${styleInstructions}
    ${brief.visualDirection}
    ${modelDirective ? `*** MODEL PROTOCOL ***\n${modelDirective}` : ''}
    
    *** DESIGN & TYPOGRAPHY MANDATE (STRICT) ***
    1. **Identity**: Do NOT alter the product pixels. Maintain all label legibility.
    2. **Headline**: Render "${brief.strategicCopy.headline}" in bold, premium typography in the primary optical zone (Top or Center-Left).
    3. **Subheadline**: Render "${brief.strategicCopy.subheadline}" directly under the headline with elegant hierarchy.
    4. **CTA**: Add a professional button-style call to action saying "${brief.strategicCopy.cta}" at the bottom.
    5. **Contextual Realism**: Ensure the product feels grounded in the environment with realistic contact shadows.
    
    OUTPUT: A single 4K commercial-grade image that looks like a finished, designed advertisement.`;

    parts.push({ text: finalPrompt });

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        }));
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (e) { throw e; }
};

/**
 * Iterative Refinement Service
 */
export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    const prompt = `You are a Precision Ad Editor.
    
    *** CURRENT VERSION ***
    Modify the provided image based on this specific user feedback: "${instruction}".
    
    *** EDITING RULES ***
    1. **Preservation**: Keep the core product, environment, and vibe identical.
    2. **Transformation**: Apply the user's specific requested change (e.g., reposition logo, brighten scene, change text content).
    3. **Seamlessness**: Ensure the edited area blends perfectly with the rest of the high-fidelity ad.
    
    OUTPUT: A single 4K refined image.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: optResult.data, mimeType: optResult.mimeType } },
                    { text: prompt }
                ]
            },
            config: { 
                responseModalities: [Modality.IMAGE]
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    } catch (e) { throw e; }
};