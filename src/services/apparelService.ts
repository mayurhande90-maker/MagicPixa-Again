
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  garmentBase64: string,
  garmentMimeType: string,
  garmentType: 'top' | 'bottom' | 'dress',
  userPrompt?: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    // Construct the multimodal prompt
    const parts: any[] = [];
    
    // Part 1: The Person (Target)
    parts.push({ text: "TARGET MODEL IMAGE:" });
    parts.push({ inlineData: { data: personBase64, mimeType: personMimeType } });

    // Part 2: The Garment (Reference)
    parts.push({ text: "GARMENT IMAGE (Reference):" });
    parts.push({ inlineData: { data: garmentBase64, mimeType: garmentMimeType } });

    // Part 3: Instructions
    const prompt = `TASK: Virtual Apparel Try-On.
    
    INSTRUCTIONS:
    1. Analyze the "GARMENT IMAGE". Identify its fabric, texture, cut, pattern, and color.
    2. Synthesize this exact garment onto the "TARGET MODEL IMAGE", replacing their current ${garmentType === 'dress' ? 'outfit' : garmentType}.
    3. **Garment Type**: ${garmentType.toUpperCase()}.
    ${userPrompt ? `4. User Note: "${userPrompt}" (Follow this for fit/styling).` : ''}

    CRITICAL REALISM RULES:
    - **Pixel Preservation**: DO NOT change the model's face, hair, skin tone, body shape, or background. Only change the clothing.
    - **Physics & Fit**: The garment must drape naturally over the model's specific body pose. Add realistic wrinkles, tension folds, and gravity effects.
    - **Lighting Integration**: Match the lighting, shadows, and color temperature of the original model photo exactly. The garment must not look like a flat sticker.
    - **Occlusion**: If the model's hands, hair, or accessories are covering their original clothes, they MUST cover the new garment in the same way.
    - **Replacement**: 
      - If 'top': Replace only the shirt/jacket. Keep existing pants/skirt unless they clash excessively.
      - If 'bottom': Replace only the pants/skirt. Keep existing top.
      - If 'dress': Replace the entire outfit.

    OUTPUT:
    A high-resolution, photorealistic image of the original model wearing the new garment.`;

    parts.push({ text: prompt });

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