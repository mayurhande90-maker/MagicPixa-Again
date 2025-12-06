
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { AuthProps, Ticket } from '../types';
import { sendSupportMessage, createTicket, getUserTickets, ChatMessage, analyzeErrorScreenshot } from '../services/supportService';
import { fileToBase64 } from '../utils/imageUtils';
import { saveSupportMessage, getSupportHistory } from '../firebase';
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
    UserIcon,
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
    const [editedDraft, setEditedDraft] = useState(draft);

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

const PixaBotIcon = () => (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-sm overflow-hidden p-1">
         <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 32 32">
            <g fill="none">
                <g filter="url(#f2864id1b)">
                    <path fill="url(#f2864id1z)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id0)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id1)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id2)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id3)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id4)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id5)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id6)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id7)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id8)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                    <path fill="url(#f2864id9)" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                </g>
                <path fill="url(#f2864ida)" d="M2.063 29.955c0-1.969.39-6.76 3.216-9.86C8.81 16.222 13.793 15.643 16 15.643c2.207 0 7.19.579 10.721 4.454c2.826 3.1 3.216 7.89 3.216 9.859H2.063Z"/>
                <path fill="url(#f2864idb)" d="M2.063 29.955c0-1.969.39-6.76 3.216-9.86C8.81 16.222 13.793 15.643 16 15.643c2.207 0 7.19.579 10.721 4.454c2.826 3.1 3.216 7.89 3.216 9.859H2.063Z"/>
                <g filter="url(#f2864id1c)">
                    <path fill="url(#f2864id20)" d="M3.344 29.955c0-1.887.355-6.479 2.92-9.45c3.207-3.715 7.732-4.269 9.736-4.269c2.004 0 6.529.554 9.736 4.269c2.565 2.971 2.92 7.563 2.92 9.45H3.344Z"/>
                </g>
                <path fill="url(#f2864idc)" d="M16.031 15.638c-6.228 0-11.584 4.188-11.992 14.281v.036h23.984v-.036c-.408-10.093-5.764-14.28-11.992-14.28Z"/>
                <path fill="url(#f2864idd)" d="M16.031 15.638c-6.228 0-11.584 4.188-11.992 14.281v.036h23.984v-.036c-.408-10.093-5.764-14.28-11.992-14.28Z"/>
                <path fill="#4E9EFF" d="M23.68 18.468v11.487h4.343v-.036c-.22-5.447-1.881-9.174-4.343-11.451Z"/>
                <path fill="url(#f2864id21)" d="M23.68 18.468v11.487h4.343v-.036c-.22-5.447-1.881-9.174-4.343-11.451Z"/>
                <path fill="url(#f2864ide)" d="M23.68 18.468v11.487h4.343v-.036c-.22-5.447-1.881-9.174-4.343-11.451Z"/>
                <path fill="url(#f2864idf)" d="M23.68 18.468v11.487h4.343v-.036c-.22-5.447-1.881-9.174-4.343-11.451Z"/>
                <path fill="url(#f2864id22)" d="M8.383 18.468v11.487H4.039v-.036c.22-5.447 1.882-9.174 4.344-11.451Z"/>
                <path fill="url(#f2864idg)" d="M8.383 18.468v11.487H4.039v-.036c.22-5.447 1.882-9.174 4.344-11.451Z"/>
                <path fill="url(#f2864idh)" d="M8.383 18.468v11.487H4.039v-.036c.22-5.447 1.882-9.174 4.344-11.451Z"/>
                <path fill="url(#f2864idi)" d="M8.383 18.468v11.487H4.039v-.036c.22-5.447 1.882-9.174 4.344-11.451Z"/>
                <g filter="url(#f2864id1d)">
                    <path fill="#2F63D5" d="M12.874 23.42a.885.885 0 0 0-.762 1.333l2.143 3.638a1.49 1.49 0 0 0 2.568 0l2.142-3.638a.885.885 0 0 0-.762-1.334h-5.329Z"/>
                </g>
                <g filter="url(#f2864id1e)">
                    <path fill="url(#f2864id23)" d="M13.13 22.997a.95.95 0 0 0-.818 1.433l2.302 3.907a1.6 1.6 0 0 0 2.757 0l2.301-3.907a.95.95 0 0 0-.819-1.433h-5.722Z"/>
                    <path fill="url(#f2864id24)" d="M13.13 22.997a.95.95 0 0 0-.818 1.433l2.302 3.907a1.6 1.6 0 0 0 2.757 0l2.301-3.907a.95.95 0 0 0-.819-1.433h-5.722Z"/>
                </g>
                <path fill="url(#f2864idj)" d="M13.13 22.997a.95.95 0 0 0-.818 1.433l2.302 3.907a1.6 1.6 0 0 0 2.757 0l2.301-3.907a.95.95 0 0 0-.819-1.433h-5.722Z"/>
                <g filter="url(#f2864id1f)">
                    <ellipse cx="15.708" cy="20.263" fill="#2F62B7" rx="1.048" ry="1.055"/>
                </g>
                <g filter="url(#f2864id1g)">
                    <path fill="url(#f2864id25)" d="m15.992 20.435l-5.04-3.023c-.323-.2-.663-.512-.663-.98c0-.497.585-.533.885-.544l4.818-.078l4.819.078c.3.01.884.047.884.543c0 .469-.34.781-.663.98l-5.04 3.024Z"/>
                    <path fill="url(#f2864idk)" d="m15.992 20.435l-5.04-3.023c-.323-.2-.663-.512-.663-.98c0-.497.585-.533.885-.544l4.818-.078l4.819.078c.3.01.884.047.884.543c0 .469-.34.781-.663.98l-5.04 3.024Z"/>
                    <path fill="url(#f2864idl)" d="m15.992 20.435l-5.04-3.023c-.323-.2-.663-.512-.663-.98c0-.497.585-.533.885-.544l4.818-.078l4.819.078c.3.01.884.047.884.543c0 .469-.34.781-.663.98l-5.04 3.024Z"/>
                    <path fill="url(#f2864idm)" d="m15.992 20.435l-5.04-3.023c-.323-.2-.663-.512-.663-.98c0-.497.585-.533.885-.544l4.818-.078l4.819.078c.3.01.884.047.884.543c0 .469-.34.781-.663.98l-5.04 3.024Z"/>
                </g>
                <ellipse cx="15.992" cy="20.17" fill="url(#f2864idn)" rx="1.048" ry="1.055"/>
                <ellipse cx="15.992" cy="20.17" fill="url(#f2864ido)" rx="1.048" ry="1.055"/>
                <rect width="4.109" height="5.399" x="13.933" y="13.298" fill="url(#f2864idp)" rx="2.055"/>
                <path fill="url(#f2864id26)" d="M16.386 15.353c.25.01.51.03.77.05c-.26-.02-.51-.04-.77-.05Z"/>
                <path fill="url(#f2864id27)" d="M16.056 15.353h-.04c.1 0 .19 0 .29.01c-.08-.01-.17-.01-.25-.01Z"/>
                <g filter="url(#f2864id1h)">
                    <path fill="url(#f2864id28)" d="M11.302 12.182a1.61 1.61 0 1 0 0-3.218a1.61 1.61 0 0 0 0 3.218Z"/>
                </g>
                <g filter="url(#f2864id1i)">
                    <path fill="url(#f2864idq)" d="M20.815 12.182a1.61 1.61 0 1 0 0-3.218a1.61 1.61 0 0 0 0 3.218Z"/>
                    <path fill="url(#f2864idr)" d="M20.815 12.182a1.61 1.61 0 1 0 0-3.218a1.61 1.61 0 0 0 0 3.218Z"/>
                </g>
                <g filter="url(#f2864id1j)">
                    <path fill="#F6BCA5" d="M20.815 11.647a1.074 1.074 0 1 0 0-2.148a1.074 1.074 0 0 0 0 2.148Z"/>
                    <path fill="url(#f2864ids)" d="M20.815 11.647a1.074 1.074 0 1 0 0-2.148a1.074 1.074 0 0 0 0 2.148Z"/>
                </g>
                <g filter="url(#f2864id1k)">
                    <path fill="#C58C80" d="M11.32 11.647a1.074 1.074 0 1 0 .001-2.148a1.074 1.074 0 0 0 0 2.148Z"/>
                    <path fill="url(#f2864idt)" d="M11.32 11.647a1.074 1.074 0 1 0 .001-2.148a1.074 1.074 0 0 0 0 2.148Z"/>
                </g>
                <g filter="url(#f2864id1l)">
                    <path fill="url(#f2864idu)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864idv)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864idw)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864idx)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864idy)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864idz)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                    <path fill="url(#f2864id10)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                </g>
                <path fill="url(#f2864id11)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                <path fill="url(#f2864id12)" d="M10.9 9.31h.012l-.01-.265l-.01-.306c.02-.949.574-1.316.81-1.438l.051-.02a2.304 2.304 0 0 0 1.24-1.255l.083-.195a.264.264 0 0 1 .462-.05a3.862 3.862 0 0 0 3.189 1.673h3.22c.18 0 1.082.087 1.136 1.332l-.119 3.073c-.123 2.802-2.312 4.684-4.983 4.684c-2.672 0-4.86-1.882-4.983-4.684L10.9 9.31Z"/>
                <g filter="url(#f2864id1m)">
                    <path fill="#D19590" d="m15.595 10.35l-.684 1.7a.54.54 0 0 0 .52.7h.787a.54.54 0 0 0 .52-.7l-.53-1.7c-.114-.376-.494-.376-.613 0Z"/>
                </g>
                <path fill="url(#f2864id29)" d="M10.912 9.31H10.9l.077 2.01h.315c.188 0 .366.04.534.12l.247.12c.09.04.178.08.267.11l.218.07c.425.13.88.14 1.306.02l.277-.08c.108-.03.217-.07.316-.12l.228-.11c.168-.08.346-.12.534-.12h.346l.165-.668c.118-.39.264-.39.382 0l.094.668h.467c.188 0 .366.04.534.12l.208.1c.109.05.227.1.346.13l.307.09c.425.12.89.11 1.305-.04l.178-.06l.238-.09l.267-.12c.168-.08.346-.12.534-.12h.394l.099-2.554a2.317 2.317 0 0 0-.007-.106h-.387c-.247-.02-.494-.1-.712-.24l-.05-.03a2.224 2.224 0 0 0-.553-.28a2.16 2.16 0 0 0-1.306-.04l-.129.03c-.237.07-.465.17-.672.32c-.208.15-.456.22-.713.22h-1.226c-.258 0-.505-.08-.712-.22l-.01-.01a2.25 2.25 0 0 0-.643-.31l-.09-.03c-.425-.12-.88-.12-1.305.02l-.04.01c-.207.07-.405.17-.593.29l-.03.03c-.217.14-.465.22-.722.22h-.288a2.246 2.246 0 0 0-.003.08l.01.305l.01.266Z"/>
                <path fill="url(#f2864id2a)" d="M10.912 9.31H10.9l.077 2.01h.315c.188 0 .366.04.534.12l.247.12c.09.04.178.08.267.11l.218.07c.425.13.88.14 1.306.02l.277-.08c.108-.03.217-.07.316-.12l.228-.11c.168-.08.346-.12.534-.12h.346l.165-.668c.118-.39.264-.39.382 0l.094.668h.467c.188 0 .366.04.534.12l.208.1c.109.05.227.1.346.13l.307.09c.425.12.89.11 1.305-.04l.178-.06l.238-.09l.267-.12c.168-.08.346-.12.534-.12h.394l.099-2.554a2.317 2.317 0 0 0-.007-.106h-.387c-.247-.02-.494-.1-.712-.24l-.05-.03a2.224 2.224 0 0 0-.553-.28a2.16 2.16 0 0 0-1.306-.04l-.129.03c-.237.07-.465.17-.672.32c-.208.15-.456.22-.713.22h-1.226c-.258 0-.505-.08-.712-.22l-.01-.01a2.25 2.25 0 0 0-.643-.31l-.09-.03c-.425-.12-.88-.12-1.305.02l-.04.01c-.207.07-.405.17-.593.29l-.03.03c-.217.14-.465.22-.722.22h-.288a2.246 2.246 0 0 0-.003.08l.01.305l.01.266Z"/>
                <g filter="url(#f2864id1n)">
                    <path fill="#F7C1A9" d="m15.642 10.58l-.481 1.537a.488.488 0 0 0 .47.633h.712a.49.49 0 0 0 .47-.633l-.48-1.537c-.103-.34-.584-.34-.691 0Z"/>
                    <path fill="url(#f2864id13)" d="m15.642 10.58l-.481 1.537a.488.488 0 0 0 .47.633h.712a.49.49 0 0 0 .47-.633l-.48-1.537c-.103-.34-.584-.34-.691 0Z"/>
                </g>
                <g filter="url(#f2864id1o)">
                    <path stroke="url(#f2864id2b)" strokeWidth=".2" d="M15.987 13.485a3.03 3.03 0 0 1-1.421-.345c-.14-.073-.292.089-.203.22a1.932 1.932 0 0 0 3.249 0c.089-.136-.063-.293-.203-.22c-.412.22-.896.345-1.422.345Z"/>
                </g>
                <path fill="#88024E" d="M15.987 13.485a3.03 3.03 0 0 1-1.421-.345c-.14-.073-.292.089-.203.22a1.932 1.932 0 0 0 3.249 0c.089-.136-.063-.293-.203-.22c-.412.22-.896.345-1.422.345Z"/>
                <g filter="url(#f2864id1p)">
                    <path fill="#2D2B2E" d="M17.13 10.004c.265-.467.668-.835 1.537-.835c.38 0 .747.105 1.073.368c.269.218.233.496.024.6l-.556.317c-.651-.21-1.372-.24-2.078-.45Z"/>
                </g>
                <g filter="url(#f2864id1q)">
                    <path fill="#272528" d="M14.845 10.004c-.265-.467-.669-.835-1.537-.835c-.38 0-.747.105-1.073.368c-.269.218-.233.496-.024.6l.556.317c.651-.21 1.372-.24 2.078-.45Z"/>
                </g>
                <path fill="#fff" d="M18.378 9.227c.653 0 1.205.45 1.355 1.06a.274.274 0 0 1-.268.34h-2.23a.23.23 0 0 1-.228-.272a1.398 1.398 0 0 1 1.371-1.128Z"/>
                <path fill="url(#f2864id14)" d="M18.171 9.5a.893.893 0 0 1 .86 1.127h-1.724a.896.896 0 0 1 .864-1.128Z"/>
                <path fill="#000" d="M17.66 10.392a.51.51 0 0 1 .511-.512a.509.509 0 0 1 .455.747h-.905a.462.462 0 0 1-.06-.235Z"/>
                <g filter="url(#f2864id1r)">
                    <path fill="#C7A7A3" d="M18.106 9.688c.063.085-.07.189-.22.301c-.152.113-.264.193-.328.108c-.063-.085.008-.246.159-.359c.151-.113.325-.135.389-.05Z"/>
                    <path fill="url(#f2864id15)" d="M18.106 9.688c.063.085-.07.189-.22.301c-.152.113-.264.193-.328.108c-.063-.085.008-.246.159-.359c.151-.113.325-.135.389-.05Z"/>
                </g>
                <g filter="url(#f2864id1s)">
                    <path fill="url(#f2864id2c)" d="M18.966 10.274a.84.84 0 0 0-.231-.463l-.26.286l.117.228l.374-.05Z"/>
                </g>
                <path fill="#fff" d="M13.596 9.227c-.653 0-1.205.45-1.355 1.06c-.044.173.09.34.268.34h2.231a.23.23 0 0 0 .227-.272a1.401 1.401 0 0 0-1.37-1.128Z"/>
                <path fill="url(#f2864id16)" d="M13.803 9.5a.893.893 0 0 0-.86 1.127h1.724a.919.919 0 0 0 .033-.235a.899.899 0 0 0-.897-.893Z"/>
                <path fill="#000" d="M14.314 10.392a.509.509 0 0 0-.51-.512a.509.509 0 0 0-.455.747h.904a.507.507 0 0 0 .061-.235Z"/>
                <g filter="url(#f2864id1t)">
                    <path fill="url(#f2864id2d)" d="M14.618 10.287c0-.289-.234-.48-.297-.539l-.289.279l.178.361l.408-.101Z"/>
                </g>
                <g filter="url(#f2864id1u)">
                    <ellipse cx="13.534" cy="9.88" fill="#C7A7A3" fillOpacity=".9" rx=".39" ry=".197" transform="rotate(-27.914 13.534 9.88)"/>
                    <ellipse cx="13.534" cy="9.88" fill="url(#f2864id17)" rx=".39" ry=".197" transform="rotate(-27.914 13.534 9.88)"/>
                </g>
                <g filter="url(#f2864id1v)">
                    <path fill="#232121" d="M10.918 4.585c.566-.6 1.637-.6 2.131-.51l.396 1.29c-.253-.04-.478.05-.668.234c-.448 1.26-1.99 1.956-2.704 2.146c-.148-1.492.109-2.38.845-3.16Z"/>
                    <path fill="url(#f2864id18)" d="M10.918 4.585c.566-.6 1.637-.6 2.131-.51l.396 1.29c-.253-.04-.478.05-.668.234c-.448 1.26-1.99 1.956-2.704 2.146c-.148-1.492.109-2.38.845-3.16Z"/>
                </g>
                <g filter="url(#f2864id1w)">
                    <path fill="#2A2A2A" d="M15.384 2.783c-1.133-.25-2.15.88-2.267 1.299c1.052 3.545 3.713 3.35 6.34 3.059c1.573-.175 1.743.541 1.877.888c0-3.933-3.344-4.671-5.921-5.24l-.029-.006Z"/>
                    <path fill="url(#f2864id19)" d="M15.384 2.783c-1.133-.25-2.15.88-2.267 1.299c1.052 3.545 3.713 3.35 6.34 3.059c1.573-.175 1.743.541 1.877.888c0-3.933-3.344-4.671-5.921-5.24l-.029-.006Z"/>
                    <path fill="url(#f2864id1a)" d="M15.384 2.783c-1.133-.25-2.15.88-2.267 1.299c1.052 3.545 3.713 3.35 6.34 3.059c1.573-.175 1.743.541 1.877.888c0-3.933-3.344-4.671-5.921-5.24l-.029-.006Z"/>
                </g>
                <g filter="url(#f2864id1x)">
                    <path stroke="url(#f2864id2e)" strokeLinecap="round" strokeWidth=".2" d="M13.096 4.031c.023.243.235 1.157.545 1.71"/>
                </g>
                <g filter="url(#f2864id1y)">
                    <path fill="#4B4648" d="m18.394 6.392l-1.426.262a.688.688 0 1 1-.125-1.364h2.341c1.384 0 1.843 1.395 1.899 1.872a3.147 3.147 0 0 0-2.69-.77Z"/>
                </g>
                <defs>
                    <radialGradient id="f2864id0" cx="0" cy="0" r="1" gradientTransform="matrix(-.6034 4.55907 -5.6952 -.75377 15.686 13.074)" gradientUnits="userSpaceOnUse">
                        <stop offset=".591" stopColor="#171418"/>
                        <stop offset="1" stopColor="#171418" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id1" cx="0" cy="0" r="1" gradientTransform="matrix(-2.88301 1.94432 -2.5547 -3.78806 12.87 13.342)" gradientUnits="userSpaceOnUse">
                        <stop offset=".258" stopColor="#181518"/>
                        <stop offset="1" stopColor="#181518" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id2" cx="0" cy="0" r="1" gradientTransform="rotate(127.405 2.905 8.15) scale(2.15225 1.65263)" gradientUnits="userSpaceOnUse">
                        <stop offset=".334" stopColor="#040101"/>
                        <stop offset="1" stopColor="#040101" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id3" cx="0" cy="0" r="1" gradientTransform="rotate(121.43 3.34 7.635) scale(2.47506 1.74346)" gradientUnits="userSpaceOnUse">
                        <stop offset=".321" stopColor="#040002"/>
                        <stop offset="1" stopColor="#040002" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id4" cx="0" cy="0" r="1" gradientTransform="matrix(1.37443 2.61477 -3.62969 1.90792 12.467 2.514)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#474445"/>
                        <stop offset="1" stopColor="#474445" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id5" cx="0" cy="0" r="1" gradientTransform="rotate(134.998 9.959 6.816) scale(2.03849 2.84876)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4A4446"/>
                        <stop offset="1" stopColor="#4A4446" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id6" cx="0" cy="0" r="1" gradientTransform="matrix(-1.84366 .53637 -1.11855 -3.8448 23.496 9.722)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B3638"/>
                        <stop offset="1" stopColor="#3B3638" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id7" cx="0" cy="0" r="1" gradientTransform="rotate(165.963 10.638 7.98) scale(2.90248 3.69733)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#464444"/>
                        <stop offset="1" stopColor="#464444" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id8" cx="0" cy="0" r="1" gradientTransform="matrix(-.90444 -2.65026 2.0962 -.71536 20.72 7.288)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#575455"/>
                        <stop offset="1" stopColor="#575455" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id9" cx="0" cy="0" r="1" gradientTransform="matrix(1.50392 .15775 -.2556 2.43678 9.845 9.686)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#413733"/>
                        <stop offset="1" stopColor="#413733" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864ida" cx="0" cy="0" r="1" gradientTransform="matrix(0 11.5824 -20.8203 0 16 18.372)" gradientUnits="userSpaceOnUse">
                        <stop offset=".572" stopColor="#FF3B9A"/>
                        <stop offset="1" stopColor="#EE344D"/>
                    </radialGradient>
                    <radialGradient id="f2864idb" cx="0" cy="0" r="1" gradientTransform="rotate(124.924 1.228 11.052) scale(12.8824 12.131)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#BF2370"/>
                        <stop offset="1" stopColor="#BF2370" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idc" cx="0" cy="0" r="1" gradientTransform="rotate(123.174 5.837 15.598) scale(11.5365 12.2083)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4690E6"/>
                        <stop offset="1" stopColor="#3E75E1"/>
                    </radialGradient>
                    <radialGradient id="f2864idd" cx="0" cy="0" r="1" gradientTransform="rotate(100.184 -.325 14.065) scale(5.30229 7.65346)" gradientUnits="userSpaceOnUse">
                        <stop offset=".231" stopColor="#3062AC"/>
                        <stop offset="1" stopColor="#3A7AD3" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864ide" cx="0" cy="0" r="1" gradientTransform="matrix(5.4375 0 0 14.5199 23.18 29.622)" gradientUnits="userSpaceOnUse">
                        <stop offset=".698" stopColor="#528ADB" stopOpacity="0"/>
                        <stop offset="1" stopColor="#528ADB"/>
                    </radialGradient>
                    <radialGradient id="f2864idf" cx="0" cy="0" r="1" gradientTransform="matrix(0 -13.1762 .21924 0 23.68 29.955)" gradientUnits="userSpaceOnUse">
                        <stop offset=".21" stopColor="#286ADF"/>
                        <stop offset="1" stopColor="#286ADF" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idg" cx="0" cy="0" r="1" gradientTransform="matrix(-5.6875 0 0 -13.3438 9.555 29.779)" gradientUnits="userSpaceOnUse">
                        <stop offset=".813" stopColor="#407DBE" stopOpacity="0"/>
                        <stop offset="1" stopColor="#407DBE"/>
                    </radialGradient>
                    <radialGradient id="f2864idh" cx="0" cy="0" r="1" gradientTransform="matrix(.14062 -1.5668 5.45335 .48945 5.71 29.955)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3D71ED"/>
                        <stop offset="1" stopColor="#3D71ED" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idi" cx="0" cy="0" r="1" gradientTransform="matrix(-.21094 0 0 -15.1051 8.383 29.955)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2154CA"/>
                        <stop offset="1" stopColor="#2154CA" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idj" cx="0" cy="0" r="1" gradientTransform="matrix(-.70312 .54687 -.67794 -.87163 19.711 23.404)" gradientUnits="userSpaceOnUse">
                        <stop offset=".073" stopColor="#53B7FF"/>
                        <stop offset="1" stopColor="#49A3FF" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idk" cx="0" cy="0" r="1" gradientTransform="rotate(111.034 1.943 12.516) scale(3.13667 4.32041)" gradientUnits="userSpaceOnUse">
                        <stop offset=".344" stopColor="#780438"/>
                        <stop offset="1" stopColor="#780438" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idl" cx="0" cy="0" r="1" gradientTransform="matrix(0 1.53125 -3 0 20.742 15.341)" gradientUnits="userSpaceOnUse">
                        <stop offset=".184" stopColor="#F04451"/>
                        <stop offset="1" stopColor="#F04451" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idm" cx="0" cy="0" r="1" gradientTransform="matrix(0 1.79294 -6.37953 0 19.492 15.403)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#BB1135"/>
                        <stop offset="1" stopColor="#BB1135" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idn" cx="0" cy="0" r="1" gradientTransform="rotate(126.363 3.443 13.942) scale(1.76569 1.94865)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFF14E"/>
                        <stop offset="1" stopColor="#F2BB43"/>
                    </radialGradient>
                    <radialGradient id="f2864ido" cx="0" cy="0" r="1" gradientTransform="rotate(111.306 1.436 15.466) scale(1.67712 2.10568)" gradientUnits="userSpaceOnUse">
                        <stop offset=".511" stopColor="#F6C546" stopOpacity="0"/>
                        <stop offset="1" stopColor="#D79D4A"/>
                    </radialGradient>
                    <radialGradient id="f2864idp" cx="0" cy="0" r="1" gradientTransform="rotate(41.072 -15.094 28.3) scale(2.76174 3.96201)" gradientUnits="userSpaceOnUse">
                        <stop offset=".352" stopColor="#C38389"/>
                        <stop offset="1" stopColor="#E1A18F"/>
                        <stop offset="1" stopColor="#F4B4AB"/>
                    </radialGradient>
                    <radialGradient id="f2864idq" cx="0" cy="0" r="1" gradientTransform="rotate(-48.104 23.186 -17.187) scale(2.73591 3.34042)" gradientUnits="userSpaceOnUse">
                        <stop offset=".444" stopColor="#E5B1A5"/>
                        <stop offset=".944" stopColor="#FFD8C1"/>
                    </radialGradient>
                    <radialGradient id="f2864idr" cx="0" cy="0" r="1" gradientTransform="matrix(1.31576 .7375 -.2085 .37199 21.058 8.892)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#DBA98B"/>
                        <stop offset="1" stopColor="#DBA98B" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864ids" cx="0" cy="0" r="1" gradientTransform="matrix(1.50989 -.11231 .0878 1.18032 20.379 10.685)" gradientUnits="userSpaceOnUse">
                        <stop offset=".719" stopColor="#F4B89E" stopOpacity="0"/>
                        <stop offset="1" stopColor="#F5B99D"/>
                    </radialGradient>
                    <radialGradient id="f2864idt" cx="0" cy="0" r="1" gradientTransform="matrix(-1.20681 0 0 -.95203 11.386 10.573)" gradientUnits="userSpaceOnUse">
                        <stop offset=".667" stopColor="#BC8272" stopOpacity="0"/>
                        <stop offset="1" stopColor="#BC8272"/>
                    </radialGradient>
                    <radialGradient id="f2864idu" cx="0" cy="0" r="1" gradientTransform="matrix(-6.50357 2.99901 -4.01413 -8.70492 18.846 10.036)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFD7BF"/>
                        <stop offset="1" stopColor="#D59F97"/>
                    </radialGradient>
                    <radialGradient id="f2864idv" cx="0" cy="0" r="1" gradientTransform="matrix(-3.46116 .45112 -.49796 -3.82051 19.239 11.398)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFDEBF"/>
                        <stop offset="1" stopColor="#FFDEBF" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idw" cx="0" cy="0" r="1" gradientTransform="matrix(1.30737 -3.78806 4.80634 1.6588 13.607 17.365)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B87C92"/>
                        <stop offset="1" stopColor="#B87C92" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864idx" cx="0" cy="0" r="1" gradientTransform="matrix(0 6.72467 -7.78405 0 15.987 9.818)" gradientUnits="userSpaceOnUse">
                        <stop offset=".567" stopColor="#CD9897" stopOpacity="0"/>
                        <stop offset="1" stopColor="#B4807E"/>
                    </radialGradient>
                    <radialGradient id="f2864idy" cx="0" cy="0" r="1" gradientTransform="rotate(168.897 8.327 6.748) scale(7.03738 12.1162)" gradientUnits="userSpaceOnUse">
                        <stop offset=".795" stopColor="#E2A895" stopOpacity="0"/>
                        <stop offset="1" stopColor="#E2A895"/>
                    </radialGradient>
                    <radialGradient id="f2864idz" cx="0" cy="0" r="1" gradientTransform="matrix(0 -1.15077 1.41231 0 18.289 9.617)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F6BAA9"/>
                        <stop offset="1" stopColor="#F6BAA9" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id10" cx="0" cy="0" r="1" gradientTransform="matrix(0 -1.31251 1.50423 0 13.91 9.389)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#D09790"/>
                        <stop offset="1" stopColor="#D09790" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id11" cx="0" cy="0" r="1" gradientTransform="matrix(-1.28528 0 0 -6.44557 21.083 11.105)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFD8BC"/>
                        <stop offset="1" stopColor="#FFD8BC" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id12" cx="0" cy="0" r="1" gradientTransform="matrix(1.3125 4 -6.96848 2.28654 13.803 4.037)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#A47463"/>
                        <stop offset="1" stopColor="#A47463" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id13" cx="0" cy="0" r="1" gradientTransform="matrix(-.42625 -3.34452 1.30814 -.16672 16.836 12.194)" gradientUnits="userSpaceOnUse">
                        <stop offset=".166" stopColor="#FFCEB8"/>
                        <stop offset="1" stopColor="#FFCEB8" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id14" cx="0" cy="0" r="1" gradientTransform="matrix(0 .81132 -1.29049 0 18.17 9.976)" gradientUnits="userSpaceOnUse">
                        <stop offset=".802" stopColor="#7D574A"/>
                        <stop offset="1" stopColor="#694B43"/>
                        <stop offset="1" stopColor="#804D49"/>
                        <stop offset="1" stopColor="#664944"/>
                    </radialGradient>
                    <radialGradient id="f2864id15" cx="0" cy="0" r="1" gradientTransform="matrix(-.23192 -.29886 .41145 -.3193 17.941 10.06)" gradientUnits="userSpaceOnUse">
                        <stop offset=".766" stopColor="#FFE6E2" stopOpacity="0"/>
                        <stop offset=".966" stopColor="#FFE6E2"/>
                    </radialGradient>
                    <radialGradient id="f2864id16" cx="0" cy="0" r="1" gradientTransform="matrix(0 .81132 -1.2905 0 13.805 9.976)" gradientUnits="userSpaceOnUse">
                        <stop offset=".802" stopColor="#7D574A"/>
                        <stop offset="1" stopColor="#694B43"/>
                        <stop offset="1" stopColor="#804D49"/>
                        <stop offset="1" stopColor="#664944"/>
                    </radialGradient>
                    <radialGradient id="f2864id17" cx="0" cy="0" r="1" gradientTransform="rotate(-90.897 11.778 -1.557) scale(.49412 .59395)" gradientUnits="userSpaceOnUse">
                        <stop offset=".766" stopColor="#FFE6E2" stopOpacity="0"/>
                        <stop offset=".966" stopColor="#FFE6E2"/>
                    </radialGradient>
                    <radialGradient id="f2864id18" cx="0" cy="0" r="1" gradientTransform="matrix(1.26203 -2.75543 1.40961 .64562 10.33 7.856)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#433838"/>
                        <stop offset="1" stopColor="#433838" stopOpacity="0"/>
                    </radialGradient>
                    <radialGradient id="f2864id19" cx="0" cy="0" r="1" gradientTransform="rotate(115.684 8.117 6.95) scale(4.8729 7.96691)" gradientUnits="userSpaceOnUse">
                        <stop offset=".639" stopColor="#1F0D24" stopOpacity="0"/>
                        <stop offset="1" stopColor="#1F0D24"/>
                    </radialGradient>
                    <radialGradient id="f2864id1a" cx="0" cy="0" r="1" gradientTransform="matrix(-.21034 1.3672 -2.94144 -.45253 16.198 3.018)" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4C4749"/>
                        <stop offset="1" stopColor="#4C4749" stopOpacity="0"/>
                    </radialGradient>
                    <filter id="f2864id1b" width="15.268" height="15.768" x="8.478" y="1.295" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".25" dy="-.75"/>
                        <feGaussianBlur stdDeviation=".75"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.121569 0 0 0 0 0.0705882 0 0 0 0 0.164706 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1c" width="25.813" height="14.219" x="3.094" y="15.986" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".125"/>
                    </filter>
                    <filter id="f2864id1d" width="9.1" height="7.705" x="10.989" y="22.419" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".5"/>
                    </filter>
                    <filter id="f2864id1e" width="7.926" height="6.427" x="12.029" y="22.848" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx="-.15" dy=".15"/>
                        <feGaussianBlur stdDeviation=".15"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.282353 0 0 0 0 0.670588 0 0 0 0 1 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".15" dy="-.15"/>
                        <feGaussianBlur stdDeviation=".3"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.196078 0 0 0 0 0.407843 0 0 0 0 0.87451 0 0 0 1 0"/>
                        <feBlend in2="effect1_innerShadow_4002_938" result="effect2_innerShadow_4002_938"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".05" dy="-.05"/>
                        <feGaussianBlur stdDeviation=".1"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.164706 0 0 0 0 0.317647 0 0 0 0 0.886275 0 0 0 1 0"/>
                        <feBlend in2="effect2_innerShadow_4002_938" result="effect3_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1f" width="3.095" height="3.11" x="14.16" y="18.709" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".25"/>
                    </filter>
                    <filter id="f2864id1g" width="11.606" height="4.825" x="10.289" y="15.61" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".2" dy="-.25"/>
                        <feGaussianBlur stdDeviation=".1"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.803922 0 0 0 0 0.223529 0 0 0 0 0.533333 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1h" width="3.368" height="3.218" x="9.693" y="8.964" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".15"/>
                        <feGaussianBlur stdDeviation=".25"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.894118 0 0 0 0 0.682353 0 0 0 0 0.6 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1i" width="3.218" height="3.468" x="19.206" y="8.714" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dy="-.25"/>
                        <feGaussianBlur stdDeviation=".25"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.784314 0 0 0 0 0.572549 0 0 0 0 0.513726 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1j" width="3.148" height="3.148" x="19.241" y="8.999" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".25"/>
                    </filter>
                    <filter id="f2864id1k" width="2.948" height="2.948" x="9.847" y="9.099" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".2"/>
                    </filter>
                    <filter id="f2864id1l" width="10.191" height="11.277" x="10.892" y="5.666" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dy=".4"/>
                        <feGaussianBlur stdDeviation=".3"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.807843 0 0 0 0 0.592157 0 0 0 0 0.52549 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1m" width="2.877" height="3.682" x="14.386" y="9.568" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".25"/>
                    </filter>
                    <filter id="f2864id1n" width="1.998" height="2.625" x="15.138" y="10.125" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".3" dy="-.2"/>
                        <feGaussianBlur stdDeviation=".3"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.870588 0 0 0 0 0.631373 0 0 0 0 0.580392 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1o" width="3.702" height="1.526" x="14.136" y="12.921" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".05"/>
                    </filter>
                    <filter id="f2864id1p" width="3.001" height="1.285" x="16.93" y="9.169" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx="-.2"/>
                        <feGaussianBlur stdDeviation=".2"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.0941176 0 0 0 0 0.0666667 0 0 0 0 0.117647 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1q" width="3.001" height="1.285" x="12.044" y="9.169" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".2"/>
                        <feGaussianBlur stdDeviation=".125"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.0862745 0 0 0 0 0.054902 0 0 0 0 0.113725 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                    </filter>
                    <filter id="f2864id1r" width=".787" height=".696" x="17.435" y="9.536" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".05"/>
                    </filter>
                    <filter id="f2864id1s" width=".891" height=".913" x="18.275" y="9.611" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".1"/>
                    </filter>
                    <filter id="f2864id1t" width=".986" height="1.04" x="13.832" y="9.548" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".1"/>
                    </filter>
                    <filter id="f2864id1u" width=".913" height=".704" x="13.078" y="9.528" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".05"/>
                    </filter>
                    <filter id="f2864id1v" width="4.212" height="4.513" x="9.733" y="3.731" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx=".5" dy=".5"/>
                        <feGaussianBlur stdDeviation=".5"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.352941 0 0 0 0 0.341176 0 0 0 0 0.341176 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                        <feGaussianBlur result="effect2_foregroundBlur_4002_938" stdDeviation=".15"/>
                    </filter>
                    <filter id="f2864id1w" width="8.767" height="5.782" x="12.817" y="2.497" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                        <feOffset dx="-.3" dy=".2"/>
                        <feGaussianBlur stdDeviation=".4"/>
                        <feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/>
                        <feColorMatrix values="0 0 0 0 0.345098 0 0 0 0 0.329412 0 0 0 0 0.333333 0 0 0 1 0"/>
                        <feBlend in2="shape" result="effect1_innerShadow_4002_938"/>
                        <feGaussianBlur result="effect2_foregroundBlur_4002_938" stdDeviation=".125"/>
                    </filter>
                    <filter id="f2864id1x" width="1.145" height="2.31" x="12.796" y="3.731" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".1"/>
                    </filter>
                    <filter id="f2864id1y" width="6.427" height="3.372" x="15.405" y="4.54" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                        <feGaussianBlur result="effect1_foregroundBlur_4002_938" stdDeviation=".375"/>
                    </filter>
                    <linearGradient id="f2864id1z" x1="20.681" x2="13.876" y1="3.621" y2="16.225" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#393134"/>
                        <stop offset="1" stopColor="#1A1718"/>
                    </linearGradient>
                    <linearGradient id="f2864id20" x1="16" x2="16" y1="16.236" y2="30.341" gradientUnits="userSpaceOnUse">
                        <stop offset=".866" stopColor="#790B2C"/>
                        <stop offset="1" stopColor="#790B2C" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id21" x1="26.992" x2="26.773" y1="30.247" y2="27.497" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#4D87F8"/>
                        <stop offset="1" stopColor="#4B99FF" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id22" x1="8.586" x2="5.336" y1="25.154" y2="25.154" gradientUnits="userSpaceOnUse">
                        <stop offset=".183" stopColor="#3E80F0"/>
                        <stop offset="1" stopColor="#3E77D8"/>
                    </linearGradient>
                    <linearGradient id="f2864id23" x1="18.555" x2="13.805" y1="23.966" y2="27.31" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#47A1FF"/>
                        <stop offset="1" stopColor="#3F83F1"/>
                    </linearGradient>
                    <linearGradient id="f2864id24" x1="15.992" x2="15.992" y1="22.857" y2="24.201" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#40A0F8"/>
                        <stop offset="1" stopColor="#4392F9" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id25" x1="14.773" x2="20.117" y1="19.06" y2="17.154" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#CE1F66"/>
                        <stop offset="1" stopColor="#FF3656"/>
                    </linearGradient>
                    <linearGradient id="f2864id26" x1="8.847" x2="23.223" y1="15.383" y2="15.383" gradientUnits="userSpaceOnUse">
                        <stop offset=".006" stopColor="#CCC"/>
                        <stop offset="1" stopColor="#E6E6E6"/>
                    </linearGradient>
                    <linearGradient id="f2864id27" x1="8.846" x2="23.222" y1="15.352" y2="15.352" gradientUnits="userSpaceOnUse">
                        <stop offset=".006" stopColor="#CCC"/>
                        <stop offset="1" stopColor="#E6E6E6"/>
                    </linearGradient>
                    <linearGradient id="f2864id28" x1="9.693" x2="12.652" y1="10.66" y2="10.66" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#CC9987"/>
                        <stop offset="1" stopColor="#AC7864"/>
                    </linearGradient>
                    <linearGradient id="f2864id29" x1="20.375" x2="12.995" y1="10.69" y2="10.69" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FF1781"/>
                        <stop offset="1" stopColor="#C31251"/>
                    </linearGradient>
                    <linearGradient id="f2864id2a" x1="10.892" x2="12.341" y1="10.377" y2="10.377" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#AB2D46"/>
                        <stop offset="1" stopColor="#BA3950" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id2b" x1="14.923" x2="15.384" y1="14.113" y2="13.401" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#EABBAB"/>
                        <stop offset=".663" stopColor="#EABBAB" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id2c" x1="18.947" x2="18.634" y1="10.03" y2="10.223" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B4948D"/>
                        <stop offset="1" stopColor="#B4948D" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id2d" x1="14.549" x2="14.235" y1="10.03" y2="10.223" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#B4948D"/>
                        <stop offset="1" stopColor="#B4948D" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="f2864id2e" x1="13.096" x2="13.641" y1="4.375" y2="5.649" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#1A1316"/>
                        <stop offset="1" stopColor="#24182D"/>
                    </linearGradient>
                </defs>
            </g>
        </svg>
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

const QuickActions: React.FC<{ onAction: (action: any) => void; className?: string }> = ({ onAction, className }) => {
    const actions = [
        { label: "Billing Issue", icon: CreditCardIcon, prompt: "I have a billing issue. Can you explain how credits and payments work?", autoSend: true },
        { label: "Features", icon: LightbulbIcon, prompt: "I need help understanding a feature. How do I use the tools?", autoSend: true },
        { label: "Report Bug", icon: FlagIcon, prompt: "I think I found a bug. What should I do?", autoSend: true },
        { label: "New Feature", icon: SparklesIcon, prompt: "I have a feature request. How can I submit it?", autoSend: true }
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

const ChatSkeleton = () => (
    <div className="space-y-6 p-4 opacity-70 animate-pulse flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-md space-y-6">
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
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [olderMessages, setOlderMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [hasInteracted, setHasInteracted] = useState(false);
    
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [submittingTicketId, setSubmittingTicketId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Refs for DOM elements
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputFocusRef = useRef<HTMLInputElement>(null);
    const previousScrollHeightRef = useRef(0);
    const [isLoadingOlder, setIsLoadingOlder] = useState(false);

    useEffect(() => {
        if (auth.user) {
            loadTickets();
            loadChatHistory();
        }
    }, [auth.user]);

    // Handle scroll preservation when older messages are loaded
    useLayoutEffect(() => {
        if (isLoadingOlder && scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const diff = newScrollHeight - previousScrollHeightRef.current;
            // Restore position relative to the NEW content added at top.
            // If the user was at the top (scrollTop approx 0), they should now be at `diff`
            // to see the same content they were seeing before.
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
        // Scroll to bottom on initial load
        scrollToBottom();
    };

    const loadTickets = async () => {
        if (!auth.user) return;
        try {
            const data = await getUserTickets(auth.user.uid);
            setTickets(data);
        } catch(e) { console.error("Ticket load failed", e); }
    };

    const handleLoadOlder = () => {
        if (olderMessages.length === 0) return;
        
        // Capture scroll height before update
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
            
            setTickets(prev => [newTicket, ...prev]);
            
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

            {/* Main Content Area - Top Aligned */}
            <div className="flex-1 w-full flex items-start justify-center p-4 lg:p-8 pt-32">
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh] min-h-[600px] max-h-[800px]">
                
                    {/* LEFT: CHAT INTERFACE */}
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
        </div>
    );
};
