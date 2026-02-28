
import { Modality, GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, applyWatermark } from "../utils/imageUtils";

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
        location: string; // Added location
    };
}

interface CreativeStrategy {
    headline: string;
    visualStyle: string;
    colorPalette: string;
    layoutPlan: string;
    typographicHierarchy: string;
    rewrittenFeatures: string[]; // AI-rewritten selling points
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
    - **Location**: "${inputs.texts.location}"
    - **Configuration**: "${inputs.texts.configuration}"
    - **Raw Selling Points**: ${inputs.sellingPoints.join(', ')}
    - **Target Audience**: ${audienceMap[inputs.targetAudience]}
    
    *** TASK 1: VISUAL AUDIT ***
    Analyze the uploaded photo. Identify its strongest visual asset (e.g., "The view", "The floor-to-ceiling windows", "The spacious layout").
    
    *** TASK 2: TREND RESEARCH (Google Search) ***
    Use Google Search to find "Real Estate Marketing Trends 2025" specifically for [${inputs.targetAudience}] audiences.
    - What headlines are trending? (e.g., "Live Above" vs "Best Deal").
    - What color palettes signify this market segment now?
    
    *** TASK 3: COPYWRITING REFINEMENT (CRITICAL) ***
    Rewrite the user's "Raw Selling Points" into 3 highly professional, punchy feature bullets suitable for a luxury flyer.
    - Example: "Near Metro" -> "Seamless Connectivity".
    - Example: "Sea View" -> "Panoramic Ocean Vistas".
    - Example: "Big Rooms" -> "Expansive Living Spaces".
    
    *** TASK 4: CREATIVE STRATEGY ***
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
        "typographicHierarchy": "Instructions on font weights...",
        "rewrittenFeatures": ["Refined Feature 1", "Refined Feature 2", "Refined Feature 3"]
    }`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
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
                        typographicHierarchy: { type: Type.STRING },
                        rewrittenFeatures: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["headline", "visualStyle", "layoutPlan", "rewrittenFeatures"]
                }
            },
            featureName: 'Realty Trend Research'
        });

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
            typographicHierarchy: "Bold Headline, clean sans-serif body.",
            rewrittenFeatures: inputs.sellingPoints // Fallback to original
        };
    }
};

/**
 * PHASE 2: THE VISUAL OUTPUT (Graphic Design)
 * Acts as the Senior Designer.
 */
export const generateRealtyAd = async (inputs: RealtyInputs, userPlan?: string): Promise<string> => {
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
    
    *** DESIGN EXECUTION RULES (High-End Magazine Standard) ***
    1. **Base Enhancement**: Apply a "Luxury Architectural" color grade to the property photo. Boost dynamic range, warm up highlights, and sharpen details. It must look expensive.
    2. **Composition**: Apply the **Golden Ratio**. The image should be the hero.
    3. **Text Integration**:
       - Use a **Glassmorphism** effect (blurred translucent background) or a clean **Gradient Overlay** behind text areas to ensure 100% readability. Do NOT place text directly on busy backgrounds.
       - **Headline**: Elegant Serif or Modern Bold Sans-Serif. Large and commanding.
       - **Sub-Header**: "${inputs.texts.projectName} | ${inputs.texts.location}". Use a vertical separator.
       - **Features**: Display the rewritten features: "${strategy.rewrittenFeatures.slice(0, 3).join('  •  ')}". Use a clean, spaced-out layout (e.g. horizontal pill row or vertical stack with icons).
    4. **Footer Info**: Create a minimalist, high-contrast strip at the very bottom.
       - Left: "${inputs.texts.configuration}" (Bold).
       - Right: "${inputs.texts.contact}".
    5. **Logo**: Place the logo in the top-right or top-left corner with generous padding. Ensure it contrasts well against the sky/ceiling.
    
    *** TARGET AUDIENCE: ${inputs.targetAudience.toUpperCase()} ***
    - IF Luxury: Minimalist text, lots of negative space, elegant serif fonts.
    - IF Investor: Highlight the numbers/config boldy.
    - IF Family: Warm colors, friendly rounded fonts.
    
    OUTPUT: A single, high-resolution, fully designed advertisement image ready for print or social media.`;

    parts.push({ text: designPrompt });

    const response = await secureGenerateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { aspectRatio: "1:1", imageSize: "2K" } // Standard social media square
        },
        featureName: 'Realty Ad Generation'
    });

    const finalImageBase64 = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data)?.inlineData?.data;
    if (!finalImageBase64) throw new Error("Ad generation failed.");

    if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
        return await applyWatermark(finalImageBase64, 'image/png');
    }

    return finalImageBase64;
};
