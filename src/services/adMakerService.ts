import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Optimize images to 1024px
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export interface Blueprint {
    id: string;
    label: string;
    desc: string;
    prompt: string;
}

// 1. Group A: Retail & Lifestyle (E-commerce, Fashion, FMCG)
const RETAIL_BLUEPRINTS: Blueprint[] = [
    { id: 'modern_studio', label: 'Modern Studio', desc: 'Clean white background, soft shadows.', prompt: 'High-end studio photography style, clean white background, soft diffused lighting, minimalist composition, commercial product focus.' },
    { id: 'luxury_dark', label: 'Luxury Dark', desc: 'Black textures, gold accents.', prompt: 'Luxury dark mode aesthetic, matte black textures, elegant gold accents, dramatic rim lighting, premium sophisticated atmosphere.' },
    { id: 'bold_urban', label: 'Bold Urban', desc: 'High contrast, street style.', prompt: 'Bold streetwear aesthetic, high contrast, concrete textures, strong shadows, energetic and edgy composition.' },
    { id: 'pastel_pop', label: 'Pastel Pop', desc: 'Soft colors, playful geometry.', prompt: 'Playful pop art style, soft pastel background colors, geometric shapes, bright studio lighting, fun and youthful vibe.' },
    { id: 'nature_organic', label: 'Nature/Organic', desc: 'Sunlight, leaves, wood textures.', prompt: 'Organic nature theme, natural sunlight, botanical shadows, wooden textures, earth tones, fresh and sustainable look.' }
];

// 2. Group B: Food & Dining
const FOOD_BLUEPRINTS: Blueprint[] = [
    { id: 'rustic_table', label: 'Rustic Table', desc: 'Wooden textures, warm lighting.', prompt: 'Rustic farm-to-table aesthetic, textured wooden surface, warm ambient lighting, fresh ingredients in background, cozy atmosphere.' },
    { id: 'dark_moody', label: 'Dark Moody', desc: 'Slate backgrounds, spotlight.', prompt: 'Dark moody food photography, slate stone background, dramatic spotlight on the dish, rich shadows, high-end steakhouse vibe.' },
    { id: 'bright_fresh', label: 'Bright & Fresh', desc: 'High-key lighting, white marble.', prompt: 'Bright and airy food photography, white marble surface, high-key lighting, fresh herbs, brunch aesthetic, clean and appetizing.' },
    { id: 'neon_diner', label: 'Neon Diner', desc: 'Vibrant colors, hard shadows.', prompt: 'Retro diner aesthetic, vibrant neon colors, hard flash photography shadows, energetic fast-food vibe, bold and colorful.' }
];

// 3. Group C: Real Estate
const REALTY_BLUEPRINTS: Blueprint[] = [
    { id: 'bright_airy', label: 'Bright Airy', desc: 'Daylight, blue sky, open.', prompt: 'Bright and airy architectural photography, natural daylight, blue sky view, open windows, spacious and welcoming atmosphere.' },
    { id: 'golden_hour', label: 'Golden Hour', desc: 'Warm sunset glow, long shadows.', prompt: 'Golden hour real estate photography, warm sunset light, long dramatic shadows, emotional and inviting glow, exterior curb appeal.' },
    { id: 'twilight_luxury', label: 'Twilight Luxury', desc: 'Evening "Blue Hour", glowing lights.', prompt: 'Twilight "Blue Hour" photography, deep blue sky, interior lights glowing warm, luxurious and premium exterior shot, dramatic lighting.' },
    { id: 'modern_clean', label: 'Modern Clean', desc: 'Architectural lines, desaturated.', prompt: 'Modern architectural style, clean lines, desaturated cool tones, sharp focus, professional portfolio look.' }
];

// 4. Group D: Professional (SaaS, Education, Services)
const PROFESSIONAL_BLUEPRINTS: Blueprint[] = [
    { id: 'corporate_clean', label: 'Corporate Clean', desc: 'White/Blue palette, structured.', prompt: 'Corporate business aesthetic, clean white and blue color palette, structured grid layout, trustworthy and professional, banking/consulting vibe.' },
    { id: 'dark_mode_tech', label: 'Dark Mode Tech', desc: 'Sleek dark interfaces, glowing.', prompt: 'Modern SaaS dark mode aesthetic, sleek dark gradients, glowing tech accents, futuristic interface elements, premium software vibe.' },
    { id: 'warm_trust', label: 'Warm Trust', desc: 'Beige/Soft colors, approachable.', prompt: 'Warm and trustworthy professional style, beige and soft earth tones, human-centric, approachable and caring, healthcare/education vibe.' },
    { id: 'minimalist_grey', label: 'Minimalist Grey', desc: 'Serious, legal/financial.', prompt: 'Minimalist professional aesthetic, shades of grey and white, serious and authoritative, legal or financial firm look, clean typography.' }
];

