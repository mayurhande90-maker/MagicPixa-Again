import { Type, Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
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

export interface AdStrategy {
    type: string;
    visualPrompt: string;
    reasoning: string;
}

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
            model: 'gemini-3-pro-preview',
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

        const text = response.text;
        if (!text) return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
        return JSON.parse(text);
    } catch (e) {
        console.error("Color extraction failed:", e);
        return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
    }
};

/**
 * Analyzes the product and audience to generate 4 distinct ad strategies.
 * INTEGRATED LOGIC: "The 3% Rule" - Design in Advertising.
 */
export const analyzeAdStrategy = async (
    base64ImageData: string,
    mimeType: string,
    productName: string,
    targetAudience: string
): Promise<AdStrategy[]> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `You are an Elite Performance Marketing Strategist trained on the "3% Design Rule".

    INPUTS:
    - Product Image (attached).
    - Product Name: "${productName}".
    - Target Audience: "${targetAudience}".

    **THE 3% DESIGN FRAMEWORK (Apply these principles):**
    1. **The 2-Second Rule**: You must win attention instantly. The visual hierarchy must guide the eye immediately to the focal point.
    2. **Emotional Logic**: "People decide emotionally and justify logically." The visual hook must trigger a feeling (Trust, Urgency, Desire, or Status) before the brain reads the text.
    3. **Friction Removal**: Eliminate visual clutter. Use white space to reduce cognitive load. One page, one goal.
    4. **Color Psychology**: Match the palette to the emotion (e.g., Blue=Trust, Red=Urgency/Food, Black=Luxury).

    TASK:
    Develop 4 distinct visual strategies (Psychological Hooks) for an ad campaign based on the framework above.

    1. **Pain/Solution (Friction Removal)**: A clear visual showing the product solving a specific problem. High contrast, immediate clarity.
    2. **Social Proof (Authenticity)**: A lifestyle/UGC-style shot. Focus on human emotion and outcome. Use "Immersive Visuals" (Instagram style).
    3. **Luxury/Authority (Status)**: High-end studio shot. Generous white space, centered composition, dramatic lighting to signal premium value.
    4. **Urgency/Impact (The 2-Second Win)**: A bold, high-contrast, "ruthless simplicity" composition designed to stop the scroll. Uses the "Golden Ratio" or "Rule of Thirds" aggressively.

    OUTPUT JSON ARRAY:
    [
      {
        "type": "Pain/Solution",
        "visualPrompt": "Detailed image generation prompt describing the scene...",
        "reasoning": "Why this works (citing specific design principles like hierarchy, color, or cognitive load)..."
      },
      ... (for all 4 types)
    ]`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: prompt },
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING },
                        visualPrompt: { type: Type.STRING },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['type', 'visualPrompt', 'reasoning']
                }
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("Analysis failed to generate response.");
    return JSON.parse(text);
};

/**
 * Generates a single ad variant based on a specific strategy prompt.
 */
export const generateAdVariantImage = async (
    base64ImageData: string,
    mimeType: string,
    visualPrompt: string
): Promise<string> => {
    const ai = getAiClient();
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `Professional Product Photography Generation.

    SCENE DESCRIPTION: ${visualPrompt}

    **DESIGN EXECUTION RULES (The 3% Rule):**
    1. **Visual Hierarchy**: Make the eye obey. Sequence: Hero Image -> Value -> Action. Ensure the product is the undisputed focal point.
    2. **Cognitive Load**: Reduce visual noise. Keep the background complementary but simple to ensure the product pops.
    3. **Scale & Physics**: Ensure photorealistic scale. The product must feel grounded and real.
    4. **Identity**: Preserve the product's exact logo and text.

    Output only the image.`;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data, mimeType: optimizedMime } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: '1:1',
                imageSize: "1K"
            }
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate image.`);
};