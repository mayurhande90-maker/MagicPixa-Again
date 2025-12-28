
import { Modality, Type, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { BrandKit, IndustryType } from "../types";
import { getVaultImages, getVaultFolderConfig } from "../firebase";

// Optimize images to 1024px
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export interface Blueprint {
    id: string;
    label: string;
    desc: string;
    prompt: string;
}

const RETAIL_BLUEPRINTS: Blueprint[] = [
    { id: 'modern_studio', label: 'Modern Studio', desc: 'Clean white background, soft shadows.', prompt: 'High-end studio photography style, clean white background, soft diffused lighting, minimalist composition, commercial product focus.' },
    { id: 'luxury_dark', label: 'Luxury Dark', desc: 'Black textures, gold accents.', prompt: 'Luxury dark mode aesthetic, matte black textures, elegant gold accents, dramatic rim lighting, premium sophisticated atmosphere.' },
    { id: 'bold_urban', label: 'Bold Urban', desc: 'High contrast, street style.', prompt: 'Bold streetwear aesthetic, high contrast, concrete textures, strong shadows, energetic and edgy composition.' },
    { id: 'pastel_pop', label: 'Pastel Pop', desc: 'Soft colors, playful geometry.', prompt: 'Playful pop art style, soft pastel background colors, geometric shapes, bright studio lighting, fun and youthful vibe.' },
    { id: 'nature_organic', label: 'Nature/Organic', desc: 'Sunlight, leaves, wood textures.', prompt: 'Organic nature theme, natural sunlight, botanical shadows, wooden textures, earth tones, fresh and sustainable look.' }
];

const FOOD_BLUEPRINTS: Blueprint[] = [
    { id: 'rustic_table', label: 'Rustic Table', desc: 'Wooden textures, warm lighting.', prompt: 'Rustic farm-to-table aesthetic, textured wooden surface, warm ambient lighting, fresh ingredients in background, cozy atmosphere.' },
    { id: 'dark_moody', label: 'Dark Moody', desc: 'Slate backgrounds, spotlight.', prompt: 'Dark moody food photography, slate stone background, dramatic spotlight on the dish, rich shadows, high-end steakhouse vibe.' },
    { id: 'bright_fresh', label: 'Bright & Fresh', desc: 'High-key lighting, white marble.', prompt: 'Bright and airy food photography, white marble surface, high-key lighting, fresh herbs, brunch aesthetic, clean and appetizing.' },
    { id: 'neon_diner', label: 'Neon Diner', desc: 'Vibrant colors, hard shadows.', prompt: 'Retro diner aesthetic, vibrant neon colors, hard flash photography shadows, energetic fast-food vibe, bold and colorful.' }
];

const REALTY_BLUEPRINTS: Blueprint[] = [
    { id: 'bright_airy', label: 'Bright Airy', desc: 'Daylight, blue sky, open.', prompt: 'Bright and airy architectural photography, natural daylight, blue sky view, open windows, spacious and welcoming atmosphere.' },
    { id: 'golden_hour', label: 'Golden Hour', desc: 'Warm sunset glow, long shadows.', prompt: 'Golden hour real estate photography, warm sunset light, long dramatic shadows, emotional and inviting glow, exterior curb appeal.' },
    { id: 'twilight_luxury', label: 'Twilight Luxury', desc: 'Evening "Blue Hour", glowing lights.', prompt: 'Twilight "Blue Hour" photography, deep blue sky, interior lights glowing warm, luxurious and premium exterior shot, dramatic lighting.' },
    { id: 'modern_clean', label: 'Modern Clean', desc: 'Architectural lines, desaturated.', prompt: 'Modern architectural style, clean lines, desaturated cool tones, sharp focus, professional portfolio look.' }
];

const PROFESSIONAL_BLUEPRINTS: Blueprint[] = [
    { id: 'corporate_clean', label: 'Corporate Clean', desc: 'White/Blue palette, structured.', prompt: 'Corporate business aesthetic, clean white and blue color palette, structured grid layout, trustworthy and professional, banking/consulting vibe.' },
    { id: 'dark_mode_tech', label: 'Dark Mode Tech', desc: 'Sleek dark interfaces, glowing.', prompt: 'Modern SaaS dark mode aesthetic, sleek dark gradients, glowing tech accents, futuristic interface elements, premium software vibe.' },
    { id: 'warm_trust', label: 'Warm Trust', desc: 'Beige/Soft colors, approachable.', prompt: 'Warm and trustworthy professional style, beige and soft earth tones, human-centric, approachable and caring, healthcare/education vibe.' },
    { id: 'minimalist_grey', label: 'Minimalist Grey', desc: 'Serious, legal/financial.', prompt: 'Minimalist professional aesthetic, shades of grey and white, serious and authoritative, legal or financial firm look, clean typography.' }
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
    mainImage: { base64: string; mimeType: string };
    logoImage?: { base64: string; mimeType: string } | null;
    tone: string;
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
}

const getSystemPrompt = (inputs: AdMakerInputs, brand?: BrandKit | null, vaultDna?: string) => {
    const ratio = inputs.aspectRatio || '1:1';
    
    let layoutRules = "";
    if (ratio === '9:16') {
        layoutRules = `*** TECHNICAL SPEC: INSTAGRAM STORIES/REELS (9:16) ***\n- Safe Zones: Top 14% and Bottom 20% clear. Center 60% focus.`;
    } else if (ratio === '4:5') {
        layoutRules = `*** TECHNICAL SPEC: INSTAGRAM FEED (4:5) ***\n- Maximize real estate. Center-weighted.`;
    } else {
        layoutRules = `*** TECHNICAL SPEC: SQUARE FEED (1:1) ***\n- Balanced grid. Rule of thirds.`;
    }

    // --- CONTEXT SHIELD: Handling Industry Mismatch ---
    let contextShield = "";
    if (brand && brand.industry) {
        const brandIndustry = brand.industry.toLowerCase();
        const targetIndustry = inputs.industry.toLowerCase();
        
        // Logical groups
        const isBrandPhysical = ['physical', 'fashion'].includes(brandIndustry);
        const isTargetRealEstate = targetIndustry === 'realty';
        const isTargetFood = targetIndustry === 'food';

        if (isBrandPhysical && isTargetRealEstate) {
            contextShield = `
            *** CONTEXT SHIELD: PRODUCT-IN-REALTY ***
            - The product from ${brand.companyName} is being featured in a Real Estate setting.
            - **CRITICAL**: Do NOT morph the product into architecture.
            - **GUIDELINE**: Place the product as a luxury "Home Feature" (e.g. on a kitchen island, coffee table, or designer shelf) within the property.
            `;
        } else if (isBrandPhysical && isTargetFood) {
             contextShield = `
            *** CONTEXT SHIELD: PRODUCT-IN-DINING ***
            - This is a ${brand.industry} product in a food environment.
            - **GUIDELINE**: Treat the product as a "Sponsor" or "Table Setting" item. Do NOT make it look edible.
            `;
        }
    }

    const brandDNA = brand ? `
    *** BRAND DNA (STRICT) ***
    - Client: '${brand.companyName || brand.name}'
    - Visual Tone: ${brand.toneOfVoice || inputs.tone}.
    - Color Palette: Dominant Primary=${brand.colors.primary}.
    - Negative Prompts: ${brand.negativePrompts || 'None'}.
    ` : `*** BRAND TONE ***\n- Tone: ${inputs.tone || 'Modern'}`;

    const vaultProtocol = vaultDna ? `
    *** GLOBAL STYLE VAULT PROTOCOL (THE PIXA SIGNATURE) ***
    - **Instruction**: ${vaultDna}
    - **80/20 INNOVATION RULE**: 
      1. (80%) Follow the lighting, shadows, and composition depth of the attached VAULT REFERENCES exactly.
      2. (20%) Innovate on secondary visual elements.
    ` : "";

    const smartMappingLogic = `
    *** INTELLIGENT CONTENT ENGINE ***
    - Synthesize high-impact headlines better than the raw input.
    - Sacred Logo: Use the provided BRAND LOGO exactly.
    `;

    return `You are a World-Class Advertising Director for the ${inputs.industry} industry.
    
    ${vaultProtocol}
    ${contextShield}
    ${layoutRules}
    ${brandDNA}
    ${smartMappingLogic}
    
    GOAL: Create a High-Conversion Ad Creative.
    - Focus: ${inputs.visualFocus || 'product'}.
    - Context: "${inputs.productName || inputs.project || inputs.dishName || inputs.headline}".
    
    OUTPUT: A high-resolution marketing asset designed to stop the scroll.`;
};

export const generateAdCreative = async (inputs: AdMakerInputs, brand?: BrandKit | null): Promise<string> => {
    const ai = getAiClient();
    
    let vaultAssets: { data: string, mimeType: string }[] = [];
    let vaultDna = "";
    try {
        const [refs, conf] = await Promise.all([
            getVaultImages('brand_stylist'),
            getVaultFolderConfig('brand_stylist')
        ]);
        if (conf) vaultDna = conf.dna;
        const shuffled = refs.sort(() => 0.5 - Math.random());
        const selectedRefs = shuffled.slice(0, 2);
        vaultAssets = await Promise.all(selectedRefs.map(async (r) => {
            const res = await urlToBase64(r.imageUrl);
            return { data: res.base64, mimeType: res.mimeType };
        }));
    } catch (e) {
        console.warn("Vault fetch failed", e);
    }

    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optLogo = inputs.logoImage ? await optimizeImage(inputs.logoImage.base64, inputs.logoImage.mimeType) : null;

    const parts: any[] = [];
    parts.push({ text: "MAIN USER ASSET (Subject):" });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    
    if (optLogo) {
        parts.push({ text: "BRAND LOGO:" });
        parts.push({ inlineData: { data: optLogo.data, mimeType: optLogo.mimeType } });
    }

    if (vaultAssets.length > 0) {
        parts.push({ text: "GLOBAL STYLE REFERENCES (THE VAULT):" });
        vaultAssets.forEach(v => {
            parts.push({ inlineData: { data: v.data, mimeType: v.mimeType } });
        });
    }

    const systemPrompt = getSystemPrompt(inputs, brand, vaultDna);
    parts.push({ text: systemPrompt });

    try {
        const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { 
                    aspectRatio: inputs.aspectRatio || "1:1", 
                    imageSize: "1K" 
                },
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
        throw new Error("No image generated.");
    } catch (e) {
        console.error("Ad generation failed", e);
        throw e;
    }
};
