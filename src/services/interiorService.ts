import { Modality, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
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
 * Focus: Furniture & Decor ADDITION rather than structural replacement.
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

    const prompt = `You are the Pixa Spatial Furnishing Engine v6.0. 
    
    *** CORE MANDATE: ARCHITECTURAL PRESERVATION (STRICT) ***
    1. **NO STRUCTURAL CHANGES**: You are FORBIDDEN from modifying the windows, doors, walls, ceiling, or any load-bearing elements of the room.
    2. **BACKGROUND PLATE**: Treat the original photo as an immutable background plate. Your task is to FURNISH and DECORATE the space, not rebuild it.
    3. **ZERO WARPING**: The window frames, wall angles, and floor boundaries must remain 100% identical to the source image.
    4. **SMART DECOR**: Intelligently add furniture (sofas, tables, chairs), plants, rugs, and wall art in the style of "${style}". 
    5. **PBR MATERIAL RIGGING**: Apply technical Physically Based Rendering logic. If adding wood, use 'Low-roughness Walnut'. If fabric, use 'High-density linen weave'.
    6. **GLOBAL ILLUMINATION**: Calculate how the existing light from the windows (Audited in: ${spatialAudit}) should realistically fall on the new furniture and decor.

    GOAL: Furnish this ${roomType} in a ${style} aesthetic.
    ${brandDNA}
    
    OUTPUT: A single hyper-realistic 8K visualization where the room's architecture is exactly the same, but the interior decor is completely redesigned.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { 
          responseModalities: [Modality.IMAGE],
          imageConfig: {
              aspectRatio: "4:3",
              imageSize: "1K"
          }
      },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("Spatial engine failed to render. identity sync unstable.");
  } catch (error) { throw error; }
};
