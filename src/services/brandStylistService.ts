
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
    mode: 'replica' | 'remix' = 'replica'
): Promise<string> => {
    const ai = getAiClient();
    
    // PERFORMANCE OPTIMIZATION: 
    // 1. Generate Low-Res versions (512px) for the Analysis step (Fast, low latency).
    // 2. Generate Standard HD versions (1024px) for the final Generation step (Faster than 1280px, good quality).
    
    const [
        // Analysis Assets (Fast)
        optProductLow, 
        optRefLow,
        // Generation Assets (Quality - Optimized to 1024px)
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

    // Step 1: Deep Analysis (The "Intelligent Planner")
    let analysisPrompt = "";

    if (mode === 'replica') {
        analysisPrompt = `You are a Senior Creative Director and AI Layout Expert.
        
        INPUTS:
        1. **Reference Image** (The style/layout target).
        2. **Product Image** (The user's item).

        TASK:
        1. **Analyze Product**: Look at the Product Image. Identify what it is.
        2. **Analyze Reference Layout (STRICT CHECK)**:
           - Does the Reference Image contain a **visible Logo**? (Yes/No)
           - Does it contain a **Website URL**? (Yes/No)
           - Does it contain a **Product Name** or **Title** text? (Yes/No)
           - Does it contain a **Special Offer** or **Discount Badge**? (Yes/No)
           - Does it contain a **Physical Address**? (Yes/No)
           - Where is the main headline? What font style/size?
           - What is the lighting/environment mood?
        3. **Create a Transfer Plan**:
           - Write a new headline based on: "${productDescription}".
           - Determine exact placements for text/logo based *only* on what exists in the Reference.
           - The goal is to DUPLICATE the reference layout structure exactly.
        
        OUTPUT JSON (Structure below).`;
    } else {
        // Remix Mode
        analysisPrompt = `You are a Visionary Art Director and Trend Specialist.

        INPUTS: Reference Image (Style Source), Product Image.

        TASK:
        1. **Extract Vibe**: Analyze the Reference Image. Ignore the strict layout. Extract the *Mood*, *Color Palette*, *Lighting Style*, and *Typography Aesthetic*.
        2. **Analyze Product**: Understand the product shape and best angle.
        3. **Trend Search**: Apply top 2025 advertising design trends for this product category.
        4. **Create a Remix Plan**:
           - Create a NEW, superior layout.
           - Determine where text/logos *should* go for maximum impact, regardless of where they are in the reference.
           - Suggest placements for Product Name, Offer, etc. that look professional.
           - Focus on "High CTR", "Modern Minimalist", or "Dynamic" aesthetics.

        OUTPUT JSON (Structure below).`;
    }

    const jsonSchemaPart = `
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the product...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style",
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

    // Wrapped in callWithRetry to handle 503 Overloaded errors
    const analysisResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: "REFERENCE IMAGE:" },
                { inlineData: { data: optRefLow.data, mimeType: optRefLow.mimeType } },
                { text: "PRODUCT IMAGE:" },
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
            layoutPlan: "Center product",
            generatedHeadline: "Premium Quality",
            hasVisibleLogo: true,
            hasVisibleWebsite: false,
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
    `;

    // Logic to respect user inputs even if "hasVisible..." is false in Remix mode if sensible
    const shouldShowLogo = (mode === 'remix' && logoBase64) || (blueprint.hasVisibleLogo && logoBase64);
    const shouldShowProduct = (mode === 'remix' && productName) || (blueprint.hasVisibleProductName && productName);
    const shouldShowOffer = (mode === 'remix' && specialOffer) || (blueprint.hasVisibleOffer && specialOffer);
    const shouldShowWeb = (mode === 'remix' && website) || (blueprint.hasVisibleWebsite && website);
    const shouldShowAddress = (mode === 'remix' && address) || (blueprint.hasVisibleAddress && address);

    if (shouldShowLogo && optLogoHigh) {
        dynamicTextInstructions += `- **LOGO**: Place the provided USER LOGO at: ${blueprint.logoPlacement || 'Top Corner'}. It must look naturally integrated.\n`;
    } else {
        dynamicTextInstructions += `- **LOGO**: DO NOT add a logo.\n`;
    }

    if (shouldShowProduct) {
        dynamicTextInstructions += `- **PRODUCT NAME**: Render "${productName}" at: ${blueprint.productNamePlacement || 'Near Product'}.\n`;
    }

    if (shouldShowOffer) {
        dynamicTextInstructions += `- **SPECIAL OFFER**: Render "${specialOffer}" at: ${blueprint.offerPlacement || 'Prominent Badge Position'}. Use a badge, sticker, or bold text style.\n`;
    }

    if (shouldShowWeb) {
        dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at: ${blueprint.contactPlacement || 'Bottom Center'}.\n`;
    }

    if (shouldShowAddress) {
        dynamicTextInstructions += `- **ADDRESS**: Render "${address}" near the bottom/contact area.\n`;
    }

    const parts: any[] = [];
    
    parts.push({ text: "MAIN PRODUCT:" });
    parts.push({ inlineData: { data: optProductHigh.data, mimeType: optProductHigh.mimeType } });
    
    if (optLogoHigh) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogoHigh.data, mimeType: optLogoHigh.mimeType } });
    }

    let genPrompt = `Task: Create a Final High-End Advertisement.\n`;
    
    if (mode === 'replica') {
        genPrompt += `
        **EXECUTION PLAN (Strict Replica):**
        1. **SCENE**: Recreate the exact aesthetic described here: "${blueprint.visualStyle}".
        2. **LAYOUT**: ${blueprint.layoutPlan} (Match reference structure).
        3. **PRODUCT**: Place the Main Product naturally.
        `;
    } else {
        genPrompt += `
        **EXECUTION PLAN (Creative Remix):**
        1. **SCENE**: Create a stunning scene based on this direction: "${blueprint.visualStyle}".
        2. **LAYOUT**: ${blueprint.layoutPlan}. Use professional design principles (Rule of Thirds, Golden Ratio). Ignore the reference layout if it's cluttered.
        3. **IMPROVEMENT**: Apply "2025 Design Trends" (Depth of field, dynamic lighting, texture) to make it look better than the original reference.
        `;
    }
    
    genPrompt += `
    **SMART TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **CRITICAL CONSTRAINT:**
    - **DO NOT HALLUCINATE TEXT.** If the instructions above say "Do NOT add...", then the final image MUST NOT contain that text element.
    - Only add text if specifically instructed above.
    
    **QUALITY CONTROL:**
    - Text must be legible and spelled correctly.
    - Lighting on the product must match the new environment.
    - The final image should look like a finished graphic design piece.
    
    Output a single, high-resolution image.`;

    parts.push({ text: genPrompt });

    // Wrapped in callWithRetry to handle 503 Overloaded errors
    const genResponse = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            // CRITICAL: Disable safety blocks to allow generating text like phone numbers/addresses/offers
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
