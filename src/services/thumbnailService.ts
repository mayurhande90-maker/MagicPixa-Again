import { Modality, HarmCategory, HarmBlockThreshold, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1280px (HD) for high-fidelity production
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.9);
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
 * PHASE 1: STRATEGIC TREND RESEARCH
 * Uses Gemini 3 Pro + Search Grounding to identify what is currently viral.
 */
const performTrendResearch = async (category: string, title: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `You are a World-Class Viral Strategist. 
    TASK: Research 2025 YouTube and Instagram trends for Category: "${category}" and Topic: "${title}".
    
    GOAL: Identify the "Clickbait Success Formula" for this specific niche.
    1. **Visual Hook**: What imagery is stopping the scroll? (e.g., Extreme facial expressions, red circles, split-screen comparisons).
    2. **Color Palette**: What colors signify "must-watch" in this category?
    3. **Typography**: What font style and color (e.g., Yellow on Black, White with thick Stroke) has the highest CTR?
    4. **Composition**: Where should the subject and text go?
    
    OUTPUT JSON ONLY:
    {
        "clickbaitHeadline": "A viral, emotional, or curious headline (2-4 words)",
        "colorStrategy": "Dominant and accent colors",
        "lightingStyle": "e.g. Rim lighting, dramatic shadows",
        "compositionRule": "e.g. Subject extreme left, text extreme right",
        "graphicElements": "e.g. Glow effects, arrows, high-contrast borders",
        "vibe": "e.g. Shocked, Luxurious, Intense, Helpful"
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
                        clickbaitHeadline: { type: Type.STRING },
                        colorStrategy: { type: Type.STRING },
                        lightingStyle: { type: Type.STRING },
                        compositionRule: { type: Type.STRING },
                        graphicElements: { type: Type.STRING },
                        vibe: { type: Type.STRING }
                    },
                    required: ["clickbaitHeadline", "colorStrategy", "compositionRule", "vibe"]
                }
            }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { 
            clickbaitHeadline: "UNBELIEVABLE RESULT", 
            colorStrategy: "High-contrast Yellow and Black", 
            compositionRule: "Rule of Thirds", 
            vibe: "Intense" 
        };
    }
};

/**
 * PHASE 2: BIOMETRIC IDENTITY SCAN
 * Extracts facial/body features to ensure 1:1 likeness in production.
 */
const performIdentityLock = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Perform a forensic biometric scan. Describe the face shape, exact hair texture/style, eye color, and unique features. 
    This description will be used to LOCK the identity. Do not hallucinate a generic person. 
    Be extremely specific about the nose bridge, jawline, and hairline.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Preserve identity exactly.";
    } catch (e) { return "Preserve identity exactly."; }
};

/**
 * THE PRODUCTION ENGINE
 */
export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    try {
        const blueprint = await performTrendResearch(inputs.category, inputs.title);
        const parts: any[] = [];
        
        // 1. BRAND CONTEXT
        const brandDNA = brand ? `
        *** BRAND INTEGRATION ***
        Brand: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Professional'}.
        Target Colors: ${brand.colors.primary}, ${brand.colors.accent}.
        Typography: ${brand.fonts.heading}.
        ` : "";

        // 2. IDENTITY LOCKING (Perform only if subject image provided)
        let identityBrief = "";
        if (inputs.subjectImage) {
            identityBrief = await performIdentityLock(ai, inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "SUBJECT SOURCE (IDENTITY ANCHOR):" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
        } else if (inputs.hostImage) {
             // For Podcasters
             identityBrief = await performIdentityLock(ai, inputs.hostImage.base64, inputs.hostImage.mimeType);
             const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
             parts.push({ text: "HOST SOURCE:" }, { inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
             if (inputs.guestImage) {
                 const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                 parts.push({ text: "GUEST SOURCE:" }, { inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
             }
        }

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "LAYOUT REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        if (inputs.elementImage) {
            const optElem = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
            parts.push({ text: "PROP/ELEMENT:" }, { inlineData: { data: optElem.data, mimeType: optElem.mimeType } });
        }

        // 3. SAFE ZONE LOGIC (For Instagram/Reels)
        let safeZoneInstruction = "";
        if (inputs.format === 'portrait') {
            safeZoneInstruction = `
            *** SAFE ZONE COMPLIANCE (STRICT) ***
            This is for Instagram Reels / TikTok.
            - TOP 15%: KEEP CLEAR of important text (Avoid UI overlap).
            - BOTTOM 25%: KEEP CLEAR of important text (Avoid Captions/UI overlap).
            - VERTICAL CENTER: All high-impact graphics and headlines must live in the center 60% of the height.
            - GRID COMPATIBILITY: Ensure the center 1:1 square looks like a complete image for the profile grid.
            `;
        }

        // 4. THE MASTER PROMPT
        let prompt = `You are an Elite Ad Agency Creative Director.
        ${brandDNA}
        ${safeZoneInstruction}

        **THE MISSION**: Generate a high-CTR, clickbait masterpiece for "${inputs.title}".
        
        **IDENTITY PROTOCOL (IMMUTABLE)**:
        - SUBJECT BIOMETRICS: ${identityBrief}
        - RULES: **DO NOT change facial features, hair, or body structure.** The person must be 100% recognizable.
        - Skin must have real texture (pores), not smooth AI plastic.
        
        **DESIGN SCIENCE (RESEARCH BACKED)**:
        - **Headline**: Render "${inputs.customText || blueprint.clickbaitHeadline}" in ${brand?.fonts.heading || 'Bold Modern Sans'}.
        - **Styling**: ${blueprint.colorStrategy}. Use high-contrast shadows and outlines for "POP".
        - **Harmony**: No "cutout" look. The subject must be integrated with environment lighting, contact shadows, and atmospheric depth.
        - **Vibe**: ${blueprint.vibe}.
        - **Layout**: ${blueprint.compositionRule}.
        
        OUTPUT: One photorealistic 4K professional asset.`;

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
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Production engine failed to render. Request may be blocked.");
    } catch (error) { 
        console.error("Thumbnail Service Error:", error);
        throw error; 
    }
};
