
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket, Transaction } from '../types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

/**
 * Analyzes the user's raw input to determine the type of issue.
 * This powers the "Smart Wizard".
 */
export const analyzeSupportIntent = async (text: string): Promise<{
    category: 'refund' | 'bug' | 'general';
    confidence: number;
    reasoning: string;
}> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Classify this user support request for an AI Image Generation App (MagicPixa).
            
            Input: "${text}"
            
            Categories:
            - 'refund': User mentions lost credits, image not generated, deduction error, failed transaction.
            - 'bug': User mentions glitch, UI broken, upload failed, white screen, error message.
            - 'general': How-to questions, billing inquiry (not refund), feature request, or feedback.
            
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING, enum: ['refund', 'bug', 'general'] },
                        confidence: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['category', 'confidence', 'reasoning']
                }
            }
        });

        const result = response.text ? JSON.parse(response.text) : null;
        if (result && result.confidence > 0.6) {
            return result;
        }
        return { category: 'general', confidence: 0, reasoning: 'Fallback' };
    } catch (e) {
        console.error("Support Intent Error", e);
        return { category: 'general', confidence: 0, reasoning: 'Error' };
    }
};

/**
 * Analyzes a screenshot to extract error details automatically.
 */
export const analyzeErrorScreenshot = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Analyze this screenshot of an app error. Extract the error message or describe the visual glitch concisely." }
                ]
            }
        });
        return response.text || "No error details found.";
    } catch (e) {
        return "Could not analyze screenshot.";
    }
};

/**
 * Create a new support ticket in Firestore.
 */
export const createTicket = async (
    userId: string, 
    userEmail: string, 
    data: Partial<Ticket>
): Promise<string> => {
    if (!db) throw new Error("DB not init");
    
    const ticketRef = db.collection('support_tickets').doc();
    const ticketId = ticketRef.id;
    
    const newTicket: Ticket = {
        id: ticketId,
        userId,
        userEmail,
        type: data.type || 'general',
        status: 'open',
        subject: data.subject || 'New Support Request',
        description: data.description || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...data // spread optional fields like relatedTransactionId, screenshotUrl
    };

    await ticketRef.set(newTicket);
    return ticketId;
};

/**
 * Fetch tickets for a specific user.
 */
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
    if (!db) return [];
    const snap = await db.collection('support_tickets')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
};

/**
 * Fetch all tickets (Admin).
 */
export const getAllTickets = async (): Promise<Ticket[]> => {
    if (!db) return [];
    const snap = await db.collection('support_tickets')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
    
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
};

/**
 * Resolve a ticket (Admin Action).
 * Optionally process a refund if it's a refund ticket.
 */
export const resolveTicket = async (
    adminUid: string,
    ticketId: string, 
    resolution: 'resolved' | 'rejected', 
    reply: string,
    refundCredits?: number
) => {
    if (!db) return;
    
    const ticketRef = db.collection('support_tickets').doc(ticketId);
    
    await db.runTransaction(async (t) => {
        const ticketDoc = await t.get(ticketRef);
        if (!ticketDoc.exists) throw new Error("Ticket not found");
        
        const ticketData = ticketDoc.data() as Ticket;
        
        // Update Ticket
        t.update(ticketRef, {
            status: resolution,
            adminReply: reply,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Process Refund if applicable
        if (resolution === 'resolved' && refundCredits && refundCredits > 0) {
            const userRef = db.collection('users').doc(ticketData.userId);
            
            t.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(refundCredits)
            });
            
            const txRef = userRef.collection('transactions').doc();
            t.set(txRef, {
                feature: 'Support Refund',
                creditChange: `+${refundCredits}`,
                reason: `Ticket #${ticketId}`,
                grantedBy: adminUid,
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    });

    await logAudit(adminUid, `Resolve Ticket ${resolution}`, `ID: ${ticketId}, Refund: ${refundCredits || 0}`);
};
