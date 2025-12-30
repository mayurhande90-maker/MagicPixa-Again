
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();
const db = admin.firestore();

/**
 * SECURE GENERATION FUNCTION
 * Runs on Google's secure servers. Requires API_KEY secret to be set in Firebase.
 */
export const generateSecureContent = onCall({ secrets: ["API_KEY"] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User session expired or not found.');
    }

    const uid = request.auth.uid;
    const { model, contents, config, cost = 1, featureName = 'Unknown' } = request.data;

    // Secret Verification
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.error("[generateSecureContent] CRITICAL: API_KEY secret is not configured in Firebase Functions.");
        throw new HttpsError('internal', 'Server configuration error: Gemini API Key is missing.');
    } else {
        console.log(`[generateSecureContent] API Key detected. Length: ${apiKey.length}. Prefix: ${apiKey.substring(0, 4)}...`);
    }

    const userRef = db.collection('users').doc(uid);
    
    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found in database.');
        }

        const userData = userDoc.data();
        const currentCredits = userData?.credits || 0;

        if (currentCredits < cost) {
            throw new HttpsError('resource-exhausted', `Insufficient credits. Required: ${cost}, Available: ${currentCredits}`);
        }

        console.log(`[generateSecureContent] Initializing Gemini client for model: ${model}`);
        const ai = new GoogleGenAI({ apiKey });
        
        let aiResponse;
        try {
            const result = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: config
            });
            aiResponse = result;
            console.log("[generateSecureContent] AI successfully returned response.");
        } catch (error: any) {
            console.error("[generateSecureContent] Gemini API Error:", error);
            const msg = error.message || "Unknown Gemini API error";
            throw new HttpsError('internal', `AI Generation Failed: ${msg}`);
        }

        // Deduct Credits
        const newCredits = currentCredits - cost;
        transaction.update(userRef, { 
            credits: newCredits,
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log transaction
        const txRef = userRef.collection('transactions').doc();
        transaction.set(txRef, {
            feature: featureName,
            cost: cost,
            date: admin.firestore.FieldValue.serverTimestamp(),
            method: 'secure-firebase-backend'
        });

        return aiResponse;
    });
});

export const adminActionSecure = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Missing auth');
    
    const callerId = request.auth.uid;
    const userSnap = await db.collection('users').doc(callerId).get();
    
    if (!userSnap.data()?.isAdmin) {
        console.warn(`[adminActionSecure] Access denied for user: ${callerId}`);
        throw new HttpsError('permission-denied', 'Administrative access required.');
    }

    const { action, targetUid, payload } = request.data;
    console.log(`[adminActionSecure] Action: ${action}, Target: ${targetUid}`);

    if (action === 'grantCredits') {
        await db.collection('users').doc(targetUid).update({
            credits: admin.firestore.FieldValue.increment(payload.amount)
        });
        return { success: true, message: `Granted ${payload.amount} credits.` };
    }

    if (action === 'banUser') {
        await db.collection('users').doc(targetUid).update({
            isBanned: payload.isBanned
        });
        return { success: true, message: `User ban status set to: ${payload.isBanned}` };
    }

    throw new HttpsError('invalid-argument', `Unknown action: ${action}`);
});
