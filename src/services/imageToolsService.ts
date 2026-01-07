import { Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
const optimizeImage = async (base64: string, mimeType: string, width: number = 1280): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

const getBrandDNA = (brand?: BrandKit | null) => {
    if (!brand) return "";
    return `
    *** BRAND IDENTITY OVERRIDE ***
    This image must align with the brand guidelines for '${brand.companyName || brand.name}'.
    Industry: ${brand.industry || 'General'}.
    Brand Colors: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
    Tone: ${brand.toneOfVoice || 'Professional'}.
    Instruction: Infuse the result with these brand colors in accents, clothing, or backgrounds.
    `;
};

const TIMELINE_RULES: Record<string, string> = {
    'Present Day': `**ERA PROTOCOL: CONTEMPORARY REALISM** - Camera: Sony A7R V. Sharp clarity. Modern fabrics.`,
    'Future Sci-Fi': `**ERA PROTOCOL: YEAR 2150 CYBERPUNK** - Aesthetic: Blade Runner. Iridescent fabrics, holographic accents.`,
    '1990s Vintage': `**ERA PROTOCOL: LATE 90s ANALOG** - Aesthetic: 35mm Film. Direct flash, film grain.`,
    '1920s Noir': `**ERA PROTOCOL: ROARING TWENTIES** - Aesthetic: The Great Gatsby. Art Deco, high contrast spotlighting.`,
    'Medieval': `**ERA PROTOCOL: 14th CENTURY FANTASY** - Materials: Wool, linen, leather, fur. Stone castles.`
};

const analyzePhotoCondition = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Photo Conservator. Perform a analysis of this damaged photo.
    Output a concise Restoration Blueprint.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Restore to high definition.";
    } catch (e) { return "Restore to high definition."; }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore_color' | 'restore_only',
  brand?: BrandKit | null
): Promise<string> => {
  return await callWithRetry<string>(async () => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    const restorationBlueprint = await analyzePhotoCondition(ai, data, optimizedMime);
    const brandDNA = getBrandDNA(brand);

    let basePrompt = `You are an AI Restoration Engine.
    ${restorationBlueprint}
    ${brandDNA}
    TASK: ${mode === 'restore_color' ? 'RESTORE & COLORIZE' : 'RESTORE ONLY'}.
    1. Remove all noise and damage. 
    2. Recover facial structure with precision.
    ${brand ? `3. Subtly prioritize ${brand.colors.primary} in any newly colorized clothing or elements.` : ''}
    FINAL OUTPUT: Crystal-clear 4K image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: basePrompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  });
};

export interface PixaTogetherConfig {
    mode: 'creative' | 'reenact' | 'professional';
    relationship: string;
    mood?: string;
    environment?: string;
    pose?: string;
    timeline?: string;
    universe?: string;
    customDescription?: string;
    referencePoseBase64?: string;
    referencePoseMimeType?: string;
    faceStrength: number;
    clothingMode: 'Keep Original' | 'Match Vibe' | 'Professional Attire';
    locks: { age: boolean; hair: boolean; accessories: boolean; };
    autoFix: boolean;
}

const analyzeFaceBiometrics = async (ai: any, base64: string, mimeType: string, label: string): Promise<string> => {
    const prompt = `Deep Biometric Analysis of ${label}: Shape, Eyes, Nose, Mouth, Skin, Hair. Output concise description.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "";
    } catch (e) { return ""; }
};

export const generateMagicSoul = async (
  personABase64: string,
  personAMimeType: string,
  personBBase64: string | null | undefined,
  personBMimeType: string | null | undefined,
  inputs: PixaTogetherConfig,
  brand?: BrandKit | null
): Promise<string> => {
  return await callWithRetry<string>(async () => {
    const ai = getAiClient();
    const optimizePromises = [optimizeImage(personABase64, personAMimeType)];
    if (personBBase64 && personBMimeType) optimizePromises.push(optimizeImage(personBBase64, personBMimeType));
    const optimized = await Promise.all(optimizePromises);
    
    const optA = optimized[0];
    const optB = (personBBase64 && personBMimeType) ? optimized[1] : null;

    const [biometricsA, biometricsB] = await Promise.all([
        analyzeFaceBiometrics(ai, optA.data, optA.mimeType, "Person A"),
        optB ? analyzeFaceBiometrics(ai, optB.data, optB.mimeType, "Person B") : Promise.resolve("")
    ]);

    const timelineInstructions = TIMELINE_RULES[inputs.timeline || 'Present Day'] || TIMELINE_RULES['Present Day'];
    const brandDNA = getBrandDNA(brand);

    let mainPrompt = `*** IDENTITY CLONING PROTOCOL ***
    SUBJECT A: ${biometricsA}
    ${optB ? `SUBJECT B: ${biometricsB}` : ''}
    
    ${brandDNA}
    ${timelineInstructions}
    
    GOAL: Render hyper-realistic ${inputs.mode} scene.
    ENVIRONMENT: ${inputs.environment} - ${inputs.mood}.
    ${inputs.customDescription ? `CUSTOM: ${inputs.customDescription}` : ''}
    `;

    const parts: any[] = [{ text: "SOURCE A:" }, { inlineData: { data: optA.data, mimeType: optA.mimeType } }];
    if (optB) { parts.push({ text: "SOURCE B:" }); parts.push({ inlineData: { data: optB.data, mimeType: optB.mimeType } }); }
    parts.push({ text: mainPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  });
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    return await callWithRetry<string>(async () => {
        const ai = getAiClient();
        const { data: optImage, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType, 1536);
        const { data: optMask, mimeType: maskMime } = await optimizeImage(maskBase64, 'image/png', 1536);
        const prompt = `Magic Eraser. Remove White Pixels from Image and heal background seamlessly.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: optImage, mimeType: optMime } }, { inlineData: { data: optMask, mimeType: maskMime } }, { text: prompt }] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    });
};
