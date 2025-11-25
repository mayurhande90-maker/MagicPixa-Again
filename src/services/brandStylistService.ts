
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
    campaignType: 'physical' | 'digital' = 'physical'
): Promise<string> => {
    const ai = getAiClient();
    
    // PERFORMANCE OPTIMIZATION: 
    // 1. Generate Low-Res versions (512px) for the Analysis step (Fast, low latency).
    // 2. Generate Standard HD versions (1024px) for the final Generation step (Faster than 1280px, good quality).
    
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

    // Step 1: Deep Analysis (The "Intelligent Planner")
    let analysisPrompt = "";

    if (campaignType === 'physical') {
        // LOGIC FOR PHYSICAL PRODUCTS
        if (mode === 'replica') {
            analysisPrompt = `You are a Senior Creative Director and AI Layout Expert.
            INPUTS: Reference Image (Target Style), Product Image (User Item).
            TASK:
            1. Analyze Reference Layout: Check for Logo, URL, Title, Offer, Address. Note font styles.
            2. Create Transfer Plan: Write a headline for "${productDescription}". ${languageInstruction}. Determine exact placements to DUPLICATE the reference structure.`;
        } else {
            analysisPrompt = `You are a Visionary Art Director.
            INPUTS: Reference Image (Vibe Source), Product Image.
            TASK:
            1. Extract Vibe: Mood, Palette, Lighting.
            2. Create Remix Plan: Create a NEW, superior layout using 2025 trends. Write a headline for "${productDescription}". ${languageInstruction}. Suggest high-impact placements.`;
        }
    } else {
        // SMART LOGIC FOR DIGITAL / SERVICES
        // The AI must deduce the technique from the images themselves.
        analysisPrompt = `You are a World-Class Marketing Design AI.
        
        **YOUR INPUTS:**
        1. **Main Asset Image**: The user's raw upload (e.g., Screenshot, Logo, or Headshot).
        2. **Reference Image**: The "North Star" for style and composition.
        3. **Context**: "${productDescription}".
        
        **CRITICAL ANALYSIS TASK (DO NOT FAIL):**
        1. **Analyze the Reference Image**:
           - Does it show a device (Laptop, Phone, Tablet)? -> If yes, you MUST create a realistic device mockup for the User Asset.
           - Does it show a person in a specific setting (Stage, Office, Studio)? -> If yes, you MUST place the User Asset (if it's a person) in that exact setting.
           - Is it an abstract, typographic, or 3D glass background? -> If yes, adapt the User Asset (e.g., Logo) to match that material/style.
        
        2. **Analyze the User Asset**:
           - Is it a flat UI/Website screenshot? -> Prepare to warp it onto a screen.
           - Is it a transparent logo? -> Prepare to extrude or place it.
           - Is it a photo of a person? -> Prepare to relight and composite them.
           
        3. **Determined Strategy**:
           - Combine the Reference Style + User Asset Type + Context to create a unified visual plan.
           
        4. **Copywriting**:
           - Write a high-converting headline based on "${productDescription}". ${languageInstruction}.
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
                { text: "REFERENCE IMAGE (Style Guide):" },
                { inlineData: { data: optRefLow.data, mimeType: optRefLow.mimeType } },
                { text: "USER ASSET (To be placed):" },
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
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "hasVisibleLogo", "hasVisibleWebsite", "hasVisibleProductName", "hasVisibleOffer", "technicalExecution"]
            }
        }
    }));

    let blueprint;
    try {
        blueprint = JSON.parse(analysisResponse.text || "{}");
    } catch (e) {
        console.error("Analysis parsing failed", e);
        blueprint = {
            visualStyle: "Professional studio lighting",
            layoutPlan: "Center subject",
            generatedHeadline: "Premium Service",
            hasVisibleLogo: true,
            hasVisibleWebsite: true,
            hasVisibleProductName: false,
            hasVisibleOffer: false,
            hasVisibleAddress: false,
            logoPlacement: "Top corner",
            textInstructions: "Modern bold font",
            technicalExecution: "Standard composite"
        };
    }

    // Step 2: Generation (The "Executor")
    
    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the main text area. Style: ${blueprint.textInstructions}. 
      *Ensure correct script rendering (Latin or Devanagari) based on the text.*
    `;

    // For Digital/Service, we force certain text elements more aggressively if they are present in inputs
    const isDigital = campaignType === 'digital';
    
    const shouldShowLogo = (mode === 'remix' && logoBase64) || (blueprint.hasVisibleLogo && logoBase64) || (isDigital && logoBase64);
    const shouldShowProduct = (mode === 'remix' && productName) || (blueprint.hasVisibleProductName && productName);
    const shouldShowOffer = (mode === 'remix' && specialOffer) || (blueprint.hasVisibleOffer && specialOffer);
    const shouldShowWeb = (mode === 'remix' && website) || (blueprint.hasVisibleWebsite && website) || (isDigital && website);
    const shouldShowAddress = (mode === 'remix' && address) || (blueprint.hasVisibleAddress && address);

    if (shouldShowLogo && optLogoHigh) {
        dynamicTextInstructions += `- **LOGO**: Place the provided USER LOGO at: ${blueprint.logoPlacement || 'Top Corner'}. It must look naturally integrated and legible.\n`;
    } else {
        dynamicTextInstructions += `- **LOGO**: DO NOT add a logo.\n`;
    }

    if (shouldShowProduct) {
        dynamicTextInstructions += `- **TITLE/NAME**: Render "${productName}" at: ${blueprint.productNamePlacement || 'Near Headline'}.\n`;
    }

    if (shouldShowOffer) {
        dynamicTextInstructions += `- **CALL TO ACTION / OFFER**: Render "${specialOffer}" at: ${blueprint.offerPlacement || 'Prominent Badge/Button Position'}. Use a button shape, badge, or bold text style.\n`;
    }

    if (shouldShowWeb) {
        dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at: ${blueprint.contactPlacement || 'Bottom Center'}.\n`;
    }

    if (shouldShowAddress) {
        dynamicTextInstructions += `- **ADDRESS**: Render "${address}" near the bottom/contact area.\n`;
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
        genPrompt = `Task: Create a High-End Advertisement.
        
        **EXECUTION PLAN:**
        1. **SCENE**: Recreate the exact aesthetic: "${blueprint.visualStyle}".
        2. **LAYOUT**: ${blueprint.layoutPlan}.
        3. **PRODUCT**: Place the Main Product naturally. Maintain physical scale and shadows.
        `;
    } else {
        // DIGITAL / SERVICE PROMPT (INTELLIGENT RECONSTRUCTION)
        genPrompt = `Task: Design a Marketing-Ready Social Media Ad.
        
        **CONTEXT**: ${productDescription}.
        **MODE**: ${mode === 'replica' ? 'REPLICA (Copy Reference Layout Exactly)' : 'REMIX (Use Reference Mood Only)'}.
        
        **VISUAL STRATEGY (Deduced from Analysis):**
        "${blueprint.technicalExecution}"
        
        **EXECUTION RULES:**
        1. **ASSET TRANSFORMATION**:
           - You identified the necessary technique in the analysis. EXECUTE IT NOW. 
           - If mocking up a screen: The perspective, glare, and bezel must be photorealistic.
           - If placing a person: The lighting on the person must match the background scene perfectly.
           - If logo placement: It must look like a premium brand asset.
        
        2. **COMPOSITION & BACKGROUND**:
           - ${blueprint.visualStyle}.
           - Use professional spacing, whitespace, and hierarchy.
           - Make it look like a paid ad from a top-tier agency.
        
        3. **TYPOGRAPHY & COPY**:
           - Use modern, readable fonts.
           - Text hierarchy: Headline > Offer > Details.
        `;
    }
    
    genPrompt += `
    **TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **CRITICAL CONSTRAINT:**
    - **DO NOT HALLUCINATE TEXT.** Only render the text explicitly provided above.
    - **QUALITY**: Text must be crisp, legible, and spelled correctly. 
    - **OUTPUT**: A single, high-resolution image.`;

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
