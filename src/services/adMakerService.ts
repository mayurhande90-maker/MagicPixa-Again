
import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, applyWatermark } from "../utils/imageUtils";
import { BrandKit } from "../types";

/**
 * PIXA ADMAKER SERVICE v2.0 (REWRITTEN FROM SCRATCH)
 * A high-performance, single-brain AI engine for viral ad creation.
 */

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    vibe?: string;
    productName?: string;
    website?: string;
    offer?: string;
    description?: string;
    productSpecs?: string;
    aspectRatio?: '1:1' | '4:5' | '9:16' | null;
    modelSource?: 'ai' | 'upload' | null;
    modelImage?: { base64: string; mimeType: string } | null;
    modelParams?: {
        modelType: string;
        region: string;
        skinTone: string;
        bodyType: string;
        composition: string;
        framing: string;
    };
    customTitle?: string;
}

interface CreativeBrief {
    headline: string;
    subheadline: string;
    cta: string;
    layout: string;
    finish: 'Glossy' | 'Matte' | 'Metallic' | 'Glass' | 'Fabric';
    tone: 'Bold' | 'Luxury' | 'Witty' | 'Urgent';
    colorPalette: string;
    lightingMood: string;
    compositionalStyle: string;
    visualDirection: string;
}

const INDUSTRY_FALLBACKS: Record<string, { headline: string; subheadline: string }> = {
    ecommerce: { headline: "THE NEW STANDARD", subheadline: "Uncompromising quality for your daily life." },
    realty: { headline: "YOUR DREAM SPACE", subheadline: "Experience luxury living like never before." },
    food: { headline: "PURE INDULGENCE", subheadline: "Taste the perfection in every single bite." },
    saas: { headline: "WORK SMARTER", subheadline: "The next generation of productivity is here." },
    fmcg: { headline: "FRESHNESS REDEFINED", subheadline: "Nature's best, delivered to your home." },
    fashion: { headline: "STAY ICONIC", subheadline: "Timeless style for the modern individual." },
    education: { headline: "MASTER YOUR FUTURE", subheadline: "Learn from the best, lead the rest." },
    services: { headline: "TRUSTED EXPERTISE", subheadline: "Professional solutions for your business growth." }
};

const VIBE_PROMPTS: Record<string, string> = {
    "Luxury": "Luxury focus, premium aesthetic, minimal high-end composition, elegant lighting with deep soft shadows, expensive materials like marble or silk. Typography: Tracking-wide, Serif, elegant.",
    "Modern": "Modern tech aesthetic, Apple-style gradients, clean glass and metal surfaces, futuristic and professional. Typography: Bold, high-contrast Sans-Serif.",
    "Natural": "Eco-friendly focus, sunlight dapples, plants, wood and stone textures, soft earthy tones. Typography: Natural, organic, light weights.",
    "Moody": "Dramatic low-key lighting, moody shadows, neon blue or orange accents, high-end editorial feel. Typography: High-contrast, sharp.",
    "Bright": "High energy, clear real estate listing style, high exposure, informative and bright, white background. Typography: Clean, modern, approachable.",
    "Colorful": "High-energy, colorful, pop-art style, vibrant saturated colors, sharp contrast. Typography: Bold, playful.",
    "Studio": "Minimalist product listing, seamless grey or white background, perfect balanced studio softbox lighting. Typography: Minimalist, mid-weight Sans-Serif.",
    "Simple": "Extreme boutique minimalism, bold massive typography, extreme white space, ultra-minimalist focus. Typography: Elegant, light weights."
};

/**
 * UTILITY: Image Optimization
 */
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
 * ENGINE 1: THE MASTER STRATEGY ENGINE (CMO + COPYWRITER)
 * Consolidates research, visual audit, and headline generation into one step.
 */
