
import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1536px (High Fidelity for Headshots)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.90);
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
    'Executive': 'Lighting Setup: "Rembrandt Lighting". A key light at 45-degrees to create a triangle of light on the cheek. Dramatic, authoritative shadows. High contrast. Color Grade: Cool, desaturated blues and slate greys. Attire: Bespoke Italian wool suit.',
    'Tech': 'Lighting Setup: "Broad Softbox". Large, diffused light source directly in front. Minimal shadows, approachable and open. Color Grade: Clean whites, modern minimalism. Attire: Premium solid-color t-shirt/layering or smart casual blazer.',
    'Creative': 'Lighting Setup: "Loop Lighting" or "Rim Light". A strong backlight separating the subject from the background, creating a halo effect. Artistic and moody. Color Grade: Warm, cinematic tones. Attire: Trendy, textured fabrics, bold accessories allowed.',
    'Medical': 'Lighting Setup: "High Key / Clinical". Bright, even illumination to signify sterile, trustworthy professionalism. Minimize shadows. Color Grade: High-clarity, balanced whites. Attire: A high-quality white medical lab coat or designer scrubs. Optional stethoscope around neck.',
    'Legal': 'Lighting Setup: "Split Lighting" (Subtle). Side lighting to show strength and solidity, but filled in to remain professional. Color Grade: Traditional, rich wood tones or neutral greys. Attire: Formal business suit, tie/scarf.',
    'Realtor': 'Lighting Setup: "Paramount Lighting / Beauty Dish". High frontal light to highlight cheekbones and create a flattering, friendly appearance. Warm, vibrant color temperature. Attire: Sharp business-casual or semi-formal blazer. Polished and approachable look.'
};

const ENVIRONMENT_PHYSICS: Record<string, string> = {
    // STANDARD STUDIO
    'Studio Photoshoot': 'Background: A professional photography studio with a clean, seamless solid backdrop in neutral grey or matte black. Physics: High-end studio strobe lighting with soft modifiers. Clean subject isolation.',
    
    // EXECUTIVE
    'Modern Office': 'Background: Depth-of-field (f/1.8) blur of a high-end glass-walled office. Physics: Specular highlights from track lighting. Cool ambient light.',
    'Meeting Room': 'Background: Blurred professional boardroom table and leather chairs. Physics: Soft overhead office lighting.',
    'Building Lobby': 'Background: Large-scale architectural marble or glass lobby (blurred). Physics: Massive natural light from large windows.',
    'Plain Studio': 'Background: Infinite seamless matte grey paper (#808080). Physics: Light fall-off is gradual. No distractions.',

    // TECH
    'Startup Office': 'Background: Casual open-plan tech office with colorful furniture and glass walls (blurred). Physics: Mixed natural and artificial light.',
    'Server Room': 'Background: Futuristic server racks with glowing blue/green LED indicators (blurred). Physics: High-tech low-key lighting.',
    'Cool Lounge': 'Background: Stylish co-working lounge with designer chairs and plants (blurred). Physics: Soft warm accent lighting.',
    'City Street': 'Background: Out-of-focus modern city buildings at "Blue Hour". Physics: Cool ambient city light mixed with warm key light.',

    // CREATIVE
    'Art Studio': 'Background: Blurred workspace with canvases, easels, and creative tools. Physics: Natural north-facing window light.',
    'Photo Gallery': 'Background: High-key white gallery walls with blurred artwork. Physics: Clean, bright exhibition lighting.',
    'Modern Loft': 'Background: Home-office with exposed brick walls and large industrial windows (blurred). Physics: High-contrast daylight.',
    'Green Garden': 'Background: Soft green foliage with sun flares (Golden Hour). Physics: Backlit by the sun (Hair light).',

    // MEDICAL
    'Clean Clinic': 'Background: Bright, sterile, and professional medical suite. Physics: Even, high-key clinical lighting.',
    'Doctor\'s Room': 'Background: Private office with medical bookshelves and charts (blurred). Physics: Trustworthy, warm environment lighting.',
    'Bright Studio': 'Background: Pure white seamless studio backdrop. Physics: Ultra-bright, high-clarity clinical white lighting.',
    'Health Center': 'Background: Modern, welcoming wellness center with natural wood accents. Physics: Soft, calming natural light.',

    // LEGAL
    'Book Library': 'Background: Dark mahogany floor-to-ceiling bookshelves filled with leather-bound books. Physics: Warm, intellectual tungsten lighting.',
    'Classic Boardroom': 'Background: Traditional boardroom with dark wood panels and leather furniture. Physics: Formal, authoritative lighting.',
    'Formal Office': 'Background: Structured, high-end business room with a view of a financial district (blurred). Physics: Sharp, precise office lighting.',
    'Courthouse': 'Background: Classical stone pillars or marble courthouse corridors (blurred). Physics: Grand, ambient light.',

    // REALTOR
    'Living Room': 'Background: High-end, comfortable luxury home interior. Physics: Warm, inviting residential lighting.',
    'Modern Kitchen': 'Background: Bright, airy, and modern domestic kitchen. Physics: Clean natural daylight from large windows.',
    'Outside House': 'Background: Blurred view of a manicured lawn and high-end home exterior. Physics: Outdoor natural daylight.',
    'Nice Street': 'Background: Friendly, upscale residential tree-lined road. Physics: Vibrant, warm natural sunlight.'
};

