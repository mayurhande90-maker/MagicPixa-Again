import { Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
// Import Base64File for input types
import { Base64File } from "../utils/imageUtils";

// Define and export AdMakerInputs to resolve ReferenceError in PixaAdMaker.tsx
export interface AdMakerInputs {
    industry: 'ecommerce' | 'fmcg' | 'fashion' | 'realty' | 'food' | 'saas' | 'education' | 'services';
    mainImages: Base64File[];
    logoImage?: Base64File | null;
    referenceImage?: Base64File | null;
    vibe: string;
    productName: string;
    website: string;
    offer: string;
    description: string;
    layoutTemplate: string;
    aspectRatio: '1:1' | '4:5' | '9:16';
    modelSource: 'ai' | 'upload' | null;
    modelImage?: Base64File | null;
    modelParams?: {
        modelType: string;
        region: string;
        skinTone: string;
        bodyType: string;
        composition: string;
        framing: string;
    };
}

// Updated signature to use AdMakerInputs
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: any): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const parts: any[] = [];
        // Simplified parts building for ad creation
        const prompt = `Create high-conversion ad. Industry: ${inputs.industry}.`;
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Ad Production engine failed to render.");
    });
};

export const refineAdCreative = async (base64Result: string, mimeType: string, instruction: string): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const prompt = `Refine ad: ${instruction}`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Result, mimeType } },
                    { text: prompt }
                ]
            }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    });
};