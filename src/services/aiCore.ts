import { GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { callWithRetry } from "./geminiClient";

/**
 * AI CORE: The "Shield" and "Engine Room" of MagicPixa.
 * This service centralizes all AI logic, safety, and realism mandates.
 */

// --- GLOBAL MANDATES (THE SECRET SAUCE) ---

const IDENTITY_LOCK_PROTOCOL = `
*** IDENTITY LOCK v4 (SACRED ASSET MANDATE) ***
1. PIXEL INTEGRITY: The subject in the source image is a 'Sacred Asset'. You must preserve its exact geometry, silhouette, and proportions.
2. LABEL CLARITY: All text, logos, and labels on the subject must remain 100% legible and unaltered. Do NOT hallucinate or smudge branding.
3. MATERIAL FIDELITY: Maintain the physical properties of the subject (e.g., glass must be refractive, metal must be specular, fabric must have weave).
`;

const HYPER_REALISM_MANDATE = `
*** PRODUCTION-GRADE OPTICS PROTOCOL ***
1. RAY-TRACED SHADOWS: Ensure dark, sharp ambient occlusion shadows where the subject meets the surface.
2. GLOBAL ILLUMINATION: Calculate realistic light bounce between the environment and the subject's edges.
3. DEPTH OF FIELD: Apply professional Gaussian bokeh to the background to keep the subject as the primary focal point.
4. MATERIAL PHYSICS: Light must wrap around the subject naturally based on its 3D geometry.
`;

// --- CORE UTILITIES ---

const optimizeForAi = async (base64: string, mimeType: string, width: number = 2048): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.9);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        return { data: base64, mimeType };
    }
};

/**
 * The Master Generator
 * Orchestrates the strategy, the asset, and the mandates.
 */
export const executeImageGeneration = async (params: {
    sourceImage: { base64: string, mimeType: string };
    strategyPrompt: string;
    brand?: BrandKit | null;
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    additionalAssets?: { base64: string, mimeType: string, role: string }[];
}): Promise<string> => {
    // Always create a new instance right before the call as per requirements.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // 1. Optimize Main Asset
    const optMain = await optimizeForAi(params.sourceImage.base64, params.sourceImage.mimeType);
    
    // 2. Build Brand DNA
    const brandDNA = params.brand ? `
    *** BRAND DNA OVERRIDE ***
    Company: '${params.brand.companyName || params.brand.name}'
    Tone: ${params.brand.toneOfVoice || 'Professional'}
    Palette: Primary=${params.brand.colors.primary}, Accent=${params.brand.colors.accent}
    Instruction: Subtlely infuse the brand's primary color into the lighting or environment accents.
    ` : "";

    // 3. Assemble Payload
    const parts: any[] = [
        { text: "SOURCE_ASSET_PRIMARY:" },
        { inlineData: { data: optMain.data, mimeType: optMain.mimeType } }
    ];

    // Add Supporting Assets (Vault references, logos, etc)
    if (params.additionalAssets) {
        params.additionalAssets.forEach((asset, i) => {
            parts.push({ text: `${asset.role.toUpperCase()}_${i}:` });
            parts.push({ inlineData: { data: asset.base64, mimeType: asset.mimeType } });
        });
    }

    // Add Instructions
    const finalPrompt = `
    You are the Pixa Production Engine.
    
    ${IDENTITY_LOCK_PROTOCOL}
    ${HYPER_REALISM_MANDATE}
    ${brandDNA}
    
    TASK STRATEGY: "${params.strategyPrompt}"
    
    OUTPUT: A single 4K photorealistic masterpiece.
    `;
    
    parts.push({ text: finalPrompt });

    // 4. Execute with Retry Logic
    // Switch to gemini-2.5-flash-image for default generations to ensure high stability.
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: {
            imageConfig: {
                aspectRatio: params.aspectRatio || "1:1"
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        }
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) throw new Error("AI Core failed to render pixels.");
    
    return imagePart.inlineData.data;
};