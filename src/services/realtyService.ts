
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
    amenities?: string[];
    // New Brand Identity Data
    brandIdentity?: {
        colors: { primary: string; secondary: string; accent: string; };
        fonts: { heading: string; body: string; };
    };
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
    // PASS 1: THE LAYOUT-AWARE PHOTOGRAPHER
    // Goal: Generate the scene (House + Model) but FORCE it to match the Reference's composition structure.
    // ==============================================================================================
    
    const pass1Parts: any[] = [];

    // 1. The "Template" (Reference Image) - Now crucial for Pass 1
    const optReference = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
    pass1Parts.push({ text: "LAYOUT REFERENCE (Mimic this camera angle, zoom, and negative space):" });
    pass1Parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    // 2. Property Image (The Subject)
    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        pass1Parts.push({ text: "PROPERTY TO FEATURE (Use this architecture):" });
        pass1Parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    // 3. Model Integration
    let modelPrompt = "";
    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        pass1Parts.push({ text: "MODEL TO INTEGRATE:" });
        pass1Parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
        modelPrompt = "Integrate the provided model into the scene.";
    } else if (inputs.modelGenerationParams) {
        const p = inputs.modelGenerationParams;
        modelPrompt = `Generate a photorealistic model: ${p.skinTone} ${p.region} ${p.modelType} (${p.bodyType}). 
        Action: ${p.composition}, ${p.framing}. 
        Lighting: Match the property's lighting.`;
    } else {
        modelPrompt = "No model. Focus purely on architecture.";
    }

    const pass1Prompt = `You are a World-Class Architectural Photographer.
    
    TASK: Re-shoot the "PROPERTY" to match the "LAYOUT REFERENCE" composition exactly.
    
    *** COMPOSITION CLONING (CRITICAL) ***
    - Look at the **LAYOUT REFERENCE**. Where is the building? Where is the sky? Where is the ground?
    - **COPY THAT EXACT FRAMING**.
    - If the Reference has 40% sky at the top, your output MUST have 40% sky at the top.
    - If the Reference has the building in the bottom-right corner, place the Property in the bottom-right corner.
    - **WHY?**: We need to place text overlays later. If you fill the frame with the building, the text will cover it.
    
    *** AESTHETICS ***
    - Lighting: Golden Hour / Premium Daylight (unless Reference is Night).
    - ${modelPrompt}
    - **NO TEXT**: Do not generate text yet. Just the clean background image.
    
    OUTPUT: A single clean photograph matching the spatial arrangement of the Reference.`;

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
    if (!cleanImageBase64) throw new Error("Pass 1 (Composition) failed to generate image.");


    // ==============================================================================================
    // PASS 2: THE GRID-BASED DESIGNER (Strict Layout Engine)
    // Goal: Map pixels from Reference to Canvas. 
    // ==============================================================================================

    const pass2Parts: any[] = [];

    // 1. The Canvas (Result from Pass 1)
    pass2Parts.push({ text: "CANVAS (Background):" });
    pass2Parts.push({ inlineData: { data: cleanImageBase64, mimeType: "image/jpeg" } });

    // 2. The Template (Reference)
    pass2Parts.push({ text: "DESIGN TEMPLATE (Copy layout grid exactly):" });
    pass2Parts.push({ inlineData: { data: optReference.data, mimeType: optReference.mimeType } });

    // 3. The Brand Asset (Logo)
    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        pass2Parts.push({ text: "USER LOGO (This image MUST appear exactly as is in the final output):" });
        pass2Parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // 4. Design Instructions
    const pass2Prompt = `You are a Layout Engine & Expert Real Estate Copywriter.
    
    *** 1. COPYWRITING (The "Hook") ***
    - **Input Context**: "${inputs.texts.marketingContext || 'Luxury Lifestyle'}"
    - **TASK**: Create a **NEW**, high-converting Marketing Title (3-6 words) based on the context.
    - **CRITICAL**: Do NOT just copy-paste the context. Turn it into an ad headline.
      - Input: "2bhk available" -> Output: "Your Dream 2BHK Awaits"
      - Input: "Near airport" -> Output: "Connect to the World"
    
    *** 2. VISUAL HIERARCHY (Strict Order) ***
    You must map the text elements to the Reference Layout based on visual prominence:
    
    1. **TOP PRIORITY (H1 - Largest Text)**:
       - Content: The **GENERATED MARKETING TITLE**.
       - Placement: Most prominent text slot (usually top or center).
    
    2. **SECONDARY (H2 - Medium Text)**:
       - Content: **PROJECT NAME** ("${inputs.texts.projectName}").
       - Placement: Below or near the title, slightly smaller.
    
    3. **TERTIARY (H3 - Small Text)**:
       - Content: **UNIT TYPE** ("${inputs.texts.unitType}").
    
    *** 3. LAYOUT & COMPOSITION ***
    - **Grid Mapping**: Visualize the Reference Layout. Place your new H1, H2, and H3 texts in the exact same grid positions as the Reference's text blocks.
    - **Subject Visibility**: Ensure the building/model (Background) is clearly visible. Do not let text cover the main subject.
    
    *** 4. FOOTER & DETAILS ***
    ${inputs.amenities && inputs.amenities.length > 0 ? `
    - **AMENITIES**: Render a clean list for: ${inputs.amenities.join(', ')}.
    ` : ''}

    ${(inputs.texts.contact || inputs.texts.rera || inputs.texts.location) ? `
    - **FOOTER BAR**: Create a distinct footer strip at the very bottom.
    - Content: ${inputs.texts.location} ${inputs.texts.contact ? '| ' + inputs.texts.contact : ''} ${inputs.texts.rera ? '| ' + inputs.texts.rera : ''}
    ` : ''}
    
    *** 5. LOGO PLACEMENT (CRITICAL) ***
    - **Source**: Use the exact pixel data from the "USER LOGO" input.
    - **Action**: Superimpose the User Logo onto the canvas.
    - **Position**: Match the X,Y position of the logo found in the "DESIGN TEMPLATE".
    - **Fidelity**: Do NOT change the logo's color, font, or shape. It must be an exact replica of the uploaded logo file.
    
    *** 6. STYLE MATCHING ***
    ${inputs.brandIdentity ? `
    - **BRAND IDENTITY ENFORCEMENT (STRICT)**:
      - **Primary Color**: Use ${inputs.brandIdentity.colors.primary} for major graphical elements (shapes, footer bar background, or headline text).
      - **Secondary Color**: Use ${inputs.brandIdentity.colors.secondary} for accents or sub-text.
      - **Fonts**: Emulate a "${inputs.brandIdentity.fonts.heading}" style for the H1 Headline. Use "${inputs.brandIdentity.fonts.body}" style for details.
    ` : `
    - Match the Reference's font styles (Serif/Sans), weights, and color palette.
    `}
    
    - **Price**: If "${inputs.texts.price}" exists, place it in a high-visibility badge/sticker.

    OUTPUT: The final composite image.`;

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
