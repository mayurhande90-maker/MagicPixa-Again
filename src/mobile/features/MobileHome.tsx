import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AuthProps, View, Creation } from '../../types';
import { 
    SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, 
    ArrowRightIcon, LightningIcon, 
    PixaProductIcon, CameraIcon, CheckIcon,
    ClockIcon, FlagIcon, GiftIcon, UserIcon,
    PixaTogetherIcon, ThumbnailIcon, PixaRestoreIcon,
    PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon,
    DashboardIcon, CreditCoinIcon, DownloadIcon, CalendarIcon,
    UploadIcon, PlusIcon, RefreshIcon
} from '../../components/icons';
import { getCreations, claimDailyAttendance } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { downloadImage, fileToBase64 } from '../../utils/imageUtils';

interface MobileHomeProps {
    auth: AuthProps;
    setActiveTab: (tab: View) => void;
}

const BENTO_TOOLS = [
    { id: 'studio', label: 'Pixa Studio', sub: 'Pro Products', icon: PixaProductIcon, color: 'bg-blue-600', text: 'text-blue-500' },
    { id: 'brand_stylist', label: 'AdMaker', sub: 'Viral Creatives', icon: MagicAdsIcon, color: 'bg-orange-600', text: 'text-orange-500' },
    { id: 'headshot', label: 'Headshot Pro', sub: 'Executive', icon: PixaHeadshotIcon, color: 'bg-amber-600', text: 'text-amber-500' },
    { id: 'thumbnail_studio', label: 'Viral Hook', sub: 'CTR Boost', icon: ThumbnailIcon, color: 'bg-red-600', text: 'text-red-500' },
];

