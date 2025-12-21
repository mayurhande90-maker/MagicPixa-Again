import { Modality, HarmCategory, HarmBlockThreshold, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Optimize image for high-fidelity production (1536px for face detail retention)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

interface ThumbnailInputs {
    format: 'landscape' | 'portrait';
    category: string;
    mood?: string;
    micMode?: string;
    title: string;
    customText?: string; 
    referenceImage?: { base64: string; mimeType: string } | null; 
    subjectImage?: { base64: string; mimeType: string } | null; 
    hostImage?: { base64: string; mimeType: string } | null; 
    guestImage?: { base64: string; mimeType: string } | null;
    elementImage?: { base64: string; mimeType: string } | null; 
    requestId: string; // Mandatory for session freshness
}

/**
 * PHASE 1: STRATEGIC CTR RESEARCH
 */
const performTrendResearch = async (category: string, title: string, mood?: string, requestId?: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `You are a World-Class Thumbnail Designer and CTR Strategist.
    
    *** UNIQUE REQUEST ID: ${requestId} ***
    TASK: Research 2025 high-performing viral trends for Category: "${category}" and Topic: "${title}".
    ${mood ? `USER-DEFINED MOOD: ${mood}` : ''}
    
    GOAL: Engineering a "Clickbait Success Formula".
    1. **Visual Hook**: Identify one dominant idea/emotion (Curiosity, Surprise, Fear, Authority, or Contrast).
    2. **Headline Engineering**: Generate a 2-5 word Curiosity Gap headline.
    
    OUTPUT JSON ONLY:
    {
        "emotion": "Single dominant emotion",
        "curiosityHeadline": "2-5 word high-impact text hook",
        "visualStrategy": "Detailed description of the singular focal point",
        "lightingStyle": "e.g. Cinematic High-Contrast, Rim Lighting",
        "colorPalette": "Vibrant, high-contrast palette description",
        "vibe": "The specific performance-oriented mood"
    }`;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        emotion: { type: Type.STRING },
                        curiosityHeadline: { type: Type.STRING },
                        visualStrategy: { type: Type.STRING },
                        lightingStyle: { type: Type.STRING },
                        colorPalette: { type: Type.STRING },
                        vibe: { type: Type.STRING }
                    },
                    required: ["emotion", "curiosityHeadline", "visualStrategy", "vibe"]
                }
            }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { emotion: mood || "Curiosity", curiosityHeadline: "THE TRUTH REVEALED", visualStrategy: "Extreme close-up of subject with shocked expression", vibe: "Intense" };
    }
};

/**
 * PHASE 2: FORENSIC IDENTITY ANCHOR
 */
