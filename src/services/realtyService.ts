
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
    
    *** VISUAL HIERARCHY RULES (CRITICAL) ***
    1. **HEADLINE (Dominant)**: The Main Marketing Line generated below must be the most prominent text element (Size/Weight).
    2. **PROJECT NAME (Prominent)**: "${inputs.texts.projectName}" must be HIGHLY VISIBLE and distinct, secondary only to the Headline. It should not be hidden in small text.
    3. **LOGO PLACEMENT**: Detect the exact position of the logo in the Reference Image (e.g. Top Right, Bottom Center). Place the **User's Uploaded Logo** in that EXACT same position and relative size.
    
    *** STRICT LAYOUT CLONING PROTOCOL ***
    1. **Grid Match**: Clone the exact text box positions from the reference.
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
    
    *** CONTENT MAPPING (STRICTLY CONDITIONAL) ***
    Include ONLY the following fields. If a value is missing below, DO NOT RENDER IT or create a placeholder.
    
    - **Headline**: [Generated Hook]
    - **Project Name**: "${inputs.texts.projectName}"
    - **Unit Type**: "${inputs.texts.unitType}"
    - **Location**: "${inputs.texts.location}"
    ${inputs.texts.price ? `- **Price**: "${inputs.texts.price}"` : ''}
    ${inputs.texts.contact ? `- **Contact**: "${inputs.texts.contact}"` : ''}
    ${inputs.texts.rera ? `- **RERA**: "${inputs.texts.rera}"` : ''}
    
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
