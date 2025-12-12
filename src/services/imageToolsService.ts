
import { Modality } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize to 1280px (HD) for Gemini 3 Pro
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

// Specific optimizer for High-Res Editing (1536px) to avoid pixelation
const optimizeImageForEditing = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        // Use 1536px and higher quality for detailed inpainting
        const resizedUri = await resizeImage(dataUri, 1536, 0.95);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Editing optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

// --- PROMPT MAPPINGS FOR PIXA TOGETHER ---
const MOOD_PROMPTS: Record<string, string> = {
    'Happy': 'Bright, cheerful, high-key lighting, genuine smiles, warm color temperature, vibrant and energetic atmosphere.',
    'Cinematic': 'Dramatic lighting, high contrast, anamorphic lens look, movie-still aesthetic, deep teal and orange color grading, emotional depth.',
    'Romantic': 'Soft focus, dreamy backlight, golden hour glow, intimate atmosphere, warm pastel tones, gentle bokeh.',
    'Vintage': 'Film grain texture, sepia or desaturated tones, 90s aesthetic, nostalgic feel, slightly soft sharpness like analog photography.',
    'Luxury': 'High-end fashion editorial style, polished, elegant, sharp focus, rich textures, sophisticated lighting.',
    'Adventure': 'Dynamic lighting, wind in hair, outdoorsy feel, vibrant natural colors, energetic composition.',
    'Candid': 'Natural, unposed look, documentary style, authentic lighting, "caught in the moment" feel.',
    'Professional': 'Clean, sharp, balanced studio lighting, neutral tones, confident and trustworthy atmosphere.',
    'Ethereal': 'Soft, dreamy, fantasy-like atmosphere, light leaks, pastel color palette, angelic glow.',
    'Moody': 'Low-key lighting, deep shadows, mysterious atmosphere, desaturated colors, intense and emotional.'
};

const ENVIRONMENT_PROMPTS: Record<string, string> = {
    'Outdoor Park': 'A lush green park with dappled sunlight through trees, soft nature background.',
    'Beach': 'A sunny beach with blue ocean and white sand, bright natural daylight.',
    'Luxury Rooftop': 'A high-end city rooftop at twilight with glowing city skyline lights in the background, glass railings, chic furniture.',
    'City Street': 'A bustling urban street with blurred cars and city lights, modern architecture context.',
    'Cozy Home': 'A warm, inviting living room with soft furniture, plants, and window light.',
    'Cafe': 'A stylish coffee shop interior with warm ambient lighting and blurred cafe background.',
    'Deep Forest': 'A dense forest with tall trees, ferns, and mystical shafts of light piercing through the canopy.',
    'Modern Studio': 'A clean, minimalist studio background with a solid color backdrop and professional 3-point lighting setup.',
    'Snowy Mountain': 'A majestic snowy mountain peak, cold winter lighting, white snow and blue sky contrast.',
    'Sunset Beach': 'A beach at golden hour, warm orange sun reflecting on the water, dramatic clouds.'
};

// --- DEEP RESEARCH TIMELINE RULES ---
const TIMELINE_RULES: Record<string, string> = {
    'Present Day': `
        **ERA PROTOCOL: CONTEMPORARY REALISM**
        - **Camera**: Sony A7R V or Canon R5. Sharp, digital clarity.
        - **Materials**: Modern fabrics (cotton blend, denim, polyester), modern architecture (glass, steel, concrete).
        - **Lighting**: Natural dynamic range, modern practical lights (LEDs, fluorescents) or sunlight.
    `,
    'Future Sci-Fi': `
        **ERA PROTOCOL: YEAR 2150 CYBERPUNK**
        - **Aesthetic**: Blade Runner / Tron Legacy / High-Tech.
        - **Materials**: Iridescent fabrics, latex, carbon fiber, transparent tech-wear, holographic accents.
        - **Environment**: Clean geometry, floating interfaces, metallic surfaces.
        - **Lighting**: Volumetric fog, neon rim lights (cyan/magenta), deep shadows, anamorphic lens flares.
    `,
    '1990s Vintage': `
        **ERA PROTOCOL: LATE 90s ANALOG**
        - **Aesthetic**: Disposable Kodak Camera / 35mm Film.
        - **Visuals**: Direct on-camera flash (harsh shadows behind subject), slight motion blur, high saturation primaries.
        - **Fashion**: Denim jackets, plaid, oversized fits, grunge influence.
        - **Texture**: Visible film grain, slight color bleeding, "imperfect" home photo look.
    `,
    '1920s Noir': `
        **ERA PROTOCOL: ROARING TWENTIES / ART DECO**
        - **Aesthetic**: The Great Gatsby / Peaky Blinders.
        - **Fashion**: Men in tuxedos/three-piece wool suits. Women in flapper dresses, pearls, headbands, silk, velvet.
        - **Environment**: Art Deco patterns, gold inlays, marble, smoke-filled jazz clubs, opulent ballrooms.
        - **Lighting**: Chiaroscuro (High contrast), dramatic spotlighting, soft focus filters (Vaseline on lens look).
        - **Color**: Rich, deep colors (Gold, Black, Burgundy) OR Silver Nitrate B&W if requested.
    `,
    'Medieval': `
        **ERA PROTOCOL: 14th CENTURY FANTASY REALISM**
        - **Aesthetic**: Game of Thrones / Lord of the Rings.
        - **Materials**: Rough-spun wool, heavy linen, fur pelts, leather armor, chainmail, velvet capes. NO zippers, NO plastic, NO modern makeup.
        - **Environment**: Cold stone castles, torch-lit taverns, misty ancient forests.
        - **Lighting**: Firelight (warm, flickering), candlelight, or diffuse overcast daylight.
        - **Texture**: Gritty, high-detail texture on skin and fabric.
    `
};

