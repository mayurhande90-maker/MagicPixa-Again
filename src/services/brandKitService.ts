
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

export interface CampaignAnalysis {
    visualDirection: string;
    headline: string;
    caption: string;
    colorPalette: string[];
}

/**
 * Analyzes the product and research trending aesthetics for the selected occasion.
 */
export const analyzeCampaignTrends = async (
    base64ImageData: string,
    mimeType: string,
    occasion: string,
    brandName: string
): Promise<CampaignAnalysis> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `You are a Creative Director for a top advertising agency.
    
    INPUTS:
    - Product Image (attached).
    - Brand Name: "${brandName}".
    - Campaign Occasion/Theme: "${occasion}".
    
    TASK:
    1. **PRODUCT ANALYSIS**: Identify the product type, color, and material.
    2. **TREND RESEARCH**: Use Google Search to find the Visual Trends for "${occasion} 2025" advertising. What colors, lighting, and props are trending?
    3. **CREATIVE DIRECTION**: Formulate a cohesive visual style for a photoshoot that combines the Product with the Occasion.
    4. **COPYWRITING**: Write a short, punchy Headline (max 5 words) and a social media Caption.
    
    OUTPUT JSON:
    {
      "visualDirection": "Detailed description of background, lighting, props, and mood for the image generator...",
      "headline": "Catchy headline...",
      "caption": "Social media caption...",
      "colorPalette": ["#hex", "#hex", "#hex", "#hex", "#hex"]
    }`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: prompt },
            ]
        },
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visualDirection: { type: Type.STRING },
                    headline: { type: Type.STRING },
                    caption: { type: Type.STRING },
                    colorPalette: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ['visualDirection', 'headline', 'caption', 'colorPalette']
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Analysis failed to generate response.");
    return JSON.parse(text);
};

/**
 * Generates a campaign asset with a specific aspect ratio.
 */
export const generateCampaignAsset = async (
    base64ImageData: string,
    mimeType: string,
    visualDirection: string,
    aspectRatio: '1:1' | '9:16' | '16:9'
): Promise<string> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    let compositionRule = "";
    if (aspectRatio === '1:1') {
        compositionRule = "Square composition. Center the product. Leave some negative space around it.";
    } else if (aspectRatio === '9:16') {
        compositionRule = "Portrait/Vertical composition (Story format). Place product in the lower-center or center. Leave significant NEGATIVE SPACE at the TOP and BOTTOM for UI elements/text.";
    } else if (aspectRatio === '16:9') {
        compositionRule = "Landscape/Wide composition (Banner format). Place product to the LEFT or RIGHT side. Leave clear negative space on the other side for text.";
    }

    const prompt = `Professional Product Photography for an Ad Campaign.
    
    SCENE DESCRIPTION: ${visualDirection}
    
    COMPOSITION RULES (${aspectRatio}):
    ${compositionRule}
    
    CRITICAL GUIDELINES:
    1. **Identity Preservation**: The product must look EXACTLY like the input image. Do not alter logos or text on the product.
    2. **Realism**: Photorealistic output. High-end commercial lighting. 85mm lens.
    3. **Scale**: Ensure the product is sized correctly relative to the props.
    4. **No Text**: Do NOT generate any text on the background. The user will add text overlays later.
    
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
                aspectRatio: aspectRatio,
                imageSize: "1K"
            }
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate ${aspectRatio} image.`);
};
