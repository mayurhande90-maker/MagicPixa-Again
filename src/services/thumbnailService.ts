
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
    referenceImage?: { base64: string; mimeType: string } | null; // Now Optional
    subjectImage?: { base64: string; mimeType: string } | null; // Optional for standard
    hostImage?: { base64: string; mimeType: string } | null; // Podcast only
    guestImage?: { base64: string; mimeType: string } | null; // Podcast only
}

export const generateThumbnail = async (inputs: ThumbnailInputs): Promise<string> => {
    const ai = getAiClient();
    try {
        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';

        // 1. Handle Reference Image (Optional)
        if (inputs.referenceImage) {
            const optRef = await optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType);
            parts.push({ text: "REFERENCE THUMBNAIL STYLE (Analyze this for composition, font style, and color ONLY):" });
            parts.push({ inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
        }

        // 2. Handle Subjects based on Category
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

        // 3. Construct Highly Specific System Prompt
        let prompt = `You are an Elite YouTube Thumbnail Designer and Graphic Artist using Gemini 3 Pro.
        
        TASK: Create a viral, high-CTR (Click Through Rate) YouTube thumbnail for the category: "${inputs.category}".
        CONTEXT: The video is about: "${inputs.title}".
        
        *** PHASE 1: VISUAL STRATEGY & RESEARCH ***
        `;

        if (inputs.referenceImage) {
            prompt += `
            - **REFERENCE ANALYSIS**: Analyze the provided "REFERENCE THUMBNAIL STYLE". Extract the color palette, font style (bold/sans-serif), text placement, and energy.
            - **ABSOLUTE PROHIBITION:** You are strictly FORBIDDEN from reading or extracting text from the Reference Image. IGNORE reference text completely. Use it only for visual vibe.
            `;
        } else {
            prompt += `
            - **DEEP TREND RESEARCH**: Since no reference was provided, use Google Search to find the current best-performing thumbnail styles for "${inputs.title}" in the "${inputs.category}" niche for 2025.
            - **DESIGN GENERATION**: Act as a Professional Graphic Designer. Invent a world-class, high-contrast, eye-catching composition from scratch based on your research.
            `;
        }
        
        prompt += `
        *** PHASE 2: PROFESSIONAL PHOTO ENHANCEMENT (CRITICAL) ***
        - **INPUT PHOTOS**: Take the uploaded HOST, GUEST, or MAIN SUBJECT photos.
        - **ACTION**: You must act as a high-end photo retoucher.
          1. **RELIGHTING**: Fix any bad lighting. Add rim lights, match the subject lighting to your new background.
          2. **COLOR GRADING**: Fix skin tones (make them healthy and vibrant), adjust contrast, and remove noise/blur.
          3. **INTEGRATION**: Cut the subjects out perfectly and blend them into the scene so they don't look like cheap stickers.
        
        *** PHASE 3: AI COPYWRITING (TEXT GENERATION) ***
        - **GOAL**: Invent a **NEW**, short, punchy, viral clickbait title (2-5 words max) based on the Context: "${inputs.title}".
        - **EXAMPLES**: "IPHONE 15 FAIL?", "DO NOT WATCH", "GET RICH FAST", "THE TRUTH".
        - **RULE**: Render this text BIG, BOLD, and LEGIBLE on the image. Use high-impact fonts.

        *** PHASE 4: COMPOSITION & RENDERING ***
        `;

        if (isPodcast) {
            prompt += `- **Podcast Layout**: Place HOST and GUEST side-by-side or facing each other. Add a studio background or relevant environment.`;
        } else {
            prompt += `- **Standard Layout**: Place the Subject prominently in the foreground. Create a compelling background that tells a story.`;
        }

        prompt += `
        *** CRITICAL IDENTITY PRESERVATION RULES (ZERO TOLERANCE) ***
        - You MUST use the faces/bodies from the uploaded photos.
        - **DO NOT REGENERATE THEIR FACES.** Do not change their ethnicity, age, hair, or facial features.
        - Keep the identity 100% exact, just make the photo quality *better*.
        
        *** HYPER-REALISM & QUALITY ***
        - The final image must look like a 4K polished design.
        - Text must be legible, spelled correctly, and professional.
        - Add depth of field (blur) to the background to make subjects pop.
        
        OUTPUT: A single high-resolution thumbnail image (16:9).`;

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                // Enable search for trend research
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
