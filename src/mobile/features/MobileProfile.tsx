import React, { useState, useEffect } from 'react';
import { AuthProps, BrandKit, BRAND_LIMITS } from '../../types';
import { 
    UserIcon, LogoutIcon, ShieldCheckIcon, PixaBillingIcon, 
    CreditCoinIcon, LightningIcon, GiftIcon, FlagIcon,
    PlusIcon, ChevronRightIcon, BrandKitIcon, CalendarIcon,
    InformationCircleIcon, CheckIcon, SparklesIcon, XIcon
} from '../../components/icons';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { subscribeToUserBrands, activateBrand } from '../../firebase';

export const MobileProfile: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const { user, setUser, activeBrandKit, setActiveBrandKit } = auth;
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [isSwitching, setIsSwitching] = useState<string | null>(null);
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    // Limits Logic
    const userPlan = user?.plan || 'Free';
    const matchedPlanKey = Object.keys(BRAND_LIMITS).find(k => userPlan.includes(k)) || 'Free';
    const brandLimit = BRAND_LIMITS[matchedPlanKey] || 1;

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeToUserBrands(user.uid, (list) => {
            setBrands(list);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    const handleSwitchBrand = async (brand: BrandKit) => {
        if (!brand.id || brand.id === activeBrandKit?.id || !user) return;
        setIsSwitching(brand.id);
        try {
            const brandData = await activateBrand(user.uid, brand.id);
            setActiveBrandKit(brandData || null);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSwitching(null);
        }
    };

    const handleLogout = () => {
        if (window.confirm("Are you sure you want to sign out?")) {
            auth.handleLogout();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#F9FAFB] overflow-y-auto no-scrollbar pb-32 animate-fadeIn">
            
            {/* 1. IDENTITY HEADER */}
            <div className="relative pt-12 pb-8 px-6 bg-white border-b border-gray-100 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        <div className={`w-24 h-24 rounded-full p-1 border-4 ${badge.borderColor} shadow-2xl overflow-hidden bg-white`}>
                            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-2xl font-black text-indigo-600">
                                {user?.avatar || user?.name?.[0]}
                            </div>
                        </div>
                        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 ${badge.bgColor} ${badge.borderColor}`}>
                            <badge.Icon className={`w-3 h-3 ${badge.iconColor}`} />
                            <span className={`text-[8px] font-black uppercase tracking-widest ${badge.color}`}>{badge.rank}</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user?.name}</h2>
                    <p className="text-sm text-gray-400 font-medium mb-6">{user?.email}</p>

                    {/* Membership Card (Glassmorphism) */}
                    <div className="w-full max-w-sm bg-gray-900 rounded-3xl p-5 text-left relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Current Plan</p>
                                <h3 className="text-white font-black text-lg">{user?.plan || 'Free Member'}</h3>
                            </div>
                            <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                                <span className="text-[8px] font-black text-white uppercase tracking-widest">Verified</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-end relative z-10">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Lifetime Productivity</p>
                                <p className="text-white font-black text-xl">{user?.lifetimeGenerations || 0} Assets</p>
                            </div>
                            <div className="w-12 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CREATIVE WALLET (Bento Grid) */}
            <div className="px-6 -mt-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Available</p>
                            <h4 className="text-3xl font-black text-gray-900">{user?.credits}</h4>
                            <p className="text-[10px] font-bold text-indigo-500 mt-1">Credits</p>
                        </div>
                        {/* Mini Sparkline Visualization */}
                        <div className="flex items-end gap-1 h-8 opacity-40">
                            {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                                <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => (window as any).setActiveTab('billing')}
                        className="bg-indigo-600 p-5 rounded-[2rem] shadow-xl shadow-indigo-500/20 flex flex-col justify-between items-center text-center group active:scale-95 transition-all"
                    >
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-2">
                            <LightningIcon className="w-6 h-6 animate-pulse" />
                        </div>
                        <span className="text-xs font-black text-white uppercase tracking-widest">Recharge<br/>Power</span>
                    </button>
                </div>
            </div>

            {/* 3. INTEGRATED BRAND HUB */}
            <div className="px-6 mb-8">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                                <BrandKitIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Active Identity</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Context Switcher</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">Slots Used</p>
                            <p className="text-xs font-black text-gray-900">{brands.length} / {brandLimit}</p>
                        </div>
                    </div>

                    {/* Active Brand Card */}
                    {activeBrandKit ? (
                        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4 mb-6 border border-gray-100">
                            <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 p-2 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {activeBrandKit.logos.primary ? (
                                    <img src={activeBrandKit.logos.primary} className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <span className="text-xs font-black text-gray-300">{(activeBrandKit.companyName || 'B').substring(0, 1)}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">{activeBrandKit.companyName}</h4>
                                <p className="text-[10px] text-gray-500 truncate">{activeBrandKit.website}</p>
                            </div>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: activeBrandKit.colors.primary }}></div>
                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: activeBrandKit.colors.secondary }}></div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center mb-6">
                            <p className="text-xs font-bold text-gray-400">No brand active</p>
                        </div>
                    )}

                    {/* Quick Switch Scroll */}
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        {brands.filter(b => b.id !== activeBrandKit?.id).map(brand => (
                            <button 
                                key={brand.id}
                                onClick={() => handleSwitchBrand(brand)}
                                disabled={!!isSwitching}
                                className="shrink-0 w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center p-2 relative shadow-sm active:scale-90 transition-all"
                            >
                                {isSwitching === brand.id ? (
                                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : brand.logos.primary ? (
                                    <img src={brand.logos.primary} className="max-w-full max-h-full object-contain" />
                                ) : (
                                    <span className="text-[10px] font-black text-gray-300">{brand.companyName?.substring(0, 1)}</span>
                                )}
                            </button>
                        ))}
                        <button 
                            onClick={() => (window as any).setActiveTab('brand_manager')}
                            className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 active:bg-gray-50"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. ENGAGEMENT & UTILITY LIST */}
            <div className="px-6 space-y-3 mb-10">
                <button 
                    onClick={() => (window as any).setActiveTab('daily_mission')}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm active:bg-gray-50 transition-all text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><FlagIcon className="w-5 h-5"/></div>
                        <div>
                            <span className="text-sm font-bold text-gray-800 block">Daily Bounty Tracker</span>
                            <p className="text-[10px] font-medium text-gray-400">Earn up to 5 credits today</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">New</span>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                    </div>
                </button>

                <button 
                    onClick={() => (window as any).setActiveTab('home_dashboard')}
                    className="w-full flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[1.8rem] shadow-sm active:bg-gray-50 transition-all text-left"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><GiftIcon className="w-5 h-5"/></div>
                        <div>
                            <span className="text-sm font-bold text-gray-800 block">Referral Milestones</span>
                            <p className="text-[10px] font-medium text-gray-400">Unlock shared rewards</p>
                        </div>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                </button>

                <div className="pt-4 pb-2 px-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Preferences</p>
                </div>

                <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-50">
                        <div className="flex items-center justify-between p-5">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl"><InformationCircleIcon className="w-5 h-5"/></div>
                                <span className="text-sm font-bold text-gray-700">Output Quality</span>
                            </div>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">Ultra HD</span>
                        </div>
                        
                        <div onClick={() => (window as any).setActiveTab('support_center')} className="flex items-center justify-between p-5 active:bg-gray-50">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-gray-50 text-gray-400 rounded-xl"><ShieldCheckIcon className="w-5 h-5"/></div>
                                <span className="text-sm font-bold text-gray-700">Support & Feedback</span>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300" />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-5 bg-red-50 border border-red-100 rounded-[1.8rem] shadow-sm active:bg-red-100 transition-all mt-8"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white text-red-600 rounded-xl shadow-sm"><LogoutIcon className="w-5 h-5"/></div>
                        <span className="text-sm font-bold text-red-700">Sign Out Console</span>
                    </div>
                    {/* Fixed XIcon error by ensuring it is imported */}
                    <XIcon className="w-4 h-4 text-red-300" />
                </button>
            </div>
            
            <div className="flex flex-col items-center gap-2 mb-10 px-6 text-center">
                <div className="flex items-center gap-2 text-gray-300">
                    <SparklesIcon className="w-4 h-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">MagicPixa v1.0.3</p>
                </div>
                <p className="text-[9px] text-gray-400 font-medium leading-relaxed">
                    Designed for Creators. Powered by Pixa Vision Engine.<br/>
                    All rights reserved &copy; 2025
                </p>
            </div>
        </div>
    );
};
