
import { Modality, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const generateStyledBrandAsset = async (
    productBase64: string,
    productMime: string,
    referenceBase64: string,
    referenceMime: string,
    context?: string
): Promise<string> => {
    const ai = getAiClient();
    
    const [optProduct, optRef] = await Promise.all([
        optimizeImage(productBase64, productMime),
        optimizeImage(referenceBase64, referenceMime)
    ]);

    // Step 1: Extract Style
    const stylePrompt = `Analyze this image's visual style in extreme detail. 
    Describe the lighting (soft, hard, cinematic, natural), color palette (hex codes if possible), composition (minimalist, chaotic, centered), texture (grain, smooth, matte), and overall mood. 
    
    IMPORTANT: Do NOT describe the specific objects in the image. Only describe the AESTHETIC STYLE and VIBE so it can be replicated.`;

    const styleResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data: optRef.data, mimeType: optRef.mimeType } },
                { text: stylePrompt }
            ]
        }
    });
    
    const styleDescription = styleResponse.text;
    if(!styleDescription) throw new Error("Failed to analyze reference style.");

    // Step 2: Generate
    const genPrompt = `Task: Professional Brand Photography.
    
    INPUTS:
    1. Product Image (Attached).
    2. Style Description: "${styleDescription}".
    ${context ? `3. Context/Brand Info: "${context}".` : ''}
    
    INSTRUCTIONS:
    - Place the exact Product from the input image into a new scene that perfectly matches the "Style Description".
    - **CRITICAL**: Preserve the product's identity (logo, shape, text) exactly.
    - Ensure the lighting on the product matches the scene's lighting described in the style.
    - If the style is "minimalist", keep it clean. If "moody", make it dramatic.
    - The final image must look like it belongs in the same campaign as the reference image.
    - Output photorealistic, high-resolution photography.
    
    Output only the image.`;

    const genResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: optProduct.data, mimeType: optProduct.mimeType } },
                { text: genPrompt }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const imagePart = genResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const generateBrandCopy = async (
    imageBase64: string,
    imageMime: string,
    context?: string
): Promise<{ headline: string; caption: string }> => {
    const ai = getAiClient();
    
    // No need to optimize heavily for text analysis, but consistency helps
    const { data, mimeType } = await optimizeImage(imageBase64, imageMime);

    const prompt = `You are a World-Class Copywriter.
    
    Look at this ad creative.
    ${context ? `Brand/Product Context: ${context}` : ''}
    
    Write two things:
    1. A punchy, high-impact Headline (3-6 words) that captures the exact mood of the image.
    2. A social media Caption (2 sentences) that engages the viewer and matches the visual vibe.
    
    Return JSON: { "headline": "...", "caption": "..." }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType } },
                { text: prompt }
            ]
        },
        config: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    headline: { type: Type.STRING },
                    caption: { type: Type.STRING }
                },
                required: ["headline", "caption"]
            }
        }
    });

    const text = response.text;
    if(!text) return { headline: "Experience the Difference", caption: "Elevate your style with our latest collection. Designed for those who appreciate quality." };
    
    try {
        return JSON.parse(text);
    } catch (e) {
        return { headline: "Experience the Difference", caption: "Elevate your style with our latest collection. Designed for those who appreciate quality." };
    }
}
