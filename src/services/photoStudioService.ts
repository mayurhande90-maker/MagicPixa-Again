
import { Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

/**
 * IDENTITY ANCHOR v5.0 (SACRED ASSET PROTOCOL)
 * Strictest mandate for zero-hallucination rendering.
 */
const IDENTITY_LOCK_MANDATE = `
*** IDENTITY ANCHOR v5.0 (SACRED ASSET PROTOCOL) ***
1. **PIXEL IMMUTABILITY**: The product/subject is a 'Sacred Asset'. You are FORBIDDEN from altering its physical geometry, silhouette, proportions, or typography. 
2. **LABEL INTEGRITY**: Every letter, logo, and fine print on the product must remain 100% sharp, legible, and identical to the source. Do NOT "smudge" or "AI-interpret" branding.
3. **PHOTOGRAMMETRIC TRUTH**: The output must look like the EXACT object from the raw photo was physically transported into a professional studio.
`;

const optimizeImage = async (base64: string, mimeType: string, width: number = 3072): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

/**
 * ENGINE 1: FORENSIC PHYSICS AUDIT
 * Analyzes material science and existing lighting topology.
 */
const performPhysicsAudit = async (base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Senior Optical Engineer and Material Scientist. 
    Perform a Forensic Audit of this product image:
    1. **MATERIAL CLASSIFICATION**: Identify if Refractive (Glass/Liquid), Specular (Metal/Glossy), or Diffuse (Matte/Fabric). Define IOR (Index of Refraction) if applicable.
    2. **CAUSTICS & OCCLUSION**: Predict how light will bend through or bounce off this specific object.
    3. **SURFACE TOPOLOGY**: Map the curvature to ensure textures wrap accurately.
    4. **LIGHTING VECTOR**: Locate the existing primary light source in the raw photo to match the new rig.
    Output a concise 'TECHNICAL PHYSICS READOUT'.`;
    
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Forensic Physics Audit'
        });
        return response.text || "Standard specular material, eye-level rig.";
    } catch (e) { return "Standard specular material, eye-level rig."; }
};

/**
 * ENGINE 2: STRATEGIC SHOT ARCHITECT
 * Plans the composition, lighting coordinates, and environment strategy.
 */
const performShotStrategy = async (
    audit: string, 
    userIntent: string, 
    brand?: BrandKit | null
): Promise<string> => {
    const prompt = `Act as a World-Class Creative Director and Lead Photographer.
    
    *** INPUT DATA ***
    Physics Audit: ${audit}
    User Goal: "${userIntent}"
    Brand: ${brand?.companyName || 'Standard'}
    
    *** TASK: ARCHITECT THE OPTICAL RIG 2.0 ***
    1. **LIGHTING COORDINATES**: Define X,Y,Z positions for Key, Fill, and Rim lights.
    2. **COMPOSITIONAL STRATEGY**: Apply 'Golden Ratio' or 'Rule of Thirds' specifically for this product shape.
    3. **ENVIRONMENTAL GROUNDING**: Define the surface texture (Marble, Wood, Matte) and the 'Crease Shadow' density.
    4. **ARCHETYPE SELECTION**: Match goal to production standard (Minimalist, Luxury, or Organic).
    
    Output a concise 'PRODUCTION BLUEPRINT' paragraph.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ text: prompt }] },
            featureName: 'Shot Strategy Engine'
        });
        return response.text || "Luxury studio setup, centered focus, soft rim lighting.";
    } catch (e) { return "Luxury studio setup, centered focus, soft rim lighting."; }
};

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Analyze product. Suggest 4 professional photography concepts. Return ONLY a JSON array of strings.`;
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview', 
            contents: { parts: [{ inlineData: { data, mimeType: optimizedMime } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            featureName: 'Product Concept Analysis'
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return ["Clean luxury studio", "Natural sunlight wood", "Modern minimalist podium", "Premium marble display"]; }
};

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<{ display: string; prompt: string }[]> => {
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Generate 4 realistic "Human Interaction Scenarios" for this product. Return JSON Array of objects {display, prompt}.`;
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
            featureName: 'Model Interaction Analysis'
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return [{ display: "Holding", prompt: "Model holding product professionally" }]; }
};

/**
 * ENGINE 3: PRODUCTION RENDERING (Final Execution)
 */
