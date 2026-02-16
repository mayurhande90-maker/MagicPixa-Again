import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AuthProps, User, View, AppConfig, CreditPack, Transaction } from '../../types';
import { 
    LogoutIcon, ShieldCheckIcon, 
    CreditCoinIcon, LightningIcon, FlagIcon,
    ChevronRightIcon, SparklesIcon, XIcon,
    InformationCircleIcon, CheckIcon, PencilIcon,
    PixaSupportIcon, TicketIcon, StarIcon, LockIcon,
    ChevronDownIcon, ArrowRightIcon,
    PixaProductIcon, ThumbnailIcon, 
    PixaEcommerceIcon, MagicAdsIcon, PixaTogetherIcon, PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon,
    PixaHeadshotIcon, MagicWandIcon, CampaignStudioIcon,
    BuildingIcon,
    PixaBillingIcon,
    TrashIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { updateUserProfile, claimMilestoneBonus, getCreditHistory } from '../../firebase';
import { triggerCheckout } from '../../services/paymentService';
import { SupportChatWindow } from '../../features/support/SupportChatWindow';
import { createPortal } from 'react-dom';
import { CreatorRanksModal } from '../../components/CreatorRanksModal';
import { MobileSheet } from '../components/MobileSheet';

const PLAN_WEIGHTS: Record<string, number> = {
    'Free': 0,
    'Starter Pack': 1,
    'Creator Pack': 2,
    'Studio Pack': 3,
    'Agency Pack': 4
};

const PLAN_BENEFITS: Record<string, string[]> = {
    'Starter Pack': [
        '50 AI Credits (Try every tool)',
        '1 Brand Kit Slot',
        'Standard Definition (HD) Output',
        'Standard Support (AI Bot)',
        'Personal Usage License'
    ],
    'Creator Pack': [
        '165 AI Credits (Better Value)',
        '3 Brand Kit Slots',
        'High-Resolution (4K) Output',
        'Full Commercial Usage Rights',
        'Verified Identity Lock 6.0'
    ],
    'Studio Pack': [
        '300 AI Credits (Bulk Savings)',
        '10 Brand Kit Slots',
        'Ultra-Resolution (8K) Output',
        'Priority Processing (2x Faster)',
        'Priority Support (Human Agent)'
    ],
    'Agency Pack': [
        '1200 AI Credits (Best Rate)',
        '50 Brand Kit Slots',
        'Unlimited 8K High-Res Exports',
        'Dedicated Account Manager',
        'White-Label Content (No Metadata)'
    ]
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

    const [loadingPack, setLoadingPack] = useState<string | null>(null);
    const [showRanksModal, setShowRanksModal] = useState(false);
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

    // History States
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // --- DATA ---
    const membershipPacks: CreditPack[] = useMemo(() => {
        if (appConfig?.creditPacks && appConfig.creditPacks.length > 0) return appConfig.creditPacks;
        return [
            { name: 'Starter Pack', price: 99, credits: 50, totalCredits: 50, bonus: 0, tagline: '1 Brand Kit included.', popular: false, value: 1.98 },
            { name: 'Creator Pack', price: 249, credits: 150, totalCredits: 165, bonus: 15, tagline: '3 Brand Kits.', popular: true, value: 1.51 },
            { name: 'Studio Pack', price: 699, credits: 250, totalCredits: 300, bonus: 50, tagline: '10 Brand Kits.', popular: false, value: 2.33 },
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
        { label: 'Unlimited\nAssets', icon: SparklesIcon, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', iconBg: 'bg-blue-600' },
        { label: 'No\nWatermarks', icon: CheckIcon, bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-900', iconBg: 'bg-green-600' },
        { label: 'Credits Never\nExpire', icon: LightningIcon, bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', iconBg: 'bg-green-500' },
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
        }, 300); 
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
        if (window.confirm("Are you sure you want to sign out?")) {
            auth.handleLogout();
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm("CRITICAL: Are you sure you want to delete your account? This will permanently remove all your creations and remaining credits. This action cannot be undone.")) {
            // In a real app, we would trigger a delete function here
            alert("For security, please contact support@magicpixa.com to finalize account deletion.");
        }
    };

    const fetchHistory = async () => {
        if (!user) return;
        setIsLoadingHistory(true);
        setIsHistoryOpen(true);
        try {
            const data = await getCreditHistory(user.uid);
            setTransactions(data as Transaction[]);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const groupTransactionsByDate = (txs: Transaction[]) => {
        const groups: { [key: string]: Transaction[] } = {};
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        txs.forEach(tx => {
            if (!tx.date) return;
            const date = (tx.date as any).toDate ? (tx.date as any).toDate() : new Date((tx.date as any).seconds * 1000 || tx.date);
            let key;
            if (date.toDateString() === today.toDateString()) key = 'Today';
            else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday';
            else key = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            if (!groups[key]) groups[key] = [];
            groups[key].push(tx);
        });
        return groups;
    };

    const getIconForFeature = (feature: string): React.ReactNode => {
        const bgIconClass = "w-4 h-4";
        const f = feature.toLowerCase();

        // Grants & Purchases
        if (f.includes('grant') || f.includes('purchase') || f.includes('refill') || f.includes('check-in')) {
            return <div className="p-2 bg-amber-100 rounded-xl"><LightningIcon className={`${bgIconClass} text-amber-600`} /></div>;
        }
        
        // Feature Keywords (Broader matching for Mobile/Desktop variants)
        if (f.includes('campaign')) return <div className="p-2 bg-blue-50 rounded-xl"><CampaignStudioIcon className={`${bgIconClass} text-blue-600`} /></div>;
        if (f.includes('product') || (f.includes('studio') && !f.includes('thumbnail') && !f.includes('campaign') && !f.includes('merchant'))) return <div className="p-2 bg-blue-50 rounded-xl"><PixaProductIcon className={`${bgIconClass} text-blue-600`} /></div>;
        if (f.includes('thumbnail')) return <div className="p-2 bg-red-50 rounded-xl"><ThumbnailIcon className={`${bgIconClass} text-red-600`} /></div>;
        if (f.includes('realty')) return <div className="p-2 bg-purple-50 rounded-xl"><BuildingIcon className={`${bgIconClass} text-purple-600`} /></div>; 
        if (f.includes('ecommerce') || f.includes('merchant')) return <div className="p-2 bg-green-50 rounded-xl"><PixaEcommerceIcon className={`${bgIconClass} text-green-600`} /></div>;
        if (f.includes('admaker')) return <div className="p-2 bg-orange-50 rounded-xl"><MagicAdsIcon className={`${bgIconClass} text-orange-600`} /></div>;
        if (f.includes('together')) return <div className="p-2 bg-pink-50 rounded-xl"><PixaTogetherIcon className={`${bgIconClass} text-pink-600`} /></div>;
        if (f.includes('restore')) return <div className="p-2 bg-slate-100 rounded-xl"><PixaRestoreIcon className={`${bgIconClass} text-slate-600`} /></div>;
        if (f.includes('caption')) return <div className="p-2 bg-indigo-50 rounded-xl"><PixaCaptionIcon className={`${bgIconClass} text-indigo-600`} /></div>;
        if (f.includes('interior')) return <div className="p-2 bg-amber-50 rounded-xl"><PixaInteriorIcon className={`${bgIconClass} text-amber-600`} /></div>;
        if (f.includes('tryon')) return <div className="p-2 bg-rose-50 rounded-xl"><PixaTryOnIcon className={`${bgIconClass} text-rose-600`} /></div>;
        if (f.includes('headshot')) return <div className="p-2 bg-indigo-50 rounded-xl"><PixaHeadshotIcon className={`${bgIconClass} text-indigo-600`} /></div>;
        if (f.includes('eraser') || f.includes('editor') || f.includes('refinement')) return <div className="p-2 bg-indigo-50 rounded-xl"><MagicWandIcon className={`${bgIconClass} text-indigo-600`} /></div>;
        
        return <div className="p-2 bg-gray-50 rounded-xl"><TicketIcon className={`${bgIconClass} text-gray-500`} /></div>;
    };

    const refillPacks = [
        { credits: 20, price: 49, label: 'Mini Boost', color: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-200' },
        { credits: 150, price: 299, label: 'Power Pack', color: 'from-purple-500 to-indigo-700', iconColor: 'text-purple-200' },
        { credits: 500, price: 899, label: 'Mega Tank', color: 'from-amber-500 to-orange-600', iconColor: 'text-amber-200' }
    ];

    const groupedTransactions = groupTransactionsByDate(transactions);
    const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    return (
        <div className="flex flex-col h-full bg-[#FAFBFF] overflow-y-auto overflow-x-hidden no-scrollbar pb-6 animate-fadeIn w-full">
            
            {/* 1. IDENTITY HUB */}
            <div className="relative z-20 flex-none bg-white border-b border-gray-50 pt-10 pb-8 px-6 flex flex-col items-center text-center overflow-visible">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20 -z-10"></div>
                
                <div className="relative mb-8 overflow-visible">
                    <div className="w-24 h-24 rounded-full p-[3px] shadow-2xl shadow-indigo-500/10 bg-white relative overflow-hidden">
                        <div className={`absolute inset-0 bg-gradient-to-tr ${rankGradients[badge.rank] || rankGradients['Rising Creator']} animate-gradient-slow`}></div>
                        <div className="absolute inset-0 opacity-0 animate-ring-sweep pointer-events-none bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-[-25deg]" style={{ width: '200%', marginLeft: '-50%' }}></div>
                        <div className="relative w-full h-full rounded-full bg-white p-1 flex items-center justify-center z-10">
                            <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center text-3xl font-black text-indigo-600">
                                {user?.avatar || user?.name?.[0]}
                            </div>
                        </div>
                    </div>

                    <div 
                        onClick={() => setShowRanksModal(true)}
                        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full border shadow-xl flex items-center gap-2 whitespace-nowrap z-10 cursor-pointer active:scale-95 transition-transform ${badge.bgColor} ${badge.borderColor} animate-bounce-slight`}
                    >
                        <badge.Icon className={`w-3.5 h-3.5 ${badge.iconColor}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.1em] ${badge.rank === 'Rising Creator' ? 'text-gray-500' : badge.rank === 'Professional Creator' ? 'text-orange-700' : badge.rank === 'Silver Creator' ? 'text-slate-600' : 'text-yellow-700'}`}>{badge.rank}</span>
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
                                <PixaPencilIcon className="w-4 h-4" />
                            </div>
                        </div>
                    )}
                    
                    <p className="text-[12px] text-gray-400 font-medium mt-4 bg-gray-50 px-5 py-1.5 rounded-full border border-gray-100 lowercase tracking-tight">
                        {user?.email}
                    </p>
                </div>
            </div>

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
                    {/* Continuous Marquee Benefits Strip */}
                    <div className="overflow-hidden relative pb-6 px-1">
                        <div className="flex gap-3 animate-marquee-scroll whitespace-nowrap">
                            {[...benefits, ...benefits].map((benefit, i) => (
                                <div key={i} className={`shrink-0 flex flex-col items-center gap-2 p-4 rounded-3xl ${benefit.bg} border ${benefit.border} min-w-[100px]`}>
                                    <div className={`w-8 h-8 rounded-full ${benefit.iconBg} flex items-center justify-center text-white shadow-sm`}>
                                        <benefit.icon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[10px] font-black ${benefit.text} text-center uppercase tracking-tight whitespace-pre-line leading-tight`}>
                                        {benefit.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[#FAFBFF] to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#FAFBFF] to-transparent z-10 pointer-events-none"></div>
                    </div>

                    <div className="mb-6 px-1">
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            Unlock the Pro Studio ✨
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Priority access to our most advanced AI models.</p>
                    </div>

                    {/* Vertical Accordion Plan List */}
                    <div className="space-y-4">
                        {membershipPacks.map((pack, idx) => {
                            const packWeight = PLAN_WEIGHTS[pack.name] || 0;
                            const isCurrent = currentPlanWeight === packWeight;
                            const isUpgrade = packWeight > currentPlanWeight;
                            const isOpen = expandedPlan === pack.name;
                            const isLoading = loadingPack === pack.name;
                            const isCreator = pack.name === 'Creator Pack';

                            // Determine active visual theme (Green for current, Indigo for upgrade selection)
                            const themeColor = isCurrent ? 'green' : 'indigo';

                            return (
                                <div 
                                    key={idx}
                                    className={`w-full rounded-[2rem] border-2 transition-all duration-300 overflow-hidden ${
                                        isOpen
                                        ? isCurrent
                                            ? 'bg-green-50 border-green-500 ring-4 ring-green-500/10 scale-[1.02] shadow-2xl'
                                            : 'bg-indigo-50/30 border-indigo-500 ring-4 ring-indigo-500/10 scale-[1.02] shadow-2xl'
                                        : isCurrent 
                                            ? 'bg-green-50 border-green-500 shadow-xl shadow-green-100' 
                                            : isUpgrade 
                                                ? 'bg-white border-gray-100 shadow-sm' 
                                                : 'bg-gray-100 border-transparent grayscale opacity-70'
                                    }`}
                                >
                                    {/* Main Card Trigger */}
                                    <button 
                                        onClick={() => setExpandedPlan(isOpen ? null : pack.name)}
                                        className="w-full p-5 flex items-center gap-4 text-left relative"
                                    >
                                        {/* Radio-Style Selection Icon */}
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                                            isOpen || isCurrent 
                                            ? `border-${themeColor}-500` 
                                            : 'border-gray-200'
                                        }`}>
                                            {(isOpen || isCurrent) && (
                                                <div className={`w-3 h-3 bg-${themeColor}-500 rounded-full animate-scaleIn`}></div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                                <span className="text-sm font-black text-gray-900 truncate uppercase tracking-tight">{pack.name}</span>
                                                {isCurrent && (
                                                    <span className="bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Active</span>
                                                )}
                                                {isCreator && (
                                                    <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Best Value</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-gray-900">₹ {pack.price}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">One-time</span>
                                            </div>
                                            <div className="text-[11px] uppercase tracking-tight mt-0.5">
                                                <span className="font-black text-gray-900">{pack.totalCredits} Credits</span>
                                                {pack.bonus > 0 && (
                                                    <span className="font-black text-indigo-600 ml-1">
                                                        ({pack.credits} + {pack.bonus} Bonus!)
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-gray-400'}`}>
                                            <ChevronDownIcon className="w-5 h-5" />
                                        </div>
                                    </button>

                                    {/* Dropdown Content */}
                                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-height-none opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="px-5 pb-6 pt-2 border-t border-gray-100/50">
                                            <div className="space-y-2 mb-6">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Included Benefits</p>
                                                {(PLAN_BENEFITS[pack.name] || []).map((benefit, i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0">
                                                            <CheckIcon className="w-3 h-3" />
                                                        </div>
                                                        <span className="text-xs font-medium text-gray-600">{benefit}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {isUpgrade ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleCheckout(pack, true); }}
                                                    disabled={!!loadingPack}
                                                    className="w-full py-4 bg-[#1A1A1E] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 active:bg-black transition-all"
                                                >
                                                    {isLoadingHistory ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    ) : (
                                                        <>Upgrade Now <ArrowRightIcon className="w-4 h-4" /></>
                                                    )}
                                                </button>
                                            ) : isCurrent ? (
                                                <div className="w-full py-4 bg-green-100 text-green-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center flex items-center justify-center gap-2 border border-green-200">
                                                    <CheckIcon className="w-4 h-4" /> Current Selection
                                                </div>
                                            ) : (
                                                <div className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center border border-gray-100">
                                                    Already Included
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. POWER TOPUP STATION */}
                <div className="pt-2">
                    <div className="flex items-center gap-2 mb-5 ml-2">
                        <LightningIcon className="w-4 h-4 text-indigo-500" />
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">INSTANT TOPUP STATION</h3>
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
                        onClick={fetchHistory}
                        className="w-full flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2.2rem] active:bg-gray-50 transition-all text-left group shadow-xl shadow-gray-200/20"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-orange-100">
                                <PixaBillingIcon className="w-6 h-6"/>
                            </div>
                            <div>
                                <span className="text-base font-black text-gray-800 block leading-tight">Billing & History</span>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Transactions & Usage</p>
                            </div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-active:translate-x-1 transition-transform" />
                    </button>

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
                        className="w-full flex items-center justify-between p-6 bg-white border border-gray-100 rounded-[2.2rem] active:bg-gray-50 transition-all text-left group mt-4 shadow-xl shadow-gray-200/20"
                    >
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-red-50 text-red-600 rounded-2xl group-active:scale-90 transition-transform shadow-sm border border-red-100">
                                <LogoutIcon className="w-6 h-6"/>
                            </div>
                            <span className="text-base font-black text-red-600">Sign out</span>
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-300 group-active:translate-x-1 transition-transform" />
                    </button>
                    
                    {/* Legal Links */}
                    <div className="flex items-center justify-center gap-6 py-2">
                        <a href="https://www.magicpixa.com/Terms" target="_blank" rel="noopener noreferrer" className="text-[9px] font-normal text-gray-400 hover:text-indigo-600 transition-colors">Terms of Service</a>
                        <a href="https://www.magicpixa.com/Privacy" target="_blank" rel="noopener noreferrer" className="text-[9px] font-normal text-gray-400 hover:text-indigo-600 transition-colors">Privacy Policy</a>
                    </div>
                </div>
            </div>

            <div className="mt-8 mb-4 flex flex-col items-center gap-1.5 px-6 text-center">
                <p className="text-[10px] font-normal text-gray-900">MagicPixa</p>
                <div className="flex flex-col items-center gap-1">
                    <p className="text-[8px] font-normal text-gray-400">Version 1.0.3 • Production Build</p>
                    <button 
                        onClick={handleDeleteAccount}
                        className="text-[9px] font-normal text-red-500 hover:text-red-600 transition-colors mt-3"
                    >
                        Delete account
                    </button>
                </div>
            </div>

            {/* Support Sheet */}
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
                        className={`relative w-full max-w-lg bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col overflow-hidden h-[85vh] transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'} ease-[cubic-bezier(0.32,0.72,0,1)]`}
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

            {/* Credit History Sheet */}
            <MobileSheet 
                isOpen={isHistoryOpen} 
                onClose={() => setIsHistoryOpen(false)} 
                title="Billing & History"
            >
                <div className="space-y-6 pb-6">
                    <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Balance</p>
                        <div className="flex items-end gap-2 mt-1">
                            <span className="text-4xl font-black">{user?.credits || 0}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide mb-1.5 opacity-80">Credits</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {isLoadingHistory ? (
                            <div className="py-12 flex flex-col items-center gap-4">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Syncing Records...</p>
                            </div>
                        ) : sortedGroupKeys.length > 0 ? (
                            sortedGroupKeys.map(date => (
                                <div key={date}>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">{date}</h4>
                                    <div className="space-y-3">
                                        {groupedTransactions[date].map(tx => (
                                            <div key={tx.id} className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100 transition-all active:scale-[0.98]">
                                                <div className="flex items-center gap-4">
                                                    {getIconForFeature(tx.feature)}
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-gray-800 truncate pr-2">{tx.feature.replace('Admin Grant', 'MagicPixa Grant')}</p>
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                                            {((tx.date as any).toDate ? (tx.date as any).toDate() : new Date((tx.date as any).seconds * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    {tx.creditChange ? (
                                                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-[11px] font-black border border-green-200">{tx.creditChange}</span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-[11px] font-black border border-gray-200">-{tx.cost}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center opacity-40">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <TicketIcon className="w-8 h-8 text-gray-400" />
                                </div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-relaxed">No transactions <br/> logged yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </MobileSheet>

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
                @keyframes marquee-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee-scroll {
                    animation: marquee-scroll 15s linear infinite;
                }
                @keyframes scaleIn {
                    0% { transform: scale(0); opacity: 0; }
                    60% { transform: scale(1.1); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
        </div>
    );
};

// Aliasing the PencilIcon if needed or using a fallback
const PixaPencilIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
);

export default MobileProfile;
