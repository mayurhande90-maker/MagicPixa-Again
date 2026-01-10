import { Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

const IDENTITY_LOCK_MANDATE = `
*** IDENTITY LOCK v3 (SACRED ASSET PROTOCOL) ***
1. **PIXEL INTEGRITY**: The product/subject in the source image is a 'Sacred Asset'. You must preserve its exact geometry, silhouette, and proportions.
2. **LABEL CLARITY**: All text, logos, and labels on the product must remain 100% legible and unaltered. Do NOT "hallucinate" or smudge existing branding.
3. **MATERIAL FIDELITY**: If the product is glass, it must remain refractive. If metal, specular. If matte, diffuse.
MANDATE: The product must look like the EXACT physical object from the upload, now placed in a new high-end environment.
`;

const optimizeImage = async (base64: string, mimeType: string, width: number = 2048): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.9);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

const getBrandDNA = (brand?: BrandKit | null) => {
    if (!brand) return "";
    return `
    *** BRAND DNA (STRICT) ***
    - Identity: Production for '${brand.companyName || brand.name}'.
    - Tone: ${brand.toneOfVoice || 'Professional'}.
    - Palette: Use ${brand.colors.primary} as accent or theme colors.
    `;
};

const performPhysicsAudit = async (base64: string, mimeType: string): Promise<string> => {
    const prompt = `Perform a Deep Forensic Physics & Material Audit of this product image.
    1. **OPTICAL CLASSIFICATION**: Specular, Diffuse, or Refractive.
    2. **GLOBAL ILLUMINATION (GI) SPILL**: Predict environmental bleed.
    3. **LIGHTING TOPOLOGY**: Map light source.
    4. **GEOMETRIC GRID**: identify contact points for AO.
    Output a concise "Technical Optical Blueprint" paragraph.`;
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Product Audit'
        });
        return response.text || "Standard specular profile, eye-level perspective.";
    } catch (e) { return "Standard specular profile, eye-level perspective."; }
};

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Analyze product. Suggest 4 photography concepts. Return ONLY a JSON array of strings.`;
        const response = await secureGenerateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts: [{ inlineData: { data, mimeType: optimizedMime } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            featureName: 'Product Concept Analysis'
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return ["Clean studio shot", "Luxury marble table", "Floating on water", "Sleek podium"]; }
};

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<{ display: string; prompt: string }[]> => {
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Generate 4 "Model Photography Scenarios" for this item. Return JSON Array of objects {display, prompt}.`;
        const response = await secureGenerateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [{ inlineData: { data, mimeType: optimizedMime } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { display: { type: Type.STRING }, prompt: { type: Type.STRING } },
                        required: ["display", "prompt"]
                    }
                }
            },
            featureName: 'Model Scenario Analysis'
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return [{ display: "Studio", prompt: "Model holding product" }]; }
};

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string,
  brand?: BrandKit | null
): Promise<string> => {
  try {
    let vaultAssets: { data: string, mimeType: string }[] = [];
    let vaultDna = "";
    try {
        const [refs, conf] = await Promise.all([
            getVaultImages('studio'),
            getVaultFolderConfig('studio')
        ]);
        if (conf) vaultDna = conf.dna;
        const shuffled = refs.sort(() => 0.5 - Math.random());
        const selectedRefs = shuffled.slice(0, 2);
        vaultAssets = await Promise.all(selectedRefs.map(async (r) => {
            const res = await urlToBase64(r.imageUrl);
            return { data: res.base64, mimeType: res.mimeType };
        }));
    } catch (e) { console.warn("Vault fetch failed", e); }

    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 2048);
    const technicalBlueprint = await performPhysicsAudit(data, optimizedMime);
    const brandContext = getBrandDNA(brand);

    const vaultProtocol = vaultDna ? `
    *** SIGNATURE STUDIO PROTOCOL (80/20 RULE) ***
    - Instruction: ${vaultDna}
    - Mandate: (80%) Match lighting and atmosphere of VAULT REFERENCES. (20%) Creatively innovate secondary details.
    ` : "";

    let specializedContext = "";
    if (styleInstructions.toLowerCase().includes('medical product')) {
        specializedContext = `
        *** MEDICAL ARCHETYPE OVERRIDE ***
        - LIGHTING: Use "Sterile High-Key" lighting. Clinical, balanced, and shadows-minimized.
        - ENVIRONMENT: Professional medical suite, clean dental office, or minimalist wellness lab.
        - MATERIALS: Emphasize cleanliness and surgical precision. Neutral soft-whites.
        `;
    }

    const prompt = `You are Pixa Studio Pro, a world-class commercial photographer.
    ${vaultProtocol}
    *** TECHNICAL OPTICAL BLUEPRINT (PHYSICS MANDATE) ***
    ${technicalBlueprint}
    ${brandContext}
    ${specializedContext}
    
    ${IDENTITY_LOCK_MANDATE}
    
    GOAL: "${styleInstructions}"

    *** COMMERCIAL OPTIC BLOCK ***
    1. **RAY-TRACED CONTACT SHADOWS**: Ensure dark, sharp crease shadows where product meets surface.
    2. **GLOBAL ILLUMINATION**: Calculate light bouncing from environment (e.g., if surface is wood, subtle warm bounce on product bottom).
    3. **MATERIAL PHYSICS**: Reflective sharp highlights for specular, soft scattering for diffuse.

    OUTPUT: A hyper-realistic 8K commercial product photograph.`;
    
    const parts: any[] = [{ inlineData: { data: data, mimeType: optimizedMime } }];
    if (vaultAssets.length > 0) {
        vaultAssets.forEach(v => {
            parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }
    parts.push({ text: prompt });

    const response = await secureGenerateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
      featureName: 'Pixa Product Shots'
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) { throw error; }
};

export const generateModelShot = async (
    base64ImageData: string,
    mimeType: string,
    inputs: { modelType: string; region?: string; skinTone?: string; bodyType?: string; composition?: string; framing?: string; freeformPrompt?: string; },
    brand?: BrandKit | null
  ): Promise<string> => {
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 2048);
      const technicalBlueprint = await performPhysicsAudit(data, optimizedMime);
      const brandContext = getBrandDNA(brand);

      const userDirection = inputs.freeformPrompt || `Model: ${inputs.modelType}, Region: ${inputs.region}, Skin: ${inputs.skinTone}, Body: ${inputs.bodyType}, Composition: ${inputs.composition}, Framing: ${inputs.framing}`;

      let prompt = `You are Pixa Model Studio, a high-end fashion photographer.
      *** PRODUCT TECHNICAL SPECS ***
      ${technicalBlueprint}
      ${brandContext}
      
      ${IDENTITY_LOCK_MANDATE}
      
      GOAL: Render a high-fashion model interacting with the product. ${userDirection}
      *** REALISM PROTOCOL ***
      1. **SKIN FIDELITY**: Render photorealistic skin (pores, natural texture, no plastic look).
      2. **PHYSICS ANCHORING**: Calculate realistic contact shadows between model's hands and the product.
      3. **ENVIRONMENTAL HARMONY**: Match the lighting on the model to the product's pre-existing light source.
      OUTPUT: A hyper-realistic 8K fashion portrait.`;
      
      const response = await secureGenerateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
        config: { 
            responseModalities: [Modality.IMAGE],
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ] 
        },
        featureName: 'Pixa Model Shots'
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
      if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
      throw new Error("No image generated.");
    } catch (error) { throw error; }
  };

export const refineStudioImage = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    featureContext: string = "Commercial Product Shot"
): Promise<string> => {
    const optResult = await optimizeImage(base64Result, mimeType, 2048);
    const prompt = `You are an Elite Commercial AI Retoucher. 
    CURRENT TASK: Refine this ${featureContext} based on feedback: "${instruction}". 
    
    *** CORE MANDATES ***
    1. **PIXEL PRESERVATION**: Keep 95% of the original image identical.
    2. **IDENTITY LOCK**: Maintain the exact identity of the primary subject (product or person).
    3. **INTELLIGENT MODIFICATION**: Apply the requested change while ensuring it blends perfectly with existing lighting and shadows.
    
    OUTPUT: A single 4K photorealistic refined image.`;
    
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ inlineData: { data: optResult.data, mimeType: optResult.mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE] },
            featureName: 'Pixa Refinement'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    } catch (e) { throw e; }
};