
import { Type, Modality } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
import { resizeImage, makeTransparent } from "../utils/imageUtils";
import { BrandKit } from "../types";

// Helper: Resize to 1280px (HD)
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1280, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export const extractBrandColors = async (base64: string, mimeType: string): Promise<{ primary: string; secondary: string; accent: string }> => {
    const ai = getAiClient();
    try {
        const { data, mimeType: optimizedMime } = await optimizeImage(base64, mimeType);
        
        const prompt = `You are an Expert Visual Identity Designer.
        
        TASK: Analyze this logo image and extract the definitive Brand Color Palette.
        
        **ANALYSIS RULES:**
        1. **Primary**: The most dominant, recognizable brand color. (e.g. Coke Red, Facebook Blue).
        2. **Secondary**: The supporting color used for backgrounds or hierarchy.
        3. **Accent**: A contrasting highlight color. 
           - *Critical*: If the logo is monochrome (e.g. Black/White), generate a sophisticated Accent color that fits the brand's likely industry (e.g. Gold for Luxury, Blue for Tech, Green for Eco). Do NOT return just Black/White.
        
        Return ONLY a JSON object: { "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB" }`;

        const response = await secureGenerateContent({
            model: 'gemini-3-pro-preview', // Upgraded for better color theory reasoning
            contents: {
                parts: [
                    { inlineData: { data, mimeType: optimizedMime } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        primary: { type: Type.STRING },
                        secondary: { type: Type.STRING },
                        accent: { type: Type.STRING }
                    },
                    required: ['primary', 'secondary', 'accent']
                }
            },
            featureName: 'Brand Color Extraction'
        });

        let text = response.text || "";
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        if (!text) return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
        
        return JSON.parse(text);
    } catch (e) {
        console.error("Color extraction failed:", e);
        return { primary: '#000000', secondary: '#ffffff', accent: '#007bff' };
    }
};

/**
 * GENERATE FULL BRAND IDENTITY (AUTO-PILOT)
 * Uses Google Search to infer brand details from a URL or Description.
 */
export const generateBrandIdentity = async (
    url: string, 
    description: string
): Promise<Partial<BrandKit>> => {
    const ai = getAiClient();
    
    const prompt = `You are a World-Class Chief Brand Officer & Design Strategist.
    
    **INPUT DATA**:
    - **Website**: ${url}
    - **Context**: ${description}
    
    **MISSION**: 
    Reverse-engineer a complete, high-fidelity "Brand DNA Kit" by performing a deep analysis of the provided URL and description. 
    You must identify the *actual* brand identity, not just guess generic values.
    
    **EXECUTION PROTOCOL (Use Google Search)**:
    1.  **Crawl & Analyze**: Search for the brand's homepage. Read the 'About', 'Mission', and 'Products' pages.
    2.  **Visual Audit**: Look for the brand's logo, color hex codes (e.g. from design system documentation or CSS analysis descriptions), and typography style.
    3.  **Strategic Profiling**:
        -   **Industry**: Classify into EXACTLY ONE: ['physical', 'digital', 'realty', 'fashion', 'service'].
            -   *Physical*: Tangible goods (food, electronics, beauty).
            -   *Digital*: Software, SaaS, Apps.
            -   *Realty*: Real estate, architecture.
            -   *Fashion*: Clothing, accessories.
            -   *Service*: Consulting, agencies, personal brands.
        -   **Tone of Voice**: Classify into EXACTLY ONE: ['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'].
            -   *Analyze Copy*: Is it slang-heavy? (Playful). Scientific? (Technical). Exclusive? (Luxury).
    
    **DESIGN SYNTHESIS (The Visual DNA)**:
    -   **Colors**:
        -   *Primary*: The main brand color (Hex). If uncertain, deduce from brand psychology (e.g., Green for eco, Blue for trust).
        -   *Secondary*: Complementary color.
        -   *Accent*: High-contrast color for Buttons/CTAs.
    -   **Typography**:
        -   Map their font style to one of: 'Modern Sans', 'Classic Serif', 'Bold Display', 'Elegant Script', 'Minimal Mono'.
    -   **Strategic Constraints**:
        -   *Target Audience*: Define the core demographic (e.g., "Eco-conscious Gen Z", "Enterprise CIOs").
        -   *Negative Prompts*: What visuals would *damage* this brand? (e.g., "cartoon, neon, clutter, low resolution").
    
    **OUTPUT FORMAT**:
    Return strictly a valid JSON object wrapped in a markdown code block.
    Example:
    \`\`\`json
    {
        "companyName": "Exact Brand Name",
        "industry": "physical", 
        "website": "https://...",
        "toneOfVoice": "Professional",
        "targetAudience": "Specific persona",
        "negativePrompts": "specific, visual, avoid, tags",
        "colors": { "primary": "#Hex", "secondary": "#Hex", "accent": "#Hex" },
        "fonts": { "heading": "Modern Sans", "body": "Clean Sans" }
    }
    \`\`\``;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3-pro-preview', // Upgraded to Pro for Deep Research
            contents: { parts: [{ text: prompt }] },
            config: {
                tools: [{ googleSearch: {} }],
            },
            featureName: 'Brand Identity Generation'
        });

        let text = response.text || "{}";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            text = jsonMatch[1];
        }
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(text);
        
        // Safety check for industry enum
        const validIndustries = ['physical', 'digital', 'realty', 'fashion', 'service'];
        if (!validIndustries.includes(parsed.industry)) {
            parsed.industry = 'physical'; // Fallback
        }

        // Safety check for tone enum (fallback to Professional)
        const validTones = ['Professional', 'Luxury', 'Playful', 'Friendly', 'Urgent', 'Technical', 'Minimal'];
        if (!validTones.includes(parsed.toneOfVoice)) {
            parsed.toneOfVoice = 'Professional';
        }

        return parsed;
    } catch (e) {
        console.error("Auto-Brand Generation Failed:", e);
        return {
            companyName: "New Brand",
            industry: 'physical',
            website: url,
            toneOfVoice: "Professional",
            targetAudience: "General",
            negativePrompts: "Low quality, blur, distortion",
            colors: { primary: "#000000", secondary: "#FFFFFF", accent: "#3B82F6" },
            fonts: { heading: "Modern Sans", body: "Clean Sans" }
        };
    }
};

