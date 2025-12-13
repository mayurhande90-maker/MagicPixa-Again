
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD)
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

// Analysis Prompt for Identity
const analyzeFaceBiometrics = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `Task: Deep Biometric Analysis of ${label}.
    
    Analyze the "Minute Details" of the face to preserve identity in a generated image.
    Identify and describe:
    1. Face Shape (e.g. oval, square, strong jawline).
    2. Eye Structure (shape, color, eyelid type, eyebrow arch).
    3. Nose Architecture (bridge width, tip shape).
    4. Mouth & Lips (fullness, curvature).
    5. Skin & Age Characteristics (complexion, texture, distinctive marks like moles/freckles).
    6. Hair (color, texture, hairline).
    
    Output a concise, high-precision descriptive paragraph.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.warn("Biometric analysis failed", e);
        return "";
    }
};

export const generateProfessionalHeadshot = async (
    base64ImageData: string,
    mimeType: string,
    archetype: string,
    background: string,
    customDescription?: string,
    partnerBase64?: string,
    partnerMimeType?: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. Optimize Images
        const { data: optData, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType);
        
        let partnerData = null;
        let partnerMime = null;
        let biometricsPartner = "";

        // 2. Analyze Identity (Primary)
        const biometricsA = await analyzeFaceBiometrics(ai, optData, optMime, "Person A");

        // 3. Handle Partner (Duo Mode)
        if (partnerBase64 && partnerMimeType) {
            const optPartner = await optimizeImage(partnerBase64, partnerMimeType);
            partnerData = optPartner.data;
            partnerMime = optPartner.mimeType;
            biometricsPartner = await analyzeFaceBiometrics(ai, partnerData, partnerMime, "Person B");
        }

        // 4. Construct Prompt
        let prompt = `
        *** WORLD CLASS HEADSHOT PROTOCOL ***
        You are an Elite Portrait Photographer & Retoucher.
        
        **SUBJECT A (Main User)**:
        - VISUAL SOURCE: Input Image 1.
        - BIOMETRICS: ${biometricsA}
        `;

        if (partnerData) {
            prompt += `
            **SUBJECT B (Partner)**:
            - VISUAL SOURCE: Input Image 2.
            - BIOMETRICS: ${biometricsPartner}
            
            **COMPOSITION (DUO MODE)**:
            - Professional Duo Portrait. Subjects standing close, shoulders touching or slightly overlapping.
            - Connection: Professional Partners, Co-founders, or Couple (based on vibe).
            - Depth of Field: Adjusted to f/4 or f/5.6 to ensure BOTH faces are sharp and in focus.
            - Framing: Mid-shot to capture both subjects comfortably.
            `;
        } else {
             prompt += `
            **COMPOSITION (SOLO MODE)**:
            - Single Subject Portrait. Centered or Rule of Thirds.
            - Focus: Razor sharp on eyes (f/1.8 depth of field drop-off).
            `;
        }

        prompt += `
        **CONSTRAINT**: Maintain facial identity, bone structure, and expression exactly for ALL subjects. Do not morph faces.
        
        **STYLE & ATTIRE**:
        - **Archetype**: ${archetype}. (Apply appropriate professional attire to both subjects if duo).
        - **Vibe**: Professional, Confident, Approachable.
        
        **ENVIRONMENT**:
        - **Background**: ${background}. (Ensure soft bokeh/blur).
        
        **PHOTOGRAPHY SPECS**:
        - **Camera**: Sony A7R V with 85mm G Master Lens.
        - **Lighting**: "Rembrandt" or "Butterfly" studio lighting. Softboxes. No harsh shadows. Add a subtle "Rim Light" (hair light).
        - **Eyes**: Ensure distinct "Catchlights" in the eyes to make them look alive.
        - **Retouching**: High-end skin texture retention. Do NOT airbrush into plastic. Keep pores visible but clean.
        
        ${customDescription ? `**USER OVERRIDE**: "${customDescription}"` : ''}
        
        OUTPUT: A single high-resolution photorealistic headshot.
        `;

        const parts: any[] = [
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ inlineData: { data: partnerData, mimeType: partnerMime } });
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Error generating headshot:", error);
        throw error;
    }
};
