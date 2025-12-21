import { Modality, HarmCategory, HarmBlockThreshold, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Optimize image for high-fidelity production (1536px for better face detail)
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
 * PHASE 1: STRATEGIC TREND RESEARCH
 * Uses Gemini 3 Pro + Search Grounding to identify viral design patterns.
 */
const performTrendResearch = async (category: string, title: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `You are a World-Class Viral Content Strategist.
    TASK: Research 2025 YouTube and Instagram trends for Category: "${category}" and Topic: "${title}".
    
    GOAL: Identify the "Clickbait Success Formula" for this specific niche.
    1. **Visual Hooks**: What visual elements are stopping the scroll? (e.g. glowing borders, extreme depth, specific props).
    2. **Color Palette**: Identify colors that signify "must-watch" or "high value" in this category.
    3. **Typography**: What font styles have the highest CTR right now? (e.g. Heavy sans-serif with yellow stroke).
    4. **Composition**: Where is the subject vs the text?
    
    OUTPUT JSON ONLY:
    {
        "clickbaitHeadline": "A viral, high-energy 2-4 word headline",
        "colorStrategy": "Exact color palette description",
        "lightingMood": "e.g. Dramatic Rim Lighting, Sunset Glow, High-Key Studio",
        "compositionRules": "Specific layout rules for subject and text",
        "trendingElements": "e.g. Red circles, arrows, specific background textures",
        "vibe": "e.g. Shocking, Professional, Urgent, Mysterious"
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
                        lightingMood: { type: Type.STRING },
                        compositionRules: { type: Type.STRING },
                        trendingElements: { type: Type.STRING },
                        vibe: { type: Type.STRING }
                    },
                    required: ["clickbaitHeadline", "colorStrategy", "compositionRules", "vibe"]
                }
            }
        }));
        return JSON.parse(response.text || "{}");
    } catch (e) {
        return { 
            clickbaitHeadline: "UNBELIEVABLE RESULT", 
            colorStrategy: "High-contrast Yellow and Black", 
            compositionRules: "Rule of thirds, subject on left", 
            vibe: "Intense" 
        };
    }
};

/**
 * PHASE 2: BIOMETRIC IDENTITY LOCK
 * Scans the person to ensure generation doesn't warp their appearance.
 */
const performIdentityScan = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Perform a forensic biometric scan of this person. 
    Describe their face shape, eye color, exact hair texture/style, nose bridge, and unique features. 
    This description will be used as an IMMUTABLE ANCHOR. The final image must preserve this identity with 100% precision.`;
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
        // 1. Strategic Research
        const blueprint = await performTrendResearch(inputs.category, inputs.title);
        
        // 2. Identity Anchor (Detect first if subject exists)
        let identityBrief = "";
        const parts: any[] = [];

        if (inputs.subjectImage) {
            identityBrief = await performIdentityScan(ai, inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "IDENTITY ANCHOR (SUBJECT):" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
        } else if (inputs.hostImage) {
             identityBrief = await performIdentityScan(ai, inputs.hostImage.base64, inputs.hostImage.mimeType);
             const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
             parts.push({ text: "IDENTITY ANCHOR (HOST):" }, { inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
             if (inputs.guestImage) {
                const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "GUEST REFERENCE:" }, { inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
             }
        }

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "LAYOUT REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        // 3. Platform Logic (Safe Zones)
        let platformInstruction = "";
        if (inputs.format === 'portrait') {
            platformInstruction = `
            *** PLATFORM SPEC: INSTAGRAM REELS / STORIES ***
            - **Safe Zone Rule**: Leave the TOP 15% and BOTTOM 20% clear of important text/logos to avoid UI overlap.
            - **Grid View Optimization**: All core visual elements and headlines must be centered so they look perfect in a 1:1 square profile grid.
            - **Typography**: Vertical text or centered bold headlines.
            `;
        } else {
            platformInstruction = `
            *** PLATFORM SPEC: YOUTUBE THUMBNAIL ***
            - **Safe Zone Rule**: Leave the BOTTOM RIGHT corner clear (Timer overlap).
            - **Composition**: Cinematic wide angle, extreme focal depth.
            `;
        }

        // 4. Master Creative Prompt
        const brandDNA = brand ? `
        *** BRAND INTEGRATION ***
        Brand Name: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Modern'}.
        Target Palette: ${brand.colors.primary}, ${brand.colors.accent}.
        Typography: ${brand.fonts.heading}.
        ` : "";

        let prompt = `You are a World-Class Advertising Creative Director.
        ${brandDNA}
        ${platformInstruction}

        **GOAL**: Generate a high-CTR clickbait masterpiece for "${inputs.title}".
        
        **IDENTITY PROTOCOL (STRICT)**:
        - SUBJECT BIOMETRICS: ${identityBrief}
        - RULE: **DO NOT change facial features, hair structure, or body shape.** The person must be 1:1 recognizable. 
        - Skin must have natural texture (pores, vellus hair), NOT smooth AI plastic.

        **DESIGN SCIENCE**:
        - **Visual Style**: ${blueprint.lightingMood}. Use ${blueprint.colorStrategy}.
        - **Composition**: ${blueprint.compositionRules}. Integrate the subject into the environment with realistic contact shadows and depth-of-field (f/1.8). NO cutout look.
        - **Text Overlay**: Render the text "${inputs.customText || blueprint.clickbaitHeadline}" using ${brand?.fonts.heading || 'Bold Sans-Serif'}.
        - **Impact**: ${blueprint.vibe}. Add ${blueprint.trendingElements} for maximum scroll-stop.

        OUTPUT: A photorealistic, high-resolution 4K designed asset.`;

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
        throw new Error("The AI production engine failed to render. Please check your source photos and try again.");
    } catch (error) { 
        console.error("Thumbnail Generation Error:", error);
        throw error; 
    }
};
