
import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, urlToBase64, applyWatermark } from "../utils/imageUtils";
import { BrandKit } from "../types";

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    vibe?: string;
    productName?: string;
    website?: string;
    contactNumber?: string;
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
    customTitle?: string;
    ctaButton?: string;
    customCta?: string;
}

const LAYOUT_BLUEPRINTS: Record<string, string> = {
    'Hero Focus': "The product is the undisputed hero, placed front and center with a powerful presence. The headline floats elegantly in the upper third, while the CTA is grounded at the bottom. This layout maximizes focal impact and product desire.",
    'Split Design': "A sophisticated vertical split. One side (left or right depending on visual balance) is dedicated to a clean, high-fidelity product showcase, while the other side houses a structured stack of headline, subheadline, and CTA. Perfect for clear informational hierarchy.",
    'Bottom Strip': "A cinematic wide-angle approach. The product dominates the upper 80% of the frame in a lifestyle or studio setting. A semi-transparent information strip at the bottom elegantly contains the brand identity and CTA.",
    'Social Proof': "An organic, trust-focused composition. The product is offset to one side, leaving room for a floating 'Review Bubble' or 'Trust Badge' in the opposite corner. This creates a balanced, relatable narrative.",
    'Magazine Cover': "High-prestige editorial style. The product is large and centered, often slightly overlapping bold, stylized background typography. The headline is massive and integrated into the scene like a luxury fashion cover.",
    'Minimalist Zen': "Extreme boutique minimalism. The product is small and placed in a corner (e.g., bottom-right), surrounded by 70% intentional white space. The headline is a tiny, elegant serif in the opposite corner. Maximum breathing room.",
    'Feature Callout': "A technical, educational layout. The product is centered at a 60% scale, with thin, elegant 'pointer lines' radiating from key features to small, sharp text labels. Ideal for highlighting innovation.",
    'Action Dynamic': "High-energy urgency. The product is tilted at a dynamic angle (e.g., 15 degrees) with subtle motion blur. The headline is bold, italicized, and placed aggressively to create a sense of speed and excitement.",
    'Contrast Grid': "A powerful 'Before & After' or 'Problem & Solution' split. The canvas is divided 50/50, showing the challenge on one side and the product as the hero solution on the other. Immediate visual proof.",
    'The Trio': "A depth-based collection showcase. One main hero item is front and center, with two supporting variants placed slightly behind and to the sides at a smaller scale, creating a rich product family narrative.",
    'Range Lineup': "Perfect symmetrical alignment. Three or more products are arranged side-by-side on a clean horizontal plane (like a premium shelf), showcasing the full variety of the collection.",
    'Hero & Variants': "Dynamic bokeh-based storytelling. The hero item is in sharp focus in the foreground, while supporting items or ingredients are blurred artistically in the shallow background to add context and depth."
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
    trendAnalysis: {
        colorPalette: string;
        lightingMood: string;
        compositionalStyle: string;
    };
    harmonizedLayout: string;
}

