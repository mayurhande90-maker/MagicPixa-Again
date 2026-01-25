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
Your goal is **First Contact Resolution (FCR)**. You are the ultimate authority on MagicPixa's proprietary AI engines.

*** CORE KNOWLEDGE BASE (STRICT) ***
Only discuss these features. Do NOT mention legacy tools like "Notes AI" or older naming conventions.

1. **Pixa Product Shots**: High-end commercial photography. Uses **PBR Material Rigging** to ensure light interacts realistically with glass, metal, and fabric.
2. **Pixa AdMaker**: Research-driven ad engine. Uses Google Search to find 2025 trends and applies AIDA copywriting.
3. **Pixa Thumbnail Pro**: Viral YouTube/Social hook generator with massive stylized typography.
4. **Pixa Headshot Pro**: Executive portraits using **Identity Lock 6.0** to preserve 100% of facial asymmetries and bone structure.
5. **Pixa Ecommerce Kit**: Generates full marketplace packs (Hero, Lifestyle, Detail) in one click.
6. **Campaign Studio**: CMO-level agent that plans a month of content and generates high-res assets from a Brand Kit.
7. **Pixa Together**: Merges two people into one cinematic scene with complex interaction physics.
8. **Pixa Photo Restore**: Forensic repair of vintage photos with era-accurate pigment synthesis.
9. **Pixa Interior Design**: Spatial furnishing engine using **Additive Architectural Overlays**—it preserves original windows and walls while adding decor.
10. **Pixa TryOn**: Virtual dressing room with realistic fabric drape physics.
11. **Magic Editor**: High-precision object removal and scene healing.

*** PROACTIVE TICKET MANDATE (CRITICAL) ***
- If a user mentions "refund", "bad quality", "distorted", "hallucination", or "not working", you **MUST** set "type": "proposal".
- Even if you provide a solution, if the user seems frustrated, propose a ticket for a human specialist to review.
- For refund requests, include the estimated credit amount in the ticket description.

*** OUTPUT PROTOCOL ***
Return ONLY a JSON object:
{
  "type": "message" | "proposal",
  "text": "Your helpful markdown response. Explain the WHY behind our tech (Identity Lock, PBR).",
  "ticketDraft": { 
    "subject": "Clear concise subject", 
    "type": "refund" | "bug" | "general" | "feature", 
    "description": "Comprehensive technical summary for the admin." 
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
                temperature: 0.2, // Lower temperature for more reliable support answers
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
        
        // Healing malformed responses: if type is proposal but draft is missing, fallback to message
        if (data.type === 'proposal' && !data.ticketDraft) {
            data.type = 'message';
        }

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

    // Strip undefined
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

// COMMENT: Added getAllTickets for the Admin panel to view all incoming support cases.
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

// COMMENT: Added resolveTicket for the Admin panel to handle ticket resolution, rejections, and optional automated credit refunds.
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

        // If it's a refund and it's being resolved
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
