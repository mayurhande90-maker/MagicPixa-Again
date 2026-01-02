import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

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
    'Standard Ink': 'screen printed ink texture, matte finish, follows fabric threads.',
    'Embroidery': '3D raised stitching, high thread count texture, individual stitches visible.',
    'Gold Foil': 'reflective metallic gold foil, premium specular highlights, micro-crinkle texture.',
    'Silver Foil': 'reflective metallic silver foil, chrome finish, high contrast highlights.',
    'Deboss': 'pressed INTO the material, deep inner shadows, textured material grain inside press.',
    'Emboss': 'raised OUT of the material, 3D relief, highlights on top edges.',
    'Laser Etch': 'burnt/frosted texture, precise high-contrast edges.',
    'Smart Object': 'perfect digital screen replacement, glowing pixels, screen-door effect if close.'
};

const VIBE_SETTINGS: Record<string, string> = {
    'Studio Clean': 'clean background, softbox lighting, minimalist.',
    'Lifestyle': 'in-use context, held by hand, natural bokeh.',
    'Cinematic': 'dramatic lighting, high contrast, moody atmosphere.',
    'Nature': 'natural sunlight, organic textures.',
    'Urban': 'street style, concrete textures, gritty but premium.'
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
    mimeType: string,
    brand?: BrandKit | null
): Promise<MockupSuggestion[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
        const prompt = `Analyze design. Suggest 3 product mockups. Return JSON array.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
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
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [{ title: "Classic", reasoning: "Pro look.", targetObject: "T-Shirt", material: "Standard Ink", sceneVibe: "Studio Clean", objectColor: "White" }];
    }
};

export const generateMagicMockup = async (
    designBase64: string,
    designMime: string,
    targetObject: string,
    material: string,
    sceneVibe: string,
    objectColor?: string,
    brand?: BrandKit | null
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(designBase64, designMime);
        const physics = MATERIAL_PHYSICS[material] || 'realistic texture';
        const vibe = VIBE_SETTINGS[sceneVibe] || 'pro lighting';
        
        const brandDNA = brand ? `Brand: '${brand.companyName}'. Tone: ${brand.toneOfVoice}.` : "";

        const prompt = `You are a High-End Visualization Engine. ${brandDNA}
        TASK: Generate photorealistic mockup of ${objectColor ? objectColor + ' ' : ''}${targetObject}.
        
        *** MATERIAL & WRAP PHYSICS ***
        1. **GEOMETRY WRAPPING**: Wrap the design perfectly around the curvature of the ${targetObject} using UV mapping principles.
        2. **FABRIC/SURFACE DISTORTION**: If object has folds or curves (e.g. T-Shirt, Mug), the design must distort realistically to follow the surface geometry.
        3. **APPLICATION**: Apply design using ${material} (${physics}).
        4. **SHADOWS/LIGHT**: The object shadows and environmental lighting MUST pass OVER and THROUGH the design elements.

        STYLE: ${vibe}.
        OUTPUT: High-res single image masterpiece.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (error) { throw error; }
};