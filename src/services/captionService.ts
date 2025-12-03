
import { getAiClient } from "./geminiClient";

export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string,
  language: string = 'English',
  lengthType: 'SEO Friendly' | 'Long Caption' | 'Short Caption' = 'SEO Friendly'
): Promise<{ caption: string; hashtags: string }[]> => {
  const ai = getAiClient();
  try {
    // Prompt Engineering with Logic for Deep Research and Length Constraints
    let styleInstruction = "";
    if (lengthType === 'SEO Friendly') {
        styleInstruction = "RESEARCH GOAL: Use Google Search to find current algorithm trends, trending audio concepts, and high-ranking keywords for this subject. GENERATION: Create captions with optimal length (usually 1-2 sentences + hook) that encourage saves and shares. Focus on keywords for organic boost.";
    } else if (lengthType === 'Long Caption') {
        styleInstruction = "RESEARCH GOAL: Find engaging storytelling angles for this subject. GENERATION: Write detailed, micro-blog style captions (2-3 sentences). Use emotional hooks or value-add tips. CONSTRAINT: Do NOT make it a wall of text; keep it readable and under 4 sentences.";
    } else if (lengthType === 'Short Caption') {
        styleInstruction = "RESEARCH GOAL: Find witty, aesthetic, or punchy one-liners trending now. GENERATION: High impact, instant readability. CONSTRAINT: Do NOT make it single words; use a complete thought or clever phrase (1 sentence max).";
    }

    const prompt = `You are Pixa Caption Pro, a world-class social media strategist for MagicPixa, powered by Gemini 3 Pro.

INPUT:
- One user photo (image input).
- Language: ${language}.
- Style/Length: ${lengthType}.

YOUR PROCESS:
1. **DEEP VISUAL ANALYSIS**: Use your advanced vision capabilities to detect subtle details, emotions, lighting, and context in the image.
2. **DEEP RESEARCH**: Use Google Search to find real-time trending caption styles, viral hooks, and best-performing keywords for this specific visual topic (e.g., 'trending sunset captions 2025', 'viral coffee aesthetics').
3. **GENERATE**: Based on your research and the "${lengthType}" rule below, generate exactly 6 distinct caption options.

${styleInstruction}

GENERAL RULES:
- Write ONLY in ${language}.
- Natural, human-like tone. No AI cliches ("Delve into", "Testament to").
- Emojis: Minimal and relevant.

HASHTAG RULES:
- **CRITICAL:** Hashtags MUST ALWAYS be in ENGLISH, even if the caption language is ${language}.
- 8–15 organic keywords per caption based on your research.
- No spam tags.

OUTPUT FORMAT:
You MUST return the result strictly as a JSON array inside a markdown code block.
Example:
\`\`\`json
[
  { "caption": "Caption text...", "hashtags": "#tag1 #tag2" },
  ...
]
\`\`\`
Do not add any other text outside the code block.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded for superior multimodal analysis
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        // We enable Google Search for "deep research"
        tools: [{ googleSearch: {} }], 
        // Note: responseSchema is NOT supported when using tools in some contexts, 
        // so we rely on the strong system prompt for JSON formatting.
      },
    });

    const text = response.text || "";
    
    // Extract JSON from code block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : text;
    
    // Clean up any potential markdown residue if regex failed
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
        throw new Error("Parsed result is not an array");
    } catch (e) {
        console.error("JSON Parse Error in CaptionAI:", e, "Raw Text:", text);
        // Fallback if parsing fails
        return [
            { caption: "Captured this moment perfectly.", hashtags: "#moments #photography" },
            { caption: "Vibes speak louder than words.", hashtags: "#vibes #aesthetic" },
            { caption: "Simple joys in life.", hashtags: "#lifestyle #joy" },
            { caption: "Creating magic everyday.", hashtags: "#magicpixa #create" },
            { caption: "Through the lens.", hashtags: "#perspective #photo" },
            { caption: "Just sharing this.", hashtags: "#share #daily" }
        ];
    }

  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};
