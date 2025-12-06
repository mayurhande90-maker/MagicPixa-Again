
import React from 'react';
import { Ticket } from '../../types';
import { 
    XIcon, 
    TicketIcon 
} from '../../components/icons';
import { TicketHistoryItem } from './SupportComponents';

interface SupportTicketSidebarProps {
    tickets: Ticket[];
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export const SupportTicketSidebar: React.FC<SupportTicketSidebarProps> = ({ tickets, isOpen, setIsOpen }) => {
    return (
        <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 z-40 lg:relative lg:translate-x-0 lg:w-auto lg:h-full lg:shadow-none lg:bg-transparent lg:z-auto ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="bg-white lg:bg-white/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/80 h-full shadow-lg lg:shadow-xl lg:shadow-indigo-200/20 overflow-hidden flex flex-col relative">
                
                {/* Mobile Close Button */}
                <button onClick={() => setIsOpen(false)} className="lg:hidden absolute top-4 right-4 p-2 text-gray-500">
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
    );
};