const performAdStrategy = async (inputs: AdMakerInputs): Promise<CreativeBrief> => {
    const lowResAssets = await Promise.all([
        optimizeImage(inputs.mainImages[0].base64, inputs.mainImages[0].mimeType, 512),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 512) : Promise.resolve(null)
    ]);

    const [productAsset, referenceAsset] = lowResAssets;

    const prompt = `Act as a world-class CMO and Viral Ad Copywriter. 
    Your task is to develop a high-conversion creative brief for the product shown in the 'PRODUCT ASSET'.
    
    *** THE VISUAL AUDIT (CRITICAL) ***
    1. Scan the 'PRODUCT ASSET' with extreme precision. Identify the exact product, color, and material.
    2. If a 'STYLE REFERENCE' is provided, extract its text placement, lighting, and compositional physics.
    
    *** THE VIRAL HEADLINE (MANDATORY) ***
    1. Generate a 2-5 word "Curiosity Gap" headline. 
    2. Anchor the headline to a visual detail from the image (e.g., "The Sleek Matte Finish").
    3. Avoid generic buzzwords like "Elevate", "Ultimate", "Standard", "Quality".
    
    *** DATA CONTEXT ***
    Product: "${inputs.productName || 'N/A'}"
    Description: "${inputs.description || 'N/A'}"
    Industry: "${inputs.industry}"
    Vibe: "${inputs.vibe || 'Modern'}"
    
    RETURN JSON ONLY:
    {
        "headline": "string (2-5 words, viral, curiosity-gap)",
        "subheadline": "string (elegant, contextual)",
        "cta": "string (short, action-oriented)",
        "layout": "string (narrative description of product and text placement)",
        "finish": "Glossy | Matte | Metallic | Glass | Fabric",
        "tone": "Bold | Luxury | Witty | Urgent",
        "colorPalette": "string",
        "lightingMood": "string",
        "compositionalStyle": "string",
        "visualDirection": "string"
    }`;

    const parts: any[] = [];
    parts.push({ text: `PRODUCT ASSET:`, inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    if (referenceAsset) parts.push({ text: `STYLE REFERENCE:`, inlineData: { data: referenceAsset.data, mimeType: referenceAsset.mimeType } });
    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                seed: Math.floor(Math.random() * 1000000),
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING },
                        subheadline: { type: Type.STRING },
                        cta: { type: Type.STRING },
                        layout: { type: Type.STRING },
                        finish: { type: Type.STRING, enum: ['Glossy', 'Matte', 'Metallic', 'Glass', 'Fabric'] },
                        tone: { type: Type.STRING, enum: ['Bold', 'Luxury', 'Witty', 'Urgent'] },
                        colorPalette: { type: Type.STRING },
                        lightingMood: { type: Type.STRING },
                        compositionalStyle: { type: Type.STRING },
                        visualDirection: { type: Type.STRING }
                    },
                    required: ['headline', 'subheadline', 'cta', 'layout', 'finish', 'tone', 'colorPalette', 'lightingMood', 'compositionalStyle', 'visualDirection']
                }
            },
            featureName: 'Ad Strategy Engine'
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Strategy Engine failed, using fallbacks", e);
        const fallback = INDUSTRY_FALLBACKS[inputs.industry] || INDUSTRY_FALLBACKS.ecommerce;
        return {
            headline: inputs.productName ? `${inputs.productName} | ${fallback.headline}` : fallback.headline,
            subheadline: fallback.subheadline,
            cta: "Discover More",
            layout: "The product is centered as the hero. Text is placed in the upper third safe zone.",
            finish: 'Matte',
            tone: 'Bold',
            colorPalette: "Modern & Balanced",
            lightingMood: "Professional Studio",
            compositionalStyle: "Hero Focus",
            visualDirection: "Clean commercial studio aesthetics."
        };
    }
};

