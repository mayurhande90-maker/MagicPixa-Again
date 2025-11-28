
import { Modality, GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Optimize images to 1024px to manage token limits
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
    referenceImage?: { base64: string; mimeType: string } | null; // Made optional
    logoImage?: { base64: string; mimeType: string } | null;
    amenities?: string[];
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
 * PHASE 0: THE RESEARCHER (Only used if no reference image is provided)
 * Searches for current best-in-class real estate ad layouts.
 */
const researchTrendingLayout = async (ai: any, context: string): Promise<string> => {
    const prompt = `You are a Senior Art Director. 
    
    TASK: Research "Trending Luxury Real Estate Flyer Design 2025".
    CONTEXT: The ad is for "${context}".
    
    Find a specific, high-conversion layout style used by top agencies (like Sotheby's, Knight Frank, or Modern Luxury).
    
    OUTPUT: A detailed visual description of the layout.
    - Where is the Hero Image? (Full bleed, split screen, floating?)
    - Where is the Headline? (Top centered, bottom left, overlay?)
    - Where is the Footer?
    - What is the color mood?
    
    Return ONLY the visual description paragraph.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: [{ text: prompt }] },
        config: { tools: [{ googleSearch: {} }] }
    });

    return response.text || "Modern, full-bleed hero image with clean minimal typography at the bottom.";
};

export const analyzeRealtyReference = async (base64: string, mimeType: string): Promise<ReferenceAnalysis> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64, mimeType);

    const prompt = `Analyze this Real Estate Ad Design.
    Identify which data fields are visually present: Price, RERA, Contact, Location, Unit Type, Project Name.
    Return JSON.`;

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
        if (!text) return { hasPrice: false, hasRera: false, hasContact: true, hasLocation: true, hasUnitType: true, hasProjectName: true };
        return JSON.parse(text);
    } catch (error) {
        return { hasPrice: false, hasRera: false, hasContact: false, hasLocation: false, hasUnitType: false, hasProjectName: true };
    }
};

export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    const ai = getAiClient();

    // --- STRATEGY DETERMINATION ---
    let layoutInstruction = "";
    let referencePart = null;

    if (inputs.referenceImage) {
        // Mode A: Mimic Uploaded Reference
        const optReference = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
        layoutInstruction = "STRICTLY MIMIC the composition, camera angle, and negative space of the 'LAYOUT REFERENCE' image provided.";
        referencePart = { inlineData: { data: optReference.data, mimeType: optReference.mimeType } };
    } else {
        // Mode B: AI Auto-Design (Research)
        const trendingLayout = await researchTrendingLayout(ai, inputs.texts.marketingContext);
        layoutInstruction = `GENERATE A NEW LAYOUT based on this professional direction: "${trendingLayout}". 
        Use the "Rule of Thirds". Ensure 30% negative space for text. Create a "Z-Pattern" reading flow.`;
    }

    // ==============================================================================================
    // PASS 1: THE PHOTOGRAPHER (Composition & Base Scene)
    // ==============================================================================================
    
    const pass1Parts: any[] = [];

    if (referencePart) {
        pass1Parts.push({ text: "LAYOUT REFERENCE:" });
        pass1Parts.push(referencePart);
    }

    if (inputs.propertyImage) {
        const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
        pass1Parts.push({ text: "PROPERTY ARCHITECTURE:" });
        pass1Parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });
    }

    let modelPrompt = "";
    if (inputs.modelImage) {
        const optModel = await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType);
        pass1Parts.push({ text: "MODEL:" });
        pass1Parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
        modelPrompt = "Integrate the provided model naturally into the scene.";
    } else if (inputs.modelGenerationParams) {
        const p = inputs.modelGenerationParams;
        modelPrompt = `Generate a premium model: ${p.skinTone} ${p.region} ${p.modelType}. Action: ${p.composition}.`;
    } else {
        modelPrompt = "No people. Focus on architecture.";
    }

    const pass1Prompt = `You are a World-Class Architectural Photographer.
    
    TASK: Create the base photograph for a Real Estate Ad.
    
    *** COMPOSITION RULES ***
    ${layoutInstruction}
    
    *** LIGHTING & MOOD ***
    - "Golden Hour" or "Blue Hour" premium lighting (unless reference dictates otherwise).
    - Wide angle lens (16mm-24mm) to make the space look expansive.
    - Straight vertical lines (Architectural correction).
    
    *** SUBJECT ***
    - ${modelPrompt}
    - If fusing Model + Property: The model should look comfortable, owning the space. 
    - **CRITICAL**: Leave empty space (sky, floor, or plain wall) where text can be placed later. Do not fill every pixel with detail.
    
    OUTPUT: A clean, high-resolution photograph. NO TEXT overlays yet.`;

    pass1Parts.push({ text: pass1Prompt });

    const pass1Response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: pass1Parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        },
    }));

    const cleanImageBase64 = pass1Response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
    if (!cleanImageBase64) throw new Error("Pass 1 (Composition) failed.");


    // ==============================================================================================
    // PASS 2: THE GRAPHIC DESIGNER (Typography & Layout)
    // ==============================================================================================

    const pass2Parts: any[] = [];

    pass2Parts.push({ text: "CANVAS (Background):" });
    pass2Parts.push({ inlineData: { data: cleanImageBase64, mimeType: "image/jpeg" } });

    if (referencePart) {
        pass2Parts.push({ text: "STYLE REFERENCE (Copy font weights and placement):" });
        pass2Parts.push(referencePart);
    }

    if (inputs.logoImage) {
        const optLogo = await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType);
        pass2Parts.push({ text: "BRAND LOGO (Source Asset):" });
        pass2Parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // Brand Kit Styling
    let brandingInstruction = "";
    if (inputs.brandIdentity) {
        brandingInstruction = `
        *** BRAND GUIDELINES (STRICT) ***
        - **Primary Color**: ${inputs.brandIdentity.colors.primary} (Use for Headlines, Buttons, or Footer Backgrounds).
        - **Secondary Color**: ${inputs.brandIdentity.colors.secondary} (Use for Subtitles or Accents).
        - **Accent Color**: ${inputs.brandIdentity.colors.accent}.
        - **Fonts**: Mimic a "${inputs.brandIdentity.fonts.heading}" style for titles and "${inputs.brandIdentity.fonts.body}" for details.
        `;
    } else {
        brandingInstruction = "Match the color palette and font style of the Reference Image provided.";
    }

    const pass2Prompt = `You are a Senior Graphic Designer & Copywriter.
    
    TASK: Design the final Real Estate Flyer.

    *** CRITICAL: LOGO INTEGRITY PROTOCOL ***
    - A specific "BRAND LOGO" image has been provided as input.
    - **STRICT PROHIBITION:** Do NOT redraw, reimagine, or stylize the logo.
    - **MANDATE:** Use the provided logo image EXACTLY as is. It must be pixel-perfect identical to the input.
    - **PLACEMENT:** Superimpose the logo clearly in a top corner (Top-Left or Top-Right) with sufficient padding.
    
    *** 1. COPYWRITING ***
    - **Context**: "${inputs.texts.marketingContext}"
    - **ACTION**: Generate a Short, Punchy, High-Value Headline (3-5 words). Examples: "Luxury Defined", "Your Forever Home", "Rise Above".
    
    *** 2. VISUAL HIERARCHY (The "F-Pattern") ***
    1. **HEADLINE (H1)**: Largest text. High contrast against background.
    2. **PROJECT NAME**: "${inputs.texts.projectName}". Prominent but smaller than Headline.
    3. **UNIT CONFIG**: "${inputs.texts.unitType}". Clear and readable.
    
    *** 3. PLACEMENT & LAYOUT ***
    - If using a Reference, map text positions to the reference.
    - If Auto-Design, place Headline in the area with most negative space (e.g., Sky).
    - Ensure NO text covers the Model's face or the main building features.
    - Use drop shadows or scrims (dark gradients) behind text if the background is busy.
    
    *** 4. DETAILS & FOOTER ***
    ${inputs.amenities && inputs.amenities.length > 0 ? `- List Amenities clean and small: ${inputs.amenities.join(' • ')}` : ''}
    ${(inputs.texts.contact || inputs.texts.location) ? `- FOOTER STRIP: ${inputs.texts.location} | ${inputs.texts.contact || ''} ${inputs.texts.rera ? '| ' + inputs.texts.rera : ''}` : ''}
    
    ${inputs.texts.price ? `- **PRICE TAG**: Place "${inputs.texts.price}" in a high-visibility badge or distinct color block.` : ''}

    *** 5. BRANDING ***
    ${brandingInstruction}
    
    OUTPUT: The final composed advertisement image.`;

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
    if (!finalImageBase64) throw new Error("Pass 2 (Design) failed.");

    return finalImageBase64;
};
