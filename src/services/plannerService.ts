
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
    analysisSnippet?: string; 
    visualBrief?: string; // New: Technical art direction notes
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * PHASE 1: FORENSIC AUDIT (Pre-verification)
 */
export const analyzeProductPhysically = async (
    productId: string,
    base64: string,
    mimeType: string
): Promise<ProductAnalysis> => {
    const ai = getAiClient();
    const prompt = `Perform a Technical Forensic Audit of this product image for high-end commercial rendering.
    
    1. **Identity Capture**: Transcribe packaging text, logos, and specific design markers.
    2. **Material Science**: Is the surface high-gloss, matte, metallic, or textured?
    3. **Physics Categorization**: Is it Edible, Topical (Skincare), or a Hard Good?
    4. **Scale Logic**: Determine its height/mass (e.g., "15cm tall bottle", "500g heavy jar").
    5. **Art Direction Constraints**: List scenes where this product looks 'premium' vs 'cheap'.
    
    RETURN JSON:
    {
        "detectedName": "string",
        "category": "Edible | Topical | Wearable | Tech | Home | Other",
        "state": "Liquid | Solid | Granular | Powder | Digital",
        "physicalScale": "string",
        "sceneConstraints": "string",
        "visualCues": "string"
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
        console.error("Forensic audit failed", e);
        throw e;
    }
};

/**
 * STEP 1: STRATEGY ENGINE (CMO + Art Director)
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig,
    productAudits: Record<string, ProductAnalysis>
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    const auditData = Object.values(productAudits).map(a => 
        `- [${a.detectedName}]: ${a.category} item. Rules: ${a.sceneConstraints}. Vibe: ${a.visualCues}`
    ).join('\n');

    const auditPrompt = `You are a World-Class CMO and Senior Art Director for ${brand.companyName}.
    
    *** PRODUCT DATABASE ***
    ${auditData}
    
    *** STRATEGY BRIEF ***
    1. **Internet Trends**: Search for viral aesthetics for ${brand.website} and ${brand.companyName} niche for ${config.month} in ${config.country}.
    2. **Content Archetypes**: Apply 70% Value, 20% Hard Sell, 10% Trends.
    3. **Art Direction**: For EVERY post, generate a "visualBrief" that describes high-end photography settings (e.g. "Use Chiaroscuro lighting for drama", "Flat-lay with organic textures").
    
    *** OUTPUT JSON ARRAY ***
    Return strictly ${postCount} objects. 
    Ensure "selectedProductId" is accurate. 
    "visualBrief" must contain camera focal length and lighting type.`;

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
                            visualBrief: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "postType", "selectedProductId", "visualIdea", "visualBrief", "imagePrompt", "headline", "caption", "reasoning", "archetype", "analysisSnippet"]
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
 * STEP 2: PRO PRODUCTION ENGINE (Senior Commercial Photographer)
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
        parts.push({ text: "HERO PRODUCT (The Subject - Analyze Material and Scale):" });
        parts.push({ inlineData: { data: productAsset.data, mimeType: productAsset.mimeType } });
    }
    
    if (moodBoardAssets.length > 0) {
        parts.push({ text: "BRAND VISUAL DNA (Style Anchor - Copy this Lighting, Color Grading, and Vibe):" });
        moodBoardAssets.slice(0, 3).forEach(m => {
            parts.push({ inlineData: { data: m.data, mimeType: m.mimeType } });
        });
    }

    const productionPrompt = `You are an Elite Commercial Photographer commissioned by ${brand.companyName}.
    
    *** THE PRODUCTION BRIEF ***
    Object: ${productAudit?.detectedName} (${productAudit?.category})
    Post Focus: ${post.topic}
    Art Direction: ${post.visualBrief}
    Visual Concept: ${post.visualIdea}
    Primary Color: ${brand.colors.primary}
    
    *** COMMERCIAL QUALITY PROTOCOL ***
    1. **Optics**: Render as if shot on a Phase One XF IQ4, 100MP, 80mm Schneider lens, f/4 for maximum clarity and realistic fall-off.
    2. **Lighting Physics**: Match the lighting structure found in the BRAND VISUAL DNA images. Use high-dynamic range (HDR).
    3. **Physics & Contact**: Ensure the product has realistic weight. Add deep contact shadows (ambient occlusion) where it meets surfaces. 
    4. **Material Fidelity**: Preserve the product identity exactly. If it is a ${productAudit?.state}, ensure the physics of the material (reflections, translucency) are 100% realistic.
    5. **Typography**: Integrate "${post.headline}" using ${brand.fonts.heading}. Text must be clean, legible, and premium.
    
    *** COMPOSITION ***
    Apply the "Rule of Thirds" and "Leading Lines" to ensure the product is the hero. Use negative space effectively for the headline.
    
    OUTPUT: A single, photorealistic 4:5 vertical masterpiece. Zero AI artifacts. Magazine quality.`;

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
        console.error("High-fidelity rendering failed", e);
        throw e;
    }
};

export const extractPlanFromDocument = async (
    brand: BrandKit,
    fileBase64: string,
    mimeType: string
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const prompt = `Extract the content schedule from this document. Format as JSON array. Link to products: ${brand.products?.map(p => p.name).join(', ')}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [{ inlineData: { data: fileBase64, mimeType } }, { text: prompt }]
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { throw new Error("Parsing failed."); }
};
