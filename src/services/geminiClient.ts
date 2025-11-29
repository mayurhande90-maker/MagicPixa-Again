
import { GoogleGenAI } from "@google/genai";
import { logApiError, auth } from "../firebase"; // Import auth to get user ID if available

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
 * Executes an async operation with Smart Retries (Exponential Backoff + Jitter).
 * @param fn The async function to execute
 * @param retries Number of retries (default 3)
 * @param baseDelay Initial delay in ms (default 2000)
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        // Classify Error Type
        const status = error.status || error.code;
        const message = (error.message || "").toLowerCase();

        // Retry Conditions:
        // 1. 503 (Service Unavailable / Overloaded)
        // 2. 429 (Too Many Requests / Rate Limit)
        // 3. "Overloaded" text in message
        // 4. "Fetch failed" (Network blip)
        const isTransientError = 
            status === 503 || 
            status === 429 || 
            message.includes('overloaded') || 
            message.includes('503') ||
            message.includes('fetch failed') ||
            message.includes('network error');

        if (retries > 0 && isTransientError) {
            // Smart Delay: Exponential Backoff + Jitter
            // Delay = (Base * 2^attempt) + Random(0-1000ms)
            // Attempt 1: ~2000ms + jitter
            // Attempt 2: ~4000ms + jitter
            // Attempt 3: ~8000ms + jitter
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            
            console.warn(`Gemini API Busy/Error (${status}). Retrying in ${Math.round(delay)}ms... (${retries} attempts left)`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Recursive call with doubled base delay for next attempt
            return callWithRetry(fn, retries - 1, baseDelay * 2);
        }
        
        // If final attempt fails or not transient, log to Firestore and throw
        const userId = auth?.currentUser?.uid || 'anonymous';
        // Extract function name or call stack for endpoint context if possible, otherwise generic
        const endpoint = 'gemini-api-call'; 
        
        logApiError(endpoint, message || 'Unknown API Error', userId);
        
        throw error;
    }
};
