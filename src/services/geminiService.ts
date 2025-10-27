
import { GoogleGenAI, Modality } from "@google/genai";

// Ensure the API key is available in the environment variables
// FIX: Added check for string "undefined" which can be injected by Vite.
if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  aspectRatio: '1:1' | '16:9' | '9:16'
): Promise<string> => {
  try {
    const prompt = `Edit the provided product image. Preserve the product exactly as it is. Replace the background with a professional and appealing setting that complements the product. Adjust the lighting to be professional. The final image should be hyper-realistic, marketing-ready, and have a ${aspectRatio} aspect ratio.`;
    
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

    // Check for prompt feedback which indicates a block
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation was blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    // Extract the first image part from the response candidates
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    
    // If no image is found and it wasn't blocked, it's a different issue.
    // Log the full response for better debugging.
    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        // Re-throw a clear, user-facing error message.
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};