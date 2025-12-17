
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit } from "../types";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to safe limit
const optimizeImage = async (base64: string, mimeType: string, size: number = 1024): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, size, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
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
}

/**
 * STEP 1: GENERATE STRATEGIC CONTENT PLAN
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    const productsList = brand.products?.map(p => p.name).join(', ') || 'General Brand Products';

    // Construct System Prompt with STRICT identity enforcement
    const systemPrompt = `You are a World-Class Creative Director & Social Media Strategist.
    
    *** STRICT BRAND IDENTITY LOCK (CRITICAL) ***
    - **Company Name**: ${brand.companyName}
    - **CORE PRODUCTS**: ${productsList}
    - **Tone**: ${brand.toneOfVoice}
    - **Target Audience**: ${brand.targetAudience || 'General'}
    
    *** MANDATORY RULE: NO PRODUCT HALLUCINATION ***
    You MUST ONLY generate content for the products listed above: [${productsList}]. 
    DO NOT, under any circumstances, suggest or generate content for unrelated items (e.g., do not suggest "Ghee" if the product is "Amla"). If you are unsure of the product, stick strictly to the Company Name "${brand.companyName}" and its specific niche.
    
    *** CAMPAIGN PARAMETERS ***
    - **Date**: ${config.month} ${config.year}
    - **Region**: ${config.country} (Identify relevant cultural holidays).
    - **Goal**: ${config.goal}
    - **Frequency**: ${config.frequency}
    - **Content Mix**: ${config.mixType}
    ${config.customContext ? `- **User Special Focus**: ${config.customContext}` : ''}
    
    *** TASK: GENERATE A VISUAL CONTENT CALENDAR ***
    1. **Festive Intelligence**: Include holiday greetings specific to ${config.country}.
    2. **Product Centricity**: Ensure every post features the brand's actual products.
    
    *** OUTPUT FORMAT (JSON Array) ***
    Return a JSON array where each object has:
    - "date": "YYYY-MM-DD"
    - "dayLabel": "Oct 1"
    - "topic": Short title.
    - "postType": One of ["Ad", "Photo", "Greeting"].
    - "headline": (REQUIRED for Ad/Greeting) Text to write ON the image.
    - "visualIdea": Description of the image.
    - "caption": Social caption.
    - "hashtags": 5-10 tags.
    - "imagePrompt": Detailed technical prompt for the AI generator.
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
                            headline: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "postType", "headline", "visualIdea", "caption", "imagePrompt"]
                    }
                }
            }
        }));

        const jsonText = response.text || "[]";
        let plan: CalendarPost[] = JSON.parse(jsonText);
        plan = plan.map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
        return plan;
    } catch (e) {
        console.error("Plan Generation Failed", e);
        throw new Error("Failed to generate content plan. Please try again.");
    }
};

/**
 * STEP 2: GENERATE DESIGNED CREATIVE
 */
export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: { base64: string, mimeType: string } | null,
    productAsset: { base64: string, mimeType: string } | null
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    const optLogo = logoAsset ? await optimizeImage(logoAsset.base64, logoAsset.mimeType, 512) : null;
    const optProduct = productAsset ? await optimizeImage(productAsset.base64, productAsset.mimeType, 1024) : null;

    if (optProduct) {
        parts.push({ text: "SOURCE PRODUCT (Hero Subject - USE THIS EXACTLY):" });
        parts.push({ inlineData: { data: optProduct.data, mimeType: optProduct.mimeType } });
    }
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO (Must be included):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    let designPrompt = `You are a World-Class Graphic Designer.
    
    *** BRAND IDENTITY LOCK ***
    - **Brand Name**: ${brand.companyName}
    - **Target Products**: ${brand.products?.map(p => p.name).join(', ') || 'Brand item'}
    - **Tone**: ${brand.toneOfVoice}
    
    *** STRICT INSTRUCTION: PRODUCT FIDELITY ***
    You MUST use the visual features of the provided "SOURCE PRODUCT" image. DO NOT generate different products or generic items like milk/ghee if the product is herbal/amla.
    
    *** TASK: CREATE A ${post.postType.toUpperCase()} ***
    Topic: ${post.topic}.
    Instruction: ${post.imagePrompt}.
    
    *** LAYOUT RULES ***
    `;

    if (post.postType === 'Ad' || post.postType === 'Greeting') {
        designPrompt += `
        1. **TYPOGRAPHY**: Render the text "${post.headline}" onto the image. Large, bold, readable.
        2. **LOGO**: Place the brand logo in a corner or top center.
        `;
    }

    designPrompt += `
    3. **REALISM**: Commercial 4K photography.
    Output a single image in 4:5 aspect ratio.
    `;

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
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (e) {
        console.error("Design Gen Failed", e);
        throw e;
    }
};
