import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthProps, User, View, AppConfig, CreditPack } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon, CheckIcon, PencilIcon,
    PixaSupportIcon, TicketIcon, StarIcon, LockIcon,
    ChevronDownIcon, ArrowRightIcon
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

const PLAN_BENEFITS: Record<string, string[]> = {
    'Starter Pack': ['50 AI Credits', '1 Brand Kit included', '720p Resolution Output', 'Community Support', 'Credits Never Expire'],
    'Creator Pack': ['165 AI Credits (15 Bonus)', '3 Brand Kits included', '4K High-Res Output', 'Standard Support', 'Commercial Usage Rights'],
    'Studio Pack': ['575 AI Credits (75 Bonus)', '10 Brand Kits included', '8K Ultra-Res Output', 'Priority Rendering', 'Elite Retoucher Access'],
    'Agency Pack': ['1200 AI Credits (200 Bonus)', '50 Brand Kits included', 'Unlimited 8K Exports', 'Dedicated Account Manager', 'White-label Support']
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
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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

    const benefits = [
        { label: 'Unlimited\nAssets', icon: SparklesIcon, color: 'blue', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', iconBg: 'bg-blue-500' },
        { label: 'No\nWatermarks', icon: CheckIcon, color: 'green', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900', iconBg: 'bg-green-500' },
        { label: 'Credits Never\nExpire', icon: LightningIcon, color: 'purple', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', iconBg: 'bg-green-500' },
        { label: 'Priority\nSupport', icon: PixaSupportIcon, color: 'indigo', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-900', iconBg: 'bg-indigo-500' },
        { label: 'High Resolution\nOutput', icon: ShieldCheckIcon, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900', iconBg: 'bg-amber-500' },
    ];

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
        { credits: 20, price: 49, label: 'Mini Boost', color: 'from-blue-400 to-blue-600', iconColor: 'text-blue-200' },
        { credits: 150, price: 299, label: 'Power Pack', color: 'from-purple-400 to-purple-600', iconColor: 'text-purple-200' },
        { credits: 500, price: 899, label: 'Mega Tank', color: 'from-amber-400 to-orange-500', iconColor: 'text-amber-200' }
    ];

    // --- RENDER ---
    /**
     * FIX: Added explicit return statement to resolve TypeScript error 'Type void is not assignable to ReactNode'
     * caused by truncated file content during previous session.
     */
    return (
        <div className="h-full overflow-y-auto no-scrollbar bg-[#FAFAFB] pb-24">
            {/* 1. Identity Header */}
            <div className={`relative px-6 pt-10 pb-20 bg-gradient-to-br ${rankGradients[badge.rank] || rankGradients['Rising Creator']} text-white overflow-hidden`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-4 group">
                        <div className="w-24 h-24 rounded-[2rem] bg-white p-1 shadow-2xl">
                            <div className="w-full h-full rounded-[1.8rem] bg-gray-100 flex items-center justify-center text-indigo-600 font-black text-3xl overflow-hidden border border-gray-100">
                                {user?.avatar || (user?.name?.[0] || 'U')}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-[#F9D230] text-black p-2 rounded-xl shadow-lg border-2 border-white">
                            <badge.Icon className="w-4 h-4" />
                        </div>
                    </div>

                    {isEditingName ? (
                        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 animate-fadeIn">
                            <input 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)}
                                className="bg-transparent border-none text-white font-black text-xl text-center outline-none px-4 w-40"
                                autoFocus
                            />
                            <button onClick={handleSaveName} disabled={isSavingName} className="p-2 bg-white text-indigo-600 rounded-xl shadow-lg active:scale-90 transition-all">
                                {isSavingName ? <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"/> : <CheckIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group" onClick={() => setIsEditingName(true)}>
                            <h2 className="text-2xl font-black tracking-tight">{user?.name}</h2>
                            <PencilIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-2">{user?.email}</p>
                </div>
            </div>

            {/* 2. Stats Overlay Card */}
            <div className="px-6 -mt-12 relative z-20">
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-indigo-900/5 p-8 border border-gray-100 flex justify-between items-center overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available Power</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-gray-900">{user?.credits}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Credits</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setExpandedPlan(expandedPlan === 'recharge' ? null : 'recharge')}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        Buy Credits
                    </button>
                </div>
            </div>

            {/* 3. Loyalty Progress */}
            <div className="px-6 mt-8">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden" onClick={() => setShowRanksModal(true)}>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><StarIcon className="w-4 h-4" /></div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creator Rank</span>
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full">{badge.rank}</span>
                    </div>
                    <div className="relative">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            <span>{lifetimeGens} / {nextMilestone} Generations</span>
                            <span className="text-indigo-600">Next: +{nextReward} credits</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-50 to-purple-600 transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Menu Actions */}
            <div className="px-6 mt-8 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-2">Console Settings</p>
                
                <button 
                    onClick={() => setIsSupportOpen(true)}
                    className="w-full bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm active:bg-gray-50 transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl shadow-inner"><PixaSupportIcon className="w-5 h-5"/></div>
                        <div className="text-left">
                            <p className="text-sm font-black text-gray-800">Support Concierge</p>
                            <p className="text-[10px] text-gray-400 font-medium">Chat with Pixa AI Expert</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                </button>

                <button 
                    onClick={handleLogout}
                    className="w-full bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between shadow-sm active:bg-red-50 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl shadow-inner group-active:bg-red-500 group-active:text-white transition-colors"><LogoutIcon className="w-5 h-5"/></div>
                        <p className="text-sm font-black text-gray-800">Sign Out</p>
                    </div>
                </button>
            </div>

            {/* Support Tray Overlay */}
            {isSupportOpen && createPortal(
                <div 
                    className={`fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                    onClick={handleCloseSupport}
                >
                    <div 
                        className={`absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}
                        style={{ transform: translateY > 0 ? `translateY(${translateY}px)` : undefined }}
                        onClick={e => e.stopPropagation()}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Drag Bar */}
                        <div className="flex-none pt-4 pb-2 flex justify-center">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full"></div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden relative">
                            <SupportChatWindow 
                                auth={auth} 
                                appConfig={appConfig} 
                                onTicketCreated={() => {}} 
                                onToggleSidebar={() => {}}
                            />
                        </div>

                        {/* Top Close Button for better UX */}
                        <button 
                            onClick={handleCloseSupport}
                            className="absolute top-6 right-6 p-2 bg-gray-100 text-gray-400 rounded-full active:scale-90 transition-transform"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {showRanksModal && <CreatorRanksModal currentGens={lifetimeGens} onClose={() => setShowRanksModal(false)} />}
        </div>
    );
};
