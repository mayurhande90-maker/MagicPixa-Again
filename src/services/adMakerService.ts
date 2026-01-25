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
 * PHASE 1: THE AD-INTELLIGENCE ENGINE (CMO)
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `Act as a world-class CMO and Strategy Director. 
    Develop a high-conversion creative brief for this ${inputs.industry} asset: "${inputs.productName || 'Subject'}".
    Context: "${inputs.description || 'N/A'}"
    
    *** THE STRATEGIC MANDATE ***
    1. **MARKET RESEARCH**: Use Google Search to analyze 2025 consumer behavior and visual trends for the ${inputs.industry} industry in the user's specific context.
    2. **AIDA COPYWRITING**: 
       - **Attention**: Headline (2-5 words) that stops the scroll.
       - **Interest/Desire**: Subheadline that builds perceived value.
       - **Action**: High-intent CTA.
    3. **ART DIRECTION**: Plan a visual hierarchy that follows the "3% Design Rule" (Visual Focal Point, minimal cognitive load).
    
    RETURN JSON:
    {
        "strategicCopy": { "headline": "string", "subheadline": "string", "cta": "string" },
        "identityStrategy": { "weight": "Primary | Secondary", "reasoning": "string", "placementRecommendation": "string", "styling": "string" },
        "industryLogic": { "categoryBadgeText": "string", "forbiddenKeywords": ["string"] },
        "visualDirection": "string"
    }`;

    const parts: any[] = lowResAssets.map((asset) => ({ text: `ASSET FOR AUDIT:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
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
            strategicCopy: { headline: "Defined by Excellence", subheadline: "The new standard in premium quality.", cta: "Shop Collection" }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Standard hierarchy', placementRecommendation: 'Top Left', styling: 'Bold Modern' },
            industryLogic: { categoryBadgeText: 'Premium Grade', forbiddenKeywords: [] },
            visualDirection: "Clean commercial studio aesthetics." 
        };
    }
};

/**
 * PHASE 2: THE PRODUCTION ENGINE (Art Director + Visualizer)
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Visual DNA & Context Retrieval
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

    // 2. Departmental Engines (Strategy + Prep)
    const [brief, optimizedMains, optLogo, optModel, optRef] = await Promise.all([
        performAdIntelligence(inputs, brand),
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    // Add Vault References for Style Continuity
    if (vaultAssets.length > 0) {
        vaultAssets.forEach((v, i) => {
            parts.push({ text: `AGENCY LIGHTING REF ${i+1}:` }, { inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    // Add Primary Product Assets
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "SUBJECT DIGITAL TWIN (SACRED):" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    const blueprintInstruction = LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus'] || LAYOUT_BLUEPRINTS['Hero Focus'];

    const prompt = `You are a World-Class Ad Production Engine. Execute the following high-fidelity render:
    
    *** IDENTITY ANCHOR v5.0 (SACRED ASSET PROTOCOL) ***
    1. **PRODUCT INTEGRITY**: You are FORBIDDEN from altering the geometry, silhouette, or label typography of the 'SACRED PRODUCT ASSETS'. Every letter and logo must remain 100% sharp and identical to the source.
    2. **BRAND FIDELITY**: The 'BRAND LOGO' must be rendered with pixel-perfect precision. 
    ${optModel ? "3. **SUBJECT LOCK**: The person in the ad must be a 1:1 biometric replica of the 'SUBJECT DIGITAL TWIN'. No changing age, ethnicity, or facial structure." : ""}

    *** PRODUCTION DIRECTIVES ***
    - **LIGHTING**: ${vaultDna ? `Adhere to this rigorous lighting protocol: ${vaultDna}` : 'Apply multi-point professional studio lighting.'}
    - **BLENDING**: Apply "Ray-Traced Graphic Blending". Ensure realistic contact shadows and global illumination bounce between the subject and the environment.
    - **VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic."}
    - **LAYOUT**: ${blueprintInstruction}

    *** THE CREATIVE COPY (AIDA) ***
    1. **HEADLINE**: Render "${brief.strategicCopy.headline}" using ${brand?.fonts.heading || 'Modern Sans'}.
    2. **SUBHEADLINE**: Render "${brief.strategicCopy.subheadline}".
    3. **CTA**: Add a high-contrast button for "${brief.strategicCopy.cta}".
    
    OUTPUT: A single 8K photorealistic marketing masterpiece. Accuracy is your primary KPI.`;

    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
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
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Ad Production engine failed. Ensure your source photos are clear.");
    } catch (e) { throw e; }
};

export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    const prompt = `You are an Elite Ad Retoucher. Modify the provided ad based on feedback: "${instruction}".
    1. **Preservation**: Maintain 98% of the original product identity and branding.
    2. **Precision**: Only iterate on the requested areas.
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
            config: { responseModalities: [Modality.IMAGE] },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement engine failed.");
    } catch (e) { throw e; }
};
