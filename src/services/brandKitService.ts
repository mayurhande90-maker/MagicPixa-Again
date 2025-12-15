
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
 * 1. Takes an input image (JPEG/PNG).
 * 2. Uses Gemini to isolate the logo on a pure white background (cleaning up noise).
 * 3. Uses client-side logic to remove the white background, resulting in a transparent PNG.
 */
export const processLogoAsset = async (base64: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    try {
        // 1. Optimize input
        const { data, mimeType: optMime } = await optimizeImage(base64, mimeType);

        // 2. AI Refinement: Clean and Isolate on White
        const prompt = `Task: Logo Isolation.
        
        Input: An image containing a logo.
        Action: 
        1. Extract the main logo symbol/logotype. 
        2. Place it on a PURE WHITE background (Hex #FFFFFF).
        3. Ensure high contrast, sharp edges, and remove any background noise, shadows, or artifacts.
        4. If the logo is white, make it black so it is visible on white (we will invert later if needed, but black on white is standard for masking).
        
        Output: The cleaner logo image on a solid white background.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optMime } },
                    { text: prompt },
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (!imagePart?.inlineData?.data) {
            // Fallback: Just try to make original transparent
            console.warn("AI Logo processing failed, using original for transparency.");
            return `data:image/png;base64,${await makeTransparent(base64)}`;
        }

        // 3. Client-Side Transparency (Remove White)
        const processedBase64 = await makeTransparent(imagePart.inlineData.data);
        return `data:image/png;base64,${processedBase64}`;

    } catch (e) {
        console.error("Logo processing error", e);
        // Fallback to simple client-side transparency on original
        return `data:image/png;base64,${await makeTransparent(base64)}`;
    }
};
