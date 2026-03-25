
import { Modality, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage, applyWatermark } from "../utils/imageUtils";
import { BrandKit } from "../types";

export interface AdMakerInputs {
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    referenceImage?: { base64: string; mimeType: string } | null;
    aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | null;
    headline?: string;
    ctaButton?: string;
}

const optimizeImage = async (base64: string, mimeType: string, width: number = 1280): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

/**
 * THE PRODUCTION ENGINE (Promptless Architecture)
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null, userPlan?: string): Promise<string> => {
    const ai = getAiClient();
    
    // 1. Optimize Assets
    const [optimizedMains, optLogo, optRef] = await Promise.all([
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        inputs.referenceImage ? optimizeImage(inputs.referenceImage.base64, inputs.referenceImage.mimeType, 1536) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    // Add Primary Product Assets
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `SACRED PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO (SACRED):" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    
    // FIX: Add Reference Image
    if (optRef) parts.push({ text: "STYLE REFERENCE (MATCH LIGHTING, COMPOSITION, AND AESTHETIC):" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });

    const prompt = `Act as a Master Art Director and Elite CGI Artist. Your goal is to create a high-fidelity, professional marketing masterpiece.
    
    *** CORE DIRECTIVES (STRICT COMPLIANCE REQUIRED) ***
    1. **VISUAL STYLE**: You MUST match the lighting, composition, background, and overall aesthetic of the 'STYLE REFERENCE' image perfectly.
    2. **PRODUCT INTEGRITY**: You are FORBIDDEN from altering the geometry, silhouette, or core identity of the 'SACRED PRODUCT ASSETS'. The product must be placed naturally within the scene.
    3. **BRAND FIDELITY**: If a 'BRAND LOGO' is provided, it must be rendered with pixel-perfect precision.
    
    *** TYPOGRAPHY & COPY (MINIMALIST APPROACH) ***
    You are strictly forbidden from adding any extra text, websites, phone numbers, or hallucinated copy. ONLY render the following:
    
    ${inputs.headline ? `1. **HEADLINE**: Render exactly this text: "${inputs.headline}"` : "1. **HEADLINE**: Do not render any headline."}
    ${inputs.headline && brand?.fonts.heading ? `   - Use font style similar to: ${brand.fonts.heading}` : ""}
    ${inputs.headline && brand?.colors.primary ? `   - Use color similar to: ${brand.colors.primary}` : ""}
    
    ${(inputs.ctaButton && inputs.ctaButton !== 'None') ? `2. **CALL TO ACTION**: Create a high-contrast, professional button with exactly this text: "${inputs.ctaButton}"` : "2. **CALL TO ACTION**: Do not render any buttons."}
    
    *** PRODUCTION QUALITY ***
    - Ensure realistic contact shadows and lighting integration for the product.
    - Maintain a clean, uncluttered layout.
    - Text must be highly legible with appropriate contrast against the background.
    
    OUTPUT: A single 2K photorealistic marketing masterpiece.`;

    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1", imageSize: "2K" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
            featureName: 'Ad Creative Generation'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (imagePart?.inlineData?.data) {
            let resData = imagePart.inlineData.data;
            if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
                resData = await applyWatermark(resData, 'image/png');
            }
            return resData;
        }
        throw new Error("Ad Production engine failed. Ensure your source photos are clear.");
    } catch (e) { throw e; }
};

export const refineAdCreative = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    userPlan?: string,
    originalImage?: { base64: string, mimeType: string },
    originalPrompt?: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    let prompt = `You are an Elite Ad Retoucher. Modify the provided ad based on feedback: "${instruction}".
    1. **Preservation**: Maintain 98% of the original product identity and branding.
    2. **Precision**: Only iterate on the requested areas.`;

    if (originalPrompt) {
        prompt += `\n\n*** ORIGINAL CONTEXT ***\nThis ad was originally generated with the concept: "${originalPrompt}". Keep this core concept intact while applying the new changes.`;
    }

    if (originalImage) {
        prompt += `\n\n*** SACRED ASSET ANCHOR ***\nI have provided the ORIGINAL raw photo as the first image, and the CURRENT generated ad as the second image. You MUST use the first image as the absolute source of truth for the product's physical geometry, branding, and identity.`;
    }

    prompt += `\n\nOUTPUT: A single 4K photorealistic refined image.`;

    const parts: any[] = [];
    if (originalImage) {
        const optOriginal = await optimizeImage(originalImage.base64, originalImage.mimeType, 1536);
        parts.push({ inlineData: { data: optOriginal.data, mimeType: optOriginal.mimeType } });
    }
    parts.push({ inlineData: { data: optResult.data, mimeType: optResult.mimeType } });
    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Ad Creative Refinement'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (imagePart?.inlineData?.data) {
            let resData = imagePart.inlineData.data;
            if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
                resData = await applyWatermark(resData, 'image/png');
            }
            return resData;
        }
        throw new Error("Refinement engine failed.");
    } catch (e) { throw e; }
};
