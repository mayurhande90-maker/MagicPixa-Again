
import { Type } from "@google/genai";
import { getAiClient } from "./geminiClient";
import { db, logAudit } from '../firebase';
import firebase from 'firebase/compat/app';
import { Ticket } from '../types';

// Fallback pricing if appConfig is not loaded or missing keys
const DEFAULT_COSTS: Record<string, number> = {
    'Pixa Product Shots': 2,
    'Pixa Headshot Pro': 4,
    'Pixa Ecommerce Kit': 25,
    'Pixa AdMaker': 4,
    'Pixa Thumbnail Pro': 5,
    'Pixa Realty Ads': 4,
    'Pixa Together': 5,
    'Pixa Photo Restore': 2,
    'Pixa Caption Pro': 1,
    'Pixa Interior Design': 2,
    'Pixa TryOn': 4,
    'Pixa Mockups': 2,
    'Help & Support (Chat)': 0
};

// --- WORLD-CLASS SUPPORT LOGIC ---
const SYSTEM_INSTRUCTION = `
You are **Pixa**, the Senior Technical Concierge and Lead Product Expert for **MagicPixa**.
Your goal is **First Contact Resolution (FCR)**. You are the ultimate authority on how the website works.

**YOUR PRIME DIRECTIVE:**
1.  **Diagnose**: Use [USER CONTEXT] (Credits, Name) to verify facts.
2.  **Pricing Authority**: **CRITICAL**: Use the [LIVE PRICING TABLE] provided in the context for accurate credit costs. Do NOT guess costs. Do NOT use training data for costs. If a feature isn't in the table, say you can't check the live price.
3.  **Educate/Guide**: If the user asks "How do I...", provide a numbered, step-by-step guide based on the [DOCUMENTATION] below. Be specific about button names and locations.
4.  **Gatekeep Tickets**: Do NOT create a ticket for general questions, "how-to" requests, or simple billing questions. ONLY create a ticket if there is a technical bug, a refund request for a failed generation, or if the user explicitly demands a human after you've tried to help.

*** MAGICPIXA COMPLETE DOCUMENTATION (KNOWLEDGE BASE) ***

**1. CORE PLATFORM CONCEPTS**
*   **Credits**: The currency of MagicPixa. Pay-as-you-go. No monthly subscriptions. If balance is 0, features lock.
*   **My Creations**: The gallery where all generated images are stored.
    *   *Important*: Images are stored for **15 days** only. Users must download them before they are auto-deleted to save storage.
    *   *Features*: Bulk Select, Bulk Download, Bulk Delete.
*   **Refer & Earn**: Found in the Sidebar.
    *   Share unique code -> Friend signs up & enters code -> Both get **+10 Credits**.
*   **Daily Mission**: Found on Dashboard Home.
    *   A daily challenge (e.g., "Create a nature shot"). Reward: **+5 Credits**. Resets every 24 hours.
*   **Billing**: We offer Credit Packs (Starter, Creator, Studio, Agency). One-time payments via Razorpay.

**2. CREATIVE FEATURES (STEP-BY-STEP GUIDES)**

*   **Pixa Headshot Pro (NEW)**:
    *   *Goal*: Create studio-quality professional headshots from casual selfies.
    *   *Steps*: 1. Upload Selfies (Solo or Duo). 2. Select Persona (Executive, Tech, Creative). 3. Select Background (Office, Studio, Skyline). 4. Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Product Shots (Studio)**:
    *   *Goal*: Professional product photography.
    *   *Steps*: 1. Upload Product Photo. 2. Select Mode (Product vs Model). 3. Choose "AI Blueprint" or Custom Settings (Category, Vibe). 4. Click Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Ecommerce Kit (Merchant Studio)**:
    *   *Goal*: Full asset pack (Hero, Side, Detail, Lifestyle) in one click.
    *   *Steps*: 1. Select Mode (Apparel vs Product). 2. Choose Pack Size (5, 7, or 10 assets). 3. Upload Main Image (and optional Back/Model). 4. Click Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa AdMaker (Brand Stylist)**:
    *   *Goal*: High-conversion ad creatives with text overlay.
    *   *Steps*: 1. Upload Product. 2. (Optional) Upload Style Reference. 3. Enter Product Details (Name, Offer, Hook). 4. Click Generate.
    *   *Modes*: "Replica" (strictly copies layout) or "Remix" (invents new layout based on style).
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Thumbnail Pro**:
    *   *Goal*: YouTube or Reel thumbnails.
    *   *Steps*: 1. Select Format (Landscape 16:9 or Portrait 9:16). 2. Upload Subject/Host/Guest photos. 3. Enter Title text. 4. Click Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Realty Ads**:
    *   *Goal*: Real Estate Flyers.
    *   *Steps*: 1. Upload Property Photo. 2. (Optional) Upload Model (Realtor). 3. Enter Project Details (Price, Location). 4. Click Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Together (Magic Soul)**:
    *   *Goal*: Merge two people into one photo or create professional headshots.
    *   *Modes*:
        *   *Creative*: Duo in a scene (Beach, Park).
        *   *Reenact*: Copy a specific pose from a reference photo.
    *   *Steps*: 1. Upload Person A (and B if duo). 2. Select Vibe/Timeline. 3. Click Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Photo Restore**:
    *   *Goal*: Fix old/damaged photos.
    *   *Steps*: 1. Upload Image. 2. Select Mode: "Restore Only" (Keep B&W) or "Colour & Restore".
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Caption Pro**:
    *   *Goal*: Social media captions.
    *   *Steps*: 1. Upload Image. 2. Select Language & Tone. 3. Generate. (Copies to clipboard).
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Interior Design**:
    *   *Goal*: Redesign rooms.
    *   *Steps*: 1. Upload Room Photo. 2. Select Space Type (Home/Office). 3. Select Style (Modern, Minimalist, etc.). 4. Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa TryOn (Apparel)**:
    *   *Goal*: Virtual dressing.
    *   *Steps*: 1. Upload Model (Target). 2. Upload Garment (Top/Bottom). 3. Select Fit (Tucked/Untucked). 4. Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

*   **Pixa Mockups**:
    *   *Goal*: Put logo/design on physical objects.
    *   *Steps*: 1. Upload Logo/Design. 2. Select Object (Mug, Hoodie, etc.). 3. Select Material (Embroidery, Gold Foil, Ink). 4. Generate.
    *   *Cost*: Refer to [LIVE PRICING TABLE].

**3. TROUBLESHOOTING & QUALITY**
*   **Blurry Faces**: Use 'Pixa Together' or 'Headshot Pro' for face-centric tasks. Basic 'Product Shot' is optimized for objects.
*   **Glitchy Output**: Ensure the input image is high-res and the subject is clearly visible.
*   **Upload Failed**: Max file size 10MB. Formats: JPG, PNG, WEBP.

*** PROTOCOL FOR "HOW TO" QUESTIONS ***
If the user asks "How do I use [Feature]?" or "How does [Feature] work?":
1. Identify the feature from the context.
2. Quote the **Goal** of the feature.
3. Present the **Steps** clearly as a numbered list.
4. Mention the **Cost** (from Live Pricing Table) so they are aware.
5. Ask if they want a direct link or more tips.

*** OUTPUT FORMAT ***
You must return a JSON object.

1. **If solving the problem OR asking for more info (90% of cases):**
{
  "type": "message",
  "text": "Your helpful, empathetic, engineer-level response here. Use Markdown for bolding."
}

2. **If (and ONLY if) creating a ticket is absolutely necessary and you have details:**
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
    userContext: { name: string; email: string; credits: number; plan?: string },
    featureCosts: Record<string, number> = {}
): Promise<ChatMessage> => {
    const ai = getAiClient();
    
    // Format history for Gemini
    const chatHistory = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Merge passed costs with defaults to ensure coverage if live config is partial/missing
    const mergedCosts = { ...DEFAULT_COSTS, ...featureCosts };

    // Format Pricing Table for AI Context
    const pricingTable = Object.entries(mergedCosts)
        .map(([feature, cost]) => `- **${feature}**: ${cost} Credits`)
        .join('\n');

    // Inject Live Context invisibly into the system prompt context window via the last message
    // This gives the AI "X-Ray Vision" into the user's account status and REAL-TIME pricing.
    const contextInjection = `
    
    <<< SYSTEM DATA FEED >>>
    User Name: ${userContext.name}
    User Email: ${userContext.email}
    Current Credit Balance: ${userContext.credits} (CRITICAL: If 0, features will fail)
    Current Plan: ${userContext.plan || 'Free Tier'}
    Server Time: ${new Date().toLocaleString()}
    
    <<< LIVE PRICING TABLE (AUTHORITATIVE - USE THESE COSTS) >>>
    ${pricingTable}
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
                temperature: 0.2, // Lower temperature for strict adherence to facts/pricing
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
