
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
        Do NOT just give 4 generic "person holding product" prompts.
        
        Return a JSON array of objects with two keys:
        1. "display": A short, catchy title for the user interface (max 5 words). e.g., "Urban Street Style", "Cozy Home Vibe".
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
            { display: "Close-Up Portrait", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Lifestyle Group", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Studio Professional", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Macro Detail", prompt: "Tight detail macro shot of hands holding the product to show texture" }
        ];
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Error analyzing product for model prompts:", e);
        return [
            { display: "Close-Up Portrait", prompt: "Close-up of a model holding the product near their face, soft studio lighting" },
            { display: "Lifestyle Group", prompt: "Wide lifestyle shot of a group of friends engaging with the product outdoors" },
            { display: "Studio Professional", prompt: "Mid-shot of a professional model interacting with the product in a clean studio" },
            { display: "Macro Detail", prompt: "Tight detail macro shot of hands holding the product to show texture" }
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
