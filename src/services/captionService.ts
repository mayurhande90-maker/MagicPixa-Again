import { getAiClient } from "./geminiClient";
import { BrandKit } from "../types";

export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string,
  language: string = 'English',
  lengthType: 'SEO Friendly' | 'Long Caption' | 'Short Caption' = 'SEO Friendly',
  brand?: BrandKit | null
): Promise<{ caption: string; hashtags: string }[]> => {
  const ai = getAiClient();
  try {
    let styleInstruction = "";
    if (lengthType === 'SEO Friendly') {
        styleInstruction = "GENERATION: Create captions with optimal length (1-2 sentences + hook) that encourage engagement.";
    } else if (lengthType === 'Long Caption') {
        styleInstruction = "GENERATION: Write storytelling captions (2-3 sentences). Use emotional hooks.";
    } else if (lengthType === 'Short Caption') {
        styleInstruction = "GENERATION: High impact one-liners (1 sentence max).";
    }

    const brandContext = brand ? `
    *** BRAND CONTEXT ***
    Brand: '${brand.companyName || brand.name}'
    Industry: ${brand.industry || 'General'}
    Tone: ${brand.toneOfVoice || 'Professional'}
    Audience: ${brand.targetAudience || 'General'}
    Instruction: Write specifically for this brand's personality and goals.
    ` : "";

    const prompt = `You are Pixa Caption Pro, a world-class social media strategist.
    ${brandContext}
    INPUT: One user photo. Language: ${language}. Length: ${lengthType}.
    
    YOUR PROCESS:
    1. Visual Analysis: Detect context in image.
    2. Copywriting: Write 6 distinct caption options following the brand tone.
    ${styleInstruction}
    
    RULES:
    - Write ONLY in ${language}.
    - Hashtags MUST be in ENGLISH. 8-12 hashtags per option.
    
    OUTPUT: Return ONLY a JSON array inside a markdown code block.
    \`\`\`json
    [
      { "caption": "Text...", "hashtags": "#tags" },
      ...
    ]
    \`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: prompt }] },
      config: { tools: [{ googleSearch: {} }] },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : text;
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
        throw new Error("Invalid array");
    } catch (e) {
        return [{ caption: "Captured perfectly.", hashtags: "#photography" }];
    }
  } catch (error) { throw error; }
};