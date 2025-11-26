
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
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

        const prompt = `Analyse the uploaded product image. 
        Based on the "3% Design Rule" (Small tweaks driving results), generate 4 conversational requests that focus on **Visual Hierarchy** and **Context**.
        
        The prompts should place the product in a setting that:
        1. Reduces cognitive load (clean backgrounds).
        2. Establishes a clear focal point.
        3. Uses color psychology relevant to the object.
        
        Example: "Put this on a clean white table with soft shadows to emphasize the shape."
        Example: "Place it on a wooden desk to add warmth and trust."
        
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

        const prompt = `Analyse the product. Generate 4 model scenarios based on **Visual Storytelling**.
        
        The scenarios should use "Single Frame Storytelling": Subject + Tension/Context + Resolution (Product).
        
        1. **Tight Close Shot (Intimacy/Texture)**: Focus on the tactile experience.
        2. **Mid Shot (Trust/Identity)**: Focus on the model's expression connecting with the product.
        3. **Wide/Lifestyle (Context)**: Show the product fitting into a real life (Social Proof).
        
        Return a JSON array of objects with "display" (natural question) and "prompt" (detailed technical description).`;

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

    // "World Class" System Prompt with Design Logic Injection
    let prompt = `TASK: Professional Product Photography Generation.
    
    INSTRUCTIONS:
    1. **Identity Lock**: Preserve product design, logo, text, and colors EXACTLY.
    2. **Environment**: Build a scene based on: "${styleInstructions}".
    
    *** VISUAL HIERARCHY & COGNITIVE LOAD ***
    - **Rule of Focal Point**: The product is the single most important element. Ensure the background leads the eye TO the product, not away from it.
    - **Reduce Friction**: Avoid clutter. Use negative space effectively (The 3% Rule).
    - **Lighting**: Use lighting to create depth and separation between the product and the background.
    
    *** PHYSICAL SCALE & REALISM ***
    - Analyze real-world size (e.g., perfume = 10cm, sofa = 2m). Scale environment proportionally.
    - Use realistic camera focal lengths (e.g., 50mm, 85mm).
    - Generate physically accurate shadows and reflections.

    OUTPUT:
    A polished, marketing-ready image that feels like a high-end commercial shoot.`;
    
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
        composition?: string; 
        framing?: string; 
        freeformPrompt?: string;
    }
  ): Promise<string> => {
    const ai = getAiClient();
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

      let userSelectionPart = "";
      if (inputs.freeformPrompt) {
          userSelectionPart = `USER PROMPT: "${inputs.freeformPrompt}".`;
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
  Create a HYPER-REALISTIC marketing image.
  
  *** VISUAL STORYTELLING (Design Principle) ***
  - **Single Frame Story**: The image must imply a moment of tension or resolution (e.g., the joy of using the product, the confidence it gives).
  - **Emotion**: The model's expression must match the product category (e.g., Calm for skincare, Dynamic for sport).
  - **Eye Contact**: If applicable, use eye contact to engage the viewer (Psychological trigger).

  *** HYPER-REALISM & QUALITY PROTOCOL ***
  - OUTPUT STYLE: RAW Photography, 85mm Lens, f/1.8 Aperture.
  - SKIN TEXTURE: Must show pores, micro-details, imperfections. NO PLASTIC SKIN.
  - PHYSICS: The product must have weight. Clothing must drape with gravity.

  *** FRAMING & SCALE ***
  - Follow User Framing: "${inputs.framing}".
  - **Scale**: Estimate real-world size of the object. A 50ml jar fits in a palm. A tote bag hangs from a shoulder.
  
  INPUTS:
  ${userSelectionPart}
  
  FINAL OUTPUT:
  Generate a photorealistic RAW photograph. Place the product naturally with correct PHYSICAL SCALE and interaction. Add realistic occlusion. The result should look like a high-end billboard advertisement designed to win attention in 2 seconds.`;
      
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
