
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

interface HeadshotConfig {
    mode: 'single' | 'duo';
    persona: string;
    location: string;
    customDescription?: string;
}

export const generateProfessionalHeadshot = async (
    imageA: { base64: string; mimeType: string },
    imageB: { base64: string; mimeType: string } | null,
    config: HeadshotConfig
): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Optimize Inputs
    const optA = await optimizeImage(imageA.base64, imageA.mimeType);
    let optB = null;
    if (imageB && config.mode === 'duo') {
        optB = await optimizeImage(imageB.base64, imageB.mimeType);
    }

    // 2. Construct Payload
    const parts: any[] = [];
    
    parts.push({ text: "SUBJECT A (Reference):" });
    parts.push({ inlineData: { data: optA.data, mimeType: optA.mimeType } });

    if (optB) {
        parts.push({ text: "SUBJECT B (Reference):" });
        parts.push({ inlineData: { data: optB.data, mimeType: optB.mimeType } });
    }

    // 3. World-Class Prompt Engineering
    let prompt = `
    *** ROLE: ELITE CORPORATE PHOTOGRAPHER & RETOUCHER ***
    
    **TASK**: Create a High-End Professional Headshot suitable for LinkedIn/Executive Profiles.
    
    **CONFIGURATION**:
    - **Mode**: ${config.mode === 'duo' ? 'Professional Partner/Duo Portrait' : 'Single Executive Headshot'}.
    - **Persona/Role**: ${config.persona}.
    - **Location/Backdrop**: ${config.location}.
    ${config.customDescription ? `- **User Notes**: ${config.customDescription}` : ''}

    *** STRICT IDENTITY PROTOCOL (CRITICAL) ***
    1. **NO FACE SWAPPING**: You must render the EXACT face(s) provided in the input. 
    2. **PRESERVE STRUCTURE**: Maintain exact nose shape, eye shape, jawline, and ear structure.
    3. **PRESERVE BODY**: Maintain the subject's approximate weight/build. Do not over-slim or bulk up unless implied by persona (e.g. 'Fitness').
    4. **HAIR**: Keep the general hairstyle and color. Groom it slightly for a professional look (remove stray hairs), but do not change the cut.
    
    *** STYLING & ATTIRE LOGIC ***
    - Apply attire consistent with the "${config.persona}" role.
      - *Corporate*: Navy/Charcoal Suit, Crisp White Shirt, Silk Tie (optional for men).
      - *Medical*: White Coat, Stethoscope (optional), High-end Scrubs.
      - *Creative*: Black Turtleneck, Designer Glasses, Smart Casual Blazer.
      - *Tech*: Premium Polo, Open Collar Shirt, Modern Blazer.
      - *Legal*: Formal Dark Suit, Authoritative Vibe.
      - *Sales*: Approachable Business Formal.
    - **Fit**: Clothing must look tailored and expensive. No wrinkles.

    *** PHOTOGRAPHY SPECS ***
    - **Camera**: Sony A7R V with 85mm G Master Lens (The "Portrait King").
    - **Aperture**: f/1.8 to f/2.8. Subject sharp, background beautifully blurred (Bokeh).
    - **Lighting**: "Rembrandt" or "Butterfly" lighting pattern using large octabox softboxes. 
      - Key Light: Soft, wrap-around light.
      - Fill Light: Subtle, no harsh shadows.
      - **Rim Light (Hair Light)**: CRITICAL. Add a subtle edge light to separate subject from background.
      - **Catchlights**: Ensure distinct, lively reflections in the eyes.
    
    *** RETOUCHING STANDARD ***
    - **Skin**: High-end frequency separation. Keep pores and texture visible. NO "plastic" or "wax" skin.
    - **Color Grade**: Professional, neutral color temperature, slightly desaturated for a modern corporate look.
    
    *** OUTPUT ***
    - A photorealistic, 4K resolution image.
    - ${config.mode === 'duo' ? 'Both subjects standing side-by-side or slightly angled towards each other, looking confident and cohesive.' : 'Subject centered, looking directly at the camera with a confident, approachable expression.'}
    `;

    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // High fidelity model
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (e) {
        console.error("Headshot generation failed", e);
        throw e;
    }
};
