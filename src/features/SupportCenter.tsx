
import React, { useState, useEffect } from 'react';
import { AuthProps, Ticket } from '../types';
import { getUserTickets } from '../services/supportService';
import { 
    LifebuoyIcon, 
    TicketIcon, 
    CreditCoinIcon
} from '../components/icons';
import { SupportChatWindow } from './support/SupportChatWindow';
import { SupportTicketSidebar } from './support/SupportTicketSidebar';

export const SupportCenter: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (auth.user) {
            loadTickets();
        }
    }, [auth.user]);

    const loadTickets = async () => {
        if (!auth.user) return;
        try {
            const data = await getUserTickets(auth.user.uid);
            setTickets(data);
        } catch(e) { console.error("Ticket load failed", e); }
    };

    const handleTicketCreated = (newTicket: Ticket) => {
        setTickets(prev => [newTicket, ...prev]);
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
                    <SupportChatWindow auth={auth} onTicketCreated={handleTicketCreated} />

                    {/* RIGHT: TICKET HISTORY */}
                    <SupportTicketSidebar tickets={tickets} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
                </div>
            </div>
        </div>
    );
};
