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

        const prompt = `Act as a professional photographer. Suggest 4 creative scenes for this product.
        
        **RULES**:
        - Use SIMPLE, HUMAN-LIKE ENGLISH. 
        - Start every suggestion with "I will...". 
        - Keep suggestions SHORT (8-12 words max).
        - Make it sound like you are actively setting up the shot.
        - Avoid technical buzzwords like "photorealistic", "raytracing", "8k".
        - Focus on a clean, simple environment.
        
        Example: "I will take a closeup shot of the product on a white marble counter."
        
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
            "I will take a closeup shot of the product on a white marble counter.",
            "I will place it on a rustic wooden table with soft sunlight.",
            "I will capture it floating over calm water with gentle ripples.",
            "I will set it up on a concrete stand in a modern room."
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

        const prompt = `Analyze this product. Imagine you are a professional photographer planning a commercial shoot with a human model.
        
        **RULES**:
        - Use SIMPLE, NATURAL, HUMAN ENGLISH.
        - Start every "prompt" with "I will...".
        - Describe the scene as if you are setting up the actual camera shot.
        - Describe the person naturally (e.g., "a white skin lady", "a man with a beard", "a smiling girl").
        - Describe what they are wearing, their expression, and exactly what they are doing with the product.
        - Mention a specific, simple setting (e.g., "modern kitchen", "sunny balcony", "cozy sofa").
        - Keep it descriptive but avoid AI jargon.
        
        Format: JSON Array of objects { "display": "Short Label", "prompt": "Detailed Scene Description starting with I will..." }.
        Example: { "display": "Morning Prep", "prompt": "I will take a closeup shot of the white skin lady holding the product in her modern kitchen setup while she makes breakfast." }`;

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
            { display: "Kitchen Prep", prompt: "I will take a closeup shot of the white skin lady holding the product in her modern kitchen setup." },
            { display: "Morning Vibes", prompt: "I will capture a shot of a smiling young woman in a cozy knit sweater holding the product near a big window." },
            { display: "Office Setup", prompt: "I will take a photo of a professional man in a sharp navy blazer naturally reaching for the product on a clean white desk." },
            { display: "Outdoor Shot", prompt: "I will shoot a stylish person wearing a casual linen shirt carrying the product while walking through a bright city park." }
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