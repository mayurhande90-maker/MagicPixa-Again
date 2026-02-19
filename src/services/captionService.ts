
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { BrandKit } from "../types";

/**
 * Pixa Caption Pro - Advanced Social Media Copywriting Engine
 * 
 * This service implements the "Human-Touch Protocol" and "Tone-Specific Logic"
 * to generate captions that sound like real humans, optimized for viral reach.
 */
export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string,
  language: string = 'English',
  tone: string = 'Friendly',
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

    const toneInstructions: Record<string, string> = {
        'Friendly': "Tone: Relatable, warm, and conversational. Like a friend chatting in a group chat.",
        'Funny': "Tone: Witty, sarcastic, or pun-heavy. Look for a 'shower thought' or a funny observation in the photo.",
        'Chill': "Tone: Minimalist and aesthetic. Use lowercase where appropriate. Very relaxed 'vibe' focus.",
        'Emotional/Heartfelt': "Tone: Deep, vulnerable, and sincere. Focus on the 'feeling' or memory of the moment.",
        'Hype/Exciting': "Tone: High-energy, bold, and enthusiastic. Lots of 'main character' energy.",
        'Professional': "Tone: Polished, authoritative, and clean. Suitable for LinkedIn or a curated business portfolio.",
        'Marketing': `Tone: Persuasive, strategic, and benefit-driven. 
                      **MARKETING MANDATE**: 
                      1. Deeply analyze the PRODUCT or SERVICE in the photo. 
                      2. Use Google Search to find current consumer pain points or trends related to this item.
                      3. Write copy that emphasizes VALUE and DESIRE. 
                      4. Every caption must have a high-converting Call-to-Action (CTA).`
    };

    const prompt = `You are Pixa, a Viral Content Creator and Social Media Growth Specialist.
    
    *** THE DEEP ANALYSIS MANDATE ***
    1. **VISUAL EMPATHY**: Look closely at the photo. Identify the subject, the mood, and specific details (e.g., textures, facial expressions, background elements).
    2. **SPECIFICITY**: Mention specific details you see to prove this isn't a generic AI caption.
    
    *** TARGET VIBE ***
    ${toneInstructions[tone] || toneInstructions['Friendly']}

    *** THE HUMAN-TOUCH PROTOCOL (STRICT) ***
    1. **NO AI-SPEAK**: Absolutely FORBIDDEN to use: "Delve", "Unleash", "Embark", "Tapestry", "Elevate", "Discover", "Captivating", "In the realm of", "Masterpiece", or "Testament".
    2. **SIMPLE LANGUAGE**: Use words we use in day-to-day life. Use natural contractions (can't, it's, don't). 
    3. **AUTHENTICITY**: Don't be too perfect. Real people use slang and talk about their feelings simply.
    4. **ENGAGEMENT**: Unless it's a 'Short' caption, end with a natural question or a nudge to save/share.

    *** STEP 1: TREND & SEO RESEARCH (Use Google Search) ***
    - Research current viral Instagram/TikTok hooks for this specific photo subject and the selected tone "${tone}".
    - Find the highest velocity hashtags in ${language} for 2025 reach.

    *** STEP 2: GENERATION ***
    ${brandContext}
    Target Language: ${language}
    Format Goal: ${lengthType}
    ${lengthConstraint}

    YOUR GOAL: Write 6 distinct, high-reach caption options. 

    *** OUTPUT ARCHITECTURE ***
    - Hashtags: 12-15 specific, trending hashtags in English only. 
    - Formatting: Return strictly a JSON array of objects.

    \`\`\`json
    [
      { "caption": "The actual human-sounding text...", "hashtags": "#specific #viral #tags" },
      ...
    ]
    \`\`\``;

    const response = await secureGenerateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: base64ImageData, mimeType: mimeType } }, { text: prompt }] },
      config: { 
        tools: [{ googleSearch: {} }],
        temperature: 0.9, 
      },
      featureName: 'Caption Generation'
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
            caption: "This photo is giving all the right vibes. ✨ What do you think?", 
            hashtags: "#vibes #trending #moments" 
        }];
    }
  } catch (error) { 
    console.error("Caption service error:", error);
    throw error; 
  }
};
