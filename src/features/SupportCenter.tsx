
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, Transaction, Ticket } from '../types';
import { analyzeSupportIntent, createTicket, getUserTickets, analyzeErrorScreenshot } from '../services/supportService';
import { getCreditHistory } from '../firebase';
import { fileToBase64 } from '../utils/imageUtils';
import { 
    LifebuoyIcon, 
    SparklesIcon, 
    CheckIcon, 
    XIcon, 
    TicketIcon, 
    UploadIcon,
    ArrowRightIcon,
    CreditCoinIcon,
    ShieldCheckIcon,
    ChatBubbleLeftIcon
} from '../components/icons';

// --- Premium UI Components ---

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles = {
        open: 'bg-amber-50 text-amber-700 border-amber-100',
        resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        rejected: 'bg-red-50 text-red-700 border-red-100'
    };
    const s = styles[status as keyof typeof styles] || styles.open;

    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${s} flex items-center gap-1.5`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'open' ? 'bg-amber-500 animate-pulse' : status === 'resolved' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            {status}
        </span>
    );
};

const TicketItem: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const date = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now';
    
    return (
        <div className="group p-5 rounded-2xl bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
                <StatusBadge status={ticket.status} />
                <span className="text-xs font-medium text-gray-400">{date}</span>
            </div>
            <h4 className="font-bold text-gray-900 text-sm mb-2 group-hover:text-indigo-700 transition-colors">{ticket.subject}</h4>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{ticket.description}</p>
            
            {ticket.adminReply && (
                <div className="mt-4 pt-3 border-t border-gray-50 flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                        <SparklesIcon className="w-3 h-3 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pixa Support</p>
                        <p className="text-xs text-gray-700 font-medium bg-gray-50 p-2 rounded-lg rounded-tl-none">{ticket.adminReply}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const TransactionOption: React.FC<{ 
    transaction: Transaction; 
    selected: boolean; 
    onClick: () => void; 
}> = ({ transaction, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`w-full text-left p-4 rounded-xl border transition-all duration-300 flex items-center justify-between group ${
            selected 
            ? 'bg-amber-50 border-amber-200 shadow-md shadow-amber-100' 
            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
    >
        <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selected ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm'}`}>
                <CreditCoinIcon className="w-5 h-5" />
            </div>
            <div>
                <p className={`text-sm font-bold ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{transaction.feature}</p>
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                    {transaction.date?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
        <div className={`px-3 py-1 rounded-lg text-xs font-bold ${selected ? 'bg-white text-red-500 shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
            -{transaction.cost} CR
        </div>
    </button>
);

export const SupportCenter: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    // State for Wizard
    const [step, setStep] = useState<'initial' | 'analyzing' | 'form' | 'success'>('initial');
    const [intent, setIntent] = useState<'refund' | 'bug' | 'general' | null>(null);
    const [userQuery, setUserQuery] = useState('');
    
    // Data
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [myTickets, setMyTickets] = useState<Ticket[]>([]);
    
    // Form Data
    const [selectedTx, setSelectedTx] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [screenshot, setScreenshot] = useState<{url: string, base64: string} | null>(null);
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (auth.user) {
            loadHistory();
        }
    }, [auth.user]);

    const loadHistory = async () => {
        if (!auth.user) return;
        const [txsData, tix] = await Promise.all([
            getCreditHistory(auth.user.uid),
            getUserTickets(auth.user.uid)
        ]);
        
        const txs = txsData as Transaction[];
        // Filter transactions to show only deductions
        setRecentTransactions(txs.filter(t => (t.cost > 0 || t.feature.includes('Generation'))).slice(0, 5));
        setMyTickets(tix);
    };

    const handleInitialSubmit = async () => {
        if (!userQuery.trim()) return;
        setStep('analyzing');
        try {
            const result = await analyzeSupportIntent(userQuery);
            setIntent(result.category);
            setDescription(userQuery); 
            setStep('form');
        } catch (e) {
            setIntent('general');
            setStep('form');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setScreenshot({ url: URL.createObjectURL(file), base64: base64.base64 });
            
            if (intent === 'bug') {
                const errorDesc = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
                setDescription(prev => prev + `\n\n[AI Analysis]: ${errorDesc}`);
            }
        }
    };

    const handleSubmitTicket = async () => {
        if (!auth.user) return;
        setLoading(true);
        try {
            let subject = '';
            let refundAmount = 0;

            if (intent === 'refund') {
                const tx = recentTransactions.find(t => t.id === selectedTx);
                subject = `Refund Claim: ${tx?.feature || 'Unknown Feature'}`;
                refundAmount = tx?.cost || 0;
            } else if (intent === 'bug') {
                subject = `Bug Report: ${userQuery.substring(0, 30)}...`;
            } else {
                subject = `Inquiry: ${userQuery.substring(0, 30)}...`;
            }

            await createTicket(auth.user.uid, auth.user.email, {
                type: intent || 'general',
                subject,
                description,
                relatedTransactionId: selectedTx || undefined,
                refundAmount: refundAmount > 0 ? refundAmount : undefined,
                screenshotUrl: screenshot?.base64
            });

            setStep('success');
            loadHistory();
        } catch (e) {
            console.error("Ticket submission error:", e);
            alert("Failed to submit ticket. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const resetWizard = () => {
        setStep('initial');
        setIntent(null);
        setUserQuery('');
        setDescription('');
        setSelectedTx(null);
        setScreenshot(null);
    };

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Premium Header Background - Unified Max Width */}
            <div className="bg-white border-b border-gray-200 pt-12 pb-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-indigo-50/50 to-purple-50/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-t from-blue-50/50 to-cyan-50/50 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest mb-6 shadow-sm">
                        <LifebuoyIcon className="w-3.5 h-3.5" />
                        Pixa Concierge
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">How can we help you, {auth.user?.name.split(' ')[0]}?</h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
                        Our AI agents are ready to resolve issues, process refunds, and answer questions instantly.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 -mt-12 pb-24">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT COLUMN: INTERACTIVE WIZARD (8 cols) */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden min-h-[500px] relative transition-all duration-500">
                            
                            {/* INITIAL STATE */}
                            {step === 'initial' && (
                                <div className="p-8 md:p-12 flex flex-col h-full animate-fadeIn">
                                    <div className="flex-1 flex flex-col justify-center">
                                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 ml-1">Describe your issue</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                                            <div className="relative bg-white rounded-2xl shadow-xl shadow-indigo-100/50 flex items-center p-2 border border-gray-100 group-hover:border-indigo-200 transition-colors">
                                                <div className="pl-4 text-gray-400">
                                                    <ChatBubbleLeftIcon className="w-6 h-6" />
                                                </div>
                                                <input 
                                                    type="text" 
                                                    className="w-full p-4 bg-transparent outline-none text-lg text-gray-800 placeholder-gray-400 font-medium"
                                                    placeholder="e.g. My image didn't generate but credits were taken..."
                                                    value={userQuery}
                                                    onChange={(e) => setUserQuery(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleInitialSubmit()}
                                                    autoFocus
                                                />
                                                <button 
                                                    onClick={handleInitialSubmit}
                                                    disabled={!userQuery.trim()}
                                                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none transform active:scale-95"
                                                >
                                                    <ArrowRightIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Common Topics</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['I need a refund', 'Found a bug', 'Feature request', 'Billing help'].map(tag => (
                                                    <button 
                                                        key={tag} 
                                                        onClick={() => setUserQuery(tag)} 
                                                        className="px-4 py-2 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 rounded-xl text-xs font-bold text-gray-600 transition-all"
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-8 border-t border-gray-50 flex items-center gap-3 text-gray-400 text-xs font-medium">
                                        <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                                        <span>AI-Powered Categorization • Instant Refund Checks</span>
                                    </div>
                                </div>
                            )}

                            {/* ANALYZING STATE */}
                            {step === 'analyzing' && (
                                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-12 text-center animate-fadeIn">
                                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                                        <div className="absolute inset-0 border-4 border-indigo-100 rounded-full border-t-indigo-500 animate-spin"></div>
                                        <SparklesIcon className="w-8 h-8 text-indigo-600 animate-pulse" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Analyzing Request</h3>
                                    <p className="text-gray-500">Pixa is identifying the best solution for you...</p>
                                </div>
                            )}

                            {/* FORM STATE */}
                            {step === 'form' && (
                                <div className="p-8 md:p-12 animate-fadeIn h-full overflow-y-auto custom-scrollbar">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-xl ${intent === 'refund' ? 'bg-amber-100 text-amber-600' : intent === 'bug' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {intent === 'refund' ? <CreditCoinIcon className="w-6 h-6"/> : intent === 'bug' ? <XIcon className="w-6 h-6"/> : <LifebuoyIcon className="w-6 h-6"/>}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">{intent === 'refund' ? 'Claim Refund' : intent === 'bug' ? 'Report Issue' : 'General Inquiry'}</h2>
                                                <p className="text-xs text-gray-500 font-medium">Pixa categorized this as <b>{intent}</b></p>
                                            </div>
                                        </div>
                                        <button onClick={resetWizard} className="text-xs font-bold text-gray-400 hover:text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">Start Over</button>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Refund Specific: Transaction Selector */}
                                        {intent === 'refund' && (
                                            <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Select Failed Transaction</label>
                                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                                    {recentTransactions.map(tx => (
                                                        <TransactionOption 
                                                            key={tx.id} 
                                                            transaction={tx} 
                                                            selected={selectedTx === tx.id} 
                                                            onClick={() => setSelectedTx(tx.id)} 
                                                        />
                                                    ))}
                                                    {recentTransactions.length === 0 && <p className="text-sm text-gray-500 italic">No recent deductible transactions found.</p>}
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Details */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Additional Details</label>
                                            <textarea 
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-gray-700 min-h-[140px] resize-none transition-all shadow-sm"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder={intent === 'bug' ? "What steps reproduce the bug?" : "Provide any extra context..."}
                                            />
                                        </div>

                                        {/* Bug Specific: Screenshot */}
                                        {intent === 'bug' && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Attach Evidence</label>
                                                {screenshot ? (
                                                    <div className="relative inline-block group">
                                                        <img src={screenshot.url} className="h-32 rounded-xl border border-gray-200 shadow-sm" />
                                                        <button onClick={() => setScreenshot(null)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full shadow-md border border-gray-100 hover:scale-110 transition-transform"><XIcon className="w-4 h-4"/></button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all group">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <UploadIcon className="w-8 h-8 text-gray-300 group-hover:text-indigo-400 mb-2 transition-colors" />
                                                            <p className="text-xs text-gray-500 font-bold group-hover:text-gray-700">Click to upload screenshot</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                                    </label>
                                                )}
                                            </div>
                                        )}

                                        <button 
                                            onClick={handleSubmitTicket}
                                            disabled={loading || (intent === 'refund' && !selectedTx)}
                                            className="w-full py-4 bg-[#1A1A1E] text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transform active:scale-95"
                                        >
                                            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><TicketIcon className="w-5 h-5" /> Submit Ticket</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* SUCCESS STATE */}
                            {step === 'success' && (
                                <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-12 text-center animate-fadeIn">
                                    <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-8 shadow-inner animate-bounce-slight">
                                        <CheckIcon className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h3 className="text-3xl font-bold text-gray-900 mb-4">Request Received</h3>
                                    <div className="bg-gray-50 px-6 py-4 rounded-xl border border-gray-100 max-w-sm mx-auto mb-8">
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            We have logged your ticket. 
                                            {intent === 'refund' ? " Refund requests are prioritized and typically resolved within 24 hours." : " Our team will review this shortly."}
                                        </p>
                                    </div>
                                    <button onClick={resetWizard} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline decoration-2 underline-offset-4">Start New Request</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: HISTORY (4 cols) */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 h-full p-6 lg:p-8 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <TicketIcon className="w-5 h-5 text-indigo-500"/> Activity
                                </h3>
                                <div className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{myTickets.length}</div>
                            </div>
                            
                            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 -mx-2 px-2 max-h-[600px]">
                                {myTickets.length > 0 ? (
                                    myTickets.map(ticket => (
                                        <TicketItem key={ticket.id} ticket={ticket} />
                                    ))
                                ) : (
                                    <div className="text-center py-20 opacity-50">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <TicketIcon className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-400">No ticket history</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
