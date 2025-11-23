
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// Helper to reduce image size for AI payload safety
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Smart Compression: 
        // 1280px is high enough for excellent details (HD).
        // 0.85 quality keeps texture details (fabric/skin) while cutting file size by ~60-80%.
        // The new resizeImage logic ensures TALL photos are also resized, preventing crashes.
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
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
    // Check for Single Outfit Upload (Same image for Top and Bottom)
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    // 1. Optimize Images (Parallel)
    const personPromise = optimizeImage(personBase64, personMimeType);
    let topPromise, bottomPromise;

    if (isSameGarmentImage && topGarment) {
        // If same, just optimize one and reuse the promise result
        topPromise = optimizeImage(topGarment.base64, topGarment.mimeType);
        bottomPromise = topPromise;
    } else {
        topPromise = topGarment ? optimizeImage(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
        bottomPromise = bottomGarment ? optimizeImage(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    }

    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // Construct the multimodal prompt
    // STRATEGY: Instructions FIRST, then Context Images, then Target Image.
    // This helps the model understand "What am I looking at?" before processing pixel data.
    const parts: any[] = [];
    
    let systemInstructions = `TASK: Professional Virtual Apparel Try-On.\n\nGOAL: Photorealistic synthesis of the Target Model wearing the Reference Garments.\n\n`;

    if (isSameGarmentImage && optTop) {
        systemInstructions += `**SCENARIO: FULL OUTFIT TRANSFER**\n`;
        systemInstructions += `The "REFERENCE OUTFIT IMAGE" below contains a complete look (both Upper and Lower garments).\n`;
        systemInstructions += `1. **Analyze**: Smartly identify and mentally separate the Top (shirt/jacket) from the Bottom (pants/skirt).\n`;
        systemInstructions += `2. **Transfer**: Apply BOTH extracted garments to the Target Model.\n`;
        systemInstructions += `3. **Context**: Maintain the relationship (e.g., tucking) seen in the reference unless overridden by styling options.\n`;
        
        parts.push({ text: systemInstructions });
        parts.push({ text: "REFERENCE OUTFIT IMAGE (Source of Top & Bottom):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });

    } else {
        // Distinct Images Logic
        systemInstructions += `**SCENARIO: MULTI-GARMENT COMPOSITION**\n`;
        if (optTop) systemInstructions += `- Replace Model's UPPER BODY clothing with the Reference Top.\n`;
        if (optBottom) systemInstructions += `- Replace Model's LOWER BODY clothing with the Reference Bottom.\n`;
        
        parts.push({ text: systemInstructions });

        if (optTop) {
            parts.push({ text: "REFERENCE GARMENT (TOP):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        }
        if (optBottom) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
        }
    }

    // Explicit Styling Overrides
    let styleInstructions = `\n**STYLING & GENERATION RULES**:\n`;
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        styleInstructions += `\n**PRIORITY OVERRIDES** (You MUST follow these constraints over the reference image):\n`;
        if (stylingOptions?.tuck) {
            styleInstructions += `- **Waist**: ${stylingOptions.tuck}. (Generate/Remove belt or waistband as needed to achieve this).\n`;
        }
        if (stylingOptions?.fit) {
            styleInstructions += `- **Fit**: ${stylingOptions.fit}.\n`;
        }
        if (stylingOptions?.sleeve) {
            styleInstructions += `- **Sleeves**: ${stylingOptions.sleeve}.\n`;
        }
    }

    styleInstructions += `\n**QUALITY PROTOCOLS**:\n`;
    styleInstructions += `- **Identity Lock**: PRESERVE the Target Model's face, hair, body shape, and skin tone exactly.\n`;
    styleInstructions += `- **Lighting Match**: Relight the new garments to match the Target Model's environment perfectly.\n`;
    styleInstructions += `- **Physics**: Add realistic fabric folds, tension wrinkles, and gravity effects. No "floating" clothes.\n`;
    styleInstructions += `- **Generative Fill**: If the new garment reveals skin that was previously covered (e.g., shorter sleeves), generate realistic skin texture matching the model.\n`;

    parts.push({ text: styleInstructions });

    // Add Target Model LAST so the AI applies everything ONTO this image
    parts.push({ text: "TARGET MODEL IMAGE (Apply changes here):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated. The model might have blocked the request.");
  } catch (error) {
    console.error("Error generating apparel try-on:", error);
    throw error;
  }
};
