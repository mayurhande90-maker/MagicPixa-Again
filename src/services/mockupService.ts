
import { Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD)
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

const MATERIAL_PHYSICS: Record<string, string> = {
    'Standard Ink': 'screen printed ink texture, slight matte finish, soaking into the material fibers naturally.',
    'Embroidery': '3D raised embroidery stitching, visible thread texture, slight puckering of fabric around the edges, light catching individual threads.',
    'Gold Foil': 'reflective metallic gold foil stamping, high specular highlights, sharp edges, premium hot-stamp look.',
    'Silver Foil': 'reflective metallic silver foil stamping, chrome-like finish, high contrast reflections.',
    'Deboss': 'pressed INTO the material (letterpress style), inner shadows, depth, tactile indented surface.',
    'Emboss': 'raised OUT of the material, 3D relief effect, casting subtle drop shadows on the surface.',
    'Laser Etch': 'burnt or frosted texture, removing the top layer of the material, tactile roughness, precise edges.',
    'Smart Object': 'perfect digital screen replacement, glowing pixels, anti-aliased, glass reflection overlay.'
};

const VIBE_SETTINGS: Record<string, string> = {
    'Studio Clean': 'clean solid color background, softbox lighting, e-commerce product photography style, minimalist.',
    'Lifestyle': 'in-use context, held by a hand or worn by a model, shallow depth of field (bokeh), natural posing.',
    'Cinematic': 'dramatic side lighting, moody atmosphere, high contrast, dark tones, neon accents or rim lighting.',
    'Nature': 'sunlight dappled through leaves (gobo), organic textures (wood, stone) in background, fresh outdoor feel.',
    'Urban': 'street style, concrete textures, hard city light, gritty but premium aesthetic.'
};

export const generateMagicMockup = async (
    designBase64: string,
    designMime: string,
    targetObject: string,
    material: string,
    sceneVibe: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(designBase64, designMime);

        const physicsInstruction = MATERIAL_PHYSICS[material] || 'realistic print texture';
        const lightingInstruction = VIBE_SETTINGS[sceneVibe] || 'professional studio lighting';

        const prompt = `You are a World-Class Product Visualization Engine (The Reality Engine).
        
        TASK: Generate a photorealistic mockup.
        
        1. **SCENE**: Create a high-quality photo of a ${targetObject}.
           - Vibe: ${lightingInstruction}
        
        2. **APPLICATION**: Apply the provided INPUT DESIGN onto the ${targetObject}.
           - **CRITICAL**: The design must not look like a flat sticker. It must obey the physics of the material.
        
        3. **PHYSICS SIMULATION**:
           - Technique: ${material}.
           - Rendering Rules: ${physicsInstruction}
           - Wrap: The design must wrap around the curvature of the object perfectly.
           - Texture: If the object has texture (e.g., fabric weave, paper grain), the design must interact with it (displacement map).
        
        4. **LIGHTING INTEGRATION**:
           - Shadows and highlights from the scene must affect the design layer.
           - If Gold/Silver Foil, ensure correct metallic reflections based on the scene's light sources.
        
        INPUT:
        - Design Image (Provided).
        
        OUTPUT:
        - A single, high-resolution RAW photograph.
        - Focus on realism and texture fidelity.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: data, mimeType: optimizedMime } },
                    { text: prompt },
                ],
            },
            config: { 
                responseModalities: [Modality.IMAGE],
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
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Error generating mockup:", error);
        throw error;
    }
};
