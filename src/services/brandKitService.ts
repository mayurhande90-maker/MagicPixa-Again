import { Type, Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage, makeTransparent } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1280px (HD)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const extractBrandColors = async (base64: string, mimeType: string): Promise<{ primary: string; secondary: string; accent: string }> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64, mimeType);
        
        const prompt = `Analyze this logo image.
        Extract the 3 dominant colors in HEX format.
        
        Rules:
        1. Primary: The most dominant color (background or main text).
        2. Secondary: The second most used color.
        3. Accent: A contrasting or highlight color found in the logo. If only 2 colors exist, generate a complementary accent color that fits the brand vibe.
        
        Return ONLY a JSON object: { "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB" }`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Optimized for speed
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.STRING },
                        secondary: { type: Type.STRING },
                        accent: { type: Type.STRING }
                    },
                    required: ['primary', 'secondary', 'accent']
                }
            }
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        if (!text) return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
        
        return JSON.parse(text);
    } catch (e) {
        console.error("Color extraction failed:", e);
        return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
    }
};

/**
 * GENERATE FULL BRAND IDENTITY & COMPETITOR STRATEGY (UNIFIED)
 * Researches both the user brand and the rival to find the strategic gap.
 */
export const generateBrandIdentity = async (
    url: string, 
    description: string,
    competitorUrl?: string
): Promise<Partial<BrandKit>> => {
    const ai = getAiClient();
    
    const prompt = `You are a World-Class Brand Strategist & Identity Architect.
    
    USER BRAND:
    - URL: ${url}
    - Description: ${description}
    
    ${competitorUrl ? `PRIMARY COMPETITOR:
    - URL: ${competitorUrl}` : ''}
    
    TASK:
    Perform deep research (Google Search) on these brands to build a Unified Strategic Kit.
    
    1. **Identity Extraction**: Find brand colors, tone, and audience for the USER brand.
    2. **Strategic Audit**: If a competitor is provided, analyze their website for their Value Prop and Visual Style.
    3. **The Winning Angle**: Identify the "Visual Gap"—what the competitor is missing that our brand should own.
    4. **Forensic Constraints**: Define exactly what to AVOID in our AI generations to stay distinct from the rival.
    
    OUTPUT FORMAT:
    Return strictly a valid JSON object wrapped in a markdown code block.
    Example:
    \`\`\`json
    {
        "companyName": "User Brand Name",
        "website": "...",
        "toneOfVoice": "...",
        "targetAudience": "...",
        "negativePrompts": "avoidance tags for brand strategy...",
        "colors": { "primary": "#...", "secondary": "#...", "accent": "#..." },
        "fonts": { "heading": "Modern Sans", "body": "Clean Sans" },
        "competitor": {
            "website": "${competitorUrl || ''}",
            "analysis": {
                "theirStrategy": "Short summary of their vibe...",
                "winningAngle": "Strategic direction for us...",
                "visualGap": "The aesthetic opportunity...",
                "avoidTags": "specific visual tags to avoid...",
                "lastUpdated": "${new Date().toISOString()}"
            }
        }
    }
    \`\`\``;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro model for deep strategic research
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            }
        });

        let text = response.text || "{}";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            text = jsonMatch[1];
        }
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);
    } catch (e) {
        console.error("Auto-Brand Generation Failed:", e);
        return {
            companyName: "New Brand",
            website: url,
            toneOfVoice: "Professional",
            targetAudience: "General",
            negativePrompts: "Low quality, blur, distortion",
            colors: { primary: "#000000", secondary: "#FFFFFF", accent: "#3B82F6" },
            fonts: { heading: "Modern Sans", body: "Clean Sans" }
        };
    }
};

/**
 * COMPETITOR ANALYSIS STRATEGY (SCREENSHOT-BASED)
 * Specifically for analyzing visual ad creatives.
 */
export const analyzeCompetitorStrategy = async (
    competitorUrl: string,
    screenshotBase64s: { data: string; mimeType: string }[]
): Promise<{ theirStrategy: string; winningAngle: string; visualGap: string; avoidTags: string }> => {
    const ai = getAiClient();
    
    const parts: any[] = [];
    
    for (const img of screenshotBase64s) {
        parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
    }

    const prompt = `You are a World-Class Brand Strategist & Visual Director.
    
    *** INPUTS ***
    - **Competitor Website**: ${competitorUrl}
    - **Competitor Ad Creatives**: (Attached Images)
    
    *** TASK: COMPETITOR INTELLIGENCE REPORT ***
    1. **DEEP SEARCH**: Use Google Search to analyze the competitor's website (${competitorUrl}) for their Value Proposition, Target Audience, and Pricing Tier.
    2. **VISUAL AUDIT**: Analyze the attached ad screenshots. Identify their aesthetic (e.g., "Loud Neon", "Minimalist Beige", "Aggressive Sales").
    
    *** SYNTHESIS: THE WINNING STRATEGY ***
    Based on the audit, generate a strategy for MY brand to win.
    
    1. **Their Strategy**: Describe what they are doing.
    2. **Winning Angle**: Propose a counter-strategy.
    3. **Visual Gap**: What visual space is empty?
    4. **Negative Prompts (Avoid Tags)**: List specific visual elements seen in THEIR ads that we must AVOID.
    
    *** OUTPUT FORMAT ***
    Return strictly a valid JSON object inside a markdown code block.
    Example:
    \`\`\`json
    {
        "theirStrategy": "...",
        "winningAngle": "...",
        "visualGap": "...",
        "avoidTags": "..."
    }
    \`\`\``;

    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text || "{}";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            text = jsonMatch[1];
        }
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);
    } catch (e) {
        console.error("Competitor Analysis Failed:", e);
        return {
            theirStrategy: "Analysis failed.",
            winningAngle: "Focus on your unique value proposition.",
            visualGap: "Maintain a clean visual identity.",
            avoidTags: "low quality"
        };
    }
};

export const processLogoAsset = async (base64: string, mimeType: string): Promise<string> => {
    try {
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            const transparentBase64 = await makeTransparent(base64);
            return `data:image/png;base64,${transparentBase64}`;
        }
        return `data:${mimeType};base64,${base64}`;
    } catch (e) {
        console.error("Logo processing error", e);
        return `data:${mimeType};base64,${base64}`;
    }
};