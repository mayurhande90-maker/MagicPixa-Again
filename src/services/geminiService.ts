import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";
import { Base64File } from "../utils/imageUtils";

/**
 * Helper function to get a fresh AI client on every call.
 * This ensures the latest API key is used.
 */
const getAiClient = (): GoogleGenAI => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
    }
    return new GoogleGenAI({ apiKey });
};

const SUPPORT_SYSTEM_INSTRUCTION = `You are Pixa, a friendly and expert support agent for the MagicPixa application. Your goal is to help users understand and use the app's features effectively.

**RESPONSE FORMATTING:**
- Use Markdown for all responses.
- Use headings (like '### Title'), bullet points (using '-'), and bold text ('**text**') to make your answers clear, structured, and easy to read.
- For step-by-step instructions, use bulleted lists.

**YOUR KNOWLEDGE:**
You are an expert on Photo Studio, Interior AI, Apparel Try-On, account management, credits, and billing. You should answer questions about these topics directly and conversationally.

**CONVERSATION FLOW:**
1.  **General Questions:** For any user query that is a question (e.g., "How do credits work?", "What is photo studio?"), provide a direct, helpful answer based on your knowledge. DO NOT start the issue reporting flow.
2.  **Issue Reporting:** Only when the user explicitly states they want to "report an issue" or "file a ticket" (for example, their message is exactly "I want to report an issue."), you MUST initiate the **ISSUE REPORTING FLOW** below.

**ISSUE REPORTING FLOW:**
This is a strict, multi-step process that you only begin when explicitly asked to report an issue.
1.  Your first response MUST be to ask them to categorize the issue.
2.  This categorization response MUST ONLY contain the question "I can help with that. What kind of issue are you facing?" followed by a list of clickable buttons.
3.  You MUST format the buttons like this, each on a new line: '[button:Billing]', '[button:Technical Bug]', '[button:Feature Request]', '[button:General Inquiry]'.
4.  After the user selects a category (their next message will be the category name), your next response MUST be to ask them for a detailed description of the problem.
5.  Only after you have received both the 'issueType' (from the button selection) and the 'description' (from their text input), you MUST call the 'createSupportTicket' function.

Do not deviate from this flow. For all other conversations, be a helpful, conversational assistant.`;

const createSupportTicket: FunctionDeclaration = {
    name: 'createSupportTicket',
    parameters: {
        type: Type.OBJECT,
        description: 'Creates a new support ticket for a user issue.',
        properties: {
            issueType: {
                type: Type.STRING,
                description: 'The category of the issue. e.g., "Billing", "Technical Bug", "Feature Request", "General Inquiry".',
            },
            description: {
                type: Type.STRING,
                description: 'A detailed description of the issue the user is facing.',
            },
        },
        required: ['issueType', 'description'],
    },
};

export const startLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}) => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: [createSupportTicket] }],
        },
    });
};

export const generateSupportResponse = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: [createSupportTicket] }],
            },
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }))
        });

        let response = await chat.sendMessage({ message: newMessage });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            if (fc.name === 'createSupportTicket') {
                const ticketId = `MP-${Math.floor(10000 + Math.random() * 90000)}`;
                response = await chat.sendMessage({
                    message: [{
                        functionResponse: {
                            name: fc.name,
                            response: { ticketId: ticketId, status: 'created' }
                        }
                    }]
                });
            }
        }
        
        return response.text || "I'm sorry, I couldn't generate a response.";

    } catch (error) {
        console.error("Error generating support response:", error);
        throw new Error("An unknown error occurred while getting support response.");
    }
};

