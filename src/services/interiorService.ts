
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

// Micro-Prompts for Room Types
export const ROOM_PROMPTS: Record<string, string> = {
    // Residential
    'Living Room': `Focus on comfort, seating arrangement, and natural movement flow. Maintain clear pathways. Center the composition around a sofa, coffee table, or focal wall. Lighting should be layered: ambient + task + accent. Avoid oversized décor and ensure all furniture scales correctly to the room.`,
    'Bedroom': `Prioritize calmness and privacy. Bed placement should never block a door or window path. Keep balanced symmetry around the bed. Use soft lighting, warm tones, and minimal clutter. Ensure bedside tables, wardrobe space, and walking clearance are realistic.`,
    'Kitchen': `Respect existing counters, sinks, and built-in appliances. Never change plumbing or gas points unless asked. Keep work triangle logic efficient (sink–stove–fridge distance). Use practical materials and realistic cabinet dimensions. Avoid blocking cabinets with furniture.`,
    'Dining Room': `Center the dining table as the main anchor. Maintain walking clearance around chairs (minimum 90 cm). Lighting should emphasize the table with pendants or warm overhead fixtures. Keep décor simple and elegant. Avoid oversized furniture that crowds the space.`,
    'Bathroom': `Respect plumbing fixtures — never move the shower, WC, or sink. Focus on materials, lighting, and accessories. Use moisture-safe textures. Keep proportions realistic for vanities, mirrors, niches, and shelves. Avoid adding non-waterproof furniture.`,
    'Home Office': `Desk placement must avoid blocking windows or doors. Keep ergonomics correct: desk height, chair height, screen distance. Add good task lighting. Maintain clean, productive layout with storage solutions placed sensibly.`,
    'Balcony/Patio': `Use weather-resistant materials. Keep layout airy and avoid crowding. Add plants, simple seating, and subtle mood lighting. Maintain railing visibility and never place large objects blocking safety zones.`,
    'Gaming Room': `Prioritize ergonomics and comfort. Use ambient RGB lighting tastefully. Ensure proper screen distance and seating height. Keep cable areas neat. Furniture must remain practical and correctly scaled.`,
    // Commercial
    'Open Workspace': `Maintain circulation pathways between pods/desks. Use ergonomic furniture. Ensure good lighting and acoustic comfort. Keep layout open and collaborative but not cluttered. Avoid placing desks blocking windows or exits.`,
    'Private Office': `Keep proportions balanced: executive desk, visitor seating, storage. Highlight professionalism with clean lines and subtle décor. Ensure desk placement faces the door or window logically. Avoid oversized items that shrink the space.`,
    'Conference Room': `Center the meeting table. Maintain equal chair spacing. Respect AV wall placement. Keep lighting even and avoid glare. Leave walking space around the table. Avoid unnecessary décor that distracts from meeting function.`,
    'Reception / Lobby': `Prioritize first impressions: clean layout, clear focal wall. Seating should not block reception desk view. Keep lighting bright and welcoming. Ensure open sightlines and avoid clutter.`,
    'Break Room': `Use practical, easy-to-clean materials. Maintain clear separation between seating and pantry zone. Avoid tight layouts. Keep lighting warm and casual.`,
    'Meeting Pod': `Ensure a compact but ergonomic setup. Seating must allow comfortable posture. Keep lighting soft but functional. Avoid adding large décor pieces that crowd the small pod.`
};

const ERROR_PREVENTION_RULES = `
- Never block doors, windows, or essential pathways with furniture.
- Maintain minimum walking clearance: 80–100 cm around main furniture pieces.
- Do not place beds directly in front of doors or in tight corners without space to walk.
- Do not attach heavy fixtures (swings, cabinets) to weak drywall; only use structural beams/walls.
- Keep furniture proportions realistic: sofa depth ~0.9m, dining table height ~0.75m, chair seat height ~0.45m.
- Maintain safe distance between stove and flammable materials.
- Lighting fixtures must be realistically supported (no floating lamps).
- Rugs must be proportioned realistically and fit under main furniture edges.
- Avoid placing electronics near sinks or water zones.
- Avoid overstuffing small rooms — keep spatial logic realistic.
- Match shadows to detected light direction; no impossible lighting.
- Respect the camera angle and vanishing points — no distorted or misaligned furniture.
- Do not change structural elements unless user explicitly asks.
- Keep décor at believable human heights (artwork ~1.5m center from floor).
- Maintain ergonomic desk setups: monitor at eye level, chair under desk clearance, proper leg room.
`;