// Helper to get all blueprints for lookup
const ALL_BLUEPRINTS = [
    ...RETAIL_BLUEPRINTS,
    ...FOOD_BLUEPRINTS,
    ...REALTY_BLUEPRINTS,
    ...PROFESSIONAL_BLUEPRINTS
];

export const getBlueprintsForIndustry = (industry: string): Blueprint[] => {
    switch (industry) {
        case 'ecommerce':
        case 'fashion':
        case 'fmcg':
            return RETAIL_BLUEPRINTS;
        case 'food':
            return FOOD_BLUEPRINTS;
        case 'realty':
            return REALTY_BLUEPRINTS;
        case 'saas':
        case 'education':
        case 'services':
            return PROFESSIONAL_BLUEPRINTS;
        default:
            return RETAIL_BLUEPRINTS;
    }
};

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    visualFocus?: 'product' | 'lifestyle' | 'conceptual'; 
    aspectRatio?: '1:1' | '4:5' | '9:16';
    // Common
    mainImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    tone: string;
    // Style Source
    blueprintId?: string; // Optional: If no reference image
    // E-commerce & FMCG
    productName?: string;
    offer?: string;
    description?: string;
    // Realty
    project?: string;
    location?: string;
    config?: string;
    features?: string[];
    // Food
    dishName?: string;
    restaurant?: string;
    // SaaS / Education / Services
    headline?: string;
    cta?: string;
    subheadline?: string;
}

