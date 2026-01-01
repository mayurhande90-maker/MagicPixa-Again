import { Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

export interface ApparelStylingOptions {
    tuck?: 'Untucked' | 'Full Tuck' | 'Half Tuck';
    fit?: 'Regular' | 'Slim Fit' | 'Oversized';
    sleeve?: 'Long' | 'Rolled Up' | 'Short';
    accessories?: string;
}

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

/**
 * PHASE 1: GEOMETRIC BODY AUDIT
 * Analyzes the model to identify skeletal stress points for fabric simulation.
 */
const performBodyMeshAudit = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Perform a Geometric Body Mesh Audit on this model.
    Identify:
    1. **STRESS POINTS**: Location of shoulders, elbows, and waistline relative to the pose.
    2. **OCCLUSION ZONES**: Identify areas of depth (e.g., underarms, inner thighs, waist-tuck depth).
    3. **SURFACE TOPOLOGY**: Note the model's build to ensure fabric tension matches body volume.
    
    Output a concise 'Skeletal Physics Map' paragraph.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Standard body geometry, upright pose.";
    } catch (e) { return "Standard body geometry, upright pose."; }
};

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  topGarment: { base64: string; mimeType: string } | null,
  bottomGarment: { base64: string; mimeType: string } | null,
  userPrompt?: string,
  stylingOptions?: ApparelStylingOptions,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);
    
    // Parallel Optimization
    const personPromise = optimizeImage(personBase64, personMimeType);
    let topPromise = topGarment ? optimizeImage(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
    let bottomPromise = bottomGarment ? optimizeImage(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // Body Physics Audit
    const bodyMeshMap = await performBodyMeshAudit(ai, optPerson.data, optPerson.mimeType);

    const brandDNA = brand ? `
    *** BRAND FASHION CONTEXT ***
    Brand: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Professional'}.
    Visual Vibe: High-end ${brand.industry} fashion catalog style. 
    ` : "";

    const parts: any[] = [{ text: `You are the Pixa Physics-Engine, specialized in Hyper-Realistic Fabric Simulation.` }];
    
    parts.push({ text: "MODEL TARGET (SACRED ASSET):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    if (isSameGarmentImage && optTop) {
        parts.push({ text: "FULL OUTFIT SOURCE:" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
    } else {
        if (optTop) { parts.push({ text: "TOP GARMENT SOURCE:" }); parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } }); } 
        if (optBottom) { parts.push({ text: "BOTTOM GARMENT SOURCE:" }); parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } }); }
    }

    const physicsPrompt = `
    *** ADVANCED FABRIC PHYSICS PROTOCOL ***
    ${bodyMeshMap}
    ${brandDNA}

    **1. MATERIAL WEIGHT SIMULATION**:
    Analyze the Garment Source.
    - If Heavy (Denim, Coat, Wool): Generate stiff, structural folds and deep shadow crevices.
    - If Light (Silk, Linen, Thin Cotton): Generate gravity-weighted drapes, fluid movement, and soft, translucent shadow gradients.

    **2. MICRO-CREASE OCCLUSION**:
    Mandatory calculation of Ambient Occlusion in depth zones:
    - Underarms: High-density dark creases.
    - Waist Tuck: Physical interaction where the top pushes into the bottom.
    - Elbows/Sleeves: Bunching folds based on the "Skeletal Physics Map".

    **3. SEAMLESS SEAM PROTOCOL**:
    - **Edge Anchoring**: The neckline, cuffs, and hem MUST wrap 3D-realistically around the model's skin. Ensure dark contact shadows between fabric edges and skin to prevent "sticker" look.
    - **Global Illumination**: Apply color bleed. If the garment is ${brand?.colors.primary || 'bright'}, a subtle color-matched glow must be visible on the model's neck and jawline skin.

    **STYLING LOGIC**:
    - **Fit**: ${stylingOptions?.fit || 'Regular'}. (Adjust fabric tension across chest and waist).
    - **Tuck**: ${stylingOptions?.tuck || 'Untucked'}. (Physically fold the fabric into the waistband with realistic distortion).
    - **Sleeves**: ${stylingOptions?.sleeve || 'Default'}.

    OUTPUT: A single 8K masterpiece. Magazine-grade fashion photography. 100% realistic fabric-to-body physics.
    `;

    parts.push({ text: physicsPrompt });

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
    throw new Error("Fabric simulation failed.");
  } catch (error) { throw error; }
};