
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, View, Creation } from '../../types';
// Add missing icons: CreditCoinIcon, DownloadIcon, CalendarIcon
import { 
    SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, 
    ArrowRightIcon, LightningIcon, 
    PixaProductIcon, CameraIcon, CheckIcon,
    ClockIcon, FlagIcon, GiftIcon, UserIcon,
    PixaTogetherIcon, ThumbnailIcon, PixaRestoreIcon,
    PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon,
    DashboardIcon, CreditCoinIcon, DownloadIcon, CalendarIcon
} from '../../components/icons';
import { getCreations, claimDailyAttendance } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { downloadImage } from '../../utils/imageUtils';

interface MobileHomeProps {
    auth: AuthProps;
    setActiveTab: (tab: View) => void;
}

const QUICK_TOOLS = [
    { id: 'studio', label: 'Studio', icon: PixaProductIcon, color: 'bg-blue-50 text-blue-600' },
    { id: 'headshot', label: 'Headshot', icon: PixaHeadshotIcon, color: 'bg-amber-50 text-amber-600' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-purple-50 text-purple-600' },
    { id: 'thumbnail_studio', label: 'Viral', icon: ThumbnailIcon, color: 'bg-red-50 text-red-600' },
];

export const MobileHome: React.FC<MobileHomeProps> = ({ auth, setActiveTab }) => {
    const [recentCreations, setRecentCreations] = useState<Creation[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);

    const user = auth.user;
    const firstName = user?.name ? user.name.split(' ')[0] : 'Creator';
    const mission = getDailyMission();
    const isMissionComplete = isMissionLocked(user);
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    // Time-based Greeting
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    }, []);

    // Loyalty Progress Calculation
    const { progressPercent, nextTarget, nextReward } = useMemo(() => {
        const current = user?.lifetimeGenerations || 0;
        let next = 10, prev = 0, reward = 5;

        if (current < 10) { next = 10; prev = 0; reward = 5; } 
        else if (current < 25) { next = 25; prev = 10; reward = 10; } 
        else if (current < 50) { next = 50; prev = 25; reward = 15; } 
        else if (current < 75) { next = 75; prev = 50; reward = 20; } 
        else if (current < 100) { next = 100; prev = 75; reward = 30; } 
        else { const hundreds = Math.floor(current / 100); prev = hundreds * 100; next = (hundreds + 1) * 100; reward = 30; }
        
        const percent = Math.min(100, Math.max(0, ((current - prev) / (next - prev)) * 100));
        return { progressPercent: percent, nextTarget: next, nextReward: reward };
    }, [user?.lifetimeGenerations]);

    // Check-in status
    const canClaimCheckin = useMemo(() => {
        if (!user?.lastAttendanceClaim) return true;
        const last = (user.lastAttendanceClaim as any).toDate ? (user.lastAttendanceClaim as any).toDate() : new Date(user.lastAttendanceClaim as any);
        const now = new Date();
        return (now.getTime() - last.getTime()) > (24 * 60 * 60 * 1000);
    }, [user?.lastAttendanceClaim]);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setRecentCreations(data as Creation[]);
                setLoadingRecent(false);
            });
        }
    }, [user?.uid]);

    const handleClaimCheckin = async () => {
        if (!user || !canClaimCheckin || isClaiming) return;
        setIsClaiming(true);
        try {
            const updatedUser = await claimDailyAttendance(user.uid);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            alert("Check-in failed. Please try again later.");
        } finally {
            setIsClaiming(false);
        }
    };

    const latestCreation = recentCreations[0];

    return (
        <div className="pb-24 animate-fadeIn">
            {/* 1. GREETING HEADER */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                        {greeting},
                    </h1>
                    <p className="text-3xl font-black text-indigo-600 mt-1">{firstName}!</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                    <div className="flex items-center justify-end gap-2 bg-indigo-50 px-3 py-1.5 rounded-2xl border border-indigo-100">
                        <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                        <span className="text-lg font-black text-indigo-900 leading-none">{user?.credits || 0}</span>
                    </div>
                </div>
            </div>

            {/* 2. DASHBOARD: LATEST CREATION */}
            <div className="px-6 py-4">
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden relative min-h-[220px] group active:scale-[0.98] transition-all">
                    {loadingRecent ? (
                        <div className="h-full w-full flex items-center justify-center bg-gray-50">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : latestCreation ? (
                        <div className="relative h-60 w-full" onClick={() => setActiveTab('creations')}>
                            <img src={latestCreation.imageUrl} className="w-full h-full object-cover" alt="Latest" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 w-fit mb-2">
                                    <SparklesIcon className="w-3 h-3 text-yellow-300" />
                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Latest Output</span>
                                </div>
                                <h3 className="text-xl font-bold text-white leading-tight">{latestCreation.feature}</h3>
                                <div className="mt-4 flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); downloadImage(latestCreation.imageUrl, 'latest.png'); }}
                                        className="bg-white/90 backdrop-blur-md text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
                                    >
                                        <DownloadIcon className="w-3 h-3" /> Save
                                    </button>
                                    <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                                        View Lab
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center bg-gray-50 h-60 border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-sm mb-4 text-gray-300">
                                <CameraIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 leading-tight">No creations yet</h3>
                            <p className="text-xs text-gray-400 font-medium mt-1 max-w-[180px]">Your first masterpiece will appear right here.</p>
                            <button 
                                onClick={() => setActiveTab('studio')}
                                className="mt-5 bg-white text-indigo-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm active:scale-95 transition-all"
                            >
                                Open Studio
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. LOYALTY BONUS SECTION */}
            <div className="px-6 py-4">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors"></div>
                    
                    <div className="relative z-10 flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${badge.borderColor} ${badge.bgColor}`}>
                                <badge.Icon className={`w-5 h-5 ${badge.iconColor}`} />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Rank: {badge.rank}</h4>
                                <p className="text-xl font-black text-gray-900 leading-none">{user?.lifetimeGenerations || 0} <span className="text-[10px] text-gray-400">Gens</span></p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-indigo-600">{nextTarget}</p>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Next Target</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1.5 text-gray-400">
                            <span>Experience</span>
                            <span className="text-indigo-500">Reward: +{nextReward} Credits</span>
                        </div>
                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-1000 relative" style={{ width: `${progressPercent}%` }}>
                                <div className="absolute inset-0 bg-white/20 animate-[progress_2s_linear_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. DAILY HUB (Mission & Check-in) */}
            <div className="px-6 py-4">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Daily Hub</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Daily Mission Card */}
                    <button 
                        onClick={() => setActiveTab('daily_mission' as any)}
                        className={`p-5 rounded-[2rem] border transition-all text-left flex flex-col justify-between h-48 relative overflow-hidden ${
                            isMissionComplete 
                            ? 'bg-emerald-50 border-emerald-100 opacity-80' 
                            : 'bg-gray-900 border-gray-800 shadow-lg active:scale-95 shadow-gray-900/10'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${isMissionComplete ? 'bg-white text-emerald-500 shadow-sm' : 'bg-white/10 text-yellow-400'}`}>
                            {isMissionComplete ? <CheckIcon className="w-6 h-6" /> : <LightningIcon className="w-6 h-6 animate-pulse" />}
                        </div>
                        <div>
                            <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isMissionComplete ? 'text-emerald-600' : 'text-yellow-400'}`}>
                                {isMissionComplete ? 'Completed' : 'Active Mission'}
                            </p>
                            <h4 className={`text-sm font-black leading-tight ${isMissionComplete ? 'text-emerald-900' : 'text-white'}`}>
                                {mission.title}
                            </h4>
                        </div>
                        {!isMissionComplete && (
                            <div className="mt-3 flex items-center gap-1.5 text-green-400 font-bold text-[10px]">
                                <SparklesIcon className="w-3 h-3" /> +5 Credits
                            </div>
                        )}
                    </button>

                    {/* Daily Check-in Card */}
                    <button 
                        onClick={handleClaimCheckin}
                        disabled={!canClaimCheckin || isClaiming}
                        className={`p-5 rounded-[2rem] border transition-all text-left flex flex-col justify-between h-48 relative overflow-hidden ${
                            !canClaimCheckin 
                            ? 'bg-blue-50 border-blue-100 opacity-60' 
                            : 'bg-white border-gray-100 shadow-lg active:scale-95 shadow-indigo-500/5'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${!canClaimCheckin ? 'bg-white text-blue-500 shadow-sm' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}>
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</p>
                            <h4 className="text-sm font-black text-gray-900 leading-tight">
                                {isClaiming ? 'Claiming...' : !canClaimCheckin ? 'See you tomorrow' : 'Claim Daily Attendance'}
                            </h4>
                        </div>
                        {canClaimCheckin && (
                             <div className="mt-3 flex items-center gap-1.5 text-indigo-600 font-bold text-[10px]">
                                <SparklesIcon className="w-3 h-3" /> +1 Credit
                            </div>
                        )}
                        {!canClaimCheckin && (
                             <div className="mt-3 flex items-center gap-1.5 text-gray-400 font-bold text-[10px]">
                                <ClockIcon className="w-3 h-3" /> 24h cooldown
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* 5. QUICK FEATURES */}
            <div className="px-6 py-6 pb-12">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Quick Tools</h3>
                    <button onClick={() => setActiveTab('dashboard')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 active:opacity-50">
                        See All <ArrowRightIcon className="w-3 h-3" />
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                    {QUICK_TOOLS.map((tool) => (
                        <button 
                            key={tool.id} 
                            onClick={() => setActiveTab(tool.id as View)}
                            className="flex flex-col items-center gap-2 group active:scale-90 transition-transform"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${tool.color} group-active:shadow-inner transition-all border border-black/5`}>
                                <tool.icon className="w-7 h-7" />
                            </div>
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">{tool.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};
