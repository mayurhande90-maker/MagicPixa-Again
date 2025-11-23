
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  topGarment: { base64: string; mimeType: string } | null,
  bottomGarment: { base64: string; mimeType: string } | null,
  userPrompt?: string
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

    // Part 2: Top Garment
    if (topGarment) {
        parts.push({ text: "REFERENCE GARMENT (TOP/UPPER BODY):" });
        parts.push({ inlineData: { data: topGarment.base64, mimeType: topGarment.mimeType } });
        instructions += `2. Identify the "REFERENCE GARMENT (TOP)". Replace the model's current upper-body clothing (shirt, jacket, dress top) with this exact garment. Match the fabric, texture, and cut.\n`;
    }

    // Part 3: Bottom Garment
    if (bottomGarment) {
        parts.push({ text: "REFERENCE GARMENT (BOTTOM/LOWER BODY):" });
        parts.push({ inlineData: { data: bottomGarment.base64, mimeType: bottomGarment.mimeType } });
        instructions += `3. Identify the "REFERENCE GARMENT (BOTTOM)". Replace the model's current lower-body clothing (pants, skirt, shorts) with this exact garment. Match the fabric, texture, and cut.\n`;
    }

    if (topGarment && bottomGarment) {
        instructions += `4. **Composition**: Ensure the Top and Bottom interact naturally at the waist (tuck or drape based on style).\n`;
    }

    if (userPrompt) {
        instructions += `5. **User Styling Note**: "${userPrompt}" (Follow this priority for fit/styling).\n`;
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
