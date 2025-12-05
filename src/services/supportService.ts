
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// --- KNOWLEDGE BASE ---
const SYSTEM_INSTRUCTION = `
You are "Pixa Support", an advanced AI support agent for MagicPixa.
Your goal: Solve the user's problem INSTANTLY via chat. Only suggest a ticket if you cannot solve it (e.g., refunds, technical bugs).

**IDENTITY:**
- Name: Pixa Support.
- Personality: Friendly, premium, concise, helpful.
- **IMPORTANT**: Use Markdown to structure your answers.
  - Use **Bold** for key terms or emphasis.
  - Use \`### Title\` for sections if the answer is long.
  - Use bullet points for lists.

**YOUR KNOWLEDGE BASE:**
1. **Pixa Product Shots (formerly Magic Photo Studio)**: Generates professional product shots.
2. **Pixa AdMaker**: Creates high-converting ad creatives using "3% Rule".
3. **Pixa Ecommerce Kit**: Generates 5-10 assets (Hero, Lifestyle, etc.) in a batch.
4. **Pixa Interior**: Redesigns rooms.
5. **Credits**: Users buy packs (Starter, Creator, Studio). Credits are deducted per generation.
6. **Billing**: Payments via Razorpay. No monthly subscriptions, only pay-as-you-go.

**YOUR BEHAVIOR:**
- **Q&A**: If the user asks "How do I...", explain it clearly using steps.
- **Refunds**: If user mentions "lost credits", "payment failed", "didn't get image", YOU CANNOT process refunds yourself. You must generate a "Ticket Proposal" for them.
- **Bugs**: If user reports a crash or error, generate a "Ticket Proposal".

**OUTPUT FORMAT:**
You must return a JSON object.
{
  "type": "message" | "proposal",
  "text": "Your conversational response here (use **bold** and ### headers).",
  "ticketDraft": { ... } // ONLY if type is 'proposal'
}

**Ticket Draft Structure (if proposal):**
{
  "subject": "Short summary",
  "type": "refund" | "bug" | "general",
  "description": "Cleaned up description of the issue based on user chat."
}
`;

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string; // The text to display
    type?: 'message' | 'proposal'; // Plain text or a Ticket Draft Card
    ticketDraft?: Partial<Ticket>; // Data if it's a proposal
    timestamp: number;
}

/**
 * Sends a message to the Concierge and gets a smart response.
 */
export const sendSupportMessage = async (
    history: ChatMessage[], 
    userContext: { name: string; email: string; credits: number }
): Promise<ChatMessage> => {
    const ai = getAiClient();
    
    // Format history for Gemini
    const chatHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Add User Context to the latest message to ground the AI
    const lastMsg = chatHistory.pop(); // Remove last user msg to re-add with context
    const contextInjection = `\n\n[System Context: User=${userContext.name}, Credits=${userContext.credits}]`;
    
    if (lastMsg) {
        chatHistory.push({
            role: 'user',
            parts: [{ text: lastMsg.parts[0].text + contextInjection }]
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatHistory,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ["message", "proposal"] },
                        text: { type: Type.STRING },
                        ticketDraft: {
                            type: Type.OBJECT,
                            properties: {
                                subject: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ["refund", "bug", "general"] },
                                description: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["type", "text"]
                }
            }
        });

        const data = JSON.parse(response.text || "{}");

        return {
            id: Date.now().toString(),
            role: 'model',
            content: data.text,
            type: data.type,
            ticketDraft: data.ticketDraft,
            timestamp: Date.now()
        };

    } catch (e) {
        console.error("Support Agent Error", e);
        return {
            id: Date.now().toString(),
            role: 'model',
            content: "I'm having trouble connecting to the mainframe. Please try again or create a manual ticket below.",
            type: 'message',
            timestamp: Date.now()
        };
    }
};

/**
 * Analyzes a screenshot to extract error details automatically.
 */
export const analyzeErrorScreenshot = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const ai = getAiClient();
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
): Promise<Ticket> => {
    if (!db) throw new Error("DB not init");
    
    const ticketRef = db.collection('support_tickets').doc();
    const ticketId = ticketRef.id;
    
    const now = firebase.firestore.Timestamp.now();

    const rawTicket: Ticket = {
        id: ticketId,
        userId,
        userEmail,
        type: data.type || 'general',
        status: 'open',
        subject: data.subject || 'New Support Request',
        description: data.description || '',
        createdAt: now,
        relatedTransactionId: data.relatedTransactionId,
        refundAmount: data.refundAmount,
        screenshotUrl: data.screenshotUrl,
        adminReply: undefined
    };

    // Sanitize undefined
    const safeTicket = Object.entries(rawTicket).reduce((acc, [key, value]) => {
        if (value === undefined) return acc;
        return { ...acc, [key]: value };
    }, {} as any);

    await ticketRef.set(safeTicket);
    return rawTicket;
};

/**
 * Fetch tickets for a specific user.
 * MODIFIED: Client-side sorting to avoid composite index requirements.
 */
export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
    if (!db) return [];
    
    try {
        // Only filter by user ID. Sort in memory.
        const snap = await db.collection('support_tickets')
            .where('userId', '==', userId)
            .get();
        
        const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        
        // Client-side Sort (Newest First)
        return tickets.sort((a, b) => {
            const tA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt).getTime();
            const tB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime();
            return tB - tA;
        });
    } catch (e) {
        console.error("Failed to fetch tickets:", e);
        return [];
    }
};

/**
 * Fetch all tickets (Admin).
 */
export const getAllTickets = async (): Promise<Ticket[]> => {
    if (!db) return [];
    
    try {
        // Fetch all, client side sort to avoid index issues on 'createdAt'
        const snap = await db.collection('support_tickets').get();
        
        const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        
        return tickets.sort((a, b) => {
            const tA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt).getTime();
            const tB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime();
            return tB - tA;
        });
    } catch (e) {
        console.error("Failed to fetch all tickets:", e);
        return [];
    }
};

/**
 * Resolve a ticket (Admin Action).
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
        
        t.update(ticketRef, {
            status: resolution,
            adminReply: reply,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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
