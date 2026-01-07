import { Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit, ProductAnalysis } from "../types";
import { resizeImage } from "../utils/imageUtils";

// Export CalendarPost interface to resolve ReferenceError in PixaPlanner.tsx
export interface CalendarPost {
    id: string;
    date: string;
    dayLabel: string;
    topic: string;
    caption: string;
    hashtags: string;
    postType: 'Ad' | 'Lifestyle';
    visualBrief: string;
    imagePrompt: string;
    selectedProductId: string;
}

// Export PlanConfig interface to resolve ReferenceError in PixaPlanner.tsx
export interface PlanConfig {
    month: string;
    year: number;
    goal: string;
    frequency: string;
    country: string;
    mixType: 'Balanced' | 'Ads Only' | 'Lifestyle Only';
}

export const analyzeProductPhysically = async (
    productId: string,
    base64: string,
    mimeType: string
): Promise<ProductAnalysis> => {
    return await callWithRetry<ProductAnalysis>(async () => {
        const ai = getAiClient();
        const prompt = `Audit product image. Return JSON.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return { ...JSON.parse(response.text || "{}"), id: productId };
    });
};

export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: any,
    productAsset: any,
    productAudit: any,
    moodBoardAssets: any[] = []
): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const parts: any[] = [];
        if (productAsset) parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
        const prompt = `Render 4:5 masterpiece. Topic: ${post.topic}. Style: ${post.visualBrief}.`;
        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { imageConfig: { aspectRatio: "4:5", imageSize: "1K" } },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        return imagePart?.inlineData?.data || "";
    });
};

export const generateContentPlan = async (brand: BrandKit, config: PlanConfig, audits: any): Promise<CalendarPost[]> => {
    return await callWithRetry<CalendarPost[]>(async () => {
        const ai = getAiClient();
        const prompt = `Generate ${config.frequency} content plan for ${brand.companyName}. Return JSON array.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }] },
            config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    });
};

export const extractPlanFromDocument = async (brand: BrandKit, base64: string, mimeType: string): Promise<CalendarPost[]> => {
    return await callWithRetry<CalendarPost[]>(async () => {
        const ai = getAiClient();
        const prompt = `Extract plan from document. Return JSON array.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    });
};