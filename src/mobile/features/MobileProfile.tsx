import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthProps, User, View, AppConfig } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon, CheckIcon, PencilIcon,
    PixaSupportIcon, TicketIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { updateUserProfile, claimMilestoneBonus } from '../../firebase';
import { triggerCheckout } from '../../services/paymentService';
import { SupportChatWindow } from '../../features/support/SupportChatWindow';
import { createPortal } from 'react-dom';
import { CreatorRanksModal } from '../../components/CreatorRanksModal';

export const MobileProfile: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const { user, setUser } = auth;
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    // --- STATE ---
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [isSavingName, setIsSavingName] = useState(false);
    
    // Support Tray States
    const [isSupportOpen, setIsSupportOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [translateY, setTranslateY] = useState(0);

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [showRanksModal, setShowRanksModal] = useState(false);

    // --- LOYALTY ENGINE (Exact Desktop Dashboard Logic) ---
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
    const handleCloseSupport = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsSupportOpen(false);
            setIsClosing(false);
            setTranslateY(0);
        }, 300); // Duration of slide-down animation
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - touchStart;
        if (diff > 0) {
            setTranslateY(diff);
        }
    };

    const handleTouchEnd = () => {
        if (translateY > 120) {
            handleCloseSupport();
        } else {
            setTranslateY(0);
        }
        setTouchStart(null);
    };

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
            
            {/* 1. IDENTITY SPOTLIGHT - Increased Padding Bottom to prevent overlap */}
            <div className="pt-12 pb-16 px-6 bg-white border-b border-gray-50 flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="relative mb-6 z-10">
                    <div className={`w-24 h-24 rounded-full p-1 border-4 ${badge.borderColor} shadow-2xl shadow-indigo-500/10 overflow-hidden bg-white`}>
                        <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-indigo-600">
                            {user?.avatar || user?.name?.[0]}
                        </div>
                    </div>
                    <div 
                        onClick={() => setShowRanksModal(true)}
                        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 whitespace-nowrap z-10 cursor-pointer active:scale-95 transition-transform ${badge.bgColor} ${badge.borderColor} animate-bounce-slight`}
                    >
                        <badge.Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${badge.color}`}>{badge.rank}</span>
                    </div>
                </div>

                <div className="relative z-10 w-full flex flex-col items-center">
                    {isEditingName ? (
                        <div className="flex items-center gap-2 w-full max-w-[280px] animate-fadeIn">
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
                                className="p-2 bg-indigo-600 text-white rounded-xl shadow-md disabled:opacity-50 shrink-0"
                            >
                                {isSavingName ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 justify-center group cursor-pointer active:scale-95 transition-transform" onClick={() => setIsEditingName(true)}>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">{user?.name}</h2>
                            <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400 group-hover:text-indigo-500 transition-colors">
                                <PencilIcon className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    )}
                    
                    <p className="text-[12px] text-gray-400 font-medium mt-3 bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100 lowercase tracking-tight">
                        {user?.email}
                    </p>
                </div>
            </div>

            {/* 2. LOYALTY BONUS (EXACT Desktop Design Sync) */}
            <div className="px-6 mt-8">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                    {/* Decorative Indigo Orb */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-8 -mt-8 transition-colors group-hover:bg-indigo-100"></div>
                    
                    <div className="relative z-10 flex items-center justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Loyalty Bonus</p>
                                <button onClick={() => setShowRanksModal(true)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1 -m-1">
                                    <InformationCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">
                                {lifetimeGens} <span className="text-sm font-medium text-gray-400">Generations</span>
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-indigo-600 leading-none">{nextMilestone}</p>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">Target</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between text-[11px] font-bold mb-2">
                            <span className="text-indigo-600 uppercase tracking-wider">Progress</span>
                            <span className="text-gray-500 font-black">Next: +{nextReward} Credits</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full relative shadow-[0_0_10px_rgba(77,124,255,0.3)]" 
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[progress_2s_linear_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. POWER REFILL STATION */}
            <div className="px-6 mt-10">
                <div className="flex items-center gap-2 mb-4 ml-2">
                    <LightningIcon className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Power Refill Station</h3>
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
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">MagicPixa Studio</p>
            </div>

            {/* SUPPORT CONCIERGE TRAY */}
            {isSupportOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end justify-center">
                    {/* Backdrop */}
                    <div 
                        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
                        onClick={handleCloseSupport}
                    ></div>
                    
                    {/* Floating Close Button - Outside & Blurry */}
                    <button 
                        onClick={handleCloseSupport}
                        className={`absolute top-10 right-6 p-3 bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white shadow-2xl transition-all z-[1010] active:scale-90 ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                    >
                        <XIcon className="w-6 h-6" />
                    </button>

                    {/* Tray Surface */}
                    <div 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ transform: `translateY(${translateY}px)` }}
                        className={`relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-[85vh] transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'} ${touchStart === null ? 'ease-[cubic-bezier(0.32,0.72,0,1)]' : ''}`}
                    >
                        {/* Drag handle */}
                        <div className="h-1.5 w-16 bg-gray-200 rounded-full mx-auto mt-3 mb-2 shrink-0 shadow-inner"></div>
                        
                        <div className="flex-1 overflow-hidden flex flex-col pt-2">
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

            {showRanksModal && (
                <CreatorRanksModal 
                    currentGens={lifetimeGens} 
                    onClose={() => setShowRanksModal(false)} 
                />
            )}
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes progress { 
                    0% { background-position: 0% 0%; } 
                    100% { background-position: 200% 0%; } 
                }
                .animate-materialize { animation: materialize 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
            `}</style>
        </div>
    );
};
