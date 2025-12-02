import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";

// Initialize the "Cashier" (Admin SDK)
admin.initializeApp();
const db = admin.firestore();

// --- SECURE GENERATION FUNCTION ---
// This function runs on Google's Secure Servers, NOT in the user's browser.
export const generateSecureContent = onCall({ secrets: ["GEMINI_API_KEY"] }, async (request) => {
    // 1. Authenticate: Ensure the user is logged in
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to use this feature.');
    }

    const uid = request.auth.uid;
    const { model, contents, config, cost = 1, featureName = 'Unknown' } = request.data;

    // 2. Access the Secret Key (Hidden from the user)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new HttpsError('internal', 'API Configuration Error');
    }

    // 3. Check Balance (Server-Side Verification)
    // We read the credits directly from the database, so the user cannot fake their balance.
    const userRef = db.collection('users').doc(uid);
    
    // Run as a transaction to prevent race conditions
    return db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data();
        const currentCredits = userData?.credits || 0;

        if (currentCredits < cost) {
            throw new HttpsError('resource-exhausted', 'Insufficient credits. Please recharge.');
        }

        // 4. Call Gemini AI (Securely)
        const ai = new GoogleGenAI({ apiKey });
        let aiResponse;
        
        try {
            // We use the raw generateContent here
            const result = await ai.models.generateContent({
                model: model,
                contents: contents,
                config: config
            });
            aiResponse = result;
        } catch (error: any) {
            console.error("AI Generation Failed:", error);
            throw new HttpsError('internal', 'AI Generation Failed: ' + error.message);
        }

        // 5. Deduct Credits (Server-Side)
        const newCredits = currentCredits - cost;
        transaction.update(userRef, { 
            credits: newCredits,
            totalCreditsAcquired: admin.firestore.FieldValue.increment(0) // Just to keep field active
        });

        // Log transaction
        const txRef = userRef.collection('transactions').doc();
        transaction.set(txRef, {
            feature: featureName,
            cost: cost,
            date: admin.firestore.FieldValue.serverTimestamp(),
            method: 'secure-backend'
        });

        // 6. Return the AI result to the frontend
        return aiResponse;
    });
});

// --- ADMIN SECURE ACTION ---
// Prevents users from faking admin status on the frontend
export const adminActionSecure = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Missing auth');
    
    // Check if the user is truly an admin via Custom Claims or DB lookup
    const callerId = request.auth.uid;
    const userSnap = await db.collection('users').doc(callerId).get();
    
    // Hardcoded safety check or use custom claims
    if (!userSnap.data()?.isAdmin) {
        throw new HttpsError('permission-denied', 'You are not an admin.');
    }

    const { action, targetUid, payload } = request.data;

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
        return { success: true, message: `User ban status: ${payload.isBanned}` };
    }

    throw new HttpsError('invalid-argument', 'Unknown action');
});
