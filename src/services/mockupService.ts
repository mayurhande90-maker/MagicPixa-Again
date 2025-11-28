
import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
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

export interface MockupSuggestion {
    title: string;
    reasoning: string;
    targetObject: string;
    material: string;
    sceneVibe: string;
    objectColor: string;
}

export const analyzeMockupSuggestions = async (
    base64ImageData: string,
    mimeType: string
): Promise<MockupSuggestion[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

        const prompt = `Analyze this design/logo. Suggest 3 distinct, high-quality product mockup scenarios that would best showcase this specific design.
        
        Consider the design's style (Corporate, Streetwear, Vintage, Tech, Organic) and colors.
        
        For each suggestion, pick:
        1. A specific **Target Object** (e.g. Hoodie, Mug, Business Card, Sign).
        2. A suitable **Material** (e.g. Embroidery for logos, Gold Foil for luxury).
        3. A matching **Vibe** (e.g. Urban, Studio, Nature).
        4. A complimentary **Object Color** that makes the design pop.
        
        Return exactly 3 suggestions in JSON format.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Short catchy name for this vibe (e.g. 'Streetwear', 'Corporate')" },
                            reasoning: { type: Type.STRING, description: "Why this fits the design (1 sentence)" },
                            targetObject: { type: Type.STRING },
                            material: { type: Type.STRING, enum: Object.keys(MATERIAL_PHYSICS) },
                            sceneVibe: { type: Type.STRING, enum: Object.keys(VIBE_SETTINGS) },
                            objectColor: { type: Type.STRING }
                        },
                        required: ['title', 'reasoning', 'targetObject', 'material', 'sceneVibe', 'objectColor']
                    }
                }
            }
        });

        const text = response.text || "";
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);

    } catch (e) {
        console.error("Error analyzing mockup suggestions:", e);
        // Fallback defaults
        return [
            { title: "Classic Merch", reasoning: "Safe and professional look.", targetObject: "T-Shirt", material: "Standard Ink", sceneVibe: "Studio Clean", objectColor: "White" },
            { title: "Premium Brand", reasoning: "High-end feel.", targetObject: "Packaging Box", material: "Gold Foil", sceneVibe: "Cinematic", objectColor: "Black" },
            { title: "Everyday Use", reasoning: "Relatable context.", targetObject: "Coffee Mug", material: "Standard Ink", sceneVibe: "Lifestyle", objectColor: "White" }
        ];
    }
};

export const generateMagicMockup = async (
    designBase64: string,
    designMime: string,
    targetObject: string,
    material: string,
    sceneVibe: string,
    objectColor?: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(designBase64, designMime);

        const physicsInstruction = MATERIAL_PHYSICS[material] || 'realistic print texture';
        const lightingInstruction = VIBE_SETTINGS[sceneVibe] || 'professional studio lighting';
        
        // Construct Color Instruction
        const colorPromptPart = objectColor 
            ? `The ${targetObject} itself must be **${objectColor}** in color. Ensure the product base material is ${objectColor}.` 
            : '';

        const prompt = `You are a World-Class Product Visualization Engine (The Reality Engine).
        
        TASK: Generate a photorealistic mockup.
        
        1. **SCENE**: Create a high-quality photo of a ${objectColor ? objectColor + ' ' : ''}${targetObject}.
           - Vibe: ${lightingInstruction}
           - **COLOR**: ${colorPromptPart}
        
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