export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string
): Promise<{ caption: string; hashtags: string }[]> => {
  const ai = getAiClient();
  try {
    const prompt = `Analyze this image and generate 3-5 distinct, engaging social media captions for it. For each caption, also provide a relevant, concise string of hashtags.
    The output must be a valid JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.STRING },
            },
            required: ["caption", "hashtags"],
          },
        },
      },
    });

    const jsonText = response.text?.trim();
    if (!jsonText) throw new Error("The model did not return any caption data.");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

export const generateApparelTryOn = async (
  personBase64: string,
  personMimeType: string,
  apparelItems: { type: string; base64: string; mimeType: string }[]
): Promise<string> => {
  const ai = getAiClient();
  try {
    const parts: any[] = [];
    parts.push({ text: "{user_photo}:" });
    parts.push({ inlineData: { data: personBase64, mimeType: personMimeType } });

    let apparelPromptInstructions = '';
    for (const item of apparelItems) {
        parts.push({ text: `{${item.type}_image}:` });
        parts.push({ inlineData: { data: item.base64, mimeType: item.mimeType } });
        const location = item.type === 'top' ? 'torso' : 'legs';
        apparelPromptInstructions += `\n- Place the garment from {${item.type}_image} onto the person's ${location}.`;
    }
    
    const prompt = `TASK: Expert photo compositing AI. Virtual try-on.
Replace the clothing in {user_photo} with the provided apparel image(s).
CRITICAL:
1. Pixel preservation: Do NOT change face, hair, skin, body shape, or background.
2. Identify and Replace: Completely replace the target garment. Ignore the original clothing style/length.
${apparelPromptInstructions}
3. Fit & Drape: Realistic folds, wrinkles, and gravity.
4. Lighting: Match original lighting and shadows exactly.
5. Occlusion: Keep hands/hair over the clothing intact.
OUTPUT: Photorealistic image.`;
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { responseModalities: [Modality.IMAGE] },
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating apparel:", error);
    throw error;
  }
};

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  theme: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    let prompt = `Analyze the product in this image. Generate a hyper-realistic marketing-ready photo.
CRITICAL: The product itself (packaging, logo, text) must remain unchanged.
STYLE: ${theme === 'automatic' ? 'Professional product photography background.' : theme}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore' | 'colourize_only'
): Promise<string> => {
  const ai = getAiClient();
  try {
    let basePrompt = `Colourize this vintage photo. Realistic colors. Preserve faces/features exactly.`;
    if (mode === 'restore') basePrompt += ` Also remove scratches, dust, and damage. Sharpen details.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: basePrompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error colourizing image:", error);
    throw error;
  }
};

export const generateMagicSoul = async (
  personABase64: string,
  personAMimeType: string,
  personBBase64: string,
  personBMimeType: string,
  style: string,
  environment: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const prompt = `Generate a hyper-realistic photo of Subject A and Subject B together.
Style: ${style}. Environment: ${environment}.
RULES:
- Preserve facial features/identities of both subjects exactly.
- Adjust clothing to match the environment and style.
- Realistic lighting and shadows.
- High resolution, DSLR quality.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: "Subject A:" },
          { inlineData: { data: personABase64, mimeType: personAMimeType } },
          { text: "Subject B:" },
          { inlineData: { data: personBBase64, mimeType: personBMimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating Magic Soul:", error);
    throw error;
  }
};

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  mockupType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const prompt = `Create a photo-realistic product mockup.
Mockup Item: ${mockupType}.
Action: Place the provided image/logo onto the mockup item naturally.
Perspective: Realistic 3D wrap/angle.
Background: Clean, professional studio lighting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating mockup:", error);
    throw error;
  }
};

const homeStylePrompts: { [key: string]: string } = {
    'Japanese': 'Japanese aesthetic: minimalism, tatami, light wood, shōji screens, bonsai, serene, neutral colors.',
    'American': 'American style: cozy, open plan, hardwood floors, large sofas, warm lighting, functional and inviting.',
    'Chinese': 'Chinese aesthetic: symmetry, dark wood, carved details, red/gold accents, traditional patterns, elegant.',
    'Traditional Indian': 'Indian heritage: carved wood furniture, vibrant textiles, brass accents, jali work, warm earthy tones.',
    'Coastal': 'Coastal style: airy, white/blue palette, light wood, linen textures, natural light, relaxed beach vibe.',
    'Arabic': 'Arabic style: geometric patterns, arches, mosaic tiles, plush seating, lanterns, rich jewel tones.',
    'Modern': 'Modern style: sleek lines, neutral palette, glass/steel materials, minimalist decor, clutter-free.',
    'Futuristic': 'Futuristic style: neon lights, curved surfaces, high-tech materials, metallic finishes, sci-fi atmosphere.',
    'African': 'African style: earthy tones, tribal patterns, natural materials (rattan, clay), woven textures, warm and vibrant.'
};

