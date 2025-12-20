
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
            model: 'gemini-3-flash-preview', // Optimized for speed and accuracy
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
 * GENERATE FULL BRAND IDENTITY (AUTO-PILOT)
 * Uses Google Search to infer brand details from a URL or Description.
 */
export const generateBrandIdentity = async (
    url: string, 
    description: string
): Promise<Partial<BrandKit>> => {
    const ai = getAiClient();
    
    const prompt = `You are a Brand Identity Expert AI.
    
    USER INPUT:
    - URL: ${url}
    - Description: ${description}
    
    TASK:
    Analyze the available information to generate a complete "Brand DNA Kit".
    Use Google Search to find the actual brand colors, style, website, and details if the URL is provided.
    
    1. **Colors**: Suggest a Primary, Secondary, and Accent color based on the industry/vibe.
    2. **Tone**: Define the Tone of Voice (e.g., "Professional", "Playful", "Luxury").
    3. **Audience**: Define the Target Audience (e.g. "Busy moms", "Tech Startups").
    4. **Negative**: What should visual AI AVOID? (e.g. "Cartoons", "Neon colors", "Clutter").
    5. **Fonts**: Suggest generic font styles (e.g. "Modern Sans", "Classic Serif").
    6. **Website**: Extract or infer the main website URL.
    
    OUTPUT FORMAT:
    Return strictly a valid JSON object wrapped in a markdown code block.
    Example:
    \`\`\`json
    {
        "companyName": "Inferred Name",
        "website": "https://...",
        "toneOfVoice": "...",
        "targetAudience": "...",
        "negativePrompts": "...",
        "colors": { "primary": "#...", "secondary": "#...", "accent": "#..." },
        "fonts": { "heading": "Modern Sans", "body": "Clean Sans" }
    }
    \`\`\``;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview', // Optimized for speed + search capability
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
 * COMPETITOR ANALYSIS STRATEGY
 * Uses Gemini 3 Pro with Vision + Google Search to analyze competitor strategy.
 */
export const analyzeCompetitorStrategy = async (
    competitorUrl: string,
    screenshotBase64s: { data: string; mimeType: string }[]
): Promise<{ theirStrategy: string; winningAngle: string; visualGap: string; avoidTags: string }> => {
    const ai = getAiClient();
    
    const parts: any[] = [];
    
    // Add Screenshots for Vision Analysis
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
    
    1. **Their Strategy**: Describe what they are doing. (e.g., "They focus on speed and low cost with loud red graphics.")
    2. **Winning Angle**: Propose a counter-strategy. (e.g., "We will focus on premium quality and calmness. Be the 'Apple' to their 'Android'.")
    3. **Visual Gap**: What visual space is empty? (e.g., "They lack human emotion. We will use authentic lifestyle photography.")
    4. **Negative Prompts (Avoid Tags)**: List specific visual elements seen in THEIR ads that we must AVOID to prevent looking like them. (e.g., "neon text, clutter, red background, cartoon characters").
    
    *** OUTPUT FORMAT ***
    Return strictly a valid JSON object inside a markdown code block.
    Example:
    \`\`\`json
    {
        "theirStrategy": "Short summary of their vibe...",
        "winningAngle": "Strategic direction for us...",
        "visualGap": "The aesthetic opportunity...",
        "avoidTags": "comma, separated, visual, tags, to, avoid"
    }
    \`\`\``;

    parts.push({ text: prompt });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro model required for complex reasoning + search + vision
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }] // Enabled for website analysis
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
            theirStrategy: "Analysis failed. Please ensure the URL is valid.",
            winningAngle: "Focus on your unique value proposition.",
            visualGap: "Maintain a clean and consistent visual identity.",
            avoidTags: "low quality, clutter"
        };
    }
};

/**
 * Process Logo Asset:
 * LOGIC UPDATE: We strictly DO NOT regenerate the logo using AI, as this alters the brand identity.
 * 1. If PNG: Return exactly as is.
 * 2. If JPEG (Background): Use client-side pixel manipulation to make white pixels transparent.
 */
export const processLogoAsset = async (base64: string, mimeType: string): Promise<string> => {
    try {
        // If it's a JPEG, assume it needs background removal (white -> transparent)
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            console.log("Processing JPEG logo: Removing white background client-side.");
            const transparentBase64 = await makeTransparent(base64);
            return `data:image/png;base64,${transparentBase64}`;
        }

        // For PNG, WEBP, etc., preserve EXACTLY what the user uploaded.
        // Do not resize unless absolutely necessary (fileToBase64 already handles max dimension safety).
        return `data:${mimeType};base64,${base64}`;

    } catch (e) {
        console.error("Logo processing error", e);
        // Fallback: Return original
        return `data:${mimeType};base64,${base64}`;
    }
};