const INSPIRATION_SAMPLES = [
    { label: "Luxury Product", before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000", after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=1000" },
    { label: "Pro Headshot", before: "https://i.pravatar.cc/600?u=1", after: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000" },
];

const AutoWipe: React.FC<{ item: typeof INSPIRATION_SAMPLES[0] }> = ({ item }) => (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
        <img src={item.before} className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale" alt="Before" />
        <div className="absolute inset-0 w-full h-full animate-mobile-wipe overflow-hidden">
            <img src={item.after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
        </div>
        <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-end">
            <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-black text-white uppercase tracking-widest w-fit border border-white/10">
                {item.label}
            </span>
        </div>
        <style>{`
            @keyframes mobile-wipe {
                0%, 10% { clip-path: inset(0 100% 0 0); }
                45%, 55% { clip-path: inset(0 0 0 0); }
                90%, 100% { clip-path: inset(0 100% 0 0); }
            }
            .animate-mobile-wipe { animation: mobile-wipe 6s ease-in-out infinite; }
        `}</style>
    </div>
);

// Animation Component for the flying coin
const FlyingCoin: React.FC<{ start: { x: number, y: number }, onComplete: () => void }> = ({ start, onComplete }) => {
    const [target, setTarget] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const targetEl = document.getElementById('mobile-credit-pill');
        if (targetEl) {
            const rect = targetEl.getBoundingClientRect();
            setTarget({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
        const timer = setTimeout(onComplete, 1000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const style = {
        '--start-x': `${start.x}px`,
        '--start-y': `${start.y}px`,
        '--end-x': `${target.x}px`,
        '--end-y': `${target.y}px`,
    } as React.CSSProperties;

    return (
        <div className="fixed z-[999] pointer-events-none coin-animation" style={style}>
            <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-yellow-500 text-yellow-900 animate-coin-spin">
                <CreditCoinIcon className="w-5 h-5" />
            </div>
            <style>{`
                .coin-animation {
                    top: var(--start-y);
                    left: var(--start-x);
                    animation: fly-to-header 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                @keyframes fly-to-header {
                    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { top: var(--end-y); left: var(--end-x); transform: translate(-50%, -50%) scale(0.3); opacity: 0.5; }
                }
                @keyframes coin-spin {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(360deg); }
                }
                .animate-coin-spin { animation: coin-spin 0.4s linear infinite; }
            `}</style>
        </div>
    );
};

export const MobileHome: React.FC<MobileHomeProps> = ({ auth, setActiveTab }) => {
    const [recentCreations, setRecentCreations] = useState<Creation[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [showFlyingCoin, setShowFlyingCoin] = useState(false);
    const [coinStartPos, setCoinStartPos] = useState({ x: 0, y: 0 });
    
    const user = auth.user;
    const firstName = user?.name ? user.name.split(' ')[0] : 'Creator';
    const mission = getDailyMission();
    const isMissionComplete = isMissionLocked(user);
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    const canClaimCheckin = useMemo(() => {
        if (!user?.lastAttendanceClaim) return true;
        const last = (user.lastAttendanceClaim as any).toDate ? (user.lastAttendanceClaim as any).toDate() : new Date(user.lastAttendanceClaim as any);
        const now = new Date();
        const diffMs = now.getTime() - last.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        return diffHours >= 24;
    }, [user?.lastAttendanceClaim]);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setRecentCreations(data as Creation[]);
                setLoadingRecent(false);
            });
        }
    }, [user?.uid]);

    const handleClaimCheckin = async (e: React.MouseEvent) => {
        if (!user || isClaiming || !canClaimCheckin) return;
        
        // Capture click position for animation
        setCoinStartPos({ x: e.clientX, y: e.clientY });
        setShowFlyingCoin(true);
        setIsClaiming(true);

        // Sync database update with animation
        setTimeout(async () => {
            try {
                const updatedUser = await claimDailyAttendance(user.uid);
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            } catch (err) {
                console.error("Check-in failed.");
            } finally {
                setIsClaiming(false);
            }
        }, 400);
    };

    const handlePrimeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setActiveTab('studio');
        }
    };

    return (
        <div className="pb-12 bg-[#FAFAFB] min-h-full animate-fadeIn overflow-x-hidden">
            
            {/* 1. POWER HEADER */}
            <div className="px-6 pt-8 pb-6 bg-white border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200 overflow-hidden">
                        {user?.avatar && user.avatar.length <= 2 ? user.avatar : <img src={user?.avatar} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 leading-none">Hello, {firstName}</h1>
                        <div className="flex items-center gap-1.5 mt-1.5">
                             <div className={`p-0.5 rounded-md ${badge.bgColor} ${badge.borderColor}`}>
                                <badge.Icon className={`w-3 h-3 ${badge.iconColor}`} />
                             </div>
                             <span className={`text-[9px] font-black uppercase tracking-widest ${badge.color}`}>{badge.rank}</span>
                        </div>
                    </div>
                </div>
                
                <button onClick={() => setActiveTab('billing' as any)} className="group active:scale-95 transition-all">
                    <div className="flex items-center gap-2 bg-gray-900 px-4 py-2.5 rounded-2xl shadow-xl shadow-gray-200 border border-gray-800">
                        <CreditCoinIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-black text-white">{user?.credits || 0}</span>
                    </div>
                </button>
            </div>

            {/* 2. THE PRIME DIRECTIVE (One-Tap Entry) */}
            <div className="px-6 py-6">
                <div 
                    onClick={() => document.getElementById('prime-upload')?.click()}
                    className="relative w-full h-32 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2.5rem] p-1 shadow-2xl shadow-indigo-200 group active:scale-[0.97] transition-all overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative h-full w-full bg-indigo-600/20 backdrop-blur-sm rounded-[2.3rem] flex items-center justify-center gap-4 px-8">
                        <div className="w-14 h-14 bg-white rounded-[1.5rem] shadow-2xl flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                            <PlusIcon className="w-8 h-8 stroke-[3px]" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-xl font-black text-white tracking-tight">Start with a Photo</h2>
                            <p className="text-xs text-indigo-100 font-medium opacity-80">Tap to unleash Pixa Vision</p>
                        </div>
                    </div>
                    <input id="prime-upload" type="file" className="hidden" accept="image/*" onChange={handlePrimeUpload} />
                </div>
            </div>

            {/* 3. THE PRODUCTION LINE (Horizontal Recents) */}
            {recentCreations.length > 0 && (
                <div className="py-2">
                    <div className="px-6 flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">The Production Line</h3>
                        <button onClick={() => setActiveTab('creations')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">See Lab</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4">
                        {recentCreations.slice(0, 6).map((c) => (
                            <div key={c.id} className="relative shrink-0 w-32 aspect-square rounded-3xl bg-white border border-gray-100 shadow-md overflow-hidden active:scale-95 transition-all">
                                <img src={c.imageUrl} className="w-full h-full object-cover" alt="Recent" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <p className="text-[8px] font-black text-white uppercase truncate">{c.feature}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. TOOL HUB (Bento Grid Discovery) */}
            <div className="px-6 py-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Advanced Tool Hub</h3>
                <div className="grid grid-cols-2 gap-4">
                    {BENTO_TOOLS.map((tool) => (
                        <button 
                            key={tool.id}
                            onClick={() => setActiveTab(tool.id as View)}
                            className="group relative bg-white p-5 rounded-[2rem] border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col justify-between h-40 text-left active:scale-[0.98] transition-all overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full -mr-8 -mt-8 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-black/5 ${tool.color} text-white`}>
                                <tool.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-900 leading-tight">{tool.label}</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${tool.text}`}>{tool.sub}</p>
                            </div>
                            <div className="absolute bottom-4 right-4 opacity-20 group-hover:opacity-100 transition-all transform group-active:translate-x-1">
                                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. MISSION CONTROL (Gamification) */}
            <div className="px-6 py-6">
                 <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                    
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <FlagIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Mission Control</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Daily Mission */}
                        <div className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                            <div className="flex-1">
                                <h4 className="text-sm font-black mb-1">{mission.title}</h4>
                                <p className="text-[10px] text-gray-400 font-medium line-clamp-1">Reward: +5 Credits</p>
                            </div>
                            <button 
                                onClick={() => setActiveTab('daily_mission' as any)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMissionComplete ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}
                            >
                                {isMissionComplete ? 'Finished' : 'Launch'}
                            </button>
                        </div>

                        {/* Premium Daily Check-in Card (Redesigned) */}
                        <button 
                            onClick={handleClaimCheckin}
                            disabled={!canClaimCheckin || isClaiming}
                            className={`w-full relative group transition-all duration-500 text-left overflow-hidden rounded-3xl border ${
                                canClaimCheckin 
                                ? 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 border-indigo-400 shadow-[0_10px_30px_rgba(99,102,241,0.3)] animate-premium-breathe active:scale-[0.98]' 
                                : 'bg-white/5 border-white/5 grayscale opacity-60'
                            }`}
                        >
                            {/* Card Content */}
                            <div className="p-5 relative z-10 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${canClaimCheckin ? 'bg-white/10 shadow-inner group-hover:scale-110' : 'bg-white/5'}`}>
                                        <LightningIcon className={`w-6 h-6 ${canClaimCheckin ? 'text-yellow-400' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black text-white">Daily Recharge</h4>
                                            {canClaimCheckin && (
                                                <span className="bg-yellow-400 text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">Claim Now</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-indigo-200/70 font-medium">
                                            {canClaimCheckin ? 'Tap box to get +1 Credit' : 'Next refill available in 24h'}
                                        </p>
                                    </div>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    <div className={`text-xl font-black ${canClaimCheckin ? 'text-white' : 'text-gray-500'}`}>+1</div>
                                    <CreditCoinIcon className={`w-5 h-5 ${canClaimCheckin ? 'text-yellow-400' : 'text-gray-500'}`} />
                                </div>
                            </div>

                            {/* Decorative Sparkles & Shimmer */}
                            {canClaimCheckin && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                                    <SparklesIcon className="absolute top-2 right-4 w-12 h-12 text-white/5 -rotate-12" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* 6. INSPIRATION FEED */}
            <div className="px-6 py-4 pb-12">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Inspiration Feed</h3>
                <div className="grid grid-cols-1 gap-4">
                    {INSPIRATION_SAMPLES.map((sample, i) => (
                        <div key={i} className="h-64">
                            <AutoWipe item={sample} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Animation Portal Area */}
            {showFlyingCoin && (
                <FlyingCoin 
                    start={coinStartPos} 
                    onComplete={() => setShowFlyingCoin(false)} 
                />
            )}

            <style>{`
                @keyframes premium-breathe {
                    0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(99, 102, 241, 0.2); border-color: rgba(129, 140, 248, 0.4); }
                    50% { transform: scale(1.01); box-shadow: 0 15px 40px rgba(99, 102, 241, 0.4); border-color: rgba(129, 140, 248, 0.8); }
                }
                .animate-premium-breathe { animation: premium-breathe 4s ease-in-out infinite; }
                
                @keyframes shimmer {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(100%); }
                }
                .animate-shimmer { animation: shimmer 2s linear infinite; }
            `}</style>
        </div>
    );
};
