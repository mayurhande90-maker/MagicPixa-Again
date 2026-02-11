import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, Ticket, AppConfig } from '../../types';
import { sendSupportMessage, createTicket, ChatMessage, analyzeSupportImage } from '../../services/supportService';
import { fileToBase64 } from '../../utils/imageUtils';
import { saveSupportMessage, getSupportHistory, clearSupportChat } from '../../firebase';
import { 
    UploadIcon, 
    PaperAirplaneIcon,
    TrashIcon,
    ArrowDownIcon,
    PixaSupportIcon,
    PlusIcon,
    TicketIcon,
    ShieldCheckIcon
} from '../../components/icons';
import { PixaBotIcon, UserMessageIcon, FormattedMessage, TicketProposalCard, QuickActions, ChatSkeleton, getGreeting } from './SupportComponents';

interface SupportChatWindowProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onTicketCreated: (ticket: Ticket) => void;
    onToggleSidebar: () => void;
}

export const SupportChatWindow: React.FC<SupportChatWindowProps> = ({ auth, appConfig, onTicketCreated, onToggleSidebar }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);
    
    const [submittingTicketId, setSubmittingTicketId] = useState<string | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (auth.user) {
            loadChatHistory();
        }
    }, [auth.user]);

    useEffect(() => {
        if (!loadingHistory && messages.length > 0) {
            scrollToBottom();
        }
    }, [loadingHistory, messages.length]);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollBtn(!isNearBottom);
        }
    };

    const handleNewChat = async () => {
        if (!auth.user) return;
        if (window.confirm("Start a new support session? This will clear the current conversation.")) {
            setLoadingHistory(true);
            setMessages([]);
            setHasInteracted(false);
            try { await clearSupportChat(auth.user.uid); } catch (e) { console.error("Failed to clear chat", e); }
            await loadChatHistory();
        }
    };

    const loadChatHistory = async () => {
        if (!auth.user) return;
        setLoadingHistory(true);
        let allMessages: ChatMessage[] = [];
        try {
            const rawHistory = await getSupportHistory(auth.user.uid);
            allMessages = rawHistory as ChatMessage[];
        } catch (e) { console.error("Chat history fetch failed", e); }

        setHasInteracted(allMessages.some(m => m.role === 'user'));

        if (allMessages.length === 0) {
            const greeting = getGreeting();
            const firstName = auth.user.name ? auth.user.name.split(' ')[0] : 'Creator';
            const welcomeMsg: ChatMessage = {
                id: 'welcome_' + Date.now(),
                role: 'model',
                content: `### ${greeting}, ${firstName}!\n\nI'm **Pixa**, your dedicated Technical Concierge. I can help you master our high-fidelity AI tools, troubleshoot issues, or handle credit inquiries.\n\nWhat can I do for you today?`,
                timestamp: Date.now()
            };
            setMessages([welcomeMsg]);
            saveSupportMessage(auth.user.uid, welcomeMsg).catch(e => console.warn("Welcome msg save failed", e));
        } else {
            setMessages(allMessages);
        }
        setLoadingHistory(false);
    };

    const handleSendMessage = async (textOverride?: string) => {
        const textToSend = textOverride || inputText;
        if (!textToSend.trim() || !auth.user) return;

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
        scrollToBottom();
        
        saveSupportMessage(auth.user.uid, userMsg).catch(e => console.warn("User msg save failed", e));

        try {
            const response = await sendSupportMessage(
                [...messages, userMsg], 
                { 
                    name: auth.user.name, 
                    email: auth.user.email, 
                    credits: auth.user.credits, 
                    plan: auth.user.plan 
                },
                appConfig?.featureCosts || {} 
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user.uid, response).catch(e => console.warn("Bot msg save failed", e));
        } catch (e) { 
            console.error(e); 
        } finally { 
            setIsTyping(false); 
        }
    };

    const handleQuickAction = (action: any) => {
        if (action.autoSend) {
            handleSendMessage(action.prompt);
        } else {
            setInputText(action.prompt);
            setHasInteracted(true);
            setTimeout(() => { inputFocusRef.current?.focus(); }, 50);
        }
    };

    const handleCreateTicket = async (draft: Partial<Ticket>, msgId: string) => {
        if (!auth.user) return;
        setSubmittingTicketId(msgId);
        try {
            const newTicket = await createTicket(auth.user.uid, auth.user.email, draft);
            setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                    const updated = { ...m, isSubmitted: true, ticketDraft: { ...draft, id: newTicket.id } };
                    saveSupportMessage(auth.user!.uid, updated).catch(e => console.warn("Update save failed", e));
                    return updated;
                }
                return m;
            }));
            onTicketCreated(newTicket);
            const confirmationMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "**Identity Verified. Ticket Logged.**\n\nI've forwarded your case to our Technical Operations team. You can monitor the resolution status in the 'Support History' sidebar.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, confirmationMsg]);
            saveSupportMessage(auth.user.uid, confirmationMsg).catch(e => console.warn("Save failed", e));
        } catch (e: any) { 
            alert("Uplink failed. Error creating ticket: " + e.message); 
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
            
            const dataUri = `data:${base64.mimeType};base64,${base64.base64}`;
            
            const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: "[Visual Diagnostics Uploaded]",
                attachment: dataUri,
                timestamp: Date.now()
            };
            
            setMessages(prev => [...prev, userMsg]);
            saveSupportMessage(auth.user!.uid, userMsg).catch(e => console.warn("Save failed", e));
            
            setIsTyping(true);
            
            try {
                const analysis = await analyzeSupportImage(base64.base64, base64.mimeType);
                
                const response = await sendSupportMessage(
                    [
                        ...messages, 
                        userMsg, 
                        { 
                            role: 'user', 
                            content: `[SYSTEM: USER ATTACHED SCREENSHOT]\nVISUAL DIAGNOSIS: ${analysis}\nINSTRUCTION: Briefly acknowledge the image and provide technical assistance based on the diagnosis.`, 
                            id: 'sys_' + Date.now(), 
                            timestamp: Date.now() 
                        }
                    ],
                    { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits, plan: auth.user!.plan },
                    appConfig?.featureCosts || {}
                );
                
                setMessages(prev => [...prev, response]);
                saveSupportMessage(auth.user!.uid, response).catch(e => console.warn("Save failed", e));
            } catch (err) {
                console.error("Diagnostic failed", err);
            } finally {
                setIsTyping(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white relative">
            
            {/* CONSOLE HEADER */}
            <div className="flex-none px-6 py-[min(2vh,16px)] border-b border-gray-100 flex justify-between items-center bg-white z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <PixaSupportIcon className="w-[clamp(24px,4vh,36px)] h-[clamp(24px,4vh,36px)] text-indigo-600" />
                    <div>
                        <h2 className="text-[clamp(13px,1.8vh,16px)] font-black text-gray-800 tracking-tight leading-none">Pixa Agent Hub</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Logic Engine Online</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleNewChat}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-transparent hover:border-indigo-100 flex items-center gap-2"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>New Session</span>
                    </button>
                    <button 
                        onClick={onToggleSidebar}
                        className="lg:hidden p-2 text-gray-400 hover:text-indigo-600"
                    >
                        <TicketIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* MESSAGES AREA */}
            <div className="flex-1 relative bg-white">
                <div 
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="absolute inset-0 overflow-y-auto px-4 sm:px-10 py-[min(3vh,24px)] space-y-[min(2.5vh,20px)] custom-scrollbar scroll-smooth"
                >
                    {loadingHistory ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <ChatSkeleton />
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                                    <div className={`flex items-end gap-3 max-w-[95%] md:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className="mb-1 hidden sm:block shrink-0">
                                            {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}
                                        </div>
                                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full min-w-0`}>
                                            
                                            {/* RENDER IMAGE ATTACHMENT */}
                                            {msg.attachment && (
                                                <div className={`mb-1.5 p-1 bg-white rounded-2xl border border-gray-200 shadow-sm inline-block ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                                    <img 
                                                        src={msg.attachment} 
                                                        alt="User Upload" 
                                                        className="max-h-[clamp(120px,25vh,240px)] w-auto object-cover rounded-xl cursor-zoom-in hover:opacity-90 transition-opacity" 
                                                        onClick={() => window.open(msg.attachment, '_blank')}
                                                    />
                                                </div>
                                            )}
                                            
                                            {/* RENDER TEXT CONTENT */}
                                            {msg.content && (
                                                <div className={`px-[min(2.2vh,24px)] py-[min(1.8vh,18px)] rounded-3xl text-[clamp(12px,1.6vh,15px)] leading-relaxed border shadow-sm relative ${
                                                    msg.role === 'user' 
                                                    ? 'bg-indigo-600 text-white rounded-tr-none border-indigo-600' 
                                                    : 'bg-white text-slate-700 rounded-tl-none border-gray-100'
                                                }`}>
                                                    {msg.role === 'model' && (
                                                        <div className="flex items-center gap-1.5 mb-2 opacity-50">
                                                            <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500" />
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Verified Pixa Solution</span>
                                                        </div>
                                                    )}
                                                    {msg.role === 'user' 
                                                        ? <div className="whitespace-pre-wrap break-words font-medium">{msg.content}</div>
                                                        : <FormattedMessage text={msg.content} isWelcome={index === 0 && msg.content.includes("###")} />
                                                    }
                                                </div>
                                            )}

                                            {/* Interactive Widgets: TICKET PROPOSALS */}
                                            {msg.type === 'proposal' && msg.ticketDraft && (
                                                <div className="w-full max-w-sm mt-3 animate-fadeIn">
                                                    <TicketProposalCard 
                                                        draft={msg.ticketDraft} 
                                                        onConfirm={(finalDraft) => handleCreateTicket(finalDraft, msg.id)}
                                                        onCancel={() => handleCancelTicket(msg.id)}
                                                        isSubmitting={submittingTicketId === msg.id}
                                                        isSubmitted={msg.isSubmitted || false}
                                                    />
                                                </div>
                                            )}
                                            
                                            <span className={`text-[9px] font-black text-gray-300 mt-2 px-2 uppercase tracking-widest ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>

                                    {!hasInteracted && index === messages.length - 1 && msg.role === 'model' && (
                                        <div className="w-full mt-6 pl-0 sm:pl-16">
                                            <QuickActions onAction={handleQuickAction} className="justify-start" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} className="h-4" />
                        </>
                    )}
                    
                    {isTyping && (
                        <div className="flex items-center gap-3 animate-fadeIn pl-2">
                            <PixaBotIcon />
                            <div className="bg-gray-50 px-5 py-4 rounded-3xl rounded-tl-none flex gap-1.5 items-center w-20 h-12 shadow-inner border border-gray-100">
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Floating Scroll Button */}
                {showScrollBtn && (
                    <button 
                        onClick={scrollToBottom}
                        className="absolute bottom-6 right-10 z-30 bg-white shadow-2xl border border-gray-100 p-3 rounded-full text-indigo-600 hover:bg-indigo-50 transition-all animate-bounce-slight"
                    >
                        <ArrowDownIcon className="w-6 h-6" />
                    </button>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="flex-none p-[min(2.5vh,24px)] bg-white border-t border-gray-100 relative z-30">
                {hasInteracted && !loadingHistory && !isTyping && (
                    <div className="mb-4 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                        <QuickActions onAction={handleQuickAction} className="flex-nowrap" />
                    </div>
                )}
                
                <div className="flex gap-4 items-end bg-gray-50 border border-gray-200 p-2.5 rounded-[2.2rem] focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:border-indigo-400 focus-within:bg-white transition-all shadow-inner">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-full transition-all shrink-0 hover:shadow-md active:scale-90"
                        title="Upload Diagnostic Photo"
                    >
                        <UploadIcon className="w-6 h-6" />
                    </button>
                    
                    <textarea 
                        ref={inputFocusRef}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[clamp(13px,1.6vh,16px)] font-bold text-gray-800 placeholder-gray-400 resize-none py-3.5 max-h-32 leading-relaxed custom-scrollbar"
                        placeholder="Describe your issue or ask a question..."
                        rows={1}
                        value={inputText}
                        onChange={(e) => {
                            setInputText(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    
                    <button 
                        onClick={() => handleSendMessage()}
                        disabled={!inputText.trim() || isTyping}
                        className={`p-3.5 rounded-full transition-all shrink-0 shadow-lg ${
                            inputText.trim() 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed grayscale'
                        }`}
                    >
                        <PaperAirplaneIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
    );
};
