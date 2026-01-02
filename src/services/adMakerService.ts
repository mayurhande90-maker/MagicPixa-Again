import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

const IDENTITY_LOCK_MANDATE = `
*** IDENTITY LOCK v3 (SACRED ASSET PROTOCOL) ***
1. **PIXEL INTEGRITY**: The product/subject in the source image is a 'Sacred Asset'. You must preserve its exact geometry, silhouette, and proportions.
2. **LABEL CLARITY**: All text, logos, and labels on the product must remain 100% legible and unaltered. Do NOT smudge existing branding.
3. **MATERIAL FIDELITY**: Preserve the surface finish (matte/glossy) from the source asset.
MANDATE: The product must look like the EXACT physical object from the upload, seamlessly integrated into a new high-conversion design.
`;

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
    project?: string;
    location?: string;
    config?: string;
    features?: string[];
    dishName?: string;
    restaurant?: string;
    headline?: string;
    subheadline?: string;
    cta?: string;
    occasion?: string;
    audience?: string;
    layoutTemplate?: string;
    visualFocus?: 'product' | 'lifestyle' | 'conceptual' | null;
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
    'The Trio': "SPATIAL GRID: [Main Hero: Center, Scale 100%] | [Variant 1: Lower Left, Scale 40%] | [Variant 2: Lower Right, Scale 40%]. Rule: Depth-based hierarchy for product ranges.",
    'Range Lineup': "SPATIAL GRID: [3 Items: Arranged side-by-side on a horizontal shelf plane]. Rule: Perfect symmetrical alignment for collections.",
    'Hero & Variants': "SPATIAL GRID: [Hero Item: Front & Center] | [2 Supporting Items: Blurred in the shadow background]. Rule: Dynamic bokeh-based product storytelling."
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
    
    *** STEP 1: MARKET-INTELLIGENCE GROUNDING (GOOGLE SEARCH) ***
    1. Search for "2025 Creative Ad Benchmarks for ${inputs.industry}".
    2. Research trending "Emotional Hooks" for ${inputs.productName}.

    *** STEP 2: AIDA COPYWRITING PROTOCOL ***
    Craft ad copy that follows the Attention-Interest-Desire-Action framework.
    
    RETURN JSON ONLY:
    {
        "strategicCopy": { 
            "headline": "AIDA hook", 
            "subheadline": "Benefit-driven desire builder", 
            "cta": "Conversion action" 
        },
        "identityStrategy": {
            "weight": "Primary | Secondary | Hidden | Footnote",
            "reasoning": "Strategy note",
            "placementRecommendation": "Placement note",
            "styling": "Typography style"
        },
        "industryLogic": {
            "categoryBadgeText": "Tagline",
            "forbiddenKeywords": []
        },
        "visualDirection": "Art direction notes"
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
            strategicCopy: { headline: "Defined by Excellence", subheadline: inputs.description || "The new standard in performance.", cta: "Shop Collection" }, 
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
            parts.push({ text: `VAULT REFERENCE ${i+1}:` }, { inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "TARGET MODEL:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    const blueprintInstruction = LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus'] || LAYOUT_BLUEPRINTS['Hero Focus'];

    const prompt = `You are a World-Class Ad Production Engine.
    
    ${IDENTITY_LOCK_MANDATE}

    *** DESIGN-OPTICS BLOCK ***
    1. **Z-AXIS DEPTH**: Place text elements in a distinct Z-layer. If text is behind the product, apply slight blur to text.
    2. **GLOBAL ILLUMINATION**: Calculate bounce light between environment and product surface.
    3. **SHADOW ANCHORING**: The product MUST have a realistic contact shadow (ambient occlusion).

    *** VISUAL BRIEF ***
    - Industry: ${inputs.industry.toUpperCase()}
    - Layout: ${blueprintInstruction}
    - AI-Researched Direction: ${brief.visualDirection}
    ${optRef ? `**REFERENCE STYLE**: Match lighting and atmosphere of the provided Style Reference.` : `**VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional"}.`}

    *** COPYWRITING EXECUTION (AIDA) ***
    1. **HEADLINE**: Render "${brief.strategicCopy.headline}" in the ${brief.identityStrategy.placementRecommendation}.
    2. **SUBHEADLINE**: Render "${brief.strategicCopy.subheadline}" as supporting text.
    3. **CTA**: Render high-conversion button for "${brief.strategicCopy.cta}".

    OUTPUT: A single 8K masterpiece ad. Pristine pixels, agency-grade composition.`;

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

    const prompt = `You are a Precision Ad Editor. Modify providing image based on: "${instruction}". 
    ${IDENTITY_LOCK_MANDATE}
    Maintain commercial quality and existing vibe.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: optResult.data, mimeType: optResult.mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    } catch (e) { throw e; }
};