export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string,
  brand?: BrandKit | null
): Promise<string> => {
  try {
    // 1. Vault Retrieval (Visual Anchor)
    let vaultAssets: { data: string, mimeType: string }[] = [];
    let vaultDna = "";
    try {
        const [refs, conf] = await Promise.all([
            getVaultImages('studio'),
            getVaultFolderConfig('studio')
        ]);
        if (conf) vaultDna = conf.dna;
        const selectedRefs = refs.sort(() => 0.5 - Math.random()).slice(0, 2);
        vaultAssets = await Promise.all(selectedRefs.map(async (r) => {
            const res = await urlToBase64(r.imageUrl);
            return { data: res.base64, mimeType: res.mimeType };
        }));
    } catch (e) { console.warn("Vault fetch failed", e); }

    // 2. Multi-Stage Reasoning (Engine 1 & 2)
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 2048);
    const physicsAudit = await performPhysicsAudit(data, optimizedMime);
    const productionBlueprint = await performShotStrategy(physicsAudit, styleInstructions, brand);

    const brandContext = brand ? `*** BRAND DNA: ${brand.companyName} | ${brand.toneOfVoice} | Primary: ${brand.colors.primary} ***` : "";

    // 3. Final Production Prompt
    const prompt = `You are the Pixa Production Engine. Execute the following high-fidelity render:
    
    ${IDENTITY_LOCK_MANDATE}
    
    *** TECHNICAL DIRECTIVES ***
    BLUEPRINT: ${productionBlueprint}
    PHYSICS: ${physicsAudit}
    VAULT DNA: ${vaultDna}
    ${brandContext}
    
    GOAL: "${styleInstructions}"

    *** PRODUCTION STANDARDS ***
    1. **OPTICAL RIG 2.0**: Apply precise multi-point studio lighting. Match shadows to material physics.
    2. **RAY-TRACED FIDELITY**: Render physically accurate contact shadows (AO) and global illumination bounce.
    3. **MATERIAL SCIENCE**: If the audit detected ${physicsAudit}, ensure surface reflections (Fresnel) are 100% realistic.
    4. **MAGAZINE QUALITY**: 8K resolution, Prime lens optics (85mm), clean bokeh, zero AI artifacts.

    OUTPUT: A photorealistic commercial product shot.`;
    
    const parts: any[] = [{ inlineData: { data: data, mimeType: optimizedMime } }];
    if (vaultAssets.length > 0) {
        vaultAssets.forEach(v => { parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } }); });
    }
    parts.push({ text: prompt });

    const response = await secureGenerateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          imageConfig: { imageSize: "2K" },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
      },
      featureName: 'Pixa Production Render'
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("AI Production engine failed. Please try a clearer source photo.");
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
      const physicsAudit = await performPhysicsAudit(data, optimizedMime);
      
      const userDirection = inputs.freeformPrompt || `Model: ${inputs.modelType}, Region: ${inputs.region}, Skin: ${inputs.skinTone}, Body: ${inputs.bodyType}, Composition: ${inputs.composition}, Framing: ${inputs.framing}`;

      let prompt = `You are Pixa Model Studio.
      
      ${IDENTITY_LOCK_MANDATE}
      
      *** FORENSIC INPUTS ***
      PHYSICS: ${physicsAudit}
      ${brand ? `BRAND: ${brand.companyName}` : ''}
      
      GOAL: Render a high-fashion model interacting with the product. ${userDirection}
      
      *** REALISM PROTOCOL 2.0 ***
      1. **SKIN ANCHOR**: Photorealistic skin (visible pores, natural texture, no plastic smoothness).
      2. **CONTACT PHYSICS**: Calculate realistic occlusion and shadows where model's skin touches the product.
      3. **LIGHT SYNC**: Synchronize lighting rig on the model with the product's pre-existing highlights.
      
      OUTPUT: A hyper-realistic 8K fashion portrait. The product identity must be 100% preserved.`;
      
      const response = await secureGenerateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: { imageSize: "2K" },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ] 
        },
        featureName: 'Pixa Model Production'
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
      if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
      throw new Error("Model production engine failed.");
    } catch (error) { throw error; }
  };

export const refineStudioImage = async (
    base64Result: string,
    mimeType: string,
    instruction: string,
    featureContext: string = "Commercial Product Shot"
): Promise<string> => {
    // QUALITY UPGRADE: Increased width to 3072 and quality to 0.95 for refinements
    const optResult = await optimizeImage(base64Result, mimeType, 3072);
    const prompt = `You are an Elite Commercial AI Retoucher. 
    CURRENT TASK: Refine this ${featureContext} based on feedback: "${instruction}". 
    
    *** CORE MANDATES ***
    1. **PIXEL PRESERVATION**: Keep 98% of the original image identical.
    2. **IDENTITY LOCK**: Maintain the exact identity of the primary subject (product or person).
    3. **PRECISION MODIFICATION**: Apply the requested change while ensuring seamless lighting and shadow blending.
    
    OUTPUT: A single 4K photorealistic refined image.`;
    
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts: [{ inlineData: { data: optResult.data, mimeType: optResult.mimeType } }, { text: prompt }] },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Pixa Refinement Engine'
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    } catch (e) { throw e; }
};
