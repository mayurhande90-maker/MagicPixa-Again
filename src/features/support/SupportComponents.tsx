
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

// ... helpers ...
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
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
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
        <span className={`pl-2 pr-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${c.bg} ${c.text} ${c.border} inline-flex items-center gap-1.5 shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'open' ? 'animate-pulse' : ''}`}></span>
            {status}
        </span>
    );
};

export const TicketHistoryItem: React.FC<{ ticket: Ticket; onClick?: () => void }> = ({ ticket, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative p-[min(2.5vh,20px)] rounded-2xl bg-white border border-gray-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
        >
            <div className="flex justify-between items-start mb-3">
                <StatusBadge status={ticket.status} />
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{formatRelativeTime(ticket.createdAt)}</span>
            </div>
            
            <div className="mb-2">
                <h4 className="font-black text-gray-800 text-[clamp(12px,1.6vh,14px)] mb-1.5 truncate group-hover:text-indigo-600 transition-colors leading-tight">{ticket.subject}</h4>
                <p className="text-[clamp(10px,1.4vh,12px)] text-gray-500 leading-relaxed line-clamp-2 font-medium">{ticket.description}</p>
            </div>

            {ticket.adminReply && (
                <div className="mt-4 pt-4 border-t border-gray-50 flex gap-3 items-start bg-gray-50/50 -mx-5 -mb-5 p-4 transition-colors group-hover:bg-indigo-50/30">
                    <div className="w-5 h-5 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <SparklesIcon className="w-3 h-3 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mb-0.5">Decision</p>
                        <p className="text-[11px] text-gray-700 font-bold line-clamp-1 truncate italic">"{ticket.adminReply}"</p>
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

    useEffect(() => { if (!isSubmitted) setEditedDraft(draft); }, [draft, isSubmitted]);

    if (isSubmitted) {
        return (
            <div className="mt-4 bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm animate-fadeIn max-w-sm w-full relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                        <CheckIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-emerald-900 font-black text-sm uppercase tracking-tight">Case Logged</h4>
                        <p className="text-emerald-600/80 text-[10px] font-bold mt-0.5 uppercase tracking-widest">ID: {Math.floor(Math.random() * 10000)}</p>
                    </div>
                </div>
            </div>
        );
    }

    const allTypes = ['general', 'bug', 'refund', 'feature'];
    const visibleTypes = (draft.type && ['bug', 'refund', 'feature'].includes(draft.type)) ? [draft.type] : allTypes;

    return (
        <div className="mt-4 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl shadow-gray-200/50 border border-gray-200 overflow-hidden animate-fadeIn transition-all hover:border-indigo-200 group">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div className="flex items-center gap-3 text-indigo-600">
                    <div className="p-2 bg-indigo-50 rounded-xl shadow-sm">
                        <TicketIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">Draft Ticket</span>
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-700 text-[9px] font-black uppercase tracking-widest rounded-full border border-yellow-200/50 shadow-sm">Pending</div>
            </div>
            
            <div className="p-6 space-y-6">
                <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Subject</label>
                    <input className="w-full text-base font-black text-gray-900 bg-transparent border-b-2 border-gray-100 px-1 py-1.5 focus:border-indigo-500 focus:ring-0 outline-none transition-all placeholder-gray-300" value={editedDraft.subject || ''} onChange={e => setEditedDraft({...editedDraft, subject: e.target.value})} placeholder="What's the issue?" />
                </div>

                {visibleTypes.length > 1 && (
                    <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Category</label>
                        <div className="flex gap-2 flex-wrap">
                            {visibleTypes.map(t => (
                                <button key={t} onClick={() => setEditedDraft({...editedDraft, type: t as any})} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all transform active:scale-95 ${editedDraft.type === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5 ml-1">Details</label>
                    <textarea className="w-full text-xs font-medium text-gray-600 bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all resize-none min-h-[120px] leading-relaxed shadow-inner" value={editedDraft.description || ''} onChange={e => setEditedDraft({...editedDraft, description: e.target.value})} placeholder="Please describe exactly what happened..." />
                </div>
            </div>

            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button onClick={onCancel} disabled={isSubmitting} className="px-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors">Discard</button>
                <button onClick={() => onConfirm(editedDraft)} disabled={isSubmitting} className="flex-1 bg-[#1A1A1E] text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all transform hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 disabled:opacity-70">
                    {isSubmitting ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <>Submit Ticket <ArrowRightIcon className="w-3.5 h-3.5 opacity-50"/></>}
                </button>
            </div>
        </div>
    );
};

export const FormattedMessage: React.FC<{ text: string; isWelcome?: boolean }> = ({ text, isWelcome }) => {
    const parseBold = (str: string) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
            return part;
        });
    };
    return (
        <div className={`space-y-4 ${isWelcome ? 'pt-1' : ''} break-words w-full`}>
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={i} className="h-1"></div>;
                if (isWelcome && i === 0) return <h3 key={i} className="font-black text-[clamp(20px,3.2vh,28px)] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 mb-4 tracking-tighter leading-none">{trimmed.replace(/^#+\s*/, '')}</h3>;
                if (trimmed.startsWith('###') || trimmed.startsWith('##')) return <h3 key={i} className="font-black text-[clamp(13px,1.8vh,16px)] mt-4 mb-2 tracking-tight text-gray-800 uppercase">{trimmed.replace(/^#+\s*/, '')}</h3>;
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return (<div key={i} className="flex gap-4 items-start pl-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 shadow-sm"></div><span className="flex-1 leading-relaxed text-slate-600 text-[clamp(12px,1.6vh,14px)] font-medium">{parseBold(trimmed.replace(/^[-*]\s*/, ''))}</span></div>);
                return <p key={i} className="leading-relaxed text-slate-600 text-[clamp(12px,1.6vh,14px)] font-medium">{parseBold(line)}</p>;
            })}
        </div>
    );
};

export const PixaBotIcon = () => (
    <div className="w-[clamp(32px,5vh,40px)] h-[clamp(32px,5vh,40px)] rounded-2xl flex items-center justify-center shrink-0 bg-gradient-to-br from-white to-gray-50 border border-gray-100 shadow-sm overflow-hidden p-1">
         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-full h-full">
            <path fill="#BF360C" d="M13 30h22v12H13z"/>
            <g fill="#FFA726"><circle cx="10" cy="26" r="4"/><circle cx="38" cy="26" r="4"/></g>
            <path fill="#FFB74D" d="M39 19c0-12.7-30-8.3-30 0v10c0 8.3 6.7 15 15 15s15-6.7 15-15V19z"/>
            <g fill="#784719"><circle cx="30" cy="26" r="2"/><circle cx="18" cy="26" r="2"/></g>
            <path fill="#FF5722" d="M24 2C15.5 2 3 7.8 3 35.6L13 42V24l16.8-9.8L35 21v21l10-8.2c0-5.6-.9-29-15.4-29L28.2 2H24z"/>
            <path fill="#757575" d="M45 24c-.6 0-1 .4-1 1v-7c0-8.8-7.2-16-16-16h-9c-.6 0-1 .4-1 1s.4 1 1 1h9c7.7 0 14 6.3 14 14v10c0 .6.4 1 1 1s1-.4 1-1v2c0 3.9-3.1 7-7 7H24c-.6 0-1 .4-1 1s.4 1 1 1h13c5 0 9-4 9-9v-5c0-.6-.4-1-1-1z"/>
        </svg>
    </div>
);

export const UserMessageIcon = ({ user }: { user: any }) => (
    <div className="w-[clamp(32px,5vh,40px)] h-[clamp(32px,5vh,40px)] rounded-full flex items-center justify-center shrink-0 bg-indigo-600 border-2 border-white shadow-md text-[clamp(10px,1.4vh,13px)] font-black text-white overflow-hidden uppercase">
        {user?.avatar || <UserIcon className="w-5 h-5" />}
    </div>
);

export const QuickActions: React.FC<{ onAction: (action: any) => void; className?: string }> = ({ onAction, className }) => {
    const actions = [
        { label: "Billing", icon: CreditCardIcon, prompt: "I have a question about my credits or billing history.", autoSend: true },
        { label: "Guides", icon: LightbulbIcon, prompt: "Can you give me a quick guide on how to use the AI tools?", autoSend: true },
        { label: "Bug Report", icon: FlagIcon, prompt: "I encountered an issue/bug.", autoSend: true },
        { label: "Feature Idea", icon: SparklesIcon, prompt: "I have a new feature idea.", autoSend: true }
    ];
    return (
        <div className={`flex flex-wrap gap-2.5 animate-fadeIn ${className}`}>
            {actions.map((action, idx) => (
                <button key={idx} onClick={() => onAction(action)} className="group flex items-center gap-2.5 px-[min(2.5vh,18px)] py-[min(1.5vh,12px)] bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-white transition-all shadow-sm hover:shadow-xl transform hover:-translate-y-1 whitespace-nowrap active:scale-95">
                    <action.icon className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    {action.label}
                </button>
            ))}
        </div>
    );
};

export const ChatSkeleton = () => (
    <div className="space-y-10 p-8 opacity-60 animate-pulse flex flex-col items-center justify-center h-full w-full">
        <div className="w-full max-w-sm space-y-6">
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-2xl shrink-0"></div>
                <div className="space-y-2 flex-1 pt-1"><div className="w-2/3 h-3 bg-gray-200 rounded-full"></div><div className="w-1/2 h-3 bg-gray-200 rounded-full"></div></div>
            </div>
            <div className="flex gap-4 flex-row-reverse">
                <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-1 pt-1 flex flex-col items-end"><div className="w-3/4 h-3 bg-gray-200 rounded-full"></div><div className="w-1/3 h-3 bg-gray-200 rounded-full"></div></div>
            </div>
        </div>
        <div className="flex flex-col items-center gap-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-indigo-400 tracking-[0.25em] uppercase">Syncing Uplink...</p>
        </div>
    </div>
);
