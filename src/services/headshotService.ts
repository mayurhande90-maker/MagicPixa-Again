
import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1536px (High Fidelity for Headshots)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.95); // Increased quality to 95%
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// --- PHOTOGRAPHY PHYSICS ENGINE ---
const ARCHETYPE_LIGHTING: Record<string, string> = {
    'Executive': 'Lighting: "Classic Rembrandt". Key light at 45° for character depth. Fill light at 20% to soften shadows without losing authority. Catchlights in eyes are precise circular glints.',
    'Tech': 'Lighting: "Large Window Softbox". Broad, even, diffused illumination. Soft shadows, approachable and bright. High clarity on eyes and skin textures.',
    'Creative': 'Lighting: "Cinematic Edge". Strong rim light to separate hair from background. Warm key light with cool fill. Artistic contrast that highlights creative intent.',
    'Medical': 'Lighting: "Sterile High-Key". Ultra-bright, even lighting. Neutral whites. Shadows are practically non-existent to project cleanliness and high-trust.',
    'Legal': 'Lighting: "Authoritative Split". Side-focused lighting to emphasize structure and seriousness. Deep but legible shadows. Traditional corporate color grading.',
    'Realtor': 'Lighting: "Beauty Dish Glow". Flattering frontal light. Vibrant skin tones. Warm, friendly highlights that make the subject pop against residential backgrounds.'
};

const ENVIRONMENT_PHYSICS: Record<string, string> = {
    'Studio Photoshoot': 'Environment: Professional infinity cove studio. Background: Pure matte seamless backdrop in Neutral Grey or Matte Black. Focus: Zero distractions. Subject isolation 100%.',
    'Modern Office': 'Environment: High-end corporate office with floor-to-ceiling glass. Background: Soft Gaussian blur (f/1.8). Physics: Linear specular highlights from office track lights.',
    'Meeting Room': 'Environment: Executive boardroom. Background: Blurred mahogany table and ergonomic leather chairs. Physics: Soft overhead diffused fluorescent lighting.',
    'Building Lobby': 'Environment: Architectural glass lobby. Background: Grand marble surfaces and soaring ceilings (blurred). Physics: Large-scale natural daylight bouncing off polished floors.',
    'Plain Studio': 'Environment: Minimalist studio. Background: Solid color paper roll with gentle light fall-off. Physics: Pure focus on the subject silhouette.',
    'Startup Office': 'Environment: Casual tech hub. Background: Open-plan space with plants and colorful furniture (blurred). Physics: Mixed natural and warm LED task lighting.',
    'Server Room': 'Environment: High-tech data center. Background: Glowing blue/green server racks. Physics: Low-key atmospheric lighting with technological accents.',
    'Cool Lounge': 'Environment: Designer co-working space. Background: Mid-century furniture and greenery. Physics: Warm, cozy accent lighting.',
    'City Street': 'Environment: Modern urban street. Background: Bokeh city buildings at blue hour. Physics: Cool ambient sky light mixed with warm street glow.',
    'Art Studio': 'Environment: Creative workspace. Background: Canvas, easels, and brushes. Physics: Natural north-facing window light.',
    'Photo Gallery': 'Environment: Modern art gallery. Background: Minimalist white walls with blurred frames. Physics: Clean exhibition track lighting.',
    'Modern Loft': 'Environment: Industrial living/work space. Background: Exposed brick and large factory windows. Physics: High-contrast directional daylight.',
    'Green Garden': 'Environment: Lush outdoor space. Background: Vibrant foliage with golden sun flares. Physics: Backlit sun serving as a natural hair light.',
    'Clean Clinic': 'Environment: Modern medical suite. Background: White medical partitions and equipment (blurred). Physics: Clinical high-clarity lighting.',
    'Doctor\'s Room': 'Environment: Private consultation room. Background: Medical journals and degree frames. Physics: Warm, professional atmosphere.',
    'Bright Studio': 'Environment: High-key medical studio. Background: Pure white seamless. Physics: Intense illumination for maximum clarity.',
    'Health Center': 'Environment: Modern wellness hub. Background: Zen wood textures and plants. Physics: Soft, calming natural light.',
    'Book Library': 'Environment: Private law library. Background: Rows of leather-bound books. Physics: Warm tungsten lighting for an intellectual glow.',
    'Classic Boardroom': 'Environment: Traditional wood-paneled room. Background: Heavy drapes and dark oak. Physics: Low-key formal lighting.',
    'Formal Office': 'Environment: Financial district skyscraper office. Background: Distant city skyline through glass. Physics: Sharp, morning office light.',
    'Courthouse': 'Environment: Neo-classical architecture. Background: Stone pillars and marble hallways. Physics: Grand, diffused ambient light.',
    'Living Room': 'Environment: Luxury home. Background: High-end interior design. Physics: Warm residential lighting with soft shadows.',
    'Modern Kitchen': 'Environment: Bright kitchen space. Background: Marble counters and high-end appliances. Physics: Clean daylight from kitchen windows.',
    'Outside House': 'Environment: Residential facade. Background: Landscaped front yard and nice home exterior. Physics: Direct outdoor sunlight.',
    'Nice Street': 'Environment: Upscale residential road. Background: Tree-lined street and sidewalk. Physics: Vibrant natural sunlight.'
};

