
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
    industry: 'ecommerce' | 'realty' | 'food' | 'saas';
    // Common
    mainImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    tone: string;
    // Style Source
    blueprintId?: string; // Optional: If no reference image
    // E-commerce
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
    // SaaS
    headline?: string;
    cta?: string;
}

const getSystemPrompt = (inputs: AdMakerInputs) => {
    // 1. SMART MAPPING / SEMANTIC SLOTTING LOGIC
    // This instructs the AI to prioritize user data over visual hallucinations or reference text
    const smartMappingLogic = `
    *** SMART LAYOUT ENGINE: SEMANTIC SLOTTING ***
    You are an intelligent design engine. You must map User Data to the Layout Structure.
    
    **RULE: USER DATA AUTHORITY**
    - The User's Input (below) overrides ANY text found in the Reference Image or Blueprint.
    - If the Reference Style has a "Phone Number" but the User provided a "Website", you must SWAP the slot. Use the Website text in the Phone Number's visual location.
    - If the Reference has a "Price Tag" but the User provided a "Discount %", use the Discount text in the Price Tag slot.
    - **Do NOT hallucinate** data not provided (e.g., do not invent a phone number if none is given).
    `;

    const commonRules = `
    *** VISUAL DESIGN PROTOCOL (HIGH CONVERSION) ***
    1. **Visual Hierarchy**: The Main Image is the HERO. It must occupy 60-70% of the space.
    2. **Readability**: Text must be high-contrast. Use "Glassmorphism" (blur backgrounds) or solid overlays behind text if the background is busy.
    3. **Professionalism**: Perfect alignment, negative space, and premium font choices.
    4. **Lighting**: Relight the subject to look integrated with any background elements generated.
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
        - **Visual Direction**: Analyze the 'Reference Image' provided (if any). Copy its lighting, layout structure, and color palette exactly.
        - If no reference is visible, infer a style based on the 'Tone': ${inputs.tone}.
        `;
    }

    if (inputs.industry === 'realty') {
        return `You are a Luxury Real Estate Designer.
        TASK: Create a Premium Property Flyer.
        DATA: Project "${inputs.project}", Loc "${inputs.location}", Config "${inputs.config}".
        FEATURES: ${inputs.features?.join(', ')}.
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Text: Elegant Serif fonts for headers. Minimalist footer.
        - **Critical**: Make the property look expensive. Boost dynamic range.
        ${commonRules}`;
    }

    if (inputs.industry === 'food') {
        return `You are a Gourmet Food Photographer & Menu Designer.
        TASK: Create a Mouth-Watering Social Media Ad.
        DATA: Dish "${inputs.dishName}", Spot "${inputs.restaurant}".
        VIBE: ${inputs.tone} (e.g. Fresh, Spicy, Comfort).
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Physics: Add steam or water droplets if relevant to make it look fresh.
        - Text: Bold, appetizing typography.
        - **Critical**: The food must look edible and delicious.
        ${commonRules}`;
    }

    if (inputs.industry === 'saas') {
        return `You are a Tech/SaaS Marketing Designer.
        TASK: Create a High-Trust B2B Ad Creative.
        DATA: Headline "${inputs.headline}", CTA "${inputs.cta}".
        VIBE: Trust, Growth, Modern Tech.
        
        ${smartMappingLogic}
        ${styleInstruction}
        
        EXECUTION:
        - Layout: Split screen or Center Focus.
        - Text: Modern Sans-Serif (Inter/Roboto style).
        - **Critical**: Incorporate the uploaded asset (Screen UI or Stock Photo) into a modern device mockup or abstract tech environment.
        ${commonRules}`;
    }

    // Default: Ecommerce
    return `You are a Direct Response Ad Designer.
    TASK: Create a High-CTR Product Ad.
    DATA: Product "${inputs.productName}", Offer "${inputs.offer}".
    DESC: ${inputs.description}.
    
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
    parts.push({ text: "MAIN VISUAL ASSET:" });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO (Must be included):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // 3. Prompt
    const systemPrompt = getSystemPrompt(inputs);
    parts.push({ text: systemPrompt });
    parts.push({ text: "OUTPUT: A single high-resolution image file (1024x1024)." });

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
