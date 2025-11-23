
import { Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

// Helper to reduce image size for AI payload safety
// Using 1024px and 60% quality to prevent payload bloating which causes API errors
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.60);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  topGarment: { base64: string; mimeType: string } | null,
  bottomGarment: { base64: string; mimeType: string } | null,
  userPrompt?: string,
  stylingOptions?: ApparelStylingOptions
): Promise<string> => {
  const ai = getAiClient();
  try {
    // Check for Single Outfit Upload (Same image for Top and Bottom)
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);

    // 1. Optimize Images (Parallel) to ensure request fits in limit
    const personPromise = optimizeImage(personBase64, personMimeType);
    let topPromise, bottomPromise;

    if (isSameGarmentImage && topGarment) {
        // If same, just optimize one and reuse the promise result
        topPromise = optimizeImage(topGarment.base64, topGarment.mimeType);
        bottomPromise = topPromise;
    } else {
        topPromise = topGarment ? optimizeImage(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
        bottomPromise = bottomGarment ? optimizeImage(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    }

    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    // Construct the multimodal prompt
    const parts: any[] = [];
    
    // Simplified System Instruction for better adherence
    parts.push({ text: `You are an expert AI fashion stylist and image editor. 
Task: Virtual Try-On. 
Goal: Generate a photorealistic image of the model wearing the provided clothing.
Constraint: Keep the model's face, skin tone, body shape, and background EXACTLY the same.` });

    // Part 1: The Person (Target)
    parts.push({ text: "TARGET MODEL:" });
    parts.push({ inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    if (isSameGarmentImage && optTop) {
        // Optimization: Send image once, instruct to extract both
        parts.push({ text: "REFERENCE OUTFIT (Source Image):" });
        parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        parts.push({ text: `INSTRUCTION: The Reference Outfit image contains a full look (Top + Bottom). 
        1. Identify the upper body garment (shirt/jacket) from the Reference and put it on the Model.
        2. Identify the lower body garment (pants/skirt) from the Reference and put it on the Model.
        3. Ensure the fit matches the reference.` });
    } else {
        // Distinct Images Logic
        if (optTop) {
             parts.push({ text: "REFERENCE TOP:" });
             parts.push({ inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
             parts.push({ text: "INSTRUCTION: Replace the model's top with this Reference Top." });
        } 
        if (optBottom) {
            parts.push({ text: "REFERENCE BOTTOM:" });
            parts.push({ inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } });
            parts.push({ text: "INSTRUCTION: Replace the model's bottom with this Reference Bottom." });
        }
    }

    // Explicit Styling Overrides
    if (stylingOptions && (stylingOptions.tuck || stylingOptions.fit || stylingOptions.sleeve)) {
        let styleText = "STYLING RULES: ";
        if (stylingOptions.tuck) styleText += `Waist: ${stylingOptions.tuck}. `;
        if (stylingOptions.fit) styleText += `Fit: ${stylingOptions.fit}. `;
        if (stylingOptions.sleeve) styleText += `Sleeves: ${stylingOptions.sleeve}. `;
        parts.push({ text: styleText });
    }

    parts.push({ text: `Ensure the lighting on the clothes matches the model's environment. The result must be indistinguishable from a real photo.` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          // CRITICAL: Relax safety settings to prevent false positives on clothing/skin
          safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated. The model might have blocked the request.");
  } catch (error) {
    console.error("Error generating apparel try-on:", error);
    throw error;
  }
};
