
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

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
    // Construct the multimodal prompt
    const parts: any[] = [];
    
    // Part 1: The Person (Target)
    parts.push({ text: "TARGET MODEL IMAGE:" });
    parts.push({ inlineData: { data: personBase64, mimeType: personMimeType } });

    let instructions = `TASK: Virtual Apparel Try-On.
    
    INSTRUCTIONS:
    1. Analyze the "TARGET MODEL IMAGE". Understand the pose, lighting, body shape, and skin tone.
    `;

    // Check for Single Outfit Upload (Same image for Top and Bottom)
    // Note: We compare the base64 data string to see if they are identical.
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    if (isSameGarmentImage && topGarment) {
        // Optimization: Send image once, instruct to extract both
        parts.push({ text: "REFERENCE OUTFIT IMAGE (Full Look):" });
        parts.push({ inlineData: { data: topGarment.base64, mimeType: topGarment.mimeType } });
        
        instructions += `2. **Full Outfit Transfer**: The "REFERENCE OUTFIT IMAGE" contains a full outfit (both top and bottom garments).
        - **Action**: Smartly detect and identify the Top (shirt/jacket) and the Bottom (pants/skirt) from this single reference image.
        - **Apply**: Replace the target model's clothes with this complete outfit.
        - **Context**: Maintain the relationship between top and bottom (e.g., if the reference shows the shirt tucked in, keep it tucked in unless specified otherwise).\n`;
    } else {
        // Distinct Images Logic
        if (topGarment) {
            parts.push({ text: "REFERENCE GARMENT (TOP/UPPER BODY):" });
            parts.push({ inlineData: { data: topGarment.base64, mimeType: topGarment.mimeType } });
            instructions += `2. Identify the "REFERENCE GARMENT (TOP)". **Smartly detect and extract ONLY the upper-body garment** (shirt, jacket, dress top). Replace the model's current upper-body clothing with this exact garment. Match the fabric, texture, and cut.\n`;
        }

        if (bottomGarment) {
            parts.push({ text: "REFERENCE GARMENT (BOTTOM/LOWER BODY):" });
            parts.push({ inlineData: { data: bottomGarment.base64, mimeType: bottomGarment.mimeType } });
            instructions += `3. Identify the "REFERENCE GARMENT (BOTTOM)". **Smartly detect and extract ONLY the lower-body garment** (pants, skirt, shorts). Replace the model's current lower-body clothing with this exact garment. Match the fabric, texture, and cut.\n`;
        }

        if (topGarment && bottomGarment) {
            instructions += `4. **Composition**: Ensure the Top and Bottom interact naturally at the waist (tuck or drape based on style).\n`;
        }
    }

    // Structured Styling Options
    if (stylingOptions) {
        if (stylingOptions.tuck) instructions += `5. **Tuck Style**: The top garment MUST be worn ${stylingOptions.tuck}. Render the waist interaction accordingly (e.g. fabric tension if tucked, natural drape if untucked).\n`;
        if (stylingOptions.fit) instructions += `6. **Fit**: The clothing should have a ${stylingOptions.fit} look on the model. Adjust drape and volume to match this fit.\n`;
        if (stylingOptions.sleeve) instructions += `7. **Sleeve Styling**: Ensure sleeves are ${stylingOptions.sleeve}.\n`;
    }

    if (userPrompt) {
        instructions += `8. **Additional Styling Note**: "${userPrompt}" (Follow this priority for specific details not covered above).\n`;
    }

    instructions += `
    CRITICAL REALISM RULES:
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
