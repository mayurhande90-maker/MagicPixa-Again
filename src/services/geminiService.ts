// FIX: Removed reference to "vite/client" as it was causing a "Cannot find type definition file" error. The underlying issue is likely a misconfigured tsconfig.json, which cannot be modified.

// FIX: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";
// FIX: Corrected import path for Base64File to navigate up one directory.
import { Base64File } from "../utils/imageUtils";

/**
 * Helper function to get a fresh AI client on every call.
 * This ensures the latest API key is used, which is critical for features
 * like video generation that may require the user to select a new key.
 */
const getAiClient = (): GoogleGenAI => {
    // DEFINITIVE FIX: Use `import.meta.env.VITE_API_KEY` for the Gemini key, as required by the Vite build process.
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

// FIX: The return type is inferred from `ai.live.connect` as `LiveSession` is not exported.
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

        // Handle potential function calls
        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            if (fc.name === 'createSupportTicket') {
                // In a real app, you would save this to a database.
                // Here, we'll simulate it and return a confirmation.
                console.log("Simulating ticket creation:", fc.args);
                const ticketId = `MP-${Math.floor(10000 + Math.random() * 90000)}`;

                // Send the result back to the model to get a natural language response
                // FIX: The `sendMessage` method for the Chat SDK expects a `message` property, not `parts`.
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
        
        return response.text;

    } catch (error) {
        console.error("Error generating support response:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to get response: ${error.message}`);
        }
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

    Follow these rules:
    1.  The tone should be catchy and suitable for platforms like Instagram or Facebook.
    2.  Each caption should offer a different angle or perspective on the image.
    3.  Hashtags should be popular, relevant, and formatted as a single string (e.g., "#tag1 #tag2 #tag3").
    4.  The output must be a valid JSON array.`;

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
              caption: {
                type: Type.STRING,
                description: 'A social media caption for the image.',
              },
              hashtags: {
                type: Type.STRING,
                description: 'A string of relevant hashtags, space-separated.',
              },
            },
            required: ["caption", "hashtags"],
          },
        },
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Caption generation blocked due to: ${response.promptFeedback.blockReason}.`);
    }

    const jsonText = response.text.trim();
    if (!jsonText) {
      throw new Error("The model did not return any caption data.");
    }
    
    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Error generating captions with Gemini:", error);
    if (error instanceof Error) {
      if (error.message.includes("JSON")) {
          throw new Error("Failed to generate valid captions. The model's response was not in the expected format. Please try again.");
      }
      throw new Error(`Failed to generate captions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the caption generation service.");
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
        parts.push({ inlineData: { data: item.base64, mimeType: item.mimeType } }); // BUG FIX: Was passing item.base64 as mimeType
        const location = item.type === 'top' ? 'torso' : 'legs';
        apparelPromptInstructions += `\n- Place the garment from {${item.type}_image} onto the person's ${location}.`;
    }
    
    const prompt = `TASK: You are an expert photo compositing AI. Your task is to perform a virtual try-on. You will place the clothing item(s) from the provided apparel image(s) onto the person in the {user_photo}. The final image MUST look like a real, authentic photograph.

**CRITICAL INSTRUCTIONS (MUST BE FOLLOWED EXACTLY):**

1.  **PIXEL PRESERVATION IS THE #1 RULE:** The final output MUST be a pixel-perfect copy of the original {user_photo} in every area EXCEPT for the clothing being replaced.
    -   **ABSOLUTELY NO** changes to the person's face, hair, skin tone, body shape, or proportions.
    -   **ABSOLUTELY NO** changes to the background, accessories (jewelry, watches), or anything that is not the target clothing.

2.  **IDENTIFY AND REPLACE (DO NOT BLEND OR COPY):**
    -   Your task is to **completely replace** the corresponding clothing item in {user_photo} with the new garment(s) provided.
    -   **CRITICAL:** You must IGNORE the style, shape, and length of the clothing the person is originally wearing. The original clothing is only a guide for *location on the body*, not for the *final appearance*. For example, if the person is wearing shorts and you are given an image of long pants, you MUST generate the full-length pants, not shorts with a new texture.
${apparelPromptInstructions}

3.  **FIT & DRAPE REALISTICALLY:**
    -   Warp the new garment to fit the person's body and pose naturally.
    -   Simulate realistic fabric folds, drapes, and wrinkles. The clothing must look like it's actually being worn, respecting gravity and the person's posture.

4.  **MATCH LIGHTING & ENVIRONMENT:**
    -   Analyze the lighting, shadows, and color temperature of the original {user_photo}.
    -   Apply the IDENTICAL lighting and shadows to the new garment(s) so they blend perfectly into the scene.

5.  **RESPECT OCCLUSION:**
    -   If the person's hands, arms, hair, or accessories overlap the clothing, keep the overlapping object perfectly intact and render the garment correctly underneath it.

**STRICT NEGATIVE CONSTRAINTS (DO NOT DO ANY OF THE FOLLOWING):**
-   **DO NOT** regenerate the person. You are only replacing clothes.
-   **DO NOT** alter the background in any way.
-   **DO NOT** change the person's identity, face, or body proportions.
-   **DO NOT** create an image that looks "edited" or "AI-generated". Aim for 100% photorealism.
-   **DO NOT** add watermarks, text, or artifacts.
-   **DO NOT** ignore occlusions (e.g., an arm in front of the t-shirt).
-   **DO NOT** copy the style (e.g., length, cut) of the original garment in {user_photo}. You must render the new garment as it appears in its own image.`;
    
    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    
    if (response.promptFeedback?.blockReason) {
      throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }

    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error generating apparel with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};


