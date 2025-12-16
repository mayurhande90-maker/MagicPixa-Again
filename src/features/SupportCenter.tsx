
import React, { useState, useEffect } from 'react';
import { AuthProps, Ticket, AppConfig } from '../types';
import { getUserTickets } from '../services/supportService';
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
        <div className="h-full w-full bg-[#F8FAFC] p-2 sm:p-4 lg:p-6 flex flex-col overflow-hidden relative">
            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            {/* UNIFIED CONSOLE CONTAINER */}
            <div className="relative z-10 w-full max-w-7xl mx-auto h-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col lg:flex-row">
                
                {/* LEFT PANEL: HISTORY (Desktop) */}
                <div className="hidden lg:flex w-80 flex-col border-r border-gray-100 bg-gray-50">
                    <SupportTicketSidebar 
                        tickets={tickets} 
                        isOpen={true} // Always visible on desktop in this layout
                        setIsOpen={() => {}} // No-op for desktop fixed pane
                        variant="desktop"
                    />
                </div>

                {/* RIGHT PANEL: CHAT INTERFACE */}
                <div className="flex-1 flex flex-col relative min-w-0 bg-white">
                    <SupportChatWindow 
                        auth={auth} 
                        appConfig={appConfig || null} 
                        onTicketCreated={handleTicketCreated} 
                        onToggleSidebar={() => setSidebarOpen(true)}
                    />
                </div>

                {/* MOBILE DRAWER: HISTORY */}
                <SupportTicketSidebar 
                    tickets={tickets} 
                    isOpen={sidebarOpen} 
                    setIsOpen={setSidebarOpen} 
                    variant="mobile"
                />
            </div>
        </div>
    );
};
