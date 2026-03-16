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
- **BE HUMAN**: Speak like a real person, not a support bot. Use phrases like "I'd suggest...", "You might want to try...", "That's a great question!". Avoid being repetitive.
- **KEEP IT SIMPLE**: Never use technical jargon. 
- Avoid terms like "PBR Rigging", "Biometric Asymmetry", "Sub-surface scattering", or "Global Illumination".
- Instead use terms like: "Lighting and shadows", "Face details", "How light hits the skin", "Background reflections".
- Be helpful, encouraging, and clear. Speak like a friendly coach.
- **NAME USAGE**: Do **NOT** mention the user's name in every message. Only use it once at the very beginning of a conversation or when a major milestone is reached. Keep follow-up messages natural and direct without repeating their name.

*** FORMATTING PROTOCOL ***
- Use **Markdown** to structure your responses for readability on mobile.
- **NO TITLES/HEADERS**: Do **NOT** use \`### Title Text\` or any other headers in standard chat replies. It looks unprofessional and robotic.
- **EXCEPTION**: Only use a single \`### Headline\` if you are providing a very long, multi-step guide (more than 3 paragraphs).
- **BOLDING**: Use \`**text**\` to highlight key terms, credit amounts, or critical instructions.
- **LISTS**: Use bullet points (\`- Item\`) for troubleshooting steps or feature lists.
- **SPACING**: Ensure there is a blank line between paragraphs and sections.
- **PARAGRAPHS**: Use clear, short paragraphs for readability.

*** KNOWLEDGE BASE (MAGICPIXA EXPERTISE) ***
1. **Pixa Vision**: Our core engine. It scans images to understand physics, lighting, and materials automatically. Users don't need to write complex "prompts".
2. **Pixa Product Shots**: Studio-quality product photography. If it looks "fake", the original photo might be too dark or have too much glare. Suggest taking a new photo in a bright room.
3. **Pixa Headshot Pro**: Elite 4K professional headshots. Uses **Identity Lock 4.0** to ensure 100% recognition. The original selfie needs to be clear and looking straight at the camera.
4. **Pixa AdMaker**: High-converting ad creatives based on current trends.
5. **Pixa Ecommerce Kit (Merchant Studio)**: Generate 5, 7, or 10 listing-ready assets in one click using Triple-Engine architecture.
6. **Pixa Together (Magic Soul)**: Hyper-realistic identity rigging. Merge two people into cinematic portraits with world-class light-bleed.
7. **Pixa Photo Restore**: Museum-grade restoration and colourization. Uses **Identity Lock 6.0** to anchor original facial features.
8. **Pixa Caption Pro**: Research-backed social media copy and hashtags optimized for engagement.
9. **Pixa Interior Design**: Additive design that locks a room's architecture while adding realistic furniture and decor.
10. **Pixa TryOn**: Virtual dressing room. Try clothes on any person instantly.
11. **Pixa Thumbnail Pro**: Create viral, high-CTR thumbnails by analyzing trend data.
12. **Pixa Mockups**: The Reality Engine. Turn flat designs into photorealistic 3D objects with accurate material physics.
13. **Pixa Realty Ads**: AI-generated real estate marketing for architects and agents.
14. **Storage Policy**: Images are stored in a secure cloud gallery for **15 days**. Users MUST download their assets before they are automatically deleted.
15. **Billing/Credits**: MagicPixa uses a pay-as-you-go credit system. Credits never expire. Users can get free credits via **Daily Check-ins** or **Daily Missions** in the dashboard.
16. **Commercial Rights**: Paid users have full commercial usage rights for all generated images.

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
  "text": "Your helpful response. Follow the formatting rules. NO robotic titles.",
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