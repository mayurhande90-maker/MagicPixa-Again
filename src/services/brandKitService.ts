
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
            model: 'gemini-2.5-flash', // Optimized for speed
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