/**
 * PHASE 1: FORENSIC BIOMETRIC SCAN
 * This step defines the "Identity Anchor" that prevents the AI from changing the user's face.
 */
const performDeepIdentityScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `ACT AS A FORENSIC BIOMETRIC ANALYST.
    Perform a "DNA-Level" visual scan of the ${label}.
    
    CRITICAL FIELDS TO EXTRACT:
    1. **BONE STRUCTURE**: Exact jawline sharpness, chin width, and cheekbone prominence. Note any slight facial asymmetry.
    2. **EYE IDENTITY**: Eyelid type (mono, double), canthal tilt, iris position, and exact eyebrow arch/thickness.
    3. **NOSE & MOUTH**: Bridge width, nostril shape, lip fullness, and the specific shape of the cupid's bow.
    4. **HAIR ARCHITECTURE**: Exact hair texture (curl pattern, thickness), hairline shape, parting position, and how hair flows around the ears/forehead.
    5. **MICRO-DETAILS**: Presence of moles, freckles, unique skin textures, or scars.
    
    MANDATE: This description will be used as a structural anchor. The output must be a 1:1 physical twin.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Standard facial structure.";
    } catch (e) {
        console.warn("Biometric analysis failed", e);
        return "Standard facial structure.";
    }
};

/**
 * PHASE 2: INTENT REASONING
 */
const performIntentReasoning = async (ai: any, description: string): Promise<string> => {
    if (!description || description.trim().length < 2) return "";
    const instructions = `VFX Supervisor: Extract specific prop or vibe requests from: "${description}". Direction: "Add glasses", "Smiling", etc.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: instructions + "\n\nUser Input: " + description
        });
        return response.text || "";
    } catch (e) { return description; }
};

export const generateProfessionalHeadshot = async (
    base64ImageData: string,
    mimeType: string,
    archetype: string,
    background: string,
    customDescription?: string,
    partnerBase64?: string,
    partnerMimeType?: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const { data: optData, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType);
        
        let partnerData = null;
        let partnerMime = null;
        let biometricsPartner = "";

        // Parallel Analysis for maximum speed and accuracy
        const [biometricsA, extractedIntent] = await Promise.all([
            performDeepIdentityScan(ai, optData, optMime, "Person A (Main)"),
            performIntentReasoning(ai, customDescription || "")
        ]);

        if (partnerBase64 && partnerMimeType) {
            const optPartner = await optimizeImage(partnerBase64, partnerMimeType);
            partnerData = optPartner.data;
            partnerMime = optPartner.mimeType;
            biometricsPartner = await performDeepIdentityScan(ai, partnerData, partnerMime, "Person B (Partner)");
        }

        const lightingPhysics = ARCHETYPE_LIGHTING[archetype] || ARCHETYPE_LIGHTING['Executive'];
        const envPhysics = background === 'Custom' 
            ? `Environment: Cinematic custom setting. Physics: High-end environmental lighting.` 
            : (ENVIRONMENT_PHYSICS[background] || ENVIRONMENT_PHYSICS['Studio Photoshoot']);

        // THE MASTER PRODUCTION PROMPT (2025 ELITE STANDARDS)
        let prompt = `
        *** WORLD-CLASS PROFESSIONAL HEADSHOT PROTOCOL (2025) ***
        SESSION ID: ${requestId}
        
        **IDENTITY LOCK - SACRED MANDATE (ZERO ERROR TOLERANCE)**:
        - **SUBJECT A BIOMETRICS**: ${biometricsA}
        ${partnerData ? `- **SUBJECT B BIOMETRICS**: ${biometricsPartner}` : ''}
        
        **STRICT RULES**:
        1. **NO ALTERATIONS**: Do NOT "beautify", "smooth", or "idealize" the face. Keep every wrinkle, freckle, and unique asymmetry.
        2. **FACIAL MESH**: Extract the exact facial geometry from the source. The resulting face must be a 1:1 pixel match in structure to the source.
        3. **HAIR PROTOCOL**: Preserve the exact hair texture, length, and style. If the user has messy hair, keep it. If they have a specific parting, do NOT change it.
        4. **SKIN FIDELITY**: Render real skin pores, fine lines, and natural vellus hair. NO PLASTIC/AI TEXTURES.
        
        **PRODUCTION BRIEF**:
        - **PERSONA**: ${archetype}
        - **SCENE PHYSICS**: ${envPhysics}
        - **STUDIO LIGHTING**: ${lightingPhysics}
        ${extractedIntent ? `- **USER DIRECTION**: ${extractedIntent}` : ''}

        **CAMERA SPECS**:
        - Lens: 85mm Prime f/1.2 (Portrait Master).
        - Focus: Razor-sharp focus on the iris of the eyes. Creamy background bokeh.
        - Color: Natural, professional color grade. True-to-life skin tones.

        OUTPUT: A single 4K photorealistic image of the subject(s) as an exact digital twin.
        `;

        const parts: any[] = [
            { text: "SOURCE PIXELS (PRIMARY SUBJECT):" },
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ text: "SOURCE PIXELS (SECONDARY SUBJECT):" });
             parts.push({ inlineData: { data: partnerData, mimeType: partnerMime } });
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: '1:1', imageSize: '1K' },
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
        throw new Error("AI Engine failed to render high-fidelity image. Please try again.");

    } catch (error) {
        console.error("Error generating headshot:", error);
        throw error;
    }
};
