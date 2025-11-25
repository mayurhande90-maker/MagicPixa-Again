
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
        2. Create Transfer Plan: Write a headline for "${productDescription}". ${languageInstruction}. 
        3. Plan layout to incorporate ${brandInstruction}.
        `;
    } else {
        // SMART LOGIC FOR DIGITAL / SERVICES - "SMART CONTEXT ENGINE"
        analysisPrompt = `You are a World-Class Creative Ad Designer (Digital Specialist).
        
        **INPUTS:**
        - USER ASSET: The core image to feature.
        - CONTEXT: "${productDescription}".
        - BRANDING: ${brandInstruction}.
        
        **MANDATORY ASSET CLASSIFICATION & STRATEGY:**
        Look at the 'USER ASSET' visually and select the single best technique:
        
        1. **IS IT A SCREENSHOT / UI?** (App, Website, Dashboard)
           -> **STRATEGY**: "3D MOCKUP". Render a high-quality 3D device (iPhone 15 Titanium or MacBook Pro). **WRAP** the User Asset onto the screen. Float the device in a premium abstract environment.
           
        2. **IS IT A PERSON?** (Coach, Influencer, Professional)
           -> **STRATEGY**: "ENVIRONMENTAL COMPOSITE". Remove original background. Place subject in a relevant depth-of-field environment (Modern Office, Stage, or Studio Color). Add **Rim Lighting** to blend them.
           
        3. **IS IT A LOGO?** (Symbol, Brand Mark)
           -> **STRATEGY**: "PHYSICAL MATERIALITY". Do not just paste it. Render it as a 3D object (Glass, Acrylic, Neon, or Embossed) on a premium wall or surface.
           
        4. **IS IT A TEXTURE / VIBE?** (Abstract)
           -> **STRATEGY**: "TYPOGRAPHY HERO". Use the asset as a subtle texture/background. Make the Headline the hero in 3D text.

        **OUTPUT JSON REQUIREMENTS:**
        - "technicalExecution": Write the specific instruction based on the strategy above (e.g., "Render iPhone 15 Mockup with asset on screen").
        - "visualStyle": Describe the lighting and mood to match the Reference Image.
        - "generatedHeadline": Catchy hook based on context (2-5 words). ${languageInstruction}.
        `;
    }

    const jsonSchemaPart = `
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the asset/product...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style in the requested language",
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
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "technicalExecution"]
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
            hasVisibleLogo: true,
            hasVisibleWebsite: true,
            textInstructions: "Bold sans-serif",
            technicalExecution: "Clean composite"
        };
    }

    // Step 2: Generation (The "Executor")
    
    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the main text area. 
      **FONT STYLE**: ${fontStyle}. Make it huge, legible, and integrated into the scene.
      *Ensure correct script rendering (Latin or Devanagari) based on the text.*
    `;

    const isDigital = campaignType === 'digital';
    
    const shouldShowLogo = (mode === 'remix' && logoBase64) || (blueprint.hasVisibleLogo && logoBase64) || (isDigital && logoBase64);
    const shouldShowProduct = (mode === 'remix' && productName) || (blueprint.hasVisibleProductName && productName);
    const shouldShowOffer = (mode === 'remix' && specialOffer) || (blueprint.hasVisibleOffer && specialOffer);
    const shouldShowWeb = (mode === 'remix' && website) || (blueprint.hasVisibleWebsite && website) || (isDigital && website);
    const shouldShowAddress = (mode === 'remix' && address) || (blueprint.hasVisibleAddress && address);

    if (shouldShowLogo && optLogoHigh) {
        dynamicTextInstructions += `- **LOGO**: Place the provided USER LOGO at: ${blueprint.logoPlacement || 'Top Corner'}. Ensure it contrasts well with the background.\n`;
    } else {
        dynamicTextInstructions += `- **LOGO**: DO NOT add a logo.\n`;
    }

    if (shouldShowProduct) {
        dynamicTextInstructions += `- **TITLE/NAME**: Render "${productName}" near the headline or product.\n`;
    }

    if (shouldShowOffer) {
        dynamicTextInstructions += `- **OFFER BADGE**: Render "${specialOffer}" inside a distinct shape (circle/button) or high-contrast text block. Color: ${brandColor || 'Red/Yellow'} for attention.\n`;
    }

    if (shouldShowWeb) {
        dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at the bottom.\n`;
    }

    if (shouldShowAddress) {
        dynamicTextInstructions += `- **ADDRESS**: Render "${address}" small near the bottom.\n`;
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
        // DIGITAL / SERVICE PROMPT (ENHANCED EXECUTION)
        genPrompt = `Task: Create a Premium Digital Ad (High-End Commercial Style).
        
        **EXECUTION BLUEPRINT (STRICT):**
        "${blueprint.technicalExecution}"
        
        **VISUAL RULES:**
        1. **NO FLAT IMAGES**: Never just paste the User Asset on a background. It looks cheap.
        2. **IF MOCKUP**: The device must look photorealistic (reflections, glass shader). The screen content (User Asset) must be perfectly aligned.
        3. **IF PERSON**: Lighting match is critical. The subject must look like they are really standing there.
        4. **IF LOGO**: It must interact with the light (e.g., embossed, neon, metallic).
        
        **BRANDING**:
        - Use ${brandColor || 'the reference palette'} for the environment/background.
        - Font: ${fontStyle}.
        
        **CONTEXT**: ${productDescription}.
        `;
    }
    
    genPrompt += `
    **TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **FINAL QUALITY CHECK**: Output a 4K, highly polished image suitable for a Fortune 500 company's Instagram ad. No hallucinations. Text must be legible.`;

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
