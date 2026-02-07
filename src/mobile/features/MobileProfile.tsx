import React, { useState, useMemo, useRef } from 'react';
// FIX: Added AppConfig to imports from types to resolve prop definition error.
import { AuthProps, User, View, AppConfig } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon, CheckIcon, PencilIcon,
    // FIX: Changed SupportIcon to PixaSupportIcon to resolve import error.
    PixaSupportIcon, TicketIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { updateUserProfile, claimMilestoneBonus } from '../../firebase';
import { triggerCheckout } from '../../services/paymentService';
import { SupportChatWindow } from '../../features/support/SupportChatWindow';
import { createPortal } from 'react-dom';

// FIX: Added appConfig to component props to resolve "Cannot find name 'appConfig'" error.
export const MobileProfile: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const { user, setUser } = auth;
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    // --- STATE ---
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [loadingPack, setLoadingPack] = useState<string | null>(null);

    // --- LOYALTY ENGINE (Desktop Logic Sync) ---
    const lifetimeGens = user?.lifetimeGenerations || 0;
    const { nextMilestone, prevMilestone, nextReward } = useMemo(() => {
        let next = 10, prev = 0, reward = 5;
        if (lifetimeGens < 10) { next = 10; prev = 0; reward = 5; } 
        else if (lifetimeGens < 25) { next = 25; prev = 10; reward = 10; } 
        else if (lifetimeGens < 50) { next = 50; prev = 25; reward = 15; } 
        else if (lifetimeGens < 75) { next = 75; prev = 50; reward = 20; } 
        else if (lifetimeGens < 100) { next = 100; prev = 75; reward = 30; } 
        else { 
            const hundreds = Math.floor(lifetimeGens / 100); 
            prev = hundreds * 100; 
            next = (hundreds + 1) * 100; 
            reward = 30; 
        }
        return { nextMilestone: next, prevMilestone: prev, nextReward: reward };
    }, [lifetimeGens]);
    
    const progressPercent = Math.min(100, Math.max(0, nextMilestone > prevMilestone ? ((lifetimeGens - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 0));

    // --- HANDLERS ---
    const handleSaveName = async () => {
        if (!user || !newName.trim() || newName === user.name) {
            setIsEditingName(false);
            return;
        }
        setIsSavingName(true);
        try {
            await updateUserProfile(user.uid, { name: newName.trim() });
            setUser(prev => prev ? { ...prev, name: newName.trim() } : null);
            setIsEditingName(false);
        } catch (e) {
            console.error(e);
            alert("Failed to update name.");
        } finally {
            setIsSavingName(false);
        }
    };

    const handleCheckout = (pack: any) => {
        if (!user) return;
        setLoadingPack(pack.label);
        triggerCheckout({
            user,
            pkg: { name: pack.label, price: pack.price, totalCredits: pack.credits },
            type: 'refill',
            onSuccess: (updatedUser) => {
                setUser(updatedUser);
                setLoadingPack(null);
            },
            onCancel: () => setLoadingPack(null),
            onError: (err) => {
                alert(err);
                setLoadingPack(null);
            }
        });
    };

    const handleLogout = () => {
        if (window.confirm("Sign out of your creative console?")) {
            auth.handleLogout();
        }
    };

    const refillPacks = [
        { credits: 20, price: 49, label: 'Mini Boost', color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-200' },
        { credits: 150, price: 299, label: 'Power Pack', color: 'from-purple-500 to-indigo-700', iconColor: 'text-purple-200' },
        { credits: 500, price: 899, label: 'Mega Tank', color: 'from-amber-500 to-orange-600', iconColor: 'text-amber-200' }
    ];

    return (
        <div className="flex flex-col h-full bg-[#FAFBFF] overflow-y-auto no-scrollbar pb-32 animate-fadeIn">
            
            {/* 1. IDENTITY SPOTLIGHT */}
            <div className="pt-12 pb-10 px-6 bg-white border-b border-gray-50 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="relative mb-6">
                    <div className={`w-24 h-24 rounded-full p-1 border-4 ${badge.borderColor} shadow-2xl shadow-indigo-500/10 overflow-hidden bg-white`}>
                        <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-indigo-600">
                            {user?.avatar || user?.name?.[0]}
                        </div>
                    </div>
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 whitespace-nowrap z-10 ${badge.bgColor} ${badge.borderColor} animate-bounce-slight`}>
                        <badge.Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${badge.color}`}>{badge.rank}</span>
                    </div>
                </div>

                {isEditingName ? (
                    <div className="flex items-center gap-2 w-full max-w-xs animate-fadeIn">
                        <input 
                            autoFocus
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="flex-1 bg-gray-50 border-2 border-indigo-500 rounded-xl px-4 py-2 text-center font-black text-gray-900 outline-none"
                            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                        />
                        <button 
                            onClick={handleSaveName}
                            disabled={isSavingName}
                            className="p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50"
                        >
                            {isSavingName ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 justify-center group" onClick={() => setIsEditingName(true)}>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{user?.name}</h2>
                        <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 group-active:scale-90 transition-transform">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </div>
                    </div>
                )}
                
                <p className="text-[12px] text-gray-400 font-medium mt-3 bg-gray-50 px-4 py-1 rounded-full border border-gray-100 lowercase">
                    {user?.email}
                </p>
            </div>

            {/* 2. LOYALTY HUB (Desktop Style) */}
            <div className="px-6 mt-8">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-[0_4px_25px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Account Status</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Generative Loyalty</p>
                            </div>
                        </div>
                        <div className="text-right">
                             <p className="text-2xl font-black text-indigo-600 leading-none">{lifetimeGens}</p>
                             <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Assets</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                            <span className="text-indigo-600">Tier Progress</span>
                            <span className="text-gray-400">{nextMilestone - lifetimeGens} more for reward</span>
                        </div>
                        <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-1000 ease-out rounded-full relative"
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-emerald-500 font-black text-[9px] uppercase tracking-widest bg-emerald-50 py-1.5 rounded-xl border border-emerald-100">
                            <CheckIcon className="w-3 h-3" />
                            Next Milestone: +{nextReward} Credits
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. POWER REFILL STATION (Cards) */}
            <div className="px-6 mt-8">
                <div className="flex items-center gap-2 mb-4 ml-2">
                    <LightningIcon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Instant Power Refill</h3>
                </div>
                
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 -mx-1 px-1">
                    {refillPacks.map((pack, idx) => (
                        <button 
                            key={idx}
                            onClick={() => handleCheckout(pack)}
                            disabled={!!loadingPack}
                            className={`shrink-0 w-32 h-44 rounded-[1.8rem] p-1 bg-gradient-to-br ${pack.color} shadow-lg shadow-indigo-500/10 active:scale-95 transition-all relative overflow-hidden group`}
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
                            <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-[1.6rem] p-4 flex flex-col justify-between items-center text-center">
                                {loadingPack === pack.label ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : (
                                    <>
                                        <span className="text-[9px] font-black text-white/70 uppercase tracking-widest leading-none">{pack.label}</span>
                                        <div>
                                            <span className="text-3xl font-black text-white block leading-none">{pack.credits}</span>
                                            <span className="text-[8px] font-bold text-white/50 uppercase tracking-tighter">Credits</span>
                                        </div>
                                        <div className="bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl w-full">
                                            <span className="text-white font-black text-xs">₹{pack.price}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 4. SETTINGS LIST */}
            <div className="px-6 mt-6 space-y-3">
                <button 
                    onClick={() => setIsSupportOpen(true)}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.8rem] active:bg-gray-50 transition-all text-left group shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-blue-100">
                            {/* FIX: Use PixaSupportIcon for the Support Desk entry point. */}
                            <PixaSupportIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <span className="text-sm font-black text-gray-800 block">Support Desk</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Pixa 24/7 Concierge</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                </button>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-5 bg-red-50/30 border border-red-100 rounded-[1.8rem] active:bg-red-50 transition-all text-left group mt-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white text-red-600 rounded-2xl shadow-sm group-active:scale-90 transition-transform border border-red-50">
                            <LogoutIcon className="w-5 h-5"/>
                        </div>
                        <span className="text-xs font-black text-red-700 uppercase tracking-[0.2em]">Sign Out Console</span>
                    </div>
                </button>
            </div>

            {/* 5. FOOTER */}
            <div className="mt-16 mb-10 flex flex-col items-center gap-2 px-6 text-center opacity-30">
                <SparklesIcon className="w-4 h-4 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">MagicPixa v1.0.3</p>
            </div>

            {/* SUPPORT CONCIERGE BOTTOM SHEET */}
            {isSupportOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end justify-center animate-fadeIn">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSupportOpen(false)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-[80vh] transition-transform duration-500 ease-out translate-y-0">
                        {/* Drag handle */}
                        <div className="h-1.5 w-12 bg-gray-100 rounded-full mx-auto mt-3 mb-1 shrink-0"></div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <SupportChatWindow 
                                auth={auth} 
                                appConfig={appConfig} 
                                onTicketCreated={() => {}} 
                                onToggleSidebar={() => {}} 
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }
            `}</style>
        </div>
    );
};
