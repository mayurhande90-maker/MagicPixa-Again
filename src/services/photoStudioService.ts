
import { Modality, Type } from "@google/genai";
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

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        // Optimized image for analysis
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

        const prompt = `Analyse the uploaded product image in depth. Identify the exact product type, its visible design, shape, packaging material, printed text, logos, colors, proportions, surface details, and category.
        
        Based on this analysis, generate exactly 4 short, conversational requests that a user would ask an AI editor. 
        These should sound natural and spoken, not like a robotic description.
        Example: "Put this on a sleek marble table with some soft sunlight."
        Example: "Show this floating in the air with fresh water splashes around it."
        Example: "Place it on a wooden desk next to a laptop and coffee."
        
        Return ONLY a JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
        if (!jsonText) return [
            "Put this on a clean white table with soft shadows",
            "Show this product on a luxury gold podium",
            "Place it in a nature setting with sunlight and leaves",
            "Make it look moody on a dark reflective surface"
        ];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product:", e);
        return [
            "Put this on a clean white table with soft shadows",
            "Show this product on a luxury gold podium",
            "Place it in a nature setting with sunlight and leaves",
            "Make it look moody on a dark reflective surface"
        ];
    }
}

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ display: string; prompt: string }[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

        const prompt = `Analyse the uploaded product in depth.
        Generate 4 distinct, creative, and highly specific model scenarios.
        
        **CRITICAL INSTRUCTION:** 
        You MUST vary the **SHOT TYPE** (Close-up, Wide, Mid) and **COMPOSITION** (Single Model vs Group) in your suggestions. 
        
        Return a JSON array of objects with two keys:
        1. "display": A natural, conversational question requesting this specific shot. It must sound like a human asking an editor. 
           Examples: 
           - "Can you create a wide group shot of friends wearing this?"
           - "Show me a close-up of a model holding this near their face."
           - "Generate a professional studio shot of a man using this product."
        2. "prompt": The detailed, descriptive prompt for the image generator. e.g., "Wide angle street style shot of a young woman..."
        
        Return ONLY the JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
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
        if (!jsonText) return [
            { display: "Can you create a close-up of a model holding this?", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Show me a wide shot of friends using this product outdoors.", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Generate a professional studio shot of a model.", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Can you show a tight detail shot in hand?", prompt: "Tight detail macro shot of hands holding the product to show texture" }
        ];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product for model prompts:", e);
        return [
            { display: "Can you create a close-up of a model holding this?", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Show me a wide shot of friends using this product outdoors.", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Generate a professional studio shot of a model.", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Can you show a tight detail shot in hand?", prompt: "Tight detail macro shot of hands holding the product to show texture" }
        ];
    }
}

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    // "World Class" System Prompt Construction
    let prompt = `TASK: Professional Product Photography Generation.
    
    INSTRUCTIONS:
    1. Analyse the uploaded product image in depth. Identify the exact product type, visible design, shape, packaging, logos, text, and colors.
    2. **CRITICAL RULE**: Do not modify or alter any part of the product itself. The product’s design, color accuracy, text, logo placement, and identity must remain EXACTLY as in the original image.
    3. Build a new photorealistic environment around the product based on this direction: "${styleInstructions}".
    
    *** PHYSICAL SCALE & REALISM PROTOCOL ***
    - You MUST analyze the real-world size of the product (e.g., a perfume bottle is 10cm, a sofa is 2m).
    - The environment MUST be scaled proportionally. Do NOT place a small product in a giant world or vice versa.
    - Example: A pair of headphones on a table should look like headphones, not the size of a car.
    - Use realistic camera focal lengths (e.g., 50mm, 85mm) suitable for the product size.

    EXECUTION GUIDELINES:
    - Use lighting, reflections, shadows, props, and composition that match the chosen direction.
    - Ensure no AI artifacts, distortions, incorrect text, or warped shapes on the product.
    - Make the final output look like a real commercial photo shoot, not AI-generated.
    - Use physically accurate shadows, depth, reflections, and color grading.
    - Maintain high-resolution, polished, social-media-ready quality.
    
    OUTPUT:
    Generate a final marketing-ready image that feels real, premium, and professionally photographed, while preserving the product exactly as it appears and in correct scale.`;
    
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
        composition?: string; // 'Single Model' or 'Group Shot'
        framing?: string; // 'Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'
        freeformPrompt?: string;
    }
  ): Promise<string> => {
    const ai = getAiClient();
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

      // Detailed Model Shot System Prompt with HYPER-REALISM and INTELLIGENT FRAMING
      let userSelectionPart = "";
      
      if (inputs.freeformPrompt) {
          userSelectionPart = `USER PROMPT: "${inputs.freeformPrompt}". 
          IGNORE specific dropdown selections if they conflict with this prompt. Follow this instruction for the model's appearance and interaction.`;
      } else {
          userSelectionPart = `
          Composition: ${inputs.composition || 'Single Model'}
          Model Type: ${inputs.modelType}
          Region: ${inputs.region}
          Skin Tone: ${inputs.skinTone}
          Body Type: ${inputs.bodyType}
          Shot Framing: ${inputs.framing || 'Mid Shot'}`;
      }

      let prompt = `System instruction for AI:
  Create a HYPER-REALISTIC marketing image that places the user’s uploaded product naturally with a model. 
  
  *** HYPER-REALISM & QUALITY PROTOCOL ***
  - OUTPUT STYLE: RAW Photography, 85mm Lens, f/1.8 Aperture.
  - SKIN TEXTURE: Must show pores, micro-details, natural imperfections, and subsurface scattering. NO PLASTIC SMOOTH SKIN.
  - LIGHTING: Cinematic studio lighting with realistic falloff. 
  - PHYSICS: The product must have weight. Fingers must press against it slightly. Clothing must drape with gravity.
  - FILM GRAIN: Add subtle film grain to match high-end editorial photography.

  *** STRICT USER FRAMING PRIORITY ***
  The user has explicitly selected a Framing Preference: "${inputs.framing}".
  YOU MUST FOLLOW THIS ABOVE ALL ELSE.
  - IF 'Tight Close Shot': MACRO view. Only Hands, Product, and maybe Lips/Chin. Product is HUGE in frame.
  - IF 'Close-Up Shot': Head and Shoulders portrait. Product near face or held high.
  - IF 'Mid Shot': Waist up. Standard catalog pose.
  - IF 'Wide Shot': Full body in environment. Product might be smaller relative to scene.
  
  *** FALLBACK PRODUCT ANALYSIS & FRAMING LOGIC (ONLY use if User Framing is NOT specified) ***
  1. **DETECT PRODUCT TYPE**:
     - IF 'FOOTWEAR/SHOES': Camera MUST be **LOW ANGLE** or focus on **LEGS/FEET**. Do NOT show full body if it makes the shoes tiny. The shoes are the HERO.
     - IF 'TROUSERS/JEANS/PANTS': Camera MUST capture **WAIST-DOWN** or **FULL BODY**. Ensure the pants are fully visible and fitting well. Do NOT crop the pants.
     - IF 'SMALL ITEM' (Jewelry, Jar, Bottle, Watch): Camera MUST be **MACRO / CLOSE-UP** or **PORTRAIT**. Focus on the Hand/Face interaction. Do NOT do a wide full-body shot where the product is invisible.
     - IF 'APPAREL TOP': Focus on **TORSO/UPPER BODY**.
  
  *** PHYSICAL SCALE PROTOCOL ***
  - **MANDATORY**: Estimate the real-world size of the uploaded object (e.g., a 5cm jar vs a 30cm bag).
  - Scale the object perfectly relative to the human model's hands/body.
  - A 50ml jar must fit in the palm. A tote bag must hang from the shoulder at the correct size.

  *** COMPOSITION LOGIC ***
  - Composition Mode: ${inputs.composition}
  - If 'Group Shot': Generate 2-3 models interacting socially with the product or in the background. Main model holds product.
  
  INPUTS:
  ${userSelectionPart}
  
  DETAILED GENERATION RULES:
  
  1. Analyze the product
  Understand the uploaded product: material, shape, label position, reflective surface, size, orientation.
  Decide the best possible interaction pose for the model (e.g., Beauty -> near face; Food -> held).
  
  2. Generate the model
  - If 'Young': Age 18-25. Fresh skin, youthful features.
  - If 'Adult': Age 30-45. Mature features, confident look.
  - If 'Senior': Age 60+. Visible wrinkles, realistic aging details (CRITICAL for realism).
  - If 'Kid': Age 6-10.
  - Match the specified Ethnicity/Region accurately.
  
  3. Place the product correctly
  Position and scale product naturally relative to the model’s selected body type.
  Maintain realistic contact (Fingers wrap around correctly, Clothing bends around wearable items).
  Add correct occlusion (Fingers partially covering product, Hair or clothing overlapping).
  
  4. Lighting, shadows, and realism
  Match product lighting to model lighting direction.
  Create contact shadows under the product.
  Ensure the model and product look like they were photographed together, not pasted.
  
  5. Background & styling
  Choose a background that fits the product category (e.g., Beauty -> soft studio, Fitness -> gym).
  Background must be slightly out of focus (Bokeh) to keep attention on the product/model.
  
  6. Label & detail preservation
  Keep all product text sharp and readable. Do not distort brand logo.
  
  FINAL AI PROMPT:
  “Generate a photorealistic RAW photograph using the uploaded product. Create a model matching: ${inputs.freeformPrompt || `${inputs.modelType}, ${inputs.region}, ${inputs.skinTone}, ${inputs.bodyType}`}. 
  STRICTLY FOLLOW USER FRAMING: ${inputs.framing}. If unspecified, use logic based on product type (Shoes=Low Angle, Pants=Waist Down, Small=Close Up). 
  COMPOSITION: ${inputs.composition}.
  Place the product naturally with correct PHYSICAL SCALE and interaction. Add realistic occlusion. Match lighting, shadows, and color temperature. Skin texture must be highly detailed and realistic. The result should look like a high-end billboard advertisement.”`;
      
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
      console.error("Error generating model shot:", error);
      throw error;
    }
  };
