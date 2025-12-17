
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit } from "../types";
import { resizeImage } from "../utils/imageUtils";

const optimizeImage = async (base64: string, mimeType: string, size: number = 1024): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, size, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        return { data: base64, mimeType };
    }
};

export interface PlanConfig {
    month: string;
    year: number;
    goal: string; 
    frequency: string;
    customContext?: string;
    country: string;
    mixType: 'Balanced' | 'Ads Only' | 'Lifestyle Only';
}

export interface CalendarPost {
    id: string;
    date: string;
    dayLabel: string;
    topic: string;
    postType: 'Ad' | 'Photo' | 'Greeting'; 
    headline?: string; 
    visualIdea: string;
    caption: string;
    hashtags: string;
    imagePrompt: string; 
    selectedProductId?: string; 
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * NEW: Extract structured plan from a CSV or PDF document using Gemini 2.5 Flash
 */
export const extractPlanFromDocument = async (
    brand: BrandKit,
    fileBase64: string,
    mimeType: string
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    const prompt = `You are a Content Data Architect. Extract the content schedule from the attached document.
    
    *** RULES ***
    1. Identify dates, topics, and captions.
    2. Map each post to one of the brand's products: [${brand.products?.map(p => p.name).join(', ') || 'General'}].
    3. Generate a technical "imagePrompt" for each post focusing on commercial-grade aesthetics.
    4. Format the output strictly as a JSON array of CalendarPost objects.
    
    JSON Schema:
    - date: "YYYY-MM-DD"
    - dayLabel: "Oct 1"
    - topic: string
    - postType: "Ad" | "Photo" | "Greeting"
    - headline: string (Max 5 words, for text-on-image)
    - visualIdea: string (description of the scene)
    - caption: string (social media caption)
    - hashtags: string (5-10 tags)
    - imagePrompt: technical prompt for AI image generator
    - selectedProductId: the ID of the product from the catalog.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: fileBase64, mimeType } },
                    { text: prompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        return plan.map((p, idx) => ({ ...p, id: `import_${Date.now()}_${idx}` }));
    } catch (e) {
        console.error("Document extraction failed", e);
        throw new Error("Failed to read the document. Ensure it contains a clear schedule.");
    }
};

/**
 * STEP 1: GENERATE STRATEGIC CONTENT PLAN
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    const productCatalog = brand.products?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || 'Generic Brand Items';
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const systemPrompt = `You are a World-Class Creative Director & Performance Marketer.
    
    *** BRAND IDENTITY (ABSOLUTE SOURCE OF TRUTH) ***
    - Company: ${brand.companyName}
    - Tone: ${brand.toneOfVoice}
    - Colors: ${brand.colors.primary}, ${brand.colors.accent}
    - Audience: ${brand.targetAudience}
    - CATALOG (USE ONLY THESE PRODUCTS): 
    ${productCatalog}
    
    *** CAMPAIGN CONTEXT ***
    - Goal: ${config.goal}
    - Mix: ${config.mixType}
    - Timeframe: ${config.month} ${config.year}
    - Target Region: ${config.country} (Integrate local festivals and cultural nuances).
    
    *** MANDATORY TASK ***
    Generate a full content calendar with EXACTLY ${postCount} posts.
    1. Evenly distribute the catalog products.
    2. "Ad" posts must have punchy headlines designed for 2-second scroll stop.
    3. "Greeting" posts must be relevant to ${config.country}'s specific holidays in ${config.month}.
    4. "Photo" posts should focus on aesthetic lifestyle usage.
    
    *** OUTPUT JSON ARRAY ***
    - date (YYYY-MM-DD)
    - dayLabel (e.g. "Oct 5")
    - topic
    - postType ("Ad", "Photo", "Greeting")
    - selectedProductId (ID from catalog)
    - headline (Max 5-6 words for text-on-image)
    - visualIdea (Strategic scene description)
    - caption (High-engagement social copy)
    - hashtags
    - imagePrompt (Hyper-detailed technical prompt for AI Image Gen)
    `;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: systemPrompt }] },
            config: {
                tools: [{ googleSearch: {} }], 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            dayLabel: { type: Type.STRING },
                            topic: { type: Type.STRING },
                            postType: { type: Type.STRING, enum: ["Ad", "Photo", "Greeting"] },
                            selectedProductId: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "postType", "selectedProductId", "visualIdea", "imagePrompt", "headline", "caption"]
                    }
                }
            }
        }));

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        // Safety check to ensure we match frequency count
        return plan.slice(0, postCount).map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
    } catch (e) {
        throw new Error("Strategic strategy generation failed.");
    }
};

/**
 * STEP 2: GENERATE DESIGNED CREATIVE
 */
export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: { data: string, mimeType: string } | null,
    productAsset: { data: string, mimeType: string } | null,
    moodBoardAssets: { data: string, mimeType: string }[] = []
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    if (productAsset) {
        parts.push({ text: "HERO PRODUCT (Preserve exactly):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "BRAND LOGO (Place with high contrast):" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "MOOD BOARD (Reference for textures, lighting, and grading):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    let designPrompt = `You are a World-Class Graphic Designer & Commercial Photographer.
    
    *** DESIGN BRIEF ***
    Brand: ${brand.companyName}.
    Vibe: ${brand.toneOfVoice}.
    Palette: ${brand.colors.primary}, ${brand.colors.accent}.
    Fonts: ${brand.fonts.heading}.
    
    *** TECHNICAL TASK ***
    Generate a photorealistic ${post.postType} creative for: "${post.topic}".
    
    *** COMPOSITION RULES ***
    1. **Visual Hierarchy**: Place the HERO PRODUCT as the absolute focal point. Use lighting to separate it from the background.
    2. **Mood Match**: Study the MOOD BOARD images. Copy the color grading, lighting temperature, and depth-of-field style exactly.
    3. **Typography**: If "${post.postType}" is an Ad or Greeting, you MUST render the text "${post.headline}" onto the image. Use a bold, modern, and perfectly legible layout. Ensure text doesn't overlap the product hero areas.
    4. **Commercial Realism**: The final result must look like a 4K RAW photograph. Use professional lens artifacts (f/1.8 bokeh, subtle grain).
    
    SCENE: ${post.visualIdea}.
    AI PROMPT: ${post.imagePrompt}.
    
    OUTPUT: A single 4:5 vertical commercial asset.`;

    parts.push({ text: designPrompt });

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: "4:5", imageSize: "1K" }
            },
        }));

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        return imagePart?.inlineData?.data || "";
    } catch (e) {
        console.error("Creative rendering failed", e);
        throw e;
    }
};
