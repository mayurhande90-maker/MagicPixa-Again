
import { GoogleGenAI } from "@google/genai";

/**
 * Helper function to get a fresh AI client on every call.
 * This ensures the latest API key is used.
 */
export const getAiClient = (): GoogleGenAI => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable in your project settings.");
    }
    return new GoogleGenAI({ apiKey });
};
