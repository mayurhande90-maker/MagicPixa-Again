
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
    'Hero Focus': "The product is the undisputed hero, placed front and center. INSTAGRAM SAFE ZONE: Keep the top 15% and bottom 15% clear of text. The headline floats elegantly in the upper third safe-zone. PHYSICS: Ensure the product has a soft contact shadow on the surface.",
    'Split Design': "A sophisticated vertical split. One side is dedicated to a clean product showcase, while the other houses the headline. INSTAGRAM SAFE ZONE: Ensure text is vertically centered to avoid platform overlays. DESIGN: Use a strict 50/50 split with a 1px divider line.",
    'Bottom Strip': "A cinematic wide-angle approach. The product dominates the upper frame. INSTAGRAM SAFE ZONE: The semi-transparent information strip must be placed exactly above the bottom 15% UI area. PHYSICS: Use high-angle lighting to create long, dramatic shadows.",
    'Social Proof': "An organic, trust-focused composition. The product is offset to one side. SAFE ZONE: Place the 'Review Bubble' in the upper safe-zone corner. DESIGN: Use a handwritten-style font for the review text to contrast with the brand typography.",
    'Magazine Cover': "High-prestige editorial style. The product is large and centered. SAFE ZONE: Massive typography must be integrated into the middle 70% of the canvas to avoid UI cropping. DESIGN: Text should partially overlap the product for depth.",
    'Minimalist Zen': "Extreme boutique minimalism. The product is small and placed in a corner. SAFE ZONE: The headline is a tiny, elegant serif in the opposite safe-zone corner. DESIGN: Use 80% negative space.",
    'Feature Callout': "A technical, educational layout. The product is centered at a 60% scale. SAFE ZONE: Pointer lines and text must stay within the central 70% area. DRAFTING: Use 1px sharp vector lines with circular anchor points to point at product features.",
    'Action Dynamic': "High-energy urgency. The product is tilted at a dynamic angle. SAFE ZONE: Bold italicized headline must be placed aggressively but within safe boundaries. PHYSICS: Add motion blur to the background to emphasize speed.",
    'Contrast Grid': "A powerful 'Before & After' split. The canvas is divided 50/50. SAFE ZONE: Maintain vertical symmetry within the platform safe zones. DESIGN: Use high-contrast color grading between the two halves.",
    'The Trio': "A depth-based collection showcase. One main hero item is front and center. SAFE ZONE: Keep the top and bottom clear for Instagram engagement buttons. PHYSICS: Use shallow depth-of-field (bokeh) for the background items.",
    'Range Lineup': "Perfect symmetrical alignment. Products are arranged side-by-side. SAFE ZONE: Ensure the lineup is centered horizontally and vertically. PHYSICS: Ensure identical lighting and shadow angles for all products.",
    'Hero & Variants': "Dynamic bokeh-based storytelling. Hero item in sharp focus. SAFE ZONE: Depth-based text must float in the middle safe-zone layer. PHYSICS: Use a 'Light Wrap' effect where the background glow bleeds into the product edges."
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
    "Luxury": "Luxury focus, premium aesthetic, minimal high-end composition, elegant lighting with deep soft shadows, expensive materials like marble or silk. Typography: Tracking-wide, Serif, elegant.",
    "Modern": "Modern tech aesthetic, Apple-style gradients, clean glass and metal surfaces, futuristic and professional. Typography: Bold, high-contrast Sans-Serif.",
    "Natural": "Eco-friendly focus, sunlight dapples, plants, wood and stone textures, soft earthy tones. Typography: Natural, organic, light weights.",
    "Moody": "Dramatic low-key lighting, moody shadows, neon blue or orange accents, high-end editorial feel. Typography: High-contrast, sharp.",
    "Bright": "High energy, clear real estate listing style, high exposure, informative and bright, white background. Typography: Clean, modern, approachable.",
    "Colorful": "High-energy, colorful, pop-art style, vibrant saturated colors, sharp contrast. Typography: Bold, playful.",
    "Studio": "Minimalist product listing, seamless grey or white background, perfect balanced studio softbox lighting. Typography: Minimalist, mid-weight Sans-Serif.",
    "Simple": "Extreme boutique minimalism, bold massive typography, extreme white space, ultra-minimalist focus. Typography: Elegant, light weights."
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
    detectedFinish: 'Glossy' | 'Matte' | 'Metallic' | 'Glass' | 'Fabric';
    suggestedTone: 'Bold' | 'Luxury' | 'Witty' | 'Urgent';
    trendAnalysis: {
        colorPalette: string;
        lightingMood: string;
        compositionalStyle: string;
    };
    suggestedLayout: string;
}

