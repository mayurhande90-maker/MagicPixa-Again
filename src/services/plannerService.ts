
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
 * Enhanced with catalog rotation logic.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    // Explicitly listing products for the AI
    const productCatalog = brand.products?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || 'Generic Brand Items';
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const systemPrompt = `You are a World-Class Creative Director & Multi-Product Strategist.
    
    *** BRAND IDENTITY ***
    - Company: ${brand.companyName}
    - Tone: ${brand.toneOfVoice}
    - Audience: ${brand.targetAudience}
    
    *** THE PRODUCT CATALOG (CRITICAL) ***
    ${productCatalog}
    
    *** STRATEGIC MISSION ***
    1. Generate exactly ${postCount} posts for ${config.month} ${config.year}.
    2. **CATALOG ROTATION RULE**: You MUST use every product in the list above at least once. DO NOT just repeat the same product. Showcase the diversity of the brand.
    3. **SMART MAPPING**: Match each product to a theme (e.g., use premium items for Ads, lifestyle items for Photos).
    
    *** OUTPUT JSON ARRAY ***
    For each post, return:
    - "date": "YYYY-MM-DD"
    - "dayLabel": "e.g. Oct 5"
    - "topic": Engaging post title
    - "postType": "Ad" | "Photo" | "Greeting"
    - "selectedProductId": The EXACT ID from the catalog list above (NOT the name)
    - "headline": Hook for the visual (Max 6 words)
    - "visualIdea": Description of the scene
    - "caption": High-engagement copy
    - "hashtags": Strategic tags
    - "imagePrompt": Detailed technical AI prompt for photorealism.
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
        parts.push({ text: "HERO PRODUCT (Main Physical Subject):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "BRAND LOGO (Overlay discreetly):" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "MOOD BOARD (Reference for Texture, Lighting, and Color Grade):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    let designPrompt = `You are a High-End Commercial Photographer & Digital Artist.
    
    *** DESIGN BRIEF ***
    Brand: ${brand.companyName}
    Colors: ${brand.colors.primary}, ${brand.colors.accent}
    Vibe: ${brand.toneOfVoice}
    
    *** THE TASK ***
    Create a ${post.postType} for "${post.topic}".
    
    *** RULES FOR HYPER-REALISM ***
    1. **Fidelity**: Preserve the physical details of the HERO PRODUCT exactly. 
    2. **Aesthetic**: Study the MOOD BOARD images. Copy the grain, bokeh, and lighting temperature.
    3. **Scene**: ${post.visualIdea}. 
    4. **Typography**: If ${post.postType} is an Ad or Greeting, render text "${post.headline}" in a premium font. 
    
    OUTPUT: A photorealistic, 4K marketing asset. No distortions. Commercial grade.`;

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