/**
 * PHASE 1: THE AD-INTELLIGENCE ENGINE (CMO + RESEARCHER)
 * LOGIC UPGRADE: Consolidated Research & Visual Audit
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `Act as a world-class CMO and Lead Strategy Director at a top-tier creative agency. 
    Develop a high-conversion creative brief for the product shown in the 'ASSET FOR AUDIT'.
    
    *** CONTEXTUAL TREND-MAPPING (SACRED PROTOCOL) ***
    1. **AD CONTEXT AS ANCHOR**: Use the user's description ("${inputs.description || 'N/A'}") and specs ("${inputs.productSpecs || 'N/A'}") as conceptual anchors, NOT as a script.
    2. **DEEP SEARCH**: Perform a targeted Google Search for the EXACT product niche. Search for: "Viral marketing hooks for [Product Type] 2026", "High-prestige ad headlines for [Product Context]", and "Current visual trends in [Industry]".
    3. **REFERENCE, DON'T REPEAT**: Strictly FORBIDDEN to use the exact text provided in the description or specs. Instead, take the reference and synthesize own trendy, high-impact AI marketing lines.
    4. **EMOTIONAL RESONANCE**: Identify the dominant "Emotional Hook" (e.g., Status, Freedom, Security, Joy) currently trending for this specific context.
    
    *** VISUAL AUDIT (MANDATORY) ***
    1. Scan the 'ASSET FOR AUDIT' with extreme precision. Identify the exact product, its color, material, and brand (if visible).
    2. DO NOT rely solely on the provided productName: "${inputs.productName || 'N/A'}". 
    
    *** BLUEPRINT HARMONY (CRITICAL) ***
    User Selected Layout: "${inputs.layoutTemplate || 'Hero Focus'}"
    Selected Aspect Ratio: "${inputs.aspectRatio || '1:1'}"
    Blueprint Narrative: "${LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus']}"
    
    Your Task: Harmonize the user's selected layout with the March 2026 trends you discovered. 
    Adjust the layout narrative to be "Aspect-Aware". For example, if the ratio is 9:16, ensure the layout uses the vertical space effectively for the product and copy.
    
    *** HIGH-CONVERSION COPYWRITING PROTOCOL ***
    1. **NO CORPORATE FILLERS**: Strictly FORBIDDEN to use generic lines like "Ready for launch", "Defined by Excellence", etc.
    2. **ANTI-LITERAL RULE**: Strictly FORBIDDEN to include the industry name ("${inputs.industry}") or category in the headline. 
    3. **ABSTRACT HOOKS**: Generate high-impact, punchy, and modern marketing headlines. Focus on the "Vibe" and "Benefit" discovered during your search. (e.g., instead of "Best Coffee", use "The Morning Ritual").
    4. **SPECIFICITY & HOOKS**: Headline (2-5 words) must be directly linked to the VISUAL identity of the product and the TRENDS discovered.
    ${inputs.customTitle ? `5. **USER OVERRIDE**: The user has provided a custom title: "${inputs.customTitle}". USE THIS EXACT TITLE as the headline. Do not generate a new one.` : ""}
    
    RETURN JSON ONLY:
    {
        "strategicCopy": { "headline": "string", "subheadline": "string", "cta": "string" },
        "identityStrategy": { "weight": "Primary | Secondary", "reasoning": "string", "placementRecommendation": "string", "styling": "string" },
        "industryLogic": { "categoryBadgeText": "string", "forbiddenKeywords": ["string"] },
        "visualDirection": "string",
        "trendAnalysis": { "colorPalette": "string", "lightingMood": "string", "compositionalStyle": "string" },
        "harmonizedLayout": "string (A detailed, aspect-aware narrative instruction for the visual production engine)"
    }`;

    const parts: any[] = lowResAssets.map((asset) => ({ text: `ASSET FOR AUDIT:`, inlineData: { data: asset.data, mimeType: asset.mimeType } }));
    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview', 
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json"
            },
            featureName: 'Ad Intelligence Analysis'
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        const industryLabel = inputs.industry.charAt(0).toUpperCase() + inputs.industry.slice(1);
        return { 
            strategicCopy: { headline: inputs.productName ? `${inputs.productName} | The New Standard` : `${industryLabel} Innovation`, subheadline: `Experience the next generation of ${inputs.industry} design.`, cta: "Discover More" }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Standard hierarchy', placementRecommendation: 'Top Left', styling: 'Bold Modern' },
            industryLogic: { categoryBadgeText: 'Premium Grade', forbiddenKeywords: [] },
            visualDirection: "Clean commercial studio aesthetics.",
            trendAnalysis: { colorPalette: "Modern & Balanced", lightingMood: "Professional Studio", compositionalStyle: "Hero Focus" },
            harmonizedLayout: LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus']
        };
    }
};

/**
 * PHASE 2: THE PRODUCTION ENGINE (Art Director + Visualizer)
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null, userPlan?: string): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Departmental Engines (Strategy + Prep)
    const [brief, optimizedMains, optLogo, optModel, optRef] = await Promise.all([
        performAdIntelligence(inputs, brand),
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1024) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    // Add Primary Product Assets
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "SUBJECT DIGITAL TWIN (SACRED):" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    const blueprintInstruction = LAYOUT_BLUEPRINTS[inputs.layoutTemplate || 'Hero Focus'] || LAYOUT_BLUEPRINTS['Hero Focus'];

    const prompt = `You are an Elite Graphic Designer and World-Class Ad Production Engine. Execute the following high-fidelity render following Swiss Design and International Typographic Style:
    
    *** PRODUCTION BLUEPRINT (MARCH 2026 TRENDS) ***
    - **COLOR PALETTE**: ${brief.trendAnalysis.colorPalette}
    - **LIGHTING MOOD**: ${brief.trendAnalysis.lightingMood}
    - **COMPOSITIONAL STYLE**: ${brief.trendAnalysis.compositionalStyle}
    - **VISUAL DIRECTION**: ${brief.visualDirection}
    - **HARMONIZED LAYOUT**: ${brief.harmonizedLayout}
    
    *** SWISS DESIGN ARCHITECTURE (MANDATORY) ***
    1. **MASSIVE SCALE CONTRAST**: The Headline must be at least 4x larger than the subheadline. Use bold, high-impact Grotesk Sans typography.
    2. **NEGATIVE SPACE MANDATE**: Ensure at least 20% "breathing room" around every text element. No clutter.
    3. **GRID ALIGNMENT**: Align all text elements to a strict invisible grid.
    
    *** IDENTITY ANCHOR v8.0 (SACRED ASSET PROTOCOL) ***
    1. **PRODUCT INTEGRITY**: You are FORBIDDEN from altering the geometry, silhouette, or label typography of the 'SACRED PRODUCT ASSETS'. 
    2. **BRAND FIDELITY**: The 'BRAND LOGO' must be rendered with pixel-perfect precision. 
    ${optModel ? "3. **SUBJECT LOCK**: The person in the ad must be a 1:1 biometric replica of the 'SUBJECT DIGITAL TWIN'." : ""}
    ${inputs.modelSource === 'ai' ? `3. **TALENT SYNTHESIS**: Generate a ${inputs.modelParams?.modelType || 'Professional Model'} from ${inputs.modelParams?.region || 'Global'} with ${inputs.modelParams?.skinTone || 'Natural'} skin tone. Professional talent from a high-end agency.` : ""}

    *** PRODUCTION DIRECTIVES (ELITE QUALITY) ***
    - **LAYERED DEPTH**: Treat the ad as a 3D scene. Place the product with "Contact Shadows" and "Ambient Occlusion". 
    - **DEPTH CUES**: Integrate text with depth—some elements can float slightly behind foreground objects for a high-end editorial look.
    - **LIGHTING**: Apply "Ray-Traced Global Illumination". Ensure realistic light bounce between the product and the environment.
    - **BLENDING**: The product must look physically present in the scene, not "pasted".
    - **VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic."}
    - **LAYOUT**: ${blueprintInstruction}

    *** THE CREATIVE COPY (AIDA) ***
    1. **HEADLINE**: Render "${inputs.customTitle || brief.strategicCopy.headline}" using ${brand?.fonts.heading || 'Modern Sans'}.
    2. **SUBHEADLINE**: Render "${brief.strategicCopy.subheadline}".
    
    *** CALL TO ACTION (MANDATORY) ***
    ${(inputs.ctaButton || inputs.customCta) ? `1. **CTA BUTTON**: Create a high-contrast, professional button with the text: "${inputs.ctaButton === 'Custom' ? inputs.customCta : (inputs.ctaButton || brief.strategicCopy.cta)}".` : "1. **NO CTA BUTTON**: Do not render a CTA button."}
    ${inputs.website ? `2. **WEBSITE**: Render the website URL "${inputs.website}" elegantly near the bottom using a clean Monospace font.` : ""}
    ${inputs.contactNumber ? `3. **CONTACT**: Render the contact number "${inputs.contactNumber}" clearly.` : ""}
    
    OUTPUT: A single 2K photorealistic marketing masterpiece. Accuracy, typographic perfection, and trend-relevance are your primary KPIs.`;

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

export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    userPlan?: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    const prompt = `You are an Elite Ad Retoucher. Modify the provided ad based on feedback: "${instruction}".
    1. **Preservation**: Maintain 98% of the original product identity and branding.
    2. **Precision**: Only iterate on the requested areas.
    OUTPUT: A single 4K photorealistic refined image.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: optResult.data, mimeType: optResult.mimeType } },
                    { text: prompt }
                ]
            },
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
