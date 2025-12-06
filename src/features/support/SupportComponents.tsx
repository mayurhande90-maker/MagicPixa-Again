
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { Ticket } from '../../types';
import { 
    SparklesIcon, 
    CheckIcon, 
    TicketIcon, 
    LightbulbIcon, 
    FlagIcon, 
    CreditCardIcon, 
    UserIcon,
    ArrowRightIcon,
    XIcon
} from '../../components/icons';

// ... existing helpers ...
export const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

export const formatRelativeTime = (date: Date | any) => {
    const d = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // Less than 24 hours
    if (diff < 86400000) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Less than 7 days
    if (diff < 604800000) {
        return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// --- COMPONENTS ---

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        open: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
        resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
        rejected: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
    };
    // @ts-ignore
    const c = config[status] || config.open;

    return (
        <span className={`pl-2 pr-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${c.bg} ${c.text} ${c.border} inline-flex items-center gap-1.5 shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'open' ? 'animate-pulse' : ''}`}></span>
            {status}
        </span>
    );
};

export const TicketHistoryItem: React.FC<{ ticket: Ticket; onClick?: () => void }> = ({ ticket, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative p-4 rounded-xl bg-white border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
        >
            <div className="flex justify-between items-start mb-2">
                <StatusBadge status={ticket.status} />
                <span className="text-[10px] font-medium text-gray-400">{formatRelativeTime(ticket.createdAt)}</span>
            </div>
            
            <div className="mb-2">
                <h4 className="font-bold text-gray-800 text-sm mb-1 truncate group-hover:text-indigo-600 transition-colors">{ticket.subject}</h4>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{ticket.description}</p>
            </div>

            {ticket.adminReply && (
                <div className="mt-3 pt-3 border-t border-gray-50 flex gap-2 items-start bg-gray-50/50 -mx-4 -mb-4 p-3">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                        <SparklesIcon className="w-2.5 h-2.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Agent Reply</p>
                        <p className="text-xs text-gray-700 font-medium line-clamp-1 truncate">{ticket.adminReply}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export const TicketProposalCard: React.FC<{ 
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
            <div className="mt-4 bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm animate-fadeIn max-w-sm w-full relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-emerald-900 font-bold text-sm">Ticket Submitted</h4>
                        <p className="text-emerald-600/80 text-xs mt-0.5">Reference #{Math.floor(Math.random() * 10000)}</p>
                    </div>
                </div>
            </div>
        );
    }

    const allTypes = ['general', 'bug', 'refund', 'feature'];
    const visibleTypes = (draft.type && ['bug', 'refund', 'feature'].includes(draft.type)) 
        ? [draft.type] 
        : allTypes;

    return (
        <div className="mt-4 w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 overflow-hidden animate-fadeIn transition-all hover:shadow-2xl hover:border-indigo-200 group">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-600">
                    <div className="p-1.5 bg-indigo-100 rounded-md">
                        <TicketIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wide">Ticket Preview</span>
                </div>
                <div className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-yellow-200/50">
                    Draft
                </div>
            </div>
            
            <div className="p-5 space-y-5">
                {/* Subject Input */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Subject</label>
                    <input 
                        className="w-full text-base font-bold text-gray-800 bg-transparent border-b-2 border-gray-100 px-1 py-1 focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder-gray-300"
                        value={editedDraft.subject || ''}
                        onChange={e => setEditedDraft({...editedDraft, subject: e.target.value})}
                        placeholder="Ticket Subject"
                    />
                </div>

                {/* Category Pills */}
                {visibleTypes.length > 1 && (
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Category</label>
                        <div className="flex gap-2 flex-wrap">
                            {visibleTypes.map(t => (
                                <button 
                                    key={t}
                                    onClick={() => setEditedDraft({...editedDraft, type: t as any})}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase border transition-all transform active:scale-95 ${
                                        editedDraft.type === t 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Description Input */}
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Description</label>
                    <textarea 
                        className="w-full text-sm text-gray-600 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none min-h-[100px] leading-relaxed"
                        value={editedDraft.description || ''}
                        onChange={e => setEditedDraft({...editedDraft, description: e.target.value})}
                        placeholder="Please describe your issue in detail..."
                    />
                </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button 
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-gray-500 text-xs font-bold hover:text-red-500 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => onConfirm(editedDraft)}
                    disabled={isSubmitting}
                    className="flex-1 bg-[#1A1A1E] text-white py-2.5 rounded-xl text-xs font-bold shadow-lg hover:shadow-xl hover:bg-black transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Creating...
                        </>
                    ) : (
                        <>
                            Confirm & Submit <ArrowRightIcon className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors"/>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export const FormattedMessage: React.FC<{ text: string; isWelcome?: boolean }> = ({ text, isWelcome }) => {
    // Basic Markdown Parser for Bold text
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
        <div className={`space-y-3 ${isWelcome ? 'pt-1' : ''} break-words w-full`}>
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-2"></div>;
                
                if (isWelcome && i === 0) {
                     return <h3 key={i} className="font-black text-2xl text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-3 leading-tight">{trimmed.replace(/^#+\s*/, '')}</h3>;
                }

                if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
                    const cleanHeader = trimmed.replace(/^#+\s*/, '');
                    return <h3 key={i} className="font-bold text-base mt-2 mb-1 tracking-tight text-gray-800">{cleanHeader}</h3>;
                }
                
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                     return (
                        <div key={i} className="flex gap-3 items-start pl-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></div>
                            <span className="flex-1 leading-relaxed text-slate-600 whitespace-pre-wrap">{parseBold(trimmed.replace(/^[-*]\s*/, ''))}</span>
                        </div>
                     );
                }
                return <p key={i} className="leading-relaxed text-slate-600 whitespace-pre-wrap">{parseBold(line)}</p>;
            })}
        </div>
    );
};

export const PixaBotIcon = () => (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-sm overflow-hidden p-1.5">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-indigo-600">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
         </svg>
    </div>
);

export const UserMessageIcon = ({ user }: { user: any }) => (
    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-indigo-600 border-2 border-white shadow-md text-white text-xs font-bold overflow-hidden">
        {user?.avatar || <UserIcon className="w-4 h-4" />}
    </div>
);

export const QuickActions: React.FC<{ onAction: (action: any) => void; className?: string }> = ({ onAction, className }) => {
    const actions = [
        { label: "Billing Help", icon: CreditCardIcon, prompt: "I have a question about my credits or billing history.", autoSend: true },
        { label: "Feature Guide", icon: LightbulbIcon, prompt: "Can you give me a quick guide on how to use the AI tools?", autoSend: true },
        { label: "Report Bug", icon: FlagIcon, prompt: "I found a bug I'd like to report.", autoSend: true },
        { label: "Request Feature", icon: SparklesIcon, prompt: "I have a new feature idea.", autoSend: true }
    ];

    return (
        <div className={`flex flex-wrap gap-2 animate-fadeIn ${className}`}>
            {actions.map((action, idx) => (
                <button
                    key={idx}
                    onClick={() => onAction(action)}
                    className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
                >
                    <action.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    {action.label}
                </button>
            ))}
        </div>
    );
};

export const ChatSkeleton = () => (
    <div className="space-y-8 p-8 opacity-60 animate-pulse flex flex-col items-center justify-center h-full w-full">
        <div className="w-full max-w-sm space-y-4">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-1 pt-1">
                    <div className="w-2/3 h-3 bg-gray-200 rounded-full"></div>
                    <div className="w-1/2 h-3 bg-gray-200 rounded-full"></div>
                </div>
            </div>
            <div className="flex gap-4 flex-row-reverse">
                <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-1 pt-1 flex flex-col items-end">
                    <div className="w-3/4 h-3 bg-gray-200 rounded-full"></div>
                    <div className="w-1/3 h-3 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        </div>
        <div className="flex flex-col items-center gap-3">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Connecting securely...</p>
        </div>
    </div>
);
