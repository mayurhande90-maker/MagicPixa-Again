
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
    parts.push({ text: "REFERENCE STYLE (Visual Hierarchy & Vibe ONLY - DO NOT READ TEXT):" });
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

    // 3. Build Prompt with Design Logic from PDF & Copywriting
    let prompt = `You are a High-End Real Estate Marketing AI using Gemini 3 Pro, acting as both **Senior Copywriter** and **Visual Designer**.
    
    TASK: Create a high-conversion luxury real estate advertisement.
    MODE: ${inputs.mode === 'lifestyle_fusion' ? 'Lifestyle Fusion (Blend/Generate Model + Property)' : 'New Property Generation (Visualize Concept)'}.
    
    *** STRICT NEGATIVE CONSTRAINTS ***
    1. **NO REFERENCE TEXT**: Do NOT extract, OCR, or copy ANY text from the Reference Style image. Use ONLY the user-provided text below.
    2. **NO HALLUCINATED DETAILS**: Do not invent amenities or features not implied by the property image or context.
    
    *** COPYWRITING STRATEGY (The "Copywriter" Persona) ***
    You must analyze the user's input to write the ad content.
    - **Project Name**: "${inputs.texts.projectName}" (This is the Brand).
    - **Configuration**: "${inputs.texts.unitType}" (e.g., 2BHK, Villa).
    - **User Context**: "${inputs.texts.marketingContext}".
    
    **ACTION**: Based on the "User Context" and real estate trends, generate a short, punchy **HEADLINE HOOK**.
    - Example if context is "Ready to move": Headline = "Move In Today".
    - Example if context is "Luxury": Headline = "Live The High Life".
    - *Constraint*: Keep it under 5 words. High Impact.
    
    *** DESIGN LOGIC (The "3% Design Rule") ***
    1. **Visual Hierarchy**: The Property is the Hero. Sequence: Image -> Generated Headline -> Project Name -> Unit Type -> Footer.
    2. **Cognitive Load**: Clean layout. Use negative space.
    3. **Emotional Trigger**: Use lighting (Golden Hour, Blue Hour) to trigger "Status" or "Comfort".
    
    *** EXECUTION INSTRUCTIONS ***
    - **Reference**: Copy the color palette, font weight, and layout structure.
    - ${inputs.propertyImage ? '**Property**: Enhance clarity. Fix sky. Ensure vertical lines are straight.' : '**Generation**: Hallucinate a photorealistic property matching the Reference vibe.'}
    - ${modelInstruction}
    
    *** TYPOGRAPHY PLACEMENT ***
    - **HERO HEADLINE**: Place the AI-Generated Hook (based on context) in the most visible area. Big, Bold font.
    - **PROJECT NAME**: "${inputs.texts.projectName}" -> Elegant font, distinct from headline.
    - **SUB-DETAILS**: "${inputs.texts.unitType}" & "${inputs.texts.location}" -> Clear legibility.
    ${inputs.texts.price ? `- **PRICE**: "${inputs.texts.price}" -> Use a high-contrast badge or bold text.` : ''}
    
    *** FOOTER LOGIC (Conditional) ***
    Create a clean bottom bar/footer ONLY for the following provided details. If a field is missing, DO NOT render a placeholder.
    ${inputs.texts.contact ? `- Contact: "${inputs.texts.contact}"` : ''}
    ${inputs.texts.rera ? `- RERA: "${inputs.texts.rera}"` : ''}
    ${inputs.logoImage ? `- Logo: Place provided logo clearly.` : ''}
    
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
