import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// Fallback pricing if appConfig is not loaded or missing keys
const DEFAULT_COSTS: Record<string, number> = {
    'Pixa Product Shots': 10,
    'Pixa Headshot Pro': 5,
    'Pixa Ecommerce Kit': 25,
    'Pixa Ecommerce Kit (5 Assets)': 25,
    'Pixa Ecommerce Kit (7 Assets)': 35,
    'Pixa Ecommerce Kit (10 Assets)': 50,
    'Pixa AdMaker': 10,
    'Pixa Thumbnail Pro': 8,
    'Pixa Realty Ads': 10,
    'Pixa Together': 8,
    'Pixa Photo Restore': 5,
    'Pixa Caption Pro': 2,
    'Pixa Interior Design': 8,
    'Pixa TryOn': 8,
    'Pixa Mockups': 8,
    'Magic Eraser': 2,
    'Help & Support (Chat)': 0
};

// --- WORLD-CLASS SUPPORT LOGIC ---
const SYSTEM_INSTRUCTION = `
You are **Pixa**, the Senior Technical Concierge and Lead Product Expert for **MagicPixa**.
Your goal is **First Contact Resolution (FCR)**. You are the ultimate authority on how the website works.

**YOUR PRIME DIRECTIVE:**
1.  **Diagnose**: Use [USER CONTEXT] (Credits, Name) to verify facts.
2.  **Pricing Authority**: **CRITICAL**: Use the [LIVE PRICING TABLE] provided in the context for accurate credit costs. Do NOT guess costs. Do NOT use training data for costs.
3.  **Educate/Guide**: Provide specific numbered steps for feature usage.
4.  **Gatekeep Tickets**: Only create a ticket for bugs or refund requests after failed attempts to help.
5.  **Visual Context**: Use [IMAGE ANALYSIS] to understand user-uploaded screenshots.

*** MAGICPIXA COMPLETE DOCUMENTATION (KNOWLEDGE BASE) ***

**1. CORE PLATFORM CONCEPTS**
*   **Credits**: Pay-as-you-go currency. One-time payments via Credit Packs.
*   **My Creations**: Storage for 15 days only. Users must download to keep forever.
*   **Refer & Earn**: Both get +10 Credits when a code is used.
*   **Daily Mission**: Reset every 24h. Reward: +5 Credits.

**2. CREATIVE FEATURES**

*   **Pixa Headshot Pro**: Create professional headshots from selfies. (Solo/Duo).
*   **Pixa Product Shots**: Studio-quality photography for products. (Product/Model Modes).
*   **Pixa Ecommerce Kit**: Full asset packs (5, 7, 10 assets) in one click.
*   **Pixa AdMaker**: High-conversion ad creatives with intelligent copywriting.
*   **Pixa Thumbnail Pro**: Viral, high-CTR YouTube/Reel thumbnails.
*   **Pixa Realty Ads**: Real Estate flyers and property showcases.
*   **Pixa Together**: Merge people into one photo (Creative/Reenact modes).
*   **Pixa Photo Restore**: Repair damage and colorize vintage photos.
*   **Pixa Caption Pro**: Engagement-optimized copy and hashtags.
*   **Pixa Interior Design**: Photorealistic room transformations.
*   **Pixa TryOn**: Virtual clothes dressing from photos.
*   **Pixa Mockups**: Design placement on 3D physical objects.

*** OUTPUT FORMAT ***
You must return a JSON object:
{
  "type": "message" | "proposal",
  "text": "Your helpful markdown response",
  "ticketDraft": { "subject": "...", "type": "...", "description": "..." }
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
    const chatHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));
    const mergedCosts = { ...DEFAULT_COSTS, ...featureCosts };
    const pricingTable = Object.entries(mergedCosts).map(([f, c]) => `- **${f}**: ${c} Credits`).join('\n');
    const contextInjection = `
    <<< SYSTEM DATA FEED >>>
    User: ${userContext.name} (${userContext.email}) | Balance: ${userContext.credits} | Plan: ${userContext.plan || 'Free'}
    <<< LIVE PRICING TABLE >>>
    ${pricingTable}
    <<< END >>>`;
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
        chatHistory[chatHistory.length - 1].parts[0].text += contextInjection;
    } else {
        chatHistory.push({ role: 'user', parts: [{ text: `(Session Init) ${contextInjection}` }] });
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
        return { id: Date.now().toString(), role: 'model', content: data.text || "I'm looking into that for you.", type: data.type || 'message', ticketDraft: data.ticketDraft, timestamp: Date.now() };
    } catch (e) {
        return { id: Date.now().toString(), role: 'model', content: "Uplink unstable. Please retry.", type: 'message', timestamp: Date.now() };
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
                    { text: "Analyze this MagicPixa screenshot. Identify the UI context, visible errors, and user intent. Concise summary only." }
                ]
            }
        });
        return response.text || "Analysis unavailable.";
    } catch (e) { return "System analysis failed."; }
};

export const createTicket = async (userId: string, userEmail: string, data: Partial<Ticket>): Promise<Ticket> => {
    if (!db) throw new Error("DB not init");
    const ticketRef = db.collection('support_tickets').doc();
    const rawTicket: Ticket = { id: ticketRef.id, userId, userEmail, type: data.type || 'general', status: 'open', subject: data.subject || 'New Support Request', description: data.description || '', createdAt: firebase.firestore.Timestamp.now(), relatedTransactionId: data.relatedTransactionId, refundAmount: data.refundAmount, screenshotUrl: data.screenshotUrl };
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
    } catch (e) { return []; }
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    if (!db) return [];
    try {
        const snap = await db.collection('support_tickets').get();
        const tickets = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        return tickets.sort((a, b) => {
            const tA = (a.createdAt as any)?.toMillis ? (a.createdAt as any).toMillis() : new Date(a.createdAt).getTime();
            const tB = (b.createdAt as any)?.toMillis ? (b.createdAt as any).toMillis() : new Date(b.createdAt).getTime();
            return tB - tA;
        });
    } catch (e) { return []; }
};

export const resolveTicket = async (adminUid: string, ticketId: string, resolution: 'resolved' | 'rejected', reply: string, refundCredits?: number) => {
    if (!db) return;
    const ticketRef = db.collection('support_tickets').doc(ticketId);
    await db.runTransaction(async (t) => {
        const ticketDoc = await t.get(ticketRef);
        if (!ticketDoc.exists) throw new Error("Ticket not found");
        const ticketData = ticketDoc.data() as Ticket;
        t.update(ticketRef, { status: resolution, adminReply: reply, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        if (resolution === 'resolved' && refundCredits && refundCredits > 0) {
            const userRef = db.collection('users').doc(ticketData.userId);
            t.update(userRef, { credits: firebase.firestore.FieldValue.increment(refundCredits) });
            const txRef = userRef.collection('transactions').doc();
            t.set(txRef, { feature: 'Support Refund', creditChange: `+${refundCredits}`, reason: `Ticket #${ticketId}`, grantedBy: adminUid, date: firebase.firestore.FieldValue.serverTimestamp() });
        }
    });
    await logAudit(adminUid, `Resolve Ticket ${resolution}`, `ID: ${ticketId}, Refund: ${refundCredits || 0}`);
};