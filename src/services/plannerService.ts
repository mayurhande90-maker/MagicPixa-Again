
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
    selectedProductId?: string; // AI now suggests which product to use
}

/**
 * STEP 1: GENERATE STRATEGIC CONTENT PLAN
 * Now aware of the ENTIRE product catalog.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    // Create a detailed product reference for the AI
    const productCatalog = brand.products?.map(p => `- ${p.name} (ID: ${p.id})`).join('\n') || 'Generic Brand Items';

    const systemPrompt = `You are a World-Class Creative Director.
    
    *** BRAND DNA ***
    - Company: ${brand.companyName}
    - Products: 
    ${productCatalog}
    - Tone: ${brand.toneOfVoice}
    - Audience: ${brand.targetAudience || 'General'}
    
    *** STRATEGIC CONTEXT ***
    - Region: ${config.country} (Holidays/Trends)
    - Goal: ${config.goal}
    - Mix: ${config.mixType}
    
    *** TASK ***
    Generate a content calendar. For each post, you MUST choose the most relevant Product ID from the catalog above. 
    DO NOT hallucinate products that aren't in the list (e.g., if the brand is amla-based, don't suggest dairy/ghee).
    
    *** OUTPUT FORMAT (JSON Array) ***
    Return a JSON array of objects with:
    - "date": "YYYY-MM-DD"
    - "dayLabel": "Oct 1"
    - "topic": Short title.
    - "postType": "Ad" | "Photo" | "Greeting"
    - "selectedProductId": "The exact ID from the list above"
    - "headline": Max 5 word text for the image.
    - "visualIdea": Scene description.
    - "caption": Social copy.
    - "hashtags": 5-10 tags.
    - "imagePrompt": Technical AI generation prompt.
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
                            postType: { type: Type.STRING },
                            selectedProductId: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        }
                    }
                }
            }
        }));

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        return plan.map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
    } catch (e) {
        console.error("Plan Gen Failed", e);
        throw new Error("Failed to generate strategy.");
    }
};

/**
 * STEP 2: GENERATE DESIGNED CREATIVE
 * Now analyzing specific product + mood boards.
 */
export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: { base64: string, mimeType: string } | null,
    productAsset: { base64: string, mimeType: string } | null,
    moodBoardAssets: { base64: string, mimeType: string }[] = []
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    if (productAsset) {
        const opt = await optimizeImage(productAsset.base64, productAsset.mimeType, 1024);
        parts.push({ text: "HERO PRODUCT (The Subject):" });
        parts.push({ inlineData: { data: opt.data, mimeType: opt.mimeType } });
    }
    
    if (logoAsset) {
        const opt = await optimizeImage(logoAsset.base64, logoAsset.mimeType, 512);
        parts.push({ text: "BRAND LOGO (To be placed):" });
        parts.push({ inlineData: { data: opt.data, mimeType: opt.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "MOOD BOARD (Reference for Style, Lighting, and Vibe):" });
        for (const asset of moodBoardAssets.slice(0, 3)) { // Top 3 mood images
            const opt = await optimizeImage(asset.base64, asset.mimeType, 512);
            parts.push({ inlineData: { data: opt.data, mimeType: opt.mimeType } });
        }
    }

    let designPrompt = `You are a Visual Engineer.
    
    *** MISSION ***
    Create a ${post.postType} for "${brand.companyName}".
    
    *** STYLE GUIDELINES ***
    - **Primary Color**: ${brand.colors.primary}
    - **Vibe**: ${brand.toneOfVoice}
    - **Mood Board**: Study the attached mood board. Copy the lighting quality, color grading, and "aesthetic" exactly.
    
    *** EXECUTION ***
    - Use the HERO PRODUCT as the main physical object.
    - If ${post.postType} is Ad/Greeting: Render text "${post.headline}" in ${brand.fonts.heading}.
    - Placement: Professional, balanced, high-end commercial quality.
    - No Hallucinations: Stick to the amla product features if provided.
    
    Output a photorealistic 4:5 image.`;

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
        throw e;
    }
};