const getSystemPrompt = (inputs: AdMakerInputs, brand?: BrandKit | null) => {
    const ratio = inputs.aspectRatio || '1:1';
    
    // 1. SAFE ZONES & FORMAT LOGIC
    let layoutRules = "";
    if (ratio === '9:16') {
        layoutRules = `
        *** TECHNICAL SPEC: INSTAGRAM STORIES/REELS (9:16) ***
        - **Safe Zones**: CRITICAL. Leave top 14% and bottom 20% completely CLEAR of text and logos to avoid UI overlap.
        - **Center Focus**: Place the core message and visual in the middle 60% of the screen.
        - **Mobile-First**: Typography must be large, legible, and scannable in < 2 seconds.
        `;
    } else if (ratio === '4:5') {
        layoutRules = `
        *** TECHNICAL SPEC: INSTAGRAM FEED (4:5) ***
        - **Vertical Feed**: Maximize screen real estate.
        - **Composition**: Center-weighted. Ensure nothing important is at the very edges.
        `;
    } else {
        layoutRules = `
        *** TECHNICAL SPEC: SQUARE FEED (1:1) ***
        - **Standard Feed**: Balanced grid composition.
        - **Rule of Thirds**: Place key elements on intersection points.
        `;
    }

    // 2. BRAND DNA INTEGRATION
    const brandDNA = brand ? `
    *** BRAND DNA (STRICT ADHERENCE) ***
    - **Client**: '${brand.companyName || brand.name}'
    - **Visual Tone**: ${brand.toneOfVoice || inputs.tone}.
    - **Color Palette**: Use ${brand.colors.primary} as the dominant theme or accent color.
    - **Audience**: Target visuals for ${brand.targetAudience || 'General'}.
    - **Negative Prompts**: ${brand.negativePrompts || 'None'}.
    ` : `*** BRAND TONE ***
    - Tone: ${inputs.tone || 'Modern'}`;

    // 3. VISUAL FOCUS STRATEGY
    let visualStrategy = "";
    const focus = inputs.visualFocus || 'product';

    if (focus === 'product') {
        visualStrategy = `
        *** STRATEGY: PRODUCT FOCUS (HYPER-REALISM) ***
        - **Goal**: Show the product's quality, texture, and details.
        - **Visuals**: Hyper-realistic 8K render. Studio lighting (Softbox or Rim light).
        - **Background**: Clean, non-distracting studio environment or simple podium.
        - **Depth**: Sharp focus on the product, slight fall-off on background.
        `;
    } else if (focus === 'lifestyle') {
        visualStrategy = `
        *** STRATEGY: LIFESTYLE (AUTHENTICITY) ***
        - **Goal**: Show the product in use. "Sound-off" visual storytelling.
        - **Visuals**: Candid, authentic, "User Generated Content" vibe but pro quality.
        - **Lighting**: Natural window light or golden hour.
        - **Atmosphere**: Warm, relatable, human presence (hands, blurred figures).
        `;
    } else if (focus === 'conceptual') {
        visualStrategy = `
        *** STRATEGY: CONCEPTUAL (METAPHOR) ***
        - **Goal**: Illustrate the BENEFIT or FEELING.
        - **Visuals**: Creative visual metaphor, surreal elements, floating objects.
        - **Style**: Editorial, dreamlike, high-end art direction.
        `;
    }

    // 4. SMART MAPPING
    const smartMappingLogic = `
    *** INTELLIGENT CONTENT ENGINE (COPYWRITING) ***
    - **Analyze, Don't Copy**: You are a Creative Director. The "CONTEXT" sections below are raw data points. **DO NOT copy-paste the user's text blindly.**
    - **Synthesize Value**: Analyze the product details to understand the core benefit. Generate your own high-impact, punchy headlines and micro-copy that is better than the input.
    - **Language**: English, unless the input is clearly in another language.
    
    *** STRICT LOGO PROTOCOL (NO HALLUCINATIONS) ***
    - **Sacred Asset**: The provided "BRAND LOGO" image is immutable. Include it exactly.
    - **Smart Contrast**: Place the logo where it is 100% legible. Ensure high separation from background.

    *** DESIGN PROTOCOL: WORLD CLASS & CLUTTER-FREE ***
    - **Hierarchy**: 1. HERO IMAGE, 2. HEADLINE, 3. CTA.
    - **Whitespace**: Use ample negative space.
    `;

    // 5. STYLE SOURCE
    let styleInstruction = "";
    if (inputs.blueprintId) {
        const blueprint = ALL_BLUEPRINTS.find(b => b.id === inputs.blueprintId);
        if (blueprint) {
            styleInstruction = `
            *** STYLE BLUEPRINT: ${blueprint.label.toUpperCase()} ***
            - **Direction**: ${blueprint.prompt}
            `;
        }
    } else {
        styleInstruction = `
        *** REFERENCE MATCHING ***
        - **Visual Direction**: Copy the lighting, layout, and palette of the provided Reference Image.
        `;
    }

    const commonRules = `
    ${layoutRules}
    ${brandDNA}
    ${smartMappingLogic}
    ${visualStrategy}
    ${styleInstruction}
    `;

    // INDUSTRY SPECIFIC CONTEXT
    if (inputs.industry === 'realty') {
        return `You are a Luxury Real Estate Designer.
        TASK: Create a Premium Property Ad (${ratio}).
        CONTEXT: 
        - Project: "${inputs.project}"
        - Loc: "${inputs.location}"
        - Config: "${inputs.config}"
        - Features: ${inputs.features?.join(', ')}
        
        EXECUTION:
        - Must look expensive. Boost dynamic range (HDR).
        ${commonRules}`;
    }

    if (inputs.industry === 'food') {
        return `You are a Gourmet Food Ad Designer.
        TASK: Create a Mouth-Watering Ad (${ratio}).
        CONTEXT: 
        - Dish: "${inputs.dishName}"
        - Brand: "${inputs.restaurant}"
        
        EXECUTION:
        - Macro shot or Top-down. edibility focus.
        ${commonRules}`;
    }

    if (inputs.industry === 'fmcg') {
        return `You are a CPG Ad Designer.
        TASK: Create a High-Impact Product Ad (${ratio}).
        CONTEXT: 
        - Product: "${inputs.productName}"
        - Offer: "${inputs.offer}"
        - Desc: "${inputs.description}"
        
        EXECUTION:
        - Focus on packaging pop. Bold text.
        ${commonRules}`;
    }

    if (inputs.industry === 'saas') {
        return `You are a Tech Ad Designer.
        TASK: Create a B2B Ad Creative (${ratio}).
        CONTEXT: 
        - Headline: "${inputs.headline}"
        - CTA: "${inputs.cta}"
        
        EXECUTION:
        - Modern UI/Abstract tech visualization.
        ${commonRules}`;
    }

    // Default
    return `You are a Direct Response Ad Designer.
    TASK: Create a High-CTR Ad (${ratio}).
    CONTEXT: 
    - Product: "${inputs.productName}"
    - Offer: "${inputs.offer}"
    
    EXECUTION:
    - Punchy, bold, conversion-focused.
    ${commonRules}`;
};

export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Optimize
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType) : null;

    // 2. Prepare Parts
    const parts: any[] = [];
    parts.push({ text: "HERO ASSET:" });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO:" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    const systemPrompt = getSystemPrompt(inputs, brand);
    parts.push({ text: systemPrompt });

    // 4. Generate
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { 
                    aspectRatio: inputs.aspectRatio || "1:1", 
                    imageSize: "1K" 
                },
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
        throw new Error("No image generated.");
    } catch (e) {
        console.error("Ad generation failed", e);
        throw e;
    }
};