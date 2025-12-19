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
    elementImage?: { base64: string; mimeType: string } | null; 
}

export const generateThumbnail = async (inputs: ThumbnailInputs): Promise<string> => {
    const ai = getAiClient();
    try {
        const parts: any[] = [];
        const isPodcast = inputs.category === 'Podcast';
        
        // Detect if any human subjects are provided
        const hasHumanAssets = !!(inputs.subjectImage || inputs.hostImage || inputs.guestImage);

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
            if (inputs.elementImage) {
                const optElement = await optimizeImage(inputs.elementImage.base64, inputs.elementImage.mimeType);
                parts.push({ text: "SECONDARY ELEMENT / PROP (Product, Car, etc.):" });
                parts.push({ inlineData: { data: optElement.data, mimeType: optElement.mimeType } });
            }
        }

        // Construct Highly Specific System Prompt with Design Logic
        let prompt = `You are an Elite Viral Content Designer specializing in high-CTR thumbnails.
        
        TASK: Transform the input raw photo(s) into a Hyper-Realistic, Click-Magnet Thumbnail.
        CATEGORY: "${inputs.category}".
        CONTEXT: "${inputs.title}".
        
        *** CORE VISUAL PHILOSOPHY: HYPER-REALISM ***
        1. **Texture Fidelity**: Skin must have pores. Metal must have specular highlights. Fabric must have weave. No "smooth plastic" AI look.
        2. **Lighting Physics**: Use cinematic lighting (Rim Lighting, Volumetric Fog, High Contrast) to separate the subject from the background.
        3. **Compositing**: The subject must look grounded in the scene, not pasted on. Matching color temperature is critical.
        `;

        // INJECT STRICT NO-MODEL RULE IF NO IMAGES PROVIDED
        if (!hasHumanAssets) {
            prompt += `
            *** ABSOLUTE CONSTRAINT: NO HUMAN MODELS ***
            - Since the user did NOT upload any subject photos, DO NOT generate any people, faces, human silhouettes, or imaginary models.
            - The thumbnail should focus entirely on the ENVIRONMENT, OBJECTS, and TYPOGRAPHY.
            - Create a powerful conceptual scene that represents the context "${inputs.title}" without using human figures.
            `;
        } else {
            prompt += `
            *** IDENTITY LOCK ***
            - You MUST use the faces/bodies from the uploaded photos. DO NOT regenerate new people.
            - Keep the identity 100% exact.
            `;
        }

        if (inputs.format === 'portrait') {
            prompt += `
            *** VERTICAL FORMAT (9:16) - REELS/TIKTOK PROTOCOL ***
            - **Dimensions**: 1080x1920 (Vertical).
            - **Safe Zone (CRITICAL)**: Keep the top 15% clear (System UI) and the bottom 25% clear (Caption/Audio UI). Place the main subject and hook text in the **MIDDLE 60%**.
            - **"The Grid Rule"**: Ensure the absolute most important visual element is centered so it looks perfect when cropped to a 1:1 square on a profile grid.
            - **Immersive Depth**: Use a shallow depth of field (f/1.8). Keep the subject razor sharp, but blur the background (Bokeh) to reduce mobile visual clutter.
            - **Typography**: Use TALL, CONDENSED, BOLD sans-serif fonts. Stack text vertically if needed. White text with heavy black drop-shadows for readability on any background.
            `;
        } else {
            prompt += `
            *** HORIZONTAL FORMAT (16:9) - YOUTUBE PROTOCOL ***
            - **Dimensions**: 1920x1080 (Horizontal).
            - **Rule of Thirds**: Place the main subject's eyes on a power point.
            - **Visual Anchors**: Create a clear separation between the "Hook" (Text/Action) and the "Subject" (Emotion).
            - **Cinema Style**: Wide cinematic framing. Anamorphic lens flare style if appropriate for the category.
            `;
        }

        if (inputs.referenceImage) {
            prompt += `
            - **REFERENCE ANALYSIS**: Copy the visual hierarchy, color boldness, and font weight from the reference. IGNORE the text content, copy the VIBE.
            `;
        }

        if (inputs.elementImage) {
            prompt += `
            *** ELEMENT INTEGRATION (CRITICAL) ***
            - A Secondary Element (Car, Product, Gadget) has been provided.
            - **Composition**: Place this element prominently alongside the Main Subject.
            - **Interaction**: The Main Subject should be interacting with it (holding it, pointing at it, leaning on it) or standing next to it to show ownership/context.
            - **Blending**: Ensure the lighting matches. The element must look like it belongs in the scene, not pasted on.
            - **Scale**: Make the element large enough to be instantly recognizable on a small screen.
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
             - **Constraint**: Ensure text does not cover the subject's eyes.
             `;
        } else {
             prompt += `
             *** AI COPYWRITING ***
             - Invent a short, punchy hook (2-4 words) like "IT'S OVER", "THE TRUTH", "CRAZY WIN".
             - Style: Big, Bold, Sans-Serif. High contrast color (Yellow/White/Red).
             `;
        }

        prompt += `
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