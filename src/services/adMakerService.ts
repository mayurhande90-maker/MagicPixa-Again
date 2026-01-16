import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

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
    layoutTemplate?: string;
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
}

const LAYOUT_BLUEPRINTS: Record<string, string> = {
    'Hero Focus': "SPATIAL GRID: [Subject: Center-Weighted, Scale 70%] | [Headline: Upper 15%, Center-Align] | [CTA: Bottom 10%, Floating]. Rule: Maximum focal impact on the product.",
    'Split Design': "SPATIAL GRID: [Subject: Left 50% Horizontal Column] | [Text/Copy Stack: Right 50% Horizontal Column]. Rule: Hard vertical axis split for clean informational hierarchy.",
    'Bottom Strip': "SPATIAL GRID: [Subject: Upper 80% Canvas] | [Information Strip: Bottom 20% with semi-transparent backdrop]. Rule: Cinematic focus with a grounded info footer.",
    'Social Proof': "SPATIAL GRID: [Subject: Center-Right] | [Review Bubble/Badge: Bottom-Left Overlay]. Rule: Offset subject to create space for secondary trust markers.",
    'Magazine Cover': "SPATIAL GRID: [Subject: Center, Scale 85%, Overlaps Background Typography] | [Headline: Massive stylized font behind or slightly overlapping subject]. Rule: High-prestige editorial cover aesthetic.",
    'Minimalist Zen': "SPATIAL GRID: [Subject: Bottom-Right Third, Scale 35%] | [Headline: Top-Left, small, elegant serif] | [White Space: 75% of canvas]. Rule: High-end boutique minimalism with maximum breathing room.",
    'Feature Callout': "SPATIAL GRID: [Subject: Center, Scale 60%] | [Callout Lines: Thin pointers radiating from product parts to small text labels]. Rule: Technical education and feature highlighting.",
    'Action Dynamic': "SPATIAL GRID: [Subject: Diagonally tilted 15 degrees, motion blur trails] | [Headline: Bold, italicized, aggressive placement]. Rule: High-energy urgency and excitement.",
    'Contrast Grid': "SPATIAL GRID: [Vertical Split: 50/50] | [Left Pane: Problem or 'Before' state] | [Right Pane: Product or 'After' state]. Rule: Immediate visual proof of transformation and solution.",
    'The Trio': "SPATIAL GRID: [Main Hero: Center, Scale 100%] | [Variant 1: Lower Left, Scale 40%] | [Variant 2: Lower Right, Scale 40%]. Rule: Depth-based hierarchy for product ranges.",
    'Range Lineup': "SPATIAL GRID: [3 Items: Arranged side-by-side on a horizontal shelf plane]. Rule: Perfect symmetrical alignment for collections.",
    'Hero & Variants': "SPATIAL GRID: [Hero Item: Front & Center] | [2 Supporting Items: Blurred in the shallow background]. Rule: Dynamic bokeh-based product storytelling."
};

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

