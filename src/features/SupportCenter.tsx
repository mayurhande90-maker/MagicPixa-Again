
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, Ticket } from '../types';
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
    CreditCoinIcon,
    LightbulbIcon,
    FlagIcon,
    CreditCardIcon,
    PaperAirplaneIcon,
    UserIcon
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
        open: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100',
        resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100',
        rejected: 'bg-red-50 text-red-700 border-red-200 ring-red-100'
    };
    const indicatorColor = {
        open: 'bg-amber-500',
        resolved: 'bg-emerald-500',
        rejected: 'bg-red-500'
    };
    const s = styles[status as keyof typeof styles] || styles.open;
    const c = indicatorColor[status as keyof typeof indicatorColor] || 'bg-gray-400';

    return (
        <span className={`pl-2 pr-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ring-2 ring-offset-1 ring-offset-white ${s} inline-flex items-center gap-1.5 shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c} ${status === 'open' ? 'animate-pulse' : ''}`}></span>
            {status}
        </span>
    );
};

const TicketHistoryItem: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const date = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now';
    return (
        <div className="group relative p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:bg-white transition-all duration-300 cursor-default overflow-hidden">
            {/* Hover Accent Line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="flex justify-between items-start mb-2 pl-2">
                <StatusBadge status={ticket.status} />
                <span className="text-[10px] font-semibold text-gray-400">{date}</span>
            </div>
            
            <div className="pl-2">
                <h4 className="font-bold text-gray-800 text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors">{ticket.subject}</h4>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{ticket.description}</p>
            </div>

            {ticket.adminReply && (
                <div className="mt-3 mx-2 pt-3 border-t border-gray-100/50 flex gap-2.5 items-start">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <SparklesIcon className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Response</p>
                        <p className="text-xs text-gray-700 font-medium line-clamp-2">{ticket.adminReply}</p>
                    </div>
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
    <div className="mt-4 bg-gradient-to-br from-white to-indigo-50/50 p-5 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/10 animate-fadeIn max-w-sm">
        <div className="flex items-center gap-2 mb-3 text-indigo-700">
            <div className="p-1.5 bg-indigo-100 rounded-lg">
                <TicketIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">Ticket Suggestion</span>
        </div>
        <div className="mb-5 pl-1">
            <p className="text-sm font-bold text-gray-900 mb-1">{draft.subject}</p>
            <p className="text-xs text-gray-600 italic border-l-2 border-indigo-200 pl-3 py-1">
                "{draft.description}"
            </p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={onConfirm}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02]"
            >
                {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit Ticket"}
            </button>
            <button 
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
                Dismiss
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
                return <strong key={i} className="font-bold text-indigo-900">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="space-y-2.5">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>;
                
                if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
                    const cleanHeader = trimmed.replace(/^#+\s*/, '');
                    return <h3 key={i} className="font-bold text-lg mt-1 mb-1 tracking-tight text-gray-900">{cleanHeader}</h3>;
                }
                
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                     return (
                        <div key={i} className="flex gap-2.5 items-start pl-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                            <span className="flex-1 leading-relaxed">{parseBold(trimmed.replace(/^[-*]\s*/, ''))}</span>
                        </div>
                     );
                }
                return <p key={i} className="leading-relaxed">{parseBold(line)}</p>;
            })}
        </div>
    );
};

// Icons for Chat
const PixaBotIcon = () => (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white to-slate-50 border border-white/50 shadow-md shadow-indigo-100">
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 translate-y-[1px]" style={{ fontFamily: "'Parkinsans', sans-serif" }}>P</span>
    </div>
);

const UserMessageIcon = ({ user }: { user: any }) => (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-md overflow-hidden">
        {user?.avatar ? (
             <span className="text-sm font-bold text-gray-600">{user.avatar}</span>
        ) : (
             <UserIcon className="w-5 h-5 text-gray-500" />
        )}
    </div>
);

