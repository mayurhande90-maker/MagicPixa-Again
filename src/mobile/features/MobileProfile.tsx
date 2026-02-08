import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthProps, User, View, AppConfig, CreditPack } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon, CheckIcon, PencilIcon,
    PixaSupportIcon, TicketIcon, StarIcon, LockIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { updateUserProfile, claimMilestoneBonus } from '../../firebase';
import { triggerCheckout } from '../../services/paymentService';
import { SupportChatWindow } from '../../features/support/SupportChatWindow';
import { createPortal } from 'react-dom';
import { CreatorRanksModal } from '../../components/CreatorRanksModal';

const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

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

    // --- DATA ---
    const membershipPacks: CreditPack[] = useMemo(() => {
        if (appConfig?.creditPacks && appConfig.creditPacks.length > 0) return appConfig.creditPacks;
        return [
            { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: '1 Brand Kit included.', popular: false, value: 1.98 },
            { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: '3 Brand Kits.', popular: true, value: 1.51 },
            { name: 'Studio Pack', price: 699, credits: 500, totalCredits: 575, bonus: 75, tagline: '10 Brand Kits.', popular: false, value: 1.21 },
            { name: 'Agency Pack', price: 1199, credits: 1000, totalCredits: 1200, bonus: 200, tagline: '50 Brand Kits.', popular: false, value: 0.99 },
        ];
    }, [appConfig]);

    const userPlan = user?.plan || 'Free';
    const currentPlanWeight = PLAN_WEIGHTS[userPlan] || 0;

    // --- RANK GRADIENTS ---
    const rankGradients: Record<string, string> = {
        'Rising Creator': 'from-blue-600 via-indigo-500 to-purple-600',
        'Professional Creator': 'from-blue-900 via-blue-700 to-sky-400',
        'Silver Creator': 'from-slate-500 via-slate-200 to-slate-600',
        'Gold Creator': 'from-amber-500 via-yellow-200 to-amber-800',
    };

    // --- LOYALTY ENGINE ---
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
        }, 300); 
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

    const handleCheckout = (pack: any, isPlan: boolean = false) => {
        if (!user) return;
        setLoadingPack(pack.name || pack.label);
        triggerCheckout({
            user,
            pkg: isPlan ? pack : { name: pack.label, price: pack.price, totalCredits: pack.credits },
            type: isPlan ? 'plan' : 'refill',
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
        <div className="flex flex-col h-full bg-[#FAFBFF] overflow-y-auto overflow-x-hidden no-scrollbar pb-32 animate-fadeIn w-full">
            
            {/* 1. IDENTITY HUB */}
            <div className="relative z-20 flex-none bg-white border-b border-gray-50 pt-10 pb-8 px-6 flex flex-col items-center text-center overflow-visible">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10"></div>
                
                {/* Profile Circle Area */}
                <div className="relative mb-8 overflow-visible">
                    <div className="w-24 h-24 rounded-full p-[3px] shadow-2xl shadow-indigo-500/10 bg-white relative overflow-hidden">
                        {/* Animated Gradient Ring Layer */}
                        <div className={`absolute inset-0 bg-gradient-to-tr ${rankGradients[badge.rank] || rankGradients['Rising Creator']} animate-gradient-slow`}></div>
                        
                        {/* Sweep Shine Layer */}
                        <div className="absolute inset-0 opacity-0 animate-ring-sweep pointer-events-none bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-[-25deg]" style={{ width: '200%', marginLeft: '-50%' }}></div>

                        {/* Avatar Surface */}
                        <div className="relative w-full h-full rounded-full bg-white p-1 flex items-center justify-center z-10">
                            <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-indigo-600">
                                {user?.avatar || user?.name?.[0]}
                            </div>
                        </div>
                    </div>

                    {/* Rank Badge */}
                    <div 
                        onClick={() => setShowRanksModal(true)}
                        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 whitespace-nowrap z-10 cursor-pointer active:scale-95 transition-transform ${badge.bgColor} ${badge.borderColor} animate-bounce-slight`}
                    >
                        <badge.Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${badge.color}`}>{badge.rank}</span>
                    </div>
                </div>

                <div className="w-full flex flex-col items-center">
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
                            <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-indigo-500 transition-colors">
                                <PencilIcon className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                    
                    <p className="text-[12px] text-gray-400 font-medium mt-4 bg-gray-50 px-5 py-1.5 rounded-full border border-gray-100 lowercase tracking-tight">
                        {user?.email}
                    </p>
                </div>
            </div>

            {/* 2. INTERACTION AREA */}
            <div className="relative z-10 mt-4 px-6 space-y-8">
                
                {/* LOYALTY BONUS */}
                <div className="bg-white p-7 rounded-[2.5rem] border border-gray-200 shadow-xl shadow-indigo-500/5 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-50 rounded-full -mr-12 -mt-12 transition-colors group-hover:bg-indigo-100"></div>
                    
                    <div className="relative z-10 flex items-center justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loyalty Bonus</p>
                                <button onClick={() => setShowRanksModal(true)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1 -m-1">
                                    <InformationCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900">
                                {lifetimeGens} <span className="text-sm font-medium text-gray-400 ml-1 tracking-normal">Generations</span>
                            </h3>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-indigo-600 leading-none">{nextMilestone}</p>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Target</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between text-[11px] font-black mb-3">
                            <span className="text-indigo-600 uppercase tracking-widest">Progress</span>
                            <span className="text-gray-500 uppercase tracking-widest">Get: <span className="text-indigo-600">+{nextReward} Credits</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner p-0.5 border border-gray-50">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full relative shadow-[0_0_12px_rgba(77,124,255,0.4)]" 
                                style={{ width: `${progressPercent}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[progress_2s_linear_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. MEMBERSHIP HUB */}
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-5 ml-2">
                        <StarIcon className="w-4 h-4 text-amber-500" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Membership Hub</h3>
                    </div>

                    {/* Current Plan Card - Prestigious Look */}
                    <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden mb-6 border border-white/5">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em] mb-1.5">Current Status</p>
                                    <h4 className="text-2xl font-black text-white tracking-tight">{userPlan === 'Free' ? 'Starter Access' : userPlan}</h4>
                                </div>
                                <div className="p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <ShieldCheckIcon className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="bg-white/5 text-white/70 text-[8px] font-bold px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">8K Output Ready</span>
                                <span className="bg-white/5 text-white/70 text-[8px] font-bold px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">Commercial License</span>
                                <span className="bg-white/5 text-white/70 text-[8px] font-bold px-2 py-1 rounded-lg border border-white/5 uppercase tracking-wider">Cloud Gallery</span>
                            </div>
                        </div>
                    </div>

                    {/* Plan Carousel */}
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
                        {membershipPacks.map((pack, idx) => {
                            const packWeight = PLAN_WEIGHTS[pack.name] || 0;
                            const isCurrent = currentPlanWeight === packWeight;
                            const isUpgrade = packWeight > currentPlanWeight;
                            const isDowngrade = packWeight < currentPlanWeight;
                            const isLoading = loadingPack === pack.name;

                            return (
                                <button 
                                    key={idx}
                                    onClick={() => isUpgrade && handleCheckout(pack, true)}
                                    disabled={!!loadingPack || !isUpgrade}
                                    className={`shrink-0 w-40 h-56 rounded-[2.2rem] p-1 shadow-lg transition-all relative overflow-hidden flex flex-col group ${
                                        isCurrent 
                                        ? 'bg-amber-500 shadow-amber-500/20 ring-4 ring-amber-500/10 scale-105 z-10' 
                                        : isUpgrade 
                                            ? 'bg-white border border-gray-100 active:scale-95' 
                                            : 'bg-gray-50 border-transparent opacity-60'
                                    }`}
                                >
                                    {isCurrent && <div className="absolute top-0 right-0 bg-white text-amber-600 text-[8px] font-black px-2.5 py-1 rounded-bl-xl z-20 shadow-sm uppercase">Active</div>}
                                    {!isUpgrade && !isCurrent && <div className="absolute inset-0 bg-gray-900/5 z-20 flex items-center justify-center backdrop-blur-[1px]"><LockIcon className="w-5 h-5 text-gray-400" /></div>}
                                    
                                    <div className={`w-full h-full rounded-[2rem] p-5 flex flex-col justify-between items-center text-center ${isCurrent ? 'bg-amber-500' : 'bg-transparent'}`}>
                                        {isLoading ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className={`w-8 h-8 border-3 rounded-full animate-spin ${isCurrent ? 'border-white/30 border-t-white' : 'border-indigo-100 border-t-indigo-600'}`} />
                                            </div>
                                        ) : (
                                            <>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-white' : 'text-gray-400'}`}>{pack.name.split(' ')[0]}</span>
                                                <div className="my-2">
                                                    <span className={`text-4xl font-black block leading-none tracking-tighter ${isCurrent ? 'text-white' : 'text-gray-900'}`}>{pack.totalCredits}</span>
                                                    <span className={`text-[8px] font-black uppercase tracking-widest mt-1 block ${isCurrent ? 'text-white/70' : 'text-gray-400'}`}>Credits</span>
                                                </div>
                                                <div className={`w-full py-2.5 rounded-xl text-xs font-black shadow-sm transition-all border ${
                                                    isCurrent 
                                                    ? 'bg-white text-amber-600 border-transparent' 
                                                    : isUpgrade 
                                                        ? 'bg-gray-900 text-white border-transparent' 
                                                        : 'bg-gray-200 text-gray-400 border-transparent'
                                                }`}>
                                                    {isCurrent ? 'Current' : isDowngrade ? 'Included' : `₹${pack.price}`}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 4. POWER REFILL STATION */}
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-5 ml-2">
                        <LightningIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Power Refill Station</h3>
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-6 -mx-1 px-1">
                        {refillPacks.map((pack, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleCheckout(pack)}
                                disabled={!!loadingPack}
                                className={`shrink-0 w-36 h-48 rounded-[2rem] p-1 bg-gradient-to-br ${pack.color} shadow-2xl shadow-indigo-500/10 active:scale-95 transition-all relative overflow-hidden group`}
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl transition-all group-active:scale-125"></div>
                                <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-[1.8rem] p-5 flex flex-col justify-between items-center text-center border border-white/10">
                                    {loadingPack === pack.label ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] leading-none">{pack.label}</span>
                                            <div className="my-2">
                                                <span className="text-4xl font-black text-white block leading-none tracking-tighter">{pack.credits}</span>
                                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest mt-1 block">Credits</span>
                                            </div>
                                            <div className="bg-white/20 border border-white/20 px-4 py-2 rounded-2xl w-full shadow-lg">
                                                <span className="text-white font-black text-xs">₹{pack.price}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* 5. SETTINGS LIST */}
                <div className="space-y-4 pt-2">
                    <button 
                        onClick={() => setIsSupportOpen(true)}
                        className="w-full flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2.2rem] active:bg-gray-50 transition-all text-left group shadow-xl shadow-gray-200/20"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-blue-100">
                                <PixaSupportIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <span className="text-base font-black text-gray-800 block leading-tight">Support Desk</span>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pixa 24/7 Concierge</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-active:translate-x-1 transition-transform" />
                    </button>

                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-6 bg-white border border-red-50 rounded-[2.2rem] active:bg-red-50 transition-all text-left group mt-4 shadow-sm"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-red-50 text-red-600 rounded-2xl shadow-sm group-active:scale-90 transition-transform border border-red-100">
                                <LogoutIcon className="w-6 h-6"/>
                            </div>
                            <span className="text-xs font-black text-red-700 uppercase tracking-[0.25em]">Sign Out Console</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* 6. FOOTER */}
            <div className="mt-20 mb-10 flex flex-col items-center gap-3 px-6 text-center opacity-30">
                <SparklesIcon className="w-5 h-5 text-gray-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.6em]">MagicPixa Studio</p>
            </div>

            {/* SUPPORT CONCIERGE TRAY */}
            {isSupportOpen && createPortal(
                <div className="fixed inset-0 z-[1000] flex items-end justify-center">
                    <div 
                        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
                        onClick={handleCloseSupport}
                    ></div>
                    
                    <button 
                        onClick={handleCloseSupport}
                        className={`absolute top-10 right-6 p-3 bg-white/20 backdrop-blur-xl border border-white/20 rounded-full text-white shadow-2xl transition-all z-[1010] active:scale-90 ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
                    >
                        <XIcon className="w-6 h-6" />
                    </button>

                    <div 
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{ transform: `translateY(${translateY}px)` }}
                        className={`relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-[85vh] transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'} ${touchStart === null ? 'ease-[cubic-bezier(0.32,0.72,0,1)]' : ''}`}
                    >
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
                @keyframes ring-sweep {
                    0% { transform: translateX(-150%) skewX(-25deg); opacity: 0; }
                    5% { opacity: 1; }
                    20% { transform: translateX(150%) skewX(-25deg); opacity: 0; }
                    100% { transform: translateX(150%) skewX(-25deg); opacity: 0; }
                }
                .animate-ring-sweep {
                    animation: ring-sweep 10s linear infinite;
                }
                @keyframes gradient-slow {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-slow {
                    background-size: 200% 200%;
                    animation: gradient-slow 6s ease infinite;
                }
                .animate-materialize { animation: materialize 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
            `}</style>
        </div>
    );
};
