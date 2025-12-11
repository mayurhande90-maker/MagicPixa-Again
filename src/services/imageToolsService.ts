
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

// Step 1: Deep Forensic Analysis (Text Model)
const analyzePhotoCondition = async (ai: any, base64: string, mimeType: string): Promise<string> => {
    const prompt = `Act as a Smithsonian Photo Conservator. Perform a Deep Forensic Analysis of this damaged/aged photo.
    
    1. **Historical Context**: Estimate the decade/era based on clothing and hair. This determines the color palette.
    2. **Subject Identity**: Describe the person's ethnicity, estimated age, facial structure, and expression.
    3. **Damage Report**: Identify artifacts to REMOVE (scratches, dust, blur, tearing, sepia cast, halftone dots).
    4. **Reconstruction Plan**: What details are missing that need to be hallucinated plausibly (e.g., "reconstruct left eye based on right eye symmetry", "fix tattered collar")?
    
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
    const analysisPromises = [analyzeFaceBiometrics(ai, optA.data, optA.mimeType, "Person A")];
    if (optB) {
        analysisPromises.push(analyzeFaceBiometrics(ai, optB.data, optB.mimeType, "Person B"));
    }
    
    const biometricsResults = await Promise.all(analysisPromises);
    const biometricsA = biometricsResults[0];
    const biometricsB = optB ? biometricsResults[1] : "";

    // 3. PHASE 2: GENERATION PROMPT ENGINEERING
    let mainPrompt = "";
    
    if (!optB) {
        mainPrompt = `Generate a single professional portrait of Person A.`;
    } else {
        mainPrompt = `Generate a single combined photograph using Person A and Person B.`;
    }
    
    // --- IDENTITY LOCK BLOCK ---
    mainPrompt += `
    *** IDENTITY PRESERVATION PROTOCOL (CRITICAL) ***
    We have analyzed the subjects. You MUST adhere to these biometric profiles:
    
    [PERSON A PROFILE]:
    ${biometricsA}
    
    ${optB ? `[PERSON B PROFILE]:
    ${biometricsB}` : ''}
    
    **INSTRUCTION**: Use the uploaded images as the visual source, but use the text profiles above to VALIDATE the generated faces. 
    - The output faces must be pixel-perfect matches to the inputs.
    - Do NOT blend features.
    - Preserves moles, scars, and specific eye shapes mentioned in the profile.
    `;

    // --- MODE SPECIFIC INSTRUCTIONS ---
    if (inputs.mode === 'reenact') {
        mainPrompt += `
        *** REENACTMENT MODE (STRICT) ***
        - **TASK**: Recreate the scene from the "REFERENCE POSE" image exactly.
        - **POSE & COMPOSITION**: Copy the exact body positions, camera angle, distance, and physical interaction from the Reference Pose image.
        - **CASTING**: Replace the people in the Reference Pose with Person A ${optB ? 'and Person B' : ''}.
        - **CONTEXT**: Keep the general vibe/setting of the reference image.
        `;
    } else if (inputs.mode === 'professional') {
        if (!optB) {
             // SINGLE HEADSHOT LOGIC
             mainPrompt += `
             *** PROFESSIONAL CORPORATE HEADSHOT (EXECUTIVE TIER) ***
             - **TASK**: Generate a world-class, hyper-realistic LinkedIn/Executive profile photo.
             - **CAMERA SPECS**: Hasselblad X2D 100C style. 85mm Prime Lens at f/2.8.
             - **IDENTITY LOCK**: Do NOT change facial features, bone structure, or hair density. The person must look exactly like themselves, just professionally photographed.
             - **ATTIRE**: Premium Business Formal.
               * Men: Well-fitted Navy/Charcoal suit, crisp white shirt. Optional tie. Fabric must look like wool/cotton (visible weave).
               * Women: Structured professional blazer (Black/Camel/Navy) or high-end business dress. Modest and elegant.
             - **LIGHTING**: "Cinematic Corporate". Large Softbox key light at 45 degrees. Subtle rim light on hair/shoulders to separate subject from background. Fill light to reduce harsh shadows under eyes.
             - **SKIN TEXTURE (CRITICAL)**: Skin must be ORGANIC. Visible pores, micro-details, and natural subsurface scattering. DO NOT apply "plastic" smoothing or AI filters.
             - **BACKGROUND**:
               * Option A: Softly blurred, modern architectural office (glass, steel, depth).
               * Option B: Clean, textured neutral studio backdrop (Dark Grey or Cream).
             - **POSE**: Head and shoulders composition. Body angled 30 degrees, face turned to camera. Chin slightly down. Confident, trustworthy, approachable expression.
             `;
        } else {
             // DUO LOGIC
             mainPrompt += `
             *** PROFESSIONAL DUO CORPORATE PORTRAIT ***
             - **TASK**: Create a high-end business partners/co-founders portrait (Forbes/Fortune Magazine style).
             - **ATTIRE**: Coordinated Business Formal. Dark suits/blazers. Crisp and professional.
             - **ENVIRONMENT**: Modern, clean, well-lit executive studio or blurred upscale office background.
             - **POSE**: Professional, confident standing pose. Side-by-side or slight overlap (one shoulder behind). Balanced height and eye levels.
             - **LIGHTING**: Even, soft studio lighting. Large light source to cover both subjects without casting shadows on each other.
             - **REALISM**: High fidelity skin texture and fabric details. No "wax figure" look.
             `;
        }
    } else {
        // CREATIVE MODE
        mainPrompt += `
        *** CREATIVE MODE ***
        - **Relationship**: ${inputs.relationship}
        - **Mood**: ${inputs.mood}
        - **Environment**: ${inputs.environment}
        - **Pose**: ${inputs.pose}
        
        ${inputs.timeline && inputs.timeline !== 'Present Day' ? `- **TIME TRAVEL ENGINE**: Render the entire scene (clothing, hair styling, film stock quality, background) to look authentically like the **${inputs.timeline}**.` : ''}
        
        ${inputs.universe && inputs.universe !== 'Photorealistic' ? `- **UNIVERSE ENGINE**: Render the output in the visual style of **${inputs.universe}**. Adjust texture, rendering style, and lighting to match this art style.` : '- **STYLE**: Hyper-realistic photography.'}
        `;
    }

    if (inputs.customDescription) {
        mainPrompt += `
        *** USER CUSTOM VISION (DEEP SEARCH ENABLED) ***
        The user has provided specific details: "${inputs.customDescription}".
        - **ACTION**: Use your search tool to understand specific locations, styles, or concepts mentioned here.
        - Integrate this description into the scene intelligently.
        `;
    }

    // --- FEATURE LOCKS & FIXES ---
    mainPrompt += `
    *** FEATURE LOCKS ***
    ${inputs.locks.age ? "- **LOCK AGE**: Do NOT make them younger or older. Maintain current age." : ""}
    ${inputs.locks.hair ? "- **LOCK HAIR**: Maintain original hairstyle and hair color exactly." : ""}
    ${inputs.locks.accessories ? "- **LOCK ACCESSORIES**: Keep glasses, facial hair/beards." : ""}
    
    *** CLOTHING LOGIC ***
    ${inputs.mode === 'professional' ? "- **CLOTHING**: FORCE BUSINESS ATTIRE." : (inputs.clothingMode === 'Keep Original' ? "- **CLOTHING**: Keep original outfits." : "- **CLOTHING**: Change outfits to match the Scene/Era/Vibe.")}
    
    ${inputs.autoFix ? `*** AUTO-FIX & QUALITY ***
    - Output in High Definition (4K).
    - Remove noise/grain from input. Sharpen eyes. Balance exposure. Correct lens distortion.
    - Ensure lighting consistency across faces.` : ""}

    *** NEGATIVE CONSTRAINTS ***
    - Never blend identities. 
    - Never hallucinate new facial features not present in input.
    - Do not generate random people in the background.
    - The photo should look NATURAL, not like an AI generation.
    `;

    // 4. CONSTRUCT PAYLOAD
    const parts: any[] = [
        { text: "Person A Reference:" },
        { inlineData: { data: optA.data, mimeType: optA.mimeType } }
    ];
    
    if (optB) {
        parts.push({ text: "Person B Reference:" });
        parts.push({ inlineData: { data: optB.data, mimeType: optB.mimeType } });
    }

    if (optPose) {
        parts.push({ text: "REFERENCE POSE / COMPOSITION TARGET:" });
        parts.push({ inlineData: { data: optPose.data, mimeType: optPose.mimeType } });
    }

    parts.push({ text: mainPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: { 
          responseModalities: [Modality.IMAGE],
          // Enable Google Search for "Deep Search" capability on environment/context
          tools: [{ googleSearch: {} }] 
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

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  mockupType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const { data, mimeType: optimizedMime } = await optimizeImage(base64ImageData, mimeType);

    const prompt = `Task: Professional Product Mockup.
    
    Input: A design/logo file.
    Target Item: ${mockupType}.
    
    Instructions:
    1. Generate a photorealistic image of the Target Item (${mockupType}) in a professional studio setting.
    2. Apply the Input Design onto the surface of the Target Item.
    3. **Physics**: The design must wrap around curves, folds, and textures (e.g., displacement map effect).
    4. **Lighting**: The design must interact with the scene lighting (reflections, shadows).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: data, mimeType: optimizedMime } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating mockup:", error);
    throw error;
  }
};

