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
 * Researches the niche and engineers the clickbait strategy.
 */
const performTrendResearch = async (category: string, title: string): Promise<ThumbnailStrategy> => {
    const ai = getAiClient();
    const prompt = `You are a viral YouTube Growth Consultant & CTR Specialist.
    
    RESEARCH TOPIC: "${title}" in category "${category}".
    
    TASK: Use Google Search to analyze top-performing thumbnails for this niche in 2025.
    1. Identify the most common "Viral Hook" (e.g., Extreme Comparison, The Big Red Arrow, Shocked Facial Expression, Mystery Box).
    2. Determine the Trending Color Palette (e.g., High-Saturation Yellow/Blue for Gaming, Clean Minimalist for Tech).
    3. Determine Subject Placement (e.g., Rule of Thirds, Center Symmetrical).
    4. Write a Clickbait Title if the user's title is weak. Use Curiosity Gaps or Negativity Bias.
    
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
            compositionRule: "Subject Focused Left-Third", 
            emotionVibe: "High Energy Shock", 
            textStyle: "Bold Impact Sans-Serif with Shadow", 
            lightingStyle: "Rim Lighting with Colorful Accents",
            viralHookDescription: "Standard professional YouTube layout"
        }; 
    }
};

/**
 * STAGE 2: THE DIRECTOR (Visual Production Engine)
 * Orchestrates the final 4K generation based on the analyst's strategy.
 */
export const generateThumbnail = async (inputs: ThumbnailInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. Get Strategy
        const strategy = await performTrendResearch(inputs.category, inputs.title);
        
        // 2. Prepare Assets
        const parts: any[] = [];
        
        const brandDNA = brand ? `
        *** BRAND OVERRIDE (STRICT) ***
        Company: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice}.
        Colors: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
        Fonts: ${brand.fonts.heading}.
        ` : "";

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE STYLE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }
        
        if (inputs.subjectImage) {
            const optSub = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
            parts.push({ text: "SUBJECT (Digital Twin Lock):" }, { inlineData: { data: optSub.data, mimeType: optSub.mimeType } });
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

        // 3. Assemble Production Prompt
        const finalTitle = inputs.customText || strategy.viralTitle;
        
        const productionPrompt = `
        You are an Elite Commercial Production Designer. Create a hyper-realistic 4K YouTube thumbnail.
        
        **TECHNICAL SPECIFICATION**:
        - Format: ${inputs.format === 'portrait' ? '9:16 vertical' : '16:9 landscape'}.
        - Strategy: ${strategy.viralHookDescription}.
        - Lighting: ${strategy.lightingStyle}. Use volumetric shadows and rim light to separate subject from background.
        - Color Palette: ${strategy.colorPalette}.
        - Optic Rule: Shot on Sony A7R IV, 35mm f/1.4 lens. Cinematic depth of field.
        
        ${brandDNA}
        
        **CONTENT EXECUTION**:
        1. **Text Layer**: Render large, bold, 3D extruded text saying "${finalTitle}". 
           - Style: ${strategy.textStyle}. 
           - Visibility: High-contrast stroke. Place in "Safe Zone" (Top center or center right).
        2. **Subject Realism**: 1:1 facial identity lock. Extreme emotional expression (wide eyes, muscle tension). High-fidelity skin texture (pores visible). No plastic look.
        3. **Composition**: ${strategy.compositionRule}. Use leading lines to point at the subject or the text.
        
        **NEGATIVE CONSTRAINTS**: 
        - DO NOT warp facial identity. 
        - NO text artifacts, NO messy fonts, NO blurry hands, NO extra fingers, NO AI-clutter.
        
        FINAL OUTPUT: A single, click-worthy commercial visual.`;

        parts.push({ text: productionPrompt });

        // 4. Generate
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
        throw new Error("Thumbnail generation failed. System could not render the production brief.");
    } catch (error) { 
        console.error("Master Production Error:", error);
        throw error; 
    }
};