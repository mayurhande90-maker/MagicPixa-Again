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
 * Detects the immutable properties of the input image to prevent hallucinations and lighting mismatches.
 */
const performPhysicsAudit = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `You are a Commercial Photography Director and VFX Supervisor performing a technical Forensic Audit.
    
    ANALYZE this product image with clinical precision to ensure 100% realistic compositing.
    
    1. **LIGHTING TOPOLOGY**: 
       - Direction: Where exactly is the primary light source? (e.g., "45-degree top-right").
       - Quality: Is it hard (direct sun) or soft (diffused softbox)? 
       - Reflections: Note any existing specular highlights or environment reflections on the object's surface.
    2. **MATERIAL PHYSICS**: 
       - Refractive index: Is it clear glass? 
       - Specularity: Is it polished chrome, matte plastic, or organic fabric?
       - Translucency: Does light pass through it?
    3. **CAMERA OPTICS**: 
       - Perspective: Estimate the focal length (e.g., "85mm compression" or "24mm wide angle").
       - Angle: Exact camera pitch (e.g., "15-degree low angle looking up").
    4. **DIMENSIONAL SCALE**: 
       - What is the estimated real-world height and volume?
    
    OUTPUT: A single "Technical Blueprint" paragraph. This is for an AI generator, so use technical photography terminology.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-lite-latest', // Fast, high-reasoning vision model
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
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Act as a Vogue Product Stylist. Analyze this product. ${brand ? `This is for '${brand.companyName}'.` : ''}
        
        Suggest 4 short, punchy, hyper-realistic photography concepts.
        
        **RULES**:
        - Concepts must be SHORT (3-7 words max) for a clean UI.
        - Focus on environment and lighting (e.g., "Minimal marble with window light").
        - Ensure variety: 1 Minimalist, 1 Lifestyle, 1 Luxury, 1 Seasonal.
        
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
        console.error("Error analyzing product:", e);
        return [
            "White marble with soft sunlight",
            "Floating on refractive water ripples",
            "Concrete podium with rim lighting",
            "Rustic wood with window shadows"
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

        const prompt = `Analyze this product. ${brand ? `This is for '${brand.companyName}' targeting '${brand.targetAudience}'.` : ''}
        Generate 4 detailed "Commercial Model Scenarios" where a human model is naturally interacting with this specific item.
        
        **RULES**:
        - Each scenario must be HIGHLY DETAILED (2-3 sentences).
        - Include specific art direction: camera lens (e.g. 85mm), model's expression, precise environment, and clothing style.
        
        Format: JSON Array of objects { "display": "Short Label", "prompt": "Detailed Scene Description" }.
        Example: { "display": "Morning Ritual", "prompt": "A cinematic close-up of a smiling young woman in a sun-drenched, modern minimalist kitchen. She holds the product naturally at eye level with a soft grip, wearing an organic linen robe. Shot with an 85mm prime lens for creamy background bokeh." }`;

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
            { display: "Professional Studio", prompt: "A sophisticated portrait of a professional model in a tailored charcoal blazer, holding the product with quiet confidence against a textured slate grey backdrop. Shot with a 100mm macro lens for sharp detail and professional studio lighting." },
            { display: "Urban Lifestyle", prompt: "A dynamic candid shot of a stylish man walking through a glass-walled city plaza at dusk. He carries the product naturally in one hand while checking his watch. The city lights create a beautiful out-of-focus bokeh background. Shot on 35mm film aesthetic." },
            { display: "Cozy Interior", prompt: "A warm, intimate shot of a model sitting on a plush cream sofa in a living room filled with plants. The product sits on a nearby oak coffee table while the model reaches for it with a relaxed, happy expression. Golden hour light filters through sheer curtains." },
            { display: "Nature/Greenery", prompt: "A fresh outdoor shot in a lush botanical garden. The model is wearing neutral earth tones and holds the product amidst soft ferns and dappled sunlight. Shot with a wide aperture to emphasize the organic textures and natural atmosphere." }
        ];
    }
}

/**
 * THE CORE GENERATION ENGINE
 * Uses the Physics Audit + Brand DNA to enforce realism and consistency.
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

    // 1. Technical Analysis (The "Brain")
    const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
    
    // 2. Brand Logic
    const brandContext = getBrandDNA(brand);

    const prompt = `You are Pixa Studio Pro, an industry-leading Product Photography & CGI Render Engine.
    
    *** PRODUCTION MANDATE ***
    Your goal is to generate a photorealistic, 4K commercial image that maintains the IDENTICAL shape and texture of the provided product while placing it in a new environment.
    
    *** INPUT TECHNICAL BLUEPRINT (MUST ADHERE STRICTLY) ***
    ${technicalBlueprint}
    
    ${brandContext}
    
    *** USER DIRECTION ***
    Target Scene: "${styleInstructions}"
    
    *** EXECUTION PROTOCOL (CRITICAL) ***
    1. **Identity Lock**: The product's shape, labels, and text MUST be 100% accurate. DO NOT warp, stretch, or hallucinate different text on the product.
    2. **Physics Sync**: Match the new environment's lighting to the "LIGHTING TOPOLOGY" found in the audit. If the product has a reflection of a studio light, ensure the new background doesn't have a mismatched sun.
    3. **Grounding**: Ensure the product has realistic "Contact Shadows" and "Ambient Occlusion" where it touches surfaces. It must not look like it is floating.
    4. **Texture Integrity**: Maintain the material physics of the product (refraction, specular highlights).
    
    *** NEGATIVE CONSTRAINTS (DO NOT DO) ***
    - NO extra limbs or fingers if models are present.
    - NO blurry edges or AI-generated "glow" around the product.
    - NO plastic-smooth skin; maintain natural skin pores and vellus hair.
    - NO warping of brand logos or product packaging.
    
    OUTPUT: A single photorealistic 4K image file.`;
    
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
    throw new Error("Generation failed to produce an image. This might be due to safety filters or a temporary server error.");
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

      // Perform Technical Audit
      const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
      
      // Brand Logic
      const brandContext = getBrandDNA(brand);

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

      let prompt = `You are Pixa Model Studio - The world's most advanced human-product interaction renderer.
  
  *** PRODUCTION BLUEPRINT ***
  ${technicalBlueprint}

  ${brandContext}

  *** GOAL ***
  Generate a photo of a human model holding or interacting with the product from the source image.
  
  *** PARAMETERS ***
  ${userSelectionPart}
  
  *** EXECUTION RULES (STRICT) ***
  1. **SCALE INTEGRITY**: The product must remain its original size relative to the model. Do NOT shrink it.
  2. **HAND INTERACTION**: If the model is holding the product, ensure the fingers look 100% natural. NO extra fingers. The product must be grasped realistically.
  3. **SKIN TEXTURE**: The model must have realistic skin texture (pores, subtle imperfections). NO plastic AI-smooth look.
  4. **LIGHTING UNIFORMITY**: The light hitting the model must match the light hitting the product (refer to the Technical Blueprint).
  5. **CLOTHING**: The model's wardrobe must reflect the brand's "${brand?.toneOfVoice || 'Professional'}" tone.
  
  OUTPUT: A cinematic, high-end commercial photograph in 4K resolution.`;
      
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