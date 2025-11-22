
import { Modality, Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { Base64File } from "../utils/imageUtils";

export const suggestThumbnailTitles = async (videoDescription: string): Promise<string[]> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Suggest 5 catchy, click-worthy YouTube thumbnail titles for a video about: ${videoDescription}. Return only a JSON array of strings.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
};

export const analyzeVideoFrames = async (
    frames: { base64: Base64File }[]
): Promise<{ titles: string[]; bestFrameIndex: number }> => {
    const ai = getAiClient();
    
    const parts: any[] = [];
    parts.push({ 
        text: `Analyze these video frames from a single video. 
        1. Generate 5 engaging, viral, clickbait-style YouTube video titles that would fit this content.
        2. Identify the single best frame (0-indexed) to use as a thumbnail base. Look for clear expressions, high action, or interesting composition.
        Return JSON.` 
    });

    for (const frame of frames) {
        parts.push({
            inlineData: {
                data: frame.base64.base64,
                mimeType: frame.base64.mimeType
            }
        });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    titles: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    bestFrameIndex: {
                        type: Type.INTEGER
                    }
                },
                required: ["titles", "bestFrameIndex"]
            }
        }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis result generated.");
    return JSON.parse(text);
};

export const generateThumbnail = async (
    inputs: {
        category: string;
        title: string;
        referenceImage: string;
        subjectA: string;
        subjectB?: string;
    }
): Promise<string> => {
    const ai = getAiClient();

    // STEP 1: Deep Internet Research for Trends
    let trendInsights = "";
    try {
        // Use text model with grounding for research
        const researchResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Conduct a deep analysis of trending YouTube thumbnails for the category "${inputs.category}" and specific topic "${inputs.title}".
            Search for high-CTR, "clickbait" style thumbnails.
            Identify:
            1. Dominant colors and lighting (e.g., high saturation neon, dark moody).
            2. Key facial expressions (e.g., Shocked, Angry, Crying, Joyful).
            3. Common background elements.
            4. Text/Typography trends.
            Provide a concise, intense visual description of the "ultimate clickbait thumbnail" for this topic based on your research.`,
            config: { tools: [{ googleSearch: {} }] }
        });
        trendInsights = researchResponse.text || "Focus on high contrast, emotional faces, and bold text.";
    } catch (e) {
        console.warn("Thumbnail research failed, falling back to heuristic analysis.", e);
        trendInsights = "Create a high-contrast, emotionally charged thumbnail with vibrant colors.";
    }

    const parts: any[] = [];

    // 1. Add Reference Image
    parts.push({ text: "REFERENCE STYLE IMAGE (Use ONLY for art style, lighting, and text effects. DO NOT COPY CONTENT):" });
    parts.push({ inlineData: { data: inputs.referenceImage, mimeType: 'image/png' } });

    // 2. Add Subject A
    parts.push({ text: "SUBJECT A (REAL PERSON - KEEP FACE EXACTLY AS IS):" });
    parts.push({ inlineData: { data: inputs.subjectA, mimeType: 'image/png' } });

    // 3. Add Subject B (if exists)
    if (inputs.subjectB) {
        parts.push({ text: "SUBJECT B (REAL PERSON - KEEP FACE EXACTLY AS IS):" });
        parts.push({ inlineData: { data: inputs.subjectB, mimeType: 'image/png' } });
    }

    // 4. Detailed System Prompt with STRICT Identity & Design Rules
    const prompt = `You are an Elite YouTube Thumbnail Art Director. Your goal is MAXIMAL Click-Through Rate (CTR).

    *** CRITICAL SAFETY PROTOCOL: ZERO TOLERANCE FOR FACE/BODY MODIFICATION ***
    - You MUST use the provided SUBJECT A (and B) images exactly as they are. 
    - DO NOT generate a new face. DO NOT "improve" the face. DO NOT change the expression.
    - DO NOT change the body type, hair, or clothing unless explicitly asked.
    - The person in the output MUST be pixel-perfect identical to the uploaded image.
    - If the face looks different, the task is a FAILURE.

    *** PHASE 1: INTELLIGENT DESIGN SYSTEMS (MANDATORY) ***
    
    1. **TYPOGRAPHY RULES (Prevent Basic Mistakes):**
       - FONT SELECTION: Use ONLY massive, BOLD, Sans-Serif fonts (e.g., Impact, Montserrat ExtraBold, Roboto Black).
       - **BANNED FONTS**: Do NOT use thin, serif, curly, or handwritten fonts (like Times New Roman or scripts). They are unreadable.
       - READABILITY: Text MUST have a heavy Drop Shadow, Black Outline (Stroke), or be on a high-contrast box.
       - HIERARCHY: The Title "${inputs.title}" must be the second largest element after the face.

    2. **COLOR THEORY & PALETTE:**
       - Use COMPLEMENTARY COLORS. If background is Cool (Blue/Purple), Text/Light must be Warm (Yellow/Orange).
       - AVOID: Muddy, pastel, or desaturated colors.
       - TREND: High saturation is required for YouTube. Make the colors "pop".

    3. **COMPOSITION & BACKGROUND:**
       - DEPTH OF FIELD: The background MUST be slightly blurred (Bokeh effect) to separate it from the Subject and Text.
       - SEPARATION: Ensure the Subject has a "Rim Light" (backlight) to separate them from the background.
       - CONTEXT: Background elements must match the semantic meaning of the title (e.g., "Money" -> Cash/Gold, "Tech" -> Circuits/Neon).

    *** PHASE 2: CONTEXTUAL SYNTHESIS ***
    
    1. **Context Deduction**:
       - Analyze Subject (Attire, Ethnicity) + Title ("${inputs.title}").
       - IF Subject/Title implies a specific region (e.g., India, USA, Japan), strictly use background elements from that region.
       - Example: Title "Budget 2025" + Indian Subject -> Background MUST be Indian Parliament/Currency, NOT US Capitol.

    2. **Internet Trend Integration**:
       - Trend Data: "${trendInsights}"
       - incorporate these specific visual elements into the background.

    *** PHASE 3: REFERENCE STYLE EXTRACTION ***
    - Extract the *Vibe* (e.g., "Glow effect", "Split screen", "3D Text") from the Reference Image.
    - **DO NOT COPY TEXT/CONTENT**: Ignore any words or people in the reference. Only copy the *Design Style*.

    *** FINAL OUTPUT INSTRUCTIONS ***
    - Composite Subject A (and B) into the new background.
    - Apply matching lighting to the subjects.
    - Render the title text "${inputs.title}" using the strict Typography Rules above.
    - Ensure NO text from the reference image appears.

    Output the final, high-CTR thumbnail.`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseModalities: [Modality.IMAGE] }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No thumbnail generated.");
};
