
import { Modality, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Optimize images to 1024px to manage token limits with multiple images
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

interface RealtyInputs {
    mode: 'lifestyle_fusion' | 'new_property';
    modelImage?: { base64: string; mimeType: string } | null;
    propertyImage?: { base64: string; mimeType: string } | null;
    referenceImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    texts: {
        headline: string;
        subHeadline: string;
        location: string;
        price?: string;
        rera?: string;
        contact?: string;
    };
}

export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];

    // 1. Process Images
    const optReference = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
    parts.push({ text: "REFERENCE STYLE (Vibe, Lighting, Layout):" });
    parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        parts.push({ text: "LOGO (Place in top corner or bottom footer):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        parts.push({ text: "LIFESTYLE MODEL (Fuse into scene):" });
        parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        parts.push({ text: "PROPERTY IMAGE (Main Subject):" });
        parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    // 2. Build Prompt
    let prompt = `You are a High-End Real Estate Marketing AI using Gemini 3 Pro.
    
    TASK: Create a luxury real estate advertisement/flyer.
    MODE: ${inputs.mode === 'lifestyle_fusion' ? 'Lifestyle Fusion (Blend Model + Property)' : 'New Property Generation (Visualize Concept)'}.
    
    *** INPUTS ***
    - Reference Image: Copy the color grading (e.g., Golden Hour, Blue Hour), layout structure, and font style.
    - ${inputs.propertyImage ? 'Property Image: Enhance this photo. Fix sky, lighting, and clarity.' : 'NO PROPERTY PHOTO: Generate a photorealistic building/interior matching the Reference Vibe.'}
    - ${inputs.modelImage ? 'Model Photo: Seamlessly integrate this person into the foreground/midground.' : 'No specific model provided.'}
    
    *** LAYOUT & TEXT RULES (STRICT) ***
    - **FLYER COMPOSITION**: Reserve the BOTTOM 20% of the image as a clean, solid/gradient "Footer Bar" or negative space for contact details.
    - **TEXT PLACEMENT**:
      1. **HEADLINE**: "${inputs.texts.headline}" -> Big, Bold, Elegant Serif or Sans-Serif (Match Reference).
      2. **SUBHEAD**: "${inputs.texts.subHeadline}" -> Smaller, near headline.
      3. **LOCATION**: "${inputs.texts.location}" -> Clear, readable.
      ${inputs.texts.price ? `4. **PRICE**: "${inputs.texts.price}" -> Highlighted badge or text.` : ''}
      ${inputs.texts.contact ? `5. **CONTACT**: "${inputs.texts.contact}" -> In Footer Bar.` : ''}
      ${inputs.texts.rera ? `6. **RERA**: "${inputs.texts.rera}" -> Small legal text in Footer.` : ''}
    
    *** VISUAL ENHANCEMENT ***
    - **SKY REPLACEMENT**: If the property photo has a dull sky, replace it with a vibrant Blue Sky or Golden Sunset (match Reference).
    - **CONSTRUCTION CLEANUP**: Remove construction debris, unfinished cement, or wires. Make it look finished and premium.
    - **LIFESTYLE BLEND**: If a model is provided, do NOT paste them like a sticker. Match the lighting direction and shadows. They should look like they are enjoying the property.
    
    OUTPUT: A single, high-resolution 4:5 or 1:1 marketing image.
    `;

    parts.push({ text: prompt });

    // 3. Call API
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                // Force portrait for flyers if reference suggests, otherwise square. 
                // For simplicity in this version, we default to 4:5 (common for RE) or 1:1.
                // Let's stick to 1:1 for social media consistency unless we detect otherwise.
                aspectRatio: "1:1", 
                imageSize: "1K"
            }
        },
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};