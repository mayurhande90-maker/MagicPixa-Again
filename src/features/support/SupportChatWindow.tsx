
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AuthProps, Ticket, AppConfig } from '../../types';
import { sendSupportMessage, createTicket, ChatMessage, analyzeErrorScreenshot } from '../../services/supportService';
import { fileToBase64 } from '../../utils/imageUtils';
import { saveSupportMessage, getSupportHistory, clearSupportChat } from '../../firebase';
import { 
    UploadIcon, 
    PaperAirplaneIcon,
    TrashIcon,
    ArrowDownIcon,
    LifebuoyIcon,
    PlusIcon,
    TicketIcon
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

    // Refs for DOM elements
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (auth.user) {
            loadChatHistory();
        }
    }, [auth.user]);

    // Auto-scroll effect - Always scroll to bottom when messages update
    useEffect(() => {
        if (!loadingHistory && messages.length > 0) {
            scrollToBottom();
        }
    }, [loadingHistory, messages]);

    const scrollToBottom = () => {
        // Use requestAnimationFrame for better timing with layout updates
        requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
    };

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
            // Show button if user is scrolled up more than 200px from bottom
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
            setShowScrollBtn(!isNearBottom);
        }
    };

    const handleNewChat = async () => {
        if (!auth.user) return;
        
        // Confirm first
        if (window.confirm("Start a new support session? This will clear the current conversation.")) {
            setLoadingHistory(true); // Show skeleton immediately to hide old chat/empty state flicker
            setMessages([]);
            setHasInteracted(false);
            
            try {
                await clearSupportChat(auth.user.uid);
            } catch (e) {
                console.error("Failed to clear chat", e);
            }
            
            // Reload to generate welcome message
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
        } catch (e) {
            console.error("Chat history fetch failed", e);
        }

        const userHasHistory = allMessages.some(m => m.role === 'user');
        setHasInteracted(userHasHistory);

        if (allMessages.length === 0) {
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
        scrollToBottom(); // Instant scroll for user message
        
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
                appConfig?.featureCosts || {} // PASS DYNAMIC PRICING HERE
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
            saveSupportMessage(auth.user!.uid, userMsg).catch(e => console.warn("Save failed", e));
            
            setIsTyping(true);

            const analysis = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
            
            // Immediately send analysis prompt
            const response = await sendSupportMessage(
                [...messages, userMsg, { role: 'user', content: `I uploaded an error screenshot. Analysis: ${analysis}`, id: 'sys', timestamp: Date.now() }],
                { name: auth.user!.name, email: auth.user!.email, credits: auth.user!.credits, plan: auth.user!.plan },
                appConfig?.featureCosts || {}
            );
            setMessages(prev => [...prev, response]);
            saveSupportMessage(auth.user!.uid, response).catch(e => console.warn("Save failed", e));
            
            setIsTyping(false);
        }
    };

    return (
        <div className="2xl:col-span-2 flex flex-col h-full min-h-0 bg-white/70 backdrop-blur-2xl rounded-xl sm:rounded-[2rem] shadow-xl border-x-0 border-y-0 sm:border border-white/50 relative overflow-hidden group w-full">
            
            {/* Ambient Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-50/50 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none"></div>

            {/* HEADER BAR (Dedicated non-scrolling area) */}
            <div className="flex-none px-4 py-2 sm:py-3 border-b border-white/20 flex justify-between items-center bg-white/40 backdrop-blur-md z-20 h-14">
                <div className="flex items-center gap-2 text-indigo-900 font-bold opacity-70">
                    <LifebuoyIcon className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider hidden sm:inline">Live Support Chat</span>
                    <span className="text-xs uppercase tracking-wider sm:hidden">Support</span>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* New Chat Button - Moved to Header */}
                    <button 
                        onClick={handleNewChat}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-indigo-100"
                        title="Start a new session (Clears history)"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:inline">New Chat</span>
                        <PlusIcon className="w-5 h-5" />
                    </button>

                    {/* Toggle Sidebar Button for < 2XL screens */}
                    <button 
                        onClick={onToggleSidebar} 
                        className="2xl:hidden p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wide hidden sm:inline">History</span>
                        <TicketIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Chat Scroll Area - Added flex flex-col to parent */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 md:px-8 pt-4 pb-2 space-y-4 sm:space-y-6 custom-scrollbar relative z-10 scroll-smooth flex flex-col overscroll-contain"
            >
                {loadingHistory ? (
                    <div className="flex-1 flex flex-col items-center justify-center h-full">
                        <ChatSkeleton />
                    </div>
                ) : (
                    <>
                        {/* Add margin-top: auto to push content to bottom when sparse */}
                        <div className="flex-1"></div> 
                        
                        {messages.map((msg, index) => (
                            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
                                <div className={`flex items-end gap-2 sm:gap-3 max-w-[95%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    
                                    {/* Avatar */}
                                    <div className="mb-1 hidden sm:block shrink-0">
                                        {msg.role === 'model' ? <PixaBotIcon /> : <UserMessageIcon user={auth.user} />}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full`}>
                                        <div className={`px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-[1.5rem] shadow-sm text-sm leading-relaxed relative border transition-all ${
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
                                            <div className="pl-2 w-full">
                                                <TicketProposalCard 
                                                    draft={msg.ticketDraft} 
                                                    onConfirm={(finalDraft) => handleCreateTicket(finalDraft, msg.id)}
                                                    onCancel={() => handleCancelTicket(msg.id)}
                                                    isSubmitting={submittingTicketId === msg.id}
                                                    isSubmitted={msg.isSubmitted || false}
                                                />
                                            </div>
                                        )}
                                        
                                        <span className={`text-[9px] sm:text-[10px] font-medium mt-1 px-1 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Actions (Contextual - Only on last bot message if no interaction yet) */}
                                {!hasInteracted && index === messages.length - 1 && msg.role === 'model' && (
                                    <div className="w-full mt-4 sm:mt-6 pl-0 sm:pl-14">
                                        <QuickActions onAction={handleQuickAction} className="justify-start" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )}
                
                {isTyping && (
                    <div className="flex items-center gap-3 animate-fadeIn pl-2 mb-2">
                        <div className="hidden sm:block"><PixaBotIcon /></div>
                        <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex gap-1.5 items-center">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
                        </div>
                    </div>
                )}
                
                {/* Minimal Spacer */}
                <div className="h-1"></div>

                <div ref={messagesEndRef} />
            </div>

            {/* Floating Scroll Down Button */}
            {showScrollBtn && (
                <button 
                    onClick={scrollToBottom}
                    className="absolute bottom-20 right-4 sm:right-8 z-40 bg-white shadow-lg border border-gray-100 p-2 sm:p-3 rounded-full text-indigo-600 hover:bg-indigo-50 transition-all animate-bounce-slight"
                >
                    <ArrowDownIcon className="w-5 h-5" />
                </button>
            )}

            {/* Input Area - Fixed at Bottom (COMPACT MODE) */}
            <div className="flex-none p-3 bg-white/95 backdrop-blur-xl border-t border-gray-200 relative z-20">
                
                {hasInteracted && !loadingHistory && !isTyping && (
                    <div className="mb-3 overflow-x-auto pb-1 no-scrollbar">
                        <QuickActions onAction={handleQuickAction} className="flex-nowrap" />
                    </div>
                )}
                
                <div className="flex gap-2 items-end bg-white border border-gray-200 p-2 rounded-[1.5rem] shadow-sm focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300 transition-all">
                    
                    {/* Attachment Button */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors shrink-0"
                        title="Attach Screenshot"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    
                    <textarea 
                        ref={inputFocusRef}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-medium text-slate-800 placeholder-gray-400 resize-none py-2.5 max-h-24"
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
                        className={`p-2 rounded-full transition-all shrink-0 shadow-sm ${
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
