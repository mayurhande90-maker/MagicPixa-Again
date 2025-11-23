
import { Modality, LiveServerMessage, Type, FunctionDeclaration } from "@google/genai";
import { getAiClient } from "./geminiClient";

const SUPPORT_SYSTEM_INSTRUCTION = `You are Pixa, a friendly and expert support agent for the MagicPixa application. Your goal is to help users understand and use the app's features effectively.

**RESPONSE FORMATTING:**
- Use Markdown for all responses.
- Use headings (like '### Title'), bullet points (using '-'), and bold text ('**text**') to make your answers clear, structured, and easy to read.
- For step-by-step instructions, use bulleted lists.

**YOUR KNOWLEDGE:**
You are an expert on Photo Studio, Interior AI, Apparel Try-On, account management, credits, and billing. You should answer questions about these topics directly and conversationally.

**CONVERSATION FLOW:**
1.  **General Questions:** For any user query that is a question (e.g., "How do credits work?", "What is photo studio?"), provide a direct, helpful answer based on your knowledge. DO NOT start the issue reporting flow.
2.  **Issue Reporting:** Only when the user explicitly states they want to "report an issue" or "file a ticket" (for example, their message is exactly "I want to report an issue."), you MUST initiate the **ISSUE REPORTING FLOW** below.

**ISSUE REPORTING FLOW:**
This is a strict, multi-step process that you only begin when explicitly asked to report an issue.
1.  Your first response MUST be to ask them to categorize the issue.
2.  This categorization response MUST ONLY contain the question "I can help with that. What kind of issue are you facing?" followed by a list of clickable buttons.
3.  You MUST format the buttons like this, each on a new line: '[button:Billing]', '[button:Technical Bug]', '[button:Feature Request]', '[button:General Inquiry]'.
4.  After the user selects a category (their next message will be the category name), your next response MUST be to ask them for a detailed description of the problem.
5.  Only after you have received both the 'issueType' (from the button selection) and the 'description' (from their text input), you MUST call the 'createSupportTicket' function.

Do not deviate from this flow. For all other conversations, be a helpful, conversational assistant.`;

const createSupportTicket: FunctionDeclaration = {
    name: 'createSupportTicket',
    parameters: {
        type: Type.OBJECT,
        description: 'Creates a new support ticket for a user issue.',
        properties: {
            issueType: {
                type: Type.STRING,
                description: 'The category of the issue. e.g., "Billing", "Technical Bug", "Feature Request", "General Inquiry".',
            },
            description: {
                type: Type.STRING,
                description: 'A detailed description of the issue the user is facing.',
            },
        },
        required: ['issueType', 'description'],
    },
};

export const startLiveSession = (callbacks: {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => Promise<void>;
    onerror: (e: ErrorEvent) => void;
    onclose: (e: CloseEvent) => void;
}) => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: [createSupportTicket] }],
        },
    });
};

export const generateSupportResponse = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string
): Promise<string> => {
    const ai = getAiClient();
    try {
        const chat = ai.chats.create({
            model: 'gemini-3-pro-preview', // Upgraded for smarter context handling
            config: {
                systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: [createSupportTicket] }],
            },
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            }))
        });

        let response = await chat.sendMessage({ message: newMessage });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const fc = response.functionCalls[0];
            if (fc.name === 'createSupportTicket') {
                const ticketId = `MP-${Math.floor(10000 + Math.random() * 90000)}`;
                response = await chat.sendMessage({
                    message: [{
                        functionResponse: {
                            name: fc.name,
                            response: { ticketId: ticketId, status: 'created' }
                        }
                    }]
                });
            }
        }
        
        return response.text || "I'm sorry, I couldn't generate a response.";

    } catch (error) {
        console.error("Error generating support response:", error);
        throw new Error("An unknown error occurred while getting support response.");
    }
};
