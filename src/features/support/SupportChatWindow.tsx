
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AuthProps, Ticket } from '../../types';
import { sendSupportMessage, createTicket, ChatMessage, analyzeErrorScreenshot } from '../../services/supportService';
import { fileToBase64 } from '../../utils/imageUtils';
import { saveSupportMessage, getSupportHistory, clearSupportChat } from '../../firebase';
import { 
    UploadIcon, 
    PaperAirplaneIcon,
    TrashIcon,
    ArrowDownIcon,
    ArrowUpIcon
} from '../../components/icons';
import { PixaBotIcon, UserMessageIcon, FormattedMessage, TicketProposalCard, QuickActions, ChatSkeleton, getGreeting } from './SupportComponents';

interface SupportChatWindowProps {
    auth: AuthProps;
    onTicketCreated: (ticket: Ticket) => void;
}

export const SupportChatWindow: React.FC<SupportChatWindowProps> = ({ auth, onTicketCreated }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);
    
    const [submittingTicketId, setSubmittingTicketId] = useState<string | null>(null);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    // Refs for DOM elements
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLTextAreaElement>(null);
    const previousScrollHeightRef = useRef(0);

    useEffect(() => {
        if (auth.user) {
            loadChatHistory();
        }
    }, [auth.user]);

    useLayoutEffect(() => {
        if (isLoadingOlder && scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const diff = newScrollHeight - previousScrollHeightRef.current;
            scrollContainerRef.current.scrollTop = diff; 
            setIsLoadingOlder(false);
        }
    }, [messages, isLoadingOlder]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            // Show button if user is scrolled up more than 200px from bottom
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollBtn(!isNearBottom);
        }
    };

    const handleClearChat = async () => {
        if (!auth.user) return;
        if (confirm("Clear your entire chat history? This cannot be undone.")) {
            setMessages([]);
            setOlderMessages([]);
            setHasInteracted(false);
            await clearSupportChat(auth.user.uid);
            loadChatHistory(); // Reload to show welcome message
        }
    };

    const loadChatHistory = async () => {
        if (!auth.user) return;
        setLoadingHistory(true);
        
        let allMessages: ChatMessage[] = [];
        
        try {
            const rawHistory = await getSupportHistory(auth.user.uid);
            allMessages = rawHistory as ChatMessage[];
        } catch (e) {
            console.error("Chat history fetch failed", e);
        }

        const INITIAL_BATCH = 15;
        const visible = allMessages.slice(-INITIAL_BATCH);
        const hidden = allMessages.slice(0, Math.max(0, allMessages.length - INITIAL_BATCH));

        const userHasHistory = visible.some(m => m.role === 'user');
        setHasInteracted(userHasHistory);

        if (visible.length === 0) {
            const greeting = getGreeting();
            const firstName = auth.user.name ? auth.user.name.split(' ')[0] : 'Creator';
            
            const welcomeMsg: ChatMessage = {
                id: 'welcome_' + Date.now(),
                role: 'model',
                content: `### ${greeting}, ${firstName}!\n\nI'm **Pixa Support**. I can help you with:\n\n- Troubleshooting & Bugs\n- Credits & Billing\n- Creating Better Images\n\nHow can I help you today?`,
                timestamp: Date.now()
            };
            setMessages([welcomeMsg]);
            saveSupportMessage(auth.user.uid, welcomeMsg).catch(e => console.warn("Welcome msg save failed", e));
        } else {
            setMessages(visible);
        }
        
        setOlderMessages(hidden);
        setLoadingHistory(false);
        scrollToBottom();
    };

    const handleLoadOlder = () => {
        if (olderMessages.length === 0) return;
        
        if (scrollContainerRef.current) {
            previousScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
        }
        setIsLoadingOlder(true);

        const BATCH = 10;
        const nextBatch = olderMessages.slice(-BATCH);
        const remaining = olderMessages.slice(0, Math.max(0, olderMessages.length - BATCH));
        
        setTimeout(() => {
            setMessages(prev => [...nextBatch, ...prev]);
            setOlderMessages(remaining);
        }, 300);
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
                }
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user.uid, response).catch(e => console.warn("Bot msg save failed", e));
            scrollToBottom();

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
            setTimeout(() => {
                inputFocusRef.current?.focus();
            }, 50);
        }
    };

    const handleCreateTicket = async (draft: Partial<Ticket>, msgId: string) => {
        if (!auth.user) return;
        setSubmittingTicketId(msgId);
        try {
            const newTicket = await createTicket(auth.user.uid, auth.user.email, draft);
            
            setMessages(prev => prev.map(m => {
                if (m.id === msgId) {
                    const updated = { ...m, isSubmitted: true, ticketDraft: draft };
                    saveSupportMessage(auth.user!.uid, updated).catch(e => console.warn("Update save failed", e));
                    return updated;
                }
                return m;
            }));
            
            onTicketCreated(newTicket);
            
            const confirmationMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "**Ticket Created!**\n\nI've forwarded this to our specialists. You can track the status in the sidebar.",
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, confirmationMsg]);
            saveSupportMessage(auth.user.uid, confirmationMsg).catch(e => console.warn("Save failed", e));
            scrollToBottom();
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
                content: "**[Uploaded Image]** Analyzing...",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);
            scrollToBottom();
            saveSupportMessage(auth.user!.uid, userMsg).catch(e => console.warn("Save failed", e));
            
            setIsTyping(true);

            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
            // Immediately send analysis prompt
            const response = await sendSupportMessage(
                [...messages, userMsg, { role: 'user', content: `I uploaded an error screenshot. Analysis: ${analysis}`, id: 'sys', timestamp: Date.now() }],
                { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits, plan: auth.user!.plan }
            );
            setMessages(prev => [...prev, response]);
            scrollToBottom();
            saveSupportMessage(auth.user!.uid, response).catch(e => console.warn("Save failed", e));
            
            setIsTyping(false);
        }
    };

    return (
        <div className="lg:col-span-2 flex flex-col h-full min-h-0 bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-xl border border-white/50 relative overflow-hidden group">
            
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none"></div>

            {/* Clear Chat Button (Absolute Top Right) */}
            <button 
                onClick={handleClearChat}
                className="absolute top-4 right-4 z-30 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="Clear Chat History"
            >
                <TrashIcon className="w-4 h-4" />
            </button>

            {/* Floating Load Previous Button (Top Arrow) */}
            {olderMessages.length > 0 && !loadingHistory && (
                <button 
                    onClick={handleLoadOlder}
                    disabled={isLoadingOlder}
                    className="absolute top-24 right-8 z-40 bg-white shadow-lg border border-gray-100 p-3 rounded-full text-indigo-600 hover:bg-indigo-50 transition-all animate-bounce-slight flex items-center justify-center disabled:opacity-50"
                    title="Load Previous Chats"
                >
                    {isLoadingOlder ? (
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <ArrowUpIcon className="w-5 h-5" />
                    )}
                </button>
            )}

            {/* Main Chat Scroll Area */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 basis-0 overflow-y-auto px-4 sm:px-8 pt-8 pb-4 space-y-6 custom-scrollbar relative z-10 scroll-smooth"
            >
                {loadingHistory ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <ChatSkeleton />
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                            <div className={`flex items-end gap-3 max-w-[95%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                
                                {/* Avatar */}
                                <div className="mb-1 hidden sm:block">
                                    {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}
                                </div>

                                {/* Message Bubble */}
                                <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                                    <div className={`px-5 py-3.5 rounded-[1.5rem] shadow-sm text-sm leading-relaxed relative border transition-all ${
                                        msg.role === 'user' 
                                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20 border-transparent' 
                                        : 'bg-white text-slate-700 rounded-tl-none border-gray-100 shadow-sm'
                                    }`}>
                                        {msg.role === 'user' 
                                            ? <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                            : <FormattedMessage text={msg.content} isWelcome={index === 0 && msg.content.includes("### Good")} />
                                        }
                                    </div>

                                    {/* Embedded Widgets */}
                                    {msg.type === 'proposal' && msg.ticketDraft && (
                                        <div className="pl-2">
                                            <TicketProposalCard 
                                                draft={msg.ticketDraft} 
                                                onConfirm={(finalDraft) => handleCreateTicket(finalDraft, msg.id)}
                                                onCancel={() => handleCancelTicket(msg.id)}
                                                isSubmitting={submittingTicketId === msg.id}
                                                isSubmitted={msg.isSubmitted || false}
                                            />
                                        </div>
                                    )}
                                    
                                    <span className={`text-[10px] font-medium mt-1.5 px-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            {/* Quick Actions (Contextual) */}
                            {!hasInteracted && index === messages.length - 1 && msg.role === 'model' && (
                                <div className="w-full mt-6 pl-0 sm:pl-14">
                                    <QuickActions onAction={handleQuickAction} className="justify-start" />
                                </div>
                            )}
                        </div>
                    ))
                )}
                
                {isTyping && (
                    <div className="flex items-center gap-3 animate-fadeIn pl-2">
                        <PixaBotIcon />
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1.5 items-center">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll Down Button */}
            {showScrollBtn && (
                <button 
                    onClick={scrollToBottom}
                    className="absolute bottom-24 right-8 z-40 bg-white shadow-lg border border-gray-100 p-3 rounded-full text-indigo-600 hover:bg-indigo-50 transition-all animate-bounce-slight"
                >
                    <ArrowDownIcon className="w-5 h-5" />
                </button>
            )}

            {/* Input Area */}
            <div className="p-4 sm:p-6 bg-white/80 backdrop-blur-xl border-t border-white/50 relative z-20">
                
                {hasInteracted && !loadingHistory && !isTyping && (
                    <div className="mb-4 overflow-x-auto pb-2 no-scrollbar">
                        <QuickActions onAction={handleQuickAction} className="flex-nowrap" />
                    </div>
                )}

                <div className="flex gap-3 items-end bg-white border border-gray-200 p-2 rounded-[1.5rem] shadow-lg shadow-gray-200/50 focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors shrink-0"
                        title="Attach Screenshot"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    
                    <textarea 
                        ref={inputFocusRef}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-800 placeholder-gray-400 resize-none py-3 max-h-32"
                        placeholder="Type your message..."
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
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
                        className={`p-3 rounded-full transition-all shrink-0 shadow-md ${
                            inputText.trim() 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105' 
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
        </div>
    );
};
