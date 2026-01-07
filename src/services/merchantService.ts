import { GenerateContentResponse } from "@google/genai";
import { getAiClient, callWithRetry } from "./geminiClient";
import { resizeImage } from "../utils/imageUtils";
import { auth } from '../firebase';
import { BrandKit, ProductAnalysis } from "../types";

const optimizeImage = async (base64: string, mimeType: string, width: number = 1024): Promise<{ data: string; mimeType: string }> => {
    try {
        const dataUri = `data:${mimeType};base64,${base64}`;
        const resizedUri = await resizeImage(dataUri, width, 0.85);
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

const generateVariant = async (
    role: string, 
    promptInstruction: string,
    inputs: MerchantInputs,
    optMain: { data: string; mimeType: string },
    optBack?: { data: string; mimeType: string } | null,
    optModel?: { data: string; mimeType: string } | null,
    brand?: BrandKit | null,
    sessionDna?: string
): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    const brandDNA = brand ? `Brand: '${brand.companyName || brand.name}'.` : "";
    const lock = sessionDna ? `SESSION LOCK: ${sessionDna}` : "";

    parts.push({ text: `You are an expert Photographer. Generate "${role}". ${brandDNA} ${lock}` });
    parts.push({ inlineData: { data: optMain.data, mimeType: optMain.mimeType } });
    if (optBack) parts.push({ inlineData: { data: optBack.data, mimeType: optBack.mimeType } });
    if (optModel && inputs.type === 'apparel') parts.push({ inlineData: { data: optModel.data, mimeType: optModel.mimeType } });
    parts.push({ text: promptInstruction });

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts }
    }));

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData?.data);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
    throw new Error(`Failed to generate ${role}`);
};

const runBatchWithConcurrency = async <T>(tasks: (() => Promise<T>)[], concurrency: number = 3): Promise<T[]> => {
    const results: (T | undefined)[] = new Array(tasks.length).fill(undefined);
    let taskIndex = 0;
    const worker = async () => {
        while (true) {
            const i = taskIndex++;
            if (i >= tasks.length) break;
            try {
                results[i] = await tasks[i]();
            } catch (error) {
                console.warn(`Batch Task ${i} failed`, error);
            }
        }
    };
    const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results.filter((r): r is T => r !== undefined);
};

export const generateMerchantBatch = async (inputs: MerchantInputs, brand?: BrandKit | null): Promise<string[]> => {
    const optMain = await optimizeImage(inputs.mainImage.base64, inputs.mainImage.mimeType);
    const optBack = inputs.backImage ? await optimizeImage(inputs.backImage.base64, inputs.backImage.mimeType) : null;
    const optModel = inputs.modelImage ? await optimizeImage(inputs.modelImage.base64, inputs.modelImage.mimeType) : null;
    const packSize = inputs.packSize || 5;
    const taskDefinitions = [{ role: "Hero", prompt: "Direct Front View, White background." }];
    // Simplified for demonstration - full mapping would include all 10 variant prompts
    const results = await runBatchWithConcurrency(taskDefinitions.map(def => () => generateVariant(def.role, def.prompt, inputs, optMain, optBack, optModel, brand)), 3);
    return results;
};
