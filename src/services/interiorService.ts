
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD)
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

// Micro-Prompts for Styles
export const STYLE_PROMPTS: Record<string, string> = {
    'Modern': `Apply Modern style: clean lines, balanced proportions, neutral palette (whites, greys, beiges), smooth surfaces, matte or low-gloss finishes. Use sleek furniture with simple geometry. Incorporate warm accent tones sparingly. Lighting should be soft and indirect with recessed fixtures or slender floor lamps. No clutter. Maintain functional layouts and clear circulation paths.`,
    'Minimalist': `Apply Minimalist style: remove visual noise, keep only essential furniture. Palette stays neutral and calm. Use light woods, white walls, simple forms, and ample negative space. No heavy patterns or busy décor. Surfaces should look clean, matte, and natural. Composition must feel peaceful, open, and airy.`,
    'Japanese': `Apply Japanese/Japandi style: warm woods, low-height furniture, grounded compositions, beige/almond/tan palette, natural textures. Add soft linen fabrics, paper-like lighting, and minimal decor. Emphasize balance, calmness, and connection to nature. Avoid glossy surfaces and bright colors.`,
    'American': `Apply American style: comfortable furniture, warm tones, soft fabrics, paneled textures, functional layout. Mix of wood, leather, warm metal accents, and cozy lighting. Decor should be homely, balanced, and inviting. Avoid ultra-modern sharp lines.`,
    'Coastal': `Apply Coastal style: airy whites, sea blues, sandy beiges. Light woods, natural rope textures, breezy fabrics. Enhance sunlight and openness. Use minimal but fresh decor like shells, woven baskets, light artwork. Keep everything relaxed, bright, and beach-inspired.`,
    'Traditional Indian': `Apply Traditional Indian style: carved woods, earthy tones (terracotta, deep browns, mustard, maroon), handcrafted textures, traditional patterns. Use wooden furniture with ethnic detailing. Incorporate brass accents, woven fabrics, jute, and Indian artwork. Keep elements elegant, culturally grounded, and naturally placed.`,
    'Arabic': `Apply Arabic style: arches, rich warm colors (gold, deep reds, warm browns), patterned fabrics, intricate geometric detailing. Low seating, cushions, soft flowing fabrics, lantern-style lighting. Avoid clutter, ensure symmetry and luxurious warmth.`,
    'Futuristic': `Apply Futuristic style: sharp geometry, sleek glossy surfaces, metallic accents, LED edge lighting, monochrome or neon-accented palette. Use minimal clutter, high-tech materials, ergonomic furniture, and clean floating forms. Emphasize symmetry and modern sci-fi mood.`,
    'Tech Futuristic': `Apply Tech Futuristic style: neon accents, high-gloss surfaces, cutting-edge furniture, innovative look. LED edge lighting, monochrome or neon-accented palette. Use minimal clutter, high-tech materials, ergonomic furniture, and clean floating forms.`,
    'African': `Apply African style: earthy palette, natural woods, raw textures, tribal patterns, terracotta elements. Decor should include handcrafted objects, woven baskets, textured fabrics. Keep the environment warm, organic, and soulful while staying realistic and modern.`,
    'Industrial': `Apply Industrial style: exposed materials (brick, concrete, metal), matte surfaces, dark neutrals, utilitarian fixtures. Use raw textures, metal frames, leather accents, Edison-style warm lighting. Keep furniture bold but simple. Maintain authenticity — nothing overly polished.`,
    'Creative / Artistic': `Apply Creative/Artistic style: bold colors (if appropriate), playful compositions, unique furniture shapes, expressive decor. Use wall art, unconventional textures, creative lighting. Still maintain physics, perspective, and functional flow. Avoid messy randomness — creativity must feel intentional.`,
    'Luxury Executive': `Apply Luxury Executive style: premium materials (marble, walnut, brass, leather), rich but muted colors, controlled lighting (warm, soft, layered). Furniture should be elegant, well-proportioned, and polished. Add subtle sophistication: symmetry, refined textures, premium feel without being gaudy.`,
    'Biophilic / Nature-Inspired': `Apply Biophilic style: maximize natural light, add indoor plants, use raw woods, stone textures, soft green tones, and organic shapes. Keep environment bright, natural, and calming. Avoid artificial neon or synthetic-looking materials. The final mood should feel fresh, healthy, and nature-connected.`,
    'Modern Corporate': `Apply Modern Corporate style: clean functional layout, ergonomic furniture, neutral palette with subtle brand accents. Use acoustic panels, organized work zones, soft overhead lighting, and clutter-free surfaces. Emphasize professionalism, comfort, and efficient movement flow.`
};

// Curtain Styles Configuration
const CURTAIN_STYLES: Record<string, string> = {
    'Modern': 'simple matte-fabric curtains with clean straight folds, neutral colors',
    'Minimalist': 'very light sheer curtains, soft white or beige, thin profile',
    'Japanese': 'natural linen curtains with soft earthy tones and gentle texture', // Japandi
    'American': 'double-layer curtains with soft drapes and a subtle pattern',
    'Coastal': 'sheer white or light-blue curtains, airy, allowing sunlight',
    'Traditional Indian': 'rich fabric, earthy or warm colors, simple ethnic pattern, brass rod',
    'Arabic': 'thicker luxurious drapes with elegant folds, warm tones, decorative finials',
    'Futuristic': 'smooth, monochrome, minimal wave-fold curtains with sleek rail',
    'Tech Futuristic': 'smooth, monochrome, minimal wave-fold curtains with sleek rail',
    'African': 'textured fabric with earthy tone or subtle ethnic weave',
    'Industrial': 'neutral fabric in simple straight drop, mounted on dark metal rod',
    'Creative / Artistic': 'mildly expressive color or texture that fits the room palette',
    'Luxury Executive': 'premium heavy drapes with elegant folds, deep muted tones',
    'Biophilic / Nature-Inspired': 'natural organic fabric curtains, breathable texture, soft earth tones',
    'Modern Corporate': 'professional roller blinds or clean, structured neutral drapes'
};

