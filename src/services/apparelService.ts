
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// Aggressive Image Optimization to prevent API payload limits
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Resize to 1024px max dimension, 0.75 quality JPEG for optimal speed/quality ratio
        const resizedUri = await resizeImage(dataUri, 1024, 0.75);
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
        // If same, just optimize one and reuse the promise result to save processing
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

    let instructions = `ROLE: Expert AI Fashion Stylist & Image Compositor.
    TASK: High-Fidelity Virtual Try-On.
    
    OBJECTIVE: Photorealistically dress the TARGET MODEL in the provided reference garment(s).
    `;

    if (isSameGarmentImage && optTop) {
        // --- SCENARIO A: FULL OUTFIT TRANSFER (Same Image in Top & Bottom slots) ---
        parts.push({ text: "REFERENCE OUTFIT IMAGE (Contains FULL LOOK):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        
        instructions += `
        **CRITICAL INSTRUCTION: FULL OUTFIT EXTRACTION**
        The user has provided a SINGLE reference image containing a complete outfit (Top + Bottom).
        1. **UPPER BODY**: Identify and extract the shirt/jacket/top from the Reference Image. Apply it to the Target Model's torso.
        2. **LOWER BODY**: Identify and extract the pants/skirt/shorts from the Reference Image. Apply it to the Target Model's legs.
        3. **INTEGRATION**: Seamlessly blend them at the waist.
        `;
    } else {
        // --- SCENARIO B: SEPARATE GARMENTS ---
        if (optTop) {
            parts.push({ text: "REFERENCE TOP GARMENT:" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            instructions += `**STEP 1**: Replace the Target Model's upper-body clothing with the REFERENCE TOP GARMENT.\n`;
        }

        if (optBottom) {
            parts.push({ text: "REFERENCE BOTTOM GARMENT:" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            instructions += `**STEP 2**: Replace the Target Model's lower-body clothing with the REFERENCE BOTTOM GARMENT.\n`;
        }
    }

    // --- STYLING LOGIC (Strict Constraints) ---
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        instructions += `
        **MANDATORY STYLING OVERRIDES (PRIORITY 1)**:
        You MUST Ignore the reference image's original styling if it conflicts with these rules:
        `;
        if (stylingOptions?.tuck) {
            instructions += `- **WAIST INTERACTION**: Force the style to be "${stylingOptions.tuck}". 
            (If 'Tucked In': The top MUST go inside the waistband. Synthesize a belt if needed.
             If 'Untucked': The top MUST drape over the waistband. Synthesize the hemline if cut off in reference.)\n`;
        }
        if (stylingOptions?.fit) {
            instructions += `- **FIT**: Adjust fabric drape to be "${stylingOptions.fit}".\n`;
        }
        if (stylingOptions?.sleeve) {
            instructions += `- **SLEEVES**: Force sleeves to be "${stylingOptions.sleeve}". Roll up or extend as commanded.\n`;
        }
    } else if (isSameGarmentImage) {
        instructions += `
        **DEFAULT STYLING**: Maintain the EXACT tuck/drape relationship visible in the Reference Outfit Image.
        `;
    }

    instructions += `
    **FINAL EXECUTION RULES**:
    1. **PRESERVE IDENTITY**: The Target Model's face, hair, skin tone, and body shape must remain UNCHANGED.
    2. **LIGHTING MATCH**: Re-light the new garments to match the Target Model's environment. Match shadows and color temperature.
    3. **PHYSICS**: Fabric must fold, hang, and wrinkle realistically based on the model's pose.
    4. **NO REFUSAL**: If a garment part is partially obscured in the reference, INFER its structure and complete the look. Do not fail. Generate the best possible result.
    
    Output ONLY the final image.
    `;

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