// Step 1: Deep Forensic Analysis (Text Model)
const analyzePhotoCondition = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Smithsonian Photo Conservator. Perform a Deep Forensic Analysis of this damaged/aged photo.
    
    1. **Historical Context**: Estimate the decade/era based on clothing and hair. This determines the color palette.
    2. **Subject Identity**: Describe the person's ethnicity, estimated age, facial structure, and expression.
    3. **Damage Report**: Identify artifacts to REMOVE (scratches, dust, blur, tearing, sepia cast, halftone dots).
    4. **Reconstruction Plan**: What details are missing that need to be hallucinated plausibly (e.g. "reconstruct left eye based on right eye symmetry", "fix tattered collar")?
    
    Output a concise "Restoration Blueprint" paragraph.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Restore to high definition, fixing all damage.";
    } catch (e) {
        console.warn("Forensic analysis failed", e);
        return "Restore to high definition, fixing all damage.";
    }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore_color' | 'restore_only'
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    // 1. Analyze Photo Condition & History (The "Blueprint")
    const restorationBlueprint = await analyzePhotoCondition(ai, data, optimizedMime);

    let basePrompt = `You are an Advanced AI Restoration Engine (Gemini 3 Pro Image).
    
    *** INPUT ANALYSIS (BLUEPRINT) ***
    ${restorationBlueprint}
    
    *** TASK: ${mode === 'restore_color' ? 'FULL RESTORATION & COLORIZATION' : 'DIGITAL PRESERVATION (NO COLOR CHANGE)'} ***
    
    *** EXECUTION PROTOCOL ***
    1. **Aggressive De-noising**: The input has noise/grain. Remove it completely. Replace it with realistic "skin texture" (pores) and "fabric weave".
    2. **Structure Recovery**: If facial features are blurry, use the Blueprint to reconstruct them with anatomical precision. Eyes must be sharp and symmetric.
    3. **Damage Removal**: Erase all scratches, dust, tears, and folds identified in the input. Inpaint missing areas seamlessly.
    `;
    
    if (mode === 'restore_color') {
        basePrompt += `
        4. **Colorization Science**:
           - Use the historical era from the Blueprint to choose accurate colors for clothing.
           - **Skin Tone**: Must be organic, multi-tonal, and match the Blueprint's ethnicity. NO monochromatic or flat orange skin.
           - **Contrast**: Fix the faded exposure. Restore true blacks and bright whites.
        `;
    } else {
        basePrompt += `
        4. **Tone Preservation**:
           - Keep the original Black & White or Sepia grading. 
           - Focus purely on sharpness, resolution, and removing physical damage.
        `;
    }

    basePrompt += `
    **FINAL OUTPUT**: A 4K, crystal-clear, photorealistic image. It should look like it was taken today with a modern camera.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: basePrompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error restoring image:", error);
    throw error;
  }
};

export interface PixaTogetherConfig {
    mode: 'creative' | 'reenact' | 'professional';
    relationship: string;
    // Creative Mode Params
    mood?: string;
    environment?: string;
    pose?: string;
    timeline?: string;
    universe?: string;
    customDescription?: string;
    // Reenact Mode Params
    referencePoseBase64?: string;
    referencePoseMimeType?: string;
    // Common
    faceStrength: number;
    clothingMode: 'Keep Original' | 'Match Vibe' | 'Professional Attire';
    locks: {
        age: boolean;
        hair: boolean;
        accessories: boolean;
    };
    autoFix: boolean;
}

// New Helper: Analyze Face Details for Pixa Together
const analyzeFaceBiometrics = async (ai: any, base64: string, mimeType: string, label: string): Promise<string> => {
    const prompt = `Task: Deep Biometric Analysis of ${label}.
    
    Analyze the "Minute Details" of the face to preserve identity in a generated image.
    Identify and describe:
    1. Face Shape (e.g. oval, square, strong jawline).
    2. Eye Structure (shape, color, eyelid type, eyebrow arch).
    3. Nose Architecture (bridge width, tip shape).
    4. Mouth & Lips (fullness, curvature).
    5. Skin & Age Characteristics (complexion, texture, distinctive marks like moles/freckles).
    6. Hair (color, texture, hairline).
    
    Output a concise, high-precision descriptive paragraph.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Fast and capable vision model for analysis
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: prompt }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.warn(`Biometric analysis failed for ${label}`, e);
        return "";
    }
};

