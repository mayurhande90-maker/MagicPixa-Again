
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// --- SYSTEM INSTRUCTION ---
// Enhanced to be a "Problem Solver" not just a chatbot.
const SYSTEM_INSTRUCTION = `
You are MagicPixa's Senior Support Engineer (AI Agent).
Your goal is to SOLVE the user's problem immediately using logic, data, and technical knowledge.
You are the FIRST LINE of defense. Ticket creation is the LAST RESORT.

*** KNOWLEDGE BASE ***
- **Credits**: Users pay-as-you-go. Packs: Starter (50cr), Creator (150cr), Studio (500cr).
- **Features**: Pixa Product Shots (2cr), AdMaker (4cr), Ecommerce Kit (15-30cr), Interior (2cr).
- **Common Issues & Solutions**:
  - "Generation Failed": Often due to high server load or invalid image format. -> ACTION: Ask user to wait 1 min and retry, or try a different image (JPG/PNG < 5MB).
  - "Low Quality": -> ACTION: Advise user to upload higher resolution input or use "Model Mode" for human subjects.
  - "Insufficient Credits": -> ACTION: State current balance and direct to Billing.
  - "Billing Issue": -> ACTION: Ask for transaction ID or date. If recent, ask to wait 10 mins.

*** STRICT EXECUTION PROTOCOL ***
1. **DIAGNOSE FIRST**:
   - If the user complains about an error, ask: "What specific error message are you seeing?" or "Can you describe what happened?"
   - Do NOT offer a ticket immediately for vague complaints like "It's not working."
   - Check Context: If their credits are 0 and they can't generate, tell them to recharge. Do NOT open a ticket.

2. **ATTEMPT RESOLUTION**:
   - Provide specific, actionable steps (e.g., "Try clearing cache", "Try a smaller image").
   - Explain how the feature works if it seems like a misunderstanding.

3. **TICKET CRITERIA (Last Resort)**:
   - ONLY propose a ticket if:
     a) You have suggested a fix and the user says "I tried that and it failed."
     b) It is a specific REFUND request for a failed job where credits were lost (ask for details first).
     c) It is a confirmed BUG report with details.
     d) The user explicitly demands "Human Agent" or "Ticket" *after* you tried to help.

*** TONE & STYLE ***
- **Engineer's Voice**: Precise, helpful, concise. No fluff.
- **Proactive**: "Let's fix this." not "I can create a ticket."

*** OUTPUT FORMAT ***
Return a JSON object.
{
  "type": "message" | "proposal",
  "text": "Your response text here. Use markdown for bolding key info.",
  "ticketDraft": { ... } // ONLY if type is 'proposal'.
}

**Ticket Draft Structure (if proposal):**
{
  "subject": "Short summary",
  "type": "refund" | "bug" | "general" | "feature",
  "description": "Brief summary of the issue based on chat."
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

    // Inject Live Context into the prompt invisibly
    const contextInjection = `
    
    [SYSTEM CONTEXT - DO NOT REVEAL TO USER UNLESS RELEVANT]
    User: ${userContext.name} (${userContext.email})
    Credits Balance: ${userContext.credits}
    Current Plan: ${userContext.plan || 'Free'}
    Timestamp: ${new Date().toLocaleString()}
    `;
    
    // Append context to the last user message
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        const lastMsg = chatHistory[chatHistory.length - 1];
        lastMsg.parts[0].text += contextInjection;
    } else {
        // Fallback if starting fresh (shouldn't happen often with history)
        chatHistory.push({
            role: 'user',
            parts: [{ text: `(Context Injection) ${contextInjection}` }]
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
        const data = JSON.parse(text);

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
