
import { GoogleGenAI } from "@google/genai";
import admin from 'firebase-admin';

// Configure function timeout (Supported on Vercel Pro/Enterprise)
export const maxDuration = 60; 

// Initialize Firebase Admin (The Secure Backend Connection)
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Firebase Admin Init Error:", e);
    }
}

const db = admin.firestore();

export default async function handler(req: any, res: any) {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 2. Authenticate User
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // 3. Parse Request Data
        // 'task' determines which SDK method to call: 'generateContent', 'generateVideos', 'getVideosOperation'
        const { model, contents, config, cost = 0, featureName = 'Unknown', task = 'generateContent', operation, prompt } = req.body;

        // 4. Secure Transaction (Check & Deduct Credits)
        // Only deduct if cost > 0 (polling operations usually cost 0)
        if (cost > 0) {
            const userRef = db.collection('users').doc(uid);
            
            await db.runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);
                if (!userDoc.exists) throw new Error("User profile not found");

                const userData = userDoc.data();
                const currentCredits = userData?.credits || 0;

                if (currentCredits < cost) throw new Error("Insufficient credits");

                const newCredits = currentCredits - cost;
                
                transaction.update(userRef, { 
                    credits: newCredits,
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
        }

        // 5. Call Google Gemini (Server-Side)
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("Server configuration error: Missing API Key");

        const ai = new GoogleGenAI({ apiKey });
        let response;

        if (task === 'generateVideos') {
            response = await ai.models.generateVideos({
                model,
                prompt,
                config
            });
        } else if (task === 'getVideosOperation') {
            // Reconstruct the operation object. The SDK expects { name: string }
            response = await ai.operations.getVideosOperation({
                operation: operation
            });
        } else {
            // Default: generateContent (Text/Image)
            response = await ai.models.generateContent({
                model,
                contents,
                config
            });
        }

        // 6. Return Result to Frontend
        return res.status(200).json(response);

    } catch (error: any) {
        console.error("API Error:", error);
        
        if (error.message === "Insufficient credits") {
            return res.status(403).json({ error: "Insufficient credits" });
        }
        
        return res.status(500).json({ error: error.message || "Internal Server Error" });
    }
}
