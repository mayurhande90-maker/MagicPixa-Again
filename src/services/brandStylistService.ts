
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
    logoBase64: string | undefined,
    logoMime: string | undefined,
    brandName: string,
    contactDetails: string,
    productDescription: string
): Promise<string> => {
    const ai = getAiClient();
    
    // Optimize images concurrently
    const [optProduct, optRef, optLogo] = await Promise.all([
        optimizeImage(productBase64, productMime),
        optimizeImage(referenceBase64, referenceMime),
        logoBase64 && logoMime ? optimizeImage(logoBase64, logoMime) : Promise.resolve(null)
    ]);

    // Step 1: Deep Analysis (The "Intelligent Planner")
    const analysisPrompt = `You are a Senior Creative Director and AI Layout Expert.
    
    INPUTS:
    1. **Reference Image** (The style/layout target).
    2. **Product Image** (The user's item).
    3. **User Brand Info**: Name="${brandName}", Contact="${contactDetails}", Context="${productDescription}".

    TASK:
    1. **Analyze Product**: Look at the Product Image. Identify what it is (e.g., "Coffee Bag", "Perfume Bottle"). Read any visible text on the packaging to understand the brand vibe.
    2. **Analyze Reference Layout**:
       - Where is the logo placed? (e.g., Top Right, Bottom Center).
       - Where is the main headline? What font style/size?
       - Is there contact info (website/phone) at the bottom?
       - What is the lighting/environment mood?
    3. **Create a Transfer Plan**:
       - If the Reference has a Logo, replace it with the User's Logo (or Brand Name text if no logo provided).
       - If the Reference has a Headline, write a NEW headline based on the User's Product Description that fits the reference vibe.
       - If the Reference has a website/phone number, replace it with "${contactDetails}".
    
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the product, logo, and text based on the reference...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style",
        "logoPlacement": "Description of where to place the user's logo (e.g. 'Top Right corner floating')",
        "textInstructions": "Specific instructions on font style and color to match reference"
    }`;

    const analysisResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: "REFERENCE IMAGE:" },
                { inlineData: { data: optRef.data, mimeType: optRef.mimeType } },
                { text: "PRODUCT IMAGE:" },
                { inlineData: { data: optProduct.data, mimeType: optProduct.mimeType } },
                { text: analysisPrompt }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visualStyle: { type: Type.STRING },
                    layoutPlan: { type: Type.STRING },
                    generatedHeadline: { type: Type.STRING },
                    logoPlacement: { type: Type.STRING },
                    textInstructions: { type: Type.STRING }
                },
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "logoPlacement"]
            }
        }
    });

    let blueprint;
    try {
        blueprint = JSON.parse(analysisResponse.text || "{}");
    } catch (e) {
        console.error("Analysis parsing failed", e);
        blueprint = {
            visualStyle: "Professional studio lighting",
            layoutPlan: "Center product, logo top right",
            generatedHeadline: "Premium Quality",
            logoPlacement: "Top corner",
            textInstructions: "Modern bold font"
        };
    }

    // Step 2: Generation (The "Executor")
    const parts: any[] = [];
    
    parts.push({ text: "MAIN PRODUCT:" });
    parts.push({ inlineData: { data: optProduct.data, mimeType: optProduct.mimeType } });
    
    if (optLogo) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    const genPrompt = `Task: Create a Final High-End Advertisement.
    
    **EXECUTION PLAN (Strictly Follow):**
    1. **SCENE**: Recreate the exact aesthetic described here: "${blueprint.visualStyle}".
    2. **PRODUCT**: Place the Main Product into this scene naturally. Maintain its identity, shape, and label text.
    3. **LAYOUT & COMPOSITION**: ${blueprint.layoutPlan}.
    
    **SMART TEXT & LOGO PLACEMENT (The "Intelligence" Layer):**
    - **HEADLINE**: Render the text "${blueprint.generatedHeadline}" in the main text area (where the reference had text). Style: ${blueprint.textInstructions}.
    - **LOGO**: ${optLogo ? `Place the provided USER LOGO at: ${blueprint.logoPlacement}. It must look printed or overlaid naturally.` : `Render the brand name "${brandName}" at: ${blueprint.logoPlacement} using a logo-like font.`}
    - **CONTACT INFO**: If the reference had a website/phone number at the bottom, render "${contactDetails || 'www.brand.com'}" there in small, clean text.
    
    **QUALITY CONTROL:**
    - Text must be spelled correctly.
    - Lighting on the product must match the new environment.
    - The final image should look like a finished graphic design piece, not just a photo.
    
    Output a single, high-resolution image.`;

    parts.push({ text: genPrompt });

    const genResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const imagePart = genResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};
