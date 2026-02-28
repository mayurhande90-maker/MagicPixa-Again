
import { Modality, Type } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage, applyWatermark } from "../utils/imageUtils";
import { BrandKit } from "../types";

// QUALITY UPGRADE: Increased optimization width for architectural detail
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 2048, 0.95);
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
    1. **STRUCTURAL ANCHORS**: Identify the exact vertices of floor-to-wall intersections, ceiling corners, and window frame placements.
    2. **LIGHT TRIANGULATION**: Locate all primary light sources (windows, recessed lights, lamps). Estimate Kelvin color temperature (e.g. 3000K Warm or 5500K Daylight).
    3. **OCCLUSION MAPPING**: Identify the fixed architectural elements that must NOT be changed.
    
    OUTPUT: A technical "Structural & Lighting Rig Protocol" for the render engine.`;
    
    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Forensic Spatial Audit'
        });
        return response.text || "Structural lock on walls and windows. Match existing light vectors.";
    } catch (e) { return "Structural lock on walls and windows. Match existing light vectors."; }
};

/**
 * PIXA INTERIOR DESIGN v6.1: ADDITIVE ARCHITECTURAL RIGGING
 * Focus: Furniture & Decor ADDITION over an immutable base plate.
 */
export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string,
  brand?: BrandKit | null,
  userPlan?: string
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
    Instruction: Use the brand palette for furniture accents and textiles.
    ` : "";

    const prompt = `You are the Pixa Spatial Furnishing Engine v6.1. 
    
    *** CORE MANDATE: ARCHITECTURAL IMMUTABILITY (STRICT) ***
    1. **NO STRUCTURAL ALTERATIONS**: You are FORBIDDEN from changing the windows, wall positions, ceiling geometry, or room dimensions. 
    2. **BACKGROUND PLATE LOGIC**: Treat the input photo as an immutable background plate. Your ONLY task is to ADD furniture, decor, and styling items into the existing space.
    3. **WINDOW INTEGRITY**: The view outside and the frame of the window must remain 100% identical to the source.
    4. **ADDITIVE FURNISHING**: Render ${style} style furniture (sofas, tables, rugs, plants) onto the existing floor.
    5. **PHYSICS ALIGNMENT**: Calculate lighting bounce from the original windows (Audit: ${spatialAudit}) onto the new furniture. Ensure physically accurate contact shadows (AO) on the original floor pixels.

    GOAL: Decorate this ${roomType} in a ${style} aesthetic without changing its architecture.
    ${brandDNA}
    
    OUTPUT: A single hyper-realistic 8K architectural render where the original room structure is preserved perfectly.`;

    const response = await secureGenerateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: { parts: [{ inlineData: { data: data, mimeType: optimizedMime } }, { text: prompt }] },
      config: { 
          responseModalities: [Modality.IMAGE],
          imageConfig: {
              aspectRatio: "4:3",
              imageSize: "2K"
          }
      },
      featureName: 'Interior Design Generation'
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
    if (imagePart?.inlineData?.data) {
        let resData = imagePart.inlineData.data;
        if (!['Studio Pack', 'Agency Pack'].includes(userPlan || '')) {
            resData = await applyWatermark(resData, 'image/png');
        }
        return resData;
    }
    throw new Error("Spatial engine failed to render. identity sync unstable.");
  } catch (error) { throw error; }
};