// Combined Logic for specific high-priority pairings
const COMBO_PROMPTS: Record<string, string> = {
    'Living Room_Modern': `Use a clean seating arrangement, neutral palette, sleek low-profile sofa, modern coffee table, soft indirect lighting, and minimal décor. Maintain symmetry and comfort while keeping the space open.`,
    'Living Room_Traditional Indian': `Use carved wood furniture, earthy tones, handwoven fabrics, brass accents, and warm ambient lighting. Keep seating practical and avoid overpowering patterns. Maintain clear pathways.`,
    'Living Room_Industrial': `Expose textures like brick, concrete, or metal. Use bold furniture with dark tones. Add industrial lighting fixtures and simple rugs. Keep layout functional and uncluttered.`,
    'Living Room_Coastal': `Light woods, airy whites, sea-blue accents. Use soft fabrics, minimal décor, and natural light emphasis. Keep everything bright, breezy, and relaxed.`,
    'Bedroom_Minimalist': `Keep the bed low and simple. Use soft neutral palette, clean bedding, minimal decor, and warm side lighting. Remove visual noise and maintain a calming atmosphere.`,
    'Bedroom_Luxury Executive': `Use premium materials like upholstered headboards, rich wood tones, brass accents, and layered lighting. Keep symmetry around the bed and ensure practical pathways.`,
    'Kitchen_Modern': `Use flat-panel cabinets, matte surfaces, integrated appliances, and functional lighting. Maintain efficient work triangle and avoid blocking built-in elements.`,
    'Kitchen_Japanese': `Light warm woods, beige neutrals, soft textures. Keep simple shelves, minimal decor, and smooth cabinet lines. Emphasize calmness and natural materials.`, // Japandi
    'Home Office_Creative / Artistic': `Add expressive artwork, bold accents, creative lighting, and a comfortable desk setup. Ensure ergonomics remain correct. Keep tools and storage functional.`,
    'Home Office_Modern Corporate': `Clean layout, neutral tones, organized storage, ergonomic chair, and practical lighting. Keep everything professional and clutter-free.`,
    'Open Workspace_Biophilic / Nature-Inspired': `Use plants, natural wood tones, soft lighting, and open sightlines. Prioritize comfort and acoustic balance. Maintain collaborative flow.`,
    'Conference Room_Industrial': `Use robust materials like wood-and-metal tables, industrial lighting, neutral palette, and exposed textures. Keep seating evenly spaced and the room functional.`,
    'Reception / Lobby_Luxury Executive': `Premium materials, elegant lighting, refined textures, and a strong focal wall. Maintain clean circulation and a polished first impression.`
};

export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    // 1. Assemble the Prompt
    const styleMicroPrompt = STYLE_PROMPTS[style] || `${style} style.`;
    const roomMicroPrompt = ROOM_PROMPTS[roomType] || `Functional and realistic ${roomType} layout.`;
    const comboKey = `${roomType}_${style}`;
    const comboAdvice = COMBO_PROMPTS[comboKey] ? `\nSPECIFIC PAIRING RULES:\n${COMBO_PROMPTS[comboKey]}` : "";

    const prompt = `You are Magic Interiors — a domain-specific expert architect + interior designer + CG artist.
    
    YOUR MISSION:
    Redesign the uploaded room image into a hyper-realistic, renderer-ready transformation based on the user's selection.
    
    USER SELECTION:
    - Space: ${spaceType}
    - Room: ${roomType}
    - Style: ${style}
    
    1. DEEP VISUAL ANALYSIS:
       - Identify room type & confirm user selection.
       - Detect all fixed structural elements: walls, windows, doors, beams, pillars, built-in cabinets. These are IMMUTABLE. Never move, resize, hide, or delete them.
       - Infer floor material, wall finish, ceiling type, lighting sources, sunlight direction, colour temperature.
       - Estimate room dimensions based on reference objects (door height ~2.0–2.2m, furniture scale).
       - Infer camera height, focal length, vanishing points — and preserve them 100%.
    
    2. PHYSICS & PERSPECTIVE RULES (STRICT):
       - Keep identical perspective, geometry, and proportions of the original room.
       - All furniture and elements you add must align to the same vanishing points.
       - Shadows, reflections, highlights must obey real-world light direction.
       - No impossible placements.
    
    3. DESIGN TRANSFORMATION LOGIC:
       - **STYLE RULES**: ${styleMicroPrompt}
       - **ROOM LOGIC**: ${roomMicroPrompt}
       ${comboAdvice}
       - Replace or re-arrange movable items only.
       - Add realistic furniture with correct standard dimensions and ergonomic spacing (e.g., 90cm walking clearance).
       - Respect natural movement flow.
    
    4. ERROR-PREVENTION (CHECKLIST):
       ${ERROR_PREVENTION_RULES}
    
    5. HYPER-REALISM RULES:
       - Use PBR-quality materials, 2k–4k scanned textures.
       - Add subtle imperfections: micro-scratches, light grain, natural clutter.
       - Maintain consistent white balance with original photo.
       - Use accurate depth of field for camera type.
       - Avoid over-smoothing and “AI glossy plastic” surfaces.
    
    FINAL OUTPUT:
    Generate the transformed image directly. It must be photorealistic, architecturally sound, and strictly follow the provided design style and structural constraints.`;

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
