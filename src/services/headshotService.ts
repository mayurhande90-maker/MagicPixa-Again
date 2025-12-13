
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
const analyzeFaceBiometrics = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Task: Deep Biometric Analysis.
    
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
    customDescription?: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. Optimize Image
        const { data: optData, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType);

        // 2. Analyze Identity
        const biometrics = await analyzeFaceBiometrics(ai, optData, optMime);

        // 3. Construct Prompt
        const prompt = `
        *** WORLD CLASS HEADSHOT PROTOCOL ***
        You are an Elite Portrait Photographer & Retoucher.
        
        **SUBJECT IDENTITY (STRICT LOCK)**:
        - VISUAL SOURCE: Input Image.
        - BIOMETRICS: ${biometrics}
        - **CONSTRAINT**: Maintain facial identity, bone structure, and expression exactly. Do not morph the face.
        
        **STYLE & ATTIRE**:
        - **Archetype**: ${archetype}. (Use appropriate professional attire, e.g., Suit for Executive, Smart Casual for Tech).
        - **Vibe**: Professional, Confident, Approachable.
        
        **ENVIRONMENT**:
        - **Background**: ${background}. (Ensure soft bokeh/blur depth of field f/1.8).
        
        **PHOTOGRAPHY SPECS**:
        - **Camera**: Sony A7R V with 85mm G Master Lens.
        - **Lighting**: "Rembrandt" or "Butterfly" studio lighting. Softboxes. No harsh shadows. Add a subtle "Rim Light" (hair light).
        - **Eyes**: Ensure distinct "Catchlights" in the eyes to make them look alive.
        - **Retouching**: High-end skin texture retention. Do NOT airbrush into plastic. Keep pores visible but clean.
        
        ${customDescription ? `**USER OVERRIDE**: "${customDescription}"` : ''}
        
        OUTPUT: A single high-resolution photorealistic headshot.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: optData, mimeType: optMime } },
                    { text: prompt },
                ],
            },
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
