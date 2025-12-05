
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, Ticket, Transaction } from '../types';
import { sendSupportMessage, createTicket, getUserTickets, ChatMessage, analyzeErrorScreenshot } from '../services/supportService';
import { fileToBase64 } from '../utils/imageUtils';
import { saveSupportMessage, getSupportHistory, cleanupSupportHistory } from '../firebase';
import { 
    LifebuoyIcon, 
    SparklesIcon, 
    CheckIcon, 
    XIcon, 
    TicketIcon, 
    UploadIcon,
    ArrowRightIcon,
    ArrowUpCircleIcon,
    CreditCoinIcon,
    ShieldCheckIcon,
    ChatBubbleLeftIcon,
    UserIcon,
    DownloadIcon,
    CreditCardIcon,
    LightbulbIcon,
    FlagIcon
} from '../components/icons';

// --- HELPERS ---

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

// --- COMPONENTS ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles = {
        open: 'bg-amber-50 text-amber-700 border-amber-100',
        resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        rejected: 'bg-red-50 text-red-700 border-red-100'
    };
    const s = styles[status as keyof typeof styles] || styles.open;

    return (
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${s} inline-flex items-center gap-1`}>
            <span className={`w-1 h-1 rounded-full ${status === 'open' ? 'bg-amber-500 animate-pulse' : status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {status}
        </span>
    );
};

const TicketHistoryItem: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const date = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now';
    return (
        <div className="group p-3 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-300 mb-2 cursor-default">
            <div className="flex justify-between items-start mb-1">
                <StatusBadge status={ticket.status} />
                <span className="text-[10px] font-medium text-gray-400">{date}</span>
            </div>
            <h4 className="font-bold text-gray-800 text-xs mb-1 truncate">{ticket.subject}</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-1">{ticket.description}</p>
            {ticket.adminReply && (
                <div className="mt-2 pt-2 border-t border-gray-50 flex gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                        <SparklesIcon className="w-2 h-2 text-white" />
                    </div>
                    <p className="text-[10px] text-gray-700 font-medium line-clamp-1">{ticket.adminReply}</p>
                </div>
            )}
        </div>
    );
};

const TicketProposalCard: React.FC<{ 
    draft: Partial<Ticket>; 
    onConfirm: () => void; 
    onCancel: () => void;
    isSubmitting: boolean;
}> = ({ draft, onConfirm, onCancel, isSubmitting }) => (
    <div className="mt-3 bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm animate-fadeIn">
        <div className="flex items-center gap-2 mb-3 text-indigo-700">
            <TicketIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">Ticket Suggestion</span>
        </div>
        <div className="mb-4">
            <p className="text-xs font-bold text-gray-900 mb-1">{draft.subject}</p>
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg italic border border-gray-100">
                "{draft.description}"
            </p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit Ticket"}
            </button>
            <button 
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
            >
                Cancel
            </button>
        </div>
    </div>
);

// Rich Text Renderer for Chat
const FormattedMessage: React.FC<{ text: string }> = ({ text }) => {
    const parseBold = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="space-y-1.5">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>;
                
                // Headers
                if (trimmed.startsWith('###')) {
                    return <h3 key={i} className="font-bold text-sm mt-3 mb-1 text-indigo-900">{parseBold(trimmed.replace(/^###\s*/, ''))}</h3>;
                }
                // Bullet Points
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                     return (
                        <div key={i} className="flex gap-2 ml-1 items-start">
                            <span className="text-indigo-400 font-bold mt-1">•</span>
                            <span className="flex-1 text-gray-700">{parseBold(trimmed.replace(/^[-*]\s*/, ''))}</span>
                        </div>
                     );
                }
                // Regular Paragraph
                return <p key={i} className="text-gray-700 leading-relaxed">{parseBold(line)}</p>;
            })}
        </div>
    );
};

// Icons for Chat
const PixaBotIcon = () => (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-sm overflow-hidden">
        <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 translate-y-[1px]" style={{ fontFamily: "'Parkinsans', sans-serif" }}>P</span>
    </div>
);

