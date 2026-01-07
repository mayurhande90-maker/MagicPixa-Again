import { Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";

// Export MockupSuggestion interface to resolve ReferenceError in MagicMockupStaging.tsx
export interface MockupSuggestion {
    title: string;
    reasoning: string;
    targetObject: string;
    material: string;
    sceneVibe: string;
    objectColor: string;
}

export const analyzeMockupSuggestions = async (base64: string, mimeType: string, brand?: any): Promise<MockupSuggestion[]> => {
    return await callWithRetry<MockupSuggestion[]>(async () => {
        const ai = getAiClient();
        const prompt = `Suggest mockups for this design. Return JSON array.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const generateMagicMockup = async (
    designBase64: string,
    designMime: string,
    targetObject: string,
    material: string,
    sceneVibe: string,
    objectColor?: string,
    brand?: any
): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const prompt = `Generate photorealistic mockup of ${targetObject}. Style: ${sceneVibe}. Material: ${material}.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: designBase64, mimeType: designMime } }, { text: prompt }] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    });
};