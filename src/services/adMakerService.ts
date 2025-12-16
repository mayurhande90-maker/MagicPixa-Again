
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
    // 1. SMART MAPPING / SEMANTIC SLOTTING LOGIC
    // Enhanced instruction to force the AI to act as a layout engine, not just an image generator.
    const smartMappingLogic = `
    *** SMART LAYOUT ENGINE: SEMANTIC SLOTTING ***
    You are an expert Advertising Designer. Your task is to generate a **finished marketing asset**, NOT just a background.
    
    **CRITICAL: TEXT RENDERING PROTOCOL**
    - You MUST render the text provided in the "DATA" sections below directly onto the image.
    - **Typography**: Text must be legible, high-contrast, and professionally typeset.
    - **Hierarchy**: 
      1. HEADLINE/OFFER (Largest, Boldest)
      2. SUBHEAD/PRODUCT NAME (Medium)
      3. CTA/DETAILS (Smallest, often in a pill/button shape)
    - **Composition**: Do not cover the main subject (The Product/Person). Place text in negative space.
    
    **RULE: USER DATA AUTHORITY**
    - The User's Input overrides ANY text found in the Reference Image or Blueprint.
    - If the Reference Style has a "Phone Number" but the User provided a "Website", you must SWAP the slot.
    `;

    const commonRules = `
    *** VISUAL DESIGN PROTOCOL (HIGH CONVERSION) ***
    1. **Visual Hierarchy**: The Main Image is the HERO. It must occupy 60-70% of the space.
    2. **Readability**: Use "Glassmorphism" (blur backgrounds) or solid overlays/gradients behind text if the background is busy.
    3. **Professionalism**: Perfect alignment (grid system), negative space, and premium font choices.
    4. **Lighting**: Relight the subject to look integrated with any background elements generated. Global illumination matching.
    `;

    // 2. BLUEPRINT INJECTION
    let styleInstruction = "";
    if (inputs.blueprintId) {
        const blueprint = STYLE_BLUEPRINTS.find(b => b.id === inputs.blueprintId);
        if (blueprint) {
            styleInstruction = `
            *** STYLE BLUEPRINT: ${blueprint.label.toUpperCase()} ***
            - **Visual Direction**: ${blueprint.prompt}
            - **Constraint**: Adhere strictly to this aesthetic. Ignore generic style defaults.
            `;
        }
    } else {
        styleInstruction = `
        *** REFERENCE MATCHING ***
        - **Visual Direction**: Analyze the 'Reference Image' provided (if any). Copy its lighting, layout structure, text placement, and color palette exactly.
        - **Adaptation**: Keep the style of the reference, but replace the content with the User's Product and Text.
        `;
    }

    // INDUSTRY SPECIFIC LOGIC
    
    if (inputs.industry === 'realty') {
        return `You are a Luxury Real Estate Designer.
        TASK: Create a Premium Property Flyer.
        DATA: 
        - Project Name: "${inputs.project}"
        - Location: "${inputs.location}"
        - Configuration: "${inputs.config}"
        - Features: ${inputs.features?.join(', ')}
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Large hero image of the property at the top/center. Text info in a clean footer or floating glass card.
        - Text: Elegant Serif fonts for headers. Minimalist modern sans-serif for details.
        - **Critical**: Make the property look expensive. Boost dynamic range (HDR look).
        ${commonRules}`;
    }

    if (inputs.industry === 'food') {
        return `You are a Gourmet Food Photographer & Menu Designer.
        TASK: Create a Mouth-Watering Social Media Ad.
        DATA: 
        - Dish Name: "${inputs.dishName}"
        - Restaurant/Brand: "${inputs.restaurant}"
        VIBE: ${inputs.tone} (e.g. Fresh, Spicy, Comfort).
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Top-down or 45-degree angle of the food. Text floating around or below.
        - Physics: Add steam, water droplets, or flying ingredients (splash) if relevant to make it look fresh.
        - Text: Bold, appetizing typography.
        - **Critical**: The food must look edible and delicious.
        ${commonRules}`;
    }

    if (inputs.industry === 'fmcg') {
        return `You are a CPG (Consumer Packaged Goods) Ad Designer.
        TASK: Create a High-Impact Product Ad for Supermarkets/Social.
        DATA: 
        - Product Name: "${inputs.productName}"
        - Offer/Hook: "${inputs.offer}"
        - Description: "${inputs.description}"
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Center the product packaging (bottle/box/bag). Make it pop with a glow or burst background.
        - Elements: Add fresh ingredients (fruits, splashes, leaves) floating around if organic.
        - Text: VERY BOLD, punchy text. "Buy 1 Get 1", "New Flavor". Use starbursts or badges for offers.
        - **Critical**: Brand color consistency.
        ${commonRules}`;
    }

    if (inputs.industry === 'fashion') {
        return `You are a High-Fashion Editorial Designer.
        TASK: Create a Stylish Lifestyle Ad.
        DATA: 
        - Brand/Product: "${inputs.productName}"
        - Collection/Offer: "${inputs.offer}"
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Magazine cover style. Full bleed image. Text overlay is minimal and elegant (small serif or bold grotesque).
        - Vibe: Trendy, Chic, Aspirational.
        - Lighting: Soft, flattering studio light or golden hour sun.
        ${commonRules}`;
    }

    if (inputs.industry === 'education') {
        return `You are an EdTech Marketing Designer.
        TASK: Create a Course Enrollment Ad.
        DATA: 
        - Course Title: "${inputs.headline}"
        - Sub-header: "${inputs.subheadline}"
        - CTA: "${inputs.cta}"
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Split screen (Image of happy student/teacher on one side, clean text area on the other).
        - Vibe: Trustworthy, Growth-oriented, Academic but modern.
        - Graphics: Use subtle geometric shapes, arrows, or icons related to learning.
        ${commonRules}`;
    }

    if (inputs.industry === 'services') {
        return `You are a B2B / Professional Services Designer.
        TASK: Create a Trust-Building Service Ad.
        DATA: 
        - Service Name: "${inputs.headline}"
        - Value Prop: "${inputs.subheadline}"
        - CTA: "${inputs.cta}"
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Clean corporate aesthetic.
        - Vibe: Professional, Efficient, Reliable. Blue/Grey tones often work well unless Blueprint specifies otherwise.
        - Text: Clear, sans-serif, easy to read.
        ${commonRules}`;
    }

    if (inputs.industry === 'saas') {
        return `You are a Tech/SaaS Marketing Designer.
        TASK: Create a High-Trust B2B Ad Creative.
        DATA: 
        - Headline: "${inputs.headline}"
        - CTA: "${inputs.cta}"
        VIBE: Trust, Growth, Modern Tech.
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Device mockup (laptop/phone) showing the product, or abstract tech visualization.
        - Text: Modern Sans-Serif (Inter/Roboto style).
        - **Critical**: Incorporate the uploaded asset (Screen UI or Stock Photo) into a modern device mockup or abstract tech environment.
        ${commonRules}`;
    }

    // Default: Ecommerce
    return `You are a Direct Response Ad Designer.
    TASK: Create a High-CTR Product Ad.
    DATA: 
    - Product: "${inputs.productName}"
    - Offer: "${inputs.offer}"
    - Description: "${inputs.description}"
    
    ${smartMappingLogic}
    ${styleInstruction}
    
    EXECUTION:
    - Features: Add a "Shadow" to ground the product.
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
    parts.push({ text: "OUTPUT: A single high-resolution image file (1024x1024). Ensure text is legible and correctly spelled." });

    // 4. Generate
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
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
