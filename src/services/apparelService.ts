import { Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

export interface ApparelStylingOptions {
    tuck?: string;
    fit?: string;
    sleeve?: string;
}

const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
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
  stylingOptions?: ApparelStylingOptions,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const isSameGarmentImage = topGarment && bottomGarment && (topGarment.base64 === bottomGarment.base64);
    const personPromise = optimizeImage(personBase64, personMimeType);
    let topPromise = topGarment ? optimizeImage(topGarment.base64, topGarment.mimeType) : Promise.resolve(null);
    let bottomPromise = bottomGarment ? optimizeImage(bottomGarment.base64, bottomGarment.mimeType) : Promise.resolve(null);
    const [optPerson, optTop, optBottom] = await Promise.all([personPromise, topPromise, bottomPromise]);

    const brandDNA = brand ? `
    *** BRAND FASHION CONTEXT ***
    Brand: '${brand.companyName || brand.name}'. Tone: ${brand.toneOfVoice || 'Professional'}.
    Guidelines: The model should look as if they are in a '${brand.industry}' professional photo shoot.
    ` : "";

    const parts: any[] = [{ text: `Task: Virtual Try-On. ${brandDNA} Maintain face/body/bg exactly.` }];
    parts.push({ text: "MODEL:" }, { inlineData: { data: optPerson.data, mimeType: optPerson.mimeType } });

    if (isSameGarmentImage && optTop) {
        parts.push({ text: "OUTFIT SOURCE:" }, { inlineData: { data: optTop.data, mimeType: optTop.mimeType } });
        parts.push({ text: "INSTRUCTION: Extract both top and bottom from source and apply to model." });
    } else {
        if (optTop) { parts.push({ text: "TOP:" }, { inlineData: { data: optTop.data, mimeType: optTop.mimeType } }); } 
        if (optBottom) { parts.push({ text: "BOTTOM:" }, { inlineData: { data: optBottom.data, mimeType: optBottom.mimeType } }); }
    }

    if (stylingOptions) {
        let styleText = "STYLING: ";
        if (stylingOptions.tuck) styleText += `${stylingOptions.tuck}. `;
        if (stylingOptions.fit) styleText += `${stylingOptions.fit}. `;
        parts.push({ text: styleText });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          safetySettings: [
              { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
              { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Failed to generate apparel try-on.");
  } catch (error) { throw error; }
};