import { GoogleGenAI, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { callWithRetry } from "./geminiClient";

/**
 * AI CORE: The "Shield" and "Engine Room" of MagicPixa.
 * Centralized logic for high-fidelity image production.
 */

// --- GLOBAL MANDATES ---

const IDENTITY_LOCK_PROTOCOL = `
*** IDENTITY LOCK v5 (SACRED ASSET MANDATE) ***
1. PIXEL INTEGRITY: Preserve the subject's exact geometry, silhouette, and proportions.
2. LABEL CLARITY: All text, logos, and labels must remain 100% legible and unaltered.
3. MATERIAL FIDELITY: Match physical properties (glass, metal, fabric).
`;

const HYPER_REALISM_MANDATE = `
*** PRODUCTION-GRADE OPTICS PROTOCOL ***
1. RAY-TRACED SHADOWS: Ensure dark, sharp ambient occlusion shadows at the contact point.
2. GLOBAL ILLUMINATION: Realistic light bounce between environment and subject.
3. DEPTH OF FIELD: Professional Gaussian bokeh on the background.
`;

// --- CORE UTILITIES ---

const optimizeForAi = async (base64: string, mimeType: string, width: number = 1024): Promise<{ data: string; mimeType: string }> => {
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
 * Orchestrates the strategy, the asset, and the mandates using Gemini 3 Pro.
 */
export const executeImageGeneration = async (params: {
    sourceImage: { base64: string, mimeType: string };
    strategyPrompt: string;
    brand?: BrandKit | null;
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    additionalAssets?: { base64: string, mimeType: string, role: string }[];
}): Promise<string> => {
    
    // 1. Optimize Main Asset
    const optMain = await optimizeForAi(params.sourceImage.base64, params.sourceImage.mimeType, 1536);
    
    // 2. Build Brand DNA
    const brandDNA = params.brand ? `
    *** BRAND DNA OVERRIDE ***
    Company: '${params.brand.companyName || params.brand.name}'
    Tone: ${params.brand.toneOfVoice || 'Professional'}
    Palette: Primary=${params.brand.colors.primary}, Accent=${params.brand.colors.accent}
    Instruction: Subtlely infuse brand colors into the environment.
    ` : "";

    // 3. Assemble Payload
    const parts: any[] = [
        { inlineData: { data: optMain.data, mimeType: optMain.mimeType } }
    ];

    if (params.additionalAssets) {
        for (const asset of params.additionalAssets) {
            const optAsset = await optimizeForAi(asset.base64, asset.mimeType, 512);
            parts.push({ inlineData: { data: optAsset.data, mimeType: optAsset.mimeType } });
        }
    }

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
    // We create the AI instance INSIDE the retry loop to pick up key selection changes.
    const response = await callWithRetry<GenerateContentResponse>(async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        return await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: {
                imageConfig: {
                    aspectRatio: params.aspectRatio || "1:1",
                    imageSize: "1K"
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            }
        });
    });

    // Robust extraction of image part
    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
        console.error("Gemini API Response lacks image data:", response);
        throw new Error("AI Production Engine failed to render pixels.");
    }
    
    return imagePart.inlineData.data;
};
