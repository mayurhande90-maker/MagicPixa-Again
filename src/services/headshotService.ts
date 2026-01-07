import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1536px (High Fidelity for Headshots)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1536, 0.95); // High quality for identity retention
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// --- PROFESSIONAL PHOTOGRAPHY LIGHTING ARCHETYPES ---
const ARCHETYPE_LIGHTING: Record<string, string> = {
    'Executive': 'Rembrandt lighting setup, key light at 45 degrees, soft wrap-around fill, sharp catchlights in eyes.',
    'Tech': 'Natural north-facing window light, bright and clean, soft shadows, high-key high-fidelity finish.',
    'Creative': 'Cinematic low-key lighting, moody shadows, blue-hour rim light, stylish artistic contrast.',
    'Medical': 'Butterfly lighting, high-key clean studio setup, bright and trustworthy, shadowless medical suite vibe.',
    'Legal': 'Formal broad lighting, authoritative and balanced, classic wood-paneling context.',
    'Realtor': 'Friendly warm golden hour lighting, approachable and bright, natural outdoor glow.'
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
 * PHASE 1: FORENSIC BIOMETRIC SCAN
 * Identifies the immutable visual markers of the user's face.
 */
const performDeepIdentityScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `ACT AS A FORENSIC BIOMETRIC ANALYST. 
    Analyze the ${label} in the photo and provide a STERN description of their unique facial features that MUST NOT change.
    
    1. **GEOMETRIC MAPPING**: Note the exact distance between eyes, the height of the forehead, and the specific angle of the jawline.
    2. **OCULAR IDENTITY**: Describe the eyelid shape, pupil distance, and eyebrow arch height.
    3. **NASAL & ORAL STRUCTURE**: Note the width of the nose bridge and the specific curvature of the lips.
    4. **HAIR ARCHITECTURE**: Identify the exact hairline, the density/volume of hair, and its natural texture.
    5. **BODY TOPOLOGY**: Note the neck thickness and shoulder-to-head ratio.
    
    MANDATE: This description is a SACRED GEOMETRIC ANCHOR. You will use this to ensure the final result is a 1:1 physical replica. No "improvement" allowed.`;

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
        
        // Step 1: Lock Identity via Biometric Scan
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

        // --- MASTER ACCURACY PROMPT (STRUCTURAL LOCK) ---
        const prompt = `
        *** FORCED IDENTITY PRESERVATION PROTOCOL (V6) ***
        TASK: Create a professional portrait of the person provided in the source image.
        
        **CORE MANDATE: 1:1 STRUCTURAL INTEGRITY**
        1. **GEOMETRIC TEMPLATE**: Use the source image as a physical template. You are FORBIDDEN from altering the person's bone structure, head shape, jawline, or facial proportions.
        2. **ZERO CREATIVITY FOR FACE/BODY**: Do NOT "enhance", "beautify", or "smooth" the subject. The person in the output must be the EXACT digital twin of the source. No changes to weight, age, or feature size.
        3. **HAIR & HAIRLINE**: Copy the exact hairline and hair volume from the source. Do NOT hallucinate a different hairstyle or fuller hair.
        4. **PHOTOGRAPHIC CLOAKING**: Think of this as "clothing the person" in a new environment. Keep the person identical; only generate the new professional attire (${archetype} style) and the background (${env}).
        
        **BIOMETRIC DATA LOCK**:
        - **PRIMARY BIOMETRICS**: ${biometricsA}
        ${partnerData ? `- **PARTNER BIOMETRICS**: ${biometricsPartner}` : ''}
        
        **PHOTOGRAPHY SPECS**:
        - **GEAR**: Sony A7R V with 85mm f/1.2 G-Master.
        - **LIGHTING**: ${lighting}.
        - **TEXTURE**: Render real skin pores, fine lines, and natural facial hair. Avoid "plastic" or "synthetic" AI skin.
        
        OUTPUT: A single 4K photorealistic headshot. The subject MUST be 100% recognizable as the source individual.
        `;

        const parts: any[] = [
            { text: "SACRED SUBJECT TEMPLATE (IMMUTABLE PIXELS):" },
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ text: "SACRED PARTNER TEMPLATE (IMMUTABLE PIXELS):" });
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
        throw new Error("Identity-lock engine failed to render. Please ensure your photo is clear.");

    } catch (error) {
        console.error("Headshot error:", error);
        throw error;
    }
};