
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
    parts.push({ text: "REFERENCE STYLE (Visual Hierarchy & Vibe):" });
    parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        parts.push({ text: "LOGO (Branding):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        parts.push({ text: "LIFESTYLE MODEL (Social Proof):" });
        parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        parts.push({ text: "PROPERTY IMAGE (Hero Subject):" });
        parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    // 2. Construct Model Instruction
    let modelInstruction = "";
    if (inputs.modelImage) {
        modelInstruction = "**Lifestyle Fusion**: Seamlessly integrate the provided LIFESTYLE MODEL. Match lighting direction. They represent the 'Outcome' (Living there).";
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

    // 3. Build Prompt with Design Logic from PDF
    let prompt = `You are a High-End Real Estate Marketing AI using Gemini 3 Pro, trained on the **"3% Design Rule"**.
    
    TASK: Create a high-conversion luxury real estate advertisement.
    MODE: ${inputs.mode === 'lifestyle_fusion' ? 'Lifestyle Fusion (Blend/Generate Model + Property)' : 'New Property Generation (Visualize Concept)'}.
    
    *** DESIGN LOGIC (The 3% Rule) ***
    1. **Visual Hierarchy**: The Property is the undisputed Hero. Sequence of attention must be: **Image (Desire) -> Headline (Hook) -> Price/Value -> CTA**.
    2. **Cognitive Load**: Remove visual friction. Do not clutter the image with floating text. Group related info (Contact, RERA, Logo) into a structured **Footer Bar** or clean negative space.
    3. **Emotional Trigger**: We are selling a 'Dream', not just walls. Use lighting (Golden Hour, Blue Hour) to trigger the emotion of **"Status"** or **"Comfort"**.
    
    *** INPUTS & EXECUTION ***
    - **Reference**: Copy the color palette, font weight, and layout structure.
    - ${inputs.propertyImage ? '**Property**: Enhance clarity. Fix sky. Ensure vertical lines are straight (Architectural Photography).' : '**Generation**: Hallucinate a photorealistic property matching the Reference vibe.'}
    - ${modelInstruction}
    
    *** TYPOGRAPHY RULES ***
    - **HEADLINE**: "${inputs.texts.headline}" -> Big, High Contrast, Easy to read in < 2 seconds.
    - **SUBHEAD**: "${inputs.texts.subHeadline}" -> Smaller, supporting the headline.
    - **LOCATION**: "${inputs.texts.location}" -> Clear legibility.
    ${inputs.texts.price ? `- **PRICE**: "${inputs.texts.price}" -> Use a high-contrast badge or bold text (Value Anchor).` : ''}
    - **FOOTER AREA**: Place Contact ("${inputs.texts.contact}"), Logo, and RERA ("${inputs.texts.rera}") in a clean bottom bar to reduce noise.
    
    OUTPUT: A single, high-resolution 4:5 or 1:1 marketing image. Photorealistic quality.
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
