
import { Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";

// Helper: Resize image with customizable width
const optimizeImage = async (base64: string, mimeType: string, width: number = 1280): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const generateStyledBrandAsset = async (
    productBase64: string,
    productMime: string,
    referenceBase64: string,
    referenceMime: string,
    logoBase64: string | undefined,
    logoMime: string | undefined,
    productName: string,
    website: string,
    specialOffer: string,
    address: string,
    productDescription: string,
    mode: 'replica' | 'remix' = 'replica',
    language: string = 'English',
    campaignType: 'physical' | 'digital' = 'physical',
    brandColor?: string,
    fontStyle: string = 'Modern Sans'
): Promise<string> => {
    const ai = getAiClient();
    
    // PERFORMANCE OPTIMIZATION: 
    // 1. Generate Low-Res versions (512px) for the Analysis step.
    // 2. Generate Standard HD versions (1024px) for the final Generation step.
    
    const [
        optProductLow, 
        optRefLow,
        optProductHigh,
        optRefHigh,
        optLogoHigh
    ] = await Promise.all([
        optimizeImage(productBase64, productMime, 512),
        optimizeImage(referenceBase64, referenceMime, 512),
        optimizeImage(productBase64, productMime, 1024),
        optimizeImage(referenceBase64, referenceMime, 1024),
        logoBase64 && logoMime ? optimizeImage(logoBase64, logoMime, 1024) : Promise.resolve(null)
    ]);

    // Language-Specific Instruction
    let languageInstruction = "";
    if (language === 'Hindi' || language === 'Marathi') {
        languageInstruction = `
        **CRITICAL LANGUAGE REQUIREMENT (${language}):**
        - **Generated Headline**: Must be in strictly native ${language} (using Devanagari script).
        - **TRANSLATION RULE**: Do NOT use literal word-for-word translation. Understand the context and write a natural, catchy, marketing-friendly headline in ${language}.
        - **Grammar**: Must be perfect and sound like a native speaker wrote it.
        - **English Constraints**: URLs, Phone numbers, and Symbols (%) must remain in English.
        `;
    } else {
        languageInstruction = `Generate the 'generatedHeadline' in professional marketing English.`;
    }

    // Brand Identity Instruction
    let brandInstruction = "";
    if (brandColor) {
        brandInstruction = `STRICT BRANDING: The primary brand color is ${brandColor}. You MUST use this color effectively (as a background, overlay, text accent, or UI element) to ensure brand consistency.`;
    } else {
        brandInstruction = "Extract the best color palette from the Reference Image or the User Asset itself.";
    }

    // Step 1: Deep Analysis (The "Intelligent Planner")
    let analysisPrompt = "";

    if (campaignType === 'physical') {
        // LOGIC FOR PHYSICAL PRODUCTS
        analysisPrompt = `You are a Senior Creative Director.
        INPUTS: Reference Image (Target Style), Product Image (User Item).
        TASK:
        1. Analyze Reference Layout.
        2. **TYPOGRAPHY ANALYSIS (CRITICAL):** Look at the text in the Reference Image. Is it **3D/Extruded** (with depth, shadows, materials) OR **Flat/2D** (vector, clean, minimal)? You must classify this strictly.
        3. Create Transfer Plan: Write a headline for "${productDescription}". ${languageInstruction}. 
        4. Plan layout to incorporate ${brandInstruction}.
        `;
    } else {
        // SMART LOGIC FOR DIGITAL / SERVICES - "SMART CONTEXT ENGINE" & "HARD ANCHOR LAYOUT"
        analysisPrompt = `You are a World-Class Digital Ad Designer (SaaS & Branding Specialist).
        
        **INPUTS:**
        - USER ASSET: The core image to feature (Screenshot, Logo, or Person).
        - CONTEXT: "${productDescription}".
        - BRANDING: ${brandInstruction}.
        
        **TASK 1: CLASSIFY ASSET & SELECT TECHNIQUE (MANDATORY):**
        Look at the 'USER ASSET' and choose the single best technique:
        
        1. **RECTANGULAR UI / SCREENSHOT?** (App, Website)
           -> **TECHNIQUE**: "3D DEVICE WRAP". Render a photorealistic device (iPhone 15 Pro Titanium or Silver MacBook Pro). The User Asset MUST be mapped perfectly onto the screen.
           
        2. **PERSON / HEADSHOT?** (Coach, Influencer)
           -> **TECHNIQUE**: "STUDIO COMPOSITE". Remove background. Place subject in a premium depth-of-field environment (Modern Office or Abstract Studio). Add Rim Lighting.
           
        3. **LOGO / SYMBOL?** (Brand)
           -> **TECHNIQUE**: "3D MATERIALITY". Extrude the logo into 3D Glass, Neon, or Brushed Metal. Mount it on a textured wall.
           
        4. **GENERIC?**
           -> **TECHNIQUE**: "FLOATING CARDS". Render the image as a floating 3D card with soft shadows.

        **TASK 2: DEFINE "HARD ANCHOR" LAYOUT:**
        - You MUST choose a **SPLIT LAYOUT** (e.g., Text Left / Image Right, or Top/Bottom).
        - **NEVER** overlap the main text and the main visual.
        - Define a specific "Negative Space Zone" (solid color/gradient) for the Headline.

        **TASK 3: TYPOGRAPHY ANALYSIS:**
        - Analyze the REFERENCE IMAGE text. Is it **3D/Extruded** or **Flat/2D**? Use this to guide the 'detectedTypographyType'.

        **OUTPUT JSON REQUIREMENTS:**
        - "technicalExecution": Precise instruction based on Technique & Layout (e.g., "Render iPhone 15 on Right. Left side solid blue for text.").
        - "visualStyle": Describe the lighting/mood to match Reference.
        - "generatedHeadline": Punchy, viral hook (2-5 words). ${languageInstruction}.
        `;
    }

    const jsonSchemaPart = `
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the asset/product...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style in the requested language",
        "detectedTypographyType": "Either '3D' or '2D' based on the Reference Image style",
        "hasVisibleLogo": boolean,
        "hasVisibleWebsite": boolean,
        "hasVisibleProductName": boolean,
        "hasVisibleOffer": boolean,
        "hasVisibleAddress": boolean,
        "logoPlacement": "Description of where to place the logo",
        "productNamePlacement": "Description of where to place the Product Name",
        "offerPlacement": "Description of where to place the Offer/Discount",
        "contactPlacement": "Description of where to place contact info",
        "textInstructions": "Specific instructions on font style and color",
        "technicalExecution": "Specific instruction for the renderer (e.g., 'Wrap screenshot on iPhone 15', 'Extrude logo 3D')"
    }`;

    const analysisResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: "REFERENCE IMAGE (Style/Vibe):" },
                { inlineData: { data: optRefLow.data, mimeType: optRefLow.mimeType } },
                { text: "USER ASSET (To be transformed):" },
                { inlineData: { data: optProductLow.data, mimeType: optProductLow.mimeType } },
                { text: analysisPrompt + jsonSchemaPart }
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    visualStyle: { type: Type.STRING },
                    layoutPlan: { type: Type.STRING },
                    generatedHeadline: { type: Type.STRING },
                    detectedTypographyType: { type: Type.STRING, enum: ["3D", "2D"] },
                    hasVisibleLogo: { type: Type.BOOLEAN },
                    hasVisibleWebsite: { type: Type.BOOLEAN },
                    hasVisibleProductName: { type: Type.BOOLEAN },
                    hasVisibleOffer: { type: Type.BOOLEAN },
                    hasVisibleAddress: { type: Type.BOOLEAN },
                    logoPlacement: { type: Type.STRING },
                    productNamePlacement: { type: Type.STRING },
                    offerPlacement: { type: Type.STRING },
                    contactPlacement: { type: Type.STRING },
                    textInstructions: { type: Type.STRING },
                    technicalExecution: { type: Type.STRING }
                },
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "technicalExecution", "detectedTypographyType"]
            }
        }
    }));

    let blueprint;
    try {
        blueprint = JSON.parse(analysisResponse.text || "{}");
    } catch (e) {
        console.error("Analysis parsing failed", e);
        blueprint = {
            visualStyle: "Professional modern design",
            layoutPlan: "Center subject",
            generatedHeadline: "Discover More",
            detectedTypographyType: "2D",
            hasVisibleLogo: true,
            hasVisibleWebsite: true,
            textInstructions: "Bold sans-serif",
            technicalExecution: "Clean composite"
        };
    }

    // Step 2: Generation (The "Executor")
    
    // Dynamic Typography Logic based on Analysis
    let typographyInstruction = "";
    if (blueprint.detectedTypographyType === "3D") {
        typographyInstruction = `**3D TYPOGRAPHY**: The text MUST be 3D, extruded, and have physical depth/shadows to match the reference style. Use a bold, heavy font that looks like an object in the scene.`;
    } else {
        typographyInstruction = `**2D TYPOGRAPHY**: The text MUST be FLAT, clean, and vector-style. DO NOT use 3D extrusion or heavy bevels on the text. Keep it minimal, sharp, and graphic design focused.`;
    }

    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the NEGATIVE SPACE ZONE. 
      **STYLE**: ${fontStyle}. 
      ${typographyInstruction}
      *Ensure correct script rendering (Latin or Devanagari).*
    `;

    const isDigital = campaignType === 'digital';
    
    const shouldShowLogo = (mode === 'remix' && logoBase64) || (blueprint.hasVisibleLogo && logoBase64) || (isDigital && logoBase64);
    const shouldShowProduct = (mode === 'remix' && productName) || (blueprint.hasVisibleProductName && productName);
    const shouldShowOffer = (mode === 'remix' && specialOffer) || (blueprint.hasVisibleOffer && specialOffer);
    const shouldShowWeb = (mode === 'remix' && website) || (blueprint.hasVisibleWebsite && website);
    const shouldShowAddress = (mode === 'remix' && address) || (blueprint.hasVisibleAddress && address);

    // --- TYPOGRAPHY HIERARCHY ENFORCEMENT ---
    
    if (isDigital) {
        // DIGITAL MODE: CLEAN LOOK (Minimal Text)
        if (shouldShowLogo && optLogoHigh) {
            dynamicTextInstructions += `- **LOGO**: Place user logo subtly at Top Left/Right. Keep it small.\n`;
        }
        
        if (specialOffer) {
            dynamicTextInstructions += `- **CTA BUTTON**: Render a distinct button or pill-shape containing "${specialOffer}". High contrast color.\n`;
        }
        
        // CRITICAL: Explicitly forbid small text for Digital Ads to prevent artifacts
        dynamicTextInstructions += `
        - **RESTRICTION**: DO NOT render the website URL, physical address, or long body text. Keep the layout clean and impactful.
        `;
    } else {
        // PHYSICAL MODE: PACKAGING / RETAIL LOOK (More Text Allowed)
        if (shouldShowLogo && optLogoHigh) {
            dynamicTextInstructions += `- **LOGO**: Place USER LOGO at: ${blueprint.logoPlacement || 'Top Center'}.\n`;
        }
        if (shouldShowProduct) {
            dynamicTextInstructions += `- **PRODUCT NAME**: Render "${productName}" near the product.\n`;
        }
        if (shouldShowOffer) {
            dynamicTextInstructions += `- **OFFER**: Render "${specialOffer}" in a badge/sticker.\n`;
        }
        if (shouldShowWeb) {
            dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at the bottom.\n`;
        }
        if (shouldShowAddress) {
            dynamicTextInstructions += `- **ADDRESS**: Render "${address}" small near the bottom.\n`;
        }
    }

    const parts: any[] = [];
    
    parts.push({ text: "MAIN USER ASSET:" });
    parts.push({ inlineData: { data: optProductHigh.data, mimeType: optProductHigh.mimeType } });
    
    if (optLogoHigh) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogoHigh.data, mimeType: optLogoHigh.mimeType } });
    }

    let genPrompt = "";

    if (campaignType === 'physical') {
        // PHYSICAL PROMPT
        genPrompt = `Task: Create a High-End Physical Product Ad.
        
        **SCENE**: Recreate this aesthetic: "${blueprint.visualStyle}".
        **BRANDING**: Use ${brandColor ? `Color ${brandColor}` : 'matching palette'}.
        **LAYOUT**: ${blueprint.layoutPlan}.
        **PRODUCT**: Place the Main Product naturally with realistic physics and shadows.
        `;
    } else {
        // DIGITAL / SERVICE PROMPT (HIGH QUALITY / NO HALLUCINATIONS)
        genPrompt = `Task: Create a Premium Digital Ad Composition (Gemini 3 Pro).
        
        **EXECUTION BLUEPRINT (STRICT):**
        ${blueprint.technicalExecution}
        
        *** COMPOSITION RULE: THE SPLIT GRID ***
        - **Zone A (Negative Space)**: Keep 40-50% of the image CLEAN (Solid color, soft gradient, or minimal texture). NO busy details here. This is for the text.
        - **Zone B (Visual Hero)**: Place the 3D Asset (Phone/Laptop/Person) here.
        - **Separation**: Ensure a clear visual separation between Text and Image.
        
        *** ASSET HANDLING RULES (ZERO DISTORTION) ***
        1. **SCREENS**: If the User Asset is a screenshot, you MUST map it onto a photorealistic 3D Device (Phone/Laptop) screen. The screen content must look exactly like the uploaded image (pixel perfect).
        2. **LOGOS**: If the User Asset is a logo, extrude it into 3D Glass, Neon, or Brushed Metal. Do not just flatten it.
        3. **PEOPLE**: If the User Asset is a person, fix the lighting to match the scene (Rim Light).
        
        **BRANDING**:
        - Dominant Color: ${brandColor || 'Matches Reference'}.
        - Vibe: Premium, Clean, Expensive.
        `;
    }
    
    genPrompt += `
    **TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **FINAL QUALITY CHECK**: Output a 4K, highly polished image suitable for a Fortune 500 company's Instagram ad. No artifacts. Text must be legible.`;

    parts.push({ text: genPrompt });

    const genResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        }
    }));

    const imagePart = genResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated. The request might have been blocked.");
};
