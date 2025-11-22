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
  mimeType: string,
  language: string = 'English',
  lengthType: 'SEO Friendly' | 'Long Caption' | 'Short Caption' = 'SEO Friendly'
): Promise<{ caption: string; hashtags: string }[]> => {
  const ai = getAiClient();
  try {
    // Prompt Engineering with Logic for Deep Research and Length Constraints
    let styleInstruction = "";
    if (lengthType === 'SEO Friendly') {
        styleInstruction = "RESEARCH GOAL: Use Google Search to find current algorithm trends, trending audio concepts, and high-ranking keywords for this subject. GENERATION: Create captions with optimal length (usually 1-2 sentences + hook) that encourage saves and shares. Focus on keywords for organic boost.";
    } else if (lengthType === 'Long Caption') {
        styleInstruction = "RESEARCH GOAL: Find engaging storytelling angles for this subject. GENERATION: Write detailed, micro-blog style captions (2-3 sentences). Use emotional hooks or value-add tips. CONSTRAINT: Do NOT make it a wall of text; keep it readable and under 4 sentences.";
    } else if (lengthType === 'Short Caption') {
        styleInstruction = "RESEARCH GOAL: Find witty, aesthetic, or punchy one-liners trending now. GENERATION: High impact, instant readability. CONSTRAINT: Do NOT make it single words; use a complete thought or clever phrase (1 sentence max).";
    }

    const prompt = `You are CaptionAI, a world-class social media strategist for MagicPixa.

INPUT:
- One user photo (image input).
- Language: ${language}.
- Style/Length: ${lengthType}.

YOUR PROCESS:
1. **DEEP RESEARCH**: Analyze the image. Use Google Search to find real-time trending caption styles, viral hooks, and best-performing keywords for this specific visual topic (e.g., 'trending sunset captions 2025', 'viral coffee aesthetics').
2. **GENERATE**: Based on your research and the "${lengthType}" rule below, generate exactly 6 distinct caption options.

${styleInstruction}

GENERAL RULES:
- Write ONLY in ${language}.
- Natural, human-like tone. No AI cliches ("Delve into", "Testament to").
- Emojis: Minimal and relevant.

HASHTAG RULES:
- **CRITICAL:** Hashtags MUST ALWAYS be in ENGLISH, even if the caption language is ${language}.
- 8–15 organic keywords per caption based on your research.
- No spam tags.

OUTPUT FORMAT:
You MUST return the result strictly as a JSON array inside a markdown code block.
Example:
\`\`\`json
[
  { "caption": "Caption text...", "hashtags": "#tag1 #tag2" },
  ...
]
\`\`\`
Do not add any other text outside the code block.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        // We enable Google Search for "deep research"
        tools: [{ googleSearch: {} }], 
        // Note: responseSchema is NOT supported when using tools in some contexts, 
        // so we rely on the strong system prompt for JSON formatting.
      },
    });

    const text = response.text || "";
    
    // Extract JSON from code block
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : text;
    
    // Clean up any potential markdown residue if regex failed
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) return parsed;
        throw new Error("Parsed result is not an array");
    } catch (e) {
        console.error("JSON Parse Error in CaptionAI:", e, "Raw Text:", text);
        // Fallback if parsing fails
        return [
            { caption: "Captured this moment perfectly.", hashtags: "#moments #photography" },
            { caption: "Vibes speak louder than words.", hashtags: "#vibes #aesthetic" },
            { caption: "Simple joys in life.", hashtags: "#lifestyle #joy" },
            { caption: "Creating magic everyday.", hashtags: "#magicpixa #create" },
            { caption: "Through the lens.", hashtags: "#perspective #photo" },
            { caption: "Just sharing this.", hashtags: "#share #daily" }
        ];
    }

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

export const analyzeProductImage = async (
    base64ImageData: string,
    mimeType: string
): Promise<string[]> => {
    const ai = getAiClient();
    try {
        const prompt = `Analyse the uploaded product image in depth. Identify the exact product type, its visible design, shape, packaging material, printed text, logos, colors, proportions, surface details, and category.
        
        Based on this analysis, generate exactly 4 short, conversational requests that a user would ask an AI editor. 
        These should sound natural and spoken, not like a robotic description.
        Example: "Put this on a sleek marble table with some soft sunlight."
        Example: "Show this floating in the air with fresh water splashes around it."
        Example: "Place it on a wooden desk next to a laptop and coffee."
        
        Return ONLY a JSON array of strings.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const jsonText = response.text?.trim();
        if (!jsonText) return [
            "Put this on a clean white table with soft shadows",
            "Show this product on a luxury gold podium",
            "Place it in a nature setting with sunlight and leaves",
            "Make it look moody on a dark reflective surface"
        ];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product:", e);
        return [
            "Put this on a clean white table with soft shadows",
            "Show this product on a luxury gold podium",
            "Place it in a nature setting with sunlight and leaves",
            "Make it look moody on a dark reflective surface"
        ];
    }
}

