
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
    mode: 'creative' | 'reenact' | 'professional';
    relationship: string;
    // Creative Mode Params
    mood?: string;
    environment?: string;
    pose?: string;
    timeline?: string;
    universe?: string;
    // Reenact Mode Params
    referencePoseBase64?: string;
    referencePoseMimeType?: string;
    // Common
    faceStrength: number;
    clothingMode: 'Keep Original' | 'Match Vibe' | 'Professional Attire';
    locks: {
        age: boolean;
        hair: boolean;
        accessories: boolean;
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
    // Parallel optimization
    const promises = [
        optimizeImage(personABase64, personAMimeType),
        optimizeImage(personBBase64, personBMimeType)
    ];
    
    // Optimize reference pose only if needed
    if (inputs.mode === 'reenact' && inputs.referencePoseBase64 && inputs.referencePoseMimeType) {
        promises.push(optimizeImage(inputs.referencePoseBase64, inputs.referencePoseMimeType));
    }

    const results = await Promise.all(promises);
    const optA = results[0];
    const optB = results[1];
    const optPose = results.length > 2 ? results[2] : null;

    // --- PROMPT ENGINEERING ---
    let mainPrompt = `Generate a single combined photograph using Person A and Person B.`;
    
    // 1. MODE SPECIFIC INSTRUCTIONS
    if (inputs.mode === 'reenact') {
        mainPrompt += `
        *** REENACTMENT MODE (STRICT) ***
        - **TASK**: Recreate the scene from the "REFERENCE POSE" image exactly.
        - **POSE & COMPOSITION**: Copy the exact body positions, camera angle, distance, and physical interaction from the Reference Pose image.
        - **CASTING**: Replace the people in the Reference Pose with Person A and Person B.
        - **CONTEXT**: Keep the general vibe/setting of the reference image.
        `;
    } else if (inputs.mode === 'professional') {
        mainPrompt += `
        *** PROFESSIONAL DUO MODE ***
        - **TASK**: Create a high-end corporate/LinkedIn style duo portrait.
        - **ATTIRE**: Force High-Quality Business Formal (Suits, Blazers) regardless of input clothing.
        - **ENVIRONMENT**: Modern, clean, well-lit studio or blurred upscale office background.
        - **POSE**: Professional, confident standing pose. Side-by-side or slight overlap.
        - **LIGHTING**: Softbox studio lighting, perfectly balanced.
        `;
    } else {
        // CREATIVE MODE
        mainPrompt += `
        *** CREATIVE MODE ***
        - **Relationship**: ${inputs.relationship}
        - **Mood**: ${inputs.mood}
        - **Environment**: ${inputs.environment}
        - **Pose**: ${inputs.pose}
        
        ${inputs.timeline && inputs.timeline !== 'Present Day' ? `- **TIME TRAVEL ENGINE**: Render the entire scene (clothing, hair styling, film stock quality, background) to look authentically like the **${inputs.timeline}**.` : ''}
        
        ${inputs.universe && inputs.universe !== 'Photorealistic' ? `- **UNIVERSE ENGINE**: Render the output in the visual style of **${inputs.universe}**. Adjust texture, rendering style, and lighting to match this art style.` : '- **STYLE**: Hyper-realistic photography.'}
        `;
    }

    // 2. IDENTITY PRESERVATION (Global)
    mainPrompt += `
    *** STRICT IDENTITY PRESERVATION PROTOCOL (Priority: ${inputs.faceStrength}%) ***
    The output must strictly preserve the real identity of both people. 
    Do NOT change: Facial features, Face shape, Skin tone, Body type.
    
    *** FEATURE LOCKS ***
    ${inputs.locks.age ? "- **LOCK AGE**: Do NOT make them younger or older. Maintain current age." : ""}
    ${inputs.locks.hair ? "- **LOCK HAIR**: Maintain original hairstyle and hair color exactly (unless Time Travel/Universe overrides it)." : ""}
    ${inputs.locks.accessories ? "- **LOCK ACCESSORIES**: Keep glasses, facial hair/beards." : ""}
    
    *** CLOTHING LOGIC ***
    ${inputs.mode === 'professional' ? "- **CLOTHING**: FORCE BUSINESS ATTIRE." : (inputs.clothingMode === 'Keep Original' ? "- **CLOTHING**: Keep original outfits." : "- **CLOTHING**: Change outfits to match the Scene/Era/Vibe.")}
    
    ${inputs.autoFix ? `*** AUTO-FIX ***
    - Remove noise. Sharpen faces. Balance exposure. Correct distortions.` : ""}

    *** NEGATIVE CONSTRAINTS ***
    Never blend identities. Never hallucinate new facial features. 
    ${inputs.mode === 'professional' ? "No casual clothes. No messy backgrounds." : ""}
    `;

    // 3. CONSTRUCT PAYLOAD
    const parts: any[] = [
        { text: "Person A Reference:" },
        { inlineData: { data: optA.data, mimeType: optA.mimeType } },
        { text: "Person B Reference:" },
        { inlineData: { data: optB.data, mimeType: optB.mimeType } }
    ];

    if (optPose) {
        parts.push({ text: "REFERENCE POSE / COMPOSITION TARGET:" });
        parts.push({ inlineData: { data: optPose.data, mimeType: optPose.mimeType } });
    }

    parts.push({ text: mainPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
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
