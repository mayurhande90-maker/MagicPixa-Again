
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

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

export const STYLE_BLUEPRINTS = [
    { id: 'modern_minimal', label: 'Modern Minimalist', desc: 'Clean, airy, ample whitespace.', prompt: 'Modern minimalist design, high-end white background, clean sans-serif typography, generous negative space, sleek and premium.' },
    { id: 'bold_street', label: 'Bold Urban', desc: 'High contrast, gritty textures.', prompt: 'Bold streetwear aesthetic, high contrast, urban grunge textures, strong impact typography, dynamic composition.' },
    { id: 'luxury_gold', label: 'Luxury Dark', desc: 'Black & Gold, premium feel.', prompt: 'Luxury dark mode, black and gold color palette, elegant serif fonts, dramatic premium lighting, sophisticated atmosphere.' },
    { id: 'neon_tech', label: 'Neon Tech', desc: 'Cyberpunk, glowing lights.', prompt: 'Futuristic cyberpunk style, neon blue and pink rim lighting, dark tech background, geometric overlays, glitch effects.' },
    { id: 'nature_fresh', label: 'Organic Fresh', desc: 'Greenery, soft sunlight.', prompt: 'Organic nature theme, soft morning daylight, botanical elements, fresh earth tones, sustainable vibe.' },
    { id: 'pop_art', label: 'Vibrant Pop', desc: 'Bright colors, fun energy.', prompt: 'Pop art style, vibrant solid background colors, bold outlines, fun and energetic vibe, playful patterns.' }
];

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

const getSystemPrompt = (inputs: AdMakerInputs) => {
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

    // 2. VISUAL FOCUS STRATEGY
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
        - **Lighting**: Golden hour or natural window light.
        - **Atmosphere**: Warm, relatable, human presence (hands, blurred figures).
        `;
    } else if (focus === 'conceptual') {
        visualStrategy = `
        *** STRATEGY: CONCEPTUAL (METAPHOR) ***
        - **Goal**: Illustrate the BENEFIT or FEELING (e.g., Speed, Freshness, Calm).
        - **Visuals**: Creative visual metaphor, surreal elements, floating objects.
        - **Style**: Editorial, dreamlike, high-end art direction.
        `;
    }

    // 3. SMART MAPPING
    const smartMappingLogic = `
    *** DESIGN PROTOCOL: WORLD CLASS & CLUTTER-FREE ***
    - **Clutter-Free**: Use ample whitespace. Focus on ONE core message.
    - **Authenticity**: Avoid looking cheap or overly "salesy". Use elegant layouts.
    - **Brand Integration**: Incorporate the logo naturally.
    - **Hierarchy**: 
      1. HERO IMAGE (Visual Story)
      2. HEADLINE (Short, < 6 words)
      3. CTA (Button/Pill)
    `;

    // 3. BLUEPRINT INJECTION
    let styleInstruction = "";
    if (inputs.blueprintId) {
        const blueprint = STYLE_BLUEPRINTS.find(b => b.id === inputs.blueprintId);
        if (blueprint) {
            styleInstruction = `
            *** STYLE BLUEPRINT: ${blueprint.label.toUpperCase()} ***
            - **Visual Direction**: ${blueprint.prompt}
            - **Constraint**: Adhere strictly to this aesthetic.
            `;
        }
    } else {
        styleInstruction = `
        *** REFERENCE MATCHING ***
        - **Visual Direction**: Analyze the 'Reference Image' provided (if any). Copy its lighting, layout structure, text placement, and color palette exactly.
        `;
    }

    const commonRules = `
    ${layoutRules}
    ${smartMappingLogic}
    ${visualStrategy}
    ${styleInstruction}
    `;

    // INDUSTRY SPECIFIC LOGIC
    
    if (inputs.industry === 'realty') {
        return `You are a Luxury Real Estate Designer.
        TASK: Create a Premium Property Ad (${ratio}).
        DATA: 
        - Project: "${inputs.project}"
        - Loc: "${inputs.location}"
        - Config: "${inputs.config}"
        - Features: ${inputs.features?.join(', ')}
        
        EXECUTION:
        - Layout: Large hero image of the property.
        - Text: Elegant Serif fonts for headers.
        - **Critical**: Make the property look expensive. Boost dynamic range (HDR look).
        ${commonRules}`;
    }

    if (inputs.industry === 'food') {
        return `You are a Gourmet Food Ad Designer.
        TASK: Create a Mouth-Watering Ad (${ratio}).
        DATA: 
        - Dish: "${inputs.dishName}"
        - Brand: "${inputs.restaurant}"
        VIBE: ${inputs.tone}.
        
        EXECUTION:
        - Layout: Macro shot or Top-down.
        - Physics: Steam, droplets, flying ingredients (splash).
        - **Critical**: Must look edible and delicious.
        ${commonRules}`;
    }

    if (inputs.industry === 'fmcg') {
        return `You are a CPG Ad Designer.
        TASK: Create a High-Impact Product Ad (${ratio}).
        DATA: 
        - Product: "${inputs.productName}"
        - Offer: "${inputs.offer}"
        - Desc: "${inputs.description}"
        
        EXECUTION:
        - Layout: Center the packaging. Make it pop.
        - Text: BOLD, punchy. Use badges for offers.
        - **Critical**: Brand color consistency.
        ${commonRules}`;
    }

    if (inputs.industry === 'fashion') {
        return `You are a High-Fashion Ad Designer.
        TASK: Create a Stylish Ad (${ratio}).
        DATA: 
        - Brand: "${inputs.productName}"
        - Offer: "${inputs.offer}"
        
        EXECUTION:
        - Layout: Magazine cover style. Full bleed.
        - Vibe: Trendy, Chic, Aspirational.
        - **Critical**: Model/Clothing must look premium.
        ${commonRules}`;
    }

    if (inputs.industry === 'saas') {
        return `You are a Tech/SaaS Ad Designer.
        TASK: Create a B2B Ad Creative (${ratio}).
        DATA: 
        - Headline: "${inputs.headline}"
        - CTA: "${inputs.cta}"
        
        EXECUTION:
        - Layout: Abstract tech visualization or device mockup.
        - Text: Modern Sans-Serif. Clean.
        ${commonRules}`;
    }

    // Default
    return `You are a Direct Response Ad Designer.
    TASK: Create a High-CTR Ad (${ratio}).
    DATA: 
    - Product: "${inputs.productName}"
    - Offer: "${inputs.offer}"
    - Desc: "${inputs.description}"
    
    EXECUTION:
    - Text: Punchy, bold, urgent.
    - **Critical**: The product must pop.
    ${commonRules}`;
};

export const generateAdCreative = async (inputs: AdMakerInputs): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Optimize
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType) : null;

    // 2. Prepare Parts
    const parts: any[] = [];
    parts.push({ text: "MAIN VISUAL ASSET (Must be the Hero):" });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO (Place in corner or top center):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // 3. Prompt
    const systemPrompt = getSystemPrompt(inputs);
    parts.push({ text: systemPrompt });
    parts.push({ text: `OUTPUT: A single high-resolution image file. Ensure text is legible and correctly spelled. Aspect Ratio: ${inputs.aspectRatio || '1:1'}.` });

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
                }
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
