
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

export interface PixaTogetherConfig {
    relationship: string;
    mood: string;
    environment: string;
    pose: string;
    faceStrength: number;
    locks: {
        age: boolean;
        hair: boolean;
        accessories: boolean;
        clothing: boolean;
    };
    autoFix: boolean;
}

export const generateMagicSoul = async (
  personABase64: string,
  personAMimeType: string,
  personBBase64: string,
  personBMimeType: string,
  inputs: PixaTogetherConfig
): Promise<string> => {
  const ai = getAiClient();
  try {
    const [optA, optB] = await Promise.all([
        optimizeImage(personABase64, personAMimeType),
        optimizeImage(personBBase64, personBMimeType)
    ]);

    const prompt = `
    Generate a single combined photograph using the two uploaded reference images (Person A and Person B).
    
    *** SCENE CONFIGURATION ***
    - **Relationship Context**: ${inputs.relationship}
    - **Mood/Vibe**: ${inputs.mood}
    - **Environment**: ${inputs.environment}
    - **Required Pose**: ${inputs.pose}

    *** STRICT IDENTITY PRESERVATION PROTOCOL (Priority: ${inputs.faceStrength}%) ***
    The output must strictly preserve the real identity of both people. 
    Do NOT change: Facial features, Face shape, Skin tone, Body type.
    
    *** FEATURE LOCKS (MANDATORY) ***
    ${inputs.locks.age ? "- **LOCK AGE**: Do NOT make them younger or older. Maintain current age." : ""}
    ${inputs.locks.hair ? "- **LOCK HAIR**: Maintain original hairstyle and hair color exactly." : ""}
    ${inputs.locks.accessories ? "- **LOCK ACCESSORIES**: Keep glasses, facial hair/beards, and jewelry exactly as they are." : ""}
    ${inputs.locks.clothing ? "- **LOCK CLOTHING**: Keep the original outfit style." : "- **OUTFIT**: Adapt clothing to fit the selected Mood/Environment."}

    *** EXECUTION INSTRUCTIONS ***
    1. **Lighting Match**: Ensure both people look like they are in the same physical space with consistent lighting source and color temperature.
    2. **Expression**: Match facial expressions to the context (e.g., Happy for 'Best Friends', Romantic for 'Couple').
    3. **Physics**: Realistic shadows, contact points (if hugging/holding hands), and depth of field.
    
    ${inputs.autoFix ? `*** AUTO-FIX ENHANCEMENTS (ACTIVE) ***
    - Remove background noise/grain.
    - Sharpen facial details.
    - Balance exposure if one photo is darker than the other.
    - Correct any lens distortion.` : ""}

    *** NEGATIVE CONSTRAINTS ***
    Never replace the face. Never blend identities. Never hallucinate new features. 
    The final output must look like a real photograph of these exact two people standing together.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: "Person A Reference:" },
          { inlineData: { data: optA.data, mimeType: optA.mimeType } },
          { text: "Person B Reference:" },
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

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    
    // Use Higher Resolution Optimizer for BOTH Source and Mask to ensure alignment
    // If we optimize one but not the other, the coordinate systems mismatch.
    const [optImg, optMask] = await Promise.all([
        optimizeImageForEditing(base64ImageData, mimeType),
        optimizeImageForEditing(maskBase64, "image/png")
    ]);

    const prompt = `You are an advanced AI Photo Editor using Gemini 3 Pro.
    
    TASK: MAGIC ERASER / INPAINTING.
    
    INPUTS:
    1. Source Image.
    2. Mask Image (Black & White).
    
    **STRICT MASK DEFINITION:**
    - **WHITE AREA** (Pixel value 255) = **THE OBJECT TO REMOVE**.
    - **BLACK AREA** (Pixel value 0) = **THE REFERENCE BACKGROUND (KEEP)**.
    
    **INSTRUCTIONS:**
    1. **IDENTIFY**: Look at the WHITE area in the Mask. Find the corresponding object in the Source Image.
    2. **DELETE**: Completely erase everything inside the White Mask area.
    3. **SYNTHESIZE**: Fill the erased hole by analyzing the patterns, lighting, and textures of the surrounding BLACK area.
       - If the background is a wall, extend the wall.
       - If it's a floor, continue the floor texture.
       - If it's complex, hallucinate a plausible background that fits seamlessly.
    4. **BLEND**: The edges must be invisible. No blurry patches. No artifacts.
    
    **NEGATIVE CONSTRAINTS:**
    - Do NOT just blur the object. REMOVE IT.
    - Do NOT leave a ghost or silhouette.
    - Do NOT alter the Black (Safe) area.
    
    Output ONLY the final clean image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: optImg.data, mimeType: optImg.mimeType } },
                { text: "MASK LAYER (White=Remove, Black=Keep):" },
                { inlineData: { data: optMask.data, mimeType: "image/png" } },
                { text: prompt } 
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};