// Quick Action Pills
const QuickActions: React.FC<{ onAction: (text: string) => void }> = ({ onAction }) => {
    const actions = [
        { label: "Billing Help", icon: CreditCardIcon, prompt: "I have a question about billing or credits." },
        { label: "Features", icon: LightbulbIcon, prompt: "How do I use the Magic Photo Studio features?" },
        { label: "Report Bug", icon: FlagIcon, prompt: "I found a bug I'd like to report." },
        { label: "Request Feature", icon: SparklesIcon, prompt: "I have a feature request." }
    ];

    return (
        <div className="flex flex-wrap gap-2 mt-6 animate-fadeIn pl-2">
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => onAction(action.prompt)}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
                >
                    <action.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
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

            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;
            
            const recent = allMessages.filter(m => (now - m.timestamp) < oneDay);
            const older = allMessages.filter(m => (now - m.timestamp) >= oneDay);

            if (recent.length === 0) {
                const greeting = getGreeting();
                const firstName = auth.user.name ? auth.user.name.split(' ')[0] : 'Creator';
                
                const welcomeMsg: ChatMessage = {
                    id: 'welcome_' + Date.now(),
                    role: 'model',
                    content: `### ${greeting}, ${firstName}!\n\nI'm **Pixa Support**. I'm here to help you with:\n\n- Troubleshooting & Bugs\n- Billing & Credits\n- Feature Guides\n\nHow can I assist you today?`,
                    timestamp: Date.now()
                };
                setMessages([welcomeMsg]);
                setShowQuickActions(true);
                saveSupportMessage(auth.user.uid, welcomeMsg);
            } else {
                setMessages(recent);
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

        setShowQuickActions(false);

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);
        saveSupportMessage(auth.user.uid, userMsg);

        try {
            const response = await sendSupportMessage(
                [...messages, userMsg], 
                { name: auth.user.name, email: auth.user.email, credits: auth.user.credits }
            );
            setMessages(prev => [...prev, response]);
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
                content: "**Ticket Created!**\n\nI've sent this to our human specialists. You can track the status in the sidebar on the right.",
                timestamp: Date.now()
            };

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
                content: "**[Uploaded Screenshot]**",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);
            saveSupportMessage(auth.user!.uid, userMsg);
            
            setIsTyping(true);

            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-white flex flex-col font-sans text-slate-900">
            
            {/* Premium Header */}
            <div className="bg-white/70 backdrop-blur-xl border-b border-white/50 py-5 px-8 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                            <div className="p-2 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                                <LifebuoyIcon className="w-5 h-5" />
                            </div>
                            Support Center
                        </h1>
                        <p className="text-xs font-bold text-gray-400 mt-1 ml-1 uppercase tracking-wider">24/7 Intelligent Support</p>
                    </div>
                    {/* Activity Indicator / Credits */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 shadow-sm">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold uppercase tracking-wide">Pixa Live</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                            <CreditCoinIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-xs font-bold text-gray-700">{auth.user?.credits} Credits</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 lg:p-8 items-start">
                
                {/* LEFT: CHAT INTERFACE */}
                {/* Main Glassmorphism Container with strict height control */}
                <div className="lg:col-span-2 flex flex-col h-[50vh] min-h-[500px] bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white/80 ring-1 ring-white/50 overflow-hidden relative group">
                    
                    {/* Decorative Background Blur */}
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply"></div>
                    <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply"></div>
                    
                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth relative z-10">
                        
                        {/* History Pill */}
                        {olderMessages.length > 0 && (
                            <div className="flex justify-center mb-6">
                                <button 
                                    onClick={handleLoadOlder}
                                    className="bg-white/90 backdrop-blur-md text-slate-500 hover:text-indigo-600 text-[10px] font-bold px-5 py-2 rounded-full transition-all border border-gray-200 uppercase tracking-widest shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                >
                                    Previous chat
                                </button>
                            </div>
                        )}

                        {loadingHistory && (
                            <div className="flex flex-col items-center justify-center py-12 opacity-60">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Connecting...</p>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                                <div className={`flex items-end gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    
                                    {/* Avatar */}
                                    <div className="mb-1 hidden sm:block">
                                        {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-6 py-4 rounded-3xl shadow-sm text-sm leading-relaxed relative border ${
                                            msg.role === 'user' 
                                            ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-indigo-500/20 border-transparent' 
                                            : 'bg-white/90 text-gray-800 rounded-tl-none border-white shadow-sm'
                                        }`}>
                                            {msg.role === 'user' ? msg.content : <FormattedMessage text={msg.content} />}
                                        </div>

                                        {/* Ticket Proposal */}
                                        {msg.type === 'proposal' && msg.ticketDraft && (
                                            <TicketProposalCard 
                                                draft={msg.ticketDraft} 
                                                onConfirm={() => handleCreateTicket(msg.ticketDraft!)}
                                                onCancel={() => handleCancelTicket(msg.id)}
                                                isSubmitting={isSubmittingTicket}
                                            />
                                        )}
                                        
                                        <span className={`text-[9px] font-bold mt-2 px-2 opacity-40 ${msg.role === 'user' ? 'text-right text-indigo-900' : 'text-left text-gray-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isTyping && (
                            <div className="flex items-center gap-3 animate-fadeIn">
                                <PixaBotIcon />
                                <div className="bg-white/80 px-5 py-4 rounded-3xl rounded-tl-none border border-white shadow-sm flex gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}

                        {showQuickActions && <QuickActions onAction={handleSendMessage} />}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area - Floating Capsule Design */}
                    <div className="p-4 relative z-20">
                        <div className="bg-white/90 backdrop-blur-xl border border-white shadow-2xl shadow-indigo-100/50 rounded-full p-2 flex items-center gap-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-gray-400 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-full transition-all"
                                title="Upload Screenshot"
                            >
                                <UploadIcon className="w-5 h-5" />
                            </button>
                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                            
                            <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-transparent px-2 py-3 text-sm focus:outline-none placeholder-gray-400 text-gray-800 font-medium"
                                    placeholder="Type your message..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                            </div>
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={!inputText.trim() || isTyping}
                                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none active:scale-95 transform hover:scale-105"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: TICKET HISTORY */}
                {/* Glassmorphism Sidebar */}
                <div className="hidden lg:flex flex-col h-[50vh] min-h-[500px]">
                    <div className="bg-white/60 backdrop-blur-2xl rounded-[2.5rem] shadow-xl border border-white/80 ring-1 ring-white/50 h-full flex flex-col overflow-hidden relative">
                        {/* Header */}
                        <div className="p-6 border-b border-white/50 bg-white/40 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-white border border-gray-100 rounded-lg shadow-sm">
                                        <TicketIcon className="w-4 h-4 text-indigo-500"/>
                                    </div>
                                    History
                                </h3>
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">{tickets.length}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                            {tickets.length > 0 ? (
                                tickets.map(ticket => (
                                    <TicketHistoryItem key={ticket.id} ticket={ticket} />
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                                        <TicketIcon className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-500">No active tickets</p>
                                    <p className="text-xs text-gray-400 mt-2 max-w-[200px]">Issues that require human review will appear here.</p>
                                </div>
                            )}
                        </div>
                        
                        {/* Bottom Gradient Fade */}
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};