const officeStylePrompts: { [key: string]: string } = {
    'Modern Corporate': 'Modern Corporate office: sleek, professional, glass partitions, ergonomic furniture, cool neutral tones.',
    'Minimalist': 'Minimalist office: clean lines, decluttered, white/grey palette, functional furniture, airy and focused.',
    'Industrial': 'Industrial office: exposed brick/ducts, concrete floors, metal accents, raw wood, warm edison lighting.',
    'Luxury Executive': 'Luxury Executive office: dark wood, leather chairs, marble accents, sophisticated, commanding atmosphere.',
    'Contemporary': 'Contemporary office: trendy furniture, pops of color, collaborative spaces, soft lighting, comfortable.',
    'Creative / Artistic': 'Creative office: bold colors, eclectic furniture, artwork, inspiring and unconventional layout.',
    'Biophilic / Nature-Inspired': 'Biophilic office: lots of plants, green walls, natural light, wood/stone materials, healthy vibe.',
    'Traditional Indian': 'Traditional Indian office: warm wood tones, cultural art, rich textiles, respectful and grounded.',
    'Tech Futuristic': 'Tech Futuristic office: neon accents, high-gloss surfaces, cutting-edge furniture, innovative look.'
};

export const generateInteriorDesign = async (
  base64ImageData: string,
  mimeType: string,
  style: string,
  spaceType: 'home' | 'office',
  roomType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const stylePrompt = spaceType === 'office' ? officeStylePrompts[style] : homeStylePrompts[style];
    const prompt = `Redesign this room.
Current Room: ${roomType}.
Target Style: ${style} (${stylePrompt}).
Instructions: Keep room structure (walls/windows). Replace furniture/decor to match style. Photorealistic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: { responseModalities: [Modality.IMAGE] },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Error generating interior:", error);
    throw error;
  }
};

export const generateProductPackPlan = async (
  productImages: string[],
  productName: string,
  productDescription: string,
  brandDetails: { logo?: string; colors: string[]; fonts: string[] },
  competitorUrl: string,
  inspirationImages: string[]
): Promise<any> => {
  const ai = getAiClient();
  const prompt = `Generate a comprehensive marketing pack for product: "${productName}".
  Description: ${productDescription}.
  Brand Colors: ${brandDetails.colors.join(', ')}.
  Competitor: ${competitorUrl}.

  Output JSON with:
  1. imageGenerationPrompts: Object with keys 'heroShot', 'lifestyle1', 'lifestyle2', 'creative'. Values are detailed image generation prompts.
  2. videoGenerationPrompts: Object with keys 'video360Spin', 'videoCinemagraph'. Values are video generation prompts.
  3. textAssets: Object with keys 'seoTitle', 'captions' (array of {text: string}), 'keywords' (array of strings).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                imageGenerationPrompts: {
                    type: Type.OBJECT,
                    properties: {
                        heroShot: { type: Type.STRING },
                        lifestyle1: { type: Type.STRING },
                        lifestyle2: { type: Type.STRING },
                        creative: { type: Type.STRING },
                    },
                    required: ['heroShot', 'lifestyle1', 'lifestyle2', 'creative']
                },
                videoGenerationPrompts: {
                    type: Type.OBJECT,
                    properties: {
                        video360Spin: { type: Type.STRING },
                        videoCinemagraph: { type: Type.STRING },
                    },
                    required: ['video360Spin', 'videoCinemagraph']
                },
                textAssets: {
                    type: Type.OBJECT,
                    properties: {
                        seoTitle: { type: Type.STRING },
                        captions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } } } },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['seoTitle', 'captions', 'keywords']
                }
            },
            required: ['imageGenerationPrompts', 'videoGenerationPrompts', 'textAssets']
        }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No plan generated.");
  return JSON.parse(text);
};

