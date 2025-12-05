
import { Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
}

export const generateThumbnail = async (inputs: ThumbnailInputs): Promise<string> => {
    const ai = getAiClient();
    try {
        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';

        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE VISUAL HIERARCHY (Analyze contrast and composition):" });
            parts.push({ inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        if (isPodcast) {
            if (inputs.hostImage) {
                const optHost = await optimizeImage(inputs.hostImage.base64, inputs.hostImage.mimeType);
                parts.push({ text: "HOST PHOTO (Main Subject):" });
                parts.push({ inlineData: { data: optHost.data, mimeType: optHost.mimeType } });
            }
            if (inputs.guestImage) {
                const optGuest = await optimizeImage(inputs.guestImage.base64, inputs.guestImage.mimeType);
                parts.push({ text: "GUEST PHOTO (Second Subject):" });
                parts.push({ inlineData: { data: optGuest.data, mimeType: optGuest.mimeType } });
            }
        } else {
            if (inputs.subjectImage) {
                const optSubject = await optimizeImage(inputs.subjectImage.base64, inputs.subjectImage.mimeType);
                parts.push({ text: "MAIN SUBJECT PHOTO:" });
                parts.push({ inlineData: { data: optSubject.data, mimeType: optSubject.mimeType } });
            }
        }

        // Construct Highly Specific System Prompt with Design Logic
        let prompt = `You are an Elite Social Media Thumbnail Designer using the "3% Design Rule".
        
        TASK: Create a viral, high-CTR thumbnail.
        CATEGORY: "${inputs.category}".
        CONTEXT: "${inputs.title}".
        
        *** DESIGN SCIENCE FOR THUMBNAILS ***
        1. **The 2-Second Rule**: The image must be understood instantly.
        2. **High Contrast**: Use high-contrast focal points. The Subject vs Background separation must be extreme.
        3. **Narrative-First**: The image must imply a story or tension ("Open Loop").
        4. **Emotion Trigger**: Use the subject's facial expression or the scene's drama to trigger curiosity immediately.
        `;

        if (inputs.format === 'portrait') {
            prompt += `
            *** INSTAGRAM PORTRAIT PROTOCOL (9:16) ***
            - **Format**: 9:16 Vertical (1080x1920).
            - **Safe Zone**: CRITICAL: The main subject and hook text MUST be centered within the middle 1:1 square. This ensures it looks perfect on the Instagram Profile Grid (which crops to square).
            - **UI Clearance**: Do NOT place crucial text in the top 15% (Header) or bottom 20% (Reels UI overlays). Keep text central.
            - **Typography**: Use massive, bold font sizes (min 36px equivalent). Center alignment preferred.
            `;
        } else {
            prompt += `
            *** YOUTUBE LANDSCAPE PROTOCOL (16:9) ***
            - **Format**: 16:9 Landscape.
            - **Layout**: Use the "Rule of Thirds". Place the main subject's eyes on a power point.
            - **Composition**: Wide cinematic framing suitable for video feeds.
            `;
        }

        if (inputs.referenceImage) {
            prompt += `
            - **REFERENCE ANALYSIS**: Copy the visual hierarchy, color boldness, and font weight from the reference. IGNORE the text content, copy the VIBE.
            `;
        }
        
        prompt += `
        *** EXECUTION ***
        - **Retouching**: Relight the subjects to pop. Fix skin tones. Add rim lighting to separate from background.
        - **Integration**: Perfect cutout and blending. No sticker look.
        `;

        if (inputs.customText) {
             prompt += `
             *** TEXT RENDERING ***
             - Render exactly: "${inputs.customText}".
             - Style: Big, Bold, Sans-Serif. Maximum legibility on small mobile screens.
             `;
        } else {
             prompt += `
             *** AI COPYWRITING ***
             - Invent a short, punchy hook (2-4 words) like "IT'S OVER", "THE TRUTH", "CRAZY WIN".
             - Style: Big, Bold, Sans-Serif. High contrast color (Yellow/White/Red).
             `;
        }

        prompt += `
        *** IDENTITY LOCK ***
        - You MUST use the faces/bodies from the uploaded photos. DO NOT regenerate new people.
        - Keep the identity 100% exact.
        
        OUTPUT: A single high-resolution ${inputs.format === 'portrait' ? 'vertical (9:16)' : 'horizontal (16:9)'} thumbnail image.`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
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
