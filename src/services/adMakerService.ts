
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

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas';
    // Common
    mainImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    tone: string;
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
    const commonRules = `
    *** VISUAL DESIGN PROTOCOL (HIGH CONVERSION) ***
    1. **Visual Hierarchy**: The Main Image is the HERO. It must occupy 60-70% of the space.
    2. **Readability**: Text must be high-contrast. Use "Glassmorphism" (blur backgrounds) or solid overlays behind text if the background is busy.
    3. **Professionalism**: Perfect alignment, negative space, and premium font choices.
    4. **Lighting**: Relight the subject to look integrated with any background elements generated.
    `;

    if (inputs.industry === 'realty') {
        return `You are a Luxury Real Estate Designer.
        TASK: Create a Premium Property Flyer.
        DATA: Project "${inputs.project}", Loc "${inputs.location}", Config "${inputs.config}".
        FEATURES: ${inputs.features?.join(', ')}.
        
        EXECUTION:
        - Style: "Architectural Digest". Golden Hour lighting.
        - Text: Elegant Serif fonts for headers. Minimalist footer.
        - **Critical**: Make the property look expensive. Boost dynamic range.
        ${commonRules}`;
    }

    if (inputs.industry === 'food') {
        return `You are a Gourmet Food Photographer & Menu Designer.
        TASK: Create a Mouth-Watering Social Media Ad.
        DATA: Dish "${inputs.dishName}", Spot "${inputs.restaurant}".
        VIBE: ${inputs.tone} (e.g. Fresh, Spicy, Comfort).
        
        EXECUTION:
        - Style: "Bon Appétit Magazine". High contrast, rich saturation.
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
        
        EXECUTION:
        - Style: "Stripe / Apple Business". Clean lines, abstract geometry, gradients.
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
    
    EXECUTION:
    - Style: Commercial Studio. Pop colors or Clean Minimalist (based on product).
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
