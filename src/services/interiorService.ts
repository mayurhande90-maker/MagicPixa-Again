import { Modality, Type } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1536px for higher fidelity architectural detail
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.9);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

/**
 * ENGINE 1: FORENSIC SPATIAL AUDIT
 * Detects structural anchors, light sources, and Kelvin temperatures.
 */
const performForensicSpatialAudit = async (ai: any, base64: string, mimeType: string, roomType: string): Promise<string> => {
    const prompt = `Act as a Senior Architectural Visualizer and Optical Engineer.
    Perform a Forensic Spatial Audit of this ${roomType}:
    1. **STRUCTURAL ANCHORS**: Identify the exact vertices of floor-to-wall intersections and ceiling corners.
    2. **LIGHT TRIANGULATION**: Locate all primary light sources (windows, recessed lights, lamps). Estimate Kelvin color temperature (e.g. 3000K Warm or 5500K Daylight).
    3. **OCCLUSION MAPPING**: Identify objects that create complex contact shadows.
    4. **SCALE CALIBRATION**: Estimate the ceiling height to ensure furniture scale accuracy.
    
    OUTPUT: A technical "Structural & Lighting Rig Protocol" for the render engine.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
        });
        return response.text || "Structural lock on walls and windows. Match existing light vectors.";
    } catch (e) { return "Structural lock on walls and windows. Match existing light vectors."; }
};

/**
 * PIXA INTERIOR DESIGN v6.0: SPATIAL PHYSICS & MATERIAL RIGGING
 */
export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string,
  brand?: BrandKit | null
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);
    
    // Stage 1: The Audit
    const spatialAudit = await performForensicSpatialAudit(ai, data, optimizedMime, roomType);
    
    const brandDNA = brand ? `
    *** BRAND IDENTITY OVERRIDE ***
    Client: '${brand.companyName || brand.name}'.
    Preferred Tone: ${brand.toneOfVoice || 'Professional'}.
    Brand Palette: Primary=${brand.colors.primary}, Accent=${brand.colors.accent}.
    Instruction: Infuse the design with these brand colors in secondary materials (textiles, art, accent lighting).
    ` : "";

    const prompt = `You are the Pixa Spatial Physics Engine v6.0. 
    
    *** CORE MANDATE: ARCHITECTURAL IMMUTABILITY ***
    1. **STRUCTURAL LOCK**: Windows, doors, and load-bearing walls defined in the Audit (${spatialAudit}) are SACRED. DO NOT warp or move them.
    2. **PBR MATERIAL RIGGING**: Apply technical Physically Based Rendering logic. If using wood, use 'Low-roughness Walnut with anisotropic reflections'. If fabric, use 'High-density linen weave'.
    3. **GLOBAL ILLUMINATION**: Calculate light-bounce (GI). Ensure light from windows bleeds naturally onto new floor materials and creates physically accurate contact shadows (AO).
    4. **SCALE ACCURACY**: Every new furniture item must be sized relative to the audited ceiling height.

    GOAL: Transform this room into a ${style} ${roomType}.
    ${brandDNA}
    
    OUTPUT: A single hyper-realistic 8K architectural visualization. No AI artifacts. Museum-grade texture fidelity.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { 
          responseModalities: [Modality.IMAGE],
          // imageConfig moved to correct location for generateContent
          imageConfig: {
              aspectRatio: "4:3",
              imageSize: "1K"
          }
      },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Spatial engine failed to render. Identity sync unstable.");
  } catch (error) { throw error; }
};
