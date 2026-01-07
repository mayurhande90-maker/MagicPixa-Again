import { GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        return { data: base64, mimeType };
    }
};

export interface RealtyInputs {
    propertyImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    targetAudience: 'luxury' | 'investor' | 'family';
    sellingPoints: string[];
    texts: {
        projectName: string;
        configuration: string;
        contact: string;
        location: string;
    };
}

export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType) : null;

        const prompt = `You are an Expert Real Estate Designer.
        TASK: Design high-end ad for ${inputs.texts.projectName}.
        AUDIENCE: ${inputs.targetAudience.toUpperCase()}.
        OUTPUT: Fully designed 4K image.`;

        const parts: any[] = [{ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } }];
        if (optLogo) parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } },
        });

        const final = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
        if (!final) throw new Error("Ad generation failed.");
        return final;
    });
};