/**
 * PHASE 0: THE TRENDY AI TITLE ENGINE
 * This engine generates viral, high-CTR ad headlines using the "Clickbait Success Formula".
 */
const generateTrendyAdTitle = async (productName: string, description: string, industry: string, tone: string = 'Viral'): Promise<string> => {
    const prompt = `You are a World-Class Ad Copywriter and Viral Growth Hacker.
    Your task is to write a 2-5 word "Trendy AI Title" (Curiosity Gap Headline) for a high-performance ad.
    
    *** BRAND DATA ***
    Product Name: "${productName}"
    Ad Context: "${description}"
    Industry: "${industry}"
    Marketing Tone: "${tone}"
    
    *** VIRAL GUIDELINES (CLICKBAIT SUCCESS FORMULA) ***
    1. **CURIOSITY GAP**: Create a headline that makes people stop scrolling. Use the "Curiosity Gap" technique.
    2. **BREVITY IS POWER**: Use 2 to 5 words maximum. No fluff.
    3. **TRENDY AI STYLE**: Focus on high-impact, trendy, and performance-oriented language.
    4. **EMOTIONAL HOOK**: Identify one dominant emotion (Curiosity, Surprise, Fear, Authority, or Contrast).
    5. **NO GENERIC BUZZWORDS**: Avoid "Elevate", "Unleash", "Ultimate", "Best".
    
    OUTPUT: Return ONLY the headline string. No quotes.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ text: prompt }] },
            featureName: 'Trendy Ad Title Engine'
        });
        return response.text?.trim().replace(/^["']|["']$/g, '') || "THE NEW STANDARD";
    } catch (e) {
        return "UNCOMPROMISING QUALITY";
    }
};

/**
 * PHASE 1: THE AD-INTELLIGENCE ENGINE (CMO + TREND RESEARCHER)
 * LOGIC UPGRADE: Consolidated Research & Viral Visual Audit
 */
const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    
    // 0. TRENDY AI TITLE ENGINE (INITIAL PASS)
    // We pass the product name and context to get a viral starting point.
    const initialHeadline = inputs.customTitle ? inputs.customTitle : await generateTrendyAdTitle(inputs.productName || '', inputs.description || '', inputs.industry || '', 'Viral');

    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 1).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `Act as a world-class CMO and Viral Trend Researcher. 
    Develop a high-conversion creative brief for the product shown in the 'ASSET FOR AUDIT'.
    
    *** PRODUCT DATA ***
    Product Name: "${inputs.productName || 'N/A'}"
    Ad Context: "${inputs.description || 'N/A'}"
    Industry: "${inputs.industry || 'N/A'}"
    Initial Trendy Headline: "${initialHeadline}"
    
    *** TREND RESEARCH TASK (MARCH 2026) ***
    1. Research high-performing viral ad trends for Industry: "${inputs.industry}" and Topic: "${inputs.description}".
    2. Identify the "Clickbait Success Formula" currently working for this niche.
    
    *** VISUAL AUDIT (MANDATORY) ***
    1. Scan the 'ASSET FOR AUDIT' with extreme precision. Identify the exact product, its color, material, and brand.
    2. Identify the 'detectedFinish': Is the product Glossy, Matte, Metallic, Glass, or Fabric?
    3. Suggest a 'suggestedTone': Based on the product and viral trends, which marketing tone fits best? (Bold, Luxury, Witty, or Urgent).
    
    *** HEADLINE REFINEMENT (THE VIRAL UPGRADE) ***
    1. Review the 'Initial Trendy Headline': "${initialHeadline}".
    2. If the initial headline is generic, REWRITE it to be a 2-5 word Curiosity Gap headline.
    3. Use the visual data from the audit to anchor the headline.
    
    *** LAYOUT INTELLIGENCE (CRITICAL) ***
    Number of Products: ${inputs.mainImages.length}
    Selected Aspect Ratio: "${inputs.aspectRatio || '1:1'}"
    Selected Vibe: "${inputs.vibe || 'Modern'}"
    
    Your Task: Determine the absolute best layout for this ad. 
    - The layout must be "Aspect-Aware" (e.g., vertical layouts for 9:16).
    
    RETURN JSON ONLY:
    {
        "strategicCopy": { "headline": "string (The final refined trendy headline)", "subheadline": "string", "cta": "string" },
        "identityStrategy": { "weight": "Primary | Secondary", "reasoning": "string", "placementRecommendation": "string", "styling": "string" },
        "industryLogic": { "categoryBadgeText": "string", "forbiddenKeywords": ["string"] },
        "visualDirection": "string",
        "detectedFinish": "Glossy | Matte | Metallic | Glass | Fabric",
        "suggestedTone": "Bold | Luxury | Witty | Urgent",
        "trendAnalysis": { "colorPalette": "string", "lightingMood": "string", "compositionalStyle": "string" },
        "suggestedLayout": "string (A detailed, aspect-aware narrative instruction for the visual production engine describing exactly where to place products and text)"
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
        return { 
            strategicCopy: { 
                headline: inputs.productName ? `${inputs.productName} | THE NEW STANDARD` : `UNCOMPROMISING QUALITY`, 
                subheadline: `Experience the next generation of precision design.`, 
                cta: "Discover More" 
            }, 
            identityStrategy: { weight: 'Secondary', reasoning: 'Standard hierarchy', placementRecommendation: 'Top Left', styling: 'Bold Modern' },
            industryLogic: { categoryBadgeText: 'Premium Grade', forbiddenKeywords: [inputs.industry] },
            visualDirection: "Clean commercial studio aesthetics.",
            detectedFinish: 'Matte',
            suggestedTone: 'Bold',
            trendAnalysis: { colorPalette: "Modern & Balanced", lightingMood: "Professional Studio", compositionalStyle: "Hero Focus" },
            suggestedLayout: "The product is the undisputed hero, placed front and center. INSTAGRAM SAFE ZONE: Keep the top 15% and bottom 15% clear of text. The headline floats elegantly in the upper third safe-zone. PHYSICS: Ensure the product has a soft contact shadow on the surface."
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

    const prompt = `Act as a Master Art Director and Elite CGI Artist. Your goal is to create a high-fidelity, professional marketing masterpiece with a perfect Visual Hierarchy.
    
    *** COMPOSITIONAL GOAL (MANDATORY) ***
    Create a 3D depth-of-field where the product is the primary light source and the text acts as a structural element of the environment. The composition must be "Platform-Aware" for Instagram.
    
    *** PRODUCTION BLUEPRINT (MARCH 2026 TRENDS) ***
    - **COLOR PALETTE**: ${brief.trendAnalysis.colorPalette}
    - **LIGHTING MOOD**: ${brief.trendAnalysis.lightingMood}
    - **COMPOSITIONAL STYLE**: ${brief.trendAnalysis.compositionalStyle}
    - **VISUAL DIRECTION**: ${brief.visualDirection}
    - **SUGGESTED LAYOUT**: ${brief.suggestedLayout}
    
    *** SWISS DESIGN ARCHITECTURE (MANDATORY) ***
    1. **EDITORIAL TYPOGRAPHY**: Use high-contrast Editorial Serifs or Geometric Swiss Grotesks. Apply custom kerning (tracking-wide) for a luxury magazine look.
    2. **MASSIVE SCALE CONTRAST**: The Headline must be bold and high-impact.
    3. **NEGATIVE SPACE MANDATE**: Ensure at least 20% "breathing room" around every text element. No clutter.
    4. **GRID ALIGNMENT**: Align all text elements to a strict invisible grid.
    
    *** IDENTITY ANCHOR v8.0 (SACRED ASSET PROTOCOL) ***
    1. **PRODUCT INTEGRITY**: You are FORBIDDEN from altering the geometry, silhouette, or label typography of the 'SACRED PRODUCT ASSETS'. 
    2. **BRAND FIDELITY**: The 'BRAND LOGO' must be rendered with pixel-perfect precision. 
    ${optModel ? "3. **SUBJECT LOCK**: The person in the ad must be a 1:1 biometric replica of the 'SUBJECT DIGITAL TWIN'." : ""}
    ${inputs.modelSource === 'ai' ? `3. **TALENT SYNTHESIS**: Generate a ${inputs.modelParams?.modelType || 'Professional Model'} from ${inputs.modelParams?.region || 'Global'} with ${inputs.modelParams?.skinTone || 'Natural'} skin tone. Professional talent from a high-end agency.` : ""}

    *** PRODUCTION DIRECTIVES (ELITE QUALITY) ***
    1. **RAY-TRACED PHYSICS DIRECTIVES**:
       - **CONTACT SHADOWS**: Mandatory soft, realistic shadows where the product touches any surface.
       - **AMBIENT OCCLUSION**: Subtle darkening in crevices and contact points for depth.
       - **LIGHT WRAP**: Background light must bleed slightly over product edges for environmental immersion.
       - **REFLECTIVE GROUNDING**: If on a surface, apply a subtle, blurred reflection of the product.
    2. **STRICT 12-COLUMN SWISS GRID**:
       - Align all text elements to a strict invisible grid.
       - **TYPOGRAPHY CONTRAST**: Use a massive "Display Serif" for the headline and a tiny "Technical Mono" for utility text (website/contact).
       - **NEGATIVE SPACE**: Enforce a "20% Margin Rule"—no text can touch the edges of the product or canvas.
    3. **MATERIAL FIDELITY**: The product has a "${brief.detectedFinish || 'Matte'}" finish. 
       - If 'Glossy': Apply sharp, clear reflections of the studio environment.
       - If 'Matte': Apply soft, diffused lighting with no sharp highlights.
       - If 'Metallic': Apply high-contrast rim lighting and anisotropic specular highlights.
       - If 'Glass': Apply realistic refraction, transparency, and caustic light patterns.
       - If 'Fabric': Apply soft micro-shadows to highlight texture and weave.
    4. **MARKETING TONE**: The ad must convey a "${brief.suggestedTone || 'Bold'}" tone. 
    5. **ENVIRONMENTAL BLENDING**: Treat the text as a physical object in the scene. Apply "Contact Shadows", "Ambient Occlusion", and "Light Wrap" to the text elements so they look integrated into the studio lighting.
    6. **Z-AXIS LAYERING**: Integrate text with depth—the product can slightly overlap the text, or the text can float behind foreground objects for a high-end editorial 3D look.
    7. **LIGHTING**: Apply "Ray-Traced Global Illumination". Ensure realistic light bounce between the product and the environment.
    8. **BLENDING**: The product must look physically present in the scene, not "pasted".
    9. **VIBE**: ${VIBE_PROMPTS[inputs.vibe || ''] || "Professional commercial aesthetic."}
    10. **LAYOUT**: ${brief.suggestedLayout}

    *** THE CREATIVE COPY (FULL MARKETING SUITE) ***
    1. **HEADLINE (HERO SCALE)**: Render "${inputs.customTitle || brief.strategicCopy.headline}" using ${brand?.fonts.heading || 'Modern Serif'}.
    2. **SUBHEADLINE (CONTEXTUAL)**: Render "${brief.strategicCopy.subheadline}" in a smaller, elegant font below the headline.
    ${(inputs.website || inputs.contactNumber) ? `3. **UTILITY STACK (FOOTER SAFE-ZONE)**:
       ${inputs.website ? `- **WEBSITE**: Render "${inputs.website}" in a tiny, clean technical font at the bottom.` : ""}
       ${inputs.contactNumber ? `- **CONTACT**: Render "${inputs.contactNumber}" near the website.` : ""}` : "3. **NO UTILITY STACK**: Do not render any website or contact information."}
    4. **ACTION (CTA BUTTON)**: 
       ${(inputs.ctaButton && inputs.ctaButton !== 'None') ? `Create a high-contrast, professional button with the text: "${inputs.ctaButton === 'Custom' ? inputs.customCta : inputs.ctaButton}".` : "Do not render a CTA button."}
    
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
