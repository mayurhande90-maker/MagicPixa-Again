
import { Modality, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to custom width (default 1280px for HD generation, lower for analysis)
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

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        // Optimization: Use 512px for analysis to speed up upload & processing
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

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
            model: 'gemini-2.5-flash', // Switched to Flash for instant analysis
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
        // Optimization: Use 512px for analysis
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);

        const prompt = `Analyze the uploaded product image.
        Generate 4 distinct, high-quality "Model Photography Scenarios" perfectly suited for this specific item.
        
        **Goal**: Create commercial-grade prompts that a professional photographer would use to sell this product.
        
        **Scenarios to Generate**:
        1. **Studio Hero**: A clean, professional shot focusing on the product and model's face/interaction.
        2. **Lifestyle Context**: The product being used in its natural environment (e.g. gym for water bottle, cafe for laptop, vanity for skincare).
        3. **Close-Up Interaction**: Focus on hands holding or using the item to show scale and texture.
        4. **Creative Editorial**: A stylized, mood-driven shot (e.g. golden hour, urban street, luxury minimalist).

        **JSON Output Format**:
        [
          { 
            "display": "Short Label (Max 4 words). e.g. 'Cozy Living Room'", 
            "prompt": "Detailed image generation prompt: [Subject Action], [Environment], [Lighting], [Camera Angle]. e.g. 'A stylish woman drinking coffee in a blurred cozy living room, morning sunlight, authentic smile, 50mm lens'" 
          }
        ]
        
        Return ONLY the JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Switched to Flash for instant analysis
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
        if (!jsonText) throw new Error("Empty response");
        
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product for model prompts:", e);
        return [
            { display: "Professional Studio Portrait", prompt: "A professional studio shot of a model posing confidently with the product, softbox lighting, clean neutral background, sharp focus, 4k commercial photography." },
            { display: "Lifestyle In-Context", prompt: "A candid lifestyle shot of a model using the product in a bright, modern environment suited to the item, natural sunlight, authentic emotion, shallow depth of field." },
            { display: "Close-Up Hand Detail", prompt: "A detailed macro shot of hands gently holding the product to show scale and texture, soft bokeh background, elegant composition." },
            { display: "Outdoor Golden Hour", prompt: "A warm outdoor shot during golden hour, model interacting with the product in a scenic location, cinematic backlighting, dreamy atmosphere." }
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
    // Keep 1280px for Generation to ensure High Quality
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1280);

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
      // Keep 1280px for Generation to ensure High Quality
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1280);

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
