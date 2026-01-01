
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

const LAYOUT_BLUEPRINTS: Record<string, string> = {
    'Hero Focus': "SPATIAL GRID: [Subject: Center-Weighted, Scale 70%] | [Headline: Upper 15%, Center-Align] | [CTA: Bottom 10%, Floating]. Rule: Maximum focal impact on the product.",
    'Split Design': "SPATIAL GRID: [Subject: Left 50% Horizontal Column] | [Text/Copy Stack: Right 50% Horizontal Column]. Rule: Hard vertical axis split for clean informational hierarchy.",
    'Bottom Strip': "SPATIAL GRID: [Subject: Upper 80% Canvas] | [Information Strip: Bottom 20% with semi-transparent backdrop]. Rule: Cinematic focus with a grounded info footer.",
    'Social Proof': "SPATIAL GRID: [Subject: Center-Right] | [Review Bubble/Badge: Bottom-Left Overlay]. Rule: Offset subject to create space for secondary trust markers.",
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
 * PHASE 1: THE AD-INTELLIGENCE ENGINE (PRO UPGRADE)
 * Upgraded to Gemini 3 Pro for deep market research and psychological copywriting.
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `You are a World-Class Chief Marketing Officer and Creative Director. 
    Analyze this ${inputs.industry} product: "${inputs.productName || 'N/A'}"
    Context provided: "${inputs.description || 'N/A'}"
    Product Specs/USPs: "${inputs.productSpecs || 'N/A'}"
    
    *** STEP 1: DEEP MARKET RESEARCH (GOOGLE SEARCH) ***
    1. Search for "2025 high-performing ad benchmarks for ${inputs.industry} ${inputs.productName}".
    2. Identify the top 3 "Winning Hooks" and "Consumer Pain Points" currently trending for this specific product niche on Meta and LinkedIn.
    3. Analyze competitor visual strategies to find an "Unoccupied Aesthetic Space".

    *** STEP 2: COPYWRITING REFINEMENT (AIDA FRAMEWORK) ***
    Apply the AIDA (Attention, Interest, Desire, Action) model to draft elite ad lines.
    
    1. **HEADLINE (Attention)**: 
       - MUST be a scroll-stopping "Hook" (2-6 words).
       - FORBIDDEN: Do not use the Product Name as the Headline.
       - RULE: Use curiosity gaps, authoritative claims, or emotional triggers.
       - Example: Instead of "Organic Coffee", use "The 6:00 AM ritual for high-performers."

    2. **SUB-HEADLINE (Desire)**: 
       - Translate the "Product Specs" into "Human Benefits".
       - Example: Instead of "10-hour battery", use "Uninterrupted focus from morning to night."

    3. **CTA (Action)**:
       - A directive, low-friction command.

    *** STEP 3: IDENTITY STRATEGY ***
    Determine the 'identityWeight' for the product name text overlay:
    - **Hidden**: If name is large/clear on the physical product pixels.
    - **Footnote**: Small reinforcement in a corner.
    - **Secondary**: Supporting anchor if product is raw/unbranded.
    
    RETURN JSON ONLY:
    {
        "strategicCopy": { 
            "headline": "Researched, high-conversion hook", 
            "subheadline": "Benefit-driven supporting text", 
            "cta": "Action command" 
        },
        "identityStrategy": {
            "weight": "Primary | Secondary | Hidden | Footnote",
            "reasoning": "Technical breakdown of the hook choice based on current trends",
            "placementRecommendation": "Optimal Zone Recommendation",
            "styling": "Typography weights/styles"
        },
        "industryLogic": {
            "categoryBadgeText": "Category appropriate trust claim",
            "forbiddenKeywords": ["Irrational industry buzzwords to avoid"]
        },
        "visualDirection": "Detailed art direction based on market trends"
    }`;

    const parts: any[] = lowResAssets.map((asset) => ({ text: `PRODUCT PIXELS:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Upgraded to PRO for complex marketing reasoning
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.warn("Pro Intelligence failed, falling back to Flash", e);
        return { 
            strategicCopy: { headline: "Experience Excellence", subheadline: inputs.description || "", cta: "Order Now" }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Fallback', placementRecommendation: 'Bottom Right', styling: 'Clean Sans' },
            industryLogic: { categoryBadgeText: 'Premium Quality', forbiddenKeywords: [] },
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
            parts.push({ text: `VAULT REFERENCE ${i+1} (MASTER AESTHETIC SOURCE):` }, { inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `USER PRODUCT ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "USER LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    
    if (optModel) {
        parts.push({ text: "USER MODEL:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    const blueprintInstruction = LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus'] || LAYOUT_BLUEPRINTS['Hero Focus'];

    const vaultProtocol = vaultDna ? `
    *** SIGNATURE INDUSTRY PROTOCOL (VAULT DNA - HIGH PRIORITY) ***
    - **MANDATORY RULES**: ${vaultDna}
    - **AESTHETIC DOMINANCE**: The resulting ad MUST perfectly mirror the lighting, material physics, and atmospheric quality of the VAULT REFERENCE images.
    ` : "";

    let styleInstructions = "";
    if (optRef) {
        styleInstructions = `
        *** HYBRID PRODUCTION PROTOCOL (MANDATORY) ***
        1. **GEOMETRIC SOURCE**: Follow the strict spatial coordinates of: ${blueprintInstruction}
        2. **AESTHETIC SOURCE**: Use the attached USER STYLE REFERENCE for lighting, color grading, and environmental texture ONLY. 
        3. **RULE**: Spatial Template (Geometry) OVERRIDES Reference Image (Layout).`;
        parts.push({ text: "USER STYLE REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
    } else {
        const vibeDesc = VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic.";
        styleInstructions = `
        *** PRODUCTION PROTOCOL ***
        - **LAYOUT**: ${blueprintInstruction}
        - **VIBE**: ${vibeDesc} (Research-backed Visual Direction: ${brief.visualDirection})`;
    }

    const finalPrompt = `You are a High-Precision Ad Production Engine. 
    
    ${vaultProtocol}

    *** VISUAL HIERARCHY (STRICT) ***
    1. **LEVEL 1 (TITLE)**: Render the Headline: "${brief.strategicCopy.headline}" as the primary focal text. 
       - **FORBIDDEN**: Do NOT use "${inputs.productName}" as the title.
    2. **LEVEL 2 (PRODUCT)**: The USER PRODUCT photo must be the central visual hero.
    3. **LEVEL 3 (IDENTITY)**: The Product Name "${inputs.productName}" is SECONDARY. 
       - **STRATEGY**: ${brief.identityStrategy.weight === 'Hidden' ? 'DO NOT overlay the name as text.' : `Apply as ${brief.identityStrategy.weight}: ${brief.identityStrategy.placementRecommendation}.`}
    4. **LEVEL 4 (ACTION)**: Render the CTA "${brief.strategicCopy.cta}" as a professional button.

    *** THE CONTEXTUAL FIREWALL ***
    - Category: ${inputs.industry.toUpperCase()}
    - ${styleInstructions}

    FINAL OUTPUT: A single, magazine-quality 4K ad image. 
    Ray-traced lighting, perfect product integration, and premium typography.`;

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
