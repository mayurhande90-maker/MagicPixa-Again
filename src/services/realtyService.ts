
import { Modality, GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Optimize images to 1024px to manage token limits
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export interface RealtyInputs {
    propertyImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    targetAudience: 'luxury' | 'investor' | 'family';
    sellingPoints: string[];
    texts: {
        projectName: string;
        configuration: string; // e.g., "3 BHK"
        contact: string;
    };
}

interface CreativeStrategy {
    headline: string;
    visualStyle: string;
    colorPalette: string;
    layoutPlan: string;
    typographicHierarchy: string;
}

/**
 * PHASE 1: DEEP ANALYSIS & TREND RESEARCH
 * Acts as the CMO (Chief Marketing Officer).
 */
const performTrendResearch = async (
    ai: any, 
    base64: string, 
    mimeType: string,
    inputs: RealtyInputs
): Promise<CreativeStrategy> => {
    const audienceMap = {
        'luxury': 'High-Net-Worth Individuals (HNWI), looking for status, exclusivity, and privacy.',
        'investor': 'Real Estate Investors, looking for ROI, rental yield, and appreciation.',
        'family': 'Families, looking for safety, community, schools, and lifestyle.'
    };

    const prompt = `You are a World-Class Real Estate CMO & Creative Director.
    
    *** INPUT DATA ***
    - **Property Image**: (Attached) - Perform a Visual Audit (Lighting, Space, Key Features).
    - **Project Name**: "${inputs.texts.projectName}"
    - **Configuration**: "${inputs.texts.configuration}"
    - **Selling Points**: ${inputs.sellingPoints.join(', ')}
    - **Target Audience**: ${audienceMap[inputs.targetAudience]}
    
    *** TASK 1: VISUAL AUDIT ***
    Analyze the uploaded photo. Identify its strongest visual asset (e.g., "The view", "The floor-to-ceiling windows", "The spacious layout").
    
    *** TASK 2: TREND RESEARCH (Google Search) ***
    Use Google Search to find "Real Estate Marketing Trends 2025" specifically for [${inputs.targetAudience}] audiences.
    - What headlines are trending? (e.g., "Live Above" vs "Best Deal").
    - What color palettes signify this market segment now?
    
    *** TASK 3: CREATIVE STRATEGY ***
    Based on the Audit + Trends, generate a "Design Blueprint":
    1. **Headline**: Write a killer, 2-5 word hook. Do NOT use generic "For Sale". Make it emotional or urgent based on audience.
    2. **Visual Style**: Define the relighting mood (e.g., "Golden Hour glow", "Moody Blue Hour", "Bright Airy Daylight").
    3. **Layout**: Where should text go to respect the image's negative space?
    
    OUTPUT JSON:
    {
        "headline": "The short, punchy headline",
        "visualStyle": "Detailed instructions for lighting and mood...",
        "colorPalette": "Hex codes or color names (e.g. Navy & Gold)",
        "layoutPlan": "Instructions on text placement relative to the image...",
        "typographicHierarchy": "Instructions on font weights..."
    }`;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        headline: { type: Type.STRING },
                        visualStyle: { type: Type.STRING },
                        colorPalette: { type: Type.STRING },
                        layoutPlan: { type: Type.STRING },
                        typographicHierarchy: { type: Type.STRING }
                    },
                    required: ["headline", "visualStyle", "layoutPlan"]
                }
            }
        }));

        const jsonText = response.text || "{}";
        return JSON.parse(jsonText);
    } catch (e) {
        console.warn("Trend research failed, falling back to heuristics.", e);
        // Fallback Strategy
        const headlines = {
            'luxury': 'Redefine Your Horizon',
            'investor': 'High Yield Opportunity',
            'family': 'Where Life Happens'
        };
        return {
            headline: headlines[inputs.targetAudience],
            visualStyle: "Professional Golden Hour photography, warm and inviting.",
            colorPalette: "Modern Neutral & Gold",
            layoutPlan: "Text in negative space, clear footer.",
            typographicHierarchy: "Bold Headline, clean sans-serif body."
        };
    }
};

/**
 * PHASE 2: THE VISUAL OUTPUT (Graphic Design)
 * Acts as the Senior Designer.
 */
export const generateRealtyAd = async (inputs: RealtyInputs): Promise<string> => {
    const ai = getAiClient();

    // 1. Optimize Assets
    const optProperty = await optimizeImage(inputs.propertyImage.base64, inputs.propertyImage.mimeType);
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType) : null;

    // 2. Perform Strategy (The "Brain")
    const strategy = await performTrendResearch(ai, optProperty.data, optProperty.mimeType, inputs);

    // 3. Execute Design (The "Hand")
    const parts: any[] = [];

    parts.push({ text: "SOURCE PROPERTY PHOTO:" });
    parts.push({ inlineData: { data: optProperty.data, mimeType: optProperty.mimeType } });

    if (optLogo) {
        parts.push({ text: "BRAND LOGO (Must be included):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    const designPrompt = `You are an Expert Real Estate Graphic Designer & Retoucher.
    
    *** STRATEGIC BLUEPRINT (EXECUTE STRICTLY) ***
    - **Headline**: "${strategy.headline}"
    - **Mood/Lighting**: ${strategy.visualStyle}
    - **Colors**: ${strategy.colorPalette}
    
    *** DESIGN EXECUTION RULES (The 3% Rule) ***
    1. **Relight the Image**: Apply the requested "Mood". Enhance contrast, boost dynamic range. Make it look like a magazine cover.
    2. **Smart Layout**: Analyze the image's "Negative Space" (sky, floor, or plain wall). Place the text THERE. Do not cover key architectural details.
    3. **Typography**: Render the text directly onto the image with professional kerning and tracking.
       - **H1 (Headline)**: Big, Bold, Elegant.
       - **H2 (Project Name)**: "${inputs.texts.projectName}".
       - **Details**: "${inputs.texts.configuration}".
       - **Tags**: Show 2-3 key selling points: "${inputs.sellingPoints.slice(0, 3).join(' • ')}".
    4. **Footer**: Create a clean, high-contrast strip (or floating element) at the bottom for the contact info:
       - "${inputs.texts.contact}"
    5. **Logo**: Place the provided logo in a corner (Top Right or Top Left) with sufficient padding.
    
    *** TARGET AUDIENCE: ${inputs.targetAudience.toUpperCase()} ***
    - IF Luxury: Minimalist, serif fonts, lots of breathing room.
    - IF Investor: Bold numbers, high contrast, urgent look.
    - IF Family: Warm tones, friendly rounded sans-serif fonts.
    
    OUTPUT: A single, high-resolution, fully designed advertisement image.`;

    parts.push({ text: designPrompt });

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: "1:1", imageSize: "1K" } // Standard social media square
        },
    }));

    const finalImageBase64 = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data)?.inlineData?.data;
    if (!finalImageBase64) throw new Error("Ad generation failed.");

    return finalImageBase64;
};
