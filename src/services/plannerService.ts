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
    visualBrief?: string; // Technical art direction notes
}

const FREQUENCY_MAP: Record<string, number> = {
    'Every Day (30 Posts)': 30,
    'Weekday Warrior (20 Posts)': 20,
    'Steady Growth (12 Posts)': 12,
    'Minimalist (4 Posts)': 4
};

/**
 * PHASE 1: FORENSIC AUDIT (Pre-verification)
 * Deeply analyzes the product image to understand identity and physical properties.
 */
export const analyzeProductPhysically = async (
    productId: string,
    base64: string,
    mimeType: string
): Promise<ProductAnalysis> => {
    const ai = getAiClient();
    const prompt = `Perform an Exhaustive Technical Forensic Audit of this product image.
    
    1. **OCR & Text Identity**: Transcribe EVERY piece of text visible on the packaging (brand name, variant, ingredients, volume, labels).
    2. **Logo & Graphics**: Describe all logos, icons, and graphic patterns found on the object.
    3. **Material Science**: Is the surface high-gloss, matte, metallic, or textured? Describe the reflectivity.
    4. **Physics Categorization**: Is it Edible, Topical (Skincare), a Hard Good, or Tech?
    5. **Scale & Volume**: Estimate height, mass, and volume based on labels (e.g., "15cm tall bottle", "50ml liquid volume").
    6. **Art Direction Constraints**: Identify where this product looks 'premium' vs 'cheap'. Note any specific orientation (standing vs lying).
    
    RETURN JSON:
    {
        "detectedName": "string (The official name found on packaging)",
        "category": "Edible | Topical | Wearable | Tech | Home | Other",
        "state": "Liquid | Solid | Granular | Powder | Digital",
        "physicalScale": "string (Extracted size/weight)",
        "sceneConstraints": "string (Lighting/Surface advice)",
        "visualCues": "string (Logos and text markers)"
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
 * Builds the calendar by matching topics to specific product analysis results.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig,
    productAudits: Record<string, ProductAnalysis>
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    const postCount = FREQUENCY_MAP[config.frequency] || 12;

    // Build the inventory list for the AI to pick from
    const auditData = Object.values(productAudits).map(a => 
        `- [USE_ID: "${a.id}"] Name: "${a.detectedName}" | Category: ${a.category} | State: ${a.state} | Detail: ${a.visualCues}`
    ).join('\n');

    const strategyPrompt = `You are a World-Class CMO and Senior Art Director for ${brand.companyName}.
    
    *** PRODUCT INVENTORY (YOU MUST SELECT FROM THESE IDs) ***
    ${auditData}
    
    *** TARGET MARKET RESEARCH ***
    - Target Location: "${config.country}"
    - Current Month: ${config.month}
    - **TASK**: Use Google Search to perform a Deep Cultural & Market Analysis for "${config.country}". 
    - Identify specific local holidays, seasonal aesthetics, consumer behaviors, and visual trends unique to this exact city/region/country for the month of ${config.month}.
    - Ensure the visual ideas and topics feel "local" and highly relevant to someone living in ${config.country}.
    
    *** THE STRATEGIC MANDATE ***
    1. **INVENTORY DIVERSIFICATION**: You MUST distribute the ${postCount} posts across ALL available products listed in the inventory. Do NOT focus on just one product. Every product provided must be featured at least once in the month.
    2. **TOPIC MATCHING**: Intelligently pair each post's topic with the most relevant product from the inventory. (e.g., Use skincare for a "Self-care Sunday" post, but use food for "Healthy Brunch" post).
    3. **CONTENT MIX**: Follow the user's request for a "${config.mixType}" mix.
    4. **DATE FORMAT**: You MUST return dates in the format **DD/MM/YYYY** strictly.
    
    *** OUTPUT REQUIREMENTS ***
    - Generate exactly ${postCount} posts.
    - "selectedProductId" MUST strictly match one of the "USE_ID" strings provided in the inventory above.
    - "visualBrief" must describe a unique high-end photography setting for THAT specific product, grounded in your local research of ${config.country}.
    
    RETURN JSON ARRAY.`;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ text: strategyPrompt }] },
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
    Product Details: ${productAudit?.visualCues}
    Post Focus: ${post.topic}
    Art Direction: ${post.visualBrief}
    Visual Concept: ${post.visualIdea}
    Primary Color: ${brand.colors.primary}
    
    *** COMMERCIAL QUALITY PROTOCOL ***
    1. **Optics**: Render as if shot on a Phase One XF IQ4, 100MP, 80mm Schneider lens, f/4 for maximum clarity and realistic fall-off.
    2. **Lighting Physics**: Match the lighting structure found in the BRAND VISUAL DNA images. Use high-dynamic range (HDR).
    3. **Physics & Contact**: Ensure the product has realistic weight. Add deep contact shadows (ambient occlusion) where it meets surfaces. 
    4. **Material Fidelity**: Preserve the product identity EXACTLY. Captures all text and logos from the reference image. If it is a ${productAudit?.state}, ensure the physics of the material (reflections, translucency) are 100% realistic.
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

/**
 * PHASE 3: STRATEGIC EXTRACTION (Deep Document Analysis)
 * Reads PDFs/CSVs and intelligently maps them to the brand catalog with date normalization.
 */
export const extractPlanFromDocument = async (
    brand: BrandKit,
    fileBase64: string,
    mimeType: string
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    // Provide explicit product context for matching
    const productCatalog = brand.products?.map(p => 
        `- [ID: ${p.id}] Name: "${p.name}"`
    ).join('\n') || "No products in catalog.";

    const extractionPrompt = `You are a Senior Content Strategist & Document Intelligence AI.
    
    *** GOAL ***
    Perform a Deep Strategic Extraction from the uploaded Content Calendar document.
    
    *** BRAND CATALOG (FOR PRODUCT MATCHING) ***
    ${productCatalog}
    
    *** EXTRACTION RULES ***
    1. **DATE NORMALIZATION**:
       - Scan the document for dates. They might be in any format (e.g., "Jan 1st", "01-01-2024", "1/1", "Monday Week 1").
       - Convert EVERY date into the strict standard format: **DD/MM/YYYY**.
       - If only the day is mentioned, assume the current year and current or next month.
    2. **TOPIC & FREQUENCY**:
       - Extract the primary topic/hook for each post.
       - Identify how many posts are planned.
    3. **INTELLIGENT PRODUCT MAPPING**:
       - For each post, smartly decide which product from the BRAND CATALOG fits the topic best.
       - If a topic is "New Arrivals", pick a recently added product.
       - If a topic is "Morning Coffee", pick a coffee-related product.
       - "selectedProductId" MUST be a valid ID from the catalog provided above.
    4. **CONTENT GENERATION**:
       - Even though the document is a reference, you must generate a full "imagePrompt" and "caption" that matches the extracted topic and the mapped product.
       - Ensure the style is premium and high-end commercial.
    
    *** OUTPUT SCHEMA ***
    Return strictly a JSON array of objects.
    [
        {
            "date": "DD/MM/YYYY",
            "dayLabel": "Monday | Tuesday | etc",
            "topic": "Extracted topic name",
            "postType": "Ad | Photo | Greeting",
            "archetype": "Value | Hard Sell | Seasonal",
            "selectedProductId": "Matching ID from catalog",
            "analysisSnippet": "Brief note on why this document item was mapped this way",
            "headline": "Short punchy headline",
            "visualIdea": "Scene description",
            "visualBrief": "Technical lighting/camera instructions",
            "caption": "Smart engagement caption",
            "hashtags": "#brand #hashtags",
            "imagePrompt": "Detailed prompt for AI rendering",
            "reasoning": "Strategy note"
        }
    ]
    
    Execute extraction now.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro model for document reasoning
            contents: {
                parts: [
                    { inlineData: { data: fileBase64, mimeType } }, 
                    { text: extractionPrompt }
                ]
            },
            config: { 
                responseMimeType: "application/json" 
            }
        });

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        
        // Ensure unique IDs for state management
        return plan.map((p, idx) => ({ 
            ...p, 
            id: `imported_${Date.now()}_${idx}` 
        }));
    } catch (e) { 
        console.error("Document extraction failed", e);
        throw new Error("Pixa couldn't parse the document structure. Ensure it is a clear PDF, CSV, or Excel file with recognizable dates and topics."); 
    }
};