export const generateStyledImage = async (
    productImages: string[],
    prompt: string
): Promise<string> => {
    const ai = getAiClient();
    // Use the first product image as reference
    const mainImage = productImages[0];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: mainImage, mimeType: 'image/png' } }, // Assuming png/jpeg
                { text: prompt }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const generateVideo = async (prompt: string) => {
    const ai = getAiClient();
    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });
};

export const getVideoOperationStatus = async (operation: any) => {
     const ai = getAiClient();
     return await ai.operations.getVideosOperation({ operation });
};

export const generateBrandStylistImage = async (
    referenceImageBase64: string,
    prompt: string
): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: referenceImageBase64, mimeType: 'image/png' } },
                { text: `Generate an image in the exact style of the provided reference image. Prompt: ${prompt}` }
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

export const removeElementFromImage = async (
    base64ImageData: string,
    mimeType: string,
    maskBase64: string
): Promise<string> => {
    const ai = getAiClient();
    const prompt = "Remove the masked object from the image and fill in the background seamlessly.";
    
    // Note: Current Gemini API might handle in-painting via specific prompt or future endpoints.
    // For now using standard image generation with instructions.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64ImageData, mimeType: mimeType } },
                { text: "Original Image" },
                // Ideally, mask is passed as a separate part or combined. 
                // Since simple API doesn't support explicit mask upload yet for all models,
                // we guide it with text, but for a real 'eraser', we'd need the specific editing endpoint if available.
                // Assuming the model can interpret "masked area" if we could send it.
                // For this shim, we rely on the model trying its best with the base image + prompt.
                { text: prompt } 
            ]
        },
        config: { responseModalities: [Modality.IMAGE] }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error("No image generated.");
};

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

    // 4. Detailed System Prompt including Trend Insights
    const prompt = `You are an elite, viral-focused YouTube Thumbnail Designer AI.

    PHASE 1: INTERNET TREND INTEGRATION (CRITICAL)
    I have performed a deep web search on what is working NOW for this topic.
    TREND DATA: "${trendInsights}"
    INSTRUCTION: Aggressively incorporate these specific visual trends (colors, elements, vibe) into the image. Make it "Clickbait" quality - high drama, high emotion.

    PHASE 2: VISUAL FORENSICS & CONTEXT ANALYSIS
    1. Analyze SUBJECT A (and B): Determine ethnicity, attire, and visual cues.
    2. Analyze TITLE: "${inputs.title}". Detect entities and context.
    3. DEDUCE CONTEXT: Based on Subject + Title, determine the setting.
       - **CRITICAL RULE**: If the subject appears Indian or the title contains Indian terms/names, generate an INDIAN context background. Do NOT default to US/Western imagery unless explicitly appropriate.

    PHASE 3: REFERENCE DECONSTRUCTION
    1. Analyze REFERENCE STYLE: Lighting, Text Layout, Font Style, and Graphics.
    2. IGNORE REFERENCE CONTENT: Do not copy the person or text content from the reference. Only copy the *Vibe* and *Layout*.

    PHASE 4: COMPOSITION
    1. **Background**: Generate a high-quality background matching the DEDUCED CONTEXT and TREND DATA.
    2. **Subject Placement**: Cut out Subject A (and B) and place them prominently. 
       - **STRICT RULE**: Preserve facial identity 100%. Do NOT change facial features, hair, or body structure.
    3. **Typography**: Render the title "${inputs.title}" using the font style/effects from the Reference.
    4. **Lighting**: Relight the subjects to match the background's light source naturally.

    Output the final composite image.`;

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