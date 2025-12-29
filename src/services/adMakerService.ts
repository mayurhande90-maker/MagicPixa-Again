import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

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

/**
 * --- PHASE 1: THE AD-INTELLIGENCE ENGINE ---
 * Acts as the CMO, Creative Director, and Forensic Analyst.
 */
interface CreativeBrief {
    forensicReport: string;      // Physical properties & lighting audit
    marketTrends: string;        // Trend research from Google Search
    strategicCopy: {
        headline: string;
        subheadline: string;
        cta: string;
    };
    visualDirection: string;     // Art direction for the rendering engine
}

const performAdIntelligence = async (
    inputs: AdMakerInputs, 
    brand?: BrandKit | null
): Promise<CreativeBrief> => {
    const ai = getAiClient();
    
    // Use smaller low-res assets for analysis to save bandwidth and tokens
    const lowResAssets = await Promise.all(
        inputs.mainImages.slice(0, 2).map(img => optimizeImage(img.base64, img.mimeType, 512))
    );

    const prompt = `You are the Lead Creative Director and Product Strategist for MagicPixa.
    
    *** THE INTELLIGENCE MISSION ***
    Perform a three-stage "Thinking" audit for an upcoming high-end ad campaign.
    
    **STAGE 1: FORENSIC PRODUCT AUDIT**
    Analyze the attached raw photo(s). Identify:
    - **Material Physics**: Glass (reflective), Matte plastic (diffused), Metal (specular), or Fabric?
    - **Source Lighting**: Where is the primary light coming from in the original?
    - **Label Identity**: Precisely read and respect the branding on the product.
    
    **STAGE 2: REAL-TIME TREND PULSE (Use Google Search)**
    - Search for: "High-performing ${inputs.industry} advertising trends 2025" and "Luxury visual styles for ${inputs.productName || 'this niche'}".
    - Identify current winning visual languages (e.g., minimalist organic, high-contrast brutalism, cinematic lifestyle).
    
    **STAGE 3: STRATEGIC COPYWRITING**
    - Rewrite the user's raw input ("${inputs.headline || 'Product'}", "${inputs.offer || ''}") using the AIDA framework.
    - Headline must be short (2-5 words), punchy, and verb-led.
    
    *** OUTPUT REQUIREMENT ***
    Return strictly a JSON object.
    {
        "forensicReport": "Technical physics and lighting blueprint...",
        "marketTrends": "Summary of current industry winning visuals...",
        "strategicCopy": {
            "headline": "AIDA-optimized headline",
            "subheadline": "Benefit-driven sub-header",
            "cta": "Urgent call to action"
        },
        "visualDirection": "Detailed Art Direction for a 4K rendering engine..."
    }`;

    const parts: any[] = [];
    lowResAssets.forEach((asset, i) => {
        parts.push({ text: `RAW PRODUCT ASSET ${i+1}:` });
        parts.push({ inlineData: { data: asset.data, mimeType: asset.mimeType } });
    });
    parts.push({ text: prompt });

    try {
        // OPTIMIZATION: Switched to gemini-3-flash-preview for high speed research and reasoning
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        forensicReport: { type: Type.STRING },
                        marketTrends: { type: Type.STRING },
                        strategicCopy: {
                            type: Type.OBJECT,
                            properties: {
                                headline: { type: Type.STRING },
                                subheadline: { type: Type.STRING },
                                cta: { type: Type.STRING }
                            }
                        },
                        visualDirection: { type: Type.STRING }
                    },
                    required: ["forensicReport", "marketTrends", "strategicCopy", "visualDirection"]
                }
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.warn("Ad intelligence failed, using heuristics", e);
        return {
            forensicReport: "Standard studio lighting, sharp focus.",
            marketTrends: "Clean high-end commercial aesthetic.",
            strategicCopy: {
                headline: inputs.headline || inputs.productName || "Premium Quality",
                subheadline: inputs.subheadline || "Experience Excellence.",
                cta: inputs.cta || "Order Now"
            },
            visualDirection: "Professional product photography with soft shadows."
        };
    }
};

export interface Blueprint {
    id: string;
    label: string;
    desc: string;
    prompt: string;
}

const RETAIL_BLUEPRINTS: Blueprint[] = [
    { id: 'pro_studio', label: 'Studio Look', desc: 'Standard professional studio look.', prompt: 'High-end studio photography style, clean grey/white background, soft diffused 3-point lighting, commercial product focus, high clarity.' },
    { id: 'pure_white', label: 'Clean/Minimalistic', desc: 'Isolated on perfect white.', prompt: 'Isolated product on a solid pure #FFFFFF white background, high-key lighting, soft natural contact shadows only, extremely clean and minimalist.' },
    { id: 'night_luxury', label: 'Luxury', desc: 'Premium dark aesthetic.', prompt: 'Luxury dark mode aesthetic, matte black textures, elegant gold or silver accents, dramatic rim lighting, premium sophisticated atmosphere.' },
    { id: 'nature_vibe', label: 'Nature', desc: 'Earthy and organic feel.', prompt: 'Organic nature theme, natural sunlight dapples, botanical shadows, wooden textures, earth tones, fresh and sustainable look.' },
    { id: 'street_style', label: 'Street/Urban', desc: 'Edgy urban environment.', prompt: 'Bold streetwear aesthetic, high contrast, concrete textures, strong shadows, energetic and edgy urban composition.' }
];

