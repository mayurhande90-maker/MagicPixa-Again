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
    // Handle both Firestore Timestamp and regular Date objects
    let dateStr = 'Just now';
    if (ticket.createdAt) {
        if ((ticket.createdAt as any).toDate) {
            dateStr = (ticket.createdAt as any).toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (ticket.createdAt instanceof Date) {
            dateStr = ticket.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (typeof ticket.createdAt === 'string') {
            dateStr = new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    }

    return (
        <div className="group relative p-4 rounded-2xl bg-white/60 backdrop-blur-sm border border-gray-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:bg-white transition-all duration-300 cursor-default overflow-hidden">
            {/* Hover Accent Line */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            <div className="flex justify-between items-start mb-2 pl-2">
                <StatusBadge status={ticket.status} />
                <span className="text-[10px] font-semibold text-gray-400">{dateStr}</span>
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
    onConfirm: (finalDraft: Partial<Ticket>) => void; 
    onCancel: () => void;
    isSubmitting: boolean;
    isSubmitted: boolean;
}> = ({ draft, onConfirm, onCancel, isSubmitting, isSubmitted }) => {
    // Local state to allow editing before submission
    const [editedDraft, setEditedDraft] = useState(draft);

    // Update local state if prop draft changes (though mostly it won't)
    useEffect(() => {
        if (!isSubmitted) {
            setEditedDraft(draft);
        }
    }, [draft, isSubmitted]);

    if (isSubmitted) {
        return (
            <div className="mt-4 bg-green-50 p-5 rounded-2xl border border-green-200 shadow-sm animate-fadeIn max-w-sm w-full">
                <div className="flex items-center gap-2 mb-3 text-green-700">
                    <CheckIcon className="w-5 h-5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Ticket Submitted</span>
                </div>
                <div className="pl-1">
                    <p className="text-sm font-bold text-gray-900">{editedDraft.subject}</p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-3">{editedDraft.description}</p>
                </div>
            </div>
        );
    }

    // Determine visible types.
    // If the draft has a specific specific type (bug, refund, feature), only show that one.
    // Otherwise show all.
    const allTypes = ['general', 'bug', 'refund', 'feature'];
    const visibleTypes = (draft.type && ['bug', 'refund', 'feature'].includes(draft.type)) 
        ? [draft.type] 
        : allTypes;

    return (
        <div className="mt-4 bg-white p-5 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/10 animate-fadeIn max-w-sm w-full ring-1 ring-indigo-50">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 border-b border-indigo-50 pb-3">
                <TicketIcon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wide">Review & Submit Ticket</span>
            </div>
            
            <div className="space-y-4 mb-5">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Subject</label>
                    <input 
                        className="w-full text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        value={editedDraft.subject || ''}
                        onChange={e => setEditedDraft({...editedDraft, subject: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
                    <div className="flex gap-2">
                        {visibleTypes.map(t => (
                            <button 
                                key={t}
                                onClick={() => visibleTypes.length > 1 && setEditedDraft({...editedDraft, type: t as any})}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                                    editedDraft.type === t 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                } ${visibleTypes.length === 1 ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                    <textarea 
                        className="w-full text-xs text-gray-700 font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none min-h-[80px]"
                        value={editedDraft.description || ''}
                        onChange={e => setEditedDraft({...editedDraft, description: e.target.value})}
                        placeholder="Please describe the details here..."
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-2">
                <button 
                    onClick={() => onConfirm(editedDraft)}
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
};

// Rich Text Renderer for Chat
const FormattedMessage: React.FC<{ text: string; isWelcome?: boolean }> = ({ text, isWelcome }) => {
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
        <div className={`space-y-3 ${isWelcome ? 'pt-2' : ''} break-words w-full`}>
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>;
                
                // Special Welcome Header
                if (isWelcome && i === 0) {
                     return <h3 key={i} className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-indigo-800 mb-2 leading-tight">{trimmed.replace(/^#+\s*/, '')}</h3>;
                }

                if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
                    const cleanHeader = trimmed.replace(/^#+\s*/, '');
                    return <h3 key={i} className="font-bold text-lg mt-2 mb-1 tracking-tight text-gray-800">{cleanHeader}</h3>;
                }
                
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                     return (
                        <div key={i} className="flex gap-3 items-start pl-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0 shadow-sm"></div>
                            <span className="flex-1 leading-relaxed text-gray-700 whitespace-pre-wrap">{parseBold(trimmed.replace(/^[-*]\s*/, ''))}</span>
                        </div>
                     );
                }
                return <p key={i} className="leading-relaxed text-gray-700 whitespace-pre-wrap">{parseBold(line)}</p>;
            })}
        </div>
    );
};

// Icons for Chat
const PixaBotIcon = () => (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white to-indigo-50 border border-indigo-100 shadow-md shadow-indigo-100/50">
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
const QuickActions: React.FC<{ onAction: (action: any) => void; className?: string }> = ({ onAction, className }) => {
    // All actions now set autoSend: true to trigger the AI "Ticket Proposal" logic immediately.
    // The prompts are phrased to ensure the AI recognizes the intent to create a ticket.
    const actions = [
        { label: "Billing Issue", icon: CreditCardIcon, prompt: "I have a billing issue. Create a ticket.", autoSend: true },
        { label: "Features", icon: LightbulbIcon, prompt: "I need help with a feature. Create a ticket.", autoSend: true },
        { label: "Report Bug", icon: FlagIcon, prompt: "I found a bug. Create a ticket.", autoSend: true },
        { label: "New Feature", icon: SparklesIcon, prompt: "I'd like to request a feature. Create a ticket.", autoSend: true }
    ];

    return (
        <div className={`flex flex-wrap gap-2 animate-fadeIn ${className}`}>
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => onAction(action)}
                    className="group flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                    <action.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    {action.label}
                </button>
            ))}
        </div>
    );
};

// Skeleton Loader for Chat
const ChatSkeleton = () => (
    <div className="space-y-6 p-4 opacity-70 animate-pulse flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-md space-y-6">
            {/* Fake Bot Message */}
            <div className="flex gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl shrink-0"></div>
                <div className="space-y-2 flex-1">
                    <div className="w-3/4 h-4 bg-gray-200 rounded-full"></div>
                    <div className="w-1/2 h-4 bg-gray-200 rounded-full"></div>
                </div>
            </div>
            
            <div className="flex flex-col items-center gap-3 pt-4">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-indigo-500 tracking-widest uppercase">Connecting to Pixa Support...</p>
            </div>
        </div>
    </div>
);

export const SupportCenter: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);
    
    // Ticket State
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [submittingTicketId, setSubmittingTicketId] = useState<string | null>(null);
    
    // UI State
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (auth.user) {
            loadTickets();
            loadChatHistory();
        }
    }, [auth.user]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, olderMessages, hasInteracted, loadingHistory]);

    const loadChatHistory = async () => {
        if (!auth.user) return;
        setLoadingHistory(true);
        
        let allMessages: ChatMessage[] = [];
        
        try {
            // OPTIMIZATION: Do NOT await cleanup. Fire and forget to speed up initial load.
            cleanupSupportHistory(auth.user.uid).catch(e => console.warn("Chat cleanup background process error:", e));
            
            // Attempt fetch
            const rawHistory = await getSupportHistory(auth.user.uid);
            allMessages = rawHistory as ChatMessage[];
        } catch (e) {
            console.error("Chat history fetch failed (likely permissions), failing gracefully.", e);
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        
        const recent = allMessages.filter(m => (now - m.timestamp) < oneDay);
        const older = allMessages.filter(m => (now - m.timestamp) >= oneDay);

        // Check if user has ever sent a message in the active history
        const userHasHistory = recent.some(m => m.role === 'user');
        setHasInteracted(userHasHistory);

        if (recent.length === 0) {
            const greeting = getGreeting();
            const firstName = auth.user.name ? auth.user.name.split(' ')[0] : 'Creator';
            
            // Generate a specialized "Hero" welcome message
            const welcomeMsg: ChatMessage = {
                id: 'welcome_' + Date.now(),
                role: 'model',
                // Special formatting trigger for FormattedMessage
                content: `### ${greeting}, ${firstName}!\n\nI'm **Pixa Support**. I'm here to help you create better images and solve any issues.\n\n- Troubleshooting & Bugs\n- Billing & Credits\n- Feature Guides\n\nHow can I assist you today?`,
                timestamp: Date.now()
            };
            setMessages([welcomeMsg]);
            
            // Save initial state so it persists
            saveSupportMessage(auth.user.uid, welcomeMsg).catch(e => console.warn("Welcome msg save failed", e));
        } else {
            setMessages(recent);
        }
        
        setOlderMessages(older);
        setLoadingHistory(false);
    };

    const loadTickets = async () => {
        if (!auth.user) return;
        try {
            const data = await getUserTickets(auth.user.uid);
            setTickets(data);
        } catch(e) { console.error("Ticket load failed", e); }
    };

    const handleLoadOlder = () => {
        setMessages(prev => [...olderMessages, ...prev]);
        setOlderMessages([]);
    };

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || inputText;
        if (!textToSend.trim() || !auth.user) return;

        // Mark as interacted to move quick actions to bottom
        setHasInteracted(true);

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: textToSend,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        if (!textOverride) setInputText('');
        setIsTyping(true);
        
        saveSupportMessage(auth.user.uid, userMsg).catch(e => console.warn("User msg save failed", e));

        try {
            const response = await sendSupportMessage(
                [...messages, userMsg], 
                { name: auth.user.name, email: auth.user.email, credits: auth.user.credits }
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user.uid, response).catch(e => console.warn("Bot msg save failed", e));

        } catch (e) {
            console.error(e);
        } finally {
            setIsTyping(false);
        }
    };

    // Updated handleQuickAction: Handles both auto-send (AI Answer) and pre-fill
    const handleQuickAction = (action: any) => {
        if (action.autoSend) {
            handleSendMessage(action.prompt);
        } else {
            setInputText(action.prompt);
            setHasInteracted(true);
            setTimeout(() => {
                inputFocusRef.current?.focus();
            }, 100);
        }
    };

    const handleCreateTicket = async (draft: Partial<Ticket>, msgId: string) => {
        if (!auth.user) return;
        setSubmittingTicketId(msgId);
        try {
            const newTicket = await createTicket(auth.user.uid, auth.user.email, draft);
            
            // UPDATE MESSAGE STATE PERSISTENTLY
            setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                    // Update state to submitted AND update the draft with final edited values
                    const updated = { ...m, isSubmitted: true, ticketDraft: draft };
                    // Side-effect: Save to DB
                    saveSupportMessage(auth.user!.uid, updated).catch(e => console.warn("Update save failed", e));
                    return updated;
                }
                return m;
            }));
            
            // OPTIMISTIC UPDATE: Add to sidebar immediately (newest first)
            setTickets(prev => [newTicket, ...prev]);
            
            const confirmationMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "**Ticket Created!**\n\nI've sent this to our human specialists. You can track the status in the sidebar on the right.",
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, confirmationMsg]);
            saveSupportMessage(auth.user.uid, confirmationMsg).catch(e => console.warn("Save failed", e));
            
            setHasInteracted(true);
            
        } catch (e: any) {
            alert("Failed to create ticket: " + e.message);
        } finally {
            setSubmittingTicketId(null);
        }
    };

    const handleCancelTicket = (msgId: string) => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            
            setHasInteracted(true);

            const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: "**[Uploaded Screenshot]**",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);
            saveSupportMessage(auth.user!.uid, userMsg).catch(e => console.warn("Save failed", e));
            
            setIsTyping(true);

            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
            const response = await sendSupportMessage(
                [...messages, userMsg, { role: 'user', content: `I uploaded an error screenshot. Analysis: ${analysis}`, id: 'sys', timestamp: Date.now() }],
                { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits }
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user!.uid, response).catch(e => console.warn("Save failed", e));
            
            setIsTyping(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/50 via-slate-50 to-white flex flex-col font-sans text-slate-900 overflow-hidden">
            
            {/* Premium Header */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-white/50 py-5 px-8 sticky top-0 z-30 shadow-sm">
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
                        {/* Mobile Sidebar Toggle */}
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <TicketIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 lg:p-8 items-start h-[calc(100vh-100px)]">
                
                {/* LEFT: CHAT INTERFACE */}
                <div className="lg:col-span-2 flex flex-col h-full bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white/80 ring-1 ring-white/60 overflow-hidden relative group">
                    
                    {/* Decorative Background Blur */}
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply opacity-50"></div>
                    <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply opacity-50"></div>
                    
                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto px-4 pt-24 pb-4 lg:px-8 lg:pt-28 lg:pb-8 space-y-8 custom-scrollbar scroll-smooth relative z-10">
                        
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

                        {loadingHistory ? (
                            <ChatSkeleton />
                        ) : (
                            messages.map((msg, index) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                                    <div className={`flex items-end gap-3 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        
                                        {/* Avatar */}
                                        <div className="mb-1 hidden sm:block shadow-sm rounded-full">
                                            {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}
                                        </div>

                                        {/* Bubble */}
                                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                                            <div className={`px-5 py-4 lg:px-6 lg:py-5 rounded-3xl shadow-sm text-sm leading-relaxed relative border transition-all hover:shadow-md w-full ${
                                                msg.role === 'user' 
                                                ? 'bg-gradient-to-br from-[#4D7CFF] to-[#3B82F6] text-white rounded-tr-none shadow-indigo-500/20 border-transparent bg-clip-padding' 
                                                : 'bg-white text-gray-800 rounded-tl-none border-gray-100 shadow-sm'
                                            }`}>
                                                {/* Highlight overlay for user bubble */}
                                                {msg.role === 'user' && <div className="absolute inset-0 bg-white/10 rounded-3xl rounded-tr-none pointer-events-none"></div>}
                                                
                                                {msg.role === 'user' 
                                                    ? <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                                    : <FormattedMessage text={msg.content} isWelcome={index === 0 && msg.content.includes("### Good")} />
                                                }
                                            </div>

                                            {/* Ticket Proposal */}
                                            {msg.type === 'proposal' && msg.ticketDraft && (
                                                <TicketProposalCard 
                                                    draft={msg.ticketDraft} 
                                                    onConfirm={(finalDraft) => handleCreateTicket(finalDraft, msg.id)}
                                                    onCancel={() => handleCancelTicket(msg.id)}
                                                    isSubmitting={submittingTicketId === msg.id}
                                                    isSubmitted={msg.isSubmitted || false}
                                                />
                                            )}
                                            
                                            <span className={`text-[9px] font-bold mt-2 px-2 opacity-40 ${msg.role === 'user' ? 'text-right text-indigo-900' : 'text-left text-gray-400'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Scenario A: Quick Actions (First Time User) - Render after Welcome Message */}
                                    {!hasInteracted && index === messages.length - 1 && msg.role === 'model' && (
                                        <div className="w-full mt-4 pl-12 sm:pl-16">
                                            <QuickActions onAction={handleQuickAction} className="justify-start" />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        
                        {isTyping && (
                            <div className="flex items-center gap-3 animate-fadeIn">
                                <PixaBotIcon />
                                <div className="bg-white px-5 py-4 rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1.5 items-center h-12">
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 lg:p-6 relative z-20 bg-gradient-to-t from-white/90 via-white/50 to-transparent flex flex-col gap-2">
                        
                        {/* Scenario B: Quick Actions (Returning User / Interacted) - Render above Input */}
                        {hasInteracted && !loadingHistory && (
                            <div className="pb-2 px-2 flex justify-center md:justify-start">
                                <QuickActions onAction={handleQuickAction} />
                            </div>
                        )}

                        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl shadow-indigo-100/50 rounded-full p-2 flex items-center gap-2 ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex-shrink-0"
                                title="Upload Screenshot"
                            >
                                <UploadIcon className="w-5 h-5" />
                            </button>
                            
                            <input 
                                ref={inputFocusRef}
                                type="text"
                                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-gray-800 placeholder-gray-400 h-full"
                                placeholder="Type your message..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                disabled={!inputText.trim()}
                                className={`p-3 rounded-full transition-all flex-shrink-0 shadow-sm ${inputText.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105' : 'bg-gray-100 text-gray-300'}`}
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </div>

                {/* RIGHT: TICKET HISTORY */}
                <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 lg:relative lg:translate-x-0 lg:w-auto lg:h-full lg:shadow-none lg:bg-transparent lg:z-auto ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="bg-white lg:bg-white/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/80 h-full shadow-lg lg:shadow-xl lg:shadow-indigo-200/20 overflow-hidden flex flex-col relative">
                        
                        {/* Mobile Close Button */}
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 p-2 text-gray-500">
                            <XIcon className="w-6 h-6" />
                        </button>

                        <div className="p-6 border-b border-gray-100/50 bg-white/50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                        <TicketIcon className="w-4 h-4" />
                                    </div>
                                    History
                                </h3>
                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{tickets.length}</span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {tickets.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-6">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                        <TicketIcon className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800">No active tickets</h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[150px]">Issues that require human review will appear here.</p>
                                </div>
                            ) : (
                                tickets.map(ticket => (
                                    <TicketHistoryItem key={ticket.id} ticket={ticket} />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};