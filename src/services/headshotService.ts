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

// --- SIMPLIFIED PHOTOGRAPHY DIRECTIVES ---
const ARCHETYPE_LIGHTING: Record<string, string> = {
    'Executive': 'Professional studio lighting, sharp focus on eyes, clean shadows.',
    'Tech': 'Soft natural office lighting, approachable and bright.',
    'Creative': 'Cinematic edge lighting, stylish artistic contrast.',
    'Medical': 'Clean high-key lighting, bright and trustworthy.',
    'Legal': 'Formal balanced lighting, authoritative atmosphere.',
    'Realtor': 'Friendly warm lighting, bright and welcoming.'
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
    
    1. **FACIAL MAPPING**: Describe the exact jawline, nose bridge shape, and chin curvature.
    2. **EYE IDENTITY**: Note the eyelid type, pupil position, and eyebrow arch.
    3. **HAIR PROTOCOL**: Identify the exact hairline, hair texture (curl/straight), and length.
    
    MANDATE: This description is a SACRED IDENTITY ANCHOR. You will use this to ensure the final result is a 1:1 physical match.`;

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

        // --- MASTER ACCURACY PROMPT ---
        // We use a "Sacred Identity Transfer" protocol to force Gemini to use the face as a template.
        const prompt = `
        *** SACRED IDENTITY TRANSFER PROTOCOL (V4) ***
        TASK: Create a professional ${archetype} headshot for the person in the image.
        
        **CRITICAL IDENTITY LOCK**:
        - **BIOMETRICS**: ${biometricsA}
        ${partnerData ? `- **PARTNER BIOMETRICS**: ${biometricsPartner}` : ''}
        
        **STRICT EXECUTION RULES**:
        1. **PIXEL TRANSFER**: Treat the source face as an absolute template. Do NOT "improve", "smooth", or change the person's features. The face in the result MUST be a 1:1 structural replica of the uploaded photo.
        2. **BONE & HAIR**: Keep the exact jawline, nose shape, and hair texture. Do NOT hallucinate a generic AI model face.
        3. **PHOTOGRAPHY**: Use ${lighting} in a ${env}.
        4. **FIDELITY**: Render real skin texture (pores and lines). No "plastic" or "perfected" look.

        OUTPUT: A single 4K hyper-realistic professional portrait. The subject MUST look exactly like the original upload.
        `;

        const parts: any[] = [
            { text: "PRIMARY SUBJECT TEMPLATE (PIXEL SOURCE):" },
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ text: "PARTNER SUBJECT TEMPLATE (PIXEL SOURCE):" });
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
        throw new Error("AI Engine failed to render. Please try a clearer photo.");

    } catch (error) {
        console.error("Headshot error:", error);
        throw error;
    }
};