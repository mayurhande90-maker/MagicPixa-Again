import { Modality, HarmCategory, HarmBlockThreshold, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1024px for balanced quality/speed
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

interface ThumbnailStrategy {
    viralTitle: string;
    colorPalette: string;
    compositionRule: string;
    emotionVibe: string;
    textStyle: string;
    lightingStyle: string;
    viralHookDescription: string;
}

/**
 * STAGE 1: THE ANALYST (Trend & Psychology Engine)
 */
const performTrendResearch = async (category: string, title: string, format: string): Promise<ThumbnailStrategy> => {
    const ai = getAiClient();
    const platform = format === 'portrait' ? 'Instagram Reels/Stories' : 'YouTube';
    const orderId = Date.now(); // Unique ID to force fresh reasoning

    const prompt = `FRESH PRODUCTION ORDER #${orderId}
    You are a viral ${platform} Growth Consultant & CTR Specialist.
    
    RESEARCH TOPIC: "${title}" in category "${category}".
    
    TASK: Use Google Search to analyze top-performing ${platform} thumbnails/covers for THIS EXACT niche in 2025.
    1. Identify the most common "Viral Hook" (e.g., Extreme Comparison, The Big Red Arrow, Shocked Facial Expression).
    2. Determine the Trending Color Palette for ${platform}.
    3. Determine Subject Placement. 
       - IF PODCAST: Focus on Host-Guest interaction (Side-by-side or Split-screen).
       - CRITICAL FOR VERTICAL: Design MUST fit inside the center 1:1 safe zone.
    4. Write a Clickbait Title (2-4 words for vertical, longer for horizontal).
    
    OUTPUT: Return ONLY a JSON object. Ensure the strategy is unique to the provided Title and Category.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { 
                        viralTitle: { type: Type.STRING },
                        colorPalette: { type: Type.STRING }, 
                        compositionRule: { type: Type.STRING }, 
                        emotionVibe: { type: Type.STRING }, 
                        textStyle: { type: Type.STRING }, 
                        lightingStyle: { type: Type.STRING },
                        viralHookDescription: { type: Type.STRING }
                    },
                    required: ["viralTitle", "colorPalette", "compositionRule", "emotionVibe", "textStyle", "lightingStyle", "viralHookDescription"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { 
        return { 
            viralTitle: title,
            colorPalette: "High Contrast Primary Colors", 
            compositionRule: "Subject Focused Center", 
            emotionVibe: "High Energy", 
            textStyle: "Bold Impact Sans-Serif", 
            lightingStyle: "Rim Lighting",
            viralHookDescription: "Standard high-engagement layout."
        }; 
    }
};

/**
 * STAGE 2: THE DIRECTOR (Visual Production Engine)
 */
export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    const orderId = `UID-${Date.now()}`; // Fresh unique order identifier

    try {
        const strategy = await performTrendResearch(inputs.category, inputs.title, inputs.format);
        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';
        
        const brandDNA = brand ? `
        *** BRAND OVERRIDE (STRICT) ***
        Company: '${brand.companyName || brand.name}'. Colors: ${brand.colors.primary}.
        ` : "";

        // Reset directive for the image model
        parts.push({ text: `FRESH PRODUCTION ORDER: ${orderId}\nSTRICT: Purge all prior conceptual memory. Execute THIS specific order using ONLY the assets provided below.` });

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "CURRENT REFERENCE STYLE (MANDATORY):" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }
        
        if (inputs.subjectImage) {
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "CURRENT MAIN SUBJECT (MANDATORY):" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
        }

        if (inputs.hostImage) {
            const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
            parts.push({ text: "CURRENT HOST IMAGE (MANDATORY - PERSON A):" }, { inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
        }

        if (inputs.guestImage) {
            const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
            parts.push({ text: "CURRENT GUEST IMAGE (MANDATORY - PERSON B):" }, { inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
        }

        if (inputs.elementImage) {
            const optElem = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
            parts.push({ text: "CURRENT PROP/ELEMENT (OPTIONAL):" }, { inlineData: { data: optElem.data, mimeType: optElem.mimeType } });
        }

        const finalTitle = inputs.customText || strategy.viralTitle;
        let productionPrompt = "";

        const coreProductionBrief = `
        **TECHNICAL SPECIFICATION**:
        - Format: ${inputs.format === 'portrait' ? '9:16 vertical' : '16:9 landscape'}.
        - Strategy: ${strategy.viralHookDescription}.
        - Lighting: ${strategy.lightingStyle}. Use volumetric shadows and rim light to separate subject from background.
        - Text Layer: Render large, bold text saying "${finalTitle}". Ensure high contrast.
        - Subject Realism: 1:1 facial identity lock for ALL provided subjects. High-fidelity skin texture.
        - Composition: ${strategy.compositionRule}.
        ${brandDNA}`;

        if (isPodcast && inputs.hostImage && inputs.guestImage) {
            productionPrompt = `
            You are an Elite Podcast Production Designer. 
            **TASK**: Create a professional YouTube Podcast thumbnail.
            1. **MULTI-SUBJECT LOCK**: Render Person A (Host) and Person B (Guest) together in the same frame.
            2. **COMPOSITION**: Use a "Split-Frame" or "Interview" layout. Place Host on one side and Guest on the other. Ensure they appear to be in the same studio.
            3. **ENVIRONMENT**: Set the scene in a high-end podcast studio with visible Shure SM7B microphones, acoustic foam panels, and soft neon accent lights.
            4. **FOCAL POINT**: Both faces must be large and expressive. Maintain 1:1 biometrics for BOTH individuals.
            ${coreProductionBrief}
            NEGATIVE: NO merged faces, NO missing subjects, NO low-res backgrounds, NO messy text.`;
        } else if (inputs.format === 'portrait') {
            productionPrompt = `
            You are a professional Instagram thumbnail designer.
            **TASK**: Generate a high-quality Instagram reel thumbnail/cover (9:16).
            - **1:1 SAFE ZONE**: Keep all critical elements strictly inside the center 1080x1080 area.
            - **UI AVOIDANCE**: DO NOT place text/faces in the TOP 250px or BOTTOM 300px.
            ${coreProductionBrief}
            FINAL OUTPUT: A single, professionally designed, scroll-stopping static poster.`;
        } else {
            productionPrompt = `
            You are an Elite YouTube Production Designer. 
            **TASK**: Create a hyper-realistic 4K YouTube thumbnail (16:9).
            ${coreProductionBrief}
            **STRICT**: Ignore previous designs. Focus purely on the provided title "${finalTitle}" and the provided images.
            NEGATIVE: NO text artifacts, NO messy fonts, NO blurry hands, NO extra fingers, NO AI-clutter.`;
        }

        parts.push({ text: productionPrompt });

        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
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
        }));

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Generation failed. System could not render the production brief.");
    } catch (error) { 
        console.error("Master Production Error:", error);
        throw error; 
    }
};