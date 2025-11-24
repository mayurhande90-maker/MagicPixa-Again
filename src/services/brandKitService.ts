
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

export interface BrandAnalysis {
    identity: {
        colors: string[]; // Hex codes
        fonts: string[];
        vibe: string;
    };
    copywriting: {
        slogans: string[];
        socialCaptions: string[];
        hashtags: string[];
    };
    prompts: {
        ecommerce: string;
        lifestyle: string;
        model: string;
        adCreative: string;
    };
}

export const analyzeBrandKit = async (
    base64ImageData: string,
    mimeType: string,
    productName?: string
): Promise<BrandAnalysis> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `Act as a World-Class Brand Director and Visual Strategist.
    
    INPUT: A raw product photo.
    PRODUCT NAME: "${productName || 'The Product'}".
    
    YOUR TASK:
    Analyze the image to understand the product type, material, packaging, and aesthetics.
    Then, generate a complete BRAND KIT and MARKETING PLAN.
    
    1. **BRAND IDENTITY**: Define 5 dominant brand colors (Hex codes), 2 matching font styles, and a 3-word "Vibe" description.
    2. **COPYWRITING**: Write 3 catchy slogans, 3 social media captions, and 10 relevant hashtags.
    3. **VISUAL PROMPTS**: Write 4 highly detailed, photorealistic image generation prompts for this specific product:
       - **ecommerce**: A clean, professional e-commerce shot on a pure white background with soft shadows. Focus on clarity.
       - **lifestyle**: A natural, high-end lifestyle shot showing the product in its ideal environment (e.g., kitchen, desk, vanity, outdoors).
       - **model**: A photorealistic shot of a human model (appropriate for the product) holding or using the product naturally.
       - **adCreative**: A high-impact, creative advertising visual (e.g., splashing water, levitating, neon lighting, dramatic podium) suitable for a premium ad.

    Output strictly valid JSON matching the schema.`;

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
                type: Type.OBJECT,
                properties: {
                    identity: {
                        type: Type.OBJECT,
                        properties: {
                            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                            fonts: { type: Type.ARRAY, items: { type: Type.STRING } },
                            vibe: { type: Type.STRING }
                        },
                        required: ['colors', 'fonts', 'vibe']
                    },
                    copywriting: {
                        type: Type.OBJECT,
                        properties: {
                            slogans: { type: Type.ARRAY, items: { type: Type.STRING } },
                            socialCaptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ['slogans', 'socialCaptions', 'hashtags']
                    },
                    prompts: {
                        type: Type.OBJECT,
                        properties: {
                            ecommerce: { type: Type.STRING },
                            lifestyle: { type: Type.STRING },
                            model: { type: Type.STRING },
                            adCreative: { type: Type.STRING }
                        },
                        required: ['ecommerce', 'lifestyle', 'model', 'adCreative']
                    }
                },
                required: ['identity', 'copywriting', 'prompts']
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Analysis failed to generate response.");
    return JSON.parse(text);
};

export const generateBrandAsset = async (
    base64ImageData: string,
    mimeType: string,
    prompt: string,
    assetType: string
): Promise<string> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const finalPrompt = `You are a professional product photographer and editor.
    
    TASK: Generate a "${assetType}" image for the provided product.
    SPECIFIC INSTRUCTION: ${prompt}
    
    CRITICAL RULES:
    1. **Identity Preservation**: The product in the generated image MUST look exactly like the input image (same logo, shape, colors, labels). Do not hallucinate a different product.
    2. **Realism**: The output must be a photorealistic photograph, not a 3D render or cartoon (unless specified in prompt).
    3. **Scale**: Ensure the product is sized correctly relative to the environment or model.
    4. **Quality**: High resolution, sharp focus, professional lighting.
    
    Output only the image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: finalPrompt },
            ],
        },
        config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate ${assetType} image.`);
};
