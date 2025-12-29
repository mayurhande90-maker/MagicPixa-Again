import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit, IndustryType } from "../types";
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

// Helper: Detect Aspect Ratio from Image
const getBestAspectRatio = (base64: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            let bestRatio = "1:1";
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
        img.onerror = () => resolve("1:1");
        img.src = `data:${mimeType};base64,${base64}`;
    });
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
}

const getSystemPrompt = (inputs: AdMakerInputs, brand?: BrandKit | null, vaultDna?: string, hasReference?: boolean) => {
    const ratio = inputs.aspectRatio || '1:1';
    const isCollection = inputs.mainImages.length > 1;
    const focus = inputs.visualFocus || 'product';
    
    let layoutRules = "";
    if (ratio === '9:16') {
        layoutRules = `*** TECHNICAL SPEC: VERTICAL STORY (9:16) ***\n- Safe Zones: Top 15% and Bottom 20% clear. Center focus.`;
    } else if (ratio === '4:5') {
        layoutRules = `*** TECHNICAL SPEC: PORTRAIT FEED (4:5) ***\n- Maximize visual height.`;
    } else {
        layoutRules = `*** TECHNICAL SPEC: SQUARE FEED (1:1) ***\n- Balanced composition.`;
    }

    let visualFocusMandate = "";
    if (focus === 'lifestyle') {
        visualFocusMandate = `
        *** LIFESTYLE PRODUCTION MANDATE (CRITICAL) ***
        - **SCENE**: You MUST generate a high-end, photorealistic human model that matches the target audience: "${inputs.audience || 'General'}".
        - **INTERACTION**: The model MUST be interacting with, holding, wearing, or looking at the PRODUCT ASSETS provided.
        - **CONTEXT**: If it's Fashion, the model wears it. If it's Food, the model is about to eat it or is served it. If it's Tech, they are using it.
        - **INTEGRATION**: Use realistic contact shadows and depth-of-field. The product must look physically present in the model's environment.
        `;
    } else if (focus === 'conceptual') {
        visualFocusMandate = `
        *** CONCEPTUAL ART MANDATE ***
        - **STYLING**: Use abstract elements, creative lighting, and high-art compositions.
        - **METAPHOR**: Use the background to tell a story about the product's benefits (e.g., speed = light streaks).
        `;
    } else {
        visualFocusMandate = `
        *** PRODUCT-ONLY MANDATE ***
        - **FOCUS**: No humans. Just the product assets in a premium studio or themed environment.
        - **CLARITY**: Maximize detail on the product surfaces and textures.
        `;
    }

    let inheritanceDirective = "";
    if (hasReference) {
        inheritanceDirective = `
        *** VISUAL INHERITANCE PROTOCOL (MASTER PRIORITY) ***
        - Replicate the exact visual architecture, color grading, and lighting of the attached REFERENCE IMAGE.
        - **STRUCTURE**: Place the text and products in the exact same positions relative to the canvas.
        - **AESTHETIC**: Inherit the mood, lens bokeh, and material finishes from the reference.
        `;
    }

    const brandDNA = brand ? `
    *** BRAND DNA (STRICT) ***
    - Client: '${brand.companyName || brand.name}'
    - Visual Tone: ${brand.toneOfVoice || 'Professional'}.
    - Color Palette: Dominant Primary=${brand.colors.primary}.
    - Typography Style: ${brand.fonts.heading}.
    - Instruction: Subtly use the brand colors in accents, clothing, or subtle background lighting.
    ` : `*** BRAND TONE ***\n- Tone: Professional`;

    return `You are an Elite Ad Creative Director specialized in ${inputs.industry} advertising.
    
    ${visualFocusMandate}
    ${inheritanceDirective}
    ${brandDNA}
    ${vaultDna ? `*** SIGNATURE VAULT DNA ***\n${vaultDna}` : ''}
    ${layoutRules}
    
    GOAL: Create a single 4K, photorealistic marketing asset for "${inputs.productName || inputs.project || inputs.dishName || inputs.headline}".
    
    *** EXECUTION RULES ***
    1. **Identity Lock**: You MUST preserve the exact appearance of the uploaded PRODUCT ASSETS. Do not change their shape or labels.
    2. **Physics**: Apply ray-traced shadows, realistic reflections, and professional lens physics (aperture f/2.8 style bokeh).
    3. **Copywriting**: Render "${inputs.headline || ''}" and "${inputs.offer || ''}" in high-contrast, professional typography that flows with the composition.
    4. **No Fluff**: No artifacts, no watermarks, no distorted faces.
    
    OUTPUT: A high-resolution advertisement.`;
};

export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    let vaultAssets: { data: string, mimeType: string }[] = [];
    let vaultDna = "";
    try {
        const [refs, conf] = await Promise.all([getVaultImages('brand_stylist'), getVaultFolderConfig('brand_stylist')]);
        if (conf) vaultDna = conf.dna;
        const shuffled = refs.sort(() => 0.5 - Math.random());
        const selectedRefs = shuffled.slice(0, 1);
        vaultAssets = await Promise.all(selectedRefs.map(async (r) => { const res = await urlToBase64(r.imageUrl); return { data: res.base64, mimeType: res.mimeType }; }));
    } catch (e) { console.warn("Vault fetch failed", e); }

    const optimizedMains = await Promise.all(inputs.mainImages.map(img => optimizeImage(img.base64, img.mimeType, 1536))); // Increased res
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType, 1024) : null;
    
    const refImg = (inputs as any).referenceImage;

    const parts: any[] = [];
    
    optimizedMains.forEach((opt, idx) => {
        parts.push({ text: `PRODUCT ASSET ${idx + 1}:` }, { inlineData: { data: opt.data, mimeType: opt.mimeType } });
    });
    
    if (optLogo) parts.push({ text: "BRAND LOGO:" }, { inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });

    if (refImg) {
        const optRef = await optimizeImage(refImg.base64, refImg.mimeType, 1024);
        parts.push({ text: "STYLE REFERENCE:" }, { inlineData: { data: optRef.data, mimeType: optRef.mimeType } });
    }

    const systemPrompt = getSystemPrompt(inputs, brand, vaultDna, !!refImg);
    parts.push({ text: systemPrompt });

    try {
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
        throw new Error("No image generated by the AI production engine.");
    } catch (e) { console.error("Ad production failed", e); throw e; }
};