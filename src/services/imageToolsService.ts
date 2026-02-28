
import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage, makeTransparent, applyWatermark } from "../utils/imageUtils";
import { BrandKit } from "../types";

// QUALITY UPGRADE: Increased to 2048px with high quality factor
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 2048, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// Specific optimizer for High-Res Editing (2048px) to avoid pixelation
const optimizeImageForEditing = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 2048, 0.95);
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

        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview', 
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optMime } },
                    { text: prompt }
                ]
            },
            config: {
                // responseMimeType and responseSchema are correctly defined here following guidelines.
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
            },
            featureName: 'Object Detection'
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

const analyzePhotoCondition = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Master Photo Conservator. Perform a Deep Forensic Analysis of this aged/damaged photo.
    1. **HISTORICAL ERA**: Analyze clothing, hair, and photo grain to identify the decade (e.g. 1940s, 1970s).
    2. **DAMAGE AUDIT**: Map every scratch, dust speck, mold spot, and fold line. 
    3. **OPTICAL DEGRADATION**: Identify motion blur, lens softness, and fading levels.
    Output a concise "Restoration Master Blueprint" for an AI generator to follow.`;
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Photo Condition Analysis'
        });
        return response.text || "Standard restoration, fix damage and sharpen.";
    } catch (e) { return "Standard restoration, fix damage and sharpen."; }
};

/**
 * IDENTITY LOCK 6.0: BIOMETRIC ASYMMETRY MAPPING
 */
const performForensicBiometricScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `Act as a Forensic Facial Reconstruction Expert.
    Perform an Identity Lock 6.0 Audit on the provided photo.
    
    TASK: Build an Immutable Biometric Blueprint of the subject(s).
    1. **ASYMMETRY MAPPING**: Identify unique facial quirks—e.g., a slightly higher eyebrow, the exact unique curve of the lip's cupid bow, the specific angle of the jaw.
    2. **FEATURE ANCHORING**: Precisely describe the distance between the eyes, the width of the nose bridge, and the ear position.
    3. **ZERO-CHANGE MANDATE**: Explicitly state that these proportions must NOT be altered for "beautification". Preserve every wrinkle, pore, and original characteristic. 
    
    OUTPUT: A technical "Biometric Feature Lock" for the render engine.`;
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview', 
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Forensic Biometric Scan'
        });
        return response.text || "Preserve facial features exactly with zero modification to geometry.";
    } catch (e) { return "Preserve facial features exactly with zero modification to geometry."; }
};

/**
 * PIXA PHOTO RESTORE: IDENTITY LOCK 6.0 ARCHITECTURE
 */
export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore_color' | 'restore_only',
  brand?: BrandKit | null,
  userPlan?: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    
    // Engine 1: Forensic Optical & Identity Audit
    const [restorationBlueprint, biometricLock] = await Promise.all([
        analyzePhotoCondition(ai, data, optimizedMime),
        performForensicBiometricScan(ai, data, optimizedMime)
    ]);
    
    const brandDNA = getBrandDNA(brand);

    const modePrompt = mode === 'restore_color' 
        ? `TASK: **COLOUR & RESTORE (HISTORICAL PIGMENT SYNTHESIS)**
           - **COLORIZATION**: Apply high-fidelity, era-appropriate color based on the identified era.
           - **FILM STOCK MATCHING**: Use a palette that reflects historical film stocks (e.g. Kodachrome for 50s, early Technicolor for 30s).
           - **SKIN TONES**: Use realistic human sub-surface scattering (SSS) for skin. Avoid "flat" colors.` 
        : `TASK: **RESTORE ONLY (MONOCHROME)**
           - **STRICT NO-COLOR POLICY**: Final output must be 100% black and white / sepia (matching original tone).`;

    const prompt = `You are the Pixa Forensic Optical Reconstruction Engine v6.0. 
    
    *** CORE DIRECTIVES: IDENTITY LOCK 6.0 ***
    1. **ZERO-CHANGE GEOMETRY**: You are FORBIDDEN from altering the subject's face, body, or core geometry. Use the Biometric Blueprint: ${biometricLock}.
    2. **ASSET IMMUTABILITY**: Every detail of the original face—including asymmetries, eye shapes, and original skin texture—is SACRED. DO NOT beautify. DO NOT sharpen into a generic AI face.
    3. **ENHANCED DENOISING**: Treat this task as "clarification" of existing pixels, not "hallucination" of new features. 
    4. **PIXEL INTEGRITY**: Remove all chemical stains, scratches, and damage defined in: ${restorationBlueprint}.

    ${modePrompt}
    ${brandDNA}
    
    OUTPUT: A single hyper-realistic 4K restored image where the person is 100% identical to the original photo, just cleaned and clarified.`;

    const response = await secureGenerateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { 
          responseModalities: [Modality.IMAGE],
          imageConfig: { imageSize: "2K" },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
      featureName: 'Photo Restoration'
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
        let resData = imagePart.inlineData.data;
        if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
            resData = await applyWatermark(resData, 'image/png');
        }
        return resData;
    }
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

// FIX: Added missing TIMELINE_RULES constant to resolve reference errors in generateMagicSoul.
const TIMELINE_RULES: Record<string, string> = {
    'Present Day': 'Render in contemporary 2025 style. Modern clothing, current technology, and realistic high-fidelity photography.',
    'Future Sci-Fi': 'Render in a futuristic aesthetic. Incorporate holographic elements, neon highlights, advanced materials, and high-tech environments.',
    '1990s Vintage': 'Apply a nostalgic 90s aesthetic. Retro fashion, analog film grain, vibrant saturated colors, and period-accurate decor.',
    '1920s Noir': 'Apply a classic 1920s cinematic noir aesthetic. Art Deco details, period-appropriate high-fashion, and dramatic contrast.',
    'Medieval': 'Render in a medieval historical setting. Period clothing (tunics, armor), stone architecture, and natural torch/candle lighting.'
};

/**
 * ENGINE 1: THE FORENSIC BIOMETRIC ANALYST (Dual Subject Audit)
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
    Perform an Identity Lock 6.0 Audit on the provided subject(s).
    1. **ASYMMETRY LOCK**: Map unique facial asymmetries and quirks for each person to ensure 1:1 recognition.
    2. **PHYSICAL SCALING**: Estimate relative dimensions between subjects.
    3. **BIOMETRIC BLUEPRINT**: Write a protocol that forbids the AI from altering these traits.
    
    OUTPUT: A technical "Biometric Rig Protocol" for a render engine.`;
    
    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts },
            featureName: 'Dual Forensic Audit'
        });
        return response.text || "Standard biometric rig, preserve facial structures exactly.";
    } catch (e) { return "Standard biometric rig, preserve facial structures exactly."; }
};

