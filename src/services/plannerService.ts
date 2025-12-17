
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
    selectedProductId?: string;
    archetype?: 'Value' | 'Hard Sell' | 'Seasonal'; // New field for strategic categorization
    reasoning?: string; // AI's strategic explanation
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * STEP 1: DEEP AUDIT & STRATEGY GENERATION
 * Acts as a Lead Brand Strategist.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const auditPrompt = `You are a World-Class CMO and Digital Content Strategist.
    
    *** ASSIGNMENT ***
    Create a highly scientific, results-driven 30-day content strategy for ${brand.companyName}.
    
    *** PHASE 1: RESEARCH (SOURCE OF TRUTH) ***
    - **Website**: ${brand.website}
    - **Core Tone**: ${brand.toneOfVoice}
    - **Provided Audience**: ${brand.targetAudience}
    - **Product Catalog**: ${brand.products?.map(p => p.name).join(', ') || 'General Portfolio'}
    
    *** INSTRUCTIONS ***
    1. **Deep Audit (Google Search)**: Crawl ${brand.website}. Identify the brand's USP (Unique Selling Proposition), pricing tier (Luxury vs Value), and existing visual style.
    2. **Persona Mapping**: Define a high-intent "Target Persona" based on your audit.
    3. **The 70/20/10 Archetype Rule**:
       - 70% Value/Lifestyle: Educational content, trust-building shots.
       - 20% Hard Sell: High-conversion ads for products.
       - 10% Trending/Seasonal: Content grounded in ${config.month} trends in ${config.country}.
    4. **Catalog Saturation**: You MUST rotate through ALL products in the catalog.
    
    *** OUTPUT JSON ARRAY ***
    Generate EXACTLY ${postCount} posts.
    Return an array of objects:
    - date (YYYY-MM-DD)
    - dayLabel (e.g. Oct 5)
    - topic (Catchy title)
    - postType ("Ad", "Photo", "Greeting")
    - archetype ("Value", "Hard Sell", "Seasonal")
    - selectedProductId (ID from catalog)
    - headline (The main text to render on the image - Max 6 words)
    - visualIdea (Technical scene description)
    - reasoning (1 sentence explaining why this post exists for the persona)
    - caption (Engaging copy)
    - hashtags (Strategic tags)
    - imagePrompt (Technical prompt for a 4K commercial photo)
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
        throw new Error("Failed to engineer strategy. The AI is likely having trouble accessing the brand website.");
    }
};

/**
 * STEP 2: HYPER-REALISTIC CREATIVE PRODUCTION
 * Acts as a Commercial Photographer & Digital Artist.
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
        parts.push({ text: "HERO PRODUCT (The Sacred Subject - Preserve Identity Exactly):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "BRAND LOGO (Overlay with high contrast):" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "BRAND AESTHETIC REFERENCE (Copy the lighting, grain, and grading style):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    const productionPrompt = `You are an Elite Commercial Photographer.
    
    *** THE BRIEF ***
    Category: ${post.archetype} (${post.postType})
    Brand: ${brand.companyName}
    Target Mood: ${brand.toneOfVoice}
    Primary Color: ${brand.colors.primary}
    
    *** TECHNICAL PROTOCOL: HYPER-REALISM ***
    1. **Lighting Physics**: Match the lighting style from the BRAND AESTHETIC REFERENCE images. (e.g. Studio Soft, Harsh Sunlight, Moody Noir). 
    2. **Fidelity**: The HERO PRODUCT is the center of the universe. Ensure it has realistic contact shadows and micro-reflections.
    3. **Typography**: Render "${post.headline}" using a premium, clean layout. Use the brand's primary color if appropriate. Ensure text is perfectly spelled and legible.
    4. **Composition**: ${post.visualIdea}. 
    5. **Camera**: 8K resolution, 85mm lens, f/1.8 aperture for professional bokeh.

    *** OUTPUT ***
    A SINGLE high-resolution, photorealistic 4:5 vertical masterpiece. Commercial grade only.
    `;

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

/**
 * UTILITY: Extract from document
 */
export const extractPlanFromDocument = async (
    brand: BrandKit,
    fileBase64: string,
    mimeType: string
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    const prompt = `Extract the content schedule from this document. 
    Map each item to products: [${brand.products?.map(p => p.name).join(', ') || 'General'}].
    Ensure each post has a technical "imagePrompt" for photorealistic generation.
    Return strictly a JSON array of CalendarPost objects.`;

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
        return JSON.parse(jsonText).map((p: any, idx: number) => ({ ...p, id: `import_${Date.now()}_${idx}` }));
    } catch (e) {
        throw new Error("Failed to parse document schedule.");
    }
};
