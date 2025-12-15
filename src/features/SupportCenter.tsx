
import React, { useState, useEffect } from 'react';
import { AuthProps, Ticket, AppConfig } from '../types';
import { getUserTickets } from '../services/supportService';
import { 
    LifebuoyIcon, 
    TicketIcon, 
    ShieldCheckIcon
} from '../components/icons';
import { SupportChatWindow } from './support/SupportChatWindow';
import { SupportTicketSidebar } from './support/SupportTicketSidebar';

export const SupportCenter: React.FC<{ auth: AuthProps; appConfig?: AppConfig | null }> = ({ auth, appConfig }) => {
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
        <div className="h-full w-full bg-[#F8FAFC] flex flex-col font-sans text-slate-900 overflow-hidden relative">
            
            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            {/* Premium Header - Fixed height, no shrinking */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200 py-3 px-4 lg:py-4 lg:px-8 z-30 shadow-sm flex-none h-16 lg:h-20">
                <div className="max-w-7xl mx-auto h-full flex justify-between items-center">
                    <div className="flex items-center gap-3 lg:gap-4">
                        <div className="p-2 lg:p-2.5 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
                            <LifebuoyIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg lg:text-xl font-black text-gray-900 tracking-tight leading-none">Support Center</h1>
                            <p className="text-[10px] lg:text-xs font-bold text-gray-400 mt-0.5 lg:mt-1 uppercase tracking-wider">AI Concierge & Help Desk</p>
                        </div>
                    </div>
                    
                    {/* Header Actions */}
                    <div className="flex items-center gap-3">
                        {/* Status Pills */}
                        <div className="hidden md:flex items-center gap-2 bg-white px-1.5 py-1.5 rounded-full border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold uppercase tracking-wide">System Online</span>
                            </div>
                            {auth.user?.isAdmin && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
                                    <ShieldCheckIcon className="w-3 h-3" />
                                    <span className="text-[10px] font-bold uppercase">Admin</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area - Flex Column for Robust Layout */}
            <div className="flex-1 w-full min-h-0 overflow-hidden relative z-10 flex flex-col">
                <div className="flex-1 w-full max-w-7xl mx-auto p-0 sm:p-4 lg:p-6">
                    {/* Updated Grid: xl instead of lg for 3 columns */}
                    <div className="h-full w-full grid grid-cols-1 xl:grid-cols-3 gap-0 sm:gap-6 relative">
                        
                        {/* LEFT: CHAT INTERFACE (Takes 2 columns, or full width on smaller screens) */}
                        <SupportChatWindow 
                            auth={auth} 
                            appConfig={appConfig || null} 
                            onTicketCreated={handleTicketCreated} 
                            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        />

                        {/* RIGHT: TICKET HISTORY (Takes 1 column on XL, drawer otherwise) */}
                        <SupportTicketSidebar 
                            tickets={tickets} 
                            isOpen={sidebarOpen} 
                            setIsOpen={setSidebarOpen} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
