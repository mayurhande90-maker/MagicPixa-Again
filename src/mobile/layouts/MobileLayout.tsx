import React, { useState, useEffect, useRef } from 'react';
import { View, AuthProps } from '../../types';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MagicPixaLogo, CreditCoinIcon, GiftIcon } from '../../components/icons';
import { MobileReferralModal } from '../components/MobileReferralModal';

interface MobileLayoutProps {
    children: React.ReactNode;
    activeTab: View;
    setActiveTab: (tab: View) => void;
    auth: AuthProps;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, activeTab, setActiveTab, auth }) => {
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [isPulsing, setIsPulsing] = useState(false);
    const prevCreditsRef = useRef<number>(auth.user?.credits || 0);

    // Monitor credit balance for the deposit animation
    useEffect(() => {
        const currentCredits = auth.user?.credits || 0;
        if (currentCredits > prevCreditsRef.current) {
            // Trigger Deposit Animation
            setIsPulsing(true);
            const timer = setTimeout(() => setIsPulsing(false), 2000);
            prevCreditsRef.current = currentCredits;
            return () => clearTimeout(timer);
        }
        prevCreditsRef.current = currentCredits;
    }, [auth.user?.credits]);

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

                        {/* Credits Pill with Deposit Animation */}
                        <div 
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
                                isPulsing 
                                ? 'bg-indigo-600 border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.4)] scale-110' 
                                : 'bg-indigo-50 border-indigo-100'
                            }`}
                        >
                            <CreditCoinIcon className={`w-3.5 h-3.5 transition-colors ${isPulsing ? 'text-yellow-300' : 'text-indigo-600'}`} />
                            <span className={`text-[11px] font-black transition-colors ${isPulsing ? 'text-white' : 'text-indigo-900'}`}>
                                {auth.user.credits}
                            </span>
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