const VIBE_PROMPTS: Record<string, string> = {
    "Luxury & Elegant": "Luxury focus, premium aesthetic, minimal high-end composition, elegant lighting with deep soft shadows, expensive materials like marble or silk. Typography: Tracking-wide, Serif, elegant.",
    "Big Sale / Discount": "High-energy urgency, bold typography, vibrant attention-grabbing colors, aggressive retail focus for deal-seekers. Typography: Bold, high-contrast Sans-Serif.",
    "Lifestyle": "Lifestyle setting, natural organic environment, warm sunlight, blurred living room/kitchen background, relatable and emotional. Typography: Clean, modern, approachable.",
    "Clean Studio": "Minimalist product listing, seamless grey or white background, perfect balanced studio softbox lighting. Typography: Minimalist, mid-weight Sans-Serif.",
    "Nature": "Eco-friendly focus, sunlight dapples, plants, wood and stone textures, soft earthy tones. Typography: Natural, organic, light weights.",
    "Cinematic": "Dramatic low-key lighting, moody shadows, neon blue or orange accents, high-end editorial feel.",
    "Grand & Expensive": "Architectural showcase style, high-contrast luxury photography, premium status, dusk/blue hour lighting with warm interior glow.",
    "Bright & Airy": "Clean real estate listing style, high exposure, informative and bright, spacious and welcoming daylight feel.",
    "Cozy & Warm": "Residential inviting feel, golden hour sunlight, soft textures, warm homey atmosphere.",
    "Modern & Sharp": "Modern architecture, clean lines, high sharpness, neutral tones, tech-forward presentation.",
    "Lush & Green": "Focus on landscaping and exterior beauty, vibrant greenery, bright clear sky, spacious outdoor context.",
    "Delicious & Fresh": "Mouth-watering focus, vibrant saturated colors, fresh ingredients visible, bright natural light, energetic appetite-hook style.",
    "Classy & Dim": "Fine dining atmosphere, low-key moody lighting, elegant and sophisticated, focus on texture and intimacy.",
    "Rustic & Homemade": "Warm wood surfaces, farmhouse aesthetic, organic textures, natural flour or herb dustings, cozy kitchen vibe.",
    "Vibrant Street": "High-energy, colorful, pop-art style food photography, sharp contrast, urban food stall context.",
    "Clean & Healthy": "Minimalist, bright whites and greens, clean porcelain surfaces, very light and airy health-conscious look.",
    "Modern & Sleek": "Modern tech aesthetic, Apple-style gradients, clean glass and metal surfaces, futuristic and professional.",
    "Professional & Trust": "Clean corporate blue and white theme, high clarity, trustworthy and stable business presentation.",
    "Cyberpunk / Neon": "Futuristic dark mode, glowing purple and blue neon lines, high-tech digital grid elements.",
    "Minimalistic": "Bold massive typography, extreme white space, ultra-minimalist focus on a single core message.",
    "High Energy": "Dynamic camera angles, action-oriented visuals, vibrant speed lines, high-impact motion feel."
};

interface CreativeBrief {
    strategicCopy: {
        headline: string;
        subheadline: string;
        cta: string;
    };
    identityStrategy: {
        weight: 'Primary' | 'Secondary' | 'Hidden' | 'Footnote';
        reasoning: string;
        placementRecommendation: string;
        styling: string;
    };
    industryLogic: {
        categoryBadgeText: string;
        forbiddenKeywords: string[];
    };
    visualDirection: string;
}

