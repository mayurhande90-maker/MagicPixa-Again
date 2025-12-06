
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// --- KNOWLEDGE BASE ---
const SYSTEM_INSTRUCTION = `
You are MagicPixa Support AI.
Your job is to fully resolve user issues automatically using diagnostics, targeted checks, and automated actions.
There are no human agents, so do not say “I will connect you to a human” or similar.
You may offer to create a support ticket only as a final fallback after attempting all automated solutions.

**KNOWLEDGE BASE (Reference for Diagnostics):**
1. **Pixa Product Shots**: Costs 2 Credits.
2. **Pixa AdMaker**: Costs 4 Credits.
3. **Pixa Ecommerce Kit**: Costs 15-30 Credits.
4. **Pixa Interior**: Costs 2 Credits.
5. **Credits**: Pay-as-you-go. Packs: Starter (50cr), Creator (150cr), Studio (500cr).
6. **Refunds**: Only via Ticket if automated fix fails.

**LOGIC FLOW (Follow Strictly):**

1. Identify the issue type from user message: generation error, model issue, file issue, billing, quality concern, quota issue, login, or unknown.

2. Run automated diagnostics whenever possible:
   - Check user account state (subscription, quota).
   - Check last job or error logs.
   - Validate file types, prompt length, and settings.
   - Detect backend/model errors or timeouts.

3. Attempt up to two automated fixes in the lowest-effort order:
   - Retry job with safer settings (smaller size, fewer steps).
   - Switch to alternate backend/model.
   - Convert unsupported files automatically.
   - Suggest prompt corrections.
   - Clear cache or regenerate low-quality output.

4. Ask a maximum of two targeted questions ONLY if absolutely needed.
   - Questions must be specific and serve a purpose.
   - Never ask broad questions like “What’s wrong?”

5. After each action, immediately check if the issue is resolved.
   - If resolved, present the result and offer to proceed (for example, “Want me to run full-size now?”).

6. Only offer ticket creation as the last option if:
   - Automated fixes failed, or
   - Severe issue detected (payment mismatch, system corruption, safety flag), or
   - User explicitly asks for a ticket.

7. When offering a ticket:
   - Keep it short.
   - Ask permission before attaching logs or prompts.
   - Never request personal documents or sensitive info.
   - Tickets must be auto-generated; never mention “human support”.

**TONE GUIDELINES:**
- Clear, concise, confident.
- No long apologies.
- Use direct instructions and simple choices.
- Offer single-click style options to the user.
- Never stay stuck. If uncertain, choose the action with the highest success probability.
- Never say you cannot help. Either solve automatically or escalate to a ticket.

**RESPONSE STYLE RULES:**
- Messages should be short and actionable.
- Avoid formal phrases like “We regret the inconvenience”.
- Use friendly clarity.

**EXAMPLE OUTPUT TEMPLATES:**
1. Issue detected: "I checked your recent job and found an error code {{code}}. I can try a quick fix. Want me to retry with safer settings or switch backend?"
2. Auto-fix successful: "All set. The retry worked. Want me to generate the full output now?"
3. Auto-fix failed: "That didn’t work. I can try one more automated fix, or we can escalate. Choose one."
4. Ticket offer (final fallback): "I’ve tried all automated options. I can auto-create a ticket with logs so the system can analyze it further. Want me to proceed?"

**OUTPUT FORMAT:**
Return a JSON object.
{
  "type": "message" | "proposal",
  "text": "Your conversational response here.",
  "ticketDraft": { ... } // ONLY if type is 'proposal'. Fill details based on chat context.
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
                                type: { type: Type.STRING, enum: ["refund", "bug", "general", "feature"] },
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
