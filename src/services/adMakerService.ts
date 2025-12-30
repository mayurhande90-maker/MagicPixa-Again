
import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";

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

export interface Archetype {
    id: string;
    label: string;
    desc: string;
    focus: 'product' | 'lifestyle';
    prompt: string;
}

const ECOM_ARCHETYPES: Archetype[] = [
    { id: 'viral_sale', label: 'The Viral Sale', desc: 'High energy, bold text, performance focus.', focus: 'product', prompt: 'Hard-sell retail style, high contrast, aggressive but premium lighting, emphasis on conversion elements, vibrant commercial colors.' },
    { id: 'luxury_showcase', label: 'Luxury Showcase', desc: 'Minimalist, high-end, premium textures.', focus: 'product', prompt: 'Luxury editorial style, soft cinematic shadows, premium materials (marble, gold, velvet), sophisticated color grading, high-end studio lighting.' },
    { id: 'lifestyle_story', label: 'Lifestyle Story', desc: 'In-use, emotional, natural setting.', focus: 'lifestyle', prompt: 'Authentic lifestyle photography, product in an organic environment, natural daylight, soft bokeh, emotional and aspirational atmosphere.' },
    { id: 'minimal_pro', label: 'Minimalist Pro', desc: 'Clean background, geometry focus.', focus: 'product', prompt: 'Minimalist modern design, clean white or desaturated space, sharp geometric focus, perfectly balanced lighting, magazine-standard clarity.' }
];

const REALTY_ARCHETYPES: Archetype[] = [
    { id: 'investor_alert', label: 'Investor Alert', desc: 'ROI focused, sharp clarity, data-heavy vibe.', focus: 'product', prompt: 'Professional architectural photography, high clarity, wide dynamic range, emphasizes structure and scale, bright neutral lighting.' },
    { id: 'golden_hour', label: 'Golden Hour Listing', desc: 'Warm, emotional, inviting atmosphere.', focus: 'product', prompt: 'Emotional residential photography, sunset/golden hour lighting, warm glows through windows, long inviting shadows, cozy and upscale vibe.' },
    { id: 'neighborhood', label: 'The Neighborhood', desc: 'Lifestyle focused, community feel.', focus: 'lifestyle', prompt: 'Outdoor community lifestyle, lush landscaping, warm natural light, emphasizes surroundings and lifestyle benefits, friendly tone.' },
    { id: 'arch_detail', label: 'Architectural Detail', desc: 'Focus on materials and high-end design.', focus: 'product', prompt: 'Macro architectural photography, focus on textures (stone, glass, wood), high-contrast lighting, sharp artistic geometry.' }
];

const FOOD_ARCHETYPES: Archetype[] = [
    { id: 'tasty_closeup', label: 'Tasty Close-up', desc: 'Extreme detail, appetizing textures.', focus: 'product', prompt: 'Macro food photography, glisten and texture focus, vibrant appetizing colors, soft directional lighting, shallow depth of field.' },
    { id: 'chefs_table', label: 'Chef’s Table', desc: 'Premium plating, restaurant environment.', focus: 'lifestyle', prompt: 'High-end restaurant atmosphere, premium plating, elegant table setting, warm tungsten ambient light, sophisticated culinary vibe.' },
    { id: 'midnight_craving', label: 'Midnight Craving', desc: 'Moody, high-contrast, urgent vibe.', focus: 'product', prompt: 'Low-key food photography, dramatic spotlighting, deep shadows, rich saturated colors, intense appetizing appeal.' },
    { id: 'clean_menu', label: 'Clean Menu', desc: 'Isolated, minimalist, high-key.', focus: 'product', prompt: 'Modern menu photography, isolated on clean background, high-key lighting, bright and fresh, zero clutter.' }
];

const PRO_ARCHETYPES: Archetype[] = [
    { id: 'authority', label: 'Authority Builder', desc: 'Professional, trustworthy, corporate.', focus: 'lifestyle', prompt: 'Corporate leadership aesthetic, clean structured office environment, balanced neutral lighting, confident and trustworthy color palette.' },
    { id: 'testimonial', label: 'User Testimonial', desc: 'Friendly, relatable, social-proof.', focus: 'lifestyle', prompt: 'Friendly user-focused photography, approachable smart-casual environment, natural lighting, genuine and relatable atmosphere.' },
    { id: 'solver', label: 'Problem Solver', desc: 'High energy, solution-focused, bold.', focus: 'product', prompt: 'High-impact technical visualization, clean tech environment, vibrant blue/green accents, focused and energetic composition.' },
    { id: 'future', label: 'Future Vision', desc: 'Futuristic, innovative, high-tech.', focus: 'product', prompt: 'Futuristic technology aesthetic, dark gradients, neon rim lighting, high-tech interface elements, innovative atmosphere.' }
];

