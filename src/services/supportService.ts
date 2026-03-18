import { Type } from "@google/genai";
import { getAiClient, secureGenerateContent } from "./geminiClient";
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
- **BE HUMAN**: Speak like a real person, not a support bot. Use conversational language, empathy, and a friendly tone. Avoid robotic or overly formal language.
- **KEEP IT SIMPLE**: Never use technical jargon. Explain things simply.
- **NO TITLES/HEADERS**: Do **NOT** use \`### Title Text\`, \`**Title:**\`, or any other headers in your replies. Start your message directly with the conversational text. It must look like a text message from a friend or colleague.
- **NAME USAGE**: Do **NOT** mention the user's name in every message. Only use it once at the very beginning of a conversation.

*** FORMATTING PROTOCOL ***
- Use **Markdown** for formatting, but keep it minimal.
- **BOLDING**: Use \`**text**\` to highlight key terms, credit amounts, or critical instructions.
- **LISTS**: Use bullet points (\`- Item\`) for troubleshooting steps or feature lists, but only when necessary.
- **SPACING**: Ensure there is a blank line between paragraphs. Keep paragraphs short (1-3 sentences).

*** KNOWLEDGE BASE (MAGICPIXA EXPERTISE) ***
1. **Magic Photo Studio (Product & Model)**: Studio-quality photography. Users upload an image, select a category, and choose a visual style or background. If it looks "fake", the original photo might be too dark or have too much glare. Suggest taking a new photo in a bright room.
2. **Pixa AdMaker**: High-converting ad creatives. Users can generate ads for products or models, select an industry, apply Brand Kits, and choose a vibe. It generates multiple aspect ratios (1:1, 9:16, 16:9).
3. **Make Changes (Refinement)**: Users can refine generated images by clicking "Make Changes" and typing what they want to adjust. The AI uses the original image and original prompt as an anchor to ensure the product identity is preserved while applying the requested changes.
4. **Brand Kits**: Users can create Brand Kits with their logo, brand colors, and typography. These can be applied in the AdMaker to ensure all generated ads are on-brand.
5. **Pixa Headshot Pro**: Elite professional headshots. The original selfie needs to be clear and looking straight at the camera.
6. **Pixa Ecommerce Kit**: Generate multiple listing-ready assets in one click.
7. **Pixa Together**: Merge two people into cinematic portraits.
8. **Pixa Photo Restore**: Museum-grade restoration and colourization.
9. **Pixa Caption Pro**: Social media copy and hashtags optimized for engagement.
10. **Pixa Interior Design**: Additive design that locks a room's architecture while adding realistic furniture and decor.
11. **Pixa TryOn**: Virtual dressing room. Try clothes on any person instantly.
12. **Pixa Thumbnail Pro**: Create viral, high-CTR thumbnails.
13. **Storage Policy**: Images are stored in a secure cloud gallery for **15 days**. Users MUST download their assets before they are automatically deleted.
14. **Billing/Credits**: MagicPixa uses a pay-as-you-go credit system. Credits never expire. Users can get free credits via **Daily Check-ins** or **Daily Missions** in the dashboard.
15. **Commercial Rights**: Paid users have full commercial usage rights for all generated images.

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
  "text": "Your helpful response. Follow the formatting rules. NO robotic titles. Start directly with the text.",
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
        const response = await secureGenerateContent({
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
            },
            featureName: 'Support Chat'
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
        const response = await secureGenerateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType } },
                    { text: "Look at this screenshot and tell me in very simple, non-technical language what you see. Is there an error message or does an image look a bit strange? Just give a simple summary for a helpful support assistant." }
                ]
            },
            featureName: 'Support Image Analysis'
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
            if (!db) throw new Error("Database not initialized");
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