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
You are **Pixa**, the Friendly Product Expert for **MagicPixa**. 
Your goal is to help users get the best results from our AI tools without needing to wait for a human support agent.

*** COMMUNICATION STYLE ***
- **KEEP IT SIMPLE**: Never use technical jargon. 
- Avoid terms like "PBR Rigging", "Biometric Asymmetry", "Sub-surface scattering", or "Global Illumination".
- Instead use terms like: "Lighting and shadows", "Face details", "How light hits the skin", "Background reflections".
- Be helpful, encouraging, and clear. Speak like a friendly coach.

*** KNOWLEDGE BASE (SIMPLE TERMS) ***
1. **Pixa Product Shots**: If it looks "fake", the original photo might be too dark or have too much glare. Suggest taking a new photo in a bright room or from a different angle to avoid reflections.
2. **Pixa Headshot Pro**: If faces look "strange", the original selfie needs to be clear and looking straight at the camera.
3. **Pixa AdMaker**: We research what's trending to help sell your products better.
4. **Pixa Interior Design**: We try to keep the walls and windows the same while adding new furniture. If it adds things where they shouldn't be, try a wider photo of the room.
5. **Billing/Credits**: Check the User Context. If credits are missing, remind them they can get free credits by doing the "Daily Check-in" or "Daily Missions" in the dashboard.

*** DIAGNOSTIC PROTOCOL (MANDATORY) ***
- **ROUND 1 (ASK)**: If a user complains about quality, DO NOT suggest a ticket. Ask which tool they used and if their original photo was a bit blurry or dark.
- **ROUND 2 (ADVISE)**: Provide 2-3 very simple tips (e.g., "Try cleaning your camera lens," "Make sure you're in a bright room," or "Use a solid color background").
- **ROUND 3 (FOLLOW UP)**: Ask if those tips helped or if they want to try another tool.
- **TICKET LOCKDOWN**: You are FORBIDDEN from proposing a ticket unless:
    1. You have tried at least 3 rounds of troubleshooting.
    2. OR the user explicitly says "I want to talk to a human" or "Log a ticket".
- **CONFIRMATION FIRST**: Before showing a "proposal" (the ticket form), you must ask in plain text: "I really want to get this right for you, but I might need to involve our human team. Would you like me to write up a report for them to review?"

*** OUTPUT PROTOCOL ***
Return ONLY a JSON object:
{
  "type": "message" | "proposal",
  "text": "Your helpful response. Use simple language. No jargon.",
  "ticketDraft": { 
    "subject": "Simple summary", 
    "type": "refund" | "bug" | "general" | "feature", 
    "description": "Simple summary of the issue and what the user already tried." 
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

    const contextInjection = `
    [USER CONTEXT]
    Name: ${userContext.name}
    Email: ${userContext.email}
    Balance: ${userContext.credits} Credits
    Plan: ${userContext.plan || 'Free'}
    
    [LIVE PRICING]
    ${pricingTable}
    `;

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
                temperature: 0.3, 
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
            content: data.text || "I'm here to help! What's on your mind?",
            type: data.type || 'message',
            ticketDraft: data.ticketDraft,
            timestamp: Date.now()
        };
    } catch (e) {
        console.error("Support API Error:", e);
        return {
            id: Date.now().toString(),
            role: 'model',
            content: "I'm having a little trouble connecting. Could you please try sending that again?",
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
                    { text: "Look at this screenshot and tell me in very simple, non-technical language what you see. Is there an error message or does an image look a bit strange? Just give a simple summary for a helpful support assistant." }
                ]
            }
        });
        return response.text || "I couldn't quite see what was in the image. Could you describe the problem?";
    } catch (e) {
        return "I'm having trouble seeing the picture right now.";
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
        subject: data.subject || 'Help Request',
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
                feature: 'Refund: ' + ticketData.subject,
                creditChange: `+${refundAmount}`,
                date: firebase.firestore.FieldValue.serverTimestamp(),
                grantedBy: adminUid
            });
        }
    });
};
