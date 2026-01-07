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
    // CRITICAL: Obtained exclusively from process.env.API_KEY per coding guidelines.
    const apiKey = process.env.API_KEY;
    // We pass the key (even if undefined) and let the SDK or callWithRetry handle the error.
    return new GoogleGenAI({ apiKey: apiKey || '' });
};

/**
 * Executes an async operation with Smart Retries (Exponential Backoff + Jitter).
 * Now handles automatic API Key selection triggers.
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        // Classify Error Type
        const status = error.status || error.code;
        const message = (error.message || "").toLowerCase();

        // 1. Handle API Key Activation/Selection Errors
        // These specific strings indicate we need to prompt the user for a key.
        const isKeyError = 
            message.includes("requested entity was not found") || 
            message.includes("api key must be set") || 
            message.includes("api key not found") ||
            message.includes("invalid api key");

        if (isKeyError && window.aistudio) {
            console.error("API Key Activation Required:", message);
            
            // Call platform dialog
            await window.aistudio.openSelectKey();
            
            // MITIGATION: Per rules, assume key selection was successful 
            // and proceed to retry the operation immediately.
            if (retries > 0) {
                return callWithRetry(fn, retries - 1, baseDelay);
            }
        }

        // 2. Handle Transient Network/Overload Errors
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
        
        // 3. Log permanent failures
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
        const user = auth?.currentUser;
        if (!user) throw new Error("You must be logged in to use this feature.");
        const token = await user.getIdToken();

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

        return await response.json();
    } else {
        return await callWithRetry(() => {
            const ai = getAiClient();
            return ai.models.generateContent({
                model: params.model,
                contents: params.contents,
                config: params.config
            });
        });
    }
};
