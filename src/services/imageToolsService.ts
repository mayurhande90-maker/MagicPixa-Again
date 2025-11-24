
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// Specific optimizer for High-Res Editing (1536px) to avoid pixelation
const optimizeImageForEditing = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Use 1536px and higher quality for detailed inpainting
        const resizedUri = await resizeImage(dataUri, 1536, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Editing optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore' | 'colourize_only'
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    let basePrompt = `Task: Professional Photo Restoration & Colorization.
    
    Instructions:
    1. Analyze the image content (clothing, skin tone, background era).
    2. Colorize the black and white image with historically accurate, photorealistic colors.
    3. Maintain the exact facial features and identity of the subjects.`;
    
    if (mode === 'restore') basePrompt += `\n4. RESTORATION MODE: Actively detect and heal scratches, dust, tears, and noise. Sharpen blurred details slightly.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: basePrompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error colourizing image:", error);
    throw error;
  }
};

export const generateMagicSoul = async (
  personABase64: string,
  personAMimeType: string,
  personBBase64: string,
  personBMimeType: string,
  style: string,
  environment: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const [optA, optB] = await Promise.all([
        optimizeImage(personABase64, personAMimeType),
        optimizeImage(personBBase64, personBMimeType)
    ]);

    const prompt = `Task: Magic Soul - Hyper-realistic Couple Composition.
    
    Input: Two separate portraits (Subject A and Subject B).
    Goal: Combine them into a SINGLE cohesive photograph.
    
    Style: ${style}.
    Environment: ${environment}.
    
    CRITICAL RULES:
    1. **Identity Lock**: You MUST preserve the facial features of Subject A and Subject B exactly.
    2. **Interaction**: Position them naturally together (standing, sitting, or hugging) based on the context.
    3. **Lighting**: Relight both subjects to match the new environment perfectly.
    4. **Output**: High-resolution, DSLR quality photograph.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: "Subject A Reference:" },
          { inlineData: { data: optA.data, mimeType: optA.mimeType } },
          { text: "Subject B Reference:" },
          { inlineData: { data: optB.data, mimeType: optB.mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating Magic Soul:", error);
    throw error;
  }
};

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  mockupType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `Task: Professional Product Mockup.
    
    Input: A design/logo file.
    Target Item: ${mockupType}.
    
    Instructions:
    1. Generate a photorealistic image of the Target Item (${mockupType}) in a professional studio setting.
    2. Apply the Input Design onto the surface of the Target Item.
    3. **Physics**: The design must wrap correctly around curves, folds, and textures (e.g., displacement map effect).
    4. **Lighting**: The design must interact with the scene lighting (reflections, shadows).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating mockup:", error);
    throw error;
  }
};

export const generateStyledImage = async (
    productImages: string[],
    prompt: string
): Promise<string> => {
    const ai = getAiClient();
    // Use the first product image as reference
    const { data, mimeType } = await optimizeImage(productImages[0], 'image/png');
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: data, mimeType: mimeType } }, 
                { text: `Stylized Generation. Prompt: ${prompt}` }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const generateBrandStylistImage = async (
    referenceImageBase64: string,
    prompt: string
): Promise<string> => {
    const ai = getAiClient();
    // Image optimization usually not needed for style reference as small is fine, but we do it for consistency
    const { data, mimeType } = await optimizeImage(referenceImageBase64, 'image/png');

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: data, mimeType: mimeType } },
                { text: `Task: Style Transfer / Brand Asset Generation.
                
                Reference Image: Provides the visual style, color palette, and mood.
                Prompt: "${prompt}".
                
                Instruction: Generate a new image matching the text Prompt, but strictly adhering to the artistic style of the Reference Image.` }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    
    // Use Higher Resolution Optimizer for Editing
    const [optImg] = await Promise.all([
        optimizeImageForEditing(base64ImageData, mimeType)
    ]);

    // REVISED PROMPT: EXPLICIT MASK INTERPRETATION
    const prompt = `You are an expert Photo Retoucher using Gemini 3 Pro.
    
    **TASK: ERASE & INPAINT (Magic Eraser)**
    
    **INPUTS:**
    1. **IMAGE 1 (Source)**: The photo that needs editing.
    2. **IMAGE 2 (Instruction Mask)**: A binary mask layer.
       - **BLACK** pixels = THE REMOVAL ZONE (The object to erase).
       - **WHITE** pixels = THE SAFE ZONE (Keep exactly as is).
    
    **EXECUTION INSTRUCTIONS:**
    1. **ERASE:** Identify the pixels in IMAGE 1 that correspond to the BLACK areas in IMAGE 2. Delete them completely.
    2. **INPAINT:** Hallucinate a realistic background to fill the empty space. You MUST analyze the surrounding textures (walls, floor, patterns) in the WHITE area and extend them seamlessly into the gap.
    3. **BLEND:** Ensure perfect lighting, noise, and focus consistency. The removed object should vanish without a trace.
    4. **PROTECT:** Do NOT alter any part of the image covered by the WHITE mask.
    
    Output ONLY the final edited image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: optImg.data, mimeType: optImg.mimeType } },
                { text: "MASK LAYER (Black=Remove, White=Keep):" },
                { inlineData: { data: maskBase64, mimeType: "image/png" } },
                { text: prompt } 
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};
