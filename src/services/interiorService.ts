import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";

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

const STRICT_PHYSICS_RULES = `
STRICT LAYOUT & PHYSICS RULES (ZERO TOLERANCE):
- **Never block doors, windows, or essential pathways** with furniture.
- Maintain minimum walking clearance: 80–100 cm around main furniture pieces.
- **Do not place beds directly in front of doors** or in tight corners without space to walk.
- Do not attach heavy fixtures (swings, cabinets) to weak drywall; only use structural beams/walls.
- **Keep furniture proportions realistic**: sofa depth ~0.9m, dining table height ~0.75m, chair seat height ~0.45m.
- Maintain safe distance between stove and flammable materials.
- Lighting fixtures must be realistically supported (no floating lamps).
- Rugs must be proportioned realistically and fit under main furniture edges.
- Avoid placing electronics near sinks or water zones.
- **Avoid overstuffing small rooms** — keep spatial logic realistic.
- **Match shadows** to detected light direction; no impossible lighting.
- **Respect the camera angle and vanishing points** — no distorted or misaligned furniture.
- **Do not change structural elements** (walls, windows, doors) unless user explicitly asks.
- Keep décor at believable human heights (artwork ~1.5m center from floor).
- Maintain ergonomic desk setups: monitor at eye level, chair under desk clearance, proper leg room.
`;

/**
 * PHASE 1: THE ARCHITECT (Analysis & Research)
 * This function uses a text/multimodal model with Google Search to create a safe, 
 * researched plan before any image generation happens.
 */
const analyzeAndPlanRenovation = async (
    ai: any,
    base64ImageData: string,
    mimeType: string,
    style: string,
    spaceType: string,
    roomType: string
): Promise<string> => {
    const prompt = `You are a World-Class Senior Interior Architect and Spatial Analyst.
    
    INPUT: An image of a ${spaceType} ${roomType}.
    GOAL: Create a renovation blueprint for a "${style}" redesign.
    
    TASK 1: DEEP VISUAL & PHYSICS ANALYSIS
    - STRICTLY identify all exits, doors, and windows.
    - DEFINE "NO-GO ZONES": Where can furniture NOT go?
    - Analyze the perspective: Where is the vanishing point? What is the camera height?
    
    TASK 2: APPLY STRICT SAFETY & ERGONOMIC RULES
    ${STRICT_PHYSICS_RULES}
    
    TASK 3: DEEP INTERNET RESEARCH (Use Google Search)
    - Search for "Trending ${style} ${roomType} designs 2025".
    - Find 2-3 specific trending furniture pieces or layout concepts that are popular right now for this style.
    
    OUTPUT: A concise "Renovation Blueprint" paragraph that I will pass to a renderer.
    Format:
    "PERSPECTIVE: [Camera specs].
     CONSTRAINTS: [List specific furniture placements to AVOID to prevent blocking doors/windows].
     DESIGN PLAN: [Layout instructions based on trends].
     LIGHTING: [Lighting plan]."
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: prompt },
            ],
        },
        config: {
            tools: [{ googleSearch: {} }], // Enable Internet Access for Trends
        },
    });

    return response.text || `Apply ${style} style carefully respecting strict layout constraints.`;
};

/**
 * PHASE 2: THE RENDERER (Execution)
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
    // Step 1: Deep Analysis & Planning (The "Brain")
    // We pause briefly to let the Architect think.
    const renovationBlueprint = await analyzeAndPlanRenovation(
        ai, base64ImageData, mimeType, style, spaceType, roomType
    );

    console.log("Renovation Blueprint Generated:", renovationBlueprint);

    // Step 2: Image Generation (The "Hand")
    // We feed the specific blueprint into the image generator.
    
    const styleMicroPrompt = STYLE_PROMPTS[style] || `${style} style.`;

    const prompt = `You are Magic Interiors — a hyper-realistic Interior rendering AI.
    
    *** CRITICAL INPUT: ARCHITECT'S BLUEPRINT ***
    ${renovationBlueprint}
    
    *** YOUR MISSION ***
    Execute the Architect's Blueprint above on the uploaded image.
    
    ${STRICT_PHYSICS_RULES}
    
    DESIGN INSTRUCTIONS:
    - Style: ${style}
    - Room: ${roomType} (${spaceType})
    - Details: ${styleMicroPrompt}
    
    RENDER SETTINGS (PHOTOREALISM PRIORITY):
    - **Output must look like a real photograph, NOT a 3D render.**
    - Use RAW photography style, natural film grain, imperfect textures.
    - Global Illumination, Path Tracing.
    - Soft shadows matching original light source exactly.
    - High-texture PBR materials (scratches, smudges, fabric weaves).
    
    Output ONLY the transformed image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
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