export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  theme: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    let prompt = `Analyze the product in this image. Generate a hyper-realistic marketing-ready photo. The product must cast a natural, realistic shadow and the lighting should be balanced. CRITICAL: The product itself, including its packaging, logo, and any text, must remain completely unchanged and preserved with high fidelity. Place the product in an appealing, professional setting.`;
    
    const themes: { [key: string]: string } = {
        'minimalist': 'The background should be a minimalist studio setting. Use clean surfaces, soft neutral colors, and a simple, uncluttered composition.',
        'natural': 'The background should feature natural elements. Place the product on a surface like wood or stone, with soft, leafy botanicals or other organic textures blurred in the background.',
        'geometric': 'The background should be bold and geometric. Use colorful blocks, strong lines, and dramatic lighting to create a modern, eye-catching scene.',
        'luxe': 'The background should feel luxurious and elegant. Use materials like marble, silk, or satin with subtle golden or metallic accents and sophisticated lighting.',
        'outdoor': 'The background should be a beautiful outdoor setting during the golden hour. The lighting should be warm and golden, with a soft, naturally blurred background (like a beach or a garden).'
    };

    if (theme && themes[theme]) {
        prompt += `\n\nSTYLE: ${themes[theme]}`;
    } else {
        prompt += `\n\nSTYLE: The AI should choose a professional background that best complements the product.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    
    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};

export const colourizeImage = async (
  base64ImageData: string,
  mimeType: string,
  mode: 'restore' | 'colourize_only'
): Promise<string> => {
  const ai = getAiClient();
  try {
    let basePrompt = `Colourize the provided vintage photograph.
Maintain the original composition, lighting, and emotional tone while bringing it to life in full colour.
Recreate skin tones, clothes, environment, and background elements in realistic, natural colours — as if the photo was taken recently using a modern camera.
Preserve every person’s facial features, age, emotion, and body posture exactly as in the original.
Do not alter identity, proportions, or composition.
Style: photo-realistic restoration with gentle film warmth.
Lighting should remain consistent with the original vintage exposure.
Avoid artificial brightness or cartoonish tones.
The result should feel emotionally authentic — like reliving a precious memory in perfect clarity.
Focus on nostalgia, warmth, and realism.`;

    if (mode === 'restore') {
      basePrompt = `Restore and ${basePrompt.toLowerCase()}`;
      basePrompt += `\n\nRepair any visible damage such as cracks, dust, spots, blurs, or faded patches. Enhance clarity, texture, and fine details (eyes, hair strands, fabrics, background patterns).`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: basePrompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }

    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error colourizing image with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
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
    let prompt: string;

    if (style === 'adventurous' && environment === 'sunny') {
      prompt = `Create a highly realistic, natural-looking photograph of Person A and Person B together in an adventurous outdoor environment under bright sunny daylight. Maintain the exact real facial structure, expressions, skin tone, hairstyle, and body proportions of both individuals — do not modify, beautify, stylize, or change their appearance in any way. Their faces and features must remain identical to the provided reference photos, with precise likeness and natural texture.

The atmosphere should feel vivid, adventurous, and dynamic — with sunlight, natural shadows, warm tones, and a cinematic but realistic depth of field. Clothing should suit the theme: casual outdoor wear such as jackets, sunglasses, or travel accessories.

The photo must look 100% real, not AI-generated — realistic skin pores, natural light reflections in the eyes, and genuine texture detail. Use realistic human lighting, soft shadows, and a DSLR-style depth of field.

Environment example ideas (choose one that fits):

standing on a mountain trail

sitting near a cliff edge with blue sky behind

walking through a desert road

exploring a coastal viewpoint with sunlight

Style: Ultra-realistic photography, cinematic natural tones, no filters or artistic effects, no fantasy elements.
Mood: Adventurous, sunny, natural.
Camera settings (for realism): 35mm lens, f/2.8, ISO 200, natural light, shallow depth of field, realistic color balance, 8K resolution.

Strict rules:

Keep Person A and Person B’s faces, bodies, and hairstyles unchanged and fully accurate.

No exaggeration, no idealization, no digital smoothening.

The final result should be indistinguishable from a real DSLR photo.

⚙️ Optional Parameters (if your tool supports them):

Style strength: 0.25 (to prevent face alteration)

Reference adherence / image guidance weight: 0.9–1.0

Lighting direction: front or 45° natural sunlight

Aspect ratio: 3:2 or 16:9 for landscape-style adventurous shots`;
    } else {
      prompt = `PRIMARY OBJECTIVE:
Generate one ultra-realistic, high-resolution photograph of Subject A and Subject B together in the chosen STYLE and ENVIRONMENT. The output must be indistinguishable from a professional DSLR photograph.

**MASTER PROMPT (CORE INSTRUCTIONS):**

1.  **Identity & Hair Lock (MANDATORY)**
    *   Preserve Subject A and Subject B facial geometry, proportions, eyes, nose, mouth, ears, skin texture, moles, scars, and hairstyle exactly as in references.
    *   Do not modify face shape, hair shape, hairline, or facial marks.
    *   Reconstruct flyaways and semi-transparent hair tips rather than hard cutout edges. No visible halos or fringing.

2.  **Gender Detection & Clothing Adjustment**
    *   Analyze both reference images to detect gender presentation.
    *   Generate clothing appropriate to the inferred gender, local cultural context, and chosen ENVIRONMENT (e.g., raincoat for rainy, light linen for beach). Clothing changes are allowed and encouraged to match the scene.

3.  **Scale, Proportion & Pose**
    *   Compute and maintain correct body proportions, scale, and height relations for both subjects.
    *   Enforce consistent perspective, ensuring both subjects appear grounded in the same space.
    *   Generate a natural, believable pose and interaction that fits the STYLE and ENVIRONMENT. Ensure realistic limb overlap and occlusion.

4.  **Lighting, Shadows & Reflections**
    *   The setting is: **STYLE: ${style}, ENVIRONMENT: ${environment}**.
    *   Match the ENVIRONMENT's lighting precisely (sun angle, intensity, soft vs hard light).
    *   Render accurate cast shadows for each subject on the ground and on each other.
    *   Include ambient occlusion at contact points and match environmental reflections (e.g., on wet surfaces, glass).

5.  **Materials, Textures & Camera Simulation**
    *   Render realistic skin pores, fabric weaves, and material textures.
    *   Produce DSLR-level quality: correct white balance, natural color grading, filmic contrast, subtle grain, micro-contrast, and camera bokeh. Avoid painterly or CGI looks.
    *   Ensure consistent grain, noise, and sharpness across subjects and background to avoid a "cutout" look.

**NEGATIVE PROMPT (STRICTLY FORBIDDEN):**
DO NOT: change facial geometry, swap faces, alter hair or hairline, smooth pores, remove natural marks, create cartoonification, create painterly textures, produce halo/fringe, produce floating or mis-scaled subjects, mis-match shadows, leave hard cutout edges, create inconsistent grain/noise, exaggerate eyes/teeth, or generate unrealistic lens artifacts.`;
    }

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
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }

    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error generating Magic Soul image with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};

export const generateMockup = async (
  base64ImageData: string,
  mimeType: string,
  mockupType: string
): Promise<string> => {
  const ai = getAiClient();
  try {
    const prompt = `Create a photo-realistic product mockup image based on the following inputs:

Uploaded Image (Logo/Product/Element): Insert this image as-is — do not edit, redraw, recolor, upscale, or alter any part of it. The uploaded content must appear exactly as in the source image, with no text distortion, color change, or visual smoothing.

Mockup Type (User Selection): ${mockupType}

Place the uploaded image naturally and proportionally on the selected mockup item.
Use realistic materials, reflections, and lighting conditions appropriate for that product.
Ensure correct perspective and soft shadowing so the mockup looks real but minimalistic.

The scene should be clean and well-lit, with a neutral or softly blurred background to highlight the product.
Maintain MagicPixa’s design aesthetic — elegant, minimal, user-friendly visuals.

Do not add watermarks, additional text, or any other logos.
Do not stylize or change the design of the uploaded image — preserve its original color, proportions, and clarity.

Output format: square image (1:1 aspect ratio), high resolution, suitable for export and download.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
      return imagePart.inlineData.data;
    }

    console.error("No image data found in response. Full API Response:", JSON.stringify(response, null, 2));
    throw new Error("The model did not return an image. This can happen for various reasons, including content policy violations that were not explicitly flagged.");

  } catch (error) {
    console.error("Error generating mockup with Gemini:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image generation service.");
  }
};

