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
    const prompt = `You are a viral ${platform} Growth Consultant & CTR Specialist.
    
    RESEARCH TOPIC: "${title}" in category "${category}".
    
    TASK: Use Google Search to analyze top-performing ${platform} thumbnails/covers for this niche in 2025.
    1. Identify the most common "Viral Hook" (e.g., Extreme Comparison, The Big Red Arrow, Shocked Facial Expression).
    2. Determine the Trending Color Palette for ${platform}.
    3. Determine Subject Placement.
    4. Write a Clickbait Title (2-4 words for vertical, longer for horizontal).
    
    OUTPUT: Return ONLY a JSON object.`;

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
            compositionRule: "Subject Focused", 
            emotionVibe: "High Energy", 
            textStyle: "Bold Impact Sans-Serif", 
            lightingStyle: "Rim Lighting",
            viralHookDescription: "Standard high-engagement layout"
        }; 
    }
};

/**
 * STAGE 2: THE DIRECTOR (Visual Production Engine)
 */
export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    try {
        const strategy = await performTrendResearch(inputs.category, inputs.title, inputs.format);
        const parts: any[] = [];
        
        const brandDNA = brand ? `
        *** BRAND OVERRIDE (STRICT) ***
        Company: '${brand.companyName || brand.name}'. Colors: ${brand.colors.primary}.
        ` : "";

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE STYLE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }
        
        if (inputs.subjectImage) {
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "SUBJECT (Main Persona):" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
        }

        if (inputs.hostImage) {
            const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
            parts.push({ text: "HOST IMAGE:" }, { inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
        }

        if (inputs.guestImage) {
            const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
            parts.push({ text: "GUEST IMAGE:" }, { inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
        }

        if (inputs.elementImage) {
            const optElem = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
            parts.push({ text: "PROB/ELEMENT:" }, { inlineData: { data: optElem.data, mimeType: optElem.mimeType } });
        }

        const finalTitle = inputs.customText || strategy.viralTitle;
        let productionPrompt = "";

        if (inputs.format === 'portrait') {
            // --- STRICT INSTAGRAM REEL RULES ---
            productionPrompt = `
            You are a professional Instagram thumbnail designer.
            TASK: Generate a high-quality Instagram reel thumbnail/cover (9:16).
            
            **CANVAS & FORMAT**:
            - Resolution: 1080 x 1920 px.
            - **SAFE ZONE RULE**: Keep ALL critical elements (faces, text) inside the center 1:1 square zone (center 1080x1080 area) so nothing is cropped in the profile grid view.
            - **UI AVOIDANCE**: Avoid placing important elements in the top 250px or bottom 300px (Reels UI overlay).
            
            **COMPOSITION RULES**:
            - Focus on one clear idea only.
            - One primary subject (human face with visible emotional expression).
            - **Tight framing**: Medium close-up or close-up.
            - NO clutter, NO background distractions.
            - Strong visual hierarchy: Subject first, text second.
            
            **TEXT RULES**:
            - Text to render: "${finalTitle}". 
            - LIMIT: 2–4 words only (Maximum 5).
            - Style: Bold, clean, thick sans-serif typography.
            - Visibility: High contrast against background. Must be readable as a small grid thumbnail.
            
            **COLOR & STYLE**:
            - High contrast colors. Avoid dull tones.
            - Modern, minimal aesthetic. Bright, clear lighting.
            
            ${brandDNA}
            
            **QUALITY CONTROL**: Sharp focus, clean edges, no distorted faces.
            FINAL OUTPUT: A scroll-stopping static poster for mobile viewing.`;
        } else {
            // --- HIGH-END YOUTUBE RULES ---
            productionPrompt = `
            You are an Elite YouTube Production Designer. Create a hyper-realistic 4K YouTube thumbnail (16:9).
            - Strategy: ${strategy.viralHookDescription}.
            - Lighting: ${strategy.lightingStyle}. Use volumetric shadows and rim light.
            - Text Layer: Render large, bold text saying "${finalTitle}".
            - Subject Realism: 1:1 facial identity lock. Extreme emotional expression. High-fidelity skin texture.
            - Composition: ${strategy.compositionRule}. Use leading lines.
            ${brandDNA}
            NEGATIVE: NO text artifacts, NO messy fonts, NO blurry hands.`;
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