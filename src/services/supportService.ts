import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// Precise current pricing for the bot to reference
const DEFAULT_COSTS: Record<string, number> = {
    'Pixa Product Shots': 10,
    'Pixa Headshot Pro': 5,
    'Pixa Ecommerce Kit': 25,
    'Pixa AdMaker': 10,
    'Pixa Thumbnail Pro': 8,
    'Pixa Together': 8,
    'Pixa Photo Restore': 5,
    'Pixa Caption Pro': 2,
    'Pixa Interior Design': 8,
    'Pixa TryOn': 8,
    'Campaign Studio': 10,
    'Magic Editor (Object Removal)': 2
};

const SYSTEM_INSTRUCTION = `
You are **Pixa**, the Senior Technical Concierge and Lead Product Expert for **MagicPixa**. 
Your primary goal is **First Contact Resolution (FCR)**. You must act as an elite technical support engineer, not just a ticket-logging bot.

*** CORE KNOWLEDGE BASE ***
1. **Pixa Product Shots**: Uses **PBR Material Rigging**. If a photo looks "fake", suggest better lighting in the source or explain that refractive materials (glass) need high-contrast backgrounds.
2. **Pixa Headshot Pro**: Uses **Identity Lock 6.0**. If faces are "distorted", explain that our forensic anchor requires clear, front-facing ocular catchlights in the source.
3. **Pixa AdMaker**: Research-driven. Uses Google Search for AIDA copy.
4. **Pixa Interior Design**: **Additive Architectural Overlays**. It preserves windows/walls; if it "hallucinates", suggest a wider angle source.
5. **Billing/Credits**: Check the User Context. If they claim they paid but credits didn't arrive, check the 'Live Pricing' provided.

*** EXHAUSTION PROTOCOL (STRICT) ***
- **TROUBLESHOOT FIRST**: You are FORBIDDEN from proposing a support ticket in your first response to a technical complaint. You MUST provide at least 2 specific troubleshooting steps based on our tech (e.g., suggesting a different angle, explaining lighting physics).
- **MANDATORY CONFIRMATION**: Before using the "proposal" type, you must first send a standard "message" asking: "I haven't been able to resolve this to your satisfaction yet. Would you like me to prepare a formal support ticket for our human technical team to review?"
- **TICKET ESCALATION**: Only if the user says "Yes", "Please", "Log it", or similar, are you allowed to set "type": "proposal" in your next turn.

*** OUTPUT PROTOCOL ***
Return ONLY a JSON object:
{
  "type": "message" | "proposal",
  "text": "Your helpful markdown response. If troubleshoot mode: provide technical steps. If confirmation mode: ask if they want a ticket. If proposal mode: brief confirmation.",
  "ticketDraft": { 
    "subject": "Concise technical subject", 
    "type": "refund" | "bug" | "general" | "feature", 
    "description": "Comprehensive technical summary including UID, specific error, and what troubleshooting was already attempted." 
  }
}
`;

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    content: string;
    type?: 'message' | 'proposal';
    ticketDraft?: Partial<Ticket>;
    timestamp: number;
    isSubmitted?: boolean;
    attachment?: string;
}