const UserMessageIcon = ({ user }: { user: any }) => (
    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 border border-gray-300 text-gray-600 font-bold text-xs shadow-inner">
        {user?.avatar || 'U'}
    </div>
);

// Quick Action Pills
const QuickActions: React.FC<{ onAction: (text: string) => void }> = ({ onAction }) => {
    const actions = [
        { label: "Billing & Credits", icon: CreditCardIcon, prompt: "I have a question about billing or credits." },
        { label: "How to Use?", icon: LightbulbIcon, prompt: "How do I use the Magic Photo Studio features?" },
        { label: "Report Bug", icon: FlagIcon, prompt: "I found a bug I'd like to report." },
        { label: "Feature Request", icon: SparklesIcon, prompt: "I have a feature request." }
    ];

    return (
        <div className="flex flex-wrap gap-2 mt-4 animate-fadeIn">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => onAction(action.prompt)}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"
                >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                </button>
            ))}
        </div>
    );
};

export const SupportCenter: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [showQuickActions, setShowQuickActions] = useState(false);
    
    // Sidebar Data
    const [tickets, setTickets] = useState<Ticket[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (auth.user) {
            loadTickets();
            loadChatHistory();
        }
    }, [auth.user]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, olderMessages, showQuickActions]);

    const loadChatHistory = async () => {
        if (!auth.user) return;
        setLoadingHistory(true);
        try {
            await cleanupSupportHistory(auth.user.uid);
            const rawHistory = await getSupportHistory(auth.user.uid);
            const allMessages = rawHistory as ChatMessage[];

            // Determine if we need to show the Welcome Message
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            // Only keep last 24h for active view
            const recent = allMessages.filter(m => (now - m.timestamp) < oneDay);
            const older = allMessages.filter(m => (now - m.timestamp) >= oneDay);

            if (recent.length === 0) {
                // Initial Welcome if fresh session (no recent messages)
                const greeting = getGreeting();
                const welcomeMsg: ChatMessage = {
                    id: 'welcome_' + Date.now(),
                    role: 'model',
                    content: `${greeting}, ${auth.user.name.split(' ')[0]}! I'm Pixa Support.\n\nI can help you with features, billing, or technical issues. How can I assist you today?`,
                    timestamp: Date.now()
                };
                setMessages([welcomeMsg]);
                setShowQuickActions(true);
                // We don't save ephemeral welcome messages to DB to avoid spamming history, 
                // or we save it only if user interacts. Let's save it for consistency.
                saveSupportMessage(auth.user.uid, welcomeMsg);
            } else {
                setMessages(recent);
                // Show quick actions only if the last message was a while ago or it's just the welcome msg
                if (recent.length <= 1) setShowQuickActions(true);
            }
            
            setOlderMessages(older);

        } catch (e) {
            console.error("Failed to load chat history", e);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadTickets = async () => {
        if (!auth.user) return;
        const data = await getUserTickets(auth.user.uid);
        setTickets(data);
    };

    const handleLoadOlder = () => {
        setMessages(prev => [...olderMessages, ...prev]);
        setOlderMessages([]);
    };

    const handleSendMessage = async (text: string = inputText) => {
        if (!text.trim() || !auth.user) return;

        setShowQuickActions(false); // Hide pills once interaction starts

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        // Optimistic Update
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);
        
        // Persist User Message
        saveSupportMessage(auth.user.uid, userMsg);

        try {
            // Call Smart Agent
            const response = await sendSupportMessage(
                [...messages, userMsg], 
                { name: auth.user.name, email: auth.user.email, credits: auth.user.credits }
            );
            setMessages(prev => [...prev, response]);
            
            // Persist Bot Message
            saveSupportMessage(auth.user.uid, response);

        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCreateTicket = async (draft: Partial<Ticket>) => {
        if (!auth.user) return;
        setIsSubmittingTicket(true);
        try {
            await createTicket(auth.user.uid, auth.user.email, draft);
            
            const confirmationMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "Ticket created successfully! I've added it to your history sidebar.",
                timestamp: Date.now()
            };

            // Add confirmation message
            setMessages(prev => [...prev, confirmationMsg]);
            saveSupportMessage(auth.user.uid, confirmationMsg);
            
            loadTickets();
        } catch (e: any) {
            alert("Failed to create ticket: " + e.message);
        } finally {
            setIsSubmittingTicket(false);
        }
    };

    const handleCancelTicket = (msgId: string) => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            
            const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: "[Uploaded Screenshot]",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);
            saveSupportMessage(auth.user!.uid, userMsg);
            
            setIsTyping(true);

            // Analyze error first
            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
            // Send analysis as context
            const response = await sendSupportMessage(
                [...messages, userMsg, { role: 'user', content: `I uploaded an error screenshot. Analysis: ${analysis}`, id: 'sys', timestamp: Date.now() }],
                { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits }
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user!.uid, response);
            
            setIsTyping(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
            
            {/* Header */}
            <div className="bg-white border-b border-gray-200 py-6 px-8 sticky top-0 z-20">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <LifebuoyIcon className="w-8 h-8 text-indigo-600" />
                            Support Center
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">AI-Powered Assistance & Ticket Management</p>
                    </div>
                    {/* Activity Indicator / Credits */}
                    <div className="hidden sm:flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                        <CreditCoinIcon className="w-4 h-4 text-yellow-500" />
                        <span className="text-xs font-bold text-gray-700">{auth.user?.credits} Credits Available</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
                
                {/* LEFT: CHAT INTERFACE */}
                <div className="lg:col-span-2 flex flex-col h-[50vh] min-h-[500px] bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative">
                    
                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#ffffff]">
                        
                        {/* Load Previous Chat Button */}
                        {olderMessages.length > 0 && (
                            <div className="flex justify-center mb-4">
                                <button 
                                    onClick={handleLoadOlder}
                                    className="bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 text-xs font-bold px-4 py-1.5 rounded-full transition-colors border border-gray-200"
                                >
                                    Load History ({olderMessages.length} older messages)
                                </button>
                            </div>
                        )}

                        {loadingHistory && (
                            <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex items-start gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    
                                    {/* Avatar */}
                                    {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}

                                    {/* Bubble */}
                                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            msg.role === 'user' 
                                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                                            : 'bg-gray-50 text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}>
                                            {msg.role === 'user' ? msg.content : <FormattedMessage text={msg.content} />}
                                        </div>

                                        {/* Ticket Proposal Card */}
                                        {msg.type === 'proposal' && msg.ticketDraft && (
                                            <TicketProposalCard 
                                                draft={msg.ticketDraft} 
                                                onConfirm={() => handleCreateTicket(msg.ticketDraft!)}
                                                onCancel={() => handleCancelTicket(msg.id)}
                                                isSubmitting={isSubmittingTicket}
                                            />
                                        )}
                                        
                                        <span className="text-[10px] text-gray-400 mt-1 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="flex items-center gap-3">
                                <PixaBotIcon />
                                <div className="bg-gray-50 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showQuickActions && (
                            <div className="pl-11">
                                <QuickActions onAction={handleSendMessage} />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100 flex items-center gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Upload Screenshot"
                        >
                            <UploadIcon className="w-5 h-5" />
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder-gray-400 text-gray-800"
                                placeholder="Ask about features or describe an issue..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                        </div>
                        
                        <button 
                            onClick={() => handleSendMessage()}
                            disabled={!inputText.trim() || isTyping}
                            className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95"
                        >
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* RIGHT: TICKET HISTORY (1 col) */}
                <div className="hidden lg:flex flex-col h-[50vh] min-h-[500px]">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <TicketIcon className="w-4 h-4 text-gray-500"/>
                                Your Tickets
                            </h3>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {tickets.length > 0 ? (
                                tickets.map(ticket => (
                                    <TicketHistoryItem key={ticket.id} ticket={ticket} />
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <TicketIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <p className="text-xs font-bold text-gray-400">No active tickets</p>
                                    <p className="text-[10px] text-gray-300 mt-1">Issues you can't solve via chat will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
