
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
    // Updated Analysis Prompt to be extremely strict about detecting specific text elements
    const analysisPrompt = `You are a Senior Creative Director specializing in Ad Layout Forensics.
        INPUTS: Reference Image (Target Style), Product Image (User Item).
        
        **CRITICAL ANALYSIS TASK:**
        You must deeply study the **Reference Image** and detect exactly which text elements are present.
        
        1. **Typography Depth**: Is the text in the reference **3D/Extruded** (with physical depth/shadows) OR **Flat/2D** (clean vector style)?
        2. **Product Name Detection**: Does the reference image explicitly display a Product Name or Title text?
        3. **Offer/Badge Detection**: Does the reference image explicitly display a Discount, Offer, "50% Off", or a CTA Button/Badge?
        4. **Website/Address Detection**: Does the reference image explicitly display a Website URL or Physical Address/Location text?
        
        **HEADLINE GENERATION:**
        Write a catchy, viral, marketing-ready headline (2-5 words) for "${productDescription}". ${languageInstruction}.
        
        **LAYOUT PLAN:**
        Plan where the User's Product should go to match the reference composition.
    `;

    const jsonSchemaPart = `
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the asset/product...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style in the requested language",
        "detectedTypographyType": "Either '3D' or '2D' based on the Reference Image style",
        "referenceHasProductName": boolean, 
        "referenceHasOfferBadge": boolean, 
        "referenceHasWebsite": boolean, 
        "referenceHasAddress": boolean,
        "logoPlacement": "Description of where to place the logo (if applicable)",
        "productNamePlacement": "Description of where to place the Product Name (if applicable)",
        "offerPlacement": "Description of where to place the Offer/Discount (if applicable)",
        "contactPlacement": "Description of where to place contact info (if applicable)",
        "textInstructions": "Specific instructions on font style and color",
        "technicalExecution": "Specific instruction for the renderer"
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
                    referenceHasProductName: { type: Type.BOOLEAN },
                    referenceHasOfferBadge: { type: Type.BOOLEAN },
                    referenceHasWebsite: { type: Type.BOOLEAN },
                    referenceHasAddress: { type: Type.BOOLEAN },
                    logoPlacement: { type: Type.STRING },
                    productNamePlacement: { type: Type.STRING },
                    offerPlacement: { type: Type.STRING },
                    contactPlacement: { type: Type.STRING },
                    textInstructions: { type: Type.STRING },
                    technicalExecution: { type: Type.STRING }
                },
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "technicalExecution", "detectedTypographyType", "referenceHasProductName", "referenceHasOfferBadge"]
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
            referenceHasProductName: true,
            referenceHasOfferBadge: false,
            referenceHasWebsite: true,
            referenceHasAddress: false,
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

    // STRICT TEXT FILTERING LOGIC
    // Only render if User Provided Input AND Reference Image has that element.
    
    const showProduct = productName && blueprint.referenceHasProductName;
    const showOffer = specialOffer && blueprint.referenceHasOfferBadge;
    const showWebsite = website && blueprint.referenceHasWebsite;
    const showAddress = address && blueprint.referenceHasAddress;

    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the NEGATIVE SPACE ZONE. 
      **STYLE**: ${fontStyle}. 
      ${typographyInstruction}
      *Ensure correct script rendering (Latin or Devanagari).*
    `;

    if (showProduct) {
        dynamicTextInstructions += `- **PRODUCT NAME**: Render "${productName}" at location: ${blueprint.productNamePlacement}. Use a style matching the reference.\n`;
    } else {
        dynamicTextInstructions += `- **NO PRODUCT NAME**: Do NOT render any product name text. The reference does not use it, or the user didn't provide it.\n`;
    }

    if (showOffer) {
        dynamicTextInstructions += `- **OFFER/CTA**: Render "${specialOffer}" at location: ${blueprint.offerPlacement}. Make it look like a badge/sticker/button as seen in reference.\n`;
    } else {
        dynamicTextInstructions += `- **NO OFFER**: Do NOT render any "50% Off" or discount badges. Even if the reference has one, ignore it if the user didn't provide specific offer text.\n`;
    }

    if (showWebsite) {
        dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at location: ${blueprint.contactPlacement}.\n`;
    } else {
        dynamicTextInstructions += `- **NO WEBSITE**: Do NOT render any URL.\n`;
    }

    if (showAddress) {
        dynamicTextInstructions += `- **ADDRESS**: Render "${address}" at location: ${blueprint.contactPlacement}.\n`;
    } else {
        dynamicTextInstructions += `- **NO ADDRESS**: Do NOT render any physical address.\n`;
    }

    if (optLogoHigh && logoBase64) {
         dynamicTextInstructions += `- **LOGO**: Place USER LOGO at: ${blueprint.logoPlacement || 'Top Center'}.\n`;
    }

    const parts: any[] = [];
    
    parts.push({ text: "MAIN USER ASSET:" });
    parts.push({ inlineData: { data: optProductHigh.data, mimeType: optProductHigh.mimeType } });
    
    if (optLogoHigh) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogoHigh.data, mimeType: optLogoHigh.mimeType } });
    }

    let genPrompt = `Task: Create a High-End Product Ad Replica.
    
    **SCENE**: Recreate this aesthetic: "${blueprint.visualStyle}".
    **BRANDING**: Use ${brandColor ? `Color ${brandColor}` : 'matching palette'}.
    **LAYOUT**: ${blueprint.layoutPlan}.
    **PRODUCT**: Place the Main Product naturally with realistic physics and shadows.
    `;
    
    genPrompt += `
    **TEXT PLACEMENT RULES (STRICT ADHERENCE):**
    ${dynamicTextInstructions}
    
    **FINAL QUALITY CHECK**: Output a 4K, highly polished image. Ensure NO random text artifacts. Only render text explicitly requested above.`;

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
