
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
    productDescription: string
): Promise<string> => {
    const ai = getAiClient();
    
    const [optProduct, optRef] = await Promise.all([
        optimizeImage(productBase64, productMime),
        optimizeImage(referenceBase64, referenceMime)
    ]);

    // Step 1: Deep Analysis & Copywriting (The "Creative Director")
    // We need to understand the visual style AND generate text that fits that style.
    const analysisPrompt = `You are a Creative Director and Typography Expert.
    
    INPUTS:
    1. Reference Image (Attached).
    2. Product Description: "${productDescription}".

    TASK:
    1. **Analyze Visual Style**: Describe the lighting, color palette, composition, and mood of the Reference Image in detail.
    2. **Analyze Typography**: Look at any text in the Reference Image. Describe the font style (Serif/Sans, Bold/Thin), placement (Center/Top/Corner), and color.
    3. **Write Copy**: Based on the "${productDescription}", write a short, punchy Headline (2-5 words) that fits this visual vibe.
    
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "typographyStyle": "Description of font style, size, and placement...",
        "generatedHeadline": "THE HEADLINE TEXT"
    }`;

    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data: optRef.data, mimeType: optRef.mimeType } },
                { text: analysisPrompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visualStyle: { type: Type.STRING },
                    typographyStyle: { type: Type.STRING },
                    generatedHeadline: { type: Type.STRING }
                },
                required: ["visualStyle", "typographyStyle", "generatedHeadline"]
            }
        }
    });

    let blueprint;
    try {
        blueprint = JSON.parse(analysisResponse.text || "{}");
    } catch (e) {
        console.error("Analysis parsing failed", e);
        // Fallback blueprint
        blueprint = {
            visualStyle: "Professional studio lighting, clean composition",
            typographyStyle: "Modern sans-serif font, bold, centered",
            generatedHeadline: "Premium Quality"
        };
    }

    // Step 2: Generation (The "Photographer & Designer")
    const genPrompt = `Task: Create a Final Advertisement Image.
    
    INPUTS:
    1. Product Image (Attached).
    2. Blueprint:
       - Style: "${blueprint.visualStyle}"
       - Text to Render: "${blueprint.generatedHeadline}"
       - Font/Layout: "${blueprint.typographyStyle}"
    
    INSTRUCTIONS:
    1. **COMPOSITION**: Recreate the exact aesthetic/scene of the style description.
    2. **PRODUCT PLACEMENT**: Place the attached Product Image into this scene naturally. Preserve its identity (logo/shape) exactly.
    3. **TEXT RENDERING (CRITICAL)**: You MUST render the text "${blueprint.generatedHeadline}" directly onto the image.
       - Use the font style and placement described in the blueprint.
       - Ensure the text is legible, high-quality, and integrated into the design (like a real ad).
       - Do NOT misspell the text.
    4. **LIGHTING**: Match the product lighting to the scene.
    
    Output a single, high-resolution, photorealistic advertisement image.`;

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
