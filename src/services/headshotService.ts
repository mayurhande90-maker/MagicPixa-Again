
import { Modality, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
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
    'Medical': 'Lighting Setup: "High Key". Bright, even illumination. No dark shadows. Communicates cleanliness and trust. Color Grade: Sterile whites and soft cyans. Attire: Pristine white coat or scrubs.',
    'Legal': 'Lighting Setup: "Split Lighting" (Subtle). Side lighting to show strength and solidity, but filled in to remain professional. Color Grade: Traditional, rich wood tones or neutral greys. Attire: Formal business suit, tie/scarf.',
    'Realtor': 'Lighting Setup: "Butterfly/Paramount". High frontal light (beauty dish) to highlight cheekbones and create a butterfly shadow under the nose. Flattering and friendly. Color Grade: Warm, inviting, vibrant. Attire: Smart business casual, approachable.'
};

const ENVIRONMENT_PHYSICS: Record<string, string> = {
    'Studio Grey': 'Background: Infinite seamless matte grey paper (#808080). Physics: Light fall-off is gradual. No background distractions.',
    'Modern Office': 'Background: Depth-of-field (f/1.8) blur of a glass-walled office. Physics: Specular highlights from overhead track lighting. Cool ambient light.',
    'City Skyline': 'Background: Out-of-focus city bokeh at "Blue Hour" (twilight). Physics: Mixed lighting—Warm key light on face vs Cool ambient city light in background.',
    'Library': 'Background: Blurred mahogany shelves and books. Physics: Warm tungsten practical lamps (2700K). Cozy, intellectual atmosphere.',
    'Outdoor Garden': 'Background: Soft green foliage with sun flares (Golden Hour). Physics: Backlit by the sun (Hair light), soft bounce fill on the face.'
};

/**
 * PASS 1: STRATEGIC REASONING (Intent Extraction)
 * Analyzes the user's free-form "Additional Details" to extract specific prop, vibe, and expression requests.
 */
