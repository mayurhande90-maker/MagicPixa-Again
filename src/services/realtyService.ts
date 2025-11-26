import { Modality, GenerateContentResponse, Type } from "@google/genai";
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

export interface ModelGenerationParams {
    modelType: string;
    region: string;
    skinTone: string;
    bodyType: string;
    composition: string;
    framing: string;
}

export interface ReferenceAnalysis {
    hasPrice: boolean;
    hasRera: boolean;
    hasContact: boolean;
    hasLocation: boolean;
    hasUnitType: boolean;
    hasProjectName: boolean;
}

interface RealtyInputs {
    mode: 'lifestyle_fusion' | 'new_property';
    modelImage?: { base64: string; mimeType: string } | null;
    modelGenerationParams?: ModelGenerationParams;
    propertyImage?: { base64: string; mimeType: string } | null;
    referenceImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    texts: {
        projectName: string;
        unitType: string;
        marketingContext: string;
        location: string;
        price?: string;
        rera?: string;
        contact?: string;
    };
}

/**
 * Analyzes the reference image to detect what information fields are present in the design.
 * Uses Gemini 3 Pro for high-accuracy layout understanding.
 */
export const analyzeRealtyReference = async (base64: string, mimeType: string): Promise<ReferenceAnalysis> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64, mimeType);

    const prompt = `Analyze this Real Estate Ad Design.
    
    Your task is to identify which specific data fields are visually present in the design layout.
    Scan the text and layout to detect placeholders or actual values for:
    - **Price**: e.g., "₹1.5 Cr", "$500k", "Starting from...".
    - **RERA / Legal ID**: e.g., "RERA No:...", small legal text at bottom.
    - **Contact Details**: e.g., Phone number, Website URL, QR code area.
    - **Location**: e.g., City name, Address, "Near Airport".
    - **Unit Type**: e.g., "2 BHK", "3 Bed Residences", "Villa".
    - **Project Name**: Large distinct title text.

    Return a JSON object indicating true/false for each field if you see a designated space or text for it.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        hasPrice: { type: Type.BOOLEAN },
                        hasRera: { type: Type.BOOLEAN },
                        hasContact: { type: Type.BOOLEAN },
                        hasLocation: { type: Type.BOOLEAN },
                        hasUnitType: { type: Type.BOOLEAN },
                        hasProjectName: { type: Type.BOOLEAN },
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return { hasPrice: false, hasRera: false, hasContact: true, hasLocation: true, hasUnitType: true, hasProjectName: true }; // Fallback
        return JSON.parse(text);
    } catch (error) {
        console.error("Reference analysis failed:", error);
        return { hasPrice: false, hasRera: false, hasContact: false, hasLocation: false, hasUnitType: false, hasProjectName: true };
    }
};

export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    const ai = getAiClient();

    // ==============================================================================================
    // PASS 1: THE PHOTOGRAPHER (Clean Scene Generation)
    // Goal: Create the perfect "clean" background image. No text. No logos. Just the scene.
    // ==============================================================================================
    
    const pass1Parts: any[] = [];

    // 1. Property Image (The Stage)
    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        pass1Parts.push({ text: "BASE PROPERTY IMAGE:" });
        pass1Parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    // 2. Model Integration (The Actor)
    let modelPrompt = "";
    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        pass1Parts.push({ text: "MODEL TO INTEGRATE:" });
        pass1Parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
        modelPrompt = "Integrate the provided model into the property scene naturally.";
    } else if (inputs.modelGenerationParams) {
        const p = inputs.modelGenerationParams;
        modelPrompt = `Generate a photorealistic model: ${p.skinTone} ${p.region} ${p.modelType} (${p.bodyType}). 
        Action: ${p.composition}, ${p.framing}. 
        Lighting: Match the property's lighting exactly.
        Interaction: The model should look comfortable and engaged with the environment.`;
    } else {
        modelPrompt = "No model. Focus purely on the architecture and interior/exterior design.";
    }

    const pass1Prompt = `You are a World-Class Architectural Photographer.
    
    TASK: Create a pristine, high-resolution real estate photograph.
    
    INPUTS:
    - Property Image (Enhance lighting to 'Golden Hour' if appropriate for the context).
    - ${modelPrompt}
    
    CRITICAL RULES:
    1. **NO TEXT**: Do not generate any text, watermarks, or logos. Clean image only.
    2. **NO GRAPHICS**: No overlays, no badges.
    3. **PHOTOREALISM**: Output must look like a RAW photo from a DSLR (85mm lens).
    4. **COMPOSITION**: Ensure there is sufficient 'negative space' (sky, pavement, or wall) suitable for placing text layers in the next step, but keep the composition balanced and professional.
    
    OUTPUT: A single clean photograph.`;

    pass1Parts.push({ text: pass1Prompt });

    // Execute Pass 1
    const pass1Response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: pass1Parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        },
    }));

    const cleanImageBase64 = pass1Response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
    if (!cleanImageBase64) throw new Error("Pass 1 (Photography) failed to generate image.");


    // ==============================================================================================
    // PASS 2: THE GRAPHIC DESIGNER (Layout & Typography)
    // Goal: Apply the reference layout, text, and logo onto the clean image.
    // ==============================================================================================

    const pass2Parts: any[] = [];

    // 1. The Canvas (Result from Pass 1)
    pass2Parts.push({ text: "BACKGROUND CANVAS (Do not alter the scene, only add graphics):" });
    pass2Parts.push({ inlineData: { data: cleanImageBase64, mimeType: "image/jpeg" } });

    // 2. The Template (Reference Image)
    const optReference = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
    pass2Parts.push({ text: "DESIGN REFERENCE (Copy layout, font style, and color palette EXACTLY):" });
    pass2Parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    // 3. The Brand Asset (Logo)
    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        pass2Parts.push({ text: "USER LOGO (Place this 'sticker' exactly where the logo is in the reference):" });
        pass2Parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // 4. Design & Copy Instructions
    const pass2Prompt = `You are an Expert Graphic Designer & Copywriter.
    
    TASK: Apply the layout design from the REFERENCE IMAGE onto the BACKGROUND CANVAS.
    
    *** 1. LAYOUT TRANSFER (The "Template" Logic) ***
    - Analyze the Reference Image. Identify:
      - Text Block Positions (Headline, Price, Footer).
      - Shape Overlays (Rectangles, Gradients).
      - Font Weights & Styles.
    - **COPY-PASTE**: Recreate these exact graphic elements on the Canvas.
    - **SAFE ZONE**: Keep all text/logos 10% away from the absolute edges.
    
    *** 2. CONTENT POPULATION (The "Sticker" Logic) ***
    - **HEADLINE**: ${inputs.texts.marketingContext ? `Generate a punchy 3-5 word headline based on: "${inputs.texts.marketingContext}"` : "Generate a high-converting Real Estate headline"}. Render this in the largest font slot.
    - **PROJECT NAME**: Render "${inputs.texts.projectName}" clearly. Second largest font.
    - **UNIT & LOC**: Render "${inputs.texts.unitType} • ${inputs.texts.location}" in the subtitle slot.
    ${inputs.texts.price ? `- **PRICE**: Render "${inputs.texts.price}" in the price slot/badge.` : ''}
    ${inputs.texts.contact ? `- **FOOTER**: Render "${inputs.texts.contact}" in the bottom bar.` : ''}
    ${inputs.texts.rera ? `- **LEGAL**: Render "${inputs.texts.rera}" in small print at the bottom.` : ''}
    
    *** 3. LOGO PLACEMENT ***
    - Find the logo position in the Reference.
    - Place the PROVIDED USER LOGO in that exact spot.
    - **MODE**: "Sticker Mode". The logo must be 100% opaque, sharp, and floating above the image. Do not blend it into the sky/wall.
    
    *** 4. STYLE DNA ***
    - Extract the Primary Font Color from the Reference (e.g., Gold, White, Navy). Use it.
    - Extract the Font Style (e.g., Serif, Sans-Serif). Use it.
    - Ensure text legibility by adding subtle drop shadows or shape overlays if the background is busy (mimic Reference).
    
    OUTPUT: Final high-resolution marketing image.`;

    pass2Parts.push({ text: pass2Prompt });

    const pass2Response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: pass2Parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        },
    }));

    const finalImageBase64 = pass2Response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
    if (!finalImageBase64) throw new Error("Pass 2 (Design) failed to generate image.");

    return finalImageBase64;
};