export const generateStyledImage = async (
    productImages: string[],
    prompt: string
): Promise<string> => {
    const ai = getAiClient();
    // Use the first product image as reference
    const { data, mimeType } = await optimizeImage(productImages[0], 'image/png');
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: data, mimeType: mimeType } }, 
                { text: `Stylized Generation. Prompt: ${prompt}` }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    
    // Use Higher Resolution Optimizer for BOTH Source and Mask to ensure alignment
    // If we optimize one but not the other, the coordinate systems mismatch.
    const [optImg, optMask] = await Promise.all([
        optimizeImageForEditing(base64ImageData, mimeType),
        optimizeImageForEditing(maskBase64, "image/png")
    ]);

    const prompt = `You are an advanced AI Photo Editor using Gemini 3 Pro.
    
    TASK: MAGIC ERASER / INPAINTING.
    
    INPUTS:
    1. Source Image.
    2. Mask Image (Black & White).
    
    **STRICT MASK DEFINITION:**
    - **WHITE AREA** (Pixel value 255) = **THE OBJECT TO REMOVE**.
    - **BLACK AREA** (Pixel value 0) = **THE REFERENCE BACKGROUND (KEEP)**.
    
    **INSTRUCTIONS:**
    1. **IDENTIFY**: Look at the WHITE area in the Mask. Find the corresponding object in the Source Image.
    2. **DELETE**: Completely erase everything inside the White Mask area.
    3. **SYNTHESIZE**: Fill the erased hole by analyzing the patterns, lighting, and textures of the surrounding BLACK area.
       - If the background is a wall, extend the wall.
       - If it's a floor, continue the floor texture.
       - If it's complex, hallucinate a plausible background that fits seamlessly.
    4. **BLEND**: The edges must be invisible. No blurry patches. No artifacts.
    
    **NEGATIVE CONSTRAINTS:**
    - Do NOT just blur the object. REMOVE IT.
    - Do NOT leave a ghost or silhouette.
    - Do NOT alter the Black (Safe) area.
    
    Output ONLY the final clean image.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
            parts: [
                { inlineData: { data: optImg.data, mimeType: optImg.mimeType } },
                { text: "MASK LAYER (White=Remove, Black=Keep):" },
                { inlineData: { data: optMask.data, mimeType: "image/png" } },
                { text: prompt } 
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};