export const analyzeProductForModelPrompts = async (
    base64ImageData: string,
    mimeType: string
): Promise<{ display: string; prompt: string }[]> => {
    const ai = getAiClient();
    try {
        const prompt = `Analyse the uploaded product in depth.
        Generate 4 distinct, creative, and highly specific model scenarios.
        
        **CRITICAL INSTRUCTION:** 
        You MUST vary the **SHOT TYPE** (Close-up, Wide, Mid) and **COMPOSITION** (Single Model vs Group) in your suggestions. 
        
        Return a JSON array of objects with two keys:
        1. "display": A natural, conversational question requesting this specific shot. It must sound like a human asking an editor. 
           Examples: 
           - "Can you create a wide group shot of friends wearing this?"
           - "Show me a close-up of a model holding this near their face."
           - "Generate a professional studio shot of a man using this product."
        2. "prompt": The detailed, descriptive prompt for the image generator. e.g., "Wide angle street style shot of a young woman..."
        
        Return ONLY the JSON array.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: prompt },
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            display: { type: Type.STRING },
                            prompt: { type: Type.STRING }
                        },
                        required: ["display", "prompt"]
                    }
                }
            }
        });
        const jsonText = response.text?.trim();
        if (!jsonText) return [
            { display: "Can you create a close-up of a model holding this?", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Show me a wide shot of friends using this product outdoors.", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Generate a professional studio shot of a model.", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Can you show a tight detail shot in hand?", prompt: "Tight detail macro shot of hands holding the product to show texture" }
        ];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product for model prompts:", e);
        return [
            { display: "Can you create a close-up of a model holding this?", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Show me a wide shot of friends using this product outdoors.", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Generate a professional studio shot of a model.", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Can you show a tight detail shot in hand?", prompt: "Tight detail macro shot of hands holding the product to show texture" }
        ];
    }
}

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  styleInstructions: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    // "World Class" System Prompt Construction
    let prompt = `TASK: Professional Product Photography Generation.
    
    INSTRUCTIONS:
    1. Analyse the uploaded product image in depth. Identify the exact product type, visible design, shape, packaging, logos, text, and colors.
    2. **CRITICAL RULE**: Do not modify or alter any part of the product itself. The product’s design, color accuracy, text, logo placement, and identity must remain EXACTLY as in the original image.
    3. Build a new photorealistic environment around the product based on this direction: "${styleInstructions}".
    
    *** PHYSICAL SCALE & REALISM PROTOCOL ***
    - You MUST analyze the real-world size of the product (e.g., a perfume bottle is 10cm, a sofa is 2m).
    - The environment MUST be scaled proportionally. Do NOT place a small product in a giant world or vice versa.
    - Example: A pair of headphones on a table should look like headphones, not the size of a car.
    - Use realistic camera focal lengths (e.g., 50mm, 85mm) suitable for the product size.

    EXECUTION GUIDELINES:
    - Use lighting, reflections, shadows, props, and composition that match the chosen direction.
    - Ensure no AI artifacts, distortions, incorrect text, or warped shapes on the product.
    - Make the final output look like a real commercial photo shoot, not AI-generated.
    - Use physically accurate shadows, depth, reflections, and color grading.
    - Maintain high-resolution, polished, social-media-ready quality.
    
    OUTPUT:
    Generate a final marketing-ready image that feels real, premium, and professionally photographed, while preserving the product exactly as it appears and in correct scale.`;
    
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

export const generateModelShot = async (
    base64ImageData: string,
    mimeType: string,
    inputs: {
        modelType: string;
        region?: string;
        skinTone?: string;
        bodyType?: string;
        composition?: string; // 'Single Model' or 'Group Shot'
        framing?: string; // 'Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'
        freeformPrompt?: string;
    }
  ): Promise<string> => {
    const ai = getAiClient();
    try {
      // Detailed Model Shot System Prompt with HYPER-REALISM and INTELLIGENT FRAMING
      let userSelectionPart = "";
      
      if (inputs.freeformPrompt) {
          userSelectionPart = `USER PROMPT: "${inputs.freeformPrompt}". 
          IGNORE specific dropdown selections if they conflict with this prompt. Follow this instruction for the model's appearance and interaction.`;
      } else {
          userSelectionPart = `
          Composition: ${inputs.composition || 'Single Model'}
          Model Type: ${inputs.modelType}
          Region: ${inputs.region}
          Skin Tone: ${inputs.skinTone}
          Body Type: ${inputs.bodyType}
          Shot Framing: ${inputs.framing || 'Mid Shot'}`;
      }

      let prompt = `System instruction for AI:
  Create a HYPER-REALISTIC marketing image that places the user’s uploaded product naturally with a model. 
  
  *** HYPER-REALISM & QUALITY PROTOCOL ***
  - OUTPUT STYLE: RAW Photography, 85mm Lens, f/1.8 Aperture.
  - SKIN TEXTURE: Must show pores, micro-details, natural imperfections, and subsurface scattering. NO PLASTIC SMOOTH SKIN.
  - LIGHTING: Cinematic studio lighting with realistic falloff. 
  - PHYSICS: The product must have weight. Fingers must press against it slightly. Clothing must drape with gravity.
  - FILM GRAIN: Add subtle film grain to match high-end editorial photography.

  *** STRICT USER FRAMING PRIORITY ***
  The user has explicitly selected a Framing Preference: "${inputs.framing}".
  YOU MUST FOLLOW THIS ABOVE ALL ELSE.
  - IF 'Tight Close Shot': MACRO view. Only Hands, Product, and maybe Lips/Chin. Product is HUGE in frame.
  - IF 'Close-Up Shot': Head and Shoulders portrait. Product near face or held high.
  - IF 'Mid Shot': Waist up. Standard catalog pose.
  - IF 'Wide Shot': Full body in environment. Product might be smaller relative to scene.
  
  *** FALLBACK PRODUCT ANALYSIS & FRAMING LOGIC (ONLY use if User Framing is NOT specified) ***
  1. **DETECT PRODUCT TYPE**:
     - IF 'FOOTWEAR/SHOES': Camera MUST be **LOW ANGLE** or focus on **LEGS/FEET**. Do NOT show full body if it makes the shoes tiny. The shoes are the HERO.
     - IF 'TROUSERS/JEANS/PANTS': Camera MUST capture **WAIST-DOWN** or **FULL BODY**. Ensure the pants are fully visible and fitting well. Do NOT crop the pants.
     - IF 'SMALL ITEM' (Jewelry, Jar, Bottle, Watch): Camera MUST be **MACRO / CLOSE-UP** or **PORTRAIT**. Focus on the Hand/Face interaction. Do NOT do a wide full-body shot where the product is invisible.
     - IF 'APPAREL TOP': Focus on **TORSO/UPPER BODY**.
  
  *** PHYSICAL SCALE PROTOCOL ***
  - **MANDATORY**: Estimate the real-world size of the uploaded object (e.g., a 5cm jar vs a 30cm bag).
  - Scale the object perfectly relative to the human model's hands/body.
  - A 50ml jar must fit in the palm. A tote bag must hang from the shoulder at the correct size.

  *** COMPOSITION LOGIC ***
  - Composition Mode: ${inputs.composition}
  - If 'Group Shot': Generate 2-3 models interacting socially with the product or in the background. Main model holds product.
  
  INPUTS:
  ${userSelectionPart}
  
  DETAILED GENERATION RULES:
  
  1. Analyze the product
  Understand the uploaded product: material, shape, label position, reflective surface, size, orientation.
  Decide the best possible interaction pose for the model (e.g., Beauty -> near face; Food -> held).
  
  2. Generate the model
  - If 'Young': Age 18-25. Fresh skin, youthful features.
  - If 'Adult': Age 30-45. Mature features, confident look.
  - If 'Senior': Age 60+. Visible wrinkles, realistic aging details (CRITICAL for realism).
  - If 'Kid': Age 6-10.
  - Match the specified Ethnicity/Region accurately.
  
  3. Place the product correctly
  Position and scale product naturally relative to the model’s selected body type.
  Maintain realistic contact (Fingers wrap around correctly, Clothing bends around wearable items).
  Add correct occlusion (Fingers partially covering product, Hair or clothing overlapping).
  
  4. Lighting, shadows, and realism
  Match product lighting to model lighting direction.
  Create contact shadows under the product.
  Ensure the model and product look like they were photographed together, not pasted.
  
  5. Background & styling
  Choose a background that fits the product category (e.g., Beauty -> soft studio, Fitness -> gym).
  Background must be slightly out of focus (Bokeh) to keep attention on the product/model.
  
  6. Label & detail preservation
  Keep all product text sharp and readable. Do not distort brand logo.
  
  FINAL AI PROMPT:
  “Generate a photorealistic RAW photograph using the uploaded product. Create a model matching: ${inputs.freeformPrompt || `${inputs.modelType}, ${inputs.region}, ${inputs.skinTone}, ${inputs.bodyType}`}. 
  STRICTLY FOLLOW USER FRAMING: ${inputs.framing}. If unspecified, use logic based on product type (Shoes=Low Angle, Pants=Waist Down, Small=Close Up). 
  COMPOSITION: ${inputs.composition}.
  Place the product naturally with correct PHYSICAL SCALE and interaction. Add realistic occlusion. Match lighting, shadows, and color temperature. Skin texture must be highly detailed and realistic. The result should look like a high-end billboard advertisement.”`;
      
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
      console.error("Error generating model shot:", error);
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

// --- MAGIC INTERIOR LOGIC ---

// Micro-Prompts for Styles
const STYLE_PROMPTS: Record<string, string> = {
    'Modern': `Apply Modern style: clean lines, balanced proportions, neutral palette (whites, greys, beiges), smooth surfaces, matte or low-gloss finishes. Use sleek furniture with simple geometry. Incorporate warm accent tones sparingly. Lighting should be soft and indirect with recessed fixtures or slender floor lamps. No clutter. Maintain functional layouts and clear circulation paths.`,
    'Minimalist': `Apply Minimalist style: remove visual noise, keep only essential furniture. Palette stays neutral and calm. Use light woods, white walls, simple forms, and ample negative space. No heavy patterns or busy décor. Surfaces should look clean, matte, and natural. Composition must feel peaceful, open, and airy.`,
    'Japanese': `Apply Japanese/Japandi style: warm woods, low-height furniture, grounded compositions, beige/almond/tan palette, natural textures. Add soft linen fabrics, paper-like lighting, and minimal decor. Emphasize balance, calmness, and connection to nature. Avoid glossy surfaces and bright colors.`,
    'American': `Apply American style: comfortable furniture, warm tones, soft fabrics, paneled textures, functional layout. Mix of wood, leather, warm metal accents, and cozy lighting. Decor should be homely, balanced, and inviting. Avoid ultra-modern sharp lines.`,
    'Coastal': `Apply Coastal style: airy whites, sea blues, sandy beiges. Light woods, natural rope textures, breezy fabrics. Enhance sunlight and openness. Use minimal but fresh decor like shells, woven baskets, light artwork. Keep everything relaxed, bright, and beach-inspired.`,
    'Traditional Indian': `Apply Traditional Indian style: carved woods, earthy tones (terracotta, deep browns, mustard, maroon), handcrafted textures, traditional patterns. Use wooden furniture with ethnic detailing. Incorporate brass accents, woven fabrics, jute, and Indian artwork. Keep elements elegant, culturally grounded, and naturally placed.`,
    'Arabic': `Apply Arabic style: arches, rich warm colors (gold, deep reds, warm browns), patterned fabrics, intricate geometric detailing. Low seating, cushions, soft flowing fabrics, lantern-style lighting. Avoid clutter, ensure symmetry and luxurious warmth.`,
    'Futuristic': `Apply Futuristic style: sharp geometry, sleek glossy surfaces, metallic accents, LED edge lighting, monochrome or neon-accented palette. Use minimal clutter, high-tech materials, ergonomic furniture, and clean floating forms. Emphasize symmetry and modern sci-fi mood.`,
    'Tech Futuristic': `Apply Tech Futuristic style: neon accents, high-gloss surfaces, cutting-edge furniture, innovative look. LED edge lighting, monochrome or neon-accented palette. Use minimal clutter, high-tech materials, ergonomic furniture, and clean floating forms.`,
    'African': `Apply African style: earthy palette, natural woods, raw textures, tribal patterns, terracotta elements. Decor should include handcrafted objects, woven baskets, textured fabrics. Keep the environment warm, organic, and soulful while staying realistic and modern.`,
    'Industrial': `Apply Industrial style: exposed materials (brick, concrete, metal), matte surfaces, dark neutrals, utilitarian fixtures. Use raw textures, metal frames, leather accents, Edison-style warm lighting. Keep furniture bold but simple. Maintain authenticity — nothing overly polished.`,
    'Creative / Artistic': `Apply Creative/Artistic style: bold colors (if appropriate), playful compositions, unique furniture shapes, expressive decor. Use wall art, unconventional textures, creative lighting. Still maintain physics, perspective, and functional flow. Avoid messy randomness — creativity must feel intentional.`,
    'Luxury Executive': `Apply Luxury Executive style: premium materials (marble, walnut, brass, leather), rich but muted colors, controlled lighting (warm, soft, layered). Furniture should be elegant, well-proportioned, and polished. Add subtle sophistication: symmetry, refined textures, premium feel without being gaudy.`,
    'Biophilic / Nature-Inspired': `Apply Biophilic style: maximize natural light, add indoor plants, use raw woods, stone textures, soft green tones, and organic shapes. Keep environment bright, natural, and calming. Avoid artificial neon or synthetic-looking materials. The final mood should feel fresh, healthy, and nature-connected.`,
    'Modern Corporate': `Apply Modern Corporate style: clean functional layout, ergonomic furniture, neutral palette with subtle brand accents. Use acoustic panels, organized work zones, soft overhead lighting, and clutter-free surfaces. Emphasize professionalism, comfort, and efficient movement flow.`
};

// Micro-Prompts for Room Types
const ROOM_PROMPTS: Record<string, string> = {
    // Residential
    'Living Room': `Focus on comfort, seating arrangement, and natural movement flow. Maintain clear pathways. Center the composition around a sofa, coffee table, or focal wall. Lighting should be layered: ambient + task + accent. Avoid oversized décor and ensure all furniture scales correctly to the room.`,
    'Bedroom': `Prioritize calmness and privacy. Bed placement should never block a door or window path. Keep balanced symmetry around the bed. Use soft lighting, warm tones, and minimal clutter. Ensure bedside tables, wardrobe space, and walking clearance are realistic.`,
    'Kitchen': `Respect existing counters, sinks, and built-in appliances. Never change plumbing or gas points unless asked. Keep work triangle logic efficient (sink–stove–fridge distance). Use practical materials and realistic cabinet dimensions. Avoid blocking cabinets with furniture.`,
    'Dining Room': `Center the dining table as the main anchor. Maintain walking clearance around chairs (minimum 90 cm). Lighting should emphasize the table with pendants or warm overhead fixtures. Keep décor simple and elegant. Avoid oversized furniture that crowds the space.`,
    'Bathroom': `Respect plumbing fixtures — never move the shower, WC, or sink. Focus on materials, lighting, and accessories. Use moisture-safe textures. Keep proportions realistic for vanities, mirrors, niches, and shelves. Avoid adding non-waterproof furniture.`,
    'Home Office': `Desk placement must avoid blocking windows or doors. Keep ergonomics correct: desk height, chair height, screen distance. Add good task lighting. Maintain clean, productive layout with storage solutions placed sensibly.`,
    'Balcony/Patio': `Use weather-resistant materials. Keep layout airy and avoid crowding. Add plants, simple seating, and subtle mood lighting. Maintain railing visibility and never place large objects blocking safety zones.`,
    'Gaming Room': `Prioritize ergonomics and comfort. Use ambient RGB lighting tastefully. Ensure proper screen distance and seating height. Keep cable areas neat. Furniture must remain practical and correctly scaled.`,
    // Commercial
    'Open Workspace': `Maintain circulation pathways between pods/desks. Use ergonomic furniture. Ensure good lighting and acoustic comfort. Keep layout open and collaborative but not cluttered. Avoid placing desks blocking windows or exits.`,
    'Private Office': `Keep proportions balanced: executive desk, visitor seating, storage. Highlight professionalism with clean lines and subtle décor. Ensure desk placement faces the door or window logically. Avoid oversized items that shrink the space.`,
    'Conference Room': `Center the meeting table. Maintain equal chair spacing. Respect AV wall placement. Keep lighting even and avoid glare. Leave walking space around the table. Avoid unnecessary décor that distracts from meeting function.`,
    'Reception / Lobby': `Prioritize first impressions: clean layout, clear focal wall. Seating should not block reception desk view. Keep lighting bright and welcoming. Ensure open sightlines and avoid clutter.`,
    'Break Room': `Use practical, easy-to-clean materials. Maintain clear separation between seating and pantry zone. Avoid tight layouts. Keep lighting warm and casual.`,
    'Meeting Pod': `Ensure a compact but ergonomic setup. Seating must allow comfortable posture. Keep lighting soft but functional. Avoid adding large décor pieces that crowd the small pod.`
};

const ERROR_PREVENTION_RULES = `
- Never block doors, windows, or essential pathways with furniture.
- Maintain minimum walking clearance: 80–100 cm around main furniture pieces.
- Do not place beds directly in front of doors or in tight corners without space to walk.
- Do not attach heavy fixtures (swings, cabinets) to weak drywall; only use structural beams/walls.
- Keep furniture proportions realistic: sofa depth ~0.9m, dining table height ~0.75m, chair seat height ~0.45m.
- Maintain safe distance between stove and flammable materials.
- Lighting fixtures must be realistically supported (no floating lamps).
- Rugs must be proportioned realistically and fit under main furniture edges.
- Avoid placing electronics near sinks or water zones.
- Avoid overstuffing small rooms — keep spatial logic realistic.
- Match shadows to detected light direction; no impossible lighting.
- Respect the camera angle and vanishing points — no distorted or misaligned furniture.
- Do not change structural elements unless user explicitly asks.
- Keep décor at believable human heights (artwork ~1.5m center from floor).
- Maintain ergonomic desk setups: monitor at eye level, chair under desk clearance, proper leg room.
`;

// Combined Logic for specific high-priority pairings
const COMBO_PROMPTS: Record<string, string> = {
    'Living Room_Modern': `Use a clean seating arrangement, neutral palette, sleek low-profile sofa, modern coffee table, soft indirect lighting, and minimal décor. Maintain symmetry and comfort while keeping the space open.`,
    'Living Room_Traditional Indian': `Use carved wood furniture, earthy tones, handwoven fabrics, brass accents, and warm ambient lighting. Keep seating practical and avoid overpowering patterns. Maintain clear pathways.`,
    'Living Room_Industrial': `Expose textures like brick, concrete, or metal. Use bold furniture with dark tones. Add industrial lighting fixtures and simple rugs. Keep layout functional and uncluttered.`,
    'Living Room_Coastal': `Light woods, airy whites, sea-blue accents. Use soft fabrics, minimal décor, and natural light emphasis. Keep everything bright, breezy, and relaxed.`,
    'Bedroom_Minimalist': `Keep the bed low and simple. Use soft neutral palette, clean bedding, minimal decor, and warm side lighting. Remove visual noise and maintain a calming atmosphere.`,
    'Bedroom_Luxury Executive': `Use premium materials like upholstered headboards, rich wood tones, brass accents, and layered lighting. Keep symmetry around the bed and ensure practical pathways.`,
    'Kitchen_Modern': `Use flat-panel cabinets, matte surfaces, integrated appliances, and functional lighting. Maintain efficient work triangle and avoid blocking built-in elements.`,
    'Kitchen_Japanese': `Light warm woods, beige neutrals, soft textures. Keep simple shelves, minimal decor, and smooth cabinet lines. Emphasize calmness and natural materials.`, // Japandi
    'Home Office_Creative / Artistic': `Add expressive artwork, bold accents, creative lighting, and a comfortable desk setup. Ensure ergonomics remain correct. Keep tools and storage functional.`,
    'Home Office_Modern Corporate': `Clean layout, neutral tones, organized storage, ergonomic chair, and practical lighting. Keep everything professional and clutter-free.`,
    'Open Workspace_Biophilic / Nature-Inspired': `Use plants, natural wood tones, soft lighting, and open sightlines. Prioritize comfort and acoustic balance. Maintain collaborative flow.`,
    'Conference Room_Industrial': `Use robust materials like wood-and-metal tables, industrial lighting, neutral palette, and exposed textures. Keep seating evenly spaced and the room functional.`,
    'Reception / Lobby_Luxury Executive': `Premium materials, elegant lighting, refined textures, and a strong focal wall. Maintain clean circulation and a polished first impression.`
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
    // 1. Assemble the Prompt
    const styleMicroPrompt = STYLE_PROMPTS[style] || `${style} style.`;
    const roomMicroPrompt = ROOM_PROMPTS[roomType] || `Functional and realistic ${roomType} layout.`;
    const comboKey = `${roomType}_${style}`;
    const comboAdvice = COMBO_PROMPTS[comboKey] ? `\nSPECIFIC PAIRING RULES:\n${COMBO_PROMPTS[comboKey]}` : "";

    const prompt = `You are Magic Interiors — a domain-specific expert architect + interior designer + CG artist.
    
    YOUR MISSION:
    Redesign the uploaded room image into a hyper-realistic, renderer-ready transformation based on the user's selection.
    
    USER SELECTION:
    - Space: ${spaceType}
    - Room: ${roomType}
    - Style: ${style}
    
    1. DEEP VISUAL ANALYSIS:
       - Identify room type & confirm user selection.
       - Detect all fixed structural elements: walls, windows, doors, beams, pillars, built-in cabinets. These are IMMUTABLE. Never move, resize, hide, or delete them.
       - Infer floor material, wall finish, ceiling type, lighting sources, sunlight direction, colour temperature.
       - Estimate room dimensions based on reference objects (door height ~2.0–2.2m, furniture scale).
       - Infer camera height, focal length, vanishing points — and preserve them 100%.
    
    2. PHYSICS & PERSPECTIVE RULES (STRICT):
       - Keep identical perspective, geometry, and proportions of the original room.
       - All furniture and elements you add must align to the same vanishing points.
       - Shadows, reflections, highlights must obey real-world light direction.
       - No impossible placements.
    
    3. DESIGN TRANSFORMATION LOGIC:
       - **STYLE RULES**: ${styleMicroPrompt}
       - **ROOM LOGIC**: ${roomMicroPrompt}
       ${comboAdvice}
       - Replace or re-arrange movable items only.
       - Add realistic furniture with correct standard dimensions and ergonomic spacing (e.g., 90cm walking clearance).
       - Respect natural movement flow.
    
    4. ERROR-PREVENTION (CHECKLIST):
       ${ERROR_PREVENTION_RULES}
    
    5. HYPER-REALISM RULES:
       - Use PBR-quality materials, 2k–4k scanned textures.
       - Add subtle imperfections: micro-scratches, light grain, natural clutter.
       - Maintain consistent white balance with original photo.
       - Use accurate depth of field for camera type.
       - Avoid over-smoothing and “AI glossy plastic” surfaces.
    
    FINAL OUTPUT:
    Generate the transformed image directly. It must be photorealistic, architecturally sound, and strictly follow the provided design style and structural constraints.`;

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