
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
    postType: 'Ad' | 'Photo' | 'Greeting'; // New field to determine rendering logic
    headline?: string; // For Ads/Greetings
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
    
    // Construct System Prompt
    const systemPrompt = `You are a World-Class Creative Director & Social Media Strategist.
    
    *** CLIENT BRAND IDENTITY ***
    - **Name**: ${brand.companyName}
    - **Voice**: ${brand.toneOfVoice}
    - **Audience**: ${brand.targetAudience || 'General'}
    - **Key Products**: ${brand.products?.map(p => p.name).join(', ') || 'Range of products'}
    
    *** CAMPAIGN PARAMETERS ***
    - **Date**: ${config.month} ${config.year}
    - **Region**: ${config.country} (CRITICAL: Identify cultural holidays, festivals, and shopping events for this region).
    - **Goal**: ${config.goal}
    - **Frequency**: ${config.frequency}
    - **Content Mix**: ${config.mixType}
    ${config.customContext ? `- **Specific Focus**: ${config.customContext}` : ''}
    
    *** TASK: GENERATE A VISUAL CONTENT CALENDAR ***
    1. **Festive Intelligence**: If there is a major festival (e.g., Diwali, Christmas, Ramadan, 4th of July) in this month for ${config.country}, you MUST schedule "Greeting" or "Festive Sale" posts.
    2. **Ad Creation**: If the goal is "Sales" or mix is "Ads Only", schedule "Ad" posts with punchy HEADLINES.
    3. **Mix Logic**:
       - "Ads Only": 100% Graphic Designs with Text/Offers.
       - "Lifestyle Only": 100% Clean Photography (No text).
       - "Balanced": Mix of Product Heroes, Lifestyle shots, and 2-3 Sale/Festive Ads.
    
    *** OUTPUT FORMAT (JSON Array) ***
    Return a JSON array where each object has:
    - "date": "YYYY-MM-DD"
    - "dayLabel": "Oct 1"
    - "topic": Short title (e.g. "Diwali Wish", "Product Launch").
    - "postType": One of ["Ad", "Photo", "Greeting"].
    - "headline": (REQUIRED for Ad/Greeting) Short text to write ON the image (max 5 words). Empty for Photo.
    - "visualIdea": Description of the image for the USER.
    - "caption": Engaging social caption.
    - "hashtags": 5-10 relevant tags.
    - "imagePrompt": Technical prompt for the AI generator. Include lighting, composition, and style.
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
        
        // Add local IDs
        plan = plan.map((p, idx) => ({ ...p, id: `post_${Date.now()}_${idx}` }));
        
        return plan;
    } catch (e) {
        console.error("Plan Generation Failed", e);
        throw new Error("Failed to generate content plan. Please try again.");
    }
};

/**
 * STEP 2: GENERATE DESIGNED CREATIVE
 * Now supports Logo placement, Product compositing, and Typography.
 */
export const generatePostImage = async (
    post: CalendarPost,
    brand: BrandKit,
    logoAsset: { base64: string, mimeType: string } | null,
    productAsset: { base64: string, mimeType: string } | null
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    
    // 1. Optimize Assets
    const optLogo = logoAsset ? await optimizeImage(logoAsset.base64, logoAsset.mimeType, 512) : null;
    const optProduct = productAsset ? await optimizeImage(productAsset.base64, productAsset.mimeType, 1024) : null;

    // 2. Add Assets to Context
    if (optProduct) {
        parts.push({ text: "MAIN PRODUCT IMAGE (Hero Subject):" });
        parts.push({ inlineData: { data: optProduct.data, mimeType: optProduct.mimeType } });
    }
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO (Must be included):" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    // 3. Build The "Graphic Designer" Prompt
    let designPrompt = `You are a World-Class Graphic Designer & AI Artist.
    
    *** BRAND GUIDELINES ***
    - **Primary Color**: ${brand.colors.primary}
    - **Accent Color**: ${brand.colors.accent}
    - **Font Style**: ${brand.fonts.heading}
    - **Vibe**: ${brand.toneOfVoice}
    - **Avoid**: ${brand.negativePrompts || 'Clutter, distorted text'}
    
    *** TASK: CREATE A ${post.postType.toUpperCase()} CREATIVE ***
    Context: ${post.topic}.
    Visual Description: ${post.imagePrompt}.
    
    *** EXECUTION RULES ***
    `;

    if (post.postType === 'Ad' || post.postType === 'Greeting') {
        designPrompt += `
        1. **TYPOGRAPHY (CRITICAL)**: You MUST render the text "${post.headline}" onto the image.
           - Font: Bold, legible, premium.
           - Contrast: Ensure text is readable against the background (use shadows or overlays if needed).
           - Placement: Integrated into the composition (e.g., floating in 3D space, or on a clean negative space area).
        
        2. **LAYOUT**: Create a professional ad layout.
           - If Product Image provided: Place it as the HERO in the center or bottom.
           - If Logo provided: Place it tastefully in the Top Center or Top Right corner.
           - Background: Use Brand Colors or a thematic background (e.g. for Festivals, use relevant decor like lights/patterns).
        `;
    } else {
        // Photo Mode (Lifestyle)
        designPrompt += `
        1. **PHOTOGRAPHY FOCUS**: Create a stunning, text-free lifestyle or product photograph.
        2. **REALISM**: Focus on lighting, texture, and composition. 4K Commercial quality.
        3. **BRANDING**: If Logo provided, subtly emboss it on a surface or place it in the corner like a watermark.
        `;
    }

    if (optProduct) {
        designPrompt += `
        4. **PRODUCT FIDELITY**: You have the actual product image. Use it as the main subject. Do not hallucinate a different product. Relight it to match the scene perfectly.
        `;
    }

    designPrompt += `
    Output a single, high-resolution image (4:5 Aspect Ratio) optimized for Instagram/Social Media.
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