const performIntentReasoning = async (ai: any, description: string): Promise<string> => {
    if (!description || description.trim().length < 2) return "";
    
    const prompt = `You are a Visual Effects Supervisor. Analyze this user request for a professional headshot: "${description}"
    
    Extract and categorize the intent into:
    1. **PROP INJECTION**: (e.g. "Aviator sunglasses", "Red baseball cap"). Specify precisely where it should sit on the body based on human anatomy.
    2. **VIBE OVERRIDE**: (e.g. "Vintage polaroid", "Cyberpunk").
    3. **EXPRESSION SHIFT**: (e.g. "Winking", "Confident smirk").
    
    **CRITICAL**: If the user asks for a prop like glasses or a cap, provide instructions to GROUND the prop to biometrics. 
    Example: "Place the black beanie precisely on the hairline, ensuring it casts a realistic shadow on the forehead."
    
    Return a concise technical directive for a generative AI model.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: description
        });
        return response.text || "";
    } catch (e) {
        console.warn("Reasoning pass failed", e);
        return description;
    }
};

// Phase 1: The "Digital Twin" Scan
const performDeepIdentityScan = async (ai: any, base64: string, mimeType: string, label: string = "Subject"): Promise<string> => {
    const prompt = `ACT AS A FORENSIC BIOMETRIC ANALYST.
    
    Target: ${label}
    
    Perform a "Digital Twin" scan of this face. I need a precision map of Immutable vs Mutable features.
    
    1. **IMMUTABLE GEOMETRY (DO NOT CHANGE)**:
       - **Face Shape**: Exact jawline angle, chin width, cheekbone prominence.
       - **Eye Metrics**: Eye shape (hooded/almond/round), distance between eyes, canthal tilt.
       - **Nose Topology**: Bridge width, tip rotation, nostril flare.
       - **Mouth**: Lip fullness, cupid's bow shape.
       
    2. **SURFACE DETAILS (PRESERVE)**:
       - **Skin**: Undertone (Cool/Warm/Olive), Texture (Freckles, Moles, Birthmarks - list specific locations). 
       - **Age**: Estimate exact age range. Do NOT de-age.
       
    3. **GROOMING & STYLE (ADAPT)**:
       - **Hair**: Current length, texture (curly/straight), hairline recession pattern.
       - **Facial Hair**: Beard/stubble density and pattern.
       - **Accessories**: Glasses (Shape/Rim). If present, they MUST remain.
       
    Output a concise, clinical paragraph describing these features to ensure a 1:1 likeness.`;

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
        // 1. Optimize Images (High Res)
        const { data: optData, mimeType: optMime } = await optimizeImage(base64ImageData, mimeType);
        
        let partnerData = null;
        let partnerMime = null;
        let biometricsPartner = "";

        // 2. Multi-Pass Reasoning (Parallel Processing)
        const [biometricsA, extractedIntent] = await Promise.all([
            performDeepIdentityScan(ai, optData, optMime, "Person A (Main)"),
            performIntentReasoning(ai, customDescription || "")
        ]);

        // 3. Handle Partner (Duo Mode)
        if (partnerBase64 && partnerMimeType) {
            const optPartner = await optimizeImage(partnerBase64, partnerMimeType);
            partnerData = optPartner.data;
            partnerMime = optPartner.mimeType;
            biometricsPartner = await performDeepIdentityScan(ai, partnerData, partnerMime, "Person B (Partner)");
        }

        // 4. Retrieve Physics Configs
        const lightingPhysics = ARCHETYPE_LIGHTING[archetype] || ARCHETYPE_LIGHTING['Executive'];
        
        let envPhysics = "";
        if (background === 'Custom') {
            // Background variable used as custom prompt here - but in the UI flow 'background' is the ID
            // For 'Custom' ID, we'd normally have a separate field, but using the existing param for simplicity
            envPhysics = `Background: "A professional cinematic environment". Physics: Realistic environmental lighting matching this scene.`;
        } else {
            envPhysics = ENVIRONMENT_PHYSICS[background] || ENVIRONMENT_PHYSICS['Studio Grey'];
        }

        // 5. Construct The Master Prompt
        let prompt = `
        *** WORLD CLASS HEADSHOT PROTOCOL (2025 STANDARD) ***
        You are Platon (World Famous Portrait Photographer). Create a hyper-realistic, award-winning headshot.
        
        **SUBJECT A (DIGITAL TWIN)**:
        - VISUAL SOURCE: Input Image 1.
        - **BIOMETRIC LOCK**: ${biometricsA}
        
        ${partnerData ? `
        **SUBJECT B (PARTNER)**:
        - VISUAL SOURCE: Input Image 2.
        - **BIOMETRIC LOCK**: ${biometricsPartner}
        - **COMPOSITION**: Two professionals standing shoulder-to-shoulder. Connection, confidence, partnership. Mid-shot framing.
        ` : ''}

        ${extractedIntent ? `
        *** DYNAMIC USER OVERRIDES (MAX PRIORITY) ***
        - **INTENT**: ${extractedIntent}
        - **MANDATE**: The requested props or changes must be perfectly integrated into the lighting and physics of the scene.
        ` : ''}

        **PHOTOGRAPHY PHYSICS & SETUP**:
        1. ${lightingPhysics}
        2. ${envPhysics}
        
        **CAMERA SPECS**:
        - **Lens**: 85mm Prime G-Master (The "Portrait King"). Flattering compression.
        - **Aperture**: f/2.8. Eyes razor sharp, background creamy bokeh.
        - **Film Stock**: Kodak Portra 400 simulation (Fine grain, great skin tones).
        
        **EXECUTION RULES (ZERO HALLUCINATIONS)**:
        1. **IDENTITY IS SACRED**: Do NOT change bone structure, nose shape, or eye distance. It must look exactly like the person.
        2. **TEXTURE REALISM**: Do NOT generate smooth "AI Skin". Keep skin pores, vellus hair, and natural texture. Skin must look organic, not plastic.
        3. **ACCESSORIES**: ${extractedIntent.includes('prop') ? 'Carefully render the requested props while respecting facial biometrics.' : 'If the input has glasses, KEEP THEM. If not, DO NOT ADD THEM.'}
        4. **HAIR CONSISTENCY**: Keep the hairline and hair length accurate to the input. You may style it neater, but do not grow/cut it.
        5. **EYES**: Add "Catchlights" (reflection of the light source) in the pupils to bring life to the eyes.
        
        **OUTPUT**: A photorealistic 4K portrait.
        `;

        const parts: any[] = [
            { inlineData: { data: optData, mimeType: optMime } }
        ];

        if (partnerData && partnerMime) {
             parts.push({ inlineData: { data: partnerData, mimeType: partnerMime } });
        }

        parts.push({ text: prompt });

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview', // Best model for texture/identity
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { 
                    aspectRatio: '1:1', 
                    imageSize: '1K' 
                },
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