/**
 * PHASE 1: PERSONA RESEARCH (Grounding)
 * Uses Google Search to find current 2025 standards for the specific persona.
 */
const performPersonaResearch = async (ai: any, archetype: string): Promise<string> => {
    const prompt = `Research current 2025 professional standards for a "${archetype}" headshot. 
    Look for: 1. Current trending attire. 2. Most professional-looking backgrounds. 3. Lighting styles used by top photographers for this industry.
    Return a concise "Aesthetic Blueprint" for this industry.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text || "";
    } catch (e) {
        console.warn("Persona research failed, using defaults", e);
        return "";
    }
};

/**
 * PASS 2: STRATEGIC REASONING (Intent Extraction)
 * Analyzes the user's free-form "Additional Details" to extract specific prop, vibe, and expression requests.
 */
const performIntentReasoning = async (ai: any, description: string): Promise<string> => {
    if (!description || description.trim().length < 2) return "";
    
    const instructions = `You are a Visual Effects Supervisor. Analyze this user request for a professional headshot: "${description}"
    
    Extract and categorize the intent into:
    1. **PROP INJECTION**: (e.g. "Aviator sunglasses", "Red baseball cap").
    2. **VIBE OVERRIDE**: (e.g. "Vintage polaroid", "Cyberpunk").
    3. **EXPRESSION SHIFT**: (e.g. "Winking", "Confident smirk").
    
    Return a concise technical directive for a generative AI model.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: instructions + "\n\nUser Input: " + description
        });
        return response.text || "";
    } catch (e) {
        console.warn("Reasoning pass failed", e);
        return description;
    }
};

// Phase 3: The "Digital Twin" Scan
const performDeepIdentityScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `ACT AS A FORENSIC BIOMETRIC ANALYST. Target: ${label}.
    Perform a "Digital Twin" scan. Identify: 
    1. **IMMUTABLE GEOMETRY**: Jawline angle, chin width, cheekbone structure. Eye shape (eyelid type, canthal tilt). Nose topology (bridge, tip rotation).
    2. **SURFACE DETAILS**: Skin undertone, specific textures (freckles, moles), hairline and hair texture.
    
    MANDATE: The output MUST be a strict 1:1 replica of these pixels. DO NOT modify the identity.`;

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

        // 1. Parallel Research & Analysis
        const [biometricsA, extractedIntent, personaAesthetic] = await Promise.all([
            performDeepIdentityScan(ai, optData, optMime, "Person A (Main)"),
            performIntentReasoning(ai, customDescription || ""),
            performPersonaResearch(ai, archetype)
        ]);

        if (partnerBase64 && partnerMimeType) {
            const optPartner = await optimizeImage(partnerBase64, partnerMimeType);
            partnerData = optPartner.data;
            partnerMime = optPartner.mimeType;
            biometricsPartner = await performDeepIdentityScan(ai, partnerData, partnerMime, "Person B (Partner)");
        }

        const lightingPhysics = ARCHETYPE_LIGHTING[archetype] || ARCHETYPE_LIGHTING['Executive'];
        const envPhysics = background === 'Custom' 
            ? `Background: "A professional cinematic environment". Physics: Realistic environmental lighting matching this scene.` 
            : (ENVIRONMENT_PHYSICS[background] || ENVIRONMENT_PHYSICS['Studio Photoshoot']);

        // 2. Construct The Master Prompt
        let prompt = `
        *** WORLD CLASS HEADSHOT PROTOCOL (2025 PRODUCTION) ***
        SESSION ID: ${requestId}
        
        **IDENTITY LOCK (SACRED MANDATE)**:
        - **SUBJECT A**: ${biometricsA}
        ${partnerData ? `- **SUBJECT B**: ${biometricsPartner}` : ''}
        - **MANDATE**: TREAT FACIAL PIXELS AS READ-ONLY. DO NOT CHANGE face shape, nose, eyes, mouth, hair length/texture, or skin tone. It must be a 1:1 physical twin of the user.
        
        **PERSONA PRODUCTION BRIEF (${archetype})**:
        - **TREND DATA**: ${personaAesthetic}
        - **LIGHTING**: ${lightingPhysics}
        - **ENVIRONMENT**: ${envPhysics}
        
        ${extractedIntent ? `**USER DIRECTION**: ${extractedIntent}` : ''}

        **CAMERA ENGINE**:
        - Lens: 85mm f/1.4. Sharp subject, creamy bokeh.
        - Skin Rendering: Real skin pores, vellus hair, fine lines. NO plastic/smooth AI textures.
        - Catchlights: Small glints in pupils to bring life to the eyes.

        OUTPUT: A single 4K photorealistic image of the subject(s) in professional attire.
        `;

        const parts: any[] = [
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
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
        throw new Error("No image generated.");

    } catch (error) {
        console.error("Error generating headshot:", error);
        throw error;
    }
};
