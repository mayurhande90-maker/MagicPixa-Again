
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
    CreditCoinIcon
} from '../components/icons';

// Simple Card Component
const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const date = ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Just now';
    
    const statusColors = {
        open: 'bg-yellow-100 text-yellow-700',
        resolved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700'
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[ticket.status]}`}>
                    {ticket.status}
                </span>
                <span className="text-xs text-gray-400">{date}</span>
            </div>
            <h4 className="font-bold text-gray-800 text-sm mb-1">{ticket.subject}</h4>
            <p className="text-xs text-gray-500 line-clamp-2">{ticket.description}</p>
            {ticket.adminReply && (
                <div className="mt-3 bg-gray-50 p-2 rounded-lg border-l-2 border-indigo-500">
                    <p className="text-[10px] font-bold text-indigo-600 mb-1">Support Reply:</p>
                    <p className="text-xs text-gray-700">{ticket.adminReply}</p>
                </div>
            )}
        </div>
    );
};

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

        // Filter transactions to show only deductions (cost > 0) for refunds
        setRecentTransactions(txs.filter(t => (t.cost > 0 || t.feature.includes('Generation'))).slice(0, 5));
        setMyTickets(tix);
    };

    const handleInitialSubmit = async () => {
        if (!userQuery.trim()) return;
        setStep('analyzing');
        try {
            const result = await analyzeSupportIntent(userQuery);
            setIntent(result.category);
            setDescription(userQuery); // Pre-fill description
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
            
            // Auto-analyze error if it's a bug report
            if (intent === 'bug') {
                const errorDesc = await analyzeErrorScreenshot(base64.base64, base64.mimeType);
                setDescription(prev => prev + `\n\n[AI Analysis of Screenshot]: ${errorDesc}`);
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
                screenshotUrl: screenshot?.base64 // In a real app, upload to Storage first. Here storing base64 for simplicity or omitting if too large.
            });

            setStep('success');
            loadHistory(); // Refresh list
        } catch (e) {
            alert("Failed to submit ticket.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen pb-24 animate-fadeIn">
            
            {/* Header */}
            <div className="mb-10 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LifebuoyIcon className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Support Center</h1>
                <p className="text-gray-500 mt-2">How can we help you today?</p>
            </div>

            {/* Main Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT: WIZARD AREA */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Step 1: Initial Input */}
                    {step === 'initial' && (
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Describe your issue</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full p-4 pr-12 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none transition-all text-lg"
                                    placeholder="e.g. I didn't get my image, or I found a bug..."
                                    value={userQuery}
                                    onChange={(e) => setUserQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInitialSubmit()}
                                />
                                <button 
                                    onClick={handleInitialSubmit}
                                    disabled={!userQuery.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    <ArrowRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="mt-4 flex gap-2 overflow-x-auto">
                                <span className="text-xs font-bold text-gray-400 uppercase self-center mr-2">Suggestions:</span>
                                {['Failed Generation', 'Billing Issue', 'Feature Request'].map(tag => (
                                    <button 
                                        key={tag} 
                                        onClick={() => setUserQuery(tag)} 
                                        className="px-3 py-1 bg-gray-50 rounded-full text-xs text-gray-600 hover:bg-gray-100 border border-gray-200"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Analyzing Animation */}
                    {step === 'analyzing' && (
                        <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                            <SparklesIcon className="w-12 h-12 text-purple-500 animate-spin-slow mb-4" />
                            <h3 className="text-lg font-bold text-gray-800">Analyzing Request...</h3>
                            <p className="text-sm text-gray-500">Pixa is categorizing your issue.</p>
                        </div>
                    )}

                    {/* Step 3: Specific Form */}
                    {step === 'form' && (
                        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm animate-fadeIn">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    {intent === 'refund' && <span className="p-2 bg-yellow-100 text-yellow-700 rounded-lg"><CreditCoinIcon className="w-5 h-5"/></span>}
                                    {intent === 'bug' && <span className="p-2 bg-red-100 text-red-700 rounded-lg"><XIcon className="w-5 h-5"/></span>}
                                    {intent === 'general' && <span className="p-2 bg-blue-100 text-blue-700 rounded-lg"><LifebuoyIcon className="w-5 h-5"/></span>}
                                    {intent === 'refund' ? 'Claim Refund' : intent === 'bug' ? 'Report Bug' : 'General Support'}
                                </h2>
                                <button onClick={() => setStep('initial')} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                            </div>

                            {intent === 'refund' && (
                                <div className="mb-6">
                                    <p className="text-sm text-gray-600 mb-3">Which transaction failed?</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar border rounded-xl p-2">
                                        {recentTransactions.map(tx => (
                                            <button 
                                                key={tx.id}
                                                onClick={() => setSelectedTx(tx.id)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center ${selectedTx === tx.id ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">{tx.feature}</p>
                                                    <p className="text-[10px] text-gray-500">{tx.date?.toDate().toLocaleString()}</p>
                                                </div>
                                                <span className="text-xs font-bold text-red-500">-{tx.cost} Credits</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Details</label>
                                <textarea 
                                    className="w-full p-4 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-sm min-h-[120px]"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide more info..."
                                />
                            </div>

                            {intent === 'bug' && (
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Screenshot (Optional)</label>
                                    <div className="flex items-center gap-4">
                                        {screenshot ? (
                                            <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={screenshot.url} className="w-full h-full object-cover" />
                                                <button onClick={() => setScreenshot(null)} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><XIcon className="w-3 h-3"/></button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                                <UploadIcon className="w-4 h-4 text-gray-500"/>
                                                <span className="text-sm font-medium text-gray-600">Upload Image</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            )}

                            <button 
                                onClick={handleSubmitTicket}
                                disabled={loading || (intent === 'refund' && !selectedTx)}
                                className="w-full py-3 bg-[#1A1A1E] text-white rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="bg-green-50 p-12 rounded-3xl border border-green-100 flex flex-col items-center justify-center min-h-[300px] text-center">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-green-900">Request Received</h3>
                            <p className="text-sm text-green-700 mt-2 max-w-xs">We'll notify you here when there's an update. Refunds are usually processed within 24 hours.</p>
                            <button onClick={() => setStep('initial')} className="mt-6 text-sm font-bold text-green-800 underline">Start New Request</button>
                        </div>
                    )}

                </div>

                {/* RIGHT: HISTORY */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-50 rounded-3xl p-6 h-full border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <TicketIcon className="w-5 h-5 text-gray-500"/> My Tickets
                        </h3>
                        
                        <div className="space-y-3">
                            {myTickets.length > 0 ? (
                                myTickets.map(ticket => (
                                    <TicketCard key={ticket.id} ticket={ticket} />
                                ))
                            ) : (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    No active tickets.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
