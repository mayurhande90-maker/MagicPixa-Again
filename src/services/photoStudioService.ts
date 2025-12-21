import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to custom width (default 1280px for HD generation)
const optimizeImage = async (base64: string, mimeType: string, width: number = 1280): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

/**
 * Helper to generate brand-aware context block for prompts.
 */
const getBrandDNA = (brand?: BrandKit | null) => {
    if (!brand) return "";
    return `
    *** BRAND DNA (STRICT ADHERENCE) ***
    - **Identity**: This is a production for '${brand.companyName || brand.name}'.
    - **Industry**: ${brand.industry || 'General'}.
    - **Visual Tone**: ${brand.toneOfVoice || 'Professional'}.
    - **Target Audience**: ${brand.targetAudience || 'General Consumers'}.
    - **Color Palette**: Primary=${brand.colors.primary}, Secondary=${brand.colors.secondary}, Accent=${brand.colors.accent}. Use these as accent colors or in environment styling.
    - **Typography Style**: ${brand.fonts.heading}.
    - **Safety Constraints (AVOID)**: ${brand.negativePrompts || 'None'}.
    `;
};

/**
 * PHASE 1: FORENSIC PHYSICS AUDIT
 */
const performPhysicsAudit = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `You are a Commercial Photography Director. Analyze this image to match its physics for realistic rendering.
    1. LIGHTING: Direction and quality.
    2. MATERIAL: Surface texture and reflectivity.
    3. OPTICS: Camera angle and depth.
    Output a concise technical blueprint paragraph.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-lite-latest',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Standard studio lighting, eye-level perspective.";
    } catch (e) {
        return "Standard studio lighting, eye-level perspective.";
    }
};

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Imagine you are a professional product photographer. Suggest 4 creative scenes to place this product in. 
        
        **RULES**:
        - Use SIMPLE, NATURAL ENGLISH. 
        - It should feel like a human wrote it, not an AI.
        - Avoid technical buzzwords like "photorealistic", "8k", "cinematic", or "hyper-detailed".
        - Add a few specific, realistic details (e.g., "A cozy wooden table with a cup of coffee nearby").
        - Keep each suggestion between 6-12 words for a clean UI.
        
        Return ONLY a JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', 
            contents: {
                parts: [
                    { inlineData: { data: data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("No text");
        return JSON.parse(jsonText);
    } catch (e) {
        return [
            "On a clean marble counter with soft morning sunlight",
            "On a rustic wooden table with a small green plant",
            "Floating over calm water with gentle ripples underneath",
            "On a simple concrete stand in a bright, modern room"
        ];
    }
}

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<{ display: string; prompt: string }[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Analyze this product. Generate 4 detailed scenarios where a person is naturally using or holding this product.
        
        **RULES**:
        - Write in natural, descriptive English (like a photography brief).
        - Each scenario must be 2-3 sentences long with rich details about the person's clothes, their expression, and the specific setting.
        - Ensure the interaction with the product feels authentic and high-end.
        
        Format: JSON Array of objects { "display": "Short Label", "prompt": "Detailed Scene Description" }.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            display: { type: Type.STRING },
                            prompt: { type: Type.STRING }
                        },
                        required: ["display", "prompt"]
                    }
                }
            }
        });
        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response");
        return JSON.parse(jsonText);
    } catch (e) {
        return [
            { display: "Office Lifestyle", prompt: "A professional woman in a sharp navy blazer is sitting at a clean glass desk, naturally reaching for the product while looking at her laptop. The office background is bright and airy with large windows and a few green plants for a modern touch." },
            { display: "Morning Routine", prompt: "A young man in a comfortable grey linen shirt holds the product with both hands near a sun-drenched window. He has a relaxed, happy expression as the morning light creates soft shadows across the warm wooden kitchen counter." },
            { display: "Urban Adventure", prompt: "A stylish individual wearing a casual beige trench coat is carrying the product through a bustling city plaza during the golden hour. The background shows blurred city lights and modern architecture, creating a high-energy lifestyle vibe." },
            { display: "Home Comfort", prompt: "Someone is enjoying a quiet moment on a plush cream sofa, with the product resting naturally in their lap. They are wearing a soft knit sweater, and the room is filled with warm, cozy evening light from a nearby floor lamp." }
        ];
    }
}

/**
 * THE CORE GENERATION ENGINE
 */
export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);
    const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
    const brandContext = getBrandDNA(brand);

    const prompt = `You are Pixa Studio Pro. Generate a photorealistic 4K image maintaining the IDENTICAL shape and labels of the product.
    
    BLUEPRINT: ${technicalBlueprint}
    ${brandContext}
    TARGET SCENE: "${styleInstructions}"
    
    STRICT RULES:
    1. DO NOT warp or change the product or its text.
    2. Match the environment lighting to the product's existing highlights.
    3. Ensure realistic contact shadows on surfaces.
    4. Maintain natural textures (skin pores, fabric weaves).
    
    OUTPUT: A high-resolution image file.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: prompt },
        ],
      },
      config: { 
          responseModalities: [Modality.IMAGE],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Generation failed.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const generateModelShot = async (
    base64ImageData: string,
    mimeType: string,
    inputs: {
        modelType: string;
        region?: string;
        skinTone?: string;
        bodyType?: string;
        composition?: string; 
        framing?: string; 
        freeformPrompt?: string;
    },
    brand?: BrandKit | null
  ): Promise<string> => {
    const ai = getAiClient();
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);
      const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
      const brandContext = getBrandDNA(brand);

      let userSelectionPart = inputs.freeformPrompt ? `SCENE: "${inputs.freeformPrompt}".` : `Model: ${inputs.modelType}, ${inputs.region}, ${inputs.skinTone}, ${inputs.bodyType}. Composition: ${inputs.composition}. Framing: ${inputs.framing}.`;

      let prompt = `You are Pixa Model Studio. Generate a 4K photo of a human holding or interacting with the product from the source image.
  
  BLUEPRINT: ${technicalBlueprint}
  ${brandContext}
  PARAMETERS: ${userSelectionPart}
  
  STRICT RULES:
  1. Product scale and appearance must be 100% accurate.
  2. Fingers must look natural. No extra digits.
  3. Skin must have real texture (pores, hair). No plastic looks.
  4. Match environment lighting to the product perfectly.
  
  OUTPUT: High-end commercial photograph.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { inlineData: { data: data, mimeType: optimizedMime } },
            { text: prompt },
          ],
        },
        config: { 
            responseModalities: [Modality.IMAGE],
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ] 
        },
      });
  
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
      if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
      throw new Error("Failed to generate model shot.");
    } catch (error) {
      console.error("Error generating model shot:", error);
      throw error;
    }
  };