
import { getAiClient, callWithRetry } from "./geminiClient";
import { urlToBase64 } from "../utils/imageUtils";

/**
 * AI-Powered Visual DNA Analysis
 * Scans multiple vault images and extracts the signature "Pixa Look" for that feature.
 */
export const analyzeVaultDNA = async (
    featureLabel: string,
    imageUrls: string[]
): Promise<string> => {
    const ai = getAiClient();
    
    // Limit to top 5 images to stay within token/context limits for analysis
    const selectedUrls = imageUrls.slice(0, 5);
    
    const imageParts = await Promise.all(selectedUrls.map(async (url) => {
        const res = await urlToBase64(url);
        return {
            inlineData: {
                data: res.base64,
                mimeType: res.mimeType
            }
        };
    }));

    const prompt = `You are a World-Class Creative Director and Visual Strategist for an AI Design Agency.
    
    TASK: Perform a "Forensic Aesthetic Audit" on these ${selectedUrls.length} reference images for the feature: "${featureLabel}".
    
    GOAL: Extract the "Visual DNA" — the specific design rules that make these images look premium and consistent.
    
    Please analyze and identify:
    1. **Compositional Logic**: Where do subjects sit? (e.g., Centered, Rule of Thirds, extreme close-ups).
    2. **Lighting Architecture**: What is the light source? (e.g., Rim lighting, softbox diffusion, dramatic natural shadows).
    3. **Color Science**: Identify the dominant palette, saturation levels, and contrast ratios.
    4. **Environmental Physics**: Describe background textures, depth of field (bokeh), and setting.
    5. **Material Fidelity**: How are surfaces rendered? (e.g., Matte, glossy, high-specular highlights).
    6. **Typography Standards (If applicable)**: Style, weight, and placement of text.
    
    OUTPUT REQUIREMENT:
    Return a single, comprehensive "DNA Report" (approx 150-200 words). 
    Write it as a DIRECT TECHNICAL COMMAND for a generative AI model. 
    Use strong, authoritative language like "Always utilize...", "Enforce a strict...", "Prioritize...".
    
    Avoid generic fluff. Focus on the hard visual rules seen in these specific examples.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [...imageParts, { text: prompt }]
            }
        });

        return response.text || "Could not generate DNA report.";
    } catch (e) {
        console.error("Vault Analysis Error:", e);
        throw new Error("Pixa failed to analyze the vault. Ensure images are accessible.");
    }
};
