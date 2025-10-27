import { GoogleGenAI, Modality } from "@google/genai";

// Ensure the API key is available in the environment variables
// FIX: Added check for string "undefined" which can be injected by Vite.
if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  try {
    const prompt = `Analyze the product in this image. Generate a hyper-realistic marketing-ready photo. Place the product in an appealing, professional setting with appropriate lighting and background that complements the product. CRITICAL: The product itself, including its packaging, logo, and any text, must remain completely unchanged and preserved with high fidelity.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    // Extract the first image part from the response candidates
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }

    throw new Error("No image data was found in the API response. The prompt may have been blocked.");

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        // Provide a more user-friendly error message
        if (error.message.includes('SAFETY')) {
             throw new Error("Image generation failed due to safety settings. Please try a different prompt or image.");
        }
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};
