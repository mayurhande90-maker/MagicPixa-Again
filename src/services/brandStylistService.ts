
import { Modality, Type, HarmCategory, HarmBlockThreshold, GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
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

// Helper: Detect Aspect Ratio from Image
const getBestAspectRatio = (base64: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            let bestRatio = "1:1";
            
            // Ratios supported by Gemini: "1:1", "3:4", "4:3", "9:16", "16:9"
            const supportedRatios = [
                { id: "1:1", value: 1 },
                { id: "3:4", value: 0.75 },
                { id: "4:3", value: 1.333 },
                { id: "9:16", value: 0.5625 },
                { id: "16:9", value: 1.777 }
            ];

            let minDiff = Infinity;
            for (const r of supportedRatios) {
                const diff = Math.abs(ratio - r.value);
                if (diff < minDiff) {
                    minDiff = diff;
                    bestRatio = r.id;
                }
            }
            resolve(bestRatio);
        };
        img.onerror = () => resolve("1:1"); // Fallback
        img.src = `data:${mimeType};base64,${base64}`;
    });
};

export const generateStyledBrandAsset = async (
    productBase64: string,
    productMime: string,
    referenceBase64: string | undefined,
    referenceMime: string | undefined,
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
    
    // Auto-Pilot Mode detection (No reference provided)
    const isAutoPilot = !referenceBase64 || !referenceMime;

    // 0. Determine Target Aspect Ratio
    // If ref exists, match it. If not, default to 1:1 or use product logic (simplified to 1:1 for Auto)
    const targetAspectRatio = isAutoPilot ? "1:1" : await getBestAspectRatio(referenceBase64!, referenceMime!);

    const [
        optProductLow, 
        optRefLow,
        optProductHigh,
        optRefHigh,
        optLogoHigh
    ] = await Promise.all([
        optimizeImage(productBase64, productMime, 512),
        (!isAutoPilot && referenceBase64 && referenceMime) ? optimizeImage(referenceBase64, referenceMime, 512) : Promise.resolve(null),
        optimizeImage(productBase64, productMime, 1024),
        (!isAutoPilot && referenceBase64 && referenceMime) ? optimizeImage(referenceBase64, referenceMime, 1024) : Promise.resolve(null),
        logoBase64 && logoMime ? optimizeImage(logoBase64, logoMime, 1024) : Promise.resolve(null)
    ]);

    // Step 1: Deep Analysis & Blueprint Strategy
    let analysisPrompt = "";
    let analysisParts: any[] = [];
    let config: any = {};

    if (isAutoPilot) {
        // --- AUTO-PILOT MODE (Research) ---
        analysisPrompt = `You are a World-Class Advertising Director.
        
        TASK: Research & Plan a High-Conversion Ad for this Product.
        PRODUCT CONTEXT: "${productDescription}"
        
        **STEP 1: TREND RESEARCH (Use Google Search)**
        - Search for "Trending ad designs for ${productDescription} 2025".
        - Identify current best-performing layouts, color palettes, and typography styles for this specific niche.
        - Find what visual hooks are working (e.g., Minimalism, Bold Typography, Neon visuals, Nature themes).
        
        **STEP 2: BLUEPRINT CREATION**
        Based on your research, hallucinate a "Reference Style" that would perform best.
        - Define a visual style that maximizes CTR.
        - Plan a layout that follows the "3% Design Rule" (Visual Hierarchy, Cognitive Load).
        
        **OUTPUT REQUIREMENT**:
        Fill the JSON schema below as if you were analyzing a top-tier reference image.
        `;
        
        analysisParts = [
            { text: "USER PRODUCT:" },
            { inlineData: { data: optProductLow.data, mimeType: optProductLow.mimeType } },
            { text: analysisPrompt }
        ];
        
        // Enable Search for Auto-Pilot
        config.tools = [{ googleSearch: {} }];

    } else {
        // --- REFERENCE MODE (Visual Analysis) ---
        analysisPrompt = `You are a Creative Director applying the "3% Design Rule" for High-Conversion Ads.
        INPUTS: Reference Image (Target Style), Product Image (User Item).
        
        **DESIGN SCIENCE AUDIT (Analyze the Reference):**
        1. **Visual Hierarchy**: How does the reference guide the eye? (e.g., Headline -> Value -> Proof -> CTA).
        2. **Typography**: Is the text 3D/Extruded (Physical) or 2D/Flat? Does it use specific weights for hierarchy?
        3. **White Space**: Analyze the "breathing room". Is it generous (Luxury) or tight (Retail)?
        4. **Color Psychology**: What emotion does the palette convey? (Trust, Urgency, Authenticity)?
        
        **TASK**: 
        Plan a new layout for the User's Product that mimics this success formula.
        `;
        
        analysisParts = [
            { text: "REFERENCE IMAGE (Style/Vibe):" },
            { inlineData: { data: optRefLow!.data, mimeType: optRefLow!.mimeType } },
            { text: "USER ASSET (To be transformed):" },
            { inlineData: { data: optProductLow.data, mimeType: optProductLow.mimeType } },
            { text: analysisPrompt }
        ];
    }

    // Common JSON Schema Instruction
    const jsonSchemaPart = `
    - **Headline**: Write a catchy, verb-led headline (2-5 words) for "${productDescription}" in ${language}.
    
    OUTPUT JSON:
    {
        "visualStyle": "Detailed description of lighting, colors, and composition...",
        "layoutPlan": "Instructions for 'One Focal Point' composition...",
        "generatedHeadline": "Verb-led, high-impact headline",
        "detectedTypographyType": "Either '3D' or '2D'",
        "referenceHasProductName": boolean, 
        "referenceHasOfferBadge": boolean, 
        "referenceHasWebsite": boolean, 
        "referenceHasAddress": boolean,
        "logoPlacement": "Where to place logo for brand consistency",
        "productNamePlacement": "Location for product name",
        "offerPlacement": "High-visibility location for offer",
        "contactPlacement": "Low-friction location for contact info",
        "textInstructions": "Font weights and contrast rules",
        "technicalExecution": "Lighting and blending notes"
    }`;

    analysisParts.push({ text: jsonSchemaPart });

    // Execute Analysis
    const analysisResponse = await secureGenerateContent({
        model: 'gemini-3-pro-preview',
        contents: { parts: analysisParts },
        config: {
            ...config,
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
                required: ["visualStyle", "layoutPlan", "generatedHeadline", "technicalExecution", "detectedTypographyType"]
            }
        },
        featureName: 'Brand Stylist Analysis'
    });

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
    let typographyInstruction = "";
    if (blueprint.detectedTypographyType === "3D") {
        typographyInstruction = `**3D TYPOGRAPHY**: The text MUST be 3D, extruded, and have physical depth/shadows. High contrast for legibility.`;
    } else {
        typographyInstruction = `**2D TYPOGRAPHY**: Flat, clean, vector-style text. Use weights (Bold vs Light) to create hierarchy.`;
    }

    // Logic to force elements if User Input exists, even if Ref doesn't have them
    const showProduct = productName ? true : blueprint.referenceHasProductName;
    const showOffer = specialOffer ? true : blueprint.referenceHasOfferBadge;
    const showWebsite = website ? true : blueprint.referenceHasWebsite;
    const showAddress = address ? true : blueprint.referenceHasAddress;

    let dynamicTextInstructions = `
    - **HEADLINE**: Render "${blueprint.generatedHeadline}" in the PRIMARY OPTICAL ZONE (Top or Center Left). 
      **STYLE**: ${fontStyle}. ${typographyInstruction}
    `;

    if (showProduct && productName) {
        dynamicTextInstructions += `- **PRODUCT NAME**: Render "${productName}" at ${blueprint.productNamePlacement || 'Bottom Center'}.\n`;
    }

    if (showOffer && specialOffer) {
        dynamicTextInstructions += `- **OFFER (The Hook)**: Render "${specialOffer}" as a High-Contrast Element (Badge/Sticker) at ${blueprint.offerPlacement || 'Top Right'}. Must trigger the "Fear of Missing Out" or "Value" emotion.\n`;
    }

    if (showWebsite && website) dynamicTextInstructions += `- **WEBSITE**: Render "${website}" at ${blueprint.contactPlacement || 'Bottom'}.\n`;
    if (showAddress && address) dynamicTextInstructions += `- **ADDRESS**: Render "${address}" at ${blueprint.contactPlacement || 'Bottom'}.\n`;
    dynamicTextInstructions += `- **NO PHONE NUMBER**: Do not render phone numbers unless explicitly asked.\n`;

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

    let genPrompt = `Task: Create a High-Conversion Ad Creative.
    
    **VISUAL STRATEGY**: Recreate this aesthetic: "${blueprint.visualStyle}".
    **BRANDING**: Use ${brandColor ? `Color ${brandColor}` : 'matching palette'} to evoke emotion.
    **LAYOUT**: ${blueprint.layoutPlan}. Apply the "Rule of Thirds".
    **ASPECT RATIO**: ${targetAspectRatio}.
    `;
    
    genPrompt += `
    *** CONVERSION DESIGN PROTOCOL ***
    1. **Focal Point**: The User Product is the HERO. It must be the first thing the eye sees. Relight it to pop against the background.
    2. **Visual Flow**: Ensure the eye travels from Image -> Headline -> Offer/CTA.
    3. **Reduce Friction**: Keep the background clean and supportive (Generous White Space rules apply). No visual clutter.
    4. **Realism**: Add realistic contact shadows and reflections so the product feels tangible ("Touch effect").
    
    **TEXT EXECUTION (STRICT):**
    ${dynamicTextInstructions}
    
    **FINAL OUTPUT**: A high-resolution marketing asset designed to stop the scroll within 2 seconds.`;

    parts.push({ text: genPrompt });

    const genResponse = await secureGenerateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts },
        config: { 
            responseModalities: [Modality.IMAGE],
            imageConfig: {
                aspectRatio: targetAspectRatio,
                imageSize: "1K"
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        },
        featureName: 'Brand Stylist Generation'
    });

    const imagePart = genResponse.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated. The request might have been blocked.");
};
