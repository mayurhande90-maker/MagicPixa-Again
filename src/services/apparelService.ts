
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

    // 3. CONSTRUCT "PIPELINE" PROMPT
    const parts: any[] = [];

    let pipelineDirective = `SYSTEM DIRECTIVE: You are a deterministic image synthesis pipeline for Virtual Apparel Try-On.
    
    YOUR GOAL: Produce a hyper-realistic full-body try-on result.
    PRIORITY: Correctness, stability, and blending. NEVER return a blank output.

    ===========================
    EXECUTION PIPELINE (INTERNAL)
    ===========================
    1. **POSE DETECTION**: Analyze the "TARGET MODEL". Lock face, hair, hands, and skin tone. These must NOT change.
    2. **GARMENT SEGMENTATION**: Identify the clothing in the "REFERENCE" image(s).
    3. **GEOMETRIC WARP**: Warp the reference garment to match the Target Model's pose (shoulders, chest, waist).
    4. **LIGHTING MATCH**: Detect scene lighting from Target Model. Relight the new garment to match.
    5. **BLENDING**: Composite with realistic shadows (under arms, neckline, hem) and soft edges.
    `;

    // INPUT 1: The Reference Garments
    if (isFullOutfit && optTop) {
        parts.push({ text: "REFERENCE IMAGE (FULL OUTFIT SOURCE):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        pipelineDirective += `\n**TASK: FULL OUTFIT TRANSFER**
        - The "REFERENCE IMAGE" contains a complete look (Top + Bottom).
        - ACTION: Extract BOTH the Upper Garment and Lower Garment from this single reference image.
        - ACTION: Apply this complete outfit to the Target Model.\n`;
    } else {
        if (optTop) {
            parts.push({ text: "REFERENCE GARMENT (TOP):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            pipelineDirective += `\n**TASK: TOP TRANSFER**\n- Replace Target Model's upper clothing with "REFERENCE GARMENT (TOP)".\n`;
        }
        if (optBottom) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            pipelineDirective += `\n**TASK: BOTTOM TRANSFER**\n- Replace Target Model's lower clothing with "REFERENCE GARMENT (BOTTOM)".\n`;
        }
    }

    // STYLING OVERRIDES (Hard Rules)
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    if (hasStyling) {
        pipelineDirective += `\n**STYLING OVERRIDES (STRICT)**:\n`;
        if (stylingOptions?.tuck) pipelineDirective += `- WAIST: Force ${stylingOptions.tuck}. (Synthesize belt/waistband if needed).\n`;
        if (stylingOptions?.fit) pipelineDirective += `- FIT: Make it ${stylingOptions.fit}.\n`;
        if (stylingOptions?.sleeve) pipelineDirective += `- SLEEVES: Force ${stylingOptions.sleeve}.\n`;
    } else if (isFullOutfit) {
        pipelineDirective += `\n**STYLING**: Maintain the exact tuck/drape style seen in the Reference Image.\n`;
    }

    pipelineDirective += `\n**GLOBAL RULES**:\n- DO NOT modify the person's face or identity.\n- Preserve the original background.\n- Output high-resolution photorealism.`;

    parts.push({ text: pipelineDirective });

    // INPUT 2: The Target Model (Sent last to anchor the generation)
    parts.push({ text: "TARGET MODEL (PRESERVE FACE & POSE):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    // 4. EXECUTE GENERATION
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    
    throw new Error("Pipeline Error: Model failed to generate a valid image result.");

  } catch (error) {
    console.error("Apparel Pipeline Failed:", error);
    throw error;
  }
};
