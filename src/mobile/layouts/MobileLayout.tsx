import React, { useState, useEffect } from 'react';
import { View, AuthProps } from '../../types';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MagicPixaLogo, CreditCoinIcon } from '../../components/icons';

interface MobileLayoutProps {
    children: React.ReactNode;
    activeTab: View;
    setActiveTab: (tab: View) => void;
    auth: AuthProps;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, activeTab, setActiveTab, auth }) => {
    const [isPulsing, setIsPulsing] = useState(false);
    const credits = auth.user?.credits || 0;

    // Pulse effect when credits increase
    useEffect(() => {
        if (credits > 0) {
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 1000);
            return () => clearTimeout(timer);
        }
    }, [credits]);

    return (
        <div className="fixed inset-0 flex flex-col bg-white overflow-hidden safe-area-inset">
            {/* Header - Compact */}
            <header className="flex-none px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-[100]">
                <MagicPixaLogo className="scale-90 origin-left" />
                
                {auth.isAuthenticated && auth.user && (
                    <div 
                        id="mobile-credit-pill"
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
                            isPulsing 
                            ? 'bg-yellow-400 border-yellow-300 scale-110 shadow-[0_0_20px_rgba(250,204,21,0.4)] text-black' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-900'
                        }`}
                    >
                        <CreditCoinIcon className={`w-3.5 h-3.5 ${isPulsing ? 'text-black' : 'text-indigo-600'}`} />
                        <span className="text-[11px] font-black">{auth.user.credits}</span>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-white">
                {children}
            </main>

            {/* App Navigation */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <style>{`
                .safe-area-inset {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            `}</style>
        </div>
    );
};
