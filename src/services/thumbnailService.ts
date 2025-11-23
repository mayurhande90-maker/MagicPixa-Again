
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

interface ThumbnailInputs {
    category: string;
    title: string;
    referenceImage: { base64: string; mimeType: string }; // Required
    subjectImage?: { base64: string; mimeType: string } | null; // Optional for standard
    hostImage?: { base64: string; mimeType: string } | null; // Podcast only
    guestImage?: { base64: string; mimeType: string } | null; // Podcast only
}

export const generateThumbnail = async (inputs: ThumbnailInputs): Promise<string> => {
    const ai = getAiClient();
    try {
        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';

        // 1. Optimize and Attach Reference Image (Always Required)
        const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
        parts.push({ text: "REFERENCE THUMBNAIL STYLE (Analyze this for composition, font, color, and vibe):" });
        parts.push({ inlineData: { data: optRef.data, mimeType: optRef.mimeType } });

        // 2. Handle Subjects based on Category
        if (isPodcast) {
            if (inputs.hostImage) {
                const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
                parts.push({ text: "HOST PHOTO (Preserve Identity):" });
                parts.push({ inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
            }
            if (inputs.guestImage) {
                const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "GUEST PHOTO (Preserve Identity):" });
                parts.push({ inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
            }
        } else {
            if (inputs.subjectImage) {
                const optSubject = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
                parts.push({ text: "MAIN SUBJECT PHOTO (Preserve Identity):" });
                parts.push({ inlineData: { data: optSubject.data, mimeType: optSubject.mimeType } });
            }
        }

        // 3. Construct Highly Specific System Prompt
        let prompt = `You are an Elite YouTube Thumbnail Designer using Gemini 3 Pro.
        
        TASK: Create a viral, high-CTR (Click Through Rate) YouTube thumbnail for the category: "${inputs.category}".
        VIDEO TITLE / CONTEXT: "${inputs.title}"
        
        PHASE 1: DEEP ANALYSIS
        1. Analyze the "REFERENCE THUMBNAIL STYLE" deeply. Extract the color palette, font style (bold/sans-serif), text placement, glow effects, and background complexity.
        2. Search YouTube trends for "${inputs.category} thumbnails 2025" to understand current clickbait aesthetics.
        
        PHASE 2: COMPOSITION RULES
        `;

        if (isPodcast) {
            prompt += `- **Podcast Layout**: Place the HOST and GUEST side-by-side or facing each other, mimicking the composition of the Reference Thumbnail.
            - **Background**: Generate a high-quality studio background or a relevant scene based on the Title, matching the lighting of the Reference.
            - **Text**: Place the text "${inputs.title}" clearly, using the font style from the Reference.
            `;
        } else {
            prompt += `- **Standard Layout**: If a Subject Photo is provided, place them prominently in the foreground. If not, generate a compelling central subject based on the Title.
            - **Style Transfer**: Apply the exact color grading, saturation, and energy of the Reference Thumbnail to this new image.
            - **Text**: Render the text "${inputs.title}" big and bold, ensuring high readability.
            `;
        }

        prompt += `
        *** CRITICAL IDENTITY PRESERVATION RULES (ZERO TOLERANCE) ***
        - You MUST use the faces/bodies from the uploaded HOST/GUEST/SUBJECT photos.
        - **DO NOT REGENERATE THEIR FACES.** Do not change their ethnicity, age, hair, or facial features.
        - You are a compositor: Cut them out of their original photos and blend them seamlessly into the new thumbnail design.
        - **Lighting**: You MAY adjust the lighting on the subjects to match the new background (e.g., add rim light, fix shadows), but do not alter their geometry.
        
        *** HYPER-REALISM & QUALITY ***
        - The final image must look like a 4K polished photograph, not a cartoon (unless the Reference is a cartoon).
        - Text must be legible and professional.
        - Add depth of field (blur) to the background to make subjects pop.
        
        OUTPUT: A single high-resolution thumbnail image (16:9).`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                // Enable search for trend analysis
                tools: [{ googleSearch: {} }]
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Error generating thumbnail:", error);
        throw error;
    }
};
