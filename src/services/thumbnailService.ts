import { Modality, HarmCategory, HarmBlockThreshold, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Optimize image for high-fidelity production (1536px for face detail retention)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.9);
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
    title: string;
    customText?: string; 
    referenceImage?: { base64: string; mimeType: string } | null; 
    subjectImage?: { base64: string; mimeType: string } | null; 
    hostImage?: { base64: string; mimeType: string } | null; 
    guestImage?: { base64: string; mimeType: string } | null;
    elementImage?: { base64: string; mimeType: string } | null; 
}

/**
 * PHASE 1: STRATEGIC CTR RESEARCH
 * Uses Gemini 3 Pro + Search Grounding to find high-performance curiosity hooks.
 */
const performTrendResearch = async (category: string, title: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `You are a World-Class Thumbnail Designer and CTR Strategist.
    TASK: Research 2025 high-performing viral trends for Category: "${category}" and Topic: "${title}".
    
    GOAL: Engineering a "Clickbait Success Formula".
    1. **Visual Hook**: Identify one dominant idea/emotion (Curiosity, Surprise, Fear, Authority, or Contrast).
    2. **Headline Engineering**: Generate a 2-5 word Curiosity Gap headline. Avoid complete sentences.
    3. **Composition Style**: Determine if it should be an extreme facial expression, a "Before vs After", or a "Secret" reveal.
    
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
        return { 
            emotion: "Curiosity",
            curiosityHeadline: "THE TRUTH REVEALED", 
            visualStrategy: "Extreme close-up of subject with shocked expression", 
            vibe: "Intense" 
        };
    }
};

/**
 * PHASE 2: FORENSIC BIOMETRIC ANCHOR
 * Ensures the generated output preserves the uploaded person's identity exactly.
 */
const performBiometricScan = async (ai: any, base64: string, mimeType: string, label: string): Promise<string> => {
    const prompt = `Perform a forensic biometric scan of ${label}. 
    Precisely describe: Face shape, jawline, eye color, nose bridge, exact hair texture/style, and unique marks.
    This description is an IMMUTABLE ANCHOR. You must NOT change these features in the final render.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
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
        // 1. Strategic Research
        const blueprint = await performTrendResearch(inputs.category, inputs.title);
        
        // 2. Identity Lock & Asset Preparation
        const parts: any[] = [];
        let subjectA_Identity = "";
        let subjectB_Identity = "";

        if (inputs.subjectImage) {
            subjectA_Identity = await performBiometricScan(ai, inputs.subjectImage.base64, inputs.subjectImage.mimeType, "Subject");
            const opt = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "IDENTITY SOURCE:" }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
        } else if (inputs.hostImage) {
            subjectA_Identity = await performBiometricScan(ai, inputs.hostImage.base64, inputs.hostImage.mimeType, "Host");
            const optH = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
            parts.push({ text: "HOST SOURCE:" }, { inlineData: { data: optH.data, mimeType: optH.mimeType } });
            
            if (inputs.guestImage) {
                subjectB_Identity = await performBiometricScan(ai, inputs.guestImage.base64, inputs.guestImage.mimeType, "Guest");
                const optG = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "GUEST SOURCE:" }, { inlineData: { data: optG.data, mimeType: optG.mimeType } });
            }
        }

        if (inputs.elementImage) {
            const optEl = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
            parts.push({ text: "PROP/OBJECT SOURCE:" }, { inlineData: { data: optEl.data, mimeType: optEl.mimeType } });
        }

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "LAYOUT REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        // 3. Platform Technical Rules
        let platformMandates = "";
        if (inputs.format === 'portrait') {
            platformMandates = `
            *** PLATFORM: INSTAGRAM (1080x1920) ***
            - **GRID SAFE ZONE**: All critical elements (Faces, Text, Props) MUST stay within the center 1080x1080 square.
            - **UI CLEARANCE**: Keep the TOP 250px and BOTTOM 300px clear of all text/logos.
            - **COMPOSITION**: Vertical orientation with center-focal visual hierarchy.
            `;
        } else {
            platformMandates = `
            *** PLATFORM: YOUTUBE (1280x720) ***
            - **PREVIEW OPTIMIZATION**: Design for both desktop and mobile app previews.
            - **TEXT SCALING**: Text should be massive, bold, and aggressive for tiny mobile screens.
            - **TIMER CLEARANCE**: Keep the BOTTOM RIGHT corner clear of critical info.
            `;
        }

        // 4. Content Type Logic
        let contentTypeLogic = "";
        if (inputs.category === 'Podcast') {
            contentTypeLogic = `
            *** CONTENT TYPE: PODCAST (SYMMETRY PROTOCOL) ***
            - **CO-PRESENCE**: Include BOTH the Host and Guest in the frame.
            - **BALANCE**: Place subjects on opposite sides (Host Left, Guest Right or vice versa).
            - **VISIBILITY**: Ensure both faces are equally large and clearly visible.
            - **TEXT PLACEMENT**: Center the headline between subjects or place it above their shoulders. DO NOT overlap faces.
            `;
        } else {
            contentTypeLogic = `
            *** CONTENT TYPE: ${inputs.category} (SINGLE FOCUS) ***
            - **PRIMARY SUBJECT**: Use a tight crop (head and shoulders) of the subject.
            - **ENGAGEMENT**: Ensure strong eye contact or a high-emotion profile angle.
            `;
        }

        // 5. Final Creative Instruction
        const prompt = `You are a High-CTR Thumbnail Designer. Generate a scroll-stopping asset for "${inputs.title}".

        ${platformMandates}
        ${contentTypeLogic}

        **IDENTITY PROTOCOL (STRICT)**:
        - SUBJECT A: ${subjectA_Identity}
        - SUBJECT B: ${subjectB_Identity}
        - RULES: **STRICTLY DO NOT change facial features, hair structure, eye color, or body shape.** Preserve likeness 1:1.
        - SKIN: Natural skin textures (pores, organic light), NO smooth plastic AI skin.

        **DESIGN SPECS**:
        - **ONE IDEA ONLY**: Focus on the emotion of "${blueprint.emotion}".
        - **CURIOSITY HOOK**: Render the text "${inputs.customText || blueprint.curiosityHeadline}" in BOLD, CLEAN, THICK SANS-SERIF typography.
        - **LEGIBILITY**: Text must be high-contrast and readable at small sizes. Text must NOT touch image edges.
        - **AESTHETICS**: Modern premium look. ${blueprint.lightingStyle}. ${blueprint.colorPalette}. ${blueprint.visualStrategy}.
        - **CLUTTER**: ZERO decorative noise. Clean cutouts integrated with atmospheric depth/gradients.

        OUTPUT: A photorealistic, platform-native 4K Designed Thumbnail.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { 
                    aspectRatio: inputs.format === 'portrait' ? '9:16' : '16:9',
                    imageSize: "1K"
                },
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
        throw new Error("AI Production engine failed to render. Please verify source assets.");
    } catch (error) { 
        console.error("Thumbnail AI Service Error:", error);
        throw error; 
    }
};
