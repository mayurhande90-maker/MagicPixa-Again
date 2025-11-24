
import { Type, Modality } from "@google/genai";
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

export interface AdStrategy {
    type: string;
    visualPrompt: string;
    reasoning: string;
}

/**
 * Analyzes the product and audience to generate 4 distinct ad strategies.
 */
export const analyzeAdStrategy = async (
    base64ImageData: string,
    mimeType: string,
    productName: string,
    targetAudience: string
): Promise<AdStrategy[]> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `You are a World-Class Performance Marketing Strategist.

    INPUTS:
    - Product Image (attached).
    - Product Name: "${productName}".
    - Target Audience: "${targetAudience}".

    TASK:
    Analyze the product and audience. Develop 4 distinct visual strategies (Psychological Hooks) for an ad campaign.

    1. **Pain/Solution**: A visual showing the product solving a specific problem or pain point for this audience.
    2. **Social Proof**: A lifestyle/UGC-style shot that looks authentic, showing the product being used happily by a person matching the audience.
    3. **Luxury/Authority**: A high-end, clean, premium studio shot that builds trust and perceived value.
    4. **Urgency/Impact**: A high-contrast, bold, creative composition designed to stop the scroll immediately.

    OUTPUT JSON ARRAY:
    [
      {
        "type": "Pain/Solution",
        "visualPrompt": "Detailed image generation prompt describing the scene...",
        "reasoning": "Why this works..."
      },
      ... (for all 4 types)
    ]`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: prompt },
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        visualPrompt: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['type', 'visualPrompt', 'reasoning']
                }
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Analysis failed to generate response.");
    return JSON.parse(text);
};

/**
 * Generates a single ad variant based on a specific strategy prompt.
 */
export const generateAdVariantImage = async (
    base64ImageData: string,
    mimeType: string,
    visualPrompt: string
): Promise<string> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `Professional Product Photography Generation.

    SCENE DESCRIPTION: ${visualPrompt}

    CRITICAL GUIDELINES:
    1. **Identity Preservation**: The product must look EXACTLY like the input image. Do not alter logos or text on the product.
    2. **Realism**: Photorealistic output. High-end commercial lighting. 85mm lens.
    3. **Scale**: Ensure the product is sized correctly relative to the props or models.
    4. **Aspect Ratio**: 1:1 (Square) for social media feed.

    Output only the image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: '1:1',
                imageSize: "1K"
            }
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate image.`);
};
