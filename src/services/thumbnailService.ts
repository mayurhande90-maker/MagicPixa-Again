import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1024px
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

interface ThumbnailInputs {
    format: 'landscape' | 'portrait';
    category: string;
    title: string;
    customText?: string; 
    referenceImage?: { base64: string; mimeType: string } | null; 
    subjectImage?: { base64: string; mimeType: string } | null; 
    hostImage?: { base64: string; mimeType: string } | null; 
    guestImage?: { base64: string; mimeType: string } | null;
    elementImage?: { base64: string; mimeType: string } | null; 
}

const performTrendResearch = async (category: string, title: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `Research viral thumbnail trends for category: "${category}" and topic: "${title}". Output JSON blueprint.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { colorPalette: { type: Type.STRING }, compositionRule: { type: Type.STRING }, emotionVibe: { type: Type.STRING }, textStyle: { type: Type.STRING }, lightingStyle: { type: Type.STRING } },
                    required: ["colorPalette", "compositionRule", "emotionVibe", "textStyle", "lightingStyle"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return { colorPalette: "High Contrast", compositionRule: "Subject Focused", emotionVibe: "High Energy", textStyle: "Bold Sans", lightingStyle: "Rim Lighting" }; }
};

export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    try {
        const blueprint = await performTrendResearch(inputs.category, inputs.title);
        const parts: any[] = [];
        
        const brandDNA = brand ? `
        *** BRAND OVERRIDE (CRITICAL) ***
        Brand: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Professional'}.
        Target Colors: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
        Font Style: ${brand.fonts.heading}.
        Instruction: Ensure all text overlays and background highlights use these brand colors.
        ` : "";

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }
        
        if (inputs.subjectImage) {
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "SUBJECT:" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
        }

        let prompt = `You are an Elite Designer. ${brandDNA}
        GOAL: Hyper-Realistic ${inputs.format} Thumbnail. Topic: "${inputs.title}".
        TRENDS: ${blueprint.colorPalette}, ${blueprint.compositionRule}.
        1. Render Text: "${inputs.customText || inputs.title}". Style: Bold, large, high-contrast.
        2. Realism: 1:1 face likeness, pro skin texture, studio optics.
        OUTPUT: High-res single image.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.format === 'portrait' ? '9:16' : '16:9' }
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Generation failed.");
    } catch (error) { throw error; }
};