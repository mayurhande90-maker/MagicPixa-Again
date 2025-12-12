
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// --- WORLD-CLASS SUPPORT LOGIC ---
const SYSTEM_INSTRUCTION = `
You are **Pixa**, the Senior Technical Concierge for MagicPixa.
Your goal is **First Contact Resolution (FCR)**. You must solve the user's problem NOW, without human intervention, whenever possible.

**YOUR PRIME DIRECTIVE:**
1.  **Diagnose**: Use the provided [USER CONTEXT] to verify facts (e.g., if they say "I can't generate", check if Credits < 2).
2.  **Educate/Fix**: Provide immediate, specific technical steps to resolve the issue.
3.  **Gatekeep**: Do NOT create a ticket unless the user confirms your solution failed.

*** KNOWLEDGE BASE (THE TRUTH) ***
- **Credits**: Users strictly pay-as-you-go. No subscriptions.
  - *Costs*: Product Shot (2cr), AdMaker (4cr), Ecommerce Kit (25cr), Thumbnail (5cr).
  - *Zero Balance*: If credits = 0, features lock. This is NOT a bug.
- **Image Quality**:
  - "Blurry faces": Suggest using 'Pixa Together' or 'Model Mode' for humans.
  - "Glitchy product": Suggest uploading a PNG with a cleaner background.
- **Uploads**: Max file size is 10MB. Formats: JPG, PNG, WEBP.
- **Refunds**: Only eligible if the result was objectively distorted/failed.

*** THE "GATEKEEPER" PROTOCOL (STRICT) ***
- **Condition A (Billing)**: If user asks about credits/costs -> EXPLAIN based on their balance. DO NOT TICKET.
- **Condition B (How-To)**: If user asks how to use a feature -> GUIDE them step-by-step. DO NOT TICKET.
- **Condition C (Errors)**: If user reports an error -> SUGGEST A FIX (Clear cache, try different browser, check image size). DO NOT TICKET immediately.
- **Condition D (Ticket Creation)**: ONLY generate a ticket proposal if:
    1. The user explicitly says "I tried that and it didn't work."
    2. It is a **Refund Request** for a specific failed generation.
    3. The user explicitly types "Talk to human" or "Open ticket."

*** OUTPUT FORMAT ***
You must return a JSON object.

1. **If solving the problem (90% of cases):**
{
  "type": "message",
  "text": "Your helpful, empathetic, engineer-level response here. Use Markdown for bolding."
}

2. **If (and ONLY if) creating a ticket is absolutely necessary:**
{
  "type": "proposal",
  "text": "I've logged the details. Please confirm the ticket below so our engineering team can investigate.",
  "ticketDraft": {
    "subject": "Concise summary (e.g. 'Gen-Error: 500 on Product Studio')",
    "type": "bug" | "refund" | "general" | "feature",
    "description": "Technical summary of the conversation for the admin."
  }
}
`;

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string; // The text to display
    type?: 'message' | 'proposal'; // Plain text or a Ticket Draft Card
    ticketDraft?: Partial<Ticket>; // Data if it's a proposal
    timestamp: number;
    isSubmitted?: boolean; // Track if proposal was converted to ticket
}

/**
 * Sends a message to the Concierge and gets a smart response.
 */
export const sendSupportMessage = async (
    history: ChatMessage[], 
    userContext: { name: string; email: string; credits: number; plan?: string }
): Promise<ChatMessage> => {
    const ai = getAiClient();
    
    // Format history for Gemini
    const chatHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Inject Live Context invisibly into the system prompt context window via the last message
    // This gives the AI "X-Ray Vision" into the user's account status.
    const contextInjection = `
    
    <<< SYSTEM DATA FEED >>>
    User Name: ${userContext.name}
    User Email: ${userContext.email}
    Current Credit Balance: ${userContext.credits} (CRITICAL: If 0, features will fail)
    Current Plan: ${userContext.plan || 'Free Tier'}
    Server Time: ${new Date().toLocaleString()}
    <<< END DATA FEED >>>
    
    (Use this data to diagnose issues. Do not quote it raw.)
    `;
    
    // Append context to the last user message to keep it fresh in the context window
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        const lastMsg = chatHistory[chatHistory.length - 1];
        lastMsg.parts[0].text += contextInjection;
    } else {
        chatHistory.push({
            role: 'user',
            parts: [{ text: `(System: Starting Session) ${contextInjection}` }]
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Flash is perfect for high-speed logic/chat
            contents: chatHistory,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.4, // Lower temperature for more precise/technical answers
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
                                type: { type: Type.STRING, enum: ["refund", "bug", "general", "feature"] },
                                description: { type: Type.STRING }
                            }
                        }
                    },
                    required: ["type", "text"]
                }
            }
        });

        const text = response.text || "{}";
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseError) {
            console.error("JSON Parse failed", text);
            // Fallback for raw text responses
            return {
                id: Date.now().toString(),
                role: 'model',
                content: text.replace(/```json/g, '').replace(/```/g, '') || "I'm analyzing your request.",
                type: 'message',
                timestamp: Date.now()
            };
        }

        return {
            id: Date.now().toString(),
            role: 'model',
            content: data.text || "I'm analyzing your request.",
            type: data.type || 'message',
            ticketDraft: data.ticketDraft,
            timestamp: Date.now()
        };

    } catch (e) {
        console.error("Support Agent Error", e);
        return {
            id: Date.now().toString(),
            role: 'model',
            content: "My connection is a bit unstable. Please try asking again, or check your internet connection.",
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
                    { text: "Act as a Debugger. Analyze this screenshot. 1. Identify any visible error text. 2. Identify which screen/feature this is. 3. Describe visual glitches. Return a concise technical summary." }
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
