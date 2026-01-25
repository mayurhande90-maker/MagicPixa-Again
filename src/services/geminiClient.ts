import { GoogleGenAI } from "@google/genai";
import { logApiError, logUsage, auth } from '../firebase';

// --- SECURITY TOGGLE ---
export const USE_SECURE_BACKEND = false; 

// GOOGLE AI ESTIMATES (USD) - Internal rates for logging
const ESTIMATED_RATES: Record<string, number> = {
    'gemini-3-pro-image-preview': 0.02,
    'gemini-2.5-flash-image': 0.002, 
    'gemini-3-pro-preview': 0.0005,
    'gemini-3-flash-preview': 0.0001
};

/**
 * Helper function to get a fresh AI client on every call.
 * Detects the API key from the environment.
 */
export const getAiClient = (): GoogleGenAI => {
    // In browser environments using Vite, process.env.API_KEY may be undefined.
    // We check both the platform-standard process.env and the Vite-standard import.meta.env.
    const apiKey = process.env.API_KEY || (import.meta as any).env.VITE_API_KEY;
    
    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please ensure VITE_API_KEY is set in your environment variables.");
    }
    
    return new GoogleGenAI({ apiKey });
};

/**
 * Executes an async operation with Smart Retries.
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
    const user = auth?.currentUser;
    const userId = user?.uid || 'anonymous';
    const rate = ESTIMATED_RATES[params.model] || 0.0001;

    // Log usage immediately (Shadow Logging)
    logUsage(params.model, params.featureName || 'Unknown', userId, rate)
        .catch(e => console.warn("Financial logging failed", e));

    if (USE_SECURE_BACKEND) {
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
        const ai = getAiClient();
        return await ai.models.generateContent({
            model: params.model,
            contents: params.contents,
            config: params.config
        });
    }
};
