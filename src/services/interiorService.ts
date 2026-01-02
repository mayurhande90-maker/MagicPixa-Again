import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

const IDENTITY_LOCK_MANDATE = `
*** SPATIAL IDENTITY LOCK v3 ***
1. **STRUCTURAL ANCHOR**: You must keep the fixed architectural elements (walls, windows, floor, ceiling) in their exact uploaded positions.
2. **PERSPECTIVE LOCK**: Do NOT change the camera angle or FOV. Maintain the original vanishing points.
3. **OBJECT PRESERVATION**: If there is existing furniture the user wants to "restyle", preserve its core silhouette while changing textures and fabrics.
MANDATE: The room must feel like the SAME physical space, just professionally redesigned.
`;

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

export const STYLE_PROMPTS: Record<string, string> = {
    'Modern': `Apply Modern style: clean lines, balanced proportions, neutral palette.`,
    'Minimalist': `Apply Minimalist style: remove visual noise, light woods, ample negative space.`,
    'Japanese': `Apply Japandi style: warm woods, low-height furniture, natural textures.`,
    'American': `Apply American style: comfortable furniture, warm tones, functional layout.`,
    'Coastal': `Apply Coastal style: airy whites, sea blues, sandy beiges.`,
    'Traditional Indian': `Apply Traditional Indian style: carved woods, earthy tones, brass accents.`,
    'Arabic': `Apply Arabic style: arches, rich warm colors, geometric detailing.`,
    'Futuristic': `Apply Futuristic style: sharp geometry, glossy surfaces, metallic accents, LED lighting.`,
    'Industrial': `Apply Industrial style: exposed brick/metal, raw textures, leather accents.`,
    'Creative / Artistic': `Apply Creative style: bold colors, unique shapes, artistic flair.`,
    'Luxury Executive': `Apply Luxury Executive style: marble, walnut, brass, elegant proportions.`,
    'Biophilic / Nature-Inspired': `Apply Biophilic style: indoor plants, raw woods, stone, maximize light.`,
    'Modern Corporate': `Apply Modern Corporate style: ergonomic furniture, organized work zones.`
};

const performDeepSpatialAnalysis = async (ai: any, base64: string, mimeType: string, style: string, roomType: string): Promise<string> => {
    const prompt = `Analyze this ${roomType}. Locate vanishing points, structure, lighting, and scale. Output a concise Spatial Blueprint.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Preserve perspective and structure.";
    } catch (e) { return "Preserve perspective and structure."; }
};

export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    const renovationBlueprint = await performDeepSpatialAnalysis(ai, data, optimizedMime, style, roomType);
    
    const brandDNA = brand ? `
    *** BRAND AESTHETIC OVERRIDE ***
    This space belongs to '${brand.companyName || brand.name}'.
    Preferred Tone: ${brand.toneOfVoice || 'Professional'}.
    Brand Palette: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
    Instruction: Subtlely use the brand colors in décor items (pillows, wall art, lamps) or as accent wall colors.
    ` : "";

    const prompt = `You are Pixa Interior Design — hyper-realistic Interior rendering AI.
    ${renovationBlueprint}
    ${brandDNA}
    
    ${IDENTITY_LOCK_MANDATE}
    
    GOAL: Transform room to ${style} style.
    1.Physics: Match existing light source from windows or lamps.
    2.Materials: High-fidelity textures (wood grain, fabric weave, stone vein).
    OUTPUT: A single 4K photorealistic image.`;

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