
import { Modality } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Optimize images to 1024px for balanced quality/speed
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

export interface MerchantInputs {
    type: 'apparel' | 'product';
    mainImage: { base64: string; mimeType: string };
    backImage?: { base64: string; mimeType: string } | null; // Optional for apparel AND product
    
    // Apparel Specifics
    modelImage?: { base64: string; mimeType: string } | null; // User's own model
    modelParams?: {
        ethnicity: string;
        age: string;
        gender: string;
        skinTone: string;
        bodyType: string;
    }; // AI Generated model
    
    // Product Specifics
    productType?: string; // e.g. "Headphones"
    productVibe?: string; // e.g. "Minimalist", "Luxury"
}

/**
 * Generates a single image based on a specific role (e.g., "Side View", "Hero Shot").
 */
const generateVariant = async (
    role: string, 
    promptInstruction: string,
    inputs: MerchantInputs,
    optMain: { data: string; mimeType: string },
    optBack?: { data: string; mimeType: string } | null,
    optModel?: { data: string; mimeType: string } | null
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];

    // 1. Context Setup
    parts.push({ text: `You are an expert E-commerce Photographer & Retoucher.
    TASK: Generate the "${role}" image for a product listing.
    
    *** INPUT ASSETS ***` });

    parts.push({ text: "MAIN PRODUCT REFERENCE:" });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });

    // Back view reference is useful for both Apparel and Products now
    if (optBack) {
        parts.push({ text: "BACK VIEW REFERENCE:" });
        parts.push({ inlineData: { data: optBack.data, mimeType: optBack.mimeType } });
    }

    if (optModel && inputs.type === 'apparel') {
        parts.push({ text: "TARGET MODEL REFERENCE:" });
        parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    // 2. Prompt Construction based on Type
    let specificInstructions = "";

    if (inputs.type === 'apparel') {
        let modelDesc = "";
        if (optModel) {
            modelDesc = "Use the TARGET MODEL provided. Maintain facial identity and body shape exactly.";
        } else if (inputs.modelParams) {
            modelDesc = `Generate a photorealistic model: ${inputs.modelParams.gender}, ${inputs.modelParams.age}, ${inputs.modelParams.ethnicity} ethnicity, ${inputs.modelParams.skinTone} skin tone, ${inputs.modelParams.bodyType} body build.`;
        }

        specificInstructions = `
        **CATEGORY**: Fashion/Apparel.
        **MODEL**: ${modelDesc}
        **GARMENT**: The model MUST be wearing the product from the Main Product Reference.
        **FIT & PHYSICS**: Ensure realistic fabric drape, folds, and texture.
        
        **SHOT SPECIFIC GOAL (${role}):**
        ${promptInstruction}
        `;
    } else {
        // Product Mode
        specificInstructions = `
        **CATEGORY**: Physical Product (${inputs.productType || 'General Item'}).
        **VIBE**: ${inputs.productVibe || 'Professional Studio'}.
        
        **SHOT SPECIFIC GOAL (${role}):**
        ${promptInstruction}
        `;
    }

    parts.push({ text: `
    ${specificInstructions}
    
    **GLOBAL REQUIREMENTS**:
    - Photorealistic, 4k, Commercial quality.
    - Perfect lighting and shadows.
    - **CRITICAL BACKGROUND RULE**: If the prompt requests a White Background, it must be a SOLID, PURE HEX #FFFFFF background. No grey gradients, no studio floors, no walls. Just the subject isolated on white.
    - **SHADOWS**: Ground the subject with a subtle, realistic contact shadow only. No harsh dark shadows.
    - **NEGATIVE CONSTRAINTS**: No props, no furniture, no watermarks, no text overlays unless explicitly requested.
    
    OUTPUT: A single image.
    `});

    const response = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] }
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate ${role}`);
};

/**
 * Main function to orchestrate the batch of 5 images.
 */
export const generateMerchantBatch = async (inputs: MerchantInputs): Promise<string[]> => {
    // 1. Optimize Assets once
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optBack = inputs.backImage ? await optimizeImage(inputs.backImage.base64, inputs.backImage.mimeType) : null;
    const optModel = inputs.modelImage ? await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType) : null;

    const tasks: Promise<string>[] = [];

    if (inputs.type === 'apparel') {
        // --- APPAREL BATCH ---
        
        // 1. Long Shot (HERO) - WHITE BG - MARKETPLACE COMPLIANT
        tasks.push(generateVariant("Hero Long Shot", 
            "Standard E-commerce Catalog Shot. Full body. Model standing neutrally facing forward. Arms relaxed by side. **CRITICAL: Hands must NOT obstruct the garment.** Subject to occupy **85% of the canvas** with equal padding. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props.", 
            inputs, optMain, optBack, optModel));

        // 2. Stylized / Editorial - Keep Contextual/Lifestyle
        tasks.push(generateVariant("Editorial Stylized", 
            "Street style or lifestyle context. Background should be a blurred city street, cafe, or park (matching the outfit vibe). Dynamic pose. Cinematic lighting.", 
            inputs, optMain, optBack, optModel));

        // 3. Side Profile - WHITE BG
        tasks.push(generateVariant("Side Profile", 
            "Model turned 90 degrees to the side. Show the fit and silhouette from the side view. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props.", 
            inputs, optMain, optBack, optModel));

        // 4. Back Shot - WHITE BG
        const backPrompt = optBack 
            ? "Model turned 180 degrees showing the back. Use the 'BACK VIEW REFERENCE' for accurate design details. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props." 
            : "Model turned 180 degrees showing the back. Hallucinate a clean, standard back design consistent with the front. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props.";
        tasks.push(generateVariant("Back View", backPrompt, inputs, optMain, optBack, optModel));

        // 5. Texture Close-up
        tasks.push(generateVariant("Fabric Detail", 
            "Macro close-up shot of the chest/torso area. Focus strictly on the fabric texture, stitching quality, and material details. High sharpness.", 
            inputs, optMain, optBack, optModel));

    } else {
        // --- PRODUCT BATCH ---

        // 1. Hero Front View - WHITE BG
        tasks.push(generateVariant("Hero Front View", 
            "Direct Front View or Top-Down View (whichever suits the product best). Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** Perfect symmetry. No props.", 
            inputs, optMain, null, null));

        // 2. Back View - WHITE BG (New)
        const backPrompt = optBack
            ? "Direct Back View of the product. Use the 'BACK VIEW REFERENCE' to perfectly recreate the back side details (ports, labels, texture). Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).**"
            : "Direct Back View of the product. **CRITICAL**: Hallucinate a realistic back side consistent with the front design logic (e.g. if it's a bottle, show the back label or plain glass; if electronics, show ports/vents). Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).**";
        tasks.push(generateVariant("Back View", backPrompt, inputs, optMain, optBack, null));

        // 3. Hero Angle (45 deg) - WHITE BG
        tasks.push(generateVariant("Hero 45-Degree", 
            "Classic E-commerce Hero Shot. Product at a 45-degree angle. Subject to occupy **85% of the canvas** with equal padding. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** Soft natural contact shadow only. No props, no watermarks.", 
            inputs, optMain, null, null));

        // 4. Lifestyle Model
        tasks.push(generateVariant("Lifestyle Usage", 
            "A human model using/holding the product in a natural environment. Focus on the interaction and utility.", 
            inputs, optMain, null, null));

        // 5. Macro Detail
        tasks.push(generateVariant("Build Quality Macro", 
            "Extreme close-up macro shot. Focus on the material finish, buttons, or texture to highlight build quality. Shallow depth of field.", 
            inputs, optMain, null, null));
    }

    // Execute all 5 in parallel
    // We use Promise.allSettled to ensure if one fails, we still get the others (handled in UI)
    const results = await Promise.all(tasks);
    return results;
};
