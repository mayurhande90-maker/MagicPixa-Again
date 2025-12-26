
import { getAiClient } from "./geminiClient";
import { BrandKit } from "../types";

/**
 * Pixa Caption Pro - Advanced Social Media Copywriting Engine
 * 
 * This service implements the "Human-Touch Protocol" to generate captions that 
 * sound like real humans, optimized for viral reach and SEO.
 */
export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string,
  language: string = 'English',
  lengthType: 'SEO Friendly' | 'Long Caption' | 'Short Caption' = 'SEO Friendly',
  brand?: BrandKit | null
): Promise<{ caption: string; hashtags: string }[]> => {
  const ai = getAiClient();
  try {
    let lengthConstraint = "";
    if (lengthType === 'SEO Friendly') {
        lengthConstraint = "Structure: High-impact hook (first 5 words) + context + engagement trigger.";
    } else if (lengthType === 'Long Caption') {
        lengthConstraint = "Structure: Storytelling format. Start with a relatable thought/vulnerability and end with a value-add.";
    } else if (lengthType === 'Short Caption') {
        lengthConstraint = "Structure: Single punchy line or witty observation.";
    }

    const brandContext = brand ? `
    *** BRAND DNA ***
    - Entity: '${brand.companyName || brand.name}'
    - Voice: ${brand.toneOfVoice || 'Authentic'}
    - Vibe: Align with the '${brand.industry}' aesthetic.
    ` : "";

    const prompt = `You are Pixa, a Viral Content Creator and Social Media Strategist.
    
    *** THE HUMAN-TOUCH PROTOCOL (STRICT MANDATE) ***
    1. **NO AI-SPEAK**: Absolutely FORBIDDEN to use words like "Delve", "Unleash", "Embark", "Tapestry", "Elevate", "Discover", "Captivating", or "In the realm of".
    2. **DAILY LANGUAGE**: Use words people actually say to friends. Use natural contractions (can't, it's, don't).
    3. **FIRST-LINE HOOKS**: The first 5 words MUST stop the scroll. No generic "Look at this..."
    4. **ENGAGEMENT TRIGGERS**: Every caption must end with a natural question or a nudge to save/comment that doesn't feel forced.
    5. **HUMOR/RELATABILITY**: Include one option that is a funny "shower thought" or a relatable "confession" about the subject.

    *** STEP 1: REAL-TIME TREND RESEARCH (Use Google Search) ***
    - Research what's currently viral on Instagram and TikTok for this image subject.
    - Identify trending "Audio Vibes" or aesthetic keywords used by top creators in ${language} right now.
    - Find the highest velocity SEO keywords for this specific subject to ensure organic reach.

    *** STEP 2: GENERATION ***
    ${brandContext}
    Target Language: ${language}
    Format Goal: ${lengthType}
    ${lengthConstraint}

    YOUR GOAL: Write 6 distinct, high-reach caption options. 
    Make them feel human, slightly opinionated, and highly shareable.

    *** OUTPUT ARCHITECTURE ***
    - Hashtags: 12-15 highly specific, high-reach hashtags in English only. 
    - Formatting: Return strictly a JSON array of objects.

    \`\`\`json
    [
      { "caption": "The actual human-sounding text...", "hashtags": "#specific #viral #tags" },
      ...
    ]
    \`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Upgraded to Pro for complex cultural reasoning
      contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: prompt }] },
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.8, // Slightly higher for more "human" creative variance
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : text;
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
        throw new Error("Invalid output format from AI.");
    } catch (e) {
        console.error("Caption parsing error:", e);
        return [{ 
            caption: "Captured this moment perfectly. ✨ What do you think of this vibe?", 
            hashtags: "#photography #vibe #trending #contentcreator" 
        }];
    }
  } catch (error) { 
    console.error("Caption service error:", error);
    throw error; 
  }
};
