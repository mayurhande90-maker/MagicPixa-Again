import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage, makeTransparent } from "../utils/imageUtils";
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
                    type: Type.OBJECT,
                    properties: {
                        ymin: { type: Type.NUMBER },
                        xmin: { type: Type.NUMBER },
                        ymax: { type: Type.NUMBER },
                        xmax: { type: Type.NUMBER }
                    }
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
    const prompt = `Act as a Master Photo Conservator. Perform a Deep Forensic Analysis of this aged/damaged photo.
    1. **HISTORICAL ERA**: Analyze clothing, hair, and photo grain to identify the decade (e.g. 1940s, 1970s).
    2. **DAMAGE AUDIT**: Map every scratch, dust speck, mold spot, and fold line. 
    3. **OPTICAL DEGRADATION**: Identify motion blur, lens softness, and fading levels.
    Output a concise "Restoration Master Blueprint" for an AI generator to follow.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Standard restoration, fix damage and sharpen.";
    } catch (e) { return "Standard restoration, fix damage and sharpen."; }
};

const performForensicBiometricScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `Perform a Forensic Biometric Identity Scan on the provided photo for ${label}.
    1. **STRUCTURAL ANCHORS**: Identify the exact bone structure, nose shape, and jawline.
    2. **OCULAR DETAIL**: Map eye shape and eyelid geometry.
    3. **IDENTITY LOCK**: Provide a technical description that ensures the person remains EXACTLY the same. No plastic surgery or beautification allowed.
    Output a concise "Identity Lock Protocol".`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Preserve facial features exactly.";
    } catch (e) { return "Preserve facial features exactly."; }
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

/**
 * PIXA PHOTO RESTORE: FORENSIC OPTICAL RECONSTRUCTION
 */
export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore_color' | 'restore_only',
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    
    // Engine 1: Forensic Optical Audit
    const [restorationBlueprint, identityLock] = await Promise.all([
        analyzePhotoCondition(ai, data, optimizedMime),
        performForensicBiometricScan(ai, data, optimizedMime)
    ]);
    
    const brandDNA = getBrandDNA(brand);

    const modePrompt = mode === 'restore_color' 
        ? `TASK: **COLOUR & RESTORE (HISTORICAL PIGMENT SYNTHESIS)**
           - **COLORIZATION**: Apply high-fidelity, era-appropriate color based on the identified era.
           - **FILM STOCK MATCHING**: Use a palette that reflects historical film stocks (e.g. Kodachrome for 50s, early Technicolor for 30s).
           - **SKIN TONES**: Use realistic human sub-surface scattering (SSS) for skin. Avoid "flat" colors.
           - **LUMINANCE PRESERVATION**: Maintain the original's light-to-dark values perfectly.` 
        : `TASK: **RESTORE ONLY (MONOCHROME)**
           - **STRICT NO-COLOR POLICY**: Do NOT inject any color. The final output must be 100% black and white / sepia (matching original tone).
           - **FOCUS**: Direct all energy into removing damage, deblurring, and enhancing resolution while maintaining the original's BW soul.`;

    const prompt = `You are the Pixa Forensic Optical Reconstruction Engine. 
    
    ${restorationBlueprint}
    ${identityLock}
    ${brandDNA}
    
    *** CORE MANDATE: SACRED ASSET PROTOCOL v5.0 ***
    1. **PIXEL INTEGRITY**: You are a forensic reconstructor, not an artist. You are FORBIDDEN from altering the subject's face, body, or the core composition of the photo.
    2. **IDENTITY ANCHOR**: The person in the photo must remain 100% recognizable. STRICT NO-BEAUTIFICATION RULE: Do not smooth skin into "plastic", do not change features. Preserve wrinkles, original jawlines, and eye shapes.
    3. **DAMAGE ELIMINATION**: Seamlessly heal silver mirroring, chemical stains, scratches, dust, mold, and physical fold lines.
    4. **OPTICAL ENHANCEMENT**: Reconstruct lost details using 4K high-pass sharpening. Ensure eyes have realistic catchlights.

    ${modePrompt}

    ${brand ? `ADDITIONAL: If restoring color, subtly prioritize ${brand.colors.primary} in background accents if appropriate.` : ''}
    
    OUTPUT: A single hyper-realistic, photorealistic, 4K restored image that looks like it was shot on professional film on the day it was taken.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { 
          responseModalities: [Modality.IMAGE],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Forensic engine failed to reconstruct. The asset may be too degraded.");
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

/**
 * ENGINE 1: THE FORENSIC BIOMETRIC ANALYST (Dual Subject Audit)
 * Maps identities and physical scaling for Pixa Together.
 */
const performDualForensicAudit = async (
    ai: any, 
    optA: { data: string; mimeType: string }, 
    optB: { data: string; mimeType: string } | null
): Promise<string> => {
    const parts: any[] = [];
    parts.push({ text: "SUBJECT A TEMPLATE:" }, { inlineData: optA });
    if (optB) parts.push({ text: "SUBJECT B TEMPLATE:" }, { inlineData: optB });
    
    const prompt = `Act as a Forensic Facial Reconstruction Expert.
    Perform a "Forensic Visual Audit" on the provided subject(s).
    1. **IDENTITY MAPPING**: For each person, map unique facial features (nose bridge curve, canthal tilt, lip cupid bow, skin textures).
    2. **PHYSICAL SCALING**: Estimate the relative height and shoulder width difference if two people are provided.
    3. **BIOMETRIC LOCK**: Write a paragraph that explicitly forbids the AI from altering these traits during rendering.
    
    OUTPUT: A technical "Biometric Rig Protocol" for a render engine.`;
    
    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts }
        });
        return response.text || "Standard biometric rig, preserve facial structures.";
    } catch (e) { return "Standard biometric rig, preserve facial structures."; }
};

/**
 * ENGINE 2: THE INTERACTION PHYSICS ARCHITECT
 * Plans the rig based on social dynamics and environment physics.
 */
const architectInteractionRig = async (
    ai: any, 
    audit: string, 
    inputs: PixaTogetherConfig,
    brand?: BrandKit | null
): Promise<string> => {
    const prompt = `Act as a Senior VFX Supervisor.
    
    *** INPUT DATA ***
    Biometric Audit: ${audit}
    Relationship: ${inputs.relationship}
    Vibe: ${inputs.mood}
    Timeline/Era: ${inputs.timeline}
    Environment: ${inputs.environment}
    
    *** TASK: ARCHITECT INTERACTION PHYSICS ***
    Plan the physical interaction between the subjects.
    1. **CONTACT OCCLUSION**: Define where deep shadows (Ambient Occlusion) must form (e.g. hand on shoulder, standing arm-to-arm).
    2. **GLOBAL ILLUMINATION SYNC**: Calculate how light from the environment and Subject A should bounce onto Subject B.
    3. **POSE TOPOLOGY**: Rig the bodies to look naturally posed according to their relationship (${inputs.relationship}).
    
    Output a concise "Spatial Interaction Rig" blueprint.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: prompt }] }
        });
        return response.text || "Natural interaction pose, standard contact shadows.";
    } catch (e) { return "Natural interaction pose, standard contact shadows."; }
};

