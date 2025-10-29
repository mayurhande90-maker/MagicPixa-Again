import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Initialize the AI client only if the API key is available.
// This prevents the app from crashing on start if the key is not set.
if (process.env.VITE_API_KEY && process.env.VITE_API_KEY !== 'undefined') {
  ai = new GoogleGenAI({ apiKey: process.env.VITE_API_KEY });
} else {
  console.warn("VITE_API_KEY environment variable not set. The app will load, but Gemini API calls will fail.");
}

export const analyzeImageContent = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  if (!ai) {
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

  try {
    const prompt = "Analyze the product in this image. Instead of a literal description, provide a single, creative sentence that captures its essence, mood, or a key selling point. Think like a marketer writing a tagline.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    });

    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image analysis blocked due to: ${response.promptFeedback.blockReason}.`);
    }

    return response.text;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image analysis service.");
  }
};

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
): Promise<string> => {
  // Now, check for the AI client at the time of the function call.
  if (!ai) {
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }
  
  try {
    const prompt = `Edit this product photo. The product itself, including packaging, logos, and text, MUST be preserved perfectly. Generate a new, hyper-realistic, marketing-ready image by replacing the background with a professional, appealing setting that complements the product. Ensure lighting is professional.`;
    
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
        throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    // Extract the first image part from the response candidates
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    
    // If no image is found and it wasn't blocked, it's a different issue.
    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};