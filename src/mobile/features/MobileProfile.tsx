import React, { useState, useMemo } from 'react';
import { AuthProps, View } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon,
    // Import missing CheckIcon
    CheckIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { deductCredits, claimMilestoneBonus } from '../../firebase';

export const MobileProfile: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const { user } = auth;
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

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

    const handleLogout = () => {
        if (window.confirm("Sign out of your creative console?")) {
            auth.handleLogout();
        }
    };

    const handleRecharge = () => {
        (window as any).setActiveTab('billing');
    };

    return (
        <div className="flex flex-col h-full bg-[#FAFBFF] overflow-y-auto no-scrollbar pb-32 animate-fadeIn">
            
            {/* 1. IDENTITY SPOTLIGHT */}
            <div className="pt-12 pb-10 px-6 bg-white border-b border-gray-50 flex flex-col items-center text-center">
                <div className="relative mb-6">
                    {/* Large 96px Avatar with Rank Glow */}
                    <div className={`w-24 h-24 rounded-full p-1 border-4 ${badge.borderColor} shadow-2xl shadow-indigo-500/10 overflow-hidden bg-white`}>
                        <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-indigo-600">
                            {user?.avatar || user?.name?.[0]}
                        </div>
                    </div>
                    {/* Rank Badge Indicator */}
                    <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 whitespace-nowrap z-10 ${badge.bgColor} ${badge.borderColor} animate-bounce-slight`}>
                        <badge.Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${badge.color}`}>{badge.rank}</span>
                    </div>
                    {/* Subtle Rank Aura */}
                    <div className={`absolute inset-0 rounded-full blur-xl opacity-20 -z-10 ${badge.bgColor}`}></div>
                </div>

                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{user?.name}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">{user?.email}</p>
            </div>

            {/* 2. LOYALTY BONUS (Desktop Style) */}
            <div className="px-6 mt-8">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-[0_4px_25px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Account Status</h3>
                                <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Generative Loyalty</p>
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

            {/* 3. POWER RECHARGE COLUMN */}
            <div className="px-6 mt-6">
                <div className="bg-gray-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none"></div>
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-3">Power Reserves</p>
                            <div className="flex items-center justify-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                                    <CreditCoinIcon className="w-8 h-8 text-yellow-400" />
                                </div>
                                <span className="text-5xl font-black tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{user?.credits || 0}</span>
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 mt-3 uppercase tracking-widest">Available Credits</p>
                        </div>

                        <button 
                            onClick={handleRecharge}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.4rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-950/50 flex items-center justify-center gap-3 active:scale-95 transition-all group border border-white/10"
                        >
                            <LightningIcon className="w-5 h-5 text-yellow-300 group-hover:animate-pulse" />
                            Instant Recharge
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. SETTINGS LIST */}
            <div className="px-6 mt-10 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Creator Console</p>
                
                <button 
                    onClick={() => (window as any).setActiveTab('daily_mission')}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.8rem] active:bg-gray-50 transition-all text-left group shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-amber-100">
                            <FlagIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <span className="text-sm font-black text-gray-800 block">Daily Mission</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Claim +5 Bonus</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                </button>

                <button 
                    onClick={() => (window as any).setActiveTab('support_center')}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.8rem] active:bg-gray-50 transition-all text-left group shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-blue-100">
                            <ShieldCheckIcon className="w-5 h-5"/>
                        </div>
                        <div>
                            <span className="text-sm font-black text-gray-800 block">Support Desk</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Technical Help</p>
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

            <div className="mt-16 mb-10 flex flex-col items-center gap-2 px-6 text-center opacity-30">
                <SparklesIcon className="w-4 h-4 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">MagicPixa Studio</p>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Designed for Professional Creators</p>
            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
