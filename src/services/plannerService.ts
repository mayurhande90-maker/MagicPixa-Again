
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
    3. Generate a technical "imagePrompt" for each post.
    4. Format the output strictly as a JSON array of CalendarPost objects.
    
    JSON Schema:
    - date: "YYYY-MM-DD"
    - dayLabel: "Oct 1"
    - topic: string
    - postType: "Ad" | "Photo" | "Greeting"
    - headline: string (Max 5 words)
    - visualIdea: string
    - caption: string
    - hashtags: string
    - imagePrompt: technical prompt for AI image gen
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
    const moodVibe = brand.toneOfVoice;

    const systemPrompt = `You are a World-Class Creative Director.
    
    *** BRAND DNA (STRICT GROUNDING) ***
    - Company: ${brand.companyName}
    - **MOODBOARD VIBE**: ${moodVibe}
    - **TARGET AUDIENCE**: ${brand.targetAudience}
    - **CATALOG (USE ONLY THESE)**: 
    ${productCatalog}
    
    *** STRATEGIC CONTEXT ***
    - Goal: ${config.goal}
    - Mix: ${config.mixType}
    - Month: ${config.month} (${config.country})
    
    *** TASK ***
    Generate a visual content calendar. 
    1. Distribute all provided products across the month. 
    2. Ensure "Ad" posts have high-conversion headlines.
    3. Ensure "Greeting" posts respect local festivals in ${config.country} for ${config.month}.
    
    *** OUTPUT JSON ARRAY ***
    - date, dayLabel, topic, postType, selectedProductId, headline, visualIdea, caption, hashtags, imagePrompt.
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
                        required: ["date", "topic", "postType", "selectedProductId", "visualIdea", "imagePrompt"]
                    }
                }
            }
        }));

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        return plan.map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
    } catch (e) {
        throw new Error("Strategy generation failed.");
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
        parts.push({ text: "HERO PRODUCT (Main Subject - DO NOT DEVIATE):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "LOGO ASSET:" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "MOOD BOARD STYLE REFERENCES (Extract lighting, grain, and color palette):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    let designPrompt = `You are a Visual Engineer.
    
    *** DESIGN MISSION ***
    Product: ${brand.products?.find(p => p.id === post.selectedProductId)?.name || brand.companyName}.
    Vibe: ${brand.toneOfVoice}.
    Brand Colors: ${brand.colors.primary}, ${brand.colors.accent}.
    
    *** INSTRUCTIONS ***
    1. Render the provided HERO PRODUCT into the scene described: "${post.visualIdea}".
    2. Maintain photorealistic commercial lighting derived from the MOOD BOARD.
    3. If "${post.postType}" is Ad/Greeting: Render text "${post.headline || post.topic}" using ${brand.fonts.heading}.
    4. Place LOGO subtly in a corner.
    
    OUTPUT: A photorealistic, high-end 4:5 image.`;

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
        console.error("Creative generation failed", e);
        throw e;
    }
};
