
import { Modality, Type, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { BrandKit } from "../types";
import { resizeImage } from "../utils/imageUtils";

export interface PlanConfig {
    month: string;
    year: number;
    goal: string; // "Launch", "Awareness", etc.
    frequency: string; // "Every Day", "3 Days/Week", etc.
    customContext?: string; // Optional user notes
    country: string; // For holiday detection
}

export interface CalendarPost {
    id: string;
    date: string; // ISO Date String
    dayLabel: string; // "Oct 1"
    topic: string;
    visualIdea: string;
    caption: string;
    hashtags: string;
    imagePrompt: string; // Hidden technical prompt for the AI
}

/**
 * STEP 1: GENERATE TEXT PLAN
 * Uses Gemini 3 Pro to create a structured JSON calendar.
 */
export const generateContentPlan = async (
    brand: BrandKit,
    config: PlanConfig
): Promise<CalendarPost[]> => {
    const ai = getAiClient();
    
    // Construct System Prompt
    const systemPrompt = `You are a Senior Social Media Strategist & Content Planner.
    
    *** CLIENT BRAND PROFILE ***
    - Name: ${brand.companyName}
    - Tone: ${brand.toneOfVoice}
    - Audience: ${brand.targetAudience || 'General'}
    - Products: ${brand.products?.map(p => p.name).join(', ') || 'General Products'}
    
    *** CAMPAIGN SETTINGS ***
    - Period: ${config.month} ${config.year}
    - Target Region: ${config.country} (CRITICAL: Identify local holidays/festivals for this region in this month).
    - Goal: ${config.goal}
    - Frequency: ${config.frequency}
    ${config.customContext ? `- Custom Focus: ${config.customContext}` : ''}
    
    *** INSTRUCTIONS ***
    1. **Analyze Dates**: Identify specific holidays, festivals, or shopping events in ${config.month} for ${config.country}.
    2. **Distribute Content**: Based on the frequency, select the best dates. 
       - If "Launch": Focus on hype, countdowns, features.
       - If "Engagement": Focus on questions, memes, relatable content.
       - If "Awareness": Focus on lifestyle, values, team.
    3. **Visual Strategy**: For each post, describe a HIGHLY VISUAL image concept that fits the Brand's "Mood Board" style.
    
    *** OUTPUT FORMAT ***
    Return a valid JSON array of objects.
    Each object must have:
    - "date": YYYY-MM-DD
    - "dayLabel": "Oct 1"
    - "topic": Short title (e.g. "Diwali Greeting", "Product Hero")
    - "visualIdea": Description of the image for the USER to read.
    - "caption": Engaging caption text.
    - "hashtags": 5-10 relevant tags.
    - "imagePrompt": Technical AI image generation prompt (e.g. "Photorealistic shot of product on a podium with marigold flowers...").
    `;

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview', // High logic model
            contents: { parts: [{ text: systemPrompt }] },
            config: {
                tools: [{ googleSearch: {} }], // Use search for accurate holiday dates
                responseMimeType: "application/json",
                // We use a loose schema or none to allow flexibility, but specifying array helps
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            date: { type: Type.STRING },
                            dayLabel: { type: Type.STRING },
                            topic: { type: Type.STRING },
                            visualIdea: { type: Type.STRING },
                            caption: { type: Type.STRING },
                            hashtags: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING }
                        },
                        required: ["date", "topic", "visualIdea", "caption", "imagePrompt"]
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
 * STEP 2: GENERATE SINGLE POST IMAGE
 * Called in a loop by the frontend.
 */
export const generatePostImage = async (
    prompt: string,
    brand: BrandKit
): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Prepare Brand Assets
    const parts: any[] = [];
    
    // If brand has products, use the first one as reference (Simple MVP logic)
    // In a pro version, we'd allow selecting specific products per post.
    if (brand.products && brand.products.length > 0) {
        // We need to fetch the image bytes if we want to send it to Gemini
        // For now, let's assume we fetch the first product image
        // NOTE: This fetch needs to happen in the UI or passed as base64 to be safe.
        // For this implementation, we will rely on TEXT descriptions unless the specific product image is passed.
        // Let's assume the "prompt" generated by Gemini in Step 1 includes product details.
    }

    // 2. Build Image Prompt
    const finalPrompt = `
    *** BRAND AESTHETIC PROTOCOL ***
    - **Palette**: ${brand.colors.primary}, ${brand.colors.secondary}.
    - **Mood**: ${brand.toneOfVoice}.
    - **Negative Constraints**: ${brand.negativePrompts || 'None'}.
    
    *** IMAGE TASK ***
    ${prompt}
    
    *** QUALITY CHECK ***
    - Photorealistic, 4K, Commercial Photography.
    - If text is required in the image, use a clean sans-serif font.
    - No distorted faces or hands.
    `;
    
    // Add Logo if available (Optional Advanced Feature)
    // For now, we generate the clean visual.

    parts.push({ text: finalPrompt });

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: "4:5", imageSize: "1K" } // Social Media Ratio
            },
        }));

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (e) {
        console.error("Image Gen Failed", e);
        throw e;
    }
};