/**
 * ENGINE 3: HIGH-PASS MULTI-SUBJECT PRODUCTION
 */
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
    // 1. Optimize All Source Assets
    const optimizePromises = [optimizeImage(personABase64, personAMimeType)];
    if (personBBase64 && personBMimeType) optimizePromises.push(optimizeImage(personBBase64, personBMimeType));
    if (inputs.mode === 'reenact' && inputs.referencePoseBase64) optimizePromises.push(optimizeImage(inputs.referencePoseBase64, inputs.referencePoseMimeType!));
    const optimized = await Promise.all(optimizePromises);
    
    const optA = optimized[0];
    const optB = (personBBase64 && personBMimeType) ? optimized[1] : null;
    const optPose = (inputs.mode === 'reenact' && inputs.referencePoseBase64) ? (optB ? optimized[2] : optimized[1]) : null;

    // 2. RUN TRIPLE-ENGINE ARCHITECTURE
    // Engine 1: Forensic Biometric Audit
    const biometricAudit = await performDualForensicAudit(ai, optA, optB);
    
    // Engine 2: Interaction Physics Rigging
    const interactionRig = await architectInteractionRig(ai, biometricAudit, inputs, brand);
    
    // Engine 3: Final Production Execution
    const timelineInstructions = TIMELINE_RULES[inputs.timeline || 'Present Day'] || TIMELINE_RULES['Present Day'];
    const brandDNA = getBrandDNA(brand);

    const masterMandate = `
    *** IDENTITY ANCHOR v5.0 (SACRED ASSET PROTOCOL) ***
    1. **BIOMETRIC LOCK**: Use the Audit (${biometricAudit}) to ensure both subjects are 1:1 replicas of the sources. NO AI-SMOOTHING.
    2. **RAY-TRACED INTERACTION**: Execute the Rig (${interactionRig}). Render physically accurate shadows at all points of physical contact.
    3. **SUB-SURFACE SCATTERING**: Prioritize realistic skin rendering. Show pores, natural moisture, and texture.
    4. **GLOBAL ILLUMINATION**: Apply light-bounce from Subject A onto Subject B and vice-versa based on environment light.
    
    GOAL: Render a hyper-realistic ${inputs.mode} portrait.
    RELATIONSHIP: ${inputs.relationship}.
    ENVIRONMENT: ${inputs.environment} - ${inputs.mood}.
    ERA: ${timelineInstructions}
    ${inputs.customDescription ? `CUSTOM VISION: ${inputs.customDescription}` : ''}
    `;

    const parts: any[] = [];
    parts.push({ text: "SOURCE SUBJECT A (IDENTITY MASTER):" }, { inlineData: { data: optA.data, mimeType: optA.mimeType } });
    if (optB) parts.push({ text: "SOURCE SUBJECT B (IDENTITY MASTER):" }, { inlineData: { data: optB.data, mimeType: optB.mimeType } });
    if (optPose) parts.push({ text: "TARGET POSE REFERENCE:" }, { inlineData: { data: optPose.data, mimeType: optPose.mimeType } });
    parts.push({ text: masterMandate });
    parts.push({ text: brandDNA });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Production engine failed to render. Identity sync unstable.");
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
        const imagePart = response.candidates?.[0]?.content?.[0]?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (error) { throw error; }
};
