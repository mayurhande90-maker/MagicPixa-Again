
import { GoogleGenAI } from "@google/genai";
import admin from 'firebase-admin';

export const maxDuration = 60; 

if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("[api/generate] Firebase Admin initialized.");
    } catch (e) {
        console.error("[api/generate] Firebase Admin Init Error:", e);
    }
}

const db = admin.firestore();

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log("[api/generate] Processing generation request...");

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing bearer token' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const { model, contents, config, cost = 1, featureName = 'Unknown' } = req.body;
        const userRef = db.collection('users').doc(uid);
        
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) throw new Error("User profile not found");

            const userData = userDoc.data();
            const currentCredits = userData?.credits || 0;

            if (currentCredits < cost) throw new Error("Insufficient credits");

            transaction.update(userRef, { 
                credits: currentCredits - cost,
                lastActive: admin.firestore.FieldValue.serverTimestamp()
            });

            const txRef = userRef.collection('transactions').doc();
            transaction.set(txRef, {
                feature: featureName,
                cost: cost,
                date: admin.firestore.FieldValue.serverTimestamp(),
                method: 'secure-vercel-backend'
            });
        });

        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("[api/generate] API_KEY environment variable is missing.");
            throw new Error("Server configuration error: Gemini key not found.");
        }
        
        console.log(`[api/generate] Initializing model: ${model}`);
        const ai = new GoogleGenAI({ apiKey });
        
        const response = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: config
        });

        console.log("[api/generate] Request successful.");
        return res.status(200).json(response);

    } catch (error: any) {
        console.error("[api/generate] Request Failed:", error.message);
        
        if (error.message === "Insufficient credits") {
            return res.status(403).json({ error: "Insufficient credits" });
        }
        
        return res.status(500).json({ 
            error: error.message || "Internal Server Error",
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
