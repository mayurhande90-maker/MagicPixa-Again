
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit } from "../types";
import { resizeImage } from "../utils/imageUtils";

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
    selectedProductId: string; // Mandatory link to catalog
    archetype: 'Value' | 'Hard Sell' | 'Seasonal';
    reasoning: string; 
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * STEP 1: DEEP AUDIT & STRATEGY GENERATION
 * Analyzes the brand, internet trends, and the product catalog.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const productList = brand.products?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || 'General Portfolio';

    const auditPrompt = `You are a World-Class CMO and Digital Content Strategist.
    
    *** BRAND DATA ***
    - **Company**: ${brand.companyName}
    - **Website**: ${brand.website}
    - **Tone**: ${brand.toneOfVoice}
    - **Product Catalog**:
    ${productList}
    
    *** ASSIGNMENT ***
    1. **Internet Trend Scan**: Use Google Search to analyze current viral aesthetics for brands similar to ${brand.companyName} in ${config.month}. Identify what lighting, colors, and compositions are driving the highest engagement in ${config.country}.
    2. **Strategic Product Matching**: Analyze each product in the catalog. Assign the *right* product to the *right* day based on the topic. 
       - e.g. High-end items for "Luxury Friday". 
       - e.g. Specific functional items for "How-to Tuesday".
    3. **Content Architecture**: Generate exactly ${postCount} posts following the 70/20/10 rule.
    
    *** OUTPUT JSON ARRAY ***
    Return an array of objects:
    - date (YYYY-MM-DD)
    - dayLabel (e.g. Oct 5)
    - topic (Catchy title)
    - postType ("Ad", "Photo", "Greeting")
    - archetype ("Value", "Hard Sell", "Seasonal")
    - selectedProductId (The EXACT ID from the catalog list provided above)
    - headline (Max 6 words)
    - visualIdea (Strategic scene description)
    - reasoning (Why this product was chosen for this specific day/trend)
    - caption (High-engagement copy)
    - hashtags
    - imagePrompt (Technical prompt for a 4K photo)
    `;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: auditPrompt }] },
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
                            archetype: { type: Type.STRING, enum: ["Value", "Hard Sell", "Seasonal"] },
                            selectedProductId: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "postType", "selectedProductId", "visualIdea", "imagePrompt", "headline", "caption", "reasoning", "archetype"]
                    }
                }
            }
        }));

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        return plan.slice(0, postCount).map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
    } catch (e) {
        console.error("Strategy generation failed", e);
        throw new Error("Failed to engineer strategy.");
    }
};

/**
 * STEP 2: PHYSICS-AWARE CREATIVE PRODUCTION
 * Ensures correct scale, lighting, and commercial quality.
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
        parts.push({ text: "HERO PRODUCT (Sacred Identity - Analyze its physical type):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "BRAND LOGO:" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "AESTHETIC STYLE REFERENCE (Color grading & mood):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    const productionPrompt = `You are an Elite Commercial Photographer specializing in Product Visualization.
    
    *** THE BRIEF ***
    Brand: ${brand.companyName}
    Post Objective: ${post.topic} (${post.archetype})
    Visual Brief: ${post.visualIdea}
    
    *** CRITICAL: PHYSICAL PROPORTION & PHYSICS AUDIT ***
    1. **Size Consistency**: Analyze the HERO PRODUCT image. Determine if it is a handheld item (e.g. bottle), a wearable (e.g. watch), or a large object (e.g. furniture). 
    2. **Scaling Rule**: Place the product in the scene so its scale is 100% realistic compared to the environment. If it's a 30ml bottle, it must look like it fits in a palm. Do NOT make it look giant unless the prompt asks for surrealism.
    3. **Weight & Mass**: Apply "Grounding". Ensure the product has deep contact shadows (ambient occlusion) where it meets the surface. It should look like it has weight, not like it is floating.
    4. **Materials**: Reflect the environment in the product's surface (glossy, matte, metallic).
    
    *** PHOTOGRAPHY PROTOCOL ***
    - **Camera**: Sony A7R V, 85mm G Master lens for professional compression and bokeh.
    - **Lighting**: Cinematic studio lighting that matches the AESTHETIC STYLE REFERENCE.
    - **Typography**: Render "${post.headline}" in a premium, perfectly legible layout.
    
    OUTPUT: A single 4:5 vertical 4K masterpiece. Total realism. No AI artifacts.`;

    parts.push({ text: productionPrompt });

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
        console.error("Image rendering failed", e);
        throw e;
    }
};

export const extractPlanFromDocument = async (
    brand: BrandKit,
    fileBase64: string,
    mimeType: string
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const prompt = `Extract the content schedule from this document. Format as JSON array. Use products from: ${brand.products?.map(p => p.name).join(', ')}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{ inlineData: { data: fileBase64, mimeType } }, { text: prompt }]
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { throw new Error("Document parsing failed."); }
};
