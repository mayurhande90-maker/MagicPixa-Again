
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

export interface ModelGenerationParams {
    modelType: string;
    region: string;
    skinTone: string;
    bodyType: string;
    composition: string;
    framing: string;
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

export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];

    // 1. Process Images
    const optReference = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
    // Explicit instruction to extract Design DNA from reference
    parts.push({ text: `*** CRITICAL: VISUAL TEMPLATE SOURCE ***
    TREAT THIS IMAGE AS A RIGID CSS LAYOUT.
    - You must CLONE the exact layout structure (Grid, Margins, Text positioning).
    - You must CLONE the exact typography hierarchy (Font weight, Case, Spacing).
    - You must CLONE the exact color blocks/overlays.
    - IGNORE the actual text content (e.g., if it says "Villa", but user wants "Apartment", use the layout of "Villa" but write "Apartment").
    - DO NOT INVENT NEW LAYOUTS. COPY-PASTE THIS DESIGN STRUCTURE.` });
    parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        parts.push({ text: "USER LOGO (Replace reference logo with this):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        parts.push({ text: "LIFESTYLE MODEL (Must be integrated seamlessly):" });
        parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        parts.push({ text: "PROPERTY IMAGE (The Hero Subject):" });
        parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    // 2. Construct Model Instruction
    let modelInstruction = "";
    if (inputs.modelImage) {
        modelInstruction = "**Lifestyle Fusion**: Seamlessly integrate the provided LIFESTYLE MODEL. Match lighting direction (Sun position). They represent the 'Outcome' (Living there).";
    } else if (inputs.modelGenerationParams) {
        const p = inputs.modelGenerationParams;
        modelInstruction = `**GENERATE LIFESTYLE MODEL**:
        - Subject: Photorealistic ${p.composition} of a ${p.skinTone} ${p.region} ${p.modelType} (${p.bodyType}).
        - Framing: ${p.framing}.
        - Action: Integrate them naturally into the scene (e.g., relaxing on sofa, walking in garden, admiring view).
        - Lighting: Must match the property's lighting perfectly (Shadows, Color Temp).
        - Emotion: Desire, Comfort, Status.`;
    } else {
        modelInstruction = "**No Model**: Focus purely on the architecture and interior/exterior design.";
    }

    // 3. Build Prompt with Design Logic from PDF & Copywriting
    let prompt = `You are an advanced AI Designer executing a "Pixel-Perfect Design Transfer".
    
    TASK: Recreate the Reference Image's design using the User's Assets.
    
    *** STRICT LAYOUT CLONING PROTOCOL ***
    1. **Grid Match**: If the reference has a text box on the bottom-left, put the user's text on the bottom-left. If the headline is centered, center the user's headline.
    2. **Font Match**: Match the visual weight (Bold/Light) and style (Serif/Sans) of the reference text.
    3. **Color Match**: Use the exact color palette for backgrounds/overlays found in the reference.
    4. **Asset Swap**:
       - Replace Reference Property -> User Property Image.
       - Replace Reference Model -> User Model (if provided).
       - Replace Reference Logo -> User Logo (if provided).
       - Replace Reference Text -> Generated Copy (below).

    *** COPYWRITING ENGINE (Context-Aware) ***
    User Context: "${inputs.texts.marketingContext}"
    Generate a high-impact Headline (max 5 words) based on this context that fits the reference layout.
    
    *** CONTENT MAPPING ***
    - **Headline**: Generated Hook (e.g., "Luxury Redefined").
    - **Project Name**: "${inputs.texts.projectName}"
    - **Unit Type**: "${inputs.texts.unitType}"
    - **Footer/Details**: "${inputs.texts.location}"${inputs.texts.price ? `, "${inputs.texts.price}"` : ''}.
    - **Contact**: "${inputs.texts.contact || ''}".
    - **RERA**: "${inputs.texts.rera || ''}".
    
    *** EXECUTION INSTRUCTIONS ***
    - **Enhancement**: Apply "Golden Hour" lighting to the Property Image to make it pop.
    - **Fusion**: ${modelInstruction}
    - **Output**: A single, high-resolution marketing image that looks exactly like the Reference design but with new content.
    `;

    parts.push({ text: prompt });

    // 4. Call API
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: "1:1", 
                imageSize: "1K"
            }
        },
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};