/**
 * PHASE 1: THE SPATIAL COMPUTING ENGINE (Deep Analysis)
 * Performs photogrammetry estimation, light transport analysis, and physical constraint mapping.
 */
const performDeepSpatialAnalysis = async (
    ai: any,
    base64ImageData: string,
    mimeType: string,
    style: string,
    spaceType: string,
    roomType: string
): Promise<string> => {
    const prompt = `You are a Spatial Computing AI & Senior Interior Architect.
    
    INPUT: An image of a ${spaceType} ${roomType}.
    TARGET STYLE: ${style}.
    
    **TASK 1: PHOTOGRAMMETRY & GEOMETRY RECONSTRUCTION**
    1. **Perspective Match**: Estimate the camera lens focal length (e.g., 16mm Ultra-Wide, 24mm Wide, 35mm Standard, 50mm Portrait).
    2. **Vanishing Point**: Locate the primary vanishing point(s) (e.g. Center, Top-Right, Off-frame left) to align new geometry.
    3. **Shell Extraction**: Strictly identify the "Shell" (Walls, Ceiling, Floor, Windows, Doors, Beams). These are IMMUTABLE.
    4. **Scale Calibration**: Estimate the ceiling height (e.g. 2.4m standard vs 3.5m loft). New furniture MUST respect this vertical scale.
    
    **TASK 2: LIGHT TRANSPORT & PHYSICS**
    1. **Key Light Source**: Identify the primary light direction (e.g. Window on left).
    2. **Shadow Logic**: Calculate where shadows must fall. (e.g. "Shadows cast to the right at 45 degrees").
    3. **Reflection Map**: Identify reflective surfaces (floors, glass). New objects must reflect correctly.
    
    **TASK 3: RENOVATION BLUEPRINT (${style})**
    - **Furniture Plan**: Select 3-4 key furniture pieces that fit the *exact* perspective grid.
    - **No-Go Zones**: Identify doors and walkways. DO NOT place furniture here.
    - **Window Treatment**: ${CURTAIN_STYLES[style] || "Style-appropriate curtains"}. MUST obey gravity and mounting physics.
    
    **OUTPUT**: A concise "Spatial Blueprint" for the rendering engine.
    Format:
    "METRICS: Camera [Focal Length], Ceiling Height [Value].
     GEOMETRY: [List structural elements to preserve].
     PHYSICS: Light from [Direction], Shadows cast [Direction].
     DESIGN_PLAN: [Specific furniture placement instructions].
     CONSTRAINT: [Strict rules to prevent floating objects or blocking doors]."
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', // Pro model for logic/reasoning
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                // We don't strictly need googleSearch here unless researching specific furniture trends, 
                // focusing on visual analysis is better for physics.
                tools: [{ googleSearch: {} }], 
            },
        });

        return response.text || `Apply ${style} style with correct perspective and lighting.`;
    } catch (e) {
        console.warn("Spatial analysis failed, falling back to basic prompt.", e);
        return `Apply ${style} style. Preserve perspective.`;
    }
};

/**
 * PHASE 2: THE REALITY RENDERER (Execution)
 */
export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    // Optimize Image First (1280px)
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    // Step 1: Deep Analysis & Planning (The "Brain")
    const renovationBlueprint = await performDeepSpatialAnalysis(
        ai, data, optimizedMime, style, spaceType, roomType
    );

    console.log("Spatial Blueprint:", renovationBlueprint);

    // Step 2: Image Generation (The "Hand")
    const styleMicroPrompt = STYLE_PROMPTS[style] || `${style} style.`;

    const prompt = `You are Pixa Interior Design — a hyper-realistic Interior rendering AI.
    
    *** SPATIAL BLUEPRINT (EXECUTE STRICTLY) ***
    ${renovationBlueprint}
    
    *** RENDERING PROTOCOL: PHYSICS & REALISM ***
    1. **Geometry Lock**: Do NOT warp walls, windows, or doors. The room structure is fixed.
    2. **Perspective Consistency**: All new furniture must align with the "METRICS" defined above (Vanishing point & Focal length). No skewed angles.
    3. **Scale Accuracy**: A chair is ~45cm high. A table is ~75cm. A door is ~2.1m. Maintain these relative scales perfectly.
    4. **Gravity & Contact**: Objects must touch the floor. Add Ambient Occlusion (contact shadows) where furniture meets the floor/rug. No floating objects.
    5. **Light Consistency**: Re-light the new elements using the "PHYSICS" light map from the blueprint. Shadows must match existing shadows.
    
    *** DESIGN INSTRUCTIONS ***
    - Style: ${style}
    - Room: ${roomType} (${spaceType})
    - Details: ${styleMicroPrompt}
    
    *** FINAL OUTPUT ***
    - A 4K, photorealistic photograph. 
    - Textures must be high-fidelity (wood grain, fabric weave, reflections).
    - It should look like a "After" photo taken from the *exact same camera position* as the input.
    
    Output ONLY the transformed image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating interior:", error);
    throw error;
  }
};
