
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
    presentationStyle: string = 'Standard'
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
        // EXISTING LOGIC FOR PHYSICAL PRODUCTS
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
        // NEW LOGIC FOR DIGITAL / SERVICE ADS
        analysisPrompt = `You are a World-Class "Ad Guru" specializing in SaaS, Coaching, and Service Marketing.
        
        INPUTS:
        1. **Asset Image**: This is likely a Screenshot, a Logo, or a Person's Headshot.
        2. **Reference Image**: The visual style target.
        3. **Presentation Style**: ${presentationStyle}.
        
        TASK:
        1. **Analyze Asset**: Is it a flat UI screenshot? A headshot? A logo?
        2. **Analyze Reference Vibe**: Extract the color palette, typography hierarchy, and "Trust Signals" (cleanliness, whitespace).
        3. **Develop Digital Strategy**:
           - If Screenshot: Plan to wrap it in a realistic device mockup (Laptop/Phone) or float it in 3D space.
           - If Headshot: Plan to place the person in a professional, authoritative environment (Stage, Studio, Modern Office) with perfect lighting.
           - If Logo: Plan a minimal, high-trust corporate background.
           - **Typography**: Plan for BOLD, sans-serif, high-contrast headlines that are easy to read on mobile.
           - Write a compelling, benefit-driven headline for "${productDescription}". ${languageInstruction}.
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
        "textInstructions": "Specific instructions on font style and color"
    }`;

    const analysisResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: "REFERENCE IMAGE:" },
                { inlineData: { data: optRefLow.data, mimeType: optRefLow.mimeType } },
                { text: "USER ASSET / PRODUCT:" },
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
                    textInstructions: { type: Type.STRING }
                },
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "hasVisibleLogo", "hasVisibleWebsite", "hasVisibleProductName", "hasVisibleOffer"]
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
            textInstructions: "Modern bold font"
        };
    }

    // Step 2: Generation (The "Executor")
    
    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the main text area. Style: ${blueprint.textInstructions}. 
      *Ensure correct script rendering (Latin or Devanagari) based on the text.*
    `;

    // For Digital/Service, we force certain text elements more aggressively
    const isDigital = campaignType === 'digital';
    
    const shouldShowLogo = (mode === 'remix' && logoBase64) || (blueprint.hasVisibleLogo && logoBase64) || (isDigital && logoBase64);
    const shouldShowProduct = (mode === 'remix' && productName) || (blueprint.hasVisibleProductName && productName);
    const shouldShowOffer = (mode === 'remix' && specialOffer) || (blueprint.hasVisibleOffer && specialOffer);
    const shouldShowWeb = (mode === 'remix' && website) || (blueprint.hasVisibleWebsite && website) || (isDigital && website);
    const shouldShowAddress = (mode === 'remix' && address) || (blueprint.hasVisibleAddress && address);

    if (shouldShowLogo && optLogoHigh) {
        dynamicTextInstructions += `- **LOGO**: Place the provided USER LOGO at: ${blueprint.logoPlacement || 'Top Corner'}. It must look naturally integrated.\n`;
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
    
    parts.push({ text: "MAIN ASSET (Product/Screenshot/Photo):" });
    parts.push({ inlineData: { data: optProductHigh.data, mimeType: optProductHigh.mimeType } });
    
    if (optLogoHigh) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogoHigh.data, mimeType: optLogoHigh.mimeType } });
    }

    let genPrompt = "";

    if (campaignType === 'physical') {
        // STANDARD PHYSICAL PRODUCT PROMPT
        genPrompt = `Task: Create a High-End Advertisement.
        
        **EXECUTION PLAN:**
        1. **SCENE**: Recreate the exact aesthetic: "${blueprint.visualStyle}".
        2. **LAYOUT**: ${blueprint.layoutPlan}.
        3. **PRODUCT**: Place the Main Product naturally. Maintain physical scale and shadows.
        `;
    } else {
        // NEW DIGITAL / SERVICE PROMPT
        genPrompt = `Task: Design a World-Class Service/Digital Ad Post.
        
        **CONTEXT**: The user is selling a Service, App, or Personal Brand.
        **STYLE**: ${presentationStyle}.
        **VIBE**: "${blueprint.visualStyle}".
        
        **EXECUTION RULES (The Ad Guru Method):**
        1. **THE ASSET TRANSFORMATION**:
           - IF the Main Asset is a UI SCREENSHOT: You MUST wrap it onto a realistic 3D device mockup (iPhone 15 Titanium or MacBook Pro) based on the aspect ratio. Do not just paste it flat. Angle it dynamically.
           - IF the Main Asset is a PERSON (Headshot): Relight them. Remove the original background and place them in a "${blueprint.visualStyle}" environment (e.g., Blurred Office, Abstract Studio, Ted-Talk Stage). They must look authoritative.
           - IF the Main Asset is a LOGO: Create a 3D Glass or Metallic version of it on a premium background.
        
        2. **COMPOSITION**:
           - Use "Rule of Thirds". Place the Subject (Device/Person) on one side or center, and the Headline in the negative space.
           - Create depth. Foreground blur (bokeh) or abstract tech elements (data streams, glass shapes) if appropriate.
        
        3. **TYPOGRAPHY**:
           - Use Modern, Sans-Serif fonts (like Inter, Roboto, Helvetica).
           - High Contrast. White text on dark backgrounds or Black on light.
           - Text must be LEADING the eye.
        `;
    }
    
    genPrompt += `
    **SMART TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **CRITICAL CONSTRAINT:**
    - **DO NOT HALLUCINATE TEXT.** If instructions say "Do NOT add...", then the final image MUST NOT contain that text.
    - **QUALITY**: Text must be legible and spelled correctly. Lighting must match. 
    - **OUTPUT**: A single, high-resolution image ready for Social Media.`;

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
