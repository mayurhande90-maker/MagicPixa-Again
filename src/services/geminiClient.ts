
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

/**
 * Executes an async operation with automatic retries for 503 (Service Unavailable/Overloaded) errors.
 * Uses exponential backoff.
 * @param fn The async function to execute
 * @param retries Number of retries (default 3)
 * @param delay Initial delay in ms (default 1000)
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        // Check for specific 503 or "overloaded" error messages
        const isOverloaded = 
            error.status === 503 || 
            error.code === 503 || 
            (error.message && error.message.toLowerCase().includes('overloaded')) ||
            (error.message && error.message.includes('503'));

        if (retries > 0 && isOverloaded) {
            console.warn(`Gemini API overloaded. Retrying in ${delay}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};
