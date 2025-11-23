
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// AGGRESSIVE OPTIMIZATION: 1024px @ 60% Quality
// This is critical to prevent "Payload Too Large" or Timeout errors with multiple inputs.
const optimizeForPayload = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Resize to 1024px (longest side) and compress to 0.6 quality
        const resizedUri = await resizeImage(dataUri, 1024, 0.60);
        const [header, data] = resizedUri.split(',');
        // Force JPEG header for consistency and size
        return { data, mimeType: 'image/jpeg' };
    } catch (e) {
        console.warn("Image optimization failed, falling back to original (risk of crash)", e);
        return { data: base64, mimeType };
    }
};

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  topGarment: { base64: string; mimeType: string } | null,
  bottomGarment: { base64: string; mimeType: string } | null,
  userPrompt?: string,
  stylingOptions?: ApparelStylingOptions
): Promise<string> => {
  const ai = getAiClient();
  try {
    // 1. LOGIC: DETECT FULL OUTFIT (Same image for Top & Bottom)
    const isFullOutfit = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    // 2. PREPROCESS: Optimize Images in Parallel
    const personPromise = optimizeForPayload(personBase64, personMimeType);
    
    let topPromise, bottomPromise;

    if (isFullOutfit && topGarment) {
        // Optimization: Process once, use for both prompt references conceptually
        topPromise = optimizeForPayload(topGarment.base64, topGarment.mimeType);
        bottomPromise = Promise.resolve(null); // Not needed physically
    } else {
        topPromise = topGarment ? optimizeForPayload(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
        bottomPromise = bottomGarment ? optimizeForPayload(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    }

    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // 3. CONSTRUCT "STRICT PRESERVATION" PROMPT
    const parts: any[] = [];

    let pipelineDirective = `TASK: Professional Virtual Try-On with STRICT IDENTITY PRESERVATION.

    *** CRITICAL MANDATE: DO NOT HALLUCINATE NEW FEATURES ***
    You are an AI acting as a "Smart Layer Compositor". You are NOT generating a new person. You are modifying pixels ONLY in the clothing region of the "TARGET MODEL".

    *** ZERO-TOLERANCE PRESERVATION RULES ***
    1. **FACE LOCK**: The face pixels MUST be bit-for-bit identical to the original. Do NOT "enhance", "beautify", or "regenerate" the face. If the face changes, the result is a FAILURE.
    2. **BODY LOCK**: Keep the exact body shape, pose, hands, and skin texture of the Target Model.
    3. **BACKGROUND LOCK**: Do not alter the background environment, lighting, or context.
    4. **ACCESSORY LOCK**: Preserve watches, jewelry, glasses, and hair strands exactly as they are.

    *** EXECUTION STEPS ***
    1. Analyze the "TARGET MODEL". Map the exact boundaries of their current clothing.
    2. Inpaint/Swap ONLY the clothing area with the "REFERENCE GARMENT".
    3. **Fabric Physics**: Wrap the new garment realistically around the existing body mesh. Apply folds and tension based on the pose.
    4. **Lighting Match**: Sample the lighting from the Target Model's skin and background. Apply this exact lighting model to the new garment.
    `;

    // INPUT 1: The Reference Garments
    if (isFullOutfit && optTop) {
        parts.push({ text: "REFERENCE IMAGE (FULL OUTFIT SOURCE):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        pipelineDirective += `\n**OPERATION: FULL OUTFIT SWAP**
        - Extract the full outfit (Top + Bottom) from the REFERENCE IMAGE.
        - Apply it to the Target Model, replacing their current clothes completely.
        - Maintain the tuck/drape style from the reference unless overridden below.\n`;
    } else {
        if (optTop) {
            parts.push({ text: "REFERENCE GARMENT (TOP):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            pipelineDirective += `\n**OPERATION: UPPER BODY SWAP**\n- Replace ONLY the Target Model's upper garment with the REFERENCE GARMENT (TOP).\n`;
        }
        if (optBottom) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            pipelineDirective += `\n**OPERATION: LOWER BODY SWAP**\n- Replace ONLY the Target Model's lower garment with the REFERENCE GARMENT (BOTTOM).\n`;
        }
    }

    // STYLING OVERRIDES (Hard Rules)
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    if (hasStyling) {
        pipelineDirective += `\n**STYLING MODIFIERS (Apply to new garment only)**:\n`;
        if (stylingOptions?.tuck) pipelineDirective += `- WAIST: ${stylingOptions.tuck}.\n`;
        if (stylingOptions?.fit) pipelineDirective += `- FIT: ${stylingOptions.fit}.\n`;
        if (stylingOptions?.sleeve) pipelineDirective += `- SLEEVES: ${stylingOptions.sleeve}.\n`;
    }

    pipelineDirective += `\n**FINAL CHECK**: Before outputting, compare the Face and Background with the original. If they differ, revert them to the original pixels.`;

    parts.push({ text: pipelineDirective });

    // INPUT 2: The Target Model (Sent last to anchor the generation)
    parts.push({ text: "TARGET MODEL (PRESERVE THIS IMAGE EXACTLY, CHANGE CLOTHES ONLY):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    // 4. EXECUTE GENERATION
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    
    throw new Error("Model failed to generate image.");

  } catch (error) {
    console.error("Apparel Pipeline Failed:", error);
    throw error;
  }
};
