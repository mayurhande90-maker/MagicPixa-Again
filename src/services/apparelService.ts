
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// Aggressive Image Optimization
// 1. Force JPEG (smaller than PNG)
// 2. Max dimension 1024px (safe for all Gemini vision models)
// 3. Quality 0.7 (visually identical for AI analysis, half the file size)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.7); 
        const [header, data] = resizedUri.split(',');
        // Force header to be image/jpeg as resizeImage returns jpeg
        return { data, mimeType: 'image/jpeg' };
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
    // 1. DETECT DUPLICATES (Full Outfit Mode)
    // If the base64 strings match, we treat this as a single "Reference Outfit" source.
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    // 2. OPTIMIZE IMAGES (Parallel Processing)
    // We resize everything before sending to avoid 413 Payload Too Large or Timeout errors.
    const personPromise = optimizeImage(personBase64, personMimeType);
    let topPromise, bottomPromise;

    if (isSameGarmentImage && topGarment) {
        // OPTIMIZATION: Only resize ONCE if images are identical
        const sharedPromise = optimizeImage(topGarment.base64, topGarment.mimeType);
        topPromise = sharedPromise;
        bottomPromise = sharedPromise;
    } else {
        topPromise = topGarment ? optimizeImage(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
        bottomPromise = bottomGarment ? optimizeImage(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    }

    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // 3. CONSTRUCT MULTIMODAL PAYLOAD
    const parts: any[] = [];
    
    // Part A: The Target Model
    parts.push({ text: "TARGET MODEL (The person to dress):" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    // Part B: The Garments
    if (isSameGarmentImage && optTop) {
        // SINGLE REFERENCE MODE (Deduplicated)
        // We send the image ONCE, but instruct the model to use it for BOTH parts.
        parts.push({ text: "REFERENCE OUTFIT (Source for both Top and Bottom):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
    } else {
        // DISTINCT GARMENTS MODE
        if (optTop) {
            parts.push({ text: "REFERENCE TOP (Upper Body):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        }
        if (optBottom) {
            parts.push({ text: "REFERENCE BOTTOM (Lower Body):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
        }
    }

    // 4. SYSTEM INSTRUCTION (The "Hard Prompt")
    let instructions = `TASK: Professional Virtual Fashion Compositing.
    ACTION: Dress the TARGET MODEL in the REFERENCE OUTFIT.
    
    *** CRITICAL EXECUTION PROTOCOL ***
    `;

    if (isSameGarmentImage) {
        instructions += `
        **SCENARIO: FULL OUTFIT TRANSFER**
        The "REFERENCE OUTFIT" image shows a complete look (Shirt + Pants).
        1. Mentally segment the Upper Garment from the reference. Apply it to the model.
        2. Mentally segment the Lower Garment from the reference. Apply it to the model.
        3. Ensure they meet naturally at the waistline.
        `;
    } else {
        instructions += `
        **SCENARIO: MIX & MATCH**
        1. Replace model's top with "REFERENCE TOP".
        2. Replace model's bottom with "REFERENCE BOTTOM".
        3. Blend the waistline naturally.
        `;
    }

    // 5. STYLING OVERRIDES (The Logic Fix)
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        instructions += `
        \n*** STYLING OVERRIDES (HIGHEST PRIORITY) ***
        You are authorized to MODIFY the geometry of the reference garments to match these commands. 
        Do not strictly copy the pixels if they conflict with these rules.
        `;
        
        if (stylingOptions?.tuck) {
            instructions += `- **WAIST STYLE**: ${stylingOptions.tuck}. 
            (Instruction: If the user wants "Tucked In" but the reference is Untucked, you must GENERATE the belt/waistband area and hide the shirttails. If "Untucked", extend the fabric over the waist.)\n`;
        }
        if (stylingOptions?.fit) {
            instructions += `- **FIT**: ${stylingOptions.fit}. (Adjust fabric looseness/tightness accordingly).\n`;
        }
        if (stylingOptions?.sleeve) {
            instructions += `- **SLEEVES**: ${stylingOptions.sleeve}. (Roll up or extend sleeves as requested, synthesizing skin or fabric as needed).\n`;
        }
    } else {
        instructions += `\n**STYLING**: Default. Copy the drape and tuck style EXACTLY as seen in the Reference image.\n`;
    }

    instructions += `
    \n**REALISM CHECKLIST**:
    - **Preserve Identity**: Do NOT change the Model's face or body shape.
    - **Lighting**: Relight the garments to match the Model's room/environment.
    - **Physics**: Add realistic wrinkles where the fabric bends (elbows, waist).
    - **Output**: A single high-quality photorealistic image.
    `;

    parts.push({ text: instructions });

    // 6. API CALL
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Using the efficient vision model
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    
    throw new Error("The AI refused to generate an image. Please try a different photo or angle.");

  } catch (error) {
    console.error("Apparel Generation Error:", error);
    throw error;
  }
};