const FOOD_BLUEPRINTS: Blueprint[] = [
    { id: 'wooden_table', label: 'Wood Table', desc: 'Rustic and earthy.', prompt: 'Rustic food photography, placed on a textured dark wooden table, warm ambient lighting, fresh ingredients scattered in background.' },
    { id: 'bright_kitchen', label: 'Kitchen', desc: 'Clean and morning-fresh.', prompt: 'Bright and airy kitchen setting, white marble or tile surfaces, natural morning sunlight, clean and appetizing presentation.' },
    { id: 'moody_cafe', label: 'Cafe', desc: 'Intimate cafe lighting.', prompt: 'Low-light cafe environment, warm tungsten glow, intimate atmosphere, soft bokeh of coffee shop interior in background.' },
    { id: 'sunlit_window', label: 'Window', desc: 'Dramatic natural shadows.', prompt: 'Food placed near a window, strong directional natural sunlight, long dramatic shadows, golden hour warmth, high-end editorial style.' },
    { id: 'neon_diner', label: 'Diner', desc: 'Vibrant and trendy.', prompt: 'Retro diner aesthetic, vibrant neon light reflections, hard flash photography, bold colors, energetic fast-food vibe.' }
];

const REALTY_BLUEPRINTS: Blueprint[] = [
    { id: 'daylight', label: 'Day', desc: 'Bright and airy.', prompt: 'Professional real estate photography in broad daylight, blue sky visible through windows, bright and spacious feel, high dynamic range.' },
    { id: 'sunset_glow', label: 'Sunset', desc: 'Warm and emotional.', prompt: 'Golden hour real estate photography, warm sunset light hitting surfaces, inviting long shadows, emotional and cozy residential glow.' },
    { id: 'city_nights', label: 'Night City', desc: 'Twilight luxury.', prompt: 'Blue hour twilight photography, deep blue sky, interior lights glowing warm through glass, luxurious and premium architectural lighting.' },
    { id: 'clean_interior', label: 'Room', desc: 'Modern and minimalist.', prompt: 'Modern minimalist interior design style, clean lines, neutral desaturated tones, sharp focus, magazine-ready architectural shot.' },
    { id: 'luxury_garden', label: 'Garden', desc: 'Outdoor and green.', prompt: 'Premium outdoor residential shot, lush green landscaping, clear pool or garden area, bright natural light, expensive exterior aesthetic.' }
];

const PROFESSIONAL_BLUEPRINTS: Blueprint[] = [
    { id: 'modern_tech', label: 'Modern', desc: 'Clean and structured.', prompt: 'Modern technology office aesthetic, clean white and blue color palette, structured layout, trustworthy and professional, SaaS software vibe.' },
    { id: 'dark_mode', label: 'Dark', desc: 'Sleek and futuristic.', prompt: 'Futuristic tech dark mode, sleek dark gradients, glowing blue or purple tech accents, professional interface environment, premium software look.' },
    { id: 'warm_trust', label: 'Soft', desc: 'Approachable and soft.', prompt: 'Approachable professional style, beige and soft earth tones, warm natural light, friendly and trustworthy atmosphere, service/healthcare vibe.' },
    { id: 'clean_minimal', label: 'Clean', desc: 'Authoritative and simple.', prompt: 'Minimalist corporate aesthetic, shades of professional grey and white, serious and authoritative, clean high-end studio look.' },
    { id: 'creative_flare', label: 'Creative', desc: 'Artistic and bold.', prompt: 'Modern creative agency style, bold accent colors, artistic lighting, unique geometric background elements, energetic and innovative vibe.' }
];

export const getBlueprintsForIndustry = (industry: string): Blueprint[] => {
    switch (industry) {
        case 'ecommerce':
        case 'fashion':
        case 'fmcg': return RETAIL_BLUEPRINTS;
        case 'food': return FOOD_BLUEPRINTS;
        case 'realty': return REALTY_BLUEPRINTS;
        case 'saas':
        case 'education':
        case 'services': return PROFESSIONAL_BLUEPRINTS;
        default: return RETAIL_BLUEPRINTS;
    }
};