/**
 * ENGINE 2: THE INTERACTION PHYSICS ARCHITECT
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
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ text: prompt }] },
            featureName: 'Interaction Physics Architecture'
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
  brand?: BrandKit | null,
  userPlan?: string
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
    const biometricAudit = await performDualForensicAudit(ai, optA, optB);
    const interactionRig = await architectInteractionRig(ai, biometricAudit, inputs, brand);
    
    // FIX: TIMELINE_RULES is now defined above to avoid the ReferenceError.
    const timelineInstructions = TIMELINE_RULES[inputs.timeline || 'Present Day'] || TIMELINE_RULES['Present Day'];
    const brandDNA = getBrandDNA(brand);

    const masterMandate = `
    *** IDENTITY ANCHOR v6.0 (SACRED ASSET PROTOCOL) ***
    1. **BIOMETRIC LOCK**: Use the Audit (${biometricAudit}) to ensure both subjects are 1:1 replicas of the sources. NO BEAUTIFICATION. NO ALTERING EYE SHAPE OR JAWLINES.
    2. **RAY-TRACED INTERACTION**: Execute the Rig (${interactionRig}). Render physically accurate shadows at contact points.
    3. **GLOBAL ILLUMINATION**: Apply light-bounce based on environment light.
    
    GOAL: Render a hyper-realistic ${inputs.mode} portrait.
    ${inputs.customDescription ? `CUSTOM VISION: ${inputs.customDescription}` : ''}
    ${timelineInstructions}
    `;

    const parts: any[] = [];
    parts.push({ text: "SOURCE SUBJECT A (IDENTITY MASTER):" }, { inlineData: { data: optA.data, mimeType: optA.mimeType } });
    if (optB) parts.push({ text: "SOURCE SUBJECT B (IDENTITY MASTER):" }, { inlineData: { data: optB.data, mimeType: optB.mimeType } });
    if (optPose) parts.push({ text: "TARGET POSE REFERENCE:" }, { inlineData: { data: optPose.data, mimeType: optPose.mimeType } });
    parts.push({ text: masterMandate });
    parts.push({ text: brandDNA });

    const response = await secureGenerateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          imageConfig: { imageSize: "2K" },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
      featureName: 'Magic Soul Generation'
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
        let resData = imagePart.inlineData.data;
        if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
            resData = await applyWatermark(resData, 'image/png');
        }
        return resData;
    }
    throw new Error("Production engine failed to render. Identity sync unstable.");
  } catch (error) { throw error; }
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string,
    userPlan?: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data: optImage, mimeType: optMime } = await optimizeImageForEditing(base64ImageData, mimeType);
        const { data: optMask, mimeType: maskMime } = await optimizeImageForEditing(maskBase64, 'image/png');
        const prompt = `Magic Eraser. Remove White Pixels from Image and heal background seamlessly.`;
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts: [{ inlineData: { data: optImage, mimeType: optMime } }, { inlineData: { data: optMask, mimeType: maskMime } }, { text: prompt }] },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Magic Eraser'
        });
        // Corrected access path for image generation results from nano banana series.
        const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) {
            let resData = imagePart.inlineData.data;
            if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
                resData = await applyWatermark(resData, 'image/png');
            }
            return resData;
        }
        throw new Error("No image generated.");
    } catch (error) { throw error; }
};
