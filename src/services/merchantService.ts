import { Modality, GenerateContentResponse, Type } from "@google/genai";
import { getAiClient, callWithRetry, secureGenerateContent } from "./geminiClient";
import { resizeImage, urlToBase64 } from "../utils/imageUtils";
import { logApiError, auth } from '../firebase';
import { BrandKit } from "../types";

// Optimize images to 1024px for balanced quality/speed
const optimizeImage = async (base64: string, mimeType: string): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, 1024, 0.85);
        const [header, data] = resizedUri.split(',');
        const newMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        return { data, mimeType: newMime };
    } catch (e) {
        console.warn("Image optimization failed, using original", e);
        return { data: base64, mimeType };
    }
};

export interface MerchantInputs {
    type: 'apparel' | 'product';
    mainImage: { base64: string; mimeType: string };
    backImage?: { base64: string; mimeType: string } | null;
    modelImage?: { base64: string; mimeType: string } | null;
    modelParams?: {
        ethnicity: string;
        age: string;
        gender: string;
        skinTone: string;
        bodyType: string;
    };
    productType?: string;
    productVibe?: string;
    packSize?: 5 | 7 | 10;
}

/**
 * ENGINE 1: THE FORENSIC ANALYST (Pre-Generation Audit)
 * Maps labels, geometry, and material science to ensure zero hallucinations.
 */
const performForensicAudit = async (base64: string, mimeType: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `Act as a Senior Forensic Visual Auditor. 
    Perform a "Forensic Visual Audit" on this product photo.
    
    1. **IDENTITY MAPPING**: Transcribe all visible labels and branding.
    2. **GEOMETRIC BLUEPRINT**: Define the exact silhouette and dimensions (e.g., Cylindrical bottle, square box, loose-fit garment).
    3. **MATERIAL SCIENCE**: Identify textures (Glossy glass, Matte fabric, Brushed metal).
    4. **PHYSICS ANCHOR**: Define the contact points where shadows should naturally form.
    
    OUTPUT: A technical "Sacred Asset Protocol" paragraph for a render engine.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] },
            featureName: 'Merchant Forensic Audit'
        });
        return response.text || "Standard geometry, matte material.";
    } catch (e) {
        return "Standard geometry, matte material.";
    }
};

/**
 * ENGINE 2: THE STRATEGIC PACK ARCHITECT
 * Plans the visual strategy for the entire pack based on the audit.
 */
const architectPackStrategy = async (audit: string, inputs: MerchantInputs): Promise<string[]> => {
    const ai = getAiClient();
    const prompt = `Act as a Creative Director for an E-commerce Agency.
    
    *** INPUT DATA ***
    Product Audit: ${audit}
    Category: ${inputs.type} (${inputs.productType})
    Vibe: ${inputs.productVibe}
    Pack Size: ${inputs.packSize}
    
    *** TASK: ARCHITECT THE PACK ***
    Plan a series of ${inputs.packSize} professional shot descriptions. 
    Tailor shots to the product material (e.g., if liquid, include droplets. if tech, include port details).
    
    RETURN: A JSON array of ${inputs.packSize} strings, each being a highly detailed prompt for the production engine.`;

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-pro-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            },
            featureName: 'Merchant Pack Strategy'
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return []; // Fallback handled in orchestrator
    }
};

/**
 * ENGINE 3: THE PRODUCTION ENGINE (High-Fidelity Rendering)
 * Applies Ray-Traced physics and Identity Anchoring.
 */
const generateVariant = async (
    role: string, 
    promptInstruction: string,
    inputs: MerchantInputs,
    optMain: { data: string; mimeType: string },
    audit: string,
    optBack?: { data: string; mimeType: string } | null,
    optModel?: { data: string; mimeType: string } | null,
    brand?: BrandKit | null
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];

    const brandDNA = brand ? `
    *** BRAND DNA (STRICT ADHERENCE) ***
    - Brand: '${brand.companyName || brand.name}'. Industry: ${brand.industry}.
    - Tone: ${brand.toneOfVoice}. Primary Color: ${brand.colors.primary}.
    ` : "";

    const productionMandate = `
    *** IDENTITY ANCHOR v5.0 (SACRED ASSET PROTOCOL) ***
    1. **IDENTITY LOCK**: You are FORBIDDEN from altering the geometry, labels, or typography identified in the Audit: ${audit}. Every letter must stay 100% sharp.
    2. **RAY-TRACED CONTACT PHYSICS**: Render dark, physically accurate Ambient Occlusion (AO) shadows exactly at the contact points.
    3. **GLOBAL ILLUMINATION**: Apply subtle color-bleed from the environment onto the subject base.
    
    GOAL: Render "${role}" with following logic: ${promptInstruction}
    `;

    parts.push({ text: productionMandate });
    parts.push({ text: brandDNA });
    parts.push({ text: "SOURCE HERO ASSET:" }, { inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    if (optBack) parts.push({ text: "BACK REFERENCE:" }, { inlineData: { data: optBack.data, mimeType: optBack.mimeType } });
    if (optModel) parts.push({ text: "MODEL REFERENCE:" }, { inlineData: { data: optModel.data, mimeType: optModel.mimeType } });

    try {
        const response = await secureGenerateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: { 
                responseModalities: [Modality.IMAGE],
                imageConfig: { imageSize: "2K" }
            },
            featureName: 'Merchant Variant Generation'
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData?.data);
        if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
        throw new Error(`Failed to render ${role}`);
    } catch (e) {
        throw e;
    }
};

const runBatchWithConcurrency = async <T>(tasks: (() => Promise<T>)[], concurrency: number = 3): Promise<T[]> => {
    const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
    let taskIndex = 0;
    const worker = async () => {
        while (true) {
            const i = taskIndex++;
            if (i >= tasks.length) break;
            try { results[i] = await tasks[i](); } catch (error) {
                console.warn(`Task ${i} failed`, error);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
    return results.filter((r): r is T => r !== undefined);
};

export const generateMerchantBatch = async (inputs: MerchantInputs, brand?: BrandKit | null): Promise<string[]> => {
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optBack = inputs.backImage ? await optimizeImage(inputs.backImage.base64, inputs.backImage.mimeType) : null;
    const optModel = inputs.modelImage ? await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType) : null;

    // 1. Forensic Audit
    const audit = await performForensicAudit(optMain.data, optMain.mimeType);
    
    // 2. Strategic Architecture
    const shotStrategies = await architectPackStrategy(audit, inputs);
    
    // Fallback if strategy engine fails
    const finalShots = shotStrategies.length >= (inputs.packSize || 5) 
        ? shotStrategies 
        : Array.from({ length: inputs.packSize || 5 }, (_, i) => `Professional listing shot variant ${i+1}`);

    // 3. Parallel Production
    const tasks = finalShots.map((strategy, idx) => 
        () => generateVariant(`Asset ${idx+1}`, strategy, inputs, optMain, audit, optBack, optModel, brand)
    );

    return await runBatchWithConcurrency(tasks, 3);
};
