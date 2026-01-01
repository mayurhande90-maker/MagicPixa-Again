
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
 * PHASE 1: THE AD-INTELLIGENCE ENGINE with Forensic Visual Audit
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `You are a Senior Creative Strategist and Global Branding Expert. 
    Analyze this ${inputs.industry} product and the requested product name: "${inputs.productName || 'N/A'}".
    
    **TASK 1: FORENSIC REDUNDANCY AUDIT**
    Examine the product pixels. Is the brand name or a recognizable logo already clearly legible on the physical packaging (e.g., label, embroidery, engraving)? 
    If YES, we MUST avoid duplicate branding.
    
    **TASK 2: SMART IDENTITY WEIGHT**
    Assign the 'identityWeight' for the text overlay of the product name:
    - **Hidden**: If the name is already a dominant visual on the physical product. Do not add it as text.
    - **Footnote**: If the name is on the product but small, or if the vibe is "Luxury/Elegant". The overlay should be a tiny, elegant "Quiet Zone" anchor.
    - **Secondary**: If the product is raw/unbranded. The name should support the headline but not fight it.
    - **Primary**: ONLY if the product name IS the headline (rare in pro ads).

    **TASK 3: MARKET TIER HIERARCHY**
    - For Luxury: Wide tracking, small font, serif.
    - For Retail/Sale: Paired with the price/badge as a single info-unit.
    - For SaaS/Tech: Clean Breadcrumb style near the logo.

    RETURN JSON ONLY:
    {
        "strategicCopy": { "headline": "STRING", "subheadline": "STRING", "cta": "STRING" },
        "identityStrategy": {
            "weight": "Primary | Secondary | Hidden | Footnote",
            "reasoning": "Forensic explanation of logo detection on packaging",
            "placementRecommendation": "Placement Zone (e.g., 'Bottom-right quiet zone', 'Top-left breadcrumb')",
            "styling": "Styling rule (e.g., 'Small Serif with 200 tracking', 'Paired with Offer Badge')"
        },
        "industryLogic": {
            "categoryBadgeText": "Category appropriate trust claim",
            "forbiddenKeywords": ["tested on animals", "industrial", "cheap"]
        },
        "visualDirection": "Technical notes"
    }`;

    const parts: any[] = lowResAssets.map((asset, i) => ({ text: `PRODUCT IMAGE:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
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
        return { 
            strategicCopy: { headline: inputs.productName || "Premium Quality", subheadline: inputs.description || "", cta: "Order Now" }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Default', placementRecommendation: 'Bottom Right', styling: 'Clean Sans' },
            industryLogic: { categoryBadgeText: 'Quality Assured', forbiddenKeywords: [] },
            visualDirection: "Professional commercial lighting." 
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
    } catch (e) { console.warn("AdMaker Vault fetch failed", e); }

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
            parts.push({ text: `VAULT REFERENCE ${i+1} (LAYOUT SOURCE):` }, { inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `USER PRODUCT ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "USER LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    
    if (optModel) {
        parts.push({ text: "USER MODEL:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    let styleInstructions = "";
    if (optRef) {
        styleInstructions = `*** USER-PROVIDED STYLE REFERENCE ***\nCopy the specific layout, lighting, and aesthetic of the attached USER REFERENCE image with 90% fidelity.`;
        parts.push({ text: "USER STYLE REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
    } else {
        const vibeDesc = VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic.";
        styleInstructions = `*** THE DESIGN VIBE: ${inputs.vibe} ***\n${vibeDesc}`;
    }

    const finalPrompt = `You are a High-Precision Ad Production Engine.
    
    *** THE CONTEXTUAL FIREWALL (CRITICAL) ***
    1. **SEMANTIC PURGE**: DO NOT copy any text, icons, or badges from the VAULT REFERENCES. They are from different products.
    2. **CATEGORY SYNC**: User industry is ${inputs.industry.toUpperCase()}. 
       - DO NOT use claims like "Not tested on animals" if the product is food.
       - FORBIDDEN KEYWORDS: ${brief.industryLogic.forbiddenKeywords.join(', ')}.

    *** SMART IDENTITY PROTOCOL (THE 3% RULE) ***
    Based on our forensic audit, the Product Name "${inputs.productName}" is assigned weight: **${brief.identityStrategy.weight}**.
    - **STRATEGY**: ${brief.identityStrategy.reasoning}. 
    - **PLACEMENT**: ${brief.identityStrategy.placementRecommendation}. Apply 'Negative Space Anchor' logic: place utility text on the opposite visual axis to the product's center of mass.
    - **STYLING**: ${brief.identityStrategy.styling}. 
    - **CONSTRAINT**: Ensure all utility text (Name, Website, Address) occupies less than 3% of the total canvas area.
    - **INTEGRATION**: Use 'Perspective Matching' for lifestyle shots—if the name is used, render it as if it's physically embossed or printed on a surface in the environment (e.g., a table, wall, or tag).

    *** PRODUCTION BRIEF ***
    - **Identity Lock**: Do NOT modify user product pixels.
    - **Copy Hierarchy**: 
        - **HERO**: Headline: "${brief.strategicCopy.headline}". This must be the loudest text element.
        - **SUB**: Subheadline: "${brief.strategicCopy.subheadline}".
        - **UTILITY**: Product Name (apply based on weight), Website: "${inputs.website || ''}", Location: "${inputs.location || ''}".
        - **ACTION**: CTA Button: "${brief.strategicCopy.cta}".
    
    FINAL OUTPUT: A single, finished, magazine-quality 4K ad image.`;

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
        throw new Error("Ad Production engine failed.");
    } catch (e) { throw e; }
};

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
    2. **Transformation**: Apply the user's specific requested change.
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
