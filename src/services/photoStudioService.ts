
import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

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
 * PHASE 1: FORENSIC PHYSICS AUDIT
 * Detects the immutable properties of the input image to prevent hallucinations and lighting mismatches.
 */
const performPhysicsAudit = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `You are a Commercial Photography Director performing a Technical Audit.
    
    ANALYZE this product image to ensure perfect compositing later.
    
    1. **LIGHTING MAP**: Where is the primary light coming from? (e.g., "Soft light from Top-Left", "Hard sunlight from Right"). What is the shadow hardness?
    2. **MATERIAL PHYSICS**: What is the surface made of? (e.g., "Clear Glass (refractive)", "Matte Plastic (diffuse)", "Polished Metal (specular)").
    3. **PERSPECTIVE GRID**: What is the camera angle? (e.g., "Straight-on Eye Level", "High Angle/45-degree down", "Low Angle").
    4. **SCALE**: Estimate the real-world size (e.g., "Small cosmetic bottle", "Large furniture").
    
    OUTPUT: A concise "Technical Blueprint" paragraph describing these 4 attributes.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Reasoning model
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Standard studio lighting, eye-level perspective.";
    } catch (e) {
        console.warn("Physics audit failed, using defaults.", e);
        return "Standard studio lighting, eye-level perspective.";
    }
};

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        // Optimization: Use 512px for analysis
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Analyze the uploaded product. 
        Based on its form, function, and aesthetic, suggest 4 high-converting photography concepts.
        
        **Constraint**: The prompts must be SCENE DESCRIPTIONS, not generic ideas.
        - GOOD: "Place it on a textured concrete surface with dappled sunlight through palm leaves."
        - BAD: "Make it look cool."
        
        Return ONLY a JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Improved to Pro for better creative direction
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
        console.error("Error analyzing product:", e);
        return [
            "On a clean white marble counter with morning sunlight",
            "Floating on a calm water surface with ripples",
            "On a rustic wooden table with lifestyle props",
            "In a sleek minimalist studio with pastel geometry"
        ];
    }
}

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ display: string; prompt: string }[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Analyze this product. 
        Generate 4 "Model Photography Scenarios" where a human would naturally use this item.
        
        Format: JSON Array of objects { "display": "Short Label", "prompt": "Detailed Scene Description" }.
        Example Display: "Lifestyle Cafe".
        Example Prompt: "Medium shot of a smiling woman holding the coffee cup in a sunny cafe, blurred background."`;

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
            { display: "Professional Studio", prompt: "Professional studio portrait of a model holding the product, neutral background, softbox lighting." },
            { display: "Urban Lifestyle", prompt: "Street style shot of a model walking with the product, city background, natural daylight." },
            { display: "Cozy Home", prompt: "Relaxed shot of a model using the product on a sofa, warm indoor lighting." },
            { display: "Nature/Outdoor", prompt: "Fresh outdoor shot of a model with the product in a park, sunlight and greenery." }
        ];
    }
}

/**
 * THE CORE GENERATION ENGINE (UPGRADED)
 * Uses the Physics Audit to enforce realism.
 */
export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    // 1. Optimize for Generation (High Fidelity)
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);

    // 2. PRE-FLIGHT: Analyze Physics (Lighting/Material/Angle)
    // This prevents the "floating object" or "wrong angle" hallucination.
    const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);

    // 3. GENERATION: The "Reality Engine" Prompt
    const prompt = `You are Pixa Studio Pro, a Physics-Compliant Product Photography AI.
    
    *** INPUT TECHNICAL BLUEPRINT (MUST RESPECT) ***
    ${technicalBlueprint}
    
    *** USER CREATIVE DIRECTION ***
    Target Scene: "${styleInstructions}"
    
    *** EXECUTION PROTOCOL: ZERO HALLUCINATIONS ***
    1. **Identity Lock (CRITICAL)**: You must preserve the product's pixels EXACTLY where possible. Do not warp the text, logo, or shape.
    2. **Physics Compliance**:
       - **Lighting**: You MUST match the scene's lighting to the "LIGHTING MAP" from the blueprint. If the original product has a shadow on the left, the new scene MUST imply a light source from the right.
       - **Perspective**: You MUST generate the background at the "PERSPECTIVE GRID" angle defined in the blueprint. Do not put a top-down background on a front-facing product.
       - **Material Interaction**: If the blueprint says "Reflective", generate realistic reflections of the new environment on the product surface.
    
    3. **Compositing Rules**:
       - **Contact Shadows**: Generate a realistic Ambient Occlusion shadow where the object touches the ground. It must not look like a sticker.
       - **Depth of Field**: Keep the product razor sharp (f/8). Apply subtle bokeh (f/2.8) to the background to separate the subject.
    
    OUTPUT: A photorealistic, 4K commercial product shot.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', // The most powerful model for pixel accuracy
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
    throw new Error("No image generated.");
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
    }
  ): Promise<string> => {
    const ai = getAiClient();
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);

      // Perform Audit for Scale and Material
      const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);

      let userSelectionPart = "";
      if (inputs.freeformPrompt) {
          userSelectionPart = `USER SCENE: "${inputs.freeformPrompt}".`;
      } else {
          userSelectionPart = `
          Model Archetype: ${inputs.modelType}
          Ethnicity/Region: ${inputs.region}
          Skin Tone: ${inputs.skinTone}
          Body Build: ${inputs.bodyType}
          Composition: ${inputs.composition || 'Single Model'}
          Framing: ${inputs.framing || 'Mid Shot'}`;
      }

      let prompt = `You are Pixa Model Studio - A Hyper-Realistic Human Generation Engine.
  
  *** PRODUCT TECHNICAL SPECS ***
  ${technicalBlueprint}

  *** GOAL ***
  Generate a photo of a human model holding, wearing, or interacting with this product.
  
  *** PARAMETERS ***
  ${userSelectionPart}
  
  *** EXECUTION RULES ***
  1. **Physical Scale (CRITICAL)**: Based on the "Technical Blueprint", estimate the size of the product. 
     - If it's a ring, it fits on a finger.
     - If it's a bottle, it fits in a hand.
     - If it's furniture, the model sits on/near it.
     - **DO NOT HALLUCINATE SIZE.** A perfume bottle must not be the size of a watermelon.
  
  2. **Interaction Physics**:
     - **Grip**: Hands must hold the object naturally. No floating hands. Fingers must wrap around the volume correctly.
     - **Weight**: If the object is heavy (e.g. dumbbell), show muscle tension.
  
  3. **Photorealism**:
     - Skin Texture: Must be high-fidelity (pores, vellus hair, imperfections). No plastic skin.
     - Lighting: Match the product's existing lighting to the new scene.
  
  OUTPUT: A cinematic, high-end lifestyle photograph.`;
      
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
      throw new Error("No image generated.");
    } catch (error) {
      console.error("Error generating model shot:", error);
      throw error;
    }
  };
