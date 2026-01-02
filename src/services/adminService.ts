import { getAiClient, callWithRetry } from "./geminiClient";
import { urlToBase64, resizeImage } from "../utils/imageUtils";

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
        // RESIZE TO 512px for token efficiency and faster analysis
        const resizedUri = await resizeImage(`data:${res.mimeType};base64,${res.base64}`, 512, 0.7);
        const data = resizedUri.split(',')[1];
        return {
            inlineData: {
                data: data,
                mimeType: 'image/jpeg'
            }
        };
    }));

    const prompt = `You are a World-Class Creative Director.
    
    TASK: Perform a "Forensic Aesthetic Audit" on these reference images for: "${featureLabel}".
    
    GOAL: Extract the "Visual DNA" — specific design rules that make these images look premium and consistent.
    
    Identify:
    1. **Compositional Logic**: (e.g., Centered, Rule of Thirds).
    2. **Lighting Architecture**: (e.g., Rim lighting, softbox).
    3. **Color Science**: Dominant palette and contrast.
    4. **Environmental Physics**: Background depth/bokeh.
    
    OUTPUT: A single comprehensive "DNA Report" (150-200 words) as a DIRECT TECHNICAL COMMAND for an AI model. Use strong language like "Always utilize...", "Enforce...".`;

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