
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { logApiError, auth } from '../firebase';

// --- SECURITY TOGGLE ---
// Set to TRUE to use the secure Vercel backend (api/generate.ts)
// This protects your API Key from being stolen.
const USE_SECURE_BACKEND = true; 

/**
 * Helper function to get a fresh AI client on every call.
 * Returns a Proxy if USE_SECURE_BACKEND is true.
 */
export const getAiClient = (): GoogleGenAI => {
    if (USE_SECURE_BACKEND) {
        // Return a Proxy that redirects generateContent to the secure endpoint
        return {
            models: {
                generateContent: async (params: any) => {
                    return secureGenerateContent({
                        model: params.model,
                        contents: params.contents,
                        config: params.config
                    });
                },
                generateVideos: async (params: any) => {
                     // Fallback to client-side key for Video if available, 
                     // as the current backend endpoint might only handle generateContent.
                     // If no client key, this will fail safely.
                     const apiKey = import.meta.env.VITE_API_KEY;
                     if(apiKey && apiKey !== 'undefined') {
                         const realAi = new GoogleGenAI({ apiKey });
                         return realAi.models.generateVideos(params);
                     }
                     throw new Error("Video generation requires a configured backend endpoint or client-side key.");
                }
            },
            chats: {
                create: (config: any) => {
                    const history = config.history || [];
                    return {
                        sendMessage: async (msgParams: { message: string }) => {
                            const contents = [
                                ...history,
                                { role: 'user', parts: [{ text: msgParams.message }] }
                            ];
                            const response = await secureGenerateContent({
                                model: config.model,
                                contents: contents,
                                config: config.config
                            });
                            
                            // Update local history
                            history.push({ role: 'user', parts: [{ text: msgParams.message }] });
                            if (response.text) {
                                history.push({ role: 'model', parts: [{ text: response.text }] });
                            }
                            return response;
                        }
                    }
                }
            },
            live: {
                connect: () => {
                     throw new Error("Live API is not supported via secure backend proxy yet.");
                }
            }
        } as unknown as GoogleGenAI;
    }

    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      throw new Error("API key is not configured. Please set the VITE_API_KEY environment variable.");
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
 * The Main Entry Point for Secure AI Generation.
 * Calls the backend API route.
 */
export const secureGenerateContent = async (params: { 
    model: string; 
    contents: any; 
    config?: any;
    cost?: number;
    featureName?: string;
}) => {
    // 1. Authenticate: Get current user token
    const user = auth?.currentUser;
    if (!user) throw new Error("You must be logged in to use this feature.");
    
    const token = await user.getIdToken();

    // 2. Call Backend API Route
    // We send cost: 0 to prevent the backend from deducting credits, 
    // as the frontend handles the specific cost logic for each feature.
    const payload = { ...params, cost: 0 };

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 3. Hydrate response to match SDK behavior (add getters like .text)
    // The backend returns raw JSON, so we must manually add the helper property.
    Object.defineProperty(data, 'text', {
        get() {
            if (this.candidates && this.candidates.length > 0) {
                const parts = this.candidates[0].content?.parts;
                if (parts && parts.length > 0 && parts[0].text) {
                    return parts[0].text;
                }
            }
            return undefined;
        }
    });

    return data as GenerateContentResponse;
};