const homeStylePrompts: { [key: string]: string } = {
    'Japanese': 'Incorporate traditional and modern Japanese interior aesthetics: minimalism, tatami mats, shōji sliding panels, natural wood finishes (light warm wood tones), clean lines, low-profile furniture, hidden storage, soft diffused natural light. Use neutral and muted color palette — beige, off-white, muted greens — with accent touches of charcoal or black. Include houseplants like bonsai or bamboo. Emphasize harmony, simplicity, and nature in the design.',
    'American': 'Reflect American interior style blending traditional comfort and modern elements: open floor plan, cozy seating (sectional sofas, armchairs), warm hardwood floors, trim molding, large windows with curtains, recessed lighting, built-in cabinetry. Palette: neutrals (ivory, taupe, gray), accent colors like navy, maroon, forest green. Decor: throw pillows, area rugs, framed artwork, bookshelves, indoor plants. Blend functional with aesthetic touches.',
    'Chinese': 'Draw from Chinese interior aesthetics: balance, symmetry, rich wood tones (rosewood, walnut), carved wooden panels, lattice screens, ceramic vases, porcelain elements, silk cushions or wall hangings, bronze/gold accents. Palette: deep reds, auburn, jade green, black lacquer. Use patterns like repeating motifs, Chinese joinery details, subtle traditional art pieces. Lighting: warm ambient lantern-style fixtures.',
    'Traditional Indian': 'Infuse Indian heritage and decor: carved solid wood furniture (teak, rosewood), jali lattice work, traditional motifs (paisley, floral), block prints, brass or copper accents, handwoven textiles (silk, cotton), colorful rugs. Palette: deep saffron, earthy browns, rich maroon, peacock blue, ochre. Decorative elements: handicrafts, murals, lanterns, brass lamps, hanging jhulas (swings). Natural light, warm tones, textures everywhere.',
    'Coastal': 'Evoke breezy coastal interiors: bright, airy, and relaxed. Use white or off-white walls, pale blues, aquamarine, sand-beige accents, driftwood furniture, wicker or rattan chairs, nautical fabrics (stripes, linen), jute rugs, glass or sea-glass accessories. Decor: seashells, coral, ropes, light wood, potted palms. Maximize natural light, sheer curtains, glass doors to view outdoors. Materials: bleached wood, glass, linen, light metals.',
    'Arabic': 'Channel Middle Eastern & Arabian aesthetics: geometric patterns (mashrabiya lattice, arabesque), arch shapes, ornate tilework, mosaic, carved wood, brass lanterns, richly patterned rugs, low sofas, plush cushions, heavy drapery, opulent fabrics (silk, velvet). Palette: jewel tones (emerald, ruby, sapphire), gold, deep turquoise, sand-beige. Lighting: lanterns, warm glow, decorative metal screens casting shadows.',
    'Modern': 'Showcase contemporary modern interior: sleek lines, minimal ornamentation, open plan, neutral palette (white, gray, black), accent color pops (mustard, teal), mixture of materials (glass, steel, concrete, wood), integrated lighting (LED strips), large windows, floating furniture, minimal clutter. Decor: abstract art, sculptural elements, functional furniture minimalist in design. Focus on clean, streamlined aesthetics.',
    'Futuristic': 'Design with visionary, high-tech interiors: smooth curved surfaces, metallic or glossy surfaces (chromes, brushed aluminum), LED lighting accents (neon, color-changing), glass walls, reflective floors, smart-home displays, minimal structure, modular furniture, floating elements. Palette: cool neutrals (silver, white, charcoal), pops of neon or LED accent colors (electric blue, green). Atmosphere: sleek, sci-fi, ultra-clean, ambient lighting.',
    'African': 'Blend African interior motifs, earthy, textured, and vibrant. Use natural materials: woven baskets, rattan, carved wood, mud cloth, leather, natural stone. Palette: warm earth tones (terracotta, ochre, burnt sienna, deep browns), accent colors like deep red, turquoise, sunset orange. Motifs: tribal patterns, masks, woven textiles, batik prints. Decor: handcrafted pottery, woven rugs, wooden sculptures, indoor plants. Lighting: warm, natural, with visible textures and shadows.'
};

const officeStylePrompts: { [key: string]: string } = {
    'Modern Corporate': 'Create a Modern Corporate office aesthetic. Focus on sleek lines, a professional atmosphere, and high functionality. Use materials like glass partitions, polished metal (chrome, stainless steel), and high-quality laminates. The color palette should be neutral, dominated by whites, grays, and blacks, with a single corporate accent color (e.g., blue, green). Furniture should be ergonomic and minimalist. Lighting should be bright and efficient, using recessed LEDs and linear fixtures.',
    'Minimalist': 'Design a Minimalist office space that is clean, functional, and completely clutter-