export interface AdMakerInputs {
    industry: 'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services';
    visualFocus?: 'product' | 'lifestyle' | 'conceptual'; 
    aspectRatio?: '1:1' | '4:5' | '9:16';
    mainImages: { base64: string; mimeType: string }[];
    logoImage?: { base64: string; mimeType: string } | null;
    blueprintId?: string; 
    productName?: string;
    offer?: string;
    description?: string;
    project?: string;
    location?: string;
    config?: string;
    features?: string[];
    dishName?: string;
    restaurant?: string;
    headline?: string;
    cta?: string;
    subheadline?: string;
    occasion?: string;
    audience?: string;
    layoutTemplate?: string;
    modelSource?: 'ai' | 'upload';
    modelImage?: { base64: string; mimeType: string } | null;
    modelParams?: {
        gender: string;
        ethnicity: string;
        skinTone: string;
        bodyType: string;
    };
}

/**
 * --- PHASE 2: THE PRODUCTION ENGINE ---
 * Assembles the creative brief, vault references, and product pixels into a final masterpiece.
 */
export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    // 1. EXECUTE CREATIVE DIRECTOR INTELLIGENCE & ASSET PREP IN PARALLEL
    // This removes the serial bottleneck between research and optimization.
    const [brief, vaultData, optimizedMains, optLogo, optModel] = await Promise.all([
        // A. Run Research/Research Pass (Switch to Flash in performAdIntelligence)
        performAdIntelligence(inputs, brand),
        
        // B. Fetch Vault References
        (async () => {
            try {
                const [refs, conf] = await Promise.all([getVaultImages('brand_stylist'), getVaultFolderConfig('brand_stylist')]);
                let dna = conf?.dna || "";
                let assets: { data: string, mimeType: string }[] = [];
                const shuffled = refs.sort(() => 0.5 - Math.random());
                const selectedRefs = shuffled.slice(0, 1);
                assets = await Promise.all(selectedRefs.map(async (r) => { 
                    const res = await urlToBase64(r.imageUrl); 
                    return { data: res.base64, mimeType: res.mimeType }; 
                }));
                return { assets, dna };
            } catch (e) {
                console.warn("Vault fetch failed", e);
                return { assets: [], dna: "" };
            }
        })(),

        // C. Optimize Main Product Assets
        Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))),

        // D. Optimize Secondary Assets
        inputs.logoImage ? optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : Promise.resolve(null),
        (inputs.modelSource === 'upload' && inputs.modelImage) ? optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType, 1536) : Promise.resolve(null)
    ]);

    const parts: any[] = [];
    
    // Identity Lock: Feed high-res product pixels
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `MANDATORY PRODUCT ASSET ${idx + 1} (IDENTITY ANCHOR):` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    if (optModel) parts.push({ text: "TARGET MODEL BIOMETRICS:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    // Vault Influence
    if (vaultData.assets.length > 0) {
        parts.push({ text: "SIGNATURE PIXA QUALITY BENCHMARK:" });
        vaultData.assets.forEach(v => parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } }));
    }

    // 2. ASSEMBLE FINAL MASTER PROMPT
    const brandDNA = brand ? `
    *** BRAND DNA (STRICT) ***
    - Client: '${brand.companyName || brand.name}'
    - Color Palette: ${brand.colors.primary} (Primary), ${brand.colors.accent} (Accent).
    - Font Family: ${brand.fonts.heading}.
    - Instructions: Integrate brand palette into lighting dapples and highlight reflections.
    ` : "";

    const finalPrompt = `You are the High-Fidelity Ad Production Engine.
    
    *** CREATIVE DIRECTOR'S MASTER BRIEF ***
    ${brief.forensicReport}
    ${brief.marketTrends}
    
    *** PRODUCTION MANDATE ***
    ${brief.visualDirection}
    ${brandDNA}
    ${vaultData.dna ? `*** SIGNATURE DESIGN RULES ***\n${vaultData.dna}` : ''}
    
    *** GRAPHIC DESIGN LOGIC ***
    1. **Identity Lock**: Treat product pixels as sacred. Zero alterations to labels or geometry.
    2. **Physics**: Apply 8K ray-traced shadows and material physics compliant with the forensic audit.
    3. **Composition**: Apply "Rule of Thirds". Maintain negative space for text clarity.
    4. **Typography**: Integrate the following copy using elite design hierarchy:
       - HEADLINE: "${brief.strategicCopy.headline}" (Commanding, Bold)
       - SUBHEADER: "${brief.strategicCopy.subheadline}"
       - CALL TO ACTION: "${brief.strategicCopy.cta}" (Urgent, High Contrast)
    
    OUTPUT: A world-class 4K marketing asset for "${inputs.industry}". Magazine quality.`;

    parts.push({ text: finalPrompt });

    try {
        // Keep gemini-3-pro-image-preview for the final high-quality render
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { aspectRatio: inputs.aspectRatio || "1:1", imageSize: "1K" },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        }));
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error("Ad intelligence successfully calculated, but the visual engine failed to render.");
    } catch (e) { console.error("Ad production failed", e); throw e; }
};
