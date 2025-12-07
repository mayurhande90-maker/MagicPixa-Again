
import React, { useState, useEffect } from 'react';
import { AuthProps, Ticket } from '../../types';
import { getAllTickets, resolveTicket } from '../../services/supportService';
import { sendSystemNotification, getCreationById } from '../../firebase';
import { LifebuoyIcon, ChatBubbleLeftIcon, ImageIcon } from '../icons';
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

    const formatTableDate = (timestamp: any) => { if (!timestamp) return '-'; try { const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp); return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return '-'; } };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><LifebuoyIcon className="w-5 h-5"/></div>
                    <h3 className="font-bold text-gray-800">Support Inbox ({tickets.filter(t => t.status === 'open').length} Open)</h3>
                </div>
                <button onClick={loadTickets} className="text-sm text-blue-600 font-bold hover:underline">Refresh</button>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
                {isLoading ? (
                    <div className="p-12 text-center text-gray-400">Loading tickets...</div>
                ) : tickets.length > 0 ? tickets.map(ticket => (
                    <div key={ticket.id} className={`p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6 ${ticket.status === 'open' ? 'bg-white' : 'bg-gray-50/50 opacity-80'}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                                    ticket.type === 'refund' ? 'bg-yellow-100 text-yellow-700' : 
                                    ticket.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>{ticket.type}</span>
                                <span className="text-xs text-gray-400">{formatTableDate(ticket.createdAt)}</span>
                                <span className="text-xs font-bold text-gray-700">{ticket.userEmail}</span>
                            </div>
                            <h4 className="font-bold text-gray-900 mb-1">{ticket.subject}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                            
                            {ticket.refundAmount && ticket.status === 'open' && (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-xs font-bold text-green-700">Requested Refund: {ticket.refundAmount} Credits</span>
                                </div>
                            )}

                            {(ticket as any).relatedTransactionId && (
                                <div className="mt-3">
                                    <button 
                                        onClick={() => handleViewGeneratedImage(ticket.userId, (ticket as any).relatedTransactionId)}
                                        className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-100"
                                    >
                                        <ImageIcon className="w-4 h-4"/> View Generated Image
                                    </button>
                                </div>
                            )}

                            {ticket.status !== 'open' && ticket.adminReply && (
                                <div className="mt-3 bg-gray-100 p-3 rounded-lg border-l-4 border-gray-300 text-xs text-gray-600">
                                    <span className="font-bold block mb-1">Reply:</span> {ticket.adminReply}
                                </div>
                            )}
                        </div>

                        {ticket.status === 'open' && (
                            <div className="w-full md:w-64 shrink-0 flex flex-col gap-3">
                                <textarea 
                                    placeholder="Write a reply..."
                                    className="w-full p-2 border border-gray-200 rounded-lg text-sm h-20 resize-none focus:border-indigo-500 outline-none"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    {ticket.type === 'refund' && ticket.refundAmount ? (
                                        <button 
                                            onClick={() => handleResolveTicket(ticket, 'resolved')}
                                            disabled={processingTicketId === ticket.id}
                                            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"
                                        >
                                            Refund & Close
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleResolveTicket(ticket, 'resolved')}
                                            disabled={processingTicketId === ticket.id}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
                                        >
                                            Resolve
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleResolveTicket(ticket, 'rejected')}
                                        disabled={processingTicketId === ticket.id}
                                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-red-100 hover:text-red-600"
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="p-12 text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ChatBubbleLeftIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        No tickets found.
                    </div>
                )}
            </div>
            {viewingImage && <AdminImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
        </div>
    );
};
