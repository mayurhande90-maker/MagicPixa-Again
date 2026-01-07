import { GoogleGenAI } from "@google/genai";
import { logApiError, auth } from '../firebase';

// --- SECURITY TOGGLE ---
// Set to TRUE to use the secure Vercel backend (api/generate.ts)
// Set to FALSE to use the exposed client-side key (Development/Fallback)
export const USE_SECURE_BACKEND = false; 

/**
 * Helper function to get a fresh AI client on every call.
 * This is used ONLY when USE_SECURE_BACKEND is false.
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
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        // Classify Error Type
        const status = error.status || error.code;
        const message = (error.message || "").toLowerCase();

        const isTransientError = 
            status === 503 || 
            status === 429 || 
            message.includes('overloaded') || 
            message.includes('503') ||
            message.includes('fetch failed') ||
            message.includes('network error');

        if (retries > 0 && isTransientError) {
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            console.warn(`API Busy/Error (${status}). Retrying in ${Math.round(delay)}ms... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(fn, retries - 1, baseDelay * 2);
        }
        
        const userId = auth?.currentUser?.uid;
        logApiError('Gemini API', message || 'Unknown Error', userId).catch(e => console.error("Logging failed", e));
        throw error;
    }
};

/**
 * The Main Entry Point for AI Generation.
 * Switches between Secure Backend and Client-Side based on configuration.
 */
export const secureGenerateContent = async (params: { 
    model: string; 
    contents: any; 
    config?: any;
    cost?: number;
    featureName?: string;
}) => {
    if (USE_SECURE_BACKEND) {
        // 1. Get current user token for authentication
        const user = auth?.currentUser;
        if (!user) throw new Error("You must be logged in to use this feature.");
        
        const token = await user.getIdToken();

        // 2. Call Vercel API Route
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
            throw new Error(errorData.error || `Server Error: ${response.status}`);
        }

        const data = await response.json();
        
        // The backend returns the raw Gemini response object.
        // We pass it back as-is so the services don't need to change.
        return data;

    } else {
        // Fallback to Client-Side (Insecure but works for dev)
        const ai = getAiClient();
        return await ai.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config
        });
    }
};