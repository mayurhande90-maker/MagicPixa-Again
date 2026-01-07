import { Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";

export const generateStyledBrandAsset = async (
    productBase64: string,
    productMime: string,
    referenceBase64: string | undefined,
    referenceMime: string | undefined,
    logoBase64: string | undefined,
    logoMime: string | undefined,
    productName: string,
    website: string,
    specialOffer: string,
    address: string,
    productDescription: string,
    mode: 'replica' | 'remix' = 'replica',
    language: string = 'English',
    campaignType: 'physical' | 'digital' = 'physical',
    brandColor?: string,
    fontStyle: string = 'Modern Sans'
): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const parts: any[] = [{ inlineData: { data: productBase64, mimeType: productMime } }];
        if (referenceBase64 && referenceMime) parts.push({ inlineData: { data: referenceBase64, mimeType: referenceMime } });
        if (logoBase64 && logoMime) parts.push({ inlineData: { data: logoBase64, mimeType: logoMime } });
        
        const prompt = `Create high-conversion ad for ${productDescription}. Mode: ${mode}.`;
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                imageConfig: { aspectRatio: "1:1", imageSize: "1K" },
                safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }]
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    });
};
