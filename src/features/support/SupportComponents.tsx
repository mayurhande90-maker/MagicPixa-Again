
import React, { useState, useEffect } from 'react';
import { Ticket } from '../../types';
import { 
    SparklesIcon, 
    CheckIcon, 
    TicketIcon, 
    LightbulbIcon, 
    FlagIcon, 
    CreditCardIcon, 
    UserIcon 
} from '../../components/icons';

// --- HELPERS ---

export const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
};

// --- COMPONENTS ---

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
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
    // @ts-ignore
    const s = styles[status] || styles.open;
    // @ts-ignore
    const c = indicatorColor[status] || 'bg-gray-400';

    return (
        <span className={`pl-2 pr-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ring-2 ring-offset-1 ring-offset-white ${s} inline-flex items-center gap-1.5 shadow-sm`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c} ${status === 'open' ? 'animate-pulse' : ''}`}></span>
            {status}
        </span>
    );
};

export const TicketHistoryItem: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
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

export const FormattedMessage: React.FC<{ text: string; isWelcome?: boolean }> = ({ text, isWelcome }) => {
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

export const PixaBotIcon = () => (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-sm overflow-hidden p-1">
         <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 32 32">
            <g fill="none">
                <g filter="url(#f2864id1b)">
                    <path fill="#2D2B2E" fillRule="evenodd" d="M23.173 11.983a3.25 3.25 0 0 0 .323-1.427a3.28 3.28 0 0 0-.268-1.305h.005a3.199 3.199 0 0 0-.281-.513l-.002-.004a3.24 3.24 0 0 1-.526-1.77v-.01a3.3 3.3 0 0 0-3.3-3.3a.54.54 0 0 1-.455-.233a3.306 3.306 0 0 0-2.682-1.376a3.306 3.306 0 0 0-2.682 1.376a.565.565 0 0 1-.455.233l-.085.001a3.3 3.3 0 0 0-3.214 3.298v.01a3.24 3.24 0 0 1-.526 1.771l-.003.004a3.3 3.3 0 0 0-.22 3.245a.52.52 0 0 1 0 .455a3.271 3.271 0 0 0-.324 1.407a3.213 3.213 0 0 0 3.218 3.218h8.582a3.213 3.213 0 0 0 3.218-3.218a3.27 3.27 0 0 0-.323-1.407a.514.514 0 0 1 0-.455ZM10.913 9.31H10.9l1.199 2.355c.123 2.803 1.217 0 3.888 0c2.672 0 3.837 3.12 3.96.317l1.136-3.197c-.054-1.245-.956-1.332-1.136-1.332h-3.22a3.863 3.863 0 0 1-3.19-1.674a.264.264 0 0 0-.46.051l-.083.194A2.304 2.304 0 0 1 11.702 7.3c-.236.122-.79.49-.81 1.438l.01.306l.01.266Z" clipRule="evenodd"/>
                </g>
                <path fill="#FF3B9A" d="M2.063 29.955c0-1.969.39-6.76 3.216-9.86C8.81 16.222 13.793 15.643 16 15.643c2.207 0 7.19.579 10.721 4.454c2.826 3.1 3.216 7.89 3.216 9.859H2.063Z"/>
                <path fill="#4690E6" d="M16.031 15.638c-6.228 0-11.584 4.188-11.992 14.281v.036h23.984v-.036c-.408-10.093-5.764-14.28-11.992-14.28Z"/>
                <path fill="#4E9EFF" d="M23.68 18.468v11.487h4.343v-.036c-.22-5.447-1.881-9.174-4.343-11.451Z"/>
                <path fill="#4E9EFF" d="M8.383 18.468v11.487H4.039v-.036c.22-5.447 1.882-9.174 4.344-11.451Z"/>
                <path fill="#2F63D5" d="M12.874 23.42a.885.885 0 0 0-.762 1.333l2.143 3.638a1.49 1.49 0 0 0 2.568 0l2.142-3.638a.885.885 0 0 0-.762-1.334h-5.329Z"/>
                <path fill="#2F62B7" d="m15.992 20.435l-5.04-3.023c-.323-.2-.663-.512-.663-.98c0-.497.585-.533.885-.544l4.818-.078l4.819.078c.3.01.884.047.884.543c0 .469-.34.781-.663.98l-5.04 3.024Z"/>
                <ellipse cx="15.992" cy="20.17" fill="#F6C546" rx="1.048" ry="1.055"/>
                <rect width="4.109" height="5.399" x="13.933" y="13.298" fill="#E1A18F" rx="2.055"/>
                <path fill="#CC9987" d="M11.302 12.182a1.61 1.61 0 1 0 0-3.218a1.61 1.61 0 0 0 0 3.218Z"/>
                <path fill="#CC9987" d="M20.815 12.182a1.61 1.61 0 1 0 0-3.218a1.61 1.61 0 0 0 0 3.218Z"/>
                <defs>
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
                </defs>
            </g>
        </svg>
    </div>
);

export const UserMessageIcon = ({ user }: { user: any }) => (
    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-md overflow-hidden">
        {user?.avatar ? (
             <span className="text-sm font-bold text-gray-600">{user.avatar}</span>
        ) : (
             <UserIcon className="w-5 h-5 text-gray-500" />
        )}
    </div>
);

export const QuickActions: React.FC<{ onAction: (action: any) => void; className?: string }> = ({ onAction, className }) => {
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

export const ChatSkeleton = () => (
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