/**
 * ENGINE 2: THE PRODUCTION ENGINE (ART DIRECTOR + VISUALIZER)
 * Hardened prompt architecture to force text rendering and visual fidelity.
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null, userPlan?: string): Promise<string> => {
    // 1. Run Strategy Engine
    const brief = await performAdStrategy(inputs);

    // 2. Optimize Assets
    const [optimizedMains, optLogo, optModel, optRef] = await Promise.all([
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "SUBJECT DIGITAL TWIN (SACRED):" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    if (optRef) parts.push({ text: "STYLE REFERENCE (SACRED):" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });

    const prompt = `Act as a Master Art Director and Elite CGI Artist. 
    Create a 2K photorealistic marketing masterpiece with a perfect Visual Hierarchy.
    
    *** THE CREATIVE COPY (MANDATORY RENDER) ***
    1. **HEADLINE (HERO SCALE)**: You MUST render the text "${inputs.customTitle || brief.headline}" as a massive, high-impact headline using ${brand?.fonts.heading || 'Modern Serif'}.
    2. **SUBHEADLINE (CONTEXTUAL)**: Render "${brief.subheadline}" in a smaller, elegant font directly below the headline.
    ${inputs.website ? `3. **UTILITY STACK**: Render "${inputs.website}" in a tiny, clean technical font at the bottom.` : ""}
    
    *** TEXT INTEGRATION RULES (HARDENED) ***
    - **LEGIBILITY**: The text MUST be perfectly readable. Use high-contrast colors (white on dark, black on light) or subtle drop shadows.
    - **Z-AXIS PHYSICS**: Treat the text as a physical 3D object in the scene. It should have "Contact Shadows" and interact with the lighting.
    - **REFERENCE OVERRIDE**: Even if the 'STYLE REFERENCE' has no text, you MUST integrate the headline into the composition.
    
    *** PRODUCTION BLUEPRINT ***
    - **LAYOUT**: ${brief.layout}
    - **FINISH**: The product has a "${brief.finish}" finish. Apply realistic reflections and highlights.
    - **TONE**: ${brief.tone}
    - **LIGHTING**: ${brief.lightingMood}
    - **VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic."}
    
    *** IDENTITY ANCHOR (SACRED ASSET PROTOCOL) ***
    1. **PRODUCT INTEGRITY**: Do NOT alter the geometry or branding of the 'SACRED PRODUCT ASSETS'. 
    2. **BRAND FIDELITY**: The 'BRAND LOGO' must be pixel-perfect. 
    ${optModel ? "3. **SUBJECT LOCK**: The person must be a 1:1 biometric replica of the 'SUBJECT DIGITAL TWIN'." : ""}
    ${inputs.modelSource === 'ai' ? `3. **TALENT**: Generate a ${inputs.modelParams?.modelType || 'Professional Model'} from ${inputs.modelParams?.region || 'Global'}.` : ""}

    OUTPUT: A single 2K photorealistic marketing masterpiece. Accuracy and typographic perfection are your primary KPIs.`;

    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1", imageSize: "2K" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
            featureName: 'Ad Creative Generation'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (imagePart?.inlineData?.data) {
            let resData = imagePart.inlineData.data;
            if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
                resData = await applyWatermark(resData, 'image/png');
            }
            return resData;
        }
        throw new Error("Ad Production engine failed. Ensure your source photos are clear.");
    } catch (e) { throw e; }
};

/**
 * ENGINE 3: THE REFINEMENT ENGINE
 */
export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    userPlan?: string,
    originalImage?: { base64: string, mimeType: string },
    originalPrompt?: string
): Promise<string> => {
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    let prompt = `You are an Elite Ad Retoucher. Modify the provided ad based on feedback: "${instruction}".
    1. **Preservation**: Maintain 98% of the original product identity and branding.
    2. **Precision**: Only iterate on the requested areas.
    OUTPUT: A single 4K photorealistic refined image.`;

    const parts: any[] = [];
    if (originalImage) {
        const optOriginal = await optimizeImage(originalImage.base64, originalImage.mimeType, 1536);
        parts.push({ inlineData: { data: optOriginal.data, mimeType: optOriginal.mimeType } });
    }
    parts.push({ inlineData: { data: optResult.data, mimeType: optResult.mimeType } });
    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Ad Creative Refinement'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (imagePart?.inlineData?.data) {
            let resData = imagePart.inlineData.data;
            if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
                resData = await applyWatermark(resData, 'image/png');
            }
            return resData;
        }
        throw new Error("Refinement engine failed.");
    } catch (e) { throw e; }
};
