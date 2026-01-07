import { Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages } from "../firebase";
import { executeImageGeneration } from "./aiCore";

/**
 * PIXA PRODUCT SHOTS (SPECIALIST SERVICE)
 * Focuses on photography-specific prompt strategies.
 */

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    return await callWithRetry<string[]>(async () => {
        const ai = getAiClient();
        // Incorporate brand context if available to sharpen suggestions.
        const brandCtx = brand ? `This is for the brand '${brand.companyName || brand.name}'. ` : "";
        const prompt = `${brandCtx}Analyze product. Suggest 4 high-end commercial photography concepts. Return ONLY a JSON array of strings.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<{ display: string; prompt: string }[]> => {
    return await callWithRetry<{ display: string; prompt: string }[]>(async () => {
        const ai = getAiClient();
        const brandCtx = brand ? `This is for the brand '${brand.companyName || brand.name}'. ` : "";
        const prompt = `${brandCtx}Analyze product. Suggest 3 concepts for model photoshoot where someone is using or holding the product. 
        Return ONLY a JSON array of objects: { "display": "Short Label", "prompt": "Full detailed prompt for AI" }`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        results: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    display: { type: Type.STRING },
                                    prompt: { type: Type.STRING }
                                },
                                required: ["display", "prompt"]
                            }
                        }
                    },
                    required: ["results"]
                }
            }
        });
        const data = JSON.parse(response.text || "{}");
        return data.results || [{ display: "Lifestyle", prompt: "A model using the product in a natural lifestyle setting." }];
    });
};

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string,
  brand?: BrandKit | null
): Promise<string> => {
    // 1. Fetch Vault context
    let additionalAssets: any[] = [];
    try {
        const refs = await getVaultImages('studio');
        const selectedRefs = refs.sort(() => 0.5 - Math.random()).slice(0, 2);
        additionalAssets = await Promise.all(selectedRefs.map(async (r) => {
            const res = await urlToBase64(r.imageUrl);
            return { base64: res.base64, mimeType: res.mimeType, role: 'style_reference' };
        }));
    } catch (e) { console.warn("Vault bypass", e); }

    // 2. Delegate to AI Core
    const strategy = `
    ACT AS: A World-Class Commercial Product Photographer.
    CONCEPT: "${styleInstructions}"
    TECHNICAL: Use sharp focus, 85mm lens aesthetic, and premium color grading.
    `;

    return await executeImageGeneration({
        sourceImage: { base64: base64ImageData, mimeType },
        strategyPrompt: strategy,
        brand,
        additionalAssets
    });
};

export const generateModelShot = async (
    base64ImageData: string,
    mimeType: string,
    inputs: { modelType: string; region?: string; skinTone?: string; bodyType?: string; composition?: string; framing?: string; freeformPrompt?: string; },
    brand?: BrandKit | null
): Promise<string> => {
    const userDirection = inputs.freeformPrompt || `Model: ${inputs.modelType}, Region: ${inputs.region}, Skin: ${inputs.skinTone}, Body: ${inputs.bodyType}, Composition: ${inputs.composition}, Framing: ${inputs.framing}`;

    const strategy = `
    ACT AS: A High-End Fashion & Lifestyle Photographer.
    GOAL: Render a photorealistic model interacting with the product.
    SCENE: ${userDirection}
    PHYSICS: Model must naturally hold or wear the subject with accurate contact shadows.
    `;

    return await executeImageGeneration({
        sourceImage: { base64: base64ImageData, mimeType },
        strategyPrompt: strategy,
        brand
    });
};

export const refineStudioImage = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    featureContext: string = "Commercial Product Shot"
): Promise<string> => {
    const strategy = `
    ACT AS: An Elite Professional Retoucher.
    CONTEXT: This is a ${featureContext}.
    TASK: Apply this refinement strictly while keeping the rest of the image identical: "${instruction}"
    `;

    return await executeImageGeneration({
        sourceImage: { base64: base64Result, mimeType },
        strategyPrompt: strategy
    });
};
