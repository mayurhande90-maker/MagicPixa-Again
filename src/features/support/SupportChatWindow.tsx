
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AuthProps, Ticket } from '../../types';
import { sendSupportMessage, createTicket, ChatMessage, analyzeErrorScreenshot } from '../../services/supportService';
import { fileToBase64 } from '../../utils/imageUtils';
import { saveSupportMessage, getSupportHistory } from '../../firebase';
import { 
    UploadIcon, 
    PaperAirplaneIcon
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

    // Refs for DOM elements
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLInputElement>(null);
    const previousScrollHeightRef = useRef(0);

    useEffect(() => {
        if (auth.user) {
            loadChatHistory();
        }
    }, [auth.user]);

    // Handle scroll preservation when older messages are loaded
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
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
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

        // Limit to last 10 messages for display
        const INITIAL_BATCH = 10;
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
                content: `### ${greeting}, ${firstName}!\n\nI'm **Pixa Support**. I'm here to help you create better images and solve any issues.\n\n- Troubleshooting & Bugs\n- Billing & Credits\n- Feature Guides\n\nHow can I assist you today?`,
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
        
        setMessages(prev => [...nextBatch, ...prev]);
        setOlderMessages(remaining);
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
                { name: auth.user.name, email: auth.user.email, credits: auth.user.credits }
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
            }, 100);
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
            
            // Notify parent
            onTicketCreated(newTicket);
            
            const confirmationMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                content: "**Ticket Created!**\n\nI've sent this to our human specialists. You can track the status in the sidebar on the right.",
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
                content: "**[Uploaded Screenshot]**",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg]);
            scrollToBottom();
            saveSupportMessage(auth.user!.uid, userMsg).catch(e => console.warn("Save failed", e));
            
            setIsTyping(true);

            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
            const response = await sendSupportMessage(
                [...messages, userMsg, { role: 'user', content: `I uploaded an error screenshot. Analysis: ${analysis}`, id: 'sys', timestamp: Date.now() }],
                { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits }
            );
            setMessages(prev => [...prev, response]);
            scrollToBottom();
            saveSupportMessage(auth.user!.uid, response).catch(e => console.warn("Save failed", e));
            
            setIsTyping(false);
        }
    };

    return (
        <div className="lg:col-span-2 flex flex-col h-full min-h-0 bg-white/60 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-200/50 border border-white/80 ring-1 ring-white/60 overflow-hidden relative group">
                        
            {/* Decorative Background Blur */}
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply opacity-50"></div>
            <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl pointer-events-none mix-blend-multiply opacity-50"></div>
            
            {/* Floating Load Previous Button */}
            {olderMessages.length > 0 && !loadingHistory && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 w-full flex justify-center pointer-events-none">
                    <button 
                        onClick={handleLoadOlder}
                        className="bg-white/90 backdrop-blur-md text-slate-600 hover:text-indigo-600 text-xs font-bold px-4 py-2 rounded-full transition-all border border-gray-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 pointer-events-auto flex items-center gap-2"
                    >
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Load Previous Messages ({olderMessages.length})
                    </button>
                </div>
            )}

            {/* Chat Area - Fixed Height, Scrollable */}
            <div 
                ref={scrollContainerRef}
                className="flex-1 min-h-0 basis-0 overflow-y-auto px-4 pt-16 pb-4 lg:px-8 lg:pt-16 lg:pb-8 space-y-8 custom-scrollbar relative z-10"
            >
                {loadingHistory ? (
                    <div className="h-full flex flex-col items-center justify-center">
                        <ChatSkeleton />
                    </div>
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

            {/* Input Area - Sticky Bottom within Flex Container */}
            <div className="p-4 lg:p-6 relative z-20 bg-white/40 backdrop-blur-md border-t border-white/50 flex flex-col gap-2 shrink-0">
                
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
    );
};
