import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// Helper to reduce image size for AI payload safety
// Reduced to 1024px to ensure reliability with multiple image inputs
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.80);
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
    const parts: any[] = [];
    
    // Part 1: The Person (Target)
    parts.push({ text: "TARGET MODEL IMAGE:" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    let instructions = `TASK: Professional Virtual Apparel Try-On.\n\nGOAL: Photorealistic synthesis of the Target Model wearing the Reference Garments.\n\n`;

    if (isSameGarmentImage && optTop) {
        // Optimization: Send image once, instruct to extract both
        parts.push({ text: "REFERENCE OUTFIT IMAGE (Source):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        
        instructions += `**REFERENCE INSTRUCTION (FULL OUTFIT)**:\n`;
        instructions += `The "REFERENCE OUTFIT IMAGE" shows a complete look (Top + Bottom).\n`;
        instructions += `1. Extract the **Upper Garment** (Shirt/Top/Jacket) from the Reference.\n`;
        instructions += `2. Extract the **Lower Garment** (Pants/Skirt/Shorts) from the Reference.\n`;
        instructions += `3. Dress the Target Model in this complete outfit.\n`;
    } else {
        // Distinct Images Logic
        if (optTop) {
            parts.push({ text: "REFERENCE GARMENT (TOP):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            instructions += `**TOP GARMENT INSTRUCTION**:\nReplace the Target Model's upper-body clothing with the "REFERENCE GARMENT (TOP)".\n`;
        }

        if (optBottom) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            instructions += `**BOTTOM GARMENT INSTRUCTION**:\nReplace the Target Model's lower-body clothing with the "REFERENCE GARMENT (BOTTOM)".\n`;
        }
    }

    // Explicit Styling Overrides
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        instructions += `\n**STYLING MODIFICATIONS (PRIORITY)**:\n`;
        instructions += `You MUST modify the fit/drape of the garments to match these settings, ignoring the original reference image's styling if it conflicts:\n`;
        if (stylingOptions?.tuck) {
            instructions += `- **Waist Style**: ${stylingOptions.tuck}. (If "Tucked In", show waistband/belt. If "Untucked", drape over the bottom garment).\n`;
        }
        if (stylingOptions?.fit) {
            instructions += `- **Fit**: ${stylingOptions.fit}.\n`;
        }
        if (stylingOptions?.sleeve) {
            instructions += `- **Sleeve Length**: ${stylingOptions.sleeve}.\n`;
        }
    } else if (isSameGarmentImage) {
        instructions += `\n**STYLING CONTEXT**: Maintain the exact tuck/drape style seen in the Reference Outfit Image.\n`;
    }

    instructions += `\n**EXECUTION RULES**:\n`;
    instructions += `- **Preserve Identity**: Do NOT change the model's face, body shape, or skin tone.\n`;
    instructions += `- **Lighting Match**: Relight the new garments to match the Target Model's environment perfectly.\n`;
    instructions += `- **Physics**: Add realistic fabric folds, gravity, and tension wrinkles based on the model's pose.\n`;
    instructions += `- **Quality**: Output a high-resolution, photorealistic result.`;

    parts.push({ text: instructions });

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