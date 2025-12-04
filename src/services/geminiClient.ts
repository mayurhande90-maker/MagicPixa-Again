
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { logApiError, auth } from '../firebase';

// --- SECURITY SETTING ---
// Always true for production. All AI calls route through the backend.
const USE_SECURE_BACKEND = true; 

/**
 * Helper function to get a fresh AI client on every call.
 * Returns a Proxy that redirects all supported methods to the secure endpoint.
 */
export const getAiClient = (): GoogleGenAI => {
    // Return a Proxy that redirects to the secure endpoint
    return {
        models: {
            generateContent: async (params: any) => {
                return secureProxyCall({
                    task: 'generateContent',
                    model: params.model,
                    contents: params.contents,
                    config: params.config
                });
            },
            generateVideos: async (params: any) => {
                return secureProxyCall({
                    task: 'generateVideos',
                    model: params.model,
                    prompt: params.prompt,
                    config: params.config
                });
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
                        const response = await secureProxyCall({
                            task: 'generateContent',
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
        operations: {
            getVideosOperation: async (params: any) => {
                return secureProxyCall({
                    task: 'getVideosOperation',
                    operation: params.operation
                });
            }
        },
        live: {
            connect: () => {
                    throw new Error("Live API is not supported via secure backend proxy yet.");
            }
        }
    } as unknown as GoogleGenAI;
};

/**
 * Executes an async operation with Smart Retries (Exponential Backoff + Jitter).
 */
export const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 2000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
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
export const secureProxyCall = async (payload: any) => {
    // 1. Authenticate: Get current user token
    const user = auth?.currentUser;
    if (!user) throw new Error("You must be logged in to use this feature.");
    
    const token = await user.getIdToken();

    // 2. Call Backend API Route
    // We send cost: 0 to prevent the backend from deducting credits, 
    // as the frontend handles the specific cost logic for each feature separately.
    const finalPayload = { ...payload, cost: 0 };

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(finalPayload)
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 3. Hydrate response for generateContent to match SDK behavior (add getters like .text)
    if (payload.task === 'generateContent') {
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
    }

    return data;
};

// Legacy Export for backward compatibility if needed, but strictly mapped to proxy now.
export const secureGenerateContent = (params: any) => secureProxyCall({ task: 'generateContent', ...params });
