
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// AGGRESSIVE OPTIMIZATION HELPER
// Forces images to a safe size (1024px) and lower quality (0.6) to guarantee API acceptance.
const optimizeForPayload = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // 1024px is standard for AI inputs. 0.6 quality removes invisible data overhead.
        const resizedUri = await resizeImage(dataUri, 1024, 0.60);
        const [header, data] = resizedUri.split(',');
        // Force JPEG as it is much lighter than PNG
        return { data, mimeType: 'image/jpeg' };
    } catch (e) {
        console.warn("Image optimization failed, sending original (risky)", e);
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
    // 1. DETECT SAME SOURCE (Full Outfit Case)
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    // 2. PREPARE IMAGES (Parallel Processing)
    const personPromise = optimizeForPayload(personBase64, personMimeType);
    
    let topPromise, bottomPromise;

    if (isSameGarmentImage && topGarment) {
        // If identical, optimize once and reuse
        topPromise = optimizeForPayload(topGarment.base64, topGarment.mimeType);
        bottomPromise = topPromise;
    } else {
        topPromise = topGarment ? optimizeForPayload(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
        bottomPromise = bottomGarment ? optimizeForPayload(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    }

    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // 3. BUILD PROMPT PARTS
    const parts: any[] = [];

    // SECTION A: INSTRUCTIONS (Context First)
    let instructions = `ACT AS: Expert Virtual Try-On AI.\nTASK: Swap clothing on the Target Model.\n\n`;

    // SECTION B: REFERENCE IMAGES (The "Clothes")
    if (isSameGarmentImage && optTop) {
        parts.push({ text: "SOURCE IMAGE (FULL OUTFIT):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        
        instructions += `**SOURCE INSTRUCTION**:\nThe "SOURCE IMAGE" contains a complete outfit (Top + Bottom).\n`;
        instructions += `1. Extract the **Upper Garment** (Shirt/Jacket) from the source.\n`;
        instructions += `2. Extract the **Lower Garment** (Pants/Skirt) from the source.\n`;
        instructions += `3. Dress the Target Model in this exact complete outfit.\n`;
    } else {
        if (optTop) {
            parts.push({ text: "SOURCE GARMENT (TOP):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            instructions += `**TOP INSTRUCTION**: Replace Target Model's shirt/top with "SOURCE GARMENT (TOP)".\n`;
        }
        if (optBottom) {
            parts.push({ text: "SOURCE GARMENT (BOTTOM):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            instructions += `**BOTTOM INSTRUCTION**: Replace Target Model's pants/skirt with "SOURCE GARMENT (BOTTOM)".\n`;
        }
    }

    // SECTION C: STYLING OVERRIDES
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    if (hasStyling) {
        instructions += `\n**MANDATORY STYLING OVERRIDES** (Ignore reference image style if different):\n`;
        if (stylingOptions?.tuck) instructions += `- WAIST: ${stylingOptions.tuck}\n`;
        if (stylingOptions?.fit) instructions += `- FIT: ${stylingOptions.fit}\n`;
        if (stylingOptions?.sleeve) instructions += `- SLEEVES: ${stylingOptions.sleeve}\n`;
    } else if (isSameGarmentImage) {
        instructions += `\n**STYLING**: Keep the exact tuck/fit style seen in the Source Image.\n`;
    }

    instructions += `\n**FINAL EXECUTION RULES**:\n`;
    instructions += `- PRESERVE: Target Model's Face, Head, Hands, and Body Shape EXACTLY.\n`;
    instructions += `- LIGHTING: Re-light the garments to match the Target Model's room.\n`;
    instructions += `- REALISM: High-quality fabric texture, realistic folds.\n`;
    
    parts.push({ text: instructions });

    // SECTION D: TARGET (The "Person") - Sent Last for Context
    parts.push({ text: "TARGET MODEL (DO NOT CHANGE FACE):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    // 4. CALL API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("The model failed to generate an image. Please try a different photo.");
  } catch (error) {
    console.error("Apparel Generation Error:", error);
    throw error;
  }
};
