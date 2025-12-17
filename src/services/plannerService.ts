
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit, ProductAnalysis } from "../types";
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
    selectedProductId: string;
    archetype: 'Value' | 'Hard Sell' | 'Seasonal';
    reasoning: string; 
    analysisSnippet?: string; // Analysis for UI feedback
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * PHASE 1: VISION INTERROGATION
 * Performs a physical audit of a product image.
 */
export const analyzeProductPhysically = async (
    productId: string,
    base64: string,
    mimeType: string
): Promise<ProductAnalysis> => {
    const ai = getAiClient();
    const prompt = `Perform a Technical Forensic Audit of this product image.
    
    1. **OCR & Labels**: Transcribe all readable text on the packaging.
    2. **Material Check**: Is it a liquid, solid, granular (like seeds/spices), or powder?
    3. **Consumption Logic**: Is it Edible (eaten), Topical (applied to skin), or Functional (tool/object)?
    4. **Scaling**: Estimate its real-world height in cm based on common packaging cues.
    5. **Scene Constraint**: Where should this NEVER be placed? (e.g. mukhwas/digestive must be in dining/hospitality contexts, NEVER in a bathroom or near skincare props).
    
    RETURN JSON:
    {
        "detectedName": "string",
        "category": "Edible | Topical | Wearable | Tech | Home | Other",
        "state": "Liquid | Solid | Granular | Powder | Digital",
        "physicalScale": "string (e.g. 10cm tall bottle)",
        "sceneConstraints": "string",
        "visualCues": "OCR result and main visual markers"
    }`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detectedName: { type: Type.STRING },
                        category: { type: Type.STRING },
                        state: { type: Type.STRING },
                        physicalScale: { type: Type.STRING },
                        sceneConstraints: { type: Type.STRING },
                        visualCues: { type: Type.STRING }
                    },
                    required: ["detectedName", "category", "state", "physicalScale", "sceneConstraints", "visualCues"]
                }
            }
        });

        const data = JSON.parse(response.text || "{}");
        return { ...data, id: productId };
    } catch (e) {
        console.error("Forensic audit failed for product", productId, e);
        throw e;
    }
};

/**
 * STEP 1: STRATEGY GENERATION with IMMUTABLE TRUTH
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig,
    productAudits: Record<string, ProductAnalysis>
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const auditData = Object.values(productAudits).map(a => 
        `- Product ID: ${a.id}
          IMMUTABLE TRUTH: This is ${a.detectedName}. 
          Type: ${a.category} (${a.state}). 
          Rules: ${a.sceneConstraints}.
          Scale: ${a.physicalScale}.`
    ).join('\n\n');

    const auditPrompt = `You are a Lead Brand Strategist for ${brand.companyName}.
    
    *** PRODUCT DATABASE (IMMUTABLE TRUTH) ***
    ${auditData}
    
    *** ASSIGNMENT ***
    1. **Internet Trend Scan**: Use Google Search for ${brand.website} and ${config.month} trends in ${config.country}.
    2. **Logic Check**: Match products to days. IF Edible/Granular (e.g. Mukhwas/Candy), focus on dining, hospitality, and taste. NEVER treat it as skincare.
    3. **Strategy**: Generate ${postCount} posts using the 70/20/10 rule.
    
    *** OUTPUT JSON ARRAY ***
    Return array of objects including:
    - selectedProductId (MUST MATCH ONE FROM DATABASE)
    - analysisSnippet (Short string from database to confirm identity in UI)
    ... (standard fields)`;

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
                            analysisSnippet: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "postType", "selectedProductId", "visualIdea", "imagePrompt", "headline", "caption", "reasoning", "archetype", "analysisSnippet"]
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
 * STEP 2: PHYSICS-AWARE PRODUCTION
 */
export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: { data: string, mimeType: string } | null,
    productAsset: { data: string, mimeType: string } | null,
    productAudit: ProductAnalysis | null,
    moodBoardAssets: { data: string, mimeType: string }[] = []
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    if (productAsset) {
        parts.push({ text: `HERO PRODUCT IMMUTABLE TRUTH:
        ID: ${post.selectedProductId}
        Identity: ${productAudit?.detectedName}
        Category: ${productAudit?.category} (${productAudit?.state})
        Scale: ${productAudit?.physicalScale}
        Constraints: ${productAudit?.sceneConstraints}` });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (logoAsset) {
        parts.push({ text: "BRAND LOGO:" });
        parts.push({ inlineData: { data: logoAsset.data, mimeType: logoAsset.mimeType } });
    }

    if (moodBoardAssets.length > 0) {
        parts.push({ text: "AESTHETIC REFERENCE:" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    const productionPrompt = `You are an Elite Commercial Photographer.
    
    *** CRITICAL: PHYSICS & CONTEXT ***
    - **Physical Scaling**: ${productAudit?.physicalScale || 'Maintain realistic proportions'}.
    - **Context Lock**: This product is ${productAudit?.category}. ${productAudit?.sceneConstraints}. 
    - **Visual Brief**: ${post.visualIdea}. 
    - **Headline**: Render "${post.headline}" with premium typography.
    
    OUTPUT: A single 4:5 vertical 4K masterpiece. Total realism.`;

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
    const prompt = `Extract the content schedule from this document. Format as JSON array.`;
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
