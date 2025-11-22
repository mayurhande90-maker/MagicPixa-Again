
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
  const prompt = `Generate a comprehensive marketing pack for product: "${productName}".
  Description: ${productDescription}.
  Brand Colors: ${brandDetails.colors.join(', ')}.
  Competitor: ${competitorUrl}.

  Output JSON with:
  1. imageGenerationPrompts: Object with keys 'heroShot', 'lifestyle1', 'lifestyle2', 'creative'. Values are detailed image generation prompts.
  2. videoGenerationPrompts: Object with keys 'video360Spin', 'videoCinemagraph'. Values are video generation prompts.
  3. textAssets: Object with keys 'seoTitle', 'captions' (array of {text: string}), 'keywords' (array of strings).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
