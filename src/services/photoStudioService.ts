import { Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

// Helper: Resize to custom width (default 1280px for HD generation)
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

const getBrandDNA = (brand?: BrandKit | null) => {
    if (!brand) return "";
    return `
    *** BRAND DNA (STRICT) ***
    - Identity: Production for '${brand.companyName || brand.name}'.
    - Tone: ${brand.toneOfVoice || 'Professional'}.
    - Palette: Use ${brand.colors.primary} as accent or theme colors.
    `;
};

/**
 * PHASE 1: MATERIAL-AWARE PHYSICS AUDIT (ELITE RETOUCHER UPGRADE)
 * Performs an Optical Profiling session to classify materials and light transport.
 */
const performPhysicsAudit = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Perform a Deep Forensic Physics & Material Audit of this product image.
    
    1. **OPTICAL CLASSIFICATION**: Classify into a technical bucket: Specular (Reflective/Metal/Chrome), Diffuse (Matte/Fabric/Paper), or Refractive (Translucent/Glass/Liquid).
    2. **GLOBAL ILLUMINATION (GI) SPILL**: Predict how the environment light will "bleed" onto the bottom edges of the product based on its material response.
    3. **LIGHTING TOPOLOGY**: Map the primary light source direction and intensity.
    4. **GEOMETRIC GRID**: Identify the exact contact points with the ground for Ambient Occlusion (AO) calculation.
    
    Output a concise "Technical Optical Blueprint" paragraph of physics commands.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Standard specular profile, eye-level perspective.";
    } catch (e) { return "Standard specular profile, eye-level perspective."; }
};

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Analyze product. Suggest 4 photography concepts. Return ONLY a JSON array of strings.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: { parts: [{ inlineData: { data, mimeType: optimizedMime } }, { text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return ["Clean studio shot", "Natural sunlight table", "Floating on water", "Sleek podium"]; }
};

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string,
    brand?: BrandKit | null
): Promise<{ display: string; prompt: string }[]> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 512);
        const prompt = `Generate 4 "Model Photography Scenarios" for this item. Return JSON Array of objects {display, prompt}.`;
        const response = await ai.models.generateContent({
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
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) { return [{ display: "Studio", prompt: "Model holding product" }]; }
};

/**
 * PHASE 2: HYPER-REALISTIC PRODUCTION ENGINE
 */
export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
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

    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);
    const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
    const brandContext = getBrandDNA(brand);

    const vaultProtocol = vaultDna ? `
    *** SIGNATURE STUDIO PROTOCOL (80/20 RULE) ***
    - Instruction: ${vaultDna}
    - Mandate: (80%) Match lighting and atmosphere of VAULT REFERENCES. (20%) Creatively innovate secondary details.
    ` : "";

    const prompt = `You are Pixa Studio Pro, a world-class commercial photographer.
    ${vaultProtocol}
    *** TECHNICAL OPTICAL BLUEPRINT (PHYSICS MANDATE) ***
    ${technicalBlueprint}
    ${brandContext}
    
    GOAL: "${styleInstructions}"

    *** IDENTITY LOCK 2.0 (SACRED ASSET PROTOCOL) ***
    The product in the source image is a 'Sacred Asset'. You are permitted to change the lighting wrap and environment, but you are FORBIDDEN from altering its geometry, typography, logo placement, or material identity. Preserve 1:1 pixel structure of the product label.

    *** COMMERCIAL OPTIC BLOCK (HYPER-REALISM MANDATE) ***
    1. **RAY-TRACED CONTACT SHADOWS**: Calculate the exact ambient occlusion where the product meets the new surface. Ensure a dark, sharp, high-fidelity crease shadow to prevent the product from "floating".
    2. **GLOBAL ILLUMINATION (COLOR SPILL)**: Calculate light bouncing from the environment onto the product. If placed on marble, the marble's white/grey light must "bleed" onto the bottom of the product.
    3. **MATERIAL PHYSICS**:
       - If Specular: High-specular sharp highlights.
       - If Diffuse: Soft sub-surface scattering.
       - If Refractive: Caustics and realistic distortion.
    4. **FRESNEL SILHOUETTES**: Apply realistic edge-highlighting on the product's silhouette based on the new environment's light sources.

    OUTPUT: A hyper-realistic 8K commercial product photograph. No AI artifacts, zero noise, pristine 2025 production quality.`;
    
    const parts: any[] = [{ inlineData: { data: data, mimeType: optimizedMime } }];
    if (vaultAssets.length > 0) {
        vaultAssets.forEach(v => {
            parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
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
    const ai = getAiClient();
    try {
      const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType, 1536);
      const technicalBlueprint = await performPhysicsAudit(ai, data, optimizedMime);
      const brandContext = getBrandDNA(brand);

      const userDirection = inputs.freeformPrompt || `Model: ${inputs.modelType}, Region: ${inputs.region}, Skin: ${inputs.skinTone}, Body: ${inputs.bodyType}, Composition: ${inputs.composition}, Framing: ${inputs.framing}`;

      let prompt = `You are Pixa Model Studio, a high-end fashion photographer.
      *** PRODUCT TECHNICAL SPECS ***
      ${technicalBlueprint}
      ${brandContext}

      GOAL: Render a high-fashion model interacting with the product. ${userDirection}

      *** REALISM PROTOCOL ***
      1. **IDENTITY LOCK**: Keep the product pixels 100% real. Do not alter branding or labels.
      2. **SKIN FIDELITY**: Render photorealistic skin (visible pores, fine lines, micro-textures) without artificial smoothing.
      3. **PHYSICS ANCHORING**: Calculate realistic contact shadows where the model touches the product.
      4. **GLOBAL ILLUMINATION**: The model's skin and the product surface must reflect the surrounding light sources perfectly.

      OUTPUT: A hyper-realistic 8K fashion portrait. Captured on a Hasselblad H6D-400c. Commercial grade, ultra-detailed fashion shoot.`;
      
      const response = await ai.models.generateContent({
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
      });
      const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
      if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
      throw new Error("No image generated.");
    } catch (error) { throw error; }
  };

/**
 * PHASE 3: ELITE REFINEMENT (ITERATIVE LOOP)
 */
export const refineStudioImage = async (
    base64Result: string,
    mimeType: string,
    instruction: string
): Promise<string> => {
    const ai = getAiClient();
    const optResult = await optimizeImage(base64Result, mimeType, 1536);

    const prompt = `You are an Elite Commercial Retoucher.
    
    *** CURRENT IMAGE ***
    Modify the provided image based on this specific "Creative Director" feedback: "${instruction}".
    
    *** REFINEMENT RULES ***
    1. **Preserve State**: Keep the core product, environment, and 90% of the lighting identical.
    2. **Iterative Physics**: Only modify the specific elements requested while maintaining consistent scene physics.
    3. **Asset Lock**: Do NOT alter the sacred product pixels.
    
    OUTPUT: A single 8K refined commercial photograph.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: optResult.data, mimeType: optResult.mimeType } },
                    { text: prompt }
                ]
            },
            config: { 
                responseModalities: [Modality.IMAGE]
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Refinement failed.");
    } catch (e) { throw e; }
};