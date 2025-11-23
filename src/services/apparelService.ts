
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
        // Use 1024px and 60% quality to prevent payload bloating
        const resizedUri = await resizeImage(dataUri, 1024, 0.60);
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
    
    // STRICT SYSTEM INSTRUCTION (PIPELINE DIRECTIVE)
    // We place this first to set the behavior context immediately.
    parts.push({ text: `
SYSTEM PIPELINE: DETERMINISTIC APPAREL TRY-ON
GOAL: Realistic Virtual Try-On.
RULES:
1. IDENTITY LOCK: Do NOT change the user's face, hair, skin tone, body shape, or background.
2. INPUTS: You will receive a TARGET MODEL and REFERENCE GARMENTS.
3. ACTION: Replace the model's clothing with the reference garments.
`});

    // Part 1: The Person (Target)
    parts.push({ text: "INPUT 1: TARGET MODEL IMAGE" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    let instructions = `\n*** EXECUTION PLAN ***\n`;

    if (isSameGarmentImage && optTop) {
        // Optimization: Send image once, instruct to extract both
        parts.push({ text: "INPUT 2: REFERENCE OUTFIT SOURCE (Contains both Top & Bottom)" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        
        instructions += `DETECTED SOURCE: Single reference image containing full outfit.\n`;
        instructions += `TASK: Extract both Upper and Lower garments from INPUT 2 and apply them to the Target Model.\n`;
    } else {
        // Distinct Images Logic - Handles 1 or 2 separate garments
        if (optTop && optBottom) {
             // Both Provided - Combined Instruction
             parts.push({ text: "INPUT 2: TOP GARMENT (Reference)" });
             parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
             parts.push({ text: "INPUT 3: BOTTOM GARMENT (Reference)" });
             parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });

             instructions += `TASK: FULL OUTFIT REPLACEMENT.\n`;
             instructions += `1. Replace Model's UPPER body clothing with INPUT 2 (Top).\n`;
             instructions += `2. Replace Model's LOWER body clothing with INPUT 3 (Bottom).\n`;
             instructions += `3. Ensure natural transition at the waistline between Top and Bottom.\n`;
        } else if (optTop) {
            parts.push({ text: "INPUT 2: TOP GARMENT (Reference)" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            instructions += `TASK: UPPER BODY REPLACEMENT ONLY. Keep original pants/bottoms unless they conflict visually.\n`;
            instructions += `Replace Model's upper clothing with INPUT 2.\n`;
        } else if (optBottom) {
            parts.push({ text: "INPUT 2: BOTTOM GARMENT (Reference)" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            instructions += `TASK: LOWER BODY REPLACEMENT ONLY. Keep original shirt/top unless it conflicts visually.\n`;
            instructions += `Replace Model's lower clothing with INPUT 2.\n`;
        }
    }

    // Explicit Styling Overrides
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        instructions += `\n*** STYLING OVERRIDES (HIGHEST PRIORITY) ***\n`;
        instructions += `You MUST synthesize these details even if not visible in reference:\n`;
        if (stylingOptions?.tuck) {
            instructions += `- WAIST: ${stylingOptions.tuck}. (If "Tucked In", generate waistband/belt interaction. If "Untucked", generate hem draping over bottom).\n`;
        }
        if (stylingOptions?.fit) {
            instructions += `- FIT: ${stylingOptions.fit}.\n`;
        }
        if (stylingOptions?.sleeve) {
            instructions += `- SLEEVES: ${stylingOptions.sleeve}.\n`;
        }
    }

    instructions += `\n*** FINAL QUALITY CHECK ***\n`;
    instructions += `- Lighting match: YES.\n`;
    instructions += `- Skin texture preserved: YES.\n`;
    instructions += `- Background untouched: YES.\n`;
    instructions += `- Resolution: High.\n`;

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
