
import { Modality, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
    brandName: string,
    website: string,
    phoneNumber: string,
    address: string,
    productDescription: string
): Promise<string> => {
    const ai = getAiClient();
    
    // PERFORMANCE OPTIMIZATION: 
    // 1. Generate Low-Res versions (512px) for the Analysis step (Fast, low latency).
    // 2. Generate High-Res versions (1280px) for the final Generation step (High quality).
    
    const [
        // Analysis Assets (Fast)
        optProductLow, 
        optRefLow,
        // Generation Assets (Quality)
        optProductHigh,
        optRefHigh,
        optLogoHigh
    ] = await Promise.all([
        optimizeImage(productBase64, productMime, 512),
        optimizeImage(referenceBase64, referenceMime, 512),
        optimizeImage(productBase64, productMime, 1280),
        optimizeImage(referenceBase64, referenceMime, 1280),
        logoBase64 && logoMime ? optimizeImage(logoBase64, logoMime, 1024) : Promise.resolve(null)
    ]);

    // Step 1: Deep Analysis (The "Intelligent Planner")
    // Uses Low-Res images to speed up the request significantly.
    const analysisPrompt = `You are a Senior Creative Director and AI Layout Expert.
    
    INPUTS:
    1. **Reference Image** (The style/layout target).
    2. **Product Image** (The user's item).

    TASK:
    1. **Analyze Product**: Look at the Product Image. Identify what it is (e.g., "Coffee Bag", "Perfume Bottle"). Read any visible text on the packaging to understand the brand vibe.
    2. **Analyze Reference Layout (STRICT CHECK)**:
       - Does the Reference Image contain a **visible Logo**? (Yes/No)
       - Does it contain a **Website URL**? (Yes/No)
       - Does it contain a **Phone Number**? (Yes/No)
       - Does it contain a **Physical Address**? (Yes/No)
       - Where is the main headline? What font style/size?
       - What is the lighting/environment mood?
    3. **Create a Transfer Plan**:
       - Write a new headline based on: "${productDescription}".
       - Determine exact placements for text/logo based *only* on what exists in the Reference.
    
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions on where to place the product...",
        "generatedHeadline": "A creative headline (2-5 words) fitting the product and style",
        "hasVisibleLogo": boolean,
        "hasVisibleWebsite": boolean,
        "hasVisiblePhone": boolean,
        "hasVisibleAddress": boolean,
        "logoPlacement": "Description of where to place the logo IF it exists in reference",
        "contactPlacement": "Description of where to place contact info IF it exists in reference",
        "textInstructions": "Specific instructions on font style and color to match reference"
    }`;

    // Wrapped in callWithRetry to handle 503 Overloaded errors
    const analysisResponse = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
            parts: [
                { text: "REFERENCE IMAGE:" },
                { inlineData: { data: optRefLow.data, mimeType: optRefLow.mimeType } },
                { text: "PRODUCT IMAGE:" },
                { inlineData: { data: optProductLow.data, mimeType: optProductLow.mimeType } },
                { text: analysisPrompt }
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
                    hasVisiblePhone: { type: Type.BOOLEAN },
                    hasVisibleAddress: { type: Type.BOOLEAN },
                    logoPlacement: { type: Type.STRING },
                    contactPlacement: { type: Type.STRING },
                    textInstructions: { type: Type.STRING }
                },
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "hasVisibleLogo", "hasVisibleWebsite", "hasVisiblePhone", "hasVisibleAddress"]
            }
        }
    }));

    let blueprint;
    try {
        blueprint = JSON.parse(analysisResponse.text || "{}");
    } catch (e) {
        console.error("Analysis parsing failed", e);
        // Fallback safe defaults
        blueprint = {
            visualStyle: "Professional studio lighting",
            layoutPlan: "Center product",
            generatedHeadline: "Premium Quality",
            hasVisibleLogo: true,
            hasVisibleWebsite: false,
            hasVisiblePhone: false,
            hasVisibleAddress: false,
            logoPlacement: "Top corner",
            textInstructions: "Modern bold font"
        };
    }

    // Step 2: Generation (The "Executor")
    // Uses High-Res images for best quality output.
    
    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the main text area. Style: ${blueprint.textInstructions}.
    `;

    if (blueprint.hasVisibleLogo) {
        if (optLogoHigh) {
            dynamicTextInstructions += `- **LOGO**: Place the provided USER LOGO at: ${blueprint.logoPlacement}. It must look naturally integrated.\n`;
        } else if (brandName) {
            dynamicTextInstructions += `- **LOGO**: Render brand name "${brandName}" at: ${blueprint.logoPlacement} as a text logo.\n`;
        }
    } else {
        dynamicTextInstructions += `- **LOGO**: DO NOT add a logo, as the reference image does not have one.\n`;
    }

    if (blueprint.hasVisibleWebsite && website) {
        dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at: ${blueprint.contactPlacement}.\n`;
    } else {
        dynamicTextInstructions += `- **WEBSITE**: Do NOT add a website URL.\n`;
    }

    if (blueprint.hasVisiblePhone && phoneNumber) {
        dynamicTextInstructions += `- **PHONE**: Render "${phoneNumber}" near the contact area.\n`;
    } else {
        dynamicTextInstructions += `- **PHONE**: Do NOT add a phone number.\n`;
    }

    if (blueprint.hasVisibleAddress && address) {
        dynamicTextInstructions += `- **ADDRESS**: Render "${address}" near the bottom/contact area.\n`;
    } else {
        dynamicTextInstructions += `- **ADDRESS**: Do NOT add an address.\n`;
    }

    const parts: any[] = [];
    
    parts.push({ text: "MAIN PRODUCT:" });
    parts.push({ inlineData: { data: optProductHigh.data, mimeType: optProductHigh.mimeType } });
    
    if (optLogoHigh) {
        parts.push({ text: "USER LOGO:" });
        parts.push({ inlineData: { data: optLogoHigh.data, mimeType: optLogoHigh.mimeType } });
    }

    const genPrompt = `Task: Create a Final High-End Advertisement.
    
    **EXECUTION PLAN (Strictly Follow):**
    1. **SCENE**: Recreate the exact aesthetic described here: "${blueprint.visualStyle}".
    2. **PRODUCT**: Place the Main Product into this scene naturally. Maintain its identity, shape, and label text.
    3. **LAYOUT**: ${blueprint.layoutPlan}.
    
    **SMART TEXT PLACEMENT RULES (STRICT):**
    ${dynamicTextInstructions}
    
    **CRITICAL CONSTRAINT:**
    - **DO NOT HALLUCINATE CONTACT INFO.** If the instructions above say "Do NOT add...", then the final image MUST NOT contain that text element.
    - Only add text if specifically instructed above based on the Reference Analysis.
    
    **QUALITY CONTROL:**
    - Text must be spelled correctly.
    - Lighting on the product must match the new environment.
    - The final image should look like a finished graphic design piece.
    
    Output a single, high-resolution image.`;

    parts.push({ text: genPrompt });

    // Wrapped in callWithRetry to handle 503 Overloaded errors
    const genResponse = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            // CRITICAL: Disable safety blocks to allow generating text like phone numbers/addresses
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