export const getArchetypesForIndustry = (industry: string): Archetype[] => {
    switch (industry) {
        case 'ecommerce': case 'fashion': case 'fmcg': return ECOM_ARCHETYPES;
        case 'realty': return REALTY_ARCHETYPES;
        case 'food': return FOOD_ARCHETYPES;
        default: return PRO_ARCHETYPES;
    }
};

export interface AdMakerInputs {
    industry: string;
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    blueprintId?: string; // This is now the prompt part of the archetype
    description: string; // This is the consolidated Creative Goal
    aspectRatio?: string;
    visualFocus: 'product' | 'lifestyle';
    modelSource?: 'ai' | 'upload';
    modelImage?: { base64: string; mimeType: string } | null;
    modelParams?: { gender: string; ethnicity: string; skinTone: string; bodyType: string; };
}

export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    // STEP 1: ENTITY EXTRACTION & CREATIVE STRATEGY (THINKING PHASE)
    const extractionPrompt = `You are a World-Class Ad Director.
    
    *** THE CREATIVE GOAL ***
    "${inputs.description}"
    
    *** THE TASK ***
    Analyze the goal and extract entities for a high-converting ad campaign. 
    Use Google Search to find current 2025 consumer trends for this specific product context.
    
    RETURN JSON ONLY:
    {
        "productName": "extracted product name",
        "offer": "extracted special offer or CTA",
        "location": "extracted location if any",
        "hook": "a catchy verb-led headline rewritten for maximum CTR",
        "subline": "a professional subheadline that emphasizes value",
        "visualDirectives": "specific art direction for the rendering engine based on the goal",
        "colorPsychology": "suggested hex code or color name to evoke the right emotion"
    }`;

    const extractionRes = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: extractionPrompt,
        config: { 
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json"
        }
    });

    const brief = JSON.parse(extractionRes.text || "{}");

    // STEP 2: HIGH-FIDELITY PRODUCTION
    const optimizedMains = await Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536)));
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : null;
    const optRef = inputs.referenceImage ? await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : null;
    const optModel = (inputs.modelSource === 'upload' && inputs.modelImage) ? await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : null;

    const parts: any[] = [];
    optimizedMains.forEach((opt, i) => {
        parts.push({ text: `MANDATORY PRODUCT ASSET ${i+1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "HUMAN SUBJECT REFERENCE:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    let styleMandate = inputs.blueprintId || "Professional commercial photography.";
    if (optRef) {
        parts.push({ text: "REFERENCE STYLE GUIDE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        styleMandate = "IGNORE ARCHETYPES. Strictly replicate the lighting, background, and layout of the 'REFERENCE STYLE GUIDE'.";
    }

    const brandDNA = brand ? `Brand: '${brand.companyName}'. Palette: ${brand.colors.primary}.` : "";

    const productionPrompt = `You are a High-End Ad Production Engine.
    ${brandDNA}
    ${styleMandate}
    
    *** CREATIVE BRIEF ***
    Product: ${brief.productName}
    Offer: ${brief.offer}
    Direction: ${brief.visualDirectives}
    
    *** MANDATORY RENDERING RULES ***
    1. **Identity**: The product labels and structure must be pixel-perfect.
    2. **Composition**: ${inputs.visualFocus === 'lifestyle' ? 'Physically integrate the human subject with the product. Realistic contact points.' : 'Focus strictly on product geometry.'}
    3. **Typography**:
       - HEADLINE: "${brief.hook}" (Large, commanding)
       - SUBLINE: "${brief.subline}"
       - CTA: "${brief.offer || 'Order Now'}"
    
    OUTPUT: A single 4K masterpiece asset. Aspect Ratio: ${inputs.aspectRatio || '1:1'}.`;

    parts.push({ text: productionPrompt });

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: (inputs.aspectRatio as any) || '1:1', imageSize: '1K' },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        },
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Render engine failed.");
};
