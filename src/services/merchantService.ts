
import { Modality, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { logApiError, auth } from '../firebase';

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
    
    // Pack Size
    packSize?: 5 | 7 | 10;
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

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] }
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate ${role}`);
};

/**
 * Optimized Worker Pool Executor.
 * Instead of waiting for chunks, this starts a new task immediately as one finishes.
 * This significantly reduces total batch time by eliminating idle waits.
 */
const runBatchWithConcurrency = async <T>(tasks: (() => Promise<T>)[], concurrency: number = 3): Promise<T[]> => {
    const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
    let taskIndex = 0;

    const worker = async () => {
        while (true) {
            // Atomically grab the next index
            const i = taskIndex++;
            if (i >= tasks.length) break;
            
            try {
                // Execute task
                const res = await tasks[i]();
                results[i] = res;
            } catch (error) {
                console.warn(`Batch Task ${i} failed`, error);
                const userId = auth?.currentUser?.uid;
                logApiError('Merchant Batch Item', (error as any)?.message || 'Unknown Batch Error', userId);
                // We do NOT stop the other workers. We just log the failure.
            }
        }
    };

    // Spawn workers
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    
    // Wait for all workers to drain the queue
    await Promise.all(workers);

    // Return only successful results
    return results.filter((r): r is T => r !== undefined);
};

/**
 * Main function to orchestrate the batch of 5, 7, or 10 images.
 */
export const generateMerchantBatch = async (inputs: MerchantInputs): Promise<string[]> => {
    // 1. Optimize Assets once
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optBack = inputs.backImage ? await optimizeImage(inputs.backImage.base64, inputs.backImage.mimeType) : null;
    const optModel = inputs.modelImage ? await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType) : null;

    // Define Task Definitions (Not executing yet)
    const taskDefinitions: { role: string, prompt: string }[] = [];
    const packSize = inputs.packSize || 5;

    if (inputs.type === 'apparel') {
        // --- APPAREL BATCH ---
        taskDefinitions.push({ role: "Hero Long Shot", prompt: "Standard E-commerce Catalog Shot. Full body. Model standing neutrally facing forward. Arms relaxed by side. **CRITICAL: Hands must NOT obstruct the garment.** Subject to occupy **85% of the canvas** with equal padding. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props." });
        taskDefinitions.push({ role: "Editorial Stylized", prompt: "Street style or lifestyle context. Background should be a blurred city street, cafe, or park (matching the outfit vibe). Dynamic pose. Cinematic lighting." });
        taskDefinitions.push({ role: "Side Profile", prompt: "Model turned 90 degrees to the side. Show the fit and silhouette from the side view. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props." });
        
        const backPrompt = optBack 
            ? "Model turned 180 degrees showing the back. Use the 'BACK VIEW REFERENCE' for accurate design details. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props." 
            : "Model turned 180 degrees showing the back. Hallucinate a clean, standard back design consistent with the front. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** No props.";
        taskDefinitions.push({ role: "Back View", prompt: backPrompt });
        
        taskDefinitions.push({ role: "Fabric Detail", prompt: "Macro close-up shot of the chest/torso area. Focus strictly on the fabric texture, stitching quality, and material details. High sharpness." });

        if (packSize >= 7) {
            taskDefinitions.push({ role: "Lifestyle Alternative", prompt: "Indoor lifestyle setting. Model posing naturally in a modern living room or clean studio space with soft furniture. Relaxed vibe. Soft daylight." });
            taskDefinitions.push({ role: "Creative Studio", prompt: "Fashion Editorial. Model posing against a solid pastel or vibrant colored background that complements the garment color. Artistic lighting. High fashion feel." });
        }

        if (packSize >= 10) {
            taskDefinitions.push({ role: "Golden Hour Outdoor", prompt: "Outdoor shot during Golden Hour. Warm sunlight backlighting the model. Dreamy, aspirational vibe. Nature or cityscape background." });
            taskDefinitions.push({ role: "Action Movement", prompt: "Dynamic motion shot. Model walking briskly or twirling. Capture the fabric movement and flow. Energetic atmosphere." });
            taskDefinitions.push({ role: "Minimalist Architecture", prompt: "High-end fashion shoot. Model posing against concrete or marble architectural elements. Minimalist geometry. Cool tones." });
        }

    } else {
        // --- PRODUCT BATCH ---
        taskDefinitions.push({ role: "Hero Front View", prompt: "Direct Front View or Top-Down View (whichever suits the product best). Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** Perfect symmetry. No props." });
        
        const prodBackPrompt = optBack
            ? "Direct Back View of the product. Use the 'BACK VIEW REFERENCE' to perfectly recreate the back side details. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).**"
            : "Direct Back View of the product. Hallucinate a realistic back side consistent with the front design logic. Subject to occupy **85% of the canvas**. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).**";
        taskDefinitions.push({ role: "Back View", prompt: prodBackPrompt });

        taskDefinitions.push({ role: "Hero 45-Degree", prompt: "Classic E-commerce Hero Shot. Product at a 45-degree angle. Subject to occupy **85% of the canvas** with equal padding. **BACKGROUND: SOLID PURE WHITE (#FFFFFF).** Soft natural contact shadow only. No props." });
        taskDefinitions.push({ role: "Lifestyle Usage", prompt: "A human model using/holding the product in a natural environment. Focus on the interaction and utility." });
        taskDefinitions.push({ role: "Build Quality Macro", prompt: "Extreme close-up macro shot. Focus on the material finish, buttons, or texture to highlight build quality. Shallow depth of field." });

        if (packSize >= 7) {
            taskDefinitions.push({ role: "Contextual Environment", prompt: "Product placed on a table/desk/surface in a realistic room setting (e.g. Living room, Office, or Kitchen depending on item). Blurred background. 'In-situ' look." });
            taskDefinitions.push({ role: "Creative Ad", prompt: `High-impact advertising shot. Product on a podium or artistic surface. Dramatic studio lighting. ${inputs.productVibe || 'Luxury'} aesthetic.` });
        }

        if (packSize >= 10) {
            taskDefinitions.push({ role: "Flat Lay Composition", prompt: "Top-down 'Flat Lay' photography. Product arranged neatly on a colored or textured surface with minimal relevant props (e.g. leaves, coffee, tech accessories). Organized and aesthetic." });
            taskDefinitions.push({ role: "In-Hand Scale", prompt: "Shot of a hand holding the product to show scale and grip. Neutral background. Focus on the hand-product interaction." });
            
            const vibePrompt = (inputs.productVibe || '').toLowerCase().includes('tech') 
                ? "Dark background with neon rim lighting. Cyberpunk/Tech vibe." 
                : "Outdoor nature setting with sunlight dapples and organic textures (wood/stone).";
            taskDefinitions.push({ role: "Dramatic Vibe", prompt: `Stylized mood shot. ${vibePrompt} Highlight the product silhouette.` });
        }
    }

    // Convert definitions to executable functions (Thunks)
    const taskThunks = taskDefinitions.map(def => 
        () => generateVariant(def.role, def.prompt, inputs, optMain, optBack, optModel)
    );

    // Execute with Worker Pool.
    // Concurrency set to 3 to optimize speed while remaining safe for most API keys.
    const results = await runBatchWithConcurrency(taskThunks, 3);
    
    return results;
};
