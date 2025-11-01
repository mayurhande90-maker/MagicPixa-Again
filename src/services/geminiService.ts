// FIX: Removed reference to "vite/client" as it was causing a "Cannot find type definition file" error. The underlying issue is likely a misconfigured tsconfig.json, which cannot be modified.

import { GoogleGenAI, Modality } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Use import.meta.env for client-side variables in Vite
// FIX: Cast `import.meta` to `any` to access `env` without TypeScript errors. This is a workaround for the missing Vite client types.
const apiKey = (import.meta as any).env.VITE_API_KEY;

// Initialize the AI client only if the API key is available.
if (apiKey && apiKey !== 'undefined') {
  ai = new GoogleGenAI({ apiKey: apiKey });
}

export const analyzeImageContent = async (
  base64ImageData: string,
  mimeType: string
): Promise<string> => {
  if (!ai) {
    // Update error message to reflect the correct Vite environment variable name
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }

  try {
    const prompt = "Analyze the product in this image. Instead of a literal description, provide a single, creative sentence that captures its essence, mood, or a key selling point. Think like a marketer writing a tagline.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    });

    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image analysis blocked due to: ${response.promptFeedback.blockReason}.`);
    }

    return response.text;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the image analysis service.");
  }
};

export const editImageWithPrompt = async (
  base64ImageData: string,
  mimeType: string,
  aspectRatio: string,
): Promise<string> => {
  // Now, check for the AI client at the time of the function call.
  if (!ai) {
    // Update error message to reflect the correct Vite environment variable name
    throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
  }
  
  try {
    let prompt = `Edit this product photo. The product itself, including packaging, logos, and text, MUST be preserved perfectly. Generate a new, hyper-realistic, marketing-ready image by replacing the background with a professional, appealing setting that complements the product. Ensure lighting is professional.`;
    
    if (aspectRatio !== 'original') {
        let aspectRatioDescription = aspectRatio;
        if (aspectRatio === '16:9') {
            aspectRatioDescription = '16:9 landscape';
        } else if (aspectRatio === '9:16') {
            aspectRatioDescription = '9:16 portrait';
        } else if (aspectRatio === '1:1') {
            aspectRatioDescription = '1:1 square';
        }
        prompt += ` The final output image MUST have a strict aspect ratio of ${aspectRatioDescription}. Adjust the framing and background composition as needed, but do not stretch or distort the original product.`;
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

    // Check for prompt feedback which indicates a block
    if (response.promptFeedback?.blockReason) {
        throw new Error(`Image generation blocked due to: ${response.promptFeedback.blockReason}. Please try a different image.`);
    }

    // Extract the first image part from the response candidates
    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }
    
    // If no image is found and it wasn't blocked, it's a different issue.
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

const stylePrompts: { [key: string]: string } = {
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

export const generateInteriorDesign = async (
    base64ImageData: string,
    mimeType: string,
    style: string,
    spaceType: string,
    roomType: string,
): Promise<string> => {
    if (!ai) {
        throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
    }

    try {
        const basePrompt = `You are an expert interior designer. Redesign the interior of this photo of a ${roomType.toLowerCase()} in a ${spaceType.toLowerCase()} to be hyper-realistic. CRITICAL: You must preserve the existing structural layout, including the position and size of windows, doors, walls, and ceiling height. Only change the furniture, wall color, flooring, lighting, and decor. Do not alter the core architecture.`;
        
        const stylePrompt = stylePrompts[style] || 'Create a beautiful and modern interior design.';

        const fullPrompt = `${basePrompt} The desired style is ${style}. ${stylePrompt}`;

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