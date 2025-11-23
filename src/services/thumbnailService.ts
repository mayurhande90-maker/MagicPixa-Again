
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
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

export const generateThumbnail = async (
    subjectBase64: string,
    subjectMimeType: string,
    styleBase64: string | null,
    styleMimeType: string | null,
    title: string,
    category: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const parts: any[] = [];

        // 1. Optimize Subject
        const optSubject = await optimizeImage(subjectBase64, subjectMimeType);
        parts.push({ text: "MAIN SUBJECT IMAGE:" });
        parts.push({ inlineData: { data: optSubject.data, mimeType: optSubject.mimeType } });

        // 2. Optimize Style (if provided)
        if (styleBase64 && styleMimeType) {
            const optStyle = await optimizeImage(styleBase64, styleMimeType);
            parts.push({ text: "STYLE REFERENCE (Copy art style, lighting, and composition vibe ONLY. Do NOT copy the person):" });
            parts.push({ inlineData: { data: optStyle.data, mimeType: optStyle.mimeType } });
        }

        // 3. Construct System Prompt
        let prompt = `You are an Elite YouTube Thumbnail Designer powered by Gemini 3 Pro.
        
        TASK: Create a viral, high-CTR (Click Through Rate) YouTube thumbnail.
        
        CONTEXT:
        - Video Title: "${title}"
        - Category: ${category}
        
        INSTRUCTIONS:
        1. **Subject Integration**: Use the person/object from the "MAIN SUBJECT IMAGE". 
           - Isolate them from their original background.
           - Enhance their expression/lighting to make them pop.
           - If it's a person, ensure they look expressive and engaging.
        
        2. **Background & Composition**:
           - Generate a background relevant to the "${category}" category and the Title "${title}".
           - Use complementary colors (e.g., Blue background + Orange subject/text).
           - Add depth (bokeh/blur) to separate the subject from the background.
        
        3. **Text & Typography**:
           - Render the text "${title}" (or a punchy 2-3 word summary of it) clearly in the image.
           - Use massive, BOLD, Sans-Serif fonts (Impact, Roboto Black).
           - Add drop shadows, strokes, or glow to the text for maximum readability.
           - Ensure text does not cover the subject's face.
        
        4. **Style Transfer** (If Reference provided):
           - Mimic the color grading, saturation, and energy of the "STYLE REFERENCE".
           - Do NOT copy the specific content of the reference, only the "Vibe".
        
        5. **Final Polish**:
           - High saturation.
           - High contrast.
           - "Clickbait" aesthetic (glowing outlines, arrows, emojis if suitable for the category).
        
        OUTPUT: A single high-resolution image.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE] },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Error generating thumbnail:", error);
        throw error;
    }
};
