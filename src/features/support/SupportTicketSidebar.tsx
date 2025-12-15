
import React from 'react';
import { Ticket } from '../../types';
import { 
    XIcon, 
    TicketIcon,
    InformationCircleIcon
} from '../../components/icons';
import { TicketHistoryItem } from './SupportComponents';

interface SupportTicketSidebarProps {
    tickets: Ticket[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const SupportTicketSidebar: React.FC<SupportTicketSidebarProps> = ({ tickets, isOpen, setIsOpen }) => {
    const openCount = tickets.filter(t => t.status === 'open').length;
    const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

    return (
        <>
            {/* Mobile/Tablet Backdrop - Now hidden on 2XL (1536px) and up */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-30 2xl:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={() => setIsOpen(false)}
            />

            <div className={`
                fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 
                2xl:static 2xl:w-full 2xl:h-full 2xl:shadow-none 2xl:bg-transparent 2xl:transform-none 2xl:z-auto
                ${isOpen ? 'translate-x-0' : 'translate-x-full 2xl:translate-x-0'}
            `}>
                <div className="bg-white/80 backdrop-blur-2xl rounded-none lg:rounded-[2rem] border-l lg:border border-white/60 h-full shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col relative w-full">
                    
                    {/* Mobile Close Button - visible on small screens */}
                    <button onClick={() => setIsOpen(false)} className="2xl:hidden absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full z-50">
                        <XIcon className="w-5 h-5" />
                    </button>

                    {/* Header - Fixed at Top via Flexbox behavior (shrink-0) */}
                    <div className="p-6 border-b border-gray-100/80 bg-white/60 backdrop-blur-md shrink-0 z-10 flex-none">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-gray-800 flex items-center gap-2 text-lg">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <TicketIcon className="w-5 h-5" />
                                </div>
                                Your Tickets
                            </h3>
                        </div>
                        
                        {/* Mini Stats */}
                        <div className="flex gap-2">
                            <div className="flex-1 bg-amber-50 rounded-xl p-2.5 border border-amber-100 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                <div>
                                    <span className="block text-[10px] font-bold text-amber-800 uppercase">Open</span>
                                    <span className="block text-lg font-black text-amber-900 leading-none">{openCount}</span>
                                </div>
                            </div>
                            <div className="flex-1 bg-emerald-50 rounded-xl p-2.5 border border-emerald-100 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <div>
                                    <span className="block text-[10px] font-bold text-emerald-800 uppercase">Resolved</span>
                                    <span className="block text-lg font-black text-emerald-900 leading-none">{resolvedCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Ticket List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar min-h-0 relative z-0 pb-16">
                        {tickets.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-60 p-6 space-y-4">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 shadow-inner">
                                    <InformationCircleIcon className="w-10 h-10 text-gray-300" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">No tickets yet</h4>
                                    <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
                                        Issues that require human review will appear here. Start a chat to get help!
                                    </p>
                                </div>
                            </div>
                        ) : (
                            tickets.map(ticket => (
                                <TicketHistoryItem key={ticket.id} ticket={ticket} />
                            ))
                        )}
                    </div>
                    
                    {/* Footer Gradient for smooth fade-out */}
                    <div className="h-12 bg-gradient-to-t from-white to-transparent pointer-events-none absolute bottom-0 left-0 right-0 z-20"></div>
                </div>
            </div>
        </>
    );
};