/**
 * COMPETITOR ANALYSIS STRATEGY
 * Uses Gemini 3 Pro with Vision + Google Search to analyze competitor strategy.
 */
export const analyzeCompetitorStrategy = async (
    competitorUrl: string,
    screenshotBase64s: { data: string; mimeType: string }[]
): Promise<{ theirStrategy: string; winningAngle: string; visualGap: string; avoidTags: string }> => {
    const ai = getAiClient();
    
    const parts: any[] = [];
    
    // Add Screenshots for Vision Analysis
    for (const img of screenshotBase64s) {
        parts.push({ inlineData: { data: img.data, mimeType: img.mimeType } });
    }

    const prompt = `You are a World-Class Brand Strategist & Visual Director.
    
    *** INPUTS ***
    - **Competitor Website**: ${competitorUrl}
    - **Competitor Ad Creatives**: (Attached Images)
    
    *** TASK: COMPETITOR INTELLIGENCE REPORT ***
    1. **DEEP SEARCH**: Use Google Search to analyze the competitor's website (${competitorUrl}) for their Value Proposition, Target Audience, and Pricing Tier.
    2. **VISUAL AUDIT**: Analyze the attached ad screenshots. Identify their aesthetic (e.g., "Loud Neon", "Minimalist Beige", "Aggressive Sales").
    
    *** SYNTHESIS: THE WINNING STRATEGY ***
    Based on the audit, generate a strategy for MY brand to win.
    
    1. **Their Strategy**: Describe what they are doing. (e.g., "They focus on speed and low cost with loud red graphics.")
    2. **Winning Angle**: Propose a counter-strategy. (e.g., "We will focus on premium quality and calmness. Be the 'Apple' to their 'Android'.")
    3. **Visual Gap**: What visual space is empty? (e.g., "They lack human emotion. We will use authentic lifestyle photography.")
    4. **Negative Prompts (Avoid Tags)**: List specific visual elements seen in THEIR ads that we must AVOID to prevent looking like them. (e.g., "neon text, clutter, red background, cartoon characters").
    
    *** OUTPUT FORMAT ***
    Return strictly a valid JSON object inside a markdown code block.
    Example:
    \`\`\`json
    {
        "theirStrategy": "Short summary of their vibe...",
        "winningAngle": "Strategic direction for us...",
        "visualGap": "The aesthetic opportunity...",
        "avoidTags": "comma, separated, visual, tags, to, avoid"
    }
    \`\`\``;

    parts.push({ text: prompt });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3-pro-preview', // Pro model required for complex reasoning + search + vision
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }] // Enabled for website analysis
            },
            featureName: 'Competitor Strategy Analysis'
        });

        let text = response.text || "{}";
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
            text = jsonMatch[1];
        }
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(text);
    } catch (e) {
        console.error("Competitor Analysis Failed:", e);
        return {
            theirStrategy: "Analysis failed. Please ensure the URL is valid.",
            winningAngle: "Focus on your unique value proposition.",
            visualGap: "Maintain a clean and consistent visual identity.",
            avoidTags: "low quality, clutter"
        };
    }
};

/**
 * Process Logo Asset:
 * LOGIC UPDATE: We strictly DO NOT regenerate the logo using AI, as this alters the brand identity.
 * 1. If PNG: Return exactly as is.
 * 2. If JPEG (Background): Use client-side pixel manipulation to make white pixels transparent.
 */
export const processLogoAsset = async (base64: string, mimeType: string): Promise<string> => {
    try {
        // If it's a JPEG, assume it needs background removal (white -> transparent)
        if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
            console.log("Processing JPEG logo: Removing white background client-side.");
            const transparentBase64 = await makeTransparent(base64);
            return `data:image/png;base64,${transparentBase64}`;
        }

        // For PNG, WEBP, etc., preserve EXACTLY what the user uploaded.
        // Do not resize unless absolutely necessary (fileToBase64 already handles max dimension safety).
        return `data:${mimeType};base64,${base64}`;

    } catch (e) {
        console.error("Logo processing error", e);
        // Fallback: Return original
        return `data:${mimeType};base64,${base64}`;
    }
};
