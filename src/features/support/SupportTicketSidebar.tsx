
import React from 'react';
import { Ticket } from '../../types';
import { 
    XIcon, 
    InformationCircleIcon
} from '../../components/icons';
import { TicketHistoryItem } from './SupportComponents';

interface SupportTicketSidebarProps {
    tickets: Ticket[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    variant?: 'mobile' | 'desktop';
}

export const SupportTicketSidebar: React.FC<SupportTicketSidebarProps> = ({ tickets, isOpen, setIsOpen, variant = 'mobile' }) => {
    const openCount = tickets.filter(t => t.status === 'open').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

    // Content Component to reuse
    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-gray-50/50">
            {/* Header */}
            <div className="p-[min(3vh,24px)] border-b border-gray-100 bg-white shrink-0 shadow-sm">
                <div className="flex items-center justify-between mb-[min(3vh,24px)]">
                    <h3 className="font-black text-gray-800 flex items-center gap-2 text-[clamp(11px,1.5vh,14px)] uppercase tracking-widest">
                        Support History
                    </h3>
                    {variant === 'mobile' && (
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-amber-50 rounded-2xl p-[min(2vh,16px)] border border-amber-100 shadow-sm">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest block mb-1">Open</span>
                        <span className="text-[clamp(18px,3vh,24px)] font-black text-amber-900 leading-none">{openCount}</span>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-[min(2vh,16px)] border border-emerald-100 shadow-sm">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block mb-1">Solved</span>
                        <span className="text-[clamp(18px,3vh,24px)] font-black text-emerald-900 leading-none">{resolvedCount}</span>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-[min(2vh,16px)] custom-scrollbar min-h-0">
                {tickets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center border border-gray-100 shadow-sm mb-4">
                            <InformationCircleIcon className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No activity found</p>
                    </div>
                ) : (
                    tickets.map(ticket => (
                        <TicketHistoryItem key={ticket.id} ticket={ticket} />
                    ))
                )}
            </div>
            
            {/* Footer gradient for scroll visual */}
            <div className="h-10 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none shrink-0"></div>
        </div>
    );

    if (variant === 'desktop') {
        return <SidebarContent />;
    }

    // Mobile Drawer Implementation
    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsOpen(false)}
            />
            <div className={`
                fixed inset-y-0 right-0 w-[clamp(280px,85vw,360px)] bg-white shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50 lg:hidden
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <SidebarContent />
            </div>
        </>
    );
};
