import React, { useState } from 'react';
import { View, AuthProps } from '../../types';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MagicPixaLogo, CreditCoinIcon, GiftIcon } from '../../components/icons';
import { MobileReferralModal } from '../components/MobileReferralModal';

interface MobileLayoutProps {
    // Corrected React.Node to React.ReactNode
    children: React.ReactNode;
    activeTab: View;
    setActiveTab: (tab: View) => void;
    auth: AuthProps;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, activeTab, setActiveTab, auth }) => {
    const [showReferralModal, setShowReferralModal] = useState(false);

    return (
        <div className="fixed inset-0 flex flex-col bg-white overflow-hidden safe-area-inset">
            {/* Header - Compact */}
            <header className="flex-none px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-50">
                <MagicPixaLogo className="scale-90 origin-left" />
                
                {auth.isAuthenticated && auth.user && (
                    <div className="flex items-center gap-2">
                        {/* Refer & Earn Shaky Icon */}
                        <button 
                            onClick={() => setShowReferralModal(true)}
                            className="p-2 bg-purple-50 text-purple-600 rounded-full border border-purple-100 shadow-sm animate-shaky-icon active:scale-90 transition-transform"
                        >
                            <GiftIcon className="w-4 h-4" />
                        </button>

                        {/* Credits Pill */}
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[11px] font-black text-indigo-900">{auth.user.credits}</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 relative overflow-y-auto custom-scrollbar bg-white">
                {children}
            </main>

            {/* App Navigation */}
            <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {showReferralModal && auth.user && (
                <MobileReferralModal 
                    user={auth.user} 
                    onClose={() => setShowReferralModal(false)}
                    onClaimSuccess={(updatedUser) => {
                        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                    }}
                />
            )}

            <style>{`
                .safe-area-inset {
                    padding-bottom: env(safe-area-inset-bottom);
                }
                @keyframes shaky-icon {
                    0% { transform: rotate(0deg); }
                    20% { transform: rotate(8deg); }
                    40% { transform: rotate(-8deg); }
                    60% { transform: rotate(4deg); }
                    80% { transform: rotate(-4deg); }
                    100% { transform: rotate(0deg); }
                }
                .animate-shaky-icon {
                    animation: shaky-icon 0.8s cubic-bezier(.36,.07,.19,.97) infinite;
                    transform: translate3d(0, 0, 0);
                    backface-visibility: hidden;
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
};
