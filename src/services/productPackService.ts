
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";

export const generateProductPackPlan = async (
  productImages: string[],
  productName: string,
  productDescription: string,
  brandDetails: { logo?: string; colors: string[]; fonts: string[] },
  competitorUrl: string,
  inspirationImages: string[]
): Promise<any> => {
  const ai = getAiClient();
  
  // Construct a smarter prompt for Gemini 3 Pro
  const prompt = `Act as a Senior Brand Strategist & Marketing Director.
  
  TASK: Generate a comprehensive, high-conversion marketing asset pack for the product: "${productName}".
  
  PRODUCT CONTEXT:
  - Description: ${productDescription}
  - Brand Palette: ${brandDetails.colors.join(', ')}
  - Competitor Analysis Target: ${competitorUrl} (Simulate analysis of this competitor type)

  OBJECTIVE:
  Create a detailed production plan for visual and textual content that will outperform competitors on social media and e-commerce platforms.

  Output STRICT JSON with the following structure:
  1. imageGenerationPrompts: Detailed, artistic prompts for an AI image generator (like Gemini 3 Image). Keys: 'heroShot', 'lifestyle1', 'lifestyle2', 'creative'.
  2. videoGenerationPrompts: Prompts for AI Video generation (like Veo). Keys: 'video360Spin', 'videoCinemagraph'.
  3. textAssets: SEO-optimized text. Keys: 'seoTitle' (Amazon style), 'captions' (array of 3 distinct styles), 'keywords' (10 high-volume tags).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgraded
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                imageGenerationPrompts: {
                    type: Type.OBJECT,
                    properties: {
                        heroShot: { type: Type.STRING },
                        lifestyle1: { type: Type.STRING },
                        lifestyle2: { type: Type.STRING },
                        creative: { type: Type.STRING },
                    },
                    required: ['heroShot', 'lifestyle1', 'lifestyle2', 'creative']
                },
                videoGenerationPrompts: {
                    type: Type.OBJECT,
                    properties: {
                        video360Spin: { type: Type.STRING },
                        videoCinemagraph: { type: Type.STRING },
                    },
                    required: ['video360Spin', 'videoCinemagraph']
                },
                textAssets: {
                    type: Type.OBJECT,
                    properties: {
                        seoTitle: { type: Type.STRING },
                        captions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } } } },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['seoTitle', 'captions', 'keywords']
                }
            },
            required: ['imageGenerationPrompts', 'videoGenerationPrompts', 'textAssets']
        }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No plan generated.");
  return JSON.parse(text);
};
