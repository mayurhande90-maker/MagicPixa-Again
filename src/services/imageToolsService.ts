import { Modality, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

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

// Specific optimizer for High-Res Editing (1536px) to avoid pixelation
const optimizeImageForEditing = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Use 1536px and higher quality for detailed inpainting
        const resizedUri = await resizeImage(dataUri, 1536, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Editing optimization failed, using original", e);
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

/**
 * SMART SELECT: Detects the bounding box of an object at a specific point.
 */
export const detectObjectAtPoint = async (
    base64: string,
    mimeType: string,
    x: number,
    y: number
): Promise<{ ymin: number; xmin: number; ymax: number; xmax: number } | null> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optMime } = await optimizeImage(base64, mimeType);
        const prompt = `Identify the distinct object at the normalized coordinates [${y}, ${x}] in this image.
        Return the [ymin, xmin, ymax, xmax] bounding box for the entire object.
        Return ONLY the coordinates as a JSON array of 4 integers.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optMime } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.NUMBER }
                }
            }
        });

        const text = response.text || "[]";
        const coords = JSON.parse(text);
        if (Array.isArray(coords) && coords.length === 4) {
            return { ymin: coords[0], xmin: coords[1], ymax: coords[2], xmax: coords[3] };
        }
        return null;
    } catch (e) {
        console.error("Object detection failed", e);
        return null;
    }
};

// --- PROMPT MAPPINGS FOR PIXA TOGETHER ---
const MOOD_PROMPTS: Record<string, string> = {
    'Happy': 'Bright, cheerful, high-key lighting, genuine smiles, warm color temperature, vibrant and energetic atmosphere.',
    'Cinematic': 'Dramatic lighting, high contrast, anamorphic lens look, movie-still aesthetic, deep teal and orange color grading, emotional depth.',
    'Romantic': 'Soft focus, dreamy backlight, golden hour glow, intimate atmosphere, warm pastel tones, gentle bokeh.',
    'Vintage': 'Film grain texture, sepia or desaturated tones, 90s aesthetic, nostalgic feel, slightly soft sharpness like analog photography.',
    'Luxury': 'High-end fashion editorial style, polished, elegant, sharp focus, rich textures, sophisticated lighting.',
    'Adventure': 'Dynamic lighting, wind in hair, outdoorsy feel, vibrant natural colors, energetic composition.',
    'Candid': 'Natural, unposed look, documentary style, authentic lighting, "caught in the moment" feel.',
    'Professional': 'Clean, sharp, balanced studio lighting, neutral tones, confident and trustworthy atmosphere.',
    'Ethereal': 'Soft, dreamy, fantasy-like atmosphere, light leaks, pastel color palette, angelic glow.',
    'Moody': 'Low-key lighting, deep shadows, mysterious atmosphere, desaturated colors, intense and emotional.'
};

const ENVIRONMENT_PROMPTS: Record<string, string> = {
    'Outdoor Park': 'A lush green park with dappled sunlight through trees, soft nature background.',
    'Beach': 'A sunny beach with blue ocean and white sand, bright natural daylight.',
    'Luxury Rooftop': 'A high-end city rooftop at twilight with glowing city skyline lights in the background, glass railings, chic furniture.',
    'City Street': 'A bustling urban street with blurred cars and city lights, modern architecture context.',
    'Cozy Home': 'A warm, inviting living room with soft furniture, plants, and window light.',
    'Cafe': 'A stylish coffee shop interior with warm ambient lighting and blurred cafe background.',
    'Deep Forest': 'A dense forest with tall trees, ferns, and mystical shafts of light piercing through the canopy.',
    'Modern Studio': 'A clean, minimalist studio background with a solid color backdrop and professional 3-point lighting setup.',
    'Snowy Mountain': 'A majestic snowy mountain peak, cold winter lighting, white snow and blue sky contrast.',
    'Sunset Beach': 'A beach at golden hour, warm orange sun reflecting on the water, dramatic clouds.'
};

const TIMELINE_RULES: Record<string, string> = {
    'Present Day': `**ERA PROTOCOL: CONTEMPORARY REALISM** - Camera: Sony A7R V. Sharp clarity. Modern fabrics.`,
    'Future Sci-Fi': `**ERA PROTOCOL: YEAR 2150 CYBERPUNK** - Aesthetic: Blade Runner. Iridescent fabrics, holographic accents.`,
    '1990s Vintage': `**ERA PROTOCOL: LATE 90s ANALOG** - Aesthetic: 35mm Film. Direct flash, film grain.`,
    '1920s Noir': `**ERA PROTOCOL: ROARING TWENTIES** - Aesthetic: The Great Gatsby. Art Deco, high contrast spotlighting.`,
    'Medieval': `**ERA PROTOCOL: 14th CENTURY FANTASY** - Materials: Wool, linen, leather, fur. Stone castles.`
};

const analyzePhotoCondition = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Smithsonian Photo Conservator. Perform a Deep Forensic Analysis of this damaged/aged photo.
    1. **Historical Context**: Estimate era for color palette.
    2. **Damage Report**: Identify scratches, dust, blur, sepia cast.
    3. **Reconstruction Plan**: Missing details to recover.
    Output a concise Restoration Blueprint.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Restore to high definition.";
    } catch (e) { return "Restore to high definition."; }
};

const analyzeReferenceTechSpecs = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a VFX Supervisor. Analyze Lighting Map, Color Grade, ISO/Grain, and Skin Shader. Output TECHNICAL READOUT.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Match reference specs.";
    } catch (e) { return "Match reference specs."; }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore_color' | 'restore_only',
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
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
      config: { responseModalities: [Modality.IMAGE] },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) { throw error; }
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
  const ai = getAiClient();
  try {
    const optimizePromises = [optimizeImage(personABase64, personAMimeType)];
    if (personBBase64 && personBMimeType) optimizePromises.push(optimizeImage(personBBase64, personBMimeType));
    if (inputs.mode === 'reenact' && inputs.referencePoseBase64) optimizePromises.push(optimizeImage(inputs.referencePoseBase64, inputs.referencePoseMimeType!));
    const optimized = await Promise.all(optimizePromises);
    
    const optA = optimized[0];
    const optB = (personBBase64 && personBMimeType) ? optimized[1] : null;
    const optPose = (inputs.mode === 'reenact' && inputs.referencePoseBase64) ? optimized[optimized.length - 1] : null;

    const [biometricsA, biometricsB, referenceTechSpecs] = await Promise.all([
        analyzeFaceBiometrics(ai, optA.data, optA.mimeType, "Person A"),
        optB ? analyzeFaceBiometrics(ai, optB.data, optB.mimeType, "Person B") : Promise.resolve(""),
        (inputs.mode === 'reenact' && optPose) ? analyzeReferenceTechSpecs(ai, optPose.data, optPose.mimeType) : Promise.resolve("")
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
    
    BRANDS: If brand is provided, ensure the environment and clothing reflect the '${brand?.toneOfVoice || 'Professional'}' tone.
    `;

    const parts: any[] = [{ text: "SOURCE A:" }, { inlineData: { data: optA.data, mimeType: optA.mimeType } }];
    if (optB) { parts.push({ text: "SOURCE B:" }); parts.push({ inlineData: { data: optB.data, mimeType: optB.mimeType } }); }
    if (optPose) { parts.push({ text: "POSE:" }); parts.push({ inlineData: { data: optPose.data, mimeType: optPose.mimeType } }); }
    parts.push({ text: mainPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) { throw error; }
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data: optImage, mimeType: optMime } = await optimizeImageForEditing(base64ImageData, mimeType);
        const { data: optMask, mimeType: maskMime } = await optimizeImageForEditing(maskBase64, 'image/png');
        const prompt = `Magic Eraser. Remove White Pixels from Image and heal background seamlessly.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: optImage, mimeType: optMime } }, { inlineData: { data: optMask, mimeType: maskMime } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (error) { throw error; }
};