const performBiometricScan = async (ai: any, base64: string, mimeType: string, label: string): Promise<string> => {
    const prompt = `Perform a forensic biometric scan of ${label}. 
    Precisely describe: 1. Face shape and jawline angle. 2. Eye shape (eyelid type, canthal tilt). 3. Nose bridge width and tip shape. 4. Mouth shape (lip thickness, cupid's bow). 5. Exact hair texture and hairline.
    This description is a SACRED IDENTITY LOCK. The final render MUST be a 1:1 pixel-perfect physical replica of this person. DO NOT use generic faces.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Preserve identity exactly.";
    } catch (e) { return "Preserve identity exactly."; }
};

/**
 * THE PRODUCTION ENGINE: PIXA THUMBNAIL PRO
 */
export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. FRESH STRATEGY
        const blueprint = await performTrendResearch(inputs.category, inputs.title, inputs.mood, inputs.requestId);
        
        const parts: any[] = [];
        let subjectA_Identity = "";
        let subjectB_Identity = "";

        if (inputs.subjectImage) {
            subjectA_Identity = await performBiometricScan(ai, inputs.subjectImage.base64, inputs.subjectImage.mimeType, "Subject");
            const opt = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "SOURCE IDENTITY PIXELS (MAIN):" }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
        } else if (inputs.hostImage) {
            subjectA_Identity = await performBiometricScan(ai, inputs.hostImage.base64, inputs.hostImage.mimeType, "Host");
            const optH = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
            parts.push({ text: "SOURCE IDENTITY PIXELS (HOST):" }, { inlineData: { data: optH.data, mimeType: optH.mimeType } });
            
            if (inputs.guestImage) {
                subjectB_Identity = await performBiometricScan(ai, inputs.guestImage.base64, inputs.guestImage.mimeType, "Guest");
                const optG = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "SOURCE IDENTITY PIXELS (GUEST):" }, { inlineData: { data: optG.data, mimeType: optG.mimeType } });
            }
        }

        if (inputs.elementImage) {
            const optEl = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
            parts.push({ text: "OBJECT SOURCE:" }, { inlineData: { data: optEl.data, mimeType: optEl.mimeType } });
        }

        const MOOD_SPECS: Record<string, string> = {
            'Viral': 'Style: High-energy, ultra-vibrant colors, exaggerated saturation, high-key lighting, subjects are extremely sharp and pop off the screen.',
            'Cinematic': 'Style: Movie poster aesthetic, heavy cinematic shadows, anamorphic lens flares, teal and orange color grade, high dramatic contrast.',
            'Luxury/Premium': 'Style: Elegant premium lighting, warm golden highlights, deep blacks, expensive textures, sophisticated polished finish.',
            'Minimalist/Clean': 'Style: Clean white space, soft shadows, airy colors, modern minimalist aesthetic, uncluttered high-end design.',
            'Gamer': 'Style: Aggressive pink and blue rim lighting, dark gaming environment, glowing accents, electric atmosphere.',
            'Dark Mystery': 'Style: Low-key lighting, cold desaturated tones, heavy atmosphere, spotlighting on focal points, "hidden truth" vibe.',
            'Retro Style': 'Style: 95s film grain, warm nostalgic tones, vintage polaroid texture, soft focus background, authentic analog look.',
            'Bright & Natural': 'Style: Soft natural daylight, high exposure without losing detail, clean and friendly, cheerful vibes.'
        };

        const moodDetail = inputs.mood ? (MOOD_SPECS[inputs.mood] || MOOD_SPECS['Viral']) : "";

        let styleInstruction = "";
        if (inputs.referenceImage) {
            styleInstruction = `
            *** VISUAL INHERITANCE PROTOCOL (HIGH PRIORITY) ***
            - **SOURCE**: Use the provided 'REFERENCE THUMBNAIL' as the absolute source of truth for lighting, layout, color palette, and visual vibe.
            ${inputs.mood ? `- **SECONDARY STYLE**: Infuse elements of the '${inputs.mood}' mood while maintaining the core structure of the reference.` : ''}
            - **MANDATE**: Copy the grading, exposure, and atmosphere of the reference exactly. 
            - **COMPOSITION**: You may adapt the layout to fit the new subjects, but the "feeling" must match the reference pixels.
            `;
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE THUMBNAIL (STYLE SOURCE):" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        } else {
            styleInstruction = moodDetail || MOOD_SPECS['Viral'];
        }

        const gearModifier = inputs.micMode === 'Professional Mics' ? `
        *** STUDIO GEAR PROTOCOL ***
        - **DUAL MICS**: Place TWO separate professional high-end studio microphones (Shure SM7B type) on boom arms.
        - **PLACEMENT**: One mic positioned realistically in front of the HOST, and a second mic positioned realistically in front of the GUEST.
        - **INTEGRATION**: Ensure boom arms are attached to the desks or coming from the side. Mics should NOT block faces but be visible and grounded in the scene.` : "";

        const platformMandates = inputs.format === 'portrait' ? `*** PLATFORM: 9:16 VERTICAL ***\n- SAFE ZONE: Keep all critical faces/text in the center 1080x1080.` : `*** PLATFORM: 16:9 LANDSCAPE ***\n- MOBILE OPTIMIZED: Text must be massive and scannable on small screens.`;

        // MASTER PROMPT WITH STATELESS DIRECTIVE
        const prompt = `You are a World-Class Thumbnail Designer. Create a scroll-stopping asset for "${inputs.title}".

        *** SESSION REFRESH TOKEN: ${inputs.requestId} ***
        CRITICAL: THIS IS A NEW INDEPENDENT REQUEST. DISREGARD PREVIOUS DESIGN ARCHETYPES.
        
        ${platformMandates}
        ${styleInstruction}
        ${gearModifier}

        *** IDENTITY ARCHITECTURE (STRICT) ***
        - SUBJECT A (HOST): ${subjectA_Identity}
        - SUBJECT B (GUEST): ${subjectB_Identity}
        - **MANDATE**: DO NOT generate generic AI faces. The subjects in the output must be the EXACT 1:1 physical digital twins of the uploaded sources.
        - **SKIN**: Photorealistic skin textures (pores, organic light). Zero plastic smoothness.

        *** VISUAL COMPOSITION ***
        - **DEPTH**: Apply professional Gaussian blur to the background. Subjects MUST be in ultra-sharp focus.
        - **LIGHTING**: Add strong "Rim Lighting" around subjects to separate them from the background.
        - **TYPOGRAPHY**: Render the text "${inputs.customText || blueprint.curiosityHeadline}" in MASSIVE, stylized, high-contrast typography.
        - **CONTRAST**: Extreme high-dynamic range (HDR) look.

        OUTPUT: A photorealistic, designed 4K thumbnail.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.format === 'portrait' ? '9:16' : '16:9', imageSize: "1K" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("AI Production engine failed to render.");
    } catch (error) { 
        console.error("Thumbnail AI Service Error:", error);
        throw error; 
    }
};
