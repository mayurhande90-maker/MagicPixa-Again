import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Optimize image
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

export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string,
  brand?: BrandKit | null
): Promise<string> => {
  return await callWithRetry<string>(async () => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    
    const brandDNA = brand ? `
    *** BRAND AESTHETIC OVERRIDE ***
    This space belongs to '${brand.companyName || brand.name}'.
    Brand Palette: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
    Instruction: Subtlely use brand colors in décor.
    ` : "";

    const prompt = `You are Pixa Interior Design.
    ${brandDNA}
    GOAL: Transform room to ${style} style.
    1.Structure Lock: Wall/Windows stay same.
    2.Physics: Match existing light source.
    OUTPUT: A single 4K photorealistic image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  });
};
