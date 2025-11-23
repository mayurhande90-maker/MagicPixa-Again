
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
        // Resize to max 1280px width/height, 0.85 quality JPEG. 
        // This ensures the total payload of 3 images stays well within API limits while maintaining high quality.
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
    const parts: any[] = [];
    
    // Part 1: The Person (Target)
    parts.push({ text: "TARGET MODEL IMAGE:" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    let step = 1;
    let instructions = `TASK: Virtual Apparel Try-On.\n\nINSTRUCTIONS:\n${step++}. Analyze the "TARGET MODEL IMAGE". Understand the pose, lighting, body shape, and skin tone.\n`;

    if (isSameGarmentImage && optTop) {
        // Optimization: Send image once, instruct to extract both
        parts.push({ text: "REFERENCE OUTFIT IMAGE (Source):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        
        instructions += `${step++}. **Full Outfit Transfer**: The "REFERENCE OUTFIT IMAGE" contains a full outfit (both top and bottom garments).
        - **Action**: Smartly detect and identify the Top (shirt/jacket) and the Bottom (pants/skirt) from this single reference image.
        - **Apply**: Dress the target model in this complete outfit.\n`;
        
        // Only enforce reference context if user didn't override the tuck
        if (!stylingOptions?.tuck) {
             instructions += `- **Context**: Maintain the waistline interaction (tucked/untucked) exactly as seen in the reference image.\n`;
        }
    } else {
        // Distinct Images Logic
        if (optTop) {
            parts.push({ text: "REFERENCE GARMENT (TOP/UPPER BODY):" });
            parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
            instructions += `${step++}. Identify the "REFERENCE GARMENT (TOP)". **Smartly detect and extract ONLY the upper-body garment** (shirt, jacket, dress top). Replace the model's current upper-body clothing with this exact garment. Match the fabric, texture, and cut.\n`;
        }

        if (optBottom) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM/LOWER BODY):" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            instructions += `${step++}. Identify the "REFERENCE GARMENT (BOTTOM)". **Smartly detect and extract ONLY the lower-body garment** (pants, skirt, shorts). Replace the model's current lower-body clothing with this exact garment. Match the fabric, texture, and cut.\n`;
        }

        if (optTop && optBottom) {
            instructions += `${step++}. **Composition**: Ensure the Top and Bottom interact naturally at the waist.\n`;
        }
    }

    // Explicit Styling Overrides
    const hasStyling = stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve);
    
    if (hasStyling) {
        instructions += `\n${step++}. **STYLING OVERRIDES (CRITICAL)**:\n`;
        if (stylingOptions?.tuck) {
            instructions += `- **TUCK STYLE**: The user explicitly requests the top be **${stylingOptions.tuck}**. You MUST modify the outfit to match this rule, even if the reference image shows otherwise. Synthesize realistic waist details (belt line, fabric folds) if changing from untucked to tucked or vice versa.\n`;
        }
        if (stylingOptions?.fit) {
            instructions += `- **FIT**: Adjust the garment volume to look **${stylingOptions.fit}** on the target model.\n`;
        }
        if (stylingOptions?.sleeve) {
            instructions += `- **SLEEVES**: Modify sleeves to be **${stylingOptions.sleeve}**.\n`;
        }
    }

    if (userPrompt) {
        instructions += `\n${step++}. **User Note**: "${userPrompt}" (Follow this priority for specific details not covered above).\n`;
    }

    instructions += `\n**CRITICAL REALISM RULES**:
    - **Pixel Preservation**: DO NOT change the model's face, hair, skin tone, body shape, or background. Only change the clothing specified.
    - **Physics & Fit**: The garment must drape naturally over the model's specific body pose. Add realistic wrinkles, tension folds, and gravity effects.
    - **Lighting Integration**: Match the lighting, shadows, and color temperature of the original model photo exactly. The garment must not look like a flat sticker.
    - **Occlusion**: If the model's hands, hair, or accessories are covering their original clothes, they MUST cover the new garment in the same way.

    OUTPUT:
    A high-resolution, photorealistic image of the original model wearing the new garment(s).`;

    parts.push({ text: instructions });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating apparel try-on:", error);
    throw error;
  }
};
