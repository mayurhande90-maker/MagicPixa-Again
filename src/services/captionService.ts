
import { getAiClient } from "./geminiClient";
import { BrandKit } from "../types";

/**
 * Pixa Caption Pro - Advanced Social Media Copywriting Engine
 * 
 * This service implements the "Human-Touch Protocol" and "First-Person Narrative"
 * to generate captions that sound like real humans, optimized for viral reach.
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
        lengthConstraint = "Structure: High-impact hook (first 5 words) + authentic commentary + engagement question.";
    } else if (lengthType === 'Long Caption') {
        lengthConstraint = "Structure: Storytelling format. Start with a relatable thought or a 'behind the scenes' confession.";
    } else if (lengthType === 'Short Caption') {
        lengthConstraint = "Structure: Single punchy line, witty observation, or a simple mood statement.";
    }

    const brandContext = brand ? `
    *** BRAND DNA ***
    - Entity: '${brand.companyName || brand.name}'
    - Voice: ${brand.toneOfVoice || 'Authentic'}
    - Vibe: Align with the '${brand.industry}' aesthetic.
    ` : "";

    const prompt = `You are Pixa, a Viral Content Creator and authentic Social Media Storyteller.
    
    *** THE DEEP ANALYSIS MANDATE ***
    1. **VISUAL EMPATHY**: Look closely at the photo. What is the subject doing? If it's a kid in a mirror, talk about the dress, the 'pose' they are trying to nail, or the confidence in the reflection. 
    2. **SPECIFICITY**: Mention specific details you see (e.g., "this blue floral print," "the messy hair vibe," "this lighting is doing everything").
    3. **FIRST-PERSON POV**: Write at least 3 of the options in the FIRST PERSON (using "I," "me," "my"). Act as if you are the person in the photo or a very close friend posting for them.

    *** THE HUMAN-TOUCH PROTOCOL (STRICT) ***
    1. **NO AI-SPEAK**: Absolutely FORBIDDEN to use: "Delve", "Unleash", "Embark", "Tapestry", "Elevate", "Discover", "Captivating", "In the realm of", "Masterpiece", or "Testament".
    2. **SIMPLE LANGUAGE**: Use words we use in day-to-day life. Use natural contractions (can't, it's, don't). Use lowercase for a 'chill' aesthetic where appropriate.
    3. **AUTHENTICITY**: Don't be too perfect. Real people make typos (occasionally), use slang, and talk about their feelings/insecurities/excitement simply.
    4. **ENGAGEMENT**: End with a natural question that people actually want to answer (e.g., "Rate the fit 1-10?" or "Is it just me or is mirror lighting better than sun?").

    *** STEP 1: TREND & SEO RESEARCH (Use Google Search) ***
    - Research current viral Instagram/TikTok hooks for this specific photo subject (e.g., "Mirror selfie hooks", "Outfit check captions").
    - Find trending SEO keywords and hashtags in ${language} for 2025 reach.

    *** STEP 2: GENERATION ***
    ${brandContext}
    Target Language: ${language}
    Format Goal: ${lengthType}
    ${lengthConstraint}

    YOUR GOAL: Write 6 distinct, high-reach caption options. 
    At least 2 should be 'POV' style (Point of View).

    *** OUTPUT ARCHITECTURE ***
    - Hashtags: 12-15 specific, trending hashtags in English only. 
    - Formatting: Return strictly a JSON array of objects.

    \`\`\`json
    [
      { "caption": "The actual human-sounding text...", "hashtags": "#specific #viral #tags" },
      ...
    ]
    \`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: prompt }] },
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.9, // Higher temperature for more creative, human-like variance
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
            caption: "Feeling this look today. ✨ What do you think?", 
            hashtags: "#ootd #vibes #trending" 
        }];
    }
  } catch (error) { 
    console.error("Caption service error:", error);
    throw error; 
  }
};
