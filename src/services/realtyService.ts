
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
    parts.push({ text: `*** CRITICAL REFERENCE IMAGE ***
    Perform a "Design DNA Audit" on this image.
    - Extract the Layout Structure (Grid system, Margin usage).
    - Extract the Typography Hierarchy (Font weights, Case, Letter spacing).
    - Extract the Color Hierarchy (Primary, Secondary, Accent colors).
    - IGNORE any text content in this image. ONLY copy the visual style.` });
    parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        parts.push({ text: "LOGO (Branding):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        parts.push({ text: "LIFESTYLE MODEL (Social Proof - Must be integrated):" });
        parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    }

    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        parts.push({ text: "PROPERTY IMAGE (Hero Subject - Enhance clarity):" });
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
    let prompt = `You are a High-End Real Estate Marketing AI using Gemini 3 Pro.
    
    TASK: Create a high-conversion luxury real estate advertisement.
    
    *** COPYWRITING ENGINE (The "2-Second Rule") ***
    Analyze the User Context: "${inputs.texts.marketingContext}".
    GENERATE A HEADLINE HOOK based on this context.
    - If context suggests "Investment", use "High ROI" or "Smart Choice".
    - If context suggests "Luxury/Lifestyle", use "Live Above It All" or "Pure Opulence".
    - If context suggests "Urgency", use "Last Few Units" or "Move In Now".
    - **Constraint**: Headline must be < 5 words. High Impact. Sans-Serif Bold.
    
    *** DESIGN EXECUTION (The "3% Design Rule") ***
    Apply these specific rules to the output image:
    
    1. **Visual Hierarchy (Eye Flow)**:
       - **Primary Focal Point**: The Property Image (Hero). Maximize size.
       - **Secondary**: The Generated Headline Hook (High Contrast, Top or Center-Left).
       - **Tertiary**: Project Name ("${inputs.texts.projectName}") & Unit Type ("${inputs.texts.unitType}").
       - **Action**: Footer/Contact Info (Low friction).
       
    2. **Cognitive Load Reduction**:
       - Remove visual clutter.
       - Use "Generous White Space" (or negative space) around text elements to signal premium quality.
       - Ensure text is legible against the background (Add subtle drop shadows or gradients if needed).
       
    3. **Color Psychology**:
       - Extract the color palette from the Reference Image.
       - Apply "Luxury" cues (Black/Gold) or "Trust" cues (Blue/White) depending on the Reference Vibe.
       
    4. **The Footer Bar**:
       - Create a distinct, clean footer bar at the bottom.
       - Group the technical details here: "${inputs.texts.unitType}", "${inputs.texts.location}"${inputs.texts.price ? `, Price: "${inputs.texts.price}"` : ''}.
       - If provided, place RERA ("${inputs.texts.rera}") and Contact ("${inputs.texts.contact}") clearly in the footer.
       
    *** FINAL ASSEMBLY INSTRUCTIONS ***
    - **Layout**: Strictly follow the Reference Image's layout structure.
    - **Fusion**: ${modelInstruction}
    - **Enhancement**: Apply "Golden Hour" lighting to the property to trigger emotional desire.
    
    OUTPUT: A single, high-resolution marketing image. Photorealistic quality.
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
