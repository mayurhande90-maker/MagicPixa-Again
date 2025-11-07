// FIX: Removed reference to "vite/client" as it was causing a "Cannot find type definition file" error. The underlying issue is likely a misconfigured tsconfig.json, which cannot be modified.

// FIX: Removed `LiveSession` as it is not an exported member of `@google/genai`.
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

// DEFINITIVE FIX: Use `import.meta.env.VITE_API_KEY` for the Gemini key, as required by the Vite build process.
const apiKey = (import.meta as any).env.VITE_API_KEY;

// Initialize the AI client only if the API key is available.
if (apiKey && apiKey !== 'undefined') {
  ai = new GoogleGenAI({ apiKey: apiKey });
}

// FIX: The return type is inferred from `ai.live.connect` as `LiveSession` is not exported.
export const startLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}) => {
    if (!ai) {
        // FIX: Updated error message to reflect correct environment variable.
        throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
    }

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
            systemInstruction: 'You are a friendly and helpful conversational AI named Pixa. Keep your responses concise and engaging.',
        },
    });
};

export const generateCaptions = async (
  base64ImageData: string,
  mimeType: string
): Promise<{ caption: string; hashtags: string }[]> => {
  if (!ai) {
    // FIX: Updated error message to reflect correct environment variable.
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

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
  if (!ai) {
    // FIX: Updated error message to reflect correct environment variable.
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

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
  if (!ai) {
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }
  
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
  if (!ai) {
    // FIX: Updated error message to reflect correct environment variable.
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

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

export const removeImageBackground = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  if (!ai) {
    // FIX: Updated error message to reflect correct environment variable.
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

  try {
    const prompt = `Your single and most important task is to remove the background from this image, resulting in a transparent PNG.

You are an expert photo editing AI. You will receive an image and you MUST return the same image with the background completely removed.

CRITICAL INSTRUCTIONS:
1.  **TRANSPARENT BACKGROUND ONLY:** The output image's background must be 100% transparent. Do NOT add any color, especially not white. The background must be pure alpha transparency.
2.  **PRESERVE SUBJECT:** The main subject (person, product, etc.) must be perfectly preserved. Do not alter the subject in any way.
3.  **HIGH-QUALITY MASKING:** Create a precise, clean mask around the subject. Pay special attention to fine details like hair, fur, and semi-transparent edges. The edge quality must be professional.
4.  **NO ADDITIONS:** Do not add any shadows, outlines, borders, or any other visual effects.

The only change to the original image should be the removal of its background, making it transparent. The final output must have a valid alpha channel for transparency.`;

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
    console.error("Error removing background with Gemini:", error);
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
  if (!ai) {
    // FIX: Updated error message to reflect correct environment variable.
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

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
    'Minimalist': 'Design a Minimalist office space that is clean, functional, and completely clutter-free. Emphasize negative space. Use a monochromatic color scheme (shades of white, light gray). Furniture must be simple, with clean geometric forms and no unnecessary ornamentation. Storage should be hidden and integrated seamlessly. Materials are simple: light wood, matte surfaces, and concrete. The goal is a serene, focused environment.',
    'Industrial': 'Generate an Industrial office look. Expose structural elements like brick walls, concrete floors, and visible ductwork. Use raw, unfinished materials such as reclaimed wood, aged metal (steel, iron), and leather. Furniture should be sturdy and functional, often with a vintage or repurposed feel. The color palette is earthy and neutral: browns, grays, black, with warm tones from wood and leather. Lighting is key, featuring metal pendant lights and track lighting.',
    'Luxury Executive': 'Produce a Luxury Executive office interior. This style exudes success and sophistication. Use premium materials like marble or granite desktops, rich dark wood (walnut, mahogany) paneling, and plush leather seating. The color palette is warm and deep, featuring tones of charcoal, navy, and cream, with metallic accents in brass or gold. Include sophisticated artwork, high-end decorative objects, and soft, layered lighting from statement chandeliers and desk lamps.',
    'Contemporary': 'Design a Contemporary office that is trendy, vibrant, and reflects current design movements. Use a base of neutral colors but introduce pops of bold, fashionable accent colors (e.g., mustard yellow, teal, coral) on feature walls or furniture. Furniture has curved lines and unique shapes. Mix materials like wood, metal, and plastic. Incorporate modern art, graphic patterns, and flexible, collaborative seating areas.',
    'Creative / Artistic': 'Create a Creative / Artistic office space that inspires innovation. This style is eclectic and unconventional. Use bold, contrasting colors and large-scale murals or graphic installations. Furniture can be experimental, quirky, and mismatched. Encourage collaboration with writeable walls, flexible layouts, and unique breakout zones. Decor is expressive, featuring local art, employee creations, and unusual objects. The lighting can be dramatic and varied.',
    'Biophilic / Nature-Inspired': 'Design a Biophilic office that connects occupants with nature. Maximize natural sunlight with large windows. Incorporate a large number of living plants, green walls, or indoor gardens. Use natural, earthy materials like light wood, bamboo, stone, and natural fibers (wool, cotton). The color palette is inspired by nature: greens, blues, and earthy browns. Furniture should have organic shapes. The goal is a calm, healthy, and stress-reducing environment.',
    'Traditional Indian': 'Infuse a Traditional Indian aesthetic into the office space. Use rich wooden textures, particularly teak or rosewood, for desks and cabinetry. Incorporate cultural touches like subtle jali (lattice work) in partitions, brass inlays on furniture, or traditional motifs in textiles for upholstery. The color palette should be warm and earthy, with tones of ochre, terracotta, and deep browns. Lighting can include elegant fixtures with brass or copper finishes. The overall feel should be professional yet culturally rooted and warm.',
    'Tech Futuristic': 'Generate a Tech Futuristic office interior. This style is sleek, innovative, and high-tech. Use glossy white or metallic surfaces, integrated LED strip lighting (often in blue or white), and glass walls that may feature interactive displays. Furniture is minimalist and modular, with ergonomic designs and integrated technology. The aesthetic is clean and almost clinical, with a color palette of white, silver, and black, accented by the glow from lighting and screens.'
};

const roomTypeSpecifics: { [key: string]: string } = {
    // Home
    'Living Room': 'The design MUST include seating like a sofa or chairs, a coffee table, and should feel like a primary gathering area.',
    'Kitchen': 'The design MUST include kitchen essentials like countertops, cabinetry, a sink, and should clearly look like a space for cooking.',
    'Master Bedroom': 'The design MUST feature a main bed (King or Queen size), nightstands, and a wardrobe or closet area. It should feel like a primary adult bedroom.',
    'Kids Bedroom': 'The design MUST include a bed suitable for a child (e.g., a twin bed, bunk bed), and incorporate age-appropriate decor, toys, or a study area.',
    'Guest Bedroom': 'The design should feature a comfortable bed, minimal personal items, and feel welcoming for a temporary guest.',
    'Balcony': 'The design should be suitable for an outdoor or semi-outdoor space. Include outdoor furniture, plants, and appropriate flooring. Do NOT turn it into an enclosed room.',
    'Washroom': 'The design MUST include a toilet, a sink/vanity area, and a shower or bathtub. It must be clearly identifiable as a bathroom.',
    // Office
    'Cabin': 'Design this as a private, enclosed office space for one person. It MUST include a desk, an office chair, and professional storage solutions.',
    'Work Area': 'Design this as an open-plan workspace for multiple people. It should include multiple desks or a large communal table, and ergonomic seating.',
    'Pantry': 'This is a break room or kitchen area for an office. It MUST include a countertop, a sink, a microwave or other small appliances, and casual seating.',
    'Conference Room': 'This space MUST be designed for meetings. Include a large central table, multiple chairs around it, and presentation equipment like a large screen or whiteboard.',
    'Reception Area': 'Design this as the entrance and waiting area of an office. It MUST include a reception desk, comfortable seating for visitors, and company branding elements.',
    'Restroom': 'This is a public or office restroom. It MUST include one or more toilets (often in stalls), and a row of sinks. It must not look like a residential bathroom.',
};

export const generateInteriorDesign = async (
    base64ImageData: string,
    mimeType: string,
    style: string,
    spaceType: string,
    roomType: string,
): Promise<string> => {
    if (!ai) {
        // FIX: Updated error message to reflect correct environment variable.
        throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
    }

    try {
        const specificInstruction = roomTypeSpecifics[roomType] || '';

        const basePrompt = `You are an expert interior designer and a master of photorealism. Your primary goal is to generate an image that is indistinguishable from a high-quality photograph. Redesign the interior of this photo of a ${roomType.toLowerCase()} in a ${spaceType.toLowerCase()}.

ROOM-SPECIFIC REQUIREMENTS:
- ${specificInstruction}

CRITICAL ARCHITECTURAL PRESERVATION:
- You MUST preserve the existing structural layout with absolute precision. This includes the exact position, size, and shape of all windows, doors, walls, and the original ceiling height.
- Do NOT alter the core architecture in any way.

PHOTOREALISM DIRECTIVES:
- SPATIAL ANALYSIS: Meticulously analyze the photo's perspective, depth, and scale. All new furniture and decor must be realistically proportioned to fit the room's dimensions and adhere to the established perspective. Avoid any spatial inconsistencies.
- LIGHTING & SHADOWS: Create natural, believable lighting based on the visible light sources (e.g., windows). All objects must cast soft, realistic shadows that ground them in the scene.
- TEXTURES & MATERIALS: Render all materials with high-fidelity textures. Wood should have grain, fabrics should have weaves, and surfaces should have subtle, realistic imperfections. Avoid flat, artificial, or "plastic-looking" surfaces.

DESIGN INSTRUCTIONS:
- Only change the furniture, wall color/treatment, flooring, lighting fixtures, and decorative elements.
- The desired style for this redesign is ${style}.`;
        
        const stylePrompt = spaceType === 'office' 
            ? officeStylePrompts[style] 
            : homeStylePrompts[style] 
            || 'Create a beautiful and modern interior design.';

        const fullPrompt = `${basePrompt}\n\nSTYLE DETAILS: ${stylePrompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: mimeType } },
                    { text: fullPrompt },
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
        console.error("Error generating interior design with Gemini:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate image: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the image generation service.");
    }
};
// Minor change to allow commit.