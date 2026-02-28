import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

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
    'Standard Ink': 'screen printed ink texture, matte finish.',
    'Embroidery': '3D raised stitching, thread texture.',
    'Gold Foil': 'reflective metallic gold foil, premium high specular highlights.',
    'Silver Foil': 'reflective metallic silver foil, chrome finish.',
    'Deboss': 'pressed INTO the material, inner shadows.',
    'Emboss': 'raised OUT of the material, 3D relief.',
    'Laser Etch': 'burnt/frosted texture, precise edges.',
    'Smart Object': 'perfect digital screen replacement, glowing pixels.'
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
        const prompt = `Analyze design. Suggest 3 product mockups. ${brand ? `This is for brand '${brand.companyName}' in '${brand.industry}'.` : ''} Return JSON array.`;
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
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
            },
            featureName: 'Mockup Suggestion Analysis'
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
        
        const brandDNA = brand ? `
        *** BRAND MOCKUP RULES ***
        Client: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Professional'}.
        Visual Vibe: Align the environment with their '${brand.industry}' industry standards.
        ` : "";

        const prompt = `You are a Visualization Engine. ${brandDNA}
        TASK: Generate photorealistic mockup of ${objectColor ? objectColor + ' ' : ''}${targetObject}.
        STYLE: ${vibe}.
        APPLICATION: Design using ${material} (${physics}). Wrap around object curvature.
        OUTPUT: High-res single image.`;

        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Magic Mockup Generation'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (error) { throw error; }
};