export const generateMagicSoul = async (
  personABase64: string,
  personAMimeType: string,
  personBBase64: string | null | undefined,
  personBMimeType: string | null | undefined,
  inputs: PixaTogetherConfig
): Promise<string> => {
  const ai = getAiClient();
  try {
    // 1. Parallel optimization
    const optimizePromises = [optimizeImage(personABase64, personAMimeType)];
    
    if (personBBase64 && personBMimeType) {
        optimizePromises.push(optimizeImage(personBBase64, personBMimeType));
    }
    
    if (inputs.mode === 'reenact' && inputs.referencePoseBase64 && inputs.referencePoseMimeType) {
        optimizePromises.push(optimizeImage(inputs.referencePoseBase64, inputs.referencePoseMimeType));
    }

    const results = await Promise.all(optimizePromises);
    const optA = results[0];
    // If personB exists, it's the second result.
    const optB = (personBBase64 && personBMimeType) ? results[1] : null;
    // Pose is last if it exists
    const optPose = (inputs.mode === 'reenact' && inputs.referencePoseBase64) ? results[results.length - 1] : null;

    // 2. PHASE 1: DEEP BIOMETRIC ANALYSIS (The "Brain")
    // We analyze the faces first to create a text anchor for the image generation model
    const analysisPromises = [analyzeFaceBiometrics(ai, optA.data, optA.mimeType, "Person A")];
    if (optB) {
        analysisPromises.push(analyzeFaceBiometrics(ai, optB.data, optB.mimeType, "Person B"));
    }
    
    const biometricsResults = await Promise.all(analysisPromises);
    const biometricsA = biometricsResults[0];
    const biometricsB = optB ? biometricsResults[1] : "";

    // 3. PHASE 2: GENERATION PROMPT ENGINEERING
    
    // --- PART 1: THE IDENTITY ANCHOR ---
    let mainPrompt = `
    *** STRICT IDENTITY PRESERVATION PROTOCOL ***
    You are a Photographic Cloning Engine.
    
    **SUBJECT A**:
    - VISUAL SOURCE: Input Image 1.
    - BIOMETRICS: ${biometricsA}
    
    ${optB ? `**SUBJECT B**:
    - VISUAL SOURCE: Input Image 2.
    - BIOMETRICS: ${biometricsB}` : ''}
    
    **CRITICAL CONSTRAINT: THE "SACRED ASSET" RULE**
    1. **NO FACE SWAPPING**: You must render the EXACT faces provided in the input images.
    2. **NO STRUCTURE CHANGE**: Maintain the exact skeletal structure, nose shape, eye distance, and jawline.
    3. **NO BODY MORPHING**: Maintain the subject's Body Mass Index (BMI), shoulder width, and height ratios. Do NOT idealize or slim the bodies unless explicitly told.
    4. **HAIR**: ${inputs.locks.hair ? "LOCK HAIR: Maintain exact hairstyle, hairline, and color." : "Adapt hair slightly to wind/lighting, but keep length and style recognizable."}
    `;

    // --- PART 2: THE TIMELINE ENGINE ---
    // This injects the deep research rules for the specific era
    const selectedTimeline = inputs.timeline || 'Present Day';
    const timelineInstructions = TIMELINE_RULES[selectedTimeline] || TIMELINE_RULES['Present Day'];

    mainPrompt += `
    *** RENDERING ENGINE: ${selectedTimeline.toUpperCase()} ***
    ${timelineInstructions}
    
    **INSTRUCTION**: Apply this era's materials, lighting, and camera artifacts to the scene and the subjects' clothing/skin texture.
    - IF Medieval: Skin should look natural/unmakeup-ed. Clothes must be heavy weave.
    - IF 1920s: Skin can be powdered. High contrast lighting.
    `;

    // --- PART 3: MODE SPECIFIC INSTRUCTIONS ---
    if (inputs.mode === 'reenact') {
        mainPrompt += `
        *** REENACTMENT MODE (STRICT) ***
        - **TASK**: Recreate the scene from the "REFERENCE POSE" image exactly.
        - **POSE**: Copy body positions, arm placements, and camera angle 1:1.
        - **CASTING**: Replace the reference actors with Subject A ${optB ? 'and Subject B' : ''}, keeping their identities.
        `;
    } else if (inputs.mode === 'professional') {
        mainPrompt += `
        *** PROFESSIONAL PORTRAIT MODE ***
        - **Attire**: Premium Business Formal (Suits, Blazers).
        - **Setting**: ${inputs.environment === 'Modern Studio' ? 'High-end Photography Studio, Neutral Grey Backdrop' : 'Blurred Executive Office'}.
        - **Lighting**: "Rembrandt" or "Butterfly" studio lighting. Softboxes. No harsh shadows.
        - **Vibe**: Trustworthy, Competent, Leadership.
        `;
    } else {
        // CREATIVE MODE
        const moodDesc = inputs.mood ? (MOOD_PROMPTS[inputs.mood] || inputs.mood) : 'Realistic';
        const envDesc = inputs.environment ? (ENVIRONMENT_PROMPTS[inputs.environment] || inputs.environment) : 'Neutral background';

        mainPrompt += `
        *** CREATIVE SCENE COMPOSITION ***
        - **Relationship**: ${inputs.relationship} (Reflect this in proximity and body language).
        - **Setting**: ${inputs.environment} -> ${envDesc}
        - **Mood**: ${inputs.mood} -> ${moodDesc}
        - **Pose**: ${inputs.pose}
        `;
    }

    if (inputs.customDescription) {
        mainPrompt += `
        *** USER CUSTOM VISION ***
        " ${inputs.customDescription} "
        - INTEGRATION: Seamlessly blend this user request with the Timeline rules above.
        `;
    }

    // --- PART 4: CLOTHING & FINAL POLISH ---
    mainPrompt += `
    *** CLOTHING LOGIC ***
    ${inputs.clothingMode === 'Match Vibe' 
        ? `**AUTO-STYLE**: Generate clothing that perfectly matches the **${selectedTimeline}** era and **${inputs.environment || 'Setting'}**. 
           - Example: If Medieval, generate tunics/gowns. If 1920s, generate tuxedos/flapper dresses. If Future, generate tech-wear.
           - Ensure fabric textures match the era (e.g., wool vs synthetic).`
        : inputs.clothingMode === 'Professional Attire' 
            ? "**FORCE**: Business Formal suits/blazers." 
            : "**KEEP**: Attempt to keep original clothing style but relight it."}
    
    *** FINAL OUTPUT ***
    Generate a SINGLE, coherently lit, photorealistic image.
    - Check: Do the faces match the inputs? (Must be YES).
    - Check: Does the lighting match the Era? (Must be YES).
    - Check: Is the resolution high? (Must be YES).
    `;

    // 4. CONSTRUCT PAYLOAD
    const parts: any[] = [
        { text: "INPUT IMAGE 1 (Reference for Person A):" },
        { inlineData: { data: optA.data, mimeType: optA.mimeType } }
    ];
    
    if (optB) {
        parts.push({ text: "INPUT IMAGE 2 (Reference for Person B):" });
        parts.push({ inlineData: { data: optB.data, mimeType: optB.mimeType } });
    }

    if (optPose) {
        parts.push({ text: "REFERENCE POSE TARGET:" });
        parts.push({ inlineData: { data: optPose.data, mimeType: optPose.mimeType } });
    }

    parts.push({ text: mainPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          tools: [{ googleSearch: {} }] // Enable search for niche era details if needed
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating Magic Soul:", error);
    throw error;
  }
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const { data: optImage, mimeType: optMime } = await optimizeImageForEditing(base64ImageData, mimeType);
        // Ensure mask is also optimized to match resolution/size constraints
        const { data: optMask, mimeType: maskMime } = await optimizeImageForEditing(maskBase64, 'image/png');

        const prompt = `Task: Magic Eraser / Inpainting.
        
        INPUTS:
        1. Source Image.
        2. Mask Image (Black & White).
        
        INSTRUCTION:
        - The Mask Image defines the area to EDIT.
        - **White Pixels** in the mask = Area to Remove/Inpaint.
        - **Black Pixels** in the mask = Area to Keep Unchanged.
        
        ACTION:
        - Remove the object/element highlighted by the White Pixels in the Mask.
        - Inpaint the removed area with realistic background texture, lighting, and details to make it disappear seamlessly.
        - Do NOT change the rest of the image.
        
        OUTPUT:
        - The final edited image.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: optImage, mimeType: optMime } },
                    { inlineData: { data: optMask, mimeType: maskMime } },
                    { text: prompt }
                ]
            },
            config: { responseModalities: [Modality.IMAGE] }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("No image generated.");
    } catch (error) {
        console.error("Error removing element:", error);
        throw error;
    }
};