/**
 * PHASE 1: THE AD-INTELLIGENCE ENGINE
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `You are a Senior CMO and Lead Design Strategist.
    Develop a high-conversion creative strategy for the ${inputs.industry} product: "${inputs.productName || 'Unnamed Asset'}".
    Intent Context: "${inputs.description || 'N/A'}"

    *** THE "AIDA" STRATEGIC MANDATE ***
    1. **RESEARCH**: Identify high-performing ad copy hooks for ${inputs.industry} in 2025.
    2. **AIDA SYNTHESIS**:
       - **ATTENTION (Headline)**: Create a benefit-led hook (2-5 words).
       - **INTEREST (Subheadline)**: Elaborate on the unique value proposition.
       - **ACTION (CTA)**: Generate a high-intent button label.

    RETURN JSON:
    {
        "strategicCopy": { "headline": "string", "subheadline": "string", "cta": "string" },
        "identityStrategy": { "weight": "string", "reasoning": "string", "placementRecommendation": "string", "styling": "string" },
        "industryLogic": { "categoryBadgeText": "string", "forbiddenKeywords": ["string"] },
        "visualDirection": "string"
    }`;

    const parts: any[] = lowResAssets.map((asset) => ({ text: `PRODUCT SOURCE:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { 
            strategicCopy: { headline: "Defined by Excellence", subheadline: "The new standard in professional quality.", cta: "Shop Collection" }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Standard hierarchy', placementRecommendation: 'Top Left', styling: 'Bold Modern' },
            industryLogic: { categoryBadgeText: 'Premium Grade', forbiddenKeywords: [] },
            visualDirection: "Clean commercial studio aesthetics." 
        };
    }
};

/**
 * --- PHASE 2: THE PRODUCTION ENGINE ---
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    let vaultAssets: { data: string, mimeType: string }[] = [];
    let vaultDna = "";
    try {
        const [refs, conf] = await Promise.all([
            getVaultImages('brand_stylist', inputs.industry),
            getVaultFolderConfig('brand_stylist', inputs.industry)
        ]);
        if (conf) vaultDna = conf.dna;
        const selectedRefs = refs.slice(0, 3);
        vaultAssets = await Promise.all(selectedRefs.map(async (r) => {
            const res = await urlToBase64(r.imageUrl);
            return { data: res.base64, mimeType: res.mimeType };
        }));
    } catch (e) { console.warn("Vault retrieval failed", e); }

    const [brief, optimizedMains, optLogo, optModel, optRef] = await Promise.all([
        performAdIntelligence(inputs, brand),
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    if (vaultAssets.length > 0) {
        vaultAssets.forEach((v, i) => {
            parts.push({ text: `VAULT LIGHTING REFERENCE ${i+1}:` }, { inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "SUBJECT DIGITAL TWIN (SACRED):" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    const blueprintInstruction = LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus'] || LAYOUT_BLUEPRINTS['Hero Focus'];

    const subjectIdentityLock = optModel ? `
    *** SUBJECT IDENTITY LOCK (DIGITAL TWIN PROTOCOL) ***
    1. **FORENSIC REPLICA**: You are FORBIDDEN from altering the subject's facial structure, hair, age, or ethnicity. The person in the ad must be a 1:1 pixel replica of the 'SUBJECT DIGITAL TWIN'.
    2. **NATURAL INTERACTION**: The subject MUST be realistically interacting with the 'SACRED PRODUCT ASSETS' (e.g. holding them, wearing them, using them).
    3. **LIGHTING HARMONIZATION**: Synchronize the lighting on the subject with the 'SACRED PRODUCT ASSET' lighting and the global environment.
    ` : "";

    const modelParamsPrompt = inputs.modelSource === 'ai' && inputs.modelParams ? `
    *** AI HUMAN MODEL SPECS ***
    Render a photorealistic model: ${inputs.modelParams.modelType} from ${inputs.modelParams.region}, ${inputs.modelParams.skinTone}, ${inputs.modelParams.bodyType}.
    Composition: ${inputs.modelParams.composition}, Framing: ${inputs.modelParams.framing}.
    The model MUST be holding or using the SACRED PRODUCT ASSETS.
    ` : "";

    const prompt = `You are a World-Class Ad Production Engine.
    
    *** THE OPTICAL RIG ***
    ${vaultDna ? `STRICT LIGHTING PROTOCOL: ${vaultDna}` : 'Use professional high-end softbox lighting rigs.'}
    ${optRef ? `**STYLE MATCH**: Mimic the atmosphere and layout logic of the Style Reference Image.` : `**VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional"}.`}

    *** IDENTITY LOCK 3.0 (SACRED ASSET PROTOCOL) ***
    1. **GEOMETRY**: Do NOT alter the physical shape or proportions of the product.
    2. **TYPOGRAPHY**: Preserve all labels and text from the "SACRED PRODUCT ASSET" pixels perfectly.
    3. **LOGOS**: Use 1:1 pixel transfers for the BRAND LOGO. 

    ${subjectIdentityLock}
    ${modelParamsPrompt}

    *** FORENSIC PHYSICS MANDATES ***
    1. **RAY-TRACED CONTACT SHADOWS**: Ensure dark, sharp shadows where the product or subject touches any surface.
    2. **LIGHT HARMONIZATION**: Unified light source for both product and subject context.

    *** CREATIVE BRIEF ***
    - Industry: ${inputs.industry.toUpperCase()}
    - Layout: ${blueprintInstruction}
    - Art Direction: ${brief.visualDirection}

    *** TYPOGRAPHY & COPY (AIDA) ***
    1. **HEADLINE**: Render "${brief.strategicCopy.headline}" using ${brand?.fonts.heading || 'Modern Sans'}.
    2. **SUBHEADLINE**: Render "${brief.strategicCopy.subheadline}".
    3. **ACTION**: High-contrast CTA for "${brief.strategicCopy.cta}".
    
    OUTPUT: A single 8K photorealistic marketing asset.`;

    parts.push({ text: prompt });

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
        throw new Error("Ad Production engine failed to render.");
    } catch (e) { throw e; }
};

export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    const prompt = `You are a Precision Ad Editor. Modify the provided image based on this specific user feedback: "${instruction}".
    1. **Preservation**: Keep the core product and environment 95% identical.
    2. **Refinement**: Only modify the specific areas mentioned in the feedback.
    OUTPUT: A single 4K photorealistic refined image.`;

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