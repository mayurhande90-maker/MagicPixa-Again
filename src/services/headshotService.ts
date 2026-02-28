import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1024px (Balanced for Flash model)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85); 
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// --- PROFESSIONAL PHOTOGRAPHY RIG ARCHETYPES ---
const ARCHETYPE_LIGHTING: Record<string, string> = {
    'Executive': 'Rembrandt Lighting Protocol (45-degree key), high-fidelity rim light for subject separation, sharp ocular catchlights.',
    'Tech': 'Phase One North-Facing Window simulation, soft directional daylight, high-key finish with neutral shadows.',
    'Creative': 'Cinematic Low-Key aesthetic, blue-hour rim light accents, dramatic depth-of-field, artistic high-contrast production.',
    'Medical': 'Butterfly/Paramount lighting, high-key sterile clean studio rig, shadowless trustworthy presentation, 5500K temperature.',
    'Legal': 'Broad Studio Lighting, authoritative high-prestige rig, traditional balanced exposure, wood-paneling global illumination spill.',
    'Realtor': 'Golden Hour approach, friendly natural outdoor rig, warm light-bleed, bright approachable exposure.'
};

const ENVIRONMENT_PHYSICS: Record<string, string> = {
    'Studio Photoshoot': 'Professional studio, clean solid grey background.',
    'Modern Office': 'Sleek corporate office background with soft bokeh.',
    'Meeting Room': 'Modern boardroom background (blurred).',
    'Building Lobby': 'Elegant glass building lobby (blurred).',
    'Personal Cabin': 'Private executive desk background (blurred).',
    'Startup Office': 'Casual collaborative tech space background.',
    'Server Room': 'Data center with glowing tech racks.',
    'Cool Lounge': 'Designer lounge with greenery.',
    'City Street': 'Urban city background at blue hour.',
    'Art Studio': 'Bright creative workspace.',
    'Photo Gallery': 'Minimalist gallery walls.',
    'Modern Loft': 'Industrial living space with large windows.',
    'Green Garden': 'Lush garden background with natural sunlight.',
    'Clean Clinic': 'Bright professional medical setting.',
    'Doctor\'s Room': 'Private consult room with medical bookshelf.',
    'Bright Studio': 'Pure white studio backdrop.',
    'Health Center': 'Wellness hub with natural wood accents.',
    'Book Library': 'Sophisticated library with leather books.',
    'Classic Boardroom': 'Traditional wood-paneled room.',
    'Formal Office': 'High-rise skyscraper office view.',
    'Courthouse': 'Marble halls and stone pillars.',
    'Living Room': 'Upscale home interior.',
    'Modern Kitchen': 'Bright marble kitchen space.',
    'Outside House': 'Nice residential home exterior.',
    'Nice Street': 'Tree-lined residential street.'
};

/**
 * PHASE 1: IDENTITY LOCK 4.0 (FORENSIC AUDIT)
 * Maps skin geometry, undertones, and ocular patterns.
 */
const performDeepIdentityScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `ACT AS A FORENSIC BIOMETRIC ANALYST. 
    Perform an Identity Lock 4.0 Audit on the ${label}.
    
    1. **SKIN GEOMETRY & UNDERTONE**: Map the exact pore distribution, subtle freckles, and specific skin undertones. 
    2. **OCULAR FIDELITY**: Precisely describe the eyelid fold depth, iris pattern density, and canthal tilt. 
    3. **BONE TOPOLOGY**: Map the exact cheekbone height, jawline taper, and temple width. 
    4. **MICRO-TEXTURES**: Note unique fine lines, natural asymmetry, and facial hair grain.
    5. **MANDATE**: This is a SACRED IDENTITY ANCHOR. You must ensure the generated output is a 1:1 biometric clone. Any beautification or generic "improvement" is a failure of identity integrity.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview', 
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: prompt }
                ]
            },
            featureName: 'Headshot Identity Scan'
        });
        return response.text || "Preserve facial structure exactly.";
    } catch (e) {
        return "Preserve facial structure exactly.";
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
        const { data: optData, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType);
        
        // Step 1: Identity Lock 4.0 Biometric Audit
        const biometricsA = await performDeepIdentityScan(ai, optData, optMime, "Primary Subject");

        let partnerData = null;
        let partnerMime = null;
        let biometricsPartner = "";

        if (partnerBase64 && partnerMimeType) {
            const optPartner = await optimizeImage(partnerBase64, partnerMimeType);
            partnerData = optPartner.data;
            partnerMime = optPartner.mimeType;
            biometricsPartner = await performDeepIdentityScan(ai, partnerData, partnerMime, "Partner Subject");
        }

        const lighting = ARCHETYPE_LIGHTING[archetype] || ARCHETYPE_LIGHTING['Executive'];
        const env = background === 'Custom' ? customDescription : (ENVIRONMENT_PHYSICS[background] || ENVIRONMENT_PHYSICS['Studio Photoshoot']);

        // --- MASTER PRODUCTION PROMPT (IDENTITY LOCK 4.0) ---
        const prompt = `
        *** PRODUCTION ENGINE: IDENTITY LOCK 4.0 (SACRED ASSET PROTOCOL) ***
        TASK: Generate a world-class professional portrait for the provided templates.
        
        **MANDATE 1: SUB-SURFACE INTEGRITY (NO SMOOTHING)**
        - Render micro-pores, natural skin moisture, and fine lines. 
        - STRICT NO-SMOOTHING RULE: Any attempt to airbrush or "AI-beautify" the subject's face into a generic model is strictly forbidden.
        - Render "flyaway" hair strands and natural hair textures (1:1 with source).
        
        **MANDATE 2: OCULAR SOUL LOCK**
        - Maintain the exact eyelid geometry and iris depth of the subjects.
        - Ensure "The Soul of the Eyes" remains identical to the source photo.
        
        **MANDATE 3: FABRIC PHYSICS & GROOMING SYNC**
        - **WARDROBE**: Generate professional attire in ${archetype} style. Calculate realistic fabric drape and weight based on the subject's shoulder topology.
        - **GROOMING**: Sync facial hair (beards, stubble) exactly with the source grain.
        
        **BIOMETRIC AUDIT FEED:**
        - **PRIMARY DATA**: ${biometricsA}
        ${partnerData ? `- **PARTNER DATA**: ${biometricsPartner}` : ''}
        
        **PHOTOGRAPHY RIG**:
        - **OPTICS**: 8K High-Pass Resolution, 85mm Prime Lens (f/1.2).
        - **LIGHTING**: ${lighting}.
        - **ENVIRONMENT**: ${env}. Include global illumination bleed from the background onto the subject's attire.
        
        OUTPUT: A single 4K hyper-realistic headshot. The subject MUST be 100% recognizable as the source template.
        `;

        const parts: any[] = [
            { text: "IMMUTABLE SOURCE TEMPLATE (PRIMARY):" },
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ text: "IMMUTABLE SOURCE TEMPLATE (PARTNER):" });
             parts.push({ inlineData: { data: partnerData, mimeType: partnerMime } });
        }

        parts.push({ text: prompt });

        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                // FIX: aspectRatio must be inside imageConfig in GenerateContentParameters
                imageConfig: {
                    aspectRatio: '1:1',
                    imageSize: '2K'
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
            featureName: 'Professional Headshot Generation'
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Identity-lock engine failed. Please use a clearer, well-lit photo.");

    } catch (error) {
        console.error("Headshot error:", error);
        throw error;
    }
};