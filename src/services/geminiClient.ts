import { GoogleGenAI } from "@google/genai";
import { logApiError, auth, app } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// --- SECURITY TOGGLE ---
// Set this to TRUE once you have deployed the functions folder to Firebase.
// While FALSE, it will continue to use the frontend key to keep your site working.
const USE_SECURE_BACKEND = false; 

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
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            
            console.warn(`Gemini API Busy/Error (${status}). Retrying in ${Math.round(delay)}ms... (${retries} attempts left)`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Recursive call with doubled base delay for next attempt
            return callWithRetry(fn, retries - 1, baseDelay * 2);
        }
        
        // If final failure (or non-retriable), log to Firestore for Admin Panel
        const userId = auth?.currentUser?.uid;
        // Don't await this log, let it happen in background
        logApiError('Gemini API', message || 'Unknown Error', userId).catch(e => console.error("Logging failed", e));
        
        // Re-throw to be handled by the UI
        throw error;
    }
};

/**
 * FUTURE-PROOFING:
 * Use this wrapper when you are ready to switch to the secure backend.
 */
export const secureGenerateContent = async (params: { 
    model: string; 
    contents: any; 
    config?: any;
    cost?: number;
    featureName?: string;
}) => {
    if (USE_SECURE_BACKEND) {
        // Call Cloud Function
        const functions = getFunctions(app);
        const generateFunction = httpsCallable(functions, 'generateSecureContent');
        const result = await generateFunction(params);
        return result.data as any; // Returns the Gemini response structure
    } else {
        // Fallback to Client-Side (Current Method)
        const ai = getAiClient();
        return await ai.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config
        });
    }
};
