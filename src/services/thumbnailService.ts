
import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1024px (Safe HD) to prevent payload timeouts with multiple images
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

/**
 * PHASE 1: DEEP TREND RESEARCH
 * Uses Google Search to find what is currently working for this niche.
 */
const performTrendResearch = async (category: string, title: string, format: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `You are a YouTube/Instagram Growth Strategist.
    
    TASK: Research the current VIRAL THUMBNAIL TRENDS for the category: "${category}" and topic: "${title}".
    
    Using Google Search, identify:
    1. **Color Psychology**: What color combinations are driving the highest CTR right now for this niche? (e.g., "High contrast Yellow/Black", "Neon Green/Purple").
    2. **Composition**: What layout is trending? (e.g., "Split screen", "Close-up reaction", "Floating object").
    3. **Typography**: What font styles are popular? (e.g., "Big White Sans-Serif with Drop Shadow", "Distressed Grunge").
    
    OUTPUT: A JSON object describing the "Visual Blueprint".
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro model for reasoning + search
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        colorPalette: { type: Type.STRING },
                        compositionRule: { type: Type.STRING },
                        emotionVibe: { type: Type.STRING },
                        textStyle: { type: Type.STRING },
                        lightingStyle: { type: Type.STRING }
                    },
                    required: ["colorPalette", "compositionRule", "emotionVibe", "textStyle", "lightingStyle"]
                }
            }
        });

        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (e) {
        console.warn("Trend research failed, using fallback.", e);
        return {
            colorPalette: "High Contrast (Yellow/Red/Black)",
            compositionRule: "Rule of Thirds, Subject Focused",
            emotionVibe: "High Energy, Excited",
            textStyle: "Bold Sans-Serif, White with Shadow",
            lightingStyle: "Dramatic Rim Lighting"
        };
    }
};

/**
 * PHASE 2: HYPER-REALISTIC GENERATION
 */
export const generateThumbnail = async (inputs: ThumbnailInputs): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. Get the Blueprint (Trends)
        const blueprint = await performTrendResearch(inputs.category, inputs.title, inputs.format);

        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';
        
        // Detect if any human subjects are provided
        const hasHumanAssets = !!(inputs.subjectImage || inputs.hostImage || inputs.guestImage);

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE STYLE (Copy this Layout/Vibe):" });
            parts.push({ inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        if (isPodcast) {
            if (inputs.hostImage) {
                const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
                parts.push({ text: "HOST PHOTO (Subject A):" });
                parts.push({ inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
            }
            if (inputs.guestImage) {
                const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "GUEST PHOTO (Subject B):" });
                parts.push({ inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
            }
        } else {
            if (inputs.subjectImage) {
                const optSubject = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
                parts.push({ text: "MAIN SUBJECT PHOTO:" });
                parts.push({ inlineData: { data: optSubject.data, mimeType: optSubject.mimeType } });
            }
            if (inputs.elementImage) {
                const optElement = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
                parts.push({ text: "SECONDARY OBJECT (Product/Prop):" });
                parts.push({ inlineData: { data: optElement.data, mimeType: optElement.mimeType } });
            }
        }

        // Construct Highly Specific System Prompt
        let prompt = `You are an Elite Viral Content Designer (Top 0.1% CTR).
        
        *** TASK ***
        Create a Hyper-Realistic ${inputs.format === 'portrait' ? 'Vertical (9:16)' : 'Horizontal (16:9)'} Thumbnail.
        CATEGORY: "${inputs.category}".
        TOPIC: "${inputs.title}".

        *** TRENDING BLUEPRINT (APPLY STRICTLY) ***
        - **Colors**: ${blueprint.colorPalette}
        - **Composition**: ${blueprint.compositionRule}
        - **Lighting**: ${blueprint.lightingStyle}
        - **Vibe**: ${blueprint.emotionVibe}
        - **Text Style**: ${blueprint.textStyle}
        
        *** CORE PHYSICS & REALISM RULES (NO CARTOONS) ***
        1. **Skin Texture**: Must be high-fidelity (pores, imperfections, subsurface scattering). NO smooth "plastic" AI skin.
        2. **Optical Physics**: Use realistic "Rim Lighting" to separate the subject from the background. 
        3. **Camera Specs**: Render as if shot on a Sony A7R V with an 85mm f/1.2 lens. Razor sharp eyes.
        4. **Compositing**: The subject must look *grounded* in the environment. Match color temperature. Shadows must fall correctly.
        `;

        // INJECT STRICT NO-MODEL RULE IF NO IMAGES PROVIDED
        if (!hasHumanAssets) {
            prompt += `
            *** ABSOLUTE CONSTRAINT: NO HUMAN MODELS ***
            - Since no user photos were provided, DO NOT HALLUCINATE PEOPLE.
            - Create a powerful, typographic or object-based composition.
            - Focus on the *Concept* or *Environment*.
            `;
        } else {
            prompt += `
            *** IDENTITY LOCK (CRITICAL) ***
            - **Do NOT generate new people.** You must use the faces provided in the input images.
            - **Expression Enhancement**: You may slightly exaggerate the expression (e.g., make a smile wider, or a shock face more intense) to match the "Viral Vibe", but the *identity* must remain 100% recognizable.
            `;
        }

        if (inputs.format === 'portrait') {
            prompt += `
            *** VERTICAL FORMAT (9:16) ***
            - **Safe Zone**: Keep top 15% and bottom 20% clear of crucial text.
            - **Center Focus**: Main subject in the middle.
            - **Depth**: High Bokeh (background blur) to reduce mobile clutter.
            `;
        } else {
            prompt += `
            *** HORIZONTAL FORMAT (16:9) ***
            - **Cinematic Framing**: Wide angle or Mid-shot.
            - **Separation**: Clear visual distinction between the "Hook" (Text) and the "Hero" (Image).
            `;
        }

        if (inputs.elementImage) {
            prompt += `
            *** ELEMENT INTEGRATION ***
            - Place the SECONDARY OBJECT prominently.
            - It should be interacting with the Subject (e.g., floating nearby, being held, or in the foreground).
            - Add "Motion Blur" if the context implies speed/action.
            `;
        }

        if (inputs.customText) {
             prompt += `
             *** TYPOGRAPHY RENDER ***
             - Render Text: "${inputs.customText}".
             - Style: Huge, Bold, High-Contrast.
             - **Legibility**: Add a heavy drop shadow or outline (Stroke) to ensure readability against any background.
             - **Kerning**: Tight and impactful.
             `;
        } else {
             prompt += `
             *** AI COPYWRITING ***
             - Create a 2-4 word "Clickbait Hook" (e.g., "IT'S OVER", "CRAZY WIN", "THE TRUTH").
             - Render this text using the style defined in the Blueprint.
             `;
        }

        prompt += `
        OUTPUT: A single, high-resolution, photorealistic image. No artifacts.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // Best model for pixels + text rendering
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: {
                    aspectRatio: inputs.format === 'portrait' ? '9:16' : '16:9',
                    imageSize: '1K'
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
        throw new Error("No image generated. The request may have been blocked or timed out.");

    } catch (error) {
        console.error("Error generating thumbnail:", error);
        throw error;
    }
};
