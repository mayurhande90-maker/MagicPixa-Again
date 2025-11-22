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

const CURTAIN_RULES = `
*** AUTOMATIC CURTAIN GENERATION RULES ***
- TRIGGER: If a window is detected in the photo, you MUST add curtains/blinds suited to the style.
- CONSTRAINTS: Do NOT remove or modify the original window structure, shape, size, or position.
- MOUNTING: Curtain rod must be realistically mounted on the wall or ceiling exactly above the window frame.
- PHYSICS: Curtains must fall naturally with gravity, reaching near floor height when appropriate. No floating. No clipping into walls/furniture.
- LIGHTING: Shadows and highlights must follow the original light direction. Adjust transparency (sheer vs blackout) based on style.
- SCALE: Curtain must be proportionate to window width and height.
`;

// Room-Specific Safety Checks
const ROOM_SPECIFIC_CHECKS: Record<string, string> = {
    'Living Room': `Check: Sofa/back not blocking windows/doors. Rug coverage: at least front legs on rug. TV placement: line-of-sight clear, no glare.`,
    'Bedroom': `CRITICAL: Bed must NOT block door swing or emergency egress. Nightstand clearance ≥ 0.45m.`,
    'Kitchen': `Check: Work triangle reasonable. No electronics within 0.6m of water. Do not move plumbing/sinks.`,
    'Bathroom': `Check: No non-waterproof furniture in wet zones. Vanity depth ≤ 0.6m.`,
    'Dining Room': `Check: Clearance around chairs ≥ 0.9m. Center table under light source.`,
    'Home Office': `Check: Desk not blocking door. Monitor at eye level.`,
    'Open Workspace': `Check: Fire egress preserved. Desk spacing ≥ 1.2m. Acoustic treatment if hard surfaces > 60%.`,
    'Conference Room': `Check: Walkway clear around table. No glare on AV screen.`,
    'Reception / Lobby': `Check: Seating not blocking path to desk. Clear sightlines.`
};

// Style-Specific Logic Checks
const STYLE_SPECIFIC_CHECKS: Record<string, string> = {
    'Minimalist': `Check: No excessive decor (>3 items per shelf). Remove clutter.`,
    'Traditional Indian': `Check: Furniture must have robust bases, no floating tiny legs. Earthy tones required.`,
    'Futuristic': `Check: LED accents must anchor to structure, not float.`,
    'Biophilic': `Check: Plants must be in sun-appropriate spots. Do not block exits with pots.`,
    'Industrial': `Check: Textures must be matte/rough, not plastic gloss.`
};

const COMPREHENSIVE_VALIDATION_RULES = `
*** AUTOMATED EXECUTION CHECKLIST (MUST PASS ALL) ***

1. PERSPECTIVE & CAMERA
- Check: Generated elements align to detected vanishing points (max angular error ≤ 2°).
- Fix: Reproject geometry to match original perspective exactly.

2. IMMUTABLE STRUCTURES
- Check: No changes to walls, windows, doors, columns.
- CRITICAL: DO NOT cover windows or doors with new objects (except curtains/blinds).

3. SCALE & PROPORTION (STRICT)
- Sofa depth: 0.85–1.00 m.
- Coffee table height: 0.35–0.45 m.
- Dining table height: ~0.75m.
- Door height reference: 2.1m.
- Bed width: ~1.6m (Double).

4. CIRCULATION & CLEARANCE
- Minimum clear walking width = 0.8 m.
- Main paths = 1.0 m.
- Action: Shift furniture to restore clearance if blocked.

5. LIGHTING & SHADOWS
- Check: Light direction matches photo (≤ 10° deviation).
- Action: Ray-trace soft shadows consistent with original light sources.

6. REALISM
- Check: Micro-variation present (edge wear, slight dirt, tiny specular variance).
- Film grain: 0.3–1.0.
- Action: Add subtle imperfections; avoid "AI plastic" look.

7. SAFETY & "NO-SILLY-MISTAKES" (AUTOMATIC FAIL)
- Bed in front of door -> RELOCATE.
- Swing attached to drywall -> REMOVE.
- Floating furniture -> SNAP TO FLOOR.
- Heavy objects on weak walls -> MOVE.
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
    const roomChecks = ROOM_SPECIFIC_CHECKS[roomType] || "";
    const styleChecks = STYLE_SPECIFIC_CHECKS[style] || "";
    const curtainDef = CURTAIN_STYLES[style] || "style-appropriate neutral curtains";

    const prompt = `You are a World-Class Senior Interior Architect and Spatial Analyst.
    
    INPUT: An image of a ${spaceType} ${roomType}.
    GOAL: Create a renovation blueprint for a "${style}" redesign.
    
    TASK 1: DEEP VISUAL & PHYSICS ANALYSIS
    - STRICTLY identify all exits, doors, and windows.
    - DEFINE "NO-GO ZONES": Where can furniture NOT go?
    - Analyze the perspective: Where is the vanishing point? What is the camera height?
    
    TASK 2: APPLY VALIDATION CHECKS
    ${COMPREHENSIVE_VALIDATION_RULES}
    
    TASK 3: WINDOW TREATMENT STRATEGY
    ${CURTAIN_RULES}
    - Selected Curtain Style: "${curtainDef}"
    - INSTRUCTION: If windows are detected, explicitly include these curtains in the DESIGN PLAN below.
    
    TASK 4: ROOM & STYLE SPECIFIC CHECKS
    - Room Logic: ${roomChecks}
    - Style Logic: ${styleChecks}
    
    TASK 5: DEEP INTERNET RESEARCH (Use Google Search)
    - Search for "Trending ${style} ${roomType} designs 2025".
    - Find 2-3 specific trending furniture pieces or layout concepts that are popular right now for this style.
    
    OUTPUT: A concise "Renovation Blueprint" paragraph that I will pass to a renderer.
    Format:
    "PERSPECTIVE: [Camera specs].
     CONSTRAINTS: [List specific furniture placements to AVOID to prevent blocking doors/windows].
     DESIGN PLAN: [Layout instructions based on trends, INCLUDING CURTAINS if windows exist].
     LIGHTING: [Lighting plan].
     CONFIRMATION: [State that checking rules 1-7 passed]."
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
    const curtainDef = CURTAIN_STYLES[style] || "neutral, photorealistic curtains fitting the style";

    const prompt = `You are Magic Interiors — a hyper-realistic Interior rendering AI.
    
    *** CRITICAL INPUT: ARCHITECT'S BLUEPRINT ***
    ${renovationBlueprint}
    
    *** YOUR MISSION ***
    Execute the Architect's Blueprint above on the uploaded image.
    
    ${COMPREHENSIVE_VALIDATION_RULES}
    
    *** MANDATORY WINDOW TREATMENT ***
    - IF a window is present in the image, ADD CURTAINS: ${curtainDef}.
    - CONSTRAINTS: Do NOT remove/alter the window structure.
    - PHYSICS: Curtains must be realistically mounted, fall naturally with gravity, and have correct transparency/shadows.
    
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
    - Final Quality Score: Must be > 95/100 on realism check.
    
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