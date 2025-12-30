
import { GoogleGenAI } from "@google/genai";
import { logApiError, auth } from '../firebase';

// --- SECURITY TOGGLE ---
const USE_SECURE_BACKEND = false; 

/**
 * Helper function to get a fresh AI client on every call.
 */
export const getAiClient = (): GoogleGenAI => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'undefined' || apiKey === '') {
      console.error("[GeminiClient] VITE_API_KEY is missing or empty.");
      throw new Error("API configuration error: VITE_API_KEY is not set in environment variables.");
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Executes an async operation with Smart Retries and Detailed Error Classification.
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const status = error.status || error.code;
        const message = (error.message || "").toLowerCase();
        
        // Detailed logging for key-specific issues
        if (message.includes('api key not valid') || message.includes('invalid api key')) {
            console.error("[GeminiClient] AUTH FAILURE: The provided API key is invalid.");
            throw new Error("Authentication failed: The Gemini API key is invalid. Please check your configuration.");
        }

        if (status === 403 || message.includes('forbidden')) {
            console.error("[GeminiClient] ACCESS DENIED: Check if the API key has the correct permissions or billing enabled.");
            throw new Error("Access denied: Your API key does not have permission to use this model. Ensure billing is active.");
        }

        if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
            console.warn("[GeminiClient] QUOTA EXCEEDED: Rate limit hit.");
            if (retries > 0) {
                const delay = baseDelay + (Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, delay));
                return callWithRetry(fn, retries - 1, baseDelay * 2);
            }
            throw new Error("Usage limit reached: Too many requests. Please try again in a few minutes.");
        }

        const isTransientError = 
            status === 503 || 
            message.includes('overloaded') || 
            message.includes('fetch failed') ||
            message.includes('network error');

        if (retries > 0 && isTransientError) {
            const delay = baseDelay + (Math.random() * 1000);
            console.warn(`[GeminiClient] Transient Error (${status}). Retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(fn, retries - 1, baseDelay * 2);
        }
        
        const userId = auth?.currentUser?.uid;
        logApiError('Gemini API Client', `Status ${status}: ${message}`, userId).catch(e => console.error("Logging failed", e));
        throw error;
    }
};

/**
 * The Main Entry Point for AI Generation.
 */
export const secureGenerateContent = async (params: { 
    model: string; 
    contents: any; 
    config?: any;
    cost?: number;
    featureName?: string;
}) => {
    if (USE_SECURE_BACKEND) {
        const user = auth?.currentUser;
        if (!user) throw new Error("You must be logged in to use this feature.");
        const token = await user.getIdToken();

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("[GeminiClient] Backend returned error:", errorData);
                throw new Error(errorData.error || `Server Error: ${response.status}`);
            }

            return await response.json();
        } catch (fetchErr: any) {
            console.error("[GeminiClient] Secure fetch failed:", fetchErr);
            throw fetchErr;
        }
    } else {
        const ai = getAiClient();
        return await callWithRetry(() => ai.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config
        }));
    }
};
