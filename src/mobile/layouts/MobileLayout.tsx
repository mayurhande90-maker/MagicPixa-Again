import React from 'react';
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
    return (
        <div className="fixed top-0 left-0 w-full h-[100dvh] flex flex-col bg-white overflow-hidden">
            {/* Header - Compact */}
            <header className="flex-none px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-50">
                <MagicPixaLogo className="scale-90 origin-left" />
                
                {auth.isAuthenticated && auth.user && (
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                        <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[11px] font-black text-indigo-900">{auth.user.credits}</span>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 relative overflow-y-auto custom-scrollbar bg-white safe-area-bottom">
                {children}
            </main>

            {/* App Navigation */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <style>{`
                .safe-area-bottom {
                    padding-bottom: env(safe-area-inset-bottom);
                }
            `}</style>
        </div>
    );
};
