import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, Ticket } from '../../types';
import { getAllTickets, resolveTicket } from '../../services/supportService';
import { sendSystemNotification, getCreationById } from '../../firebase';
import { LifebuoyIcon, ChatBubbleLeftIcon, ImageIcon, FilterIcon, AdjustmentsVerticalIcon, XIcon } from '../icons';
import { AdminImageViewer } from './AdminImageViewer';

interface AdminSupportProps {
    auth: AuthProps;
}

export const AdminSupport: React.FC<AdminSupportProps> = ({ auth }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [replyText, setReplyText] = useState('');
    const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Filter States
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'rejected'>('open');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const tix = await getAllTickets();
            setTickets(tix);
        } catch(e) { console.error(e); }
        setIsLoading(false);
    };

    const handleViewGeneratedImage = async (userId: string, creationId: string) => {
        if (!creationId) {
            alert("No Creation ID available.");
            return;
        }
        try {
            const creation = await getCreationById(userId, creationId);
            if (creation && creation.imageUrl) {
                setViewingImage(creation.imageUrl);
            } else {
                alert("Image not found. It may have been deleted.");
            }
        } catch (e: any) {
            console.error("Failed to fetch image", e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: Admin cannot read user creations. Check Firestore rules.");
            } else {
                alert("Error loading image. " + e.message);
            }
        }
    };

    const handleResolveTicket = async (ticket: Ticket, action: 'resolved' | 'rejected') => {
        if(!auth.user) return;
        setProcessingTicketId(ticket.id);
        try {
            const finalReply = replyText || (action === 'resolved' ? 'Your issue has been resolved.' : 'We could not verify your claim.');
            const shouldRefund = action === 'resolved' && ticket.type === 'refund' && ticket.refundAmount;
            
            await resolveTicket(auth.user.uid, ticket.id, action, finalReply, shouldRefund ? ticket.refundAmount : undefined);
            
            await sendSystemNotification(
                auth.user.uid,
                ticket.userId,
                action === 'resolved' ? 'Ticket Resolved' : 'Ticket Update',
                finalReply,
                action === 'resolved' ? 'success' : 'warning',
                'modal'
            );

            loadTickets();
            setReplyText('');
            alert(`Ticket ${action}. ${shouldRefund ? `Refunded ${ticket.refundAmount} credits.` : ''}`);
        } catch(e: any) {
            alert("Error resolving ticket: " + e.message);
        } finally {
            setProcessingTicketId(null);
        }
    };

    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            // 1. Status Filter
            if (statusFilter !== 'all' && t.status !== statusFilter) return false;
            
            // 2. Type Filter
            if (typeFilter !== 'all' && t.type !== typeFilter) return false;
            
            // 3. Date Filter
            if (dateFilter) {
                const ticketDate = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
                if (ticketDate.toISOString().split('T')[0] !== dateFilter) return false;
            }
            
            return true;
        });
    }, [tickets, statusFilter, typeFilter, dateFilter]);

    const formatTableDate = (timestamp: any) => { if (!timestamp) return '-'; try { const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp); return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return '-'; } };

    const clearFilters = () => {
        setStatusFilter('all');
        setTypeFilter('all');
        setDateFilter('');
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header Controls & Filtering Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><LifebuoyIcon className="w-5 h-5"/></div>
                        <div>
                            <h3 className="font-bold text-gray-800">Support Inbox</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{filteredTickets.length} Tickets Found</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Switcher */}
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                            {(['all', 'open', 'resolved', 'rejected'] as const).map((s) => (
                                <button 
                                    key={s} 
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${
                                        statusFilter === s 
                                        ? 'bg-indigo-600 text-white shadow-sm' 
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        <div className="h-6 w-px bg-gray-300 mx-1"></div>

                        {/* Category Dropdown */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <AdjustmentsVerticalIcon className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <select 
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-600 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                            >
                                <option value="all">All Categories</option>
                                <option value="bug">Bugs</option>
                                <option value="refund">Refunds</option>
                                <option value="feature">Feature Requests</option>
                                <option value="general">General</option>
                            </select>
                        </div>

                        {/* Date Selection */}
                        <div className="relative">
                            <input 
                                type="date" 
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-600 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            />
                        </div>

                        {(statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
                            <button 
                                onClick={clearFilters}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                title="Clear Filters"
                            >
                                <XIcon className="w-4 h-4"/>
                            </button>
                        )}

                        <button onClick={loadTickets} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors">Refresh</button>
                    </div>
                </div>
                
                <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            Fetching tickets from HQ...
                        </div>
                    ) : filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                        <div key={ticket.id} className={`p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6 ${ticket.status === 'open' ? 'bg-white' : 'bg-gray-50/50 opacity-80'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${
                                        ticket.type === 'refund' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                        ticket.type === 'bug' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                        'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>{ticket.type}</span>
                                    
                                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                    
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{formatTableDate(ticket.createdAt)}</span>
                                    
                                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>

                                    <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{ticket.userEmail}</span>
                                    
                                    {ticket.status !== 'open' && (
                                        <span className={`ml-auto px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                            ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {ticket.status}
                                        </span>
                                    )}
                                </div>
                                <h4 className="font-bold text-gray-900 mb-1">{ticket.subject}</h4>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                                
                                {ticket.refundAmount && ticket.status === 'open' && (
                                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                                        <span className="text-[10px] font-black text-green-700 uppercase">Auto-Refund Eligible: {ticket.refundAmount} Credits</span>
                                    </div>
                                )}

                                {(ticket as any).relatedTransactionId && (
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => handleViewGeneratedImage(ticket.userId, (ticket as any).relatedTransactionId)}
                                            className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-100 transition-all hover:scale-[1.02]"
                                        >
                                            <ImageIcon className="w-4 h-4"/> View Context Image
                                        </button>
                                    </div>
                                )}

                                {ticket.status !== 'open' && ticket.adminReply && (
                                    <div className="mt-4 bg-gray-100/50 p-4 rounded-xl border-l-4 border-indigo-500 text-xs text-gray-600">
                                        <span className="font-black text-indigo-900 uppercase tracking-widest block mb-2 text-[9px]">Decision Record</span> 
                                        <p className="font-medium italic leading-relaxed">"{ticket.adminReply}"</p>
                                    </div>
                                )}
                            </div>

                            {ticket.status === 'open' && (
                                <div className="w-full md:w-64 shrink-0 flex flex-col gap-3 animate-fadeIn">
                                    <textarea 
                                        placeholder="Enter agent resolution notes..."
                                        className="w-full p-3 border border-gray-200 rounded-xl text-xs h-24 resize-none focus:border-indigo-500 outline-none transition-all shadow-inner bg-gray-50 focus:bg-white"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                        {ticket.type === 'refund' && ticket.refundAmount ? (
                                            <button 
                                                onClick={() => handleResolveTicket(ticket, 'resolved')}
                                                disabled={processingTicketId === ticket.id}
                                                className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Approve Refund
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleResolveTicket(ticket, 'resolved')}
                                                disabled={processingTicketId === ticket.id}
                                                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleResolveTicket(ticket, 'rejected')}
                                            disabled={processingTicketId === ticket.id}
                                            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-50 hover:text-red-600 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="p-20 text-center text-gray-400">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                                <ChatBubbleLeftIcon className="w-10 h-10 text-gray-300" />
                            </div>
                            <h4 className="font-bold text-gray-500">Inbox is Clear</h4>
                            <p className="text-xs mt-1">No tickets match your current filters.</p>
                            {(statusFilter !== 'all' || typeFilter !== 'all' || dateFilter) && (
                                <button onClick={clearFilters} className="mt-4 text-xs font-bold text-indigo-600 hover:underline">Reset Filters</button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {viewingImage && <AdminImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
        </div>
    );
};