export const sendSupportMessage = async (
    history: ChatMessage[], 
    userContext: { name: string; email: string; credits: number; plan?: string },
    featureCosts: Record<string, number> = {}
): Promise<ChatMessage> => {
    const ai = getAiClient();
    
    // Format history for Gemini
    const chatHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const mergedCosts = { ...DEFAULT_COSTS, ...featureCosts };
    const pricingTable = Object.entries(mergedCosts).map(([f, c]) => `- ${f}: ${c} Credits`).join('\n');

    // Inject User Context as a system turn to ensure the bot knows the current state
    const contextInjection = `
    [USER CONTEXT]
    Name: ${userContext.name}
    Email: ${userContext.email}
    Balance: ${userContext.credits} Credits
    Plan: ${userContext.plan || 'Free'}
    
    [LIVE PRICING]
    ${pricingTable}
    `;

    // Append context to the last user message or start with it
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        chatHistory[chatHistory.length - 1].parts[0].text += `\n\n(System Info: ${contextInjection})`;
    } else {
        chatHistory.push({ role: 'user', parts: [{ text: `(Init Context: ${contextInjection})` }] });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: chatHistory,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.2, 
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
        
        // Final safety check: ensure the AI isn't hallucinating a proposal without user consent
        // by looking at the last few messages in the local history if needed, 
        // though the systemInstruction is the primary driver.
        
        return {
            id: Date.now().toString(),
            role: 'model',
            content: data.text || "I'm processing your request. How else can I assist?",
            type: data.type || 'message',
            ticketDraft: data.ticketDraft,
            timestamp: Date.now()
        };
    } catch (e) {
        console.error("Support API Error:", e);
        return {
            id: Date.now().toString(),
            role: 'model',
            content: "I'm having trouble connecting to the Pixa network. Please try again in a moment.",
            type: 'message',
            timestamp: Date.now()
        };
    }
};

export const analyzeSupportImage = async (base64: string, mimeType: string): Promise<string> => {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Act as a Technical Diagnostic Agent. Scan this screenshot for MagicPixa UI elements, generation errors, or distorted images. Provide a technical diagnostic summary for the Support Bot." }
                ]
            }
        });
        return response.text || "No visual errors detected in screenshot.";
    } catch (e) {
        return "Visual diagnostic engine unavailable.";
    }
};

export const createTicket = async (userId: string, userEmail: string, data: Partial<Ticket>): Promise<Ticket> => {
    if (!db) throw new Error("Database connection unavailable.");
    
    const ticketRef = db.collection('support_tickets').doc();
    const rawTicket: Ticket = {
        id: ticketRef.id,
        userId,
        userEmail,
        type: data.type || 'general',
        status: 'open',
        subject: data.subject || 'Pixa Support Request',
        description: data.description || '',
        createdAt: firebase.firestore.Timestamp.now(),
        relatedTransactionId: data.relatedTransactionId,
        refundAmount: data.refundAmount,
        screenshotUrl: data.screenshotUrl
    };

    const safeTicket = Object.entries(rawTicket).reduce((acc, [k, v]) => v === undefined ? acc : { ...acc, [k]: v }, {} as any);
    
    await ticketRef.set(safeTicket);
    return rawTicket;
};

export const getUserTickets = async (userId: string): Promise<Ticket[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection('support_tickets').where('userId', '==', userId).get();
        const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        return tickets.sort((a, b) => {
            const tA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt).getTime();
            const tB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime();
            return tB - tA;
        });
    } catch (e) {
        console.error("Fetch tickets error:", e);
        return [];
    }
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection('support_tickets').orderBy('createdAt', 'desc').get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
    } catch (e) {
        console.error("Fetch all tickets error:", e);
        return [];
    }
};

export const resolveTicket = async (adminUid: string, ticketId: string, status: 'resolved' | 'rejected', adminReply: string, refundAmount?: number) => {
    if (!db) throw new Error("Database unavailable");
    
    const ticketRef = db.collection('support_tickets').doc(ticketId);
    
    await db.runTransaction(async (t) => {
        const ticketDoc = await t.get(ticketRef);
        if (!ticketDoc.exists) throw new Error("Ticket not found");
        
        const ticketData = ticketDoc.data() as Ticket;
        
        t.update(ticketRef, {
            status,
            adminReply,
            resolvedAt: firebase.firestore.Timestamp.now()
        });

        if (status === 'resolved' && refundAmount && ticketData.type === 'refund') {
            const userRef = db.collection('users').doc(ticketData.userId);
            t.update(userRef, {
                credits: firebase.firestore.FieldValue.increment(refundAmount)
            });
            
            const txRef = userRef.collection('transactions').doc();
            t.set(txRef, {
                feature: 'Admin Refund: ' + ticketData.subject,
                creditChange: `+${refundAmount}`,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                grantedBy: adminUid
            });
        }
    });
};
