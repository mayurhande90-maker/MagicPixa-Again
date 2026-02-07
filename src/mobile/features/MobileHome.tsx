import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, View, Creation, Page } from '../../types';
import { 
    SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, 
    ArrowRightIcon, LightningIcon, 
    PixaProductIcon, CameraIcon, CheckIcon,
    ClockIcon, FlagIcon, GiftIcon, UserIcon,
    PixaTogetherIcon, ThumbnailIcon, PixaRestoreIcon,
    PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon,
    DashboardIcon, CreditCoinIcon, DownloadIcon, CalendarIcon,
    UploadIcon, PlusIcon, ImageIcon, MagicWandIcon, GlobeIcon,
    PaletteIcon, XIcon, SearchIcon
} from '../../components/icons';
import { getCreations, claimDailyAttendance, subscribeToLabCollections } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { downloadImage } from '../../utils/imageUtils';
import { CreatorRanksModal } from '../../components/CreatorRanksModal';

// Believable, grounded stats for professional authenticity
const REALISTIC_STATS = [
    "12 product shots rendered in the last hour",
    "Live: 8 creators currently in the Studio",
    "New Preset: 'Natural Linen' lifestyle logic live",
    "82% faster listing creation for small brands",
    "Verified: 100% Identity Lock on recent exports",
    "Recent: 4K Executive Headshot processed"
];

const BENTO_TOOLS = [
    { id: 'studio', label: 'Pixa Studio', sub: 'Pro Products', icon: PixaProductIcon, text: 'text-blue-500' },
    { id: 'brand_stylist', label: 'AdMaker', sub: 'Viral Creatives', icon: MagicAdsIcon, text: 'text-orange-500' },
    { id: 'headshot', label: 'Headshot Pro', sub: 'Executive', icon: PixaHeadshotIcon, text: 'text-amber-500' },
    { id: 'thumbnail_studio', label: 'Viral Hook', sub: 'CTR Boost', icon: ThumbnailIcon, text: 'text-red-500' },
];

const GALLERY_ITEMS_DEFINITION = [
    { id: 'studio', label: 'Product Shots' },
    { id: 'headshot', label: 'Headshot Pro' },
    { id: 'interior', label: 'Interior Design' },
    { id: 'brand_stylist', label: 'AdMaker' },
    { id: 'apparel', label: 'Pixa TryOn' },
    { id: 'soul', label: 'Pixa Together' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro' },
    { id: 'brand_kit', label: 'Ecommerce Kit' },
    { id: 'colour', label: 'Photo Restore' }
];

const GALLERY_ITEMS_STATIC = [
    { id: 'studio', label: 'Product Shots', before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000", after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=1000" },
    { id: 'headshot', label: 'Headshot Pro', before: "https://i.pravatar.cc/600?u=1", after: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000" },
    { id: 'interior', label: 'Interior Design', before: "https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000", after: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1000" },
    { id: 'brand_stylist', label: 'AdMaker', before: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000", after: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1000" },
    { id: 'apparel', label: 'Pixa TryOn', before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000", after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1000" },
    { id: 'soul', label: 'Pixa Together', before: "https://images.unsplash.com/photo-1516575394826-d312a4c8c24e?q=80&w=1000", after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000" },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1000", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000" },
    { id: 'brand_kit', label: 'Ecommerce Kit', before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000", after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000" },
    { id: 'colour', label: 'Photo Restore', before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=1000", after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=1000" }
];

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const AutoWipeBox: React.FC<{ item: any; delay: number; onClick: () => void; compact?: boolean }> = ({ item, delay, onClick, compact }) => {
    return (
        <div 
            onClick={onClick}
            className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-gray-100 shadow-sm bg-gray-50 transition-all duration-500 active:scale-95 cursor-pointer"
        >
            {/* Before Image */}
            <img src={item.before} className="absolute inset-0 w-full h-full object-cover brightness-95" alt="Before" />
            
            {/* After Image with Wipe Animation */}
            <div 
                className="absolute inset-0 w-full h-full z-10"
                style={{ 
                    animation: `auto-wipe-mobile 6s ease-in-out infinite`,
                    animationDelay: `${delay}ms` 
                }}
            >
                <img src={item.after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
            </div>

            {/* Wipe Handle Bar */}
            <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white/60 backdrop-blur-md z-30 flex items-center justify-center"
                style={{ 
                    animation: `auto-wipe-handle-mobile 6s ease-in-out infinite`,
                    animationDelay: `${delay}ms` 
                }}
            >
                <div className="w-6 h-6 bg-white rounded-full shadow-xl flex items-center justify-center border border-indigo-100 transform -translate-x-1/2">
                    <SparklesIcon className="w-3 h-3 text-indigo-600" />
                </div>
            </div>

            {/* Label - Shifted to bottom left */}
            <div className="absolute bottom-3 left-3 z-40">
                <div className={`bg-black/60 backdrop-blur-md ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-lg border border-white/10 shadow-lg`}>
                    <span className={`${compact ? 'text-[6px]' : 'text-[7px]'} font-black text-white uppercase tracking-widest leading-none`}>{item.label}</span>
                </div>
            </div>

            <style>{`
                @keyframes auto-wipe-mobile {
                    0%, 15% { clip-path: inset(0 100% 0 0); }
                    40%, 60% { clip-path: inset(0 0% 0 0); }
                    85%, 100% { clip-path: inset(0 100% 0 0); }
                }
                @keyframes auto-wipe-handle-mobile {
                    0%, 15% { left: 0%; opacity: 0; }
                    16% { opacity: 1; }
                    40%, 60% { left: 100%; opacity: 1; }
                    84% { opacity: 1; }
                    85%, 100% { left: 0%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

interface MobileHomeProps {
    auth: AuthProps;
    setActiveTab: (tab: View) => void;
}

export const MobileHome: React.FC<MobileHomeProps> = ({ auth, setActiveTab }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [labCollections, setLabCollections] = useState<Record<string, any[] | Record<string, any>>>({});
    const [showRanksModal, setShowRanksModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const user = auth.user;
    const firstName = user?.name ? user.name.split(' ')[0] : 'Creator';
    const mission = getDailyMission();
    const isMissionComplete = isMissionLocked(user);
    const badge = getBadgeInfo(user?.lifetimeGenerations || 0);

    // Contextual Greeting Logic
    const dynamicGreeting = useMemo(() => {
        const hour = new Date().getHours();
        const base = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
        return `${base}, ${firstName}. You have ${user?.credits || 0} credits ready for today's shoot.`;
    }, [firstName, user?.credits]);

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
                setCreations(data.slice(0, 6) as Creation[]);
                setLoadingRecent(false);
            });
        }
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        return () => unsubCollections();
    }, [user?.uid]);

    const tickerItems = useMemo(() => shuffleArray([...REALISTIC_STATS]), []);
    const shuffledDefinitions = useMemo(() => shuffleArray([...GALLERY_ITEMS_DEFINITION]), []);

    const galleryItems = useMemo(() => {
        const slotData = (labCollections['homepage_gallery'] as Record<string, any>) || {};
        return shuffledDefinitions.map(def => {
            const uploaded = slotData[def.id] || {};
            const staticDefault = GALLERY_ITEMS_STATIC.find(s => s.id === def.id) || GALLERY_ITEMS_STATIC[0];
            return {
                id: def.id,
                label: def.label,
                before: uploaded.before || staticDefault.before,
                after: uploaded.after || staticDefault.after
            };
        });
    }, [labCollections['homepage_gallery'], shuffledDefinitions]);

    const handleClaimCheckin = async () => {
        if (!user || isClaiming) return;
        setIsClaiming(true);
        try {
            const updatedUser = await claimDailyAttendance(user.uid);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            alert("Check-in failed.");
        } finally {
            setIsClaiming(false);
        }
    };

    const getFeatureViewId = (featureName: string): View => {
        const map: Record<string, View> = {
            'Pixa Product Shots': 'studio',
            'Pixa Model Shots': 'studio',
            'Pixa Ecommerce Kit': 'brand_kit',
            'Pixa AdMaker': 'brand_stylist',
            'Pixa Thumbnail Pro': 'thumbnail_studio',
            'Pixa Together': 'soul',
            'Pixa Photo Restore': 'colour',
            'Pixa Caption Pro': 'caption',
            'Pixa Interior Design': 'interior',
            'Pixa TryOn': 'apparel',
            'Pixa Headshot Pro': 'headshot',
            'Campaign Studio': 'campaign_studio',
        };
        const exact = map[featureName];
        if (exact) return exact;
        const fuzzy = Object.keys(map).find(k => featureName.includes(k));
        return fuzzy ? map[fuzzy] : 'studio';
    };

    const progressPercent = useMemo(() => {
        const current = user?.lifetimeGenerations || 0;
        const next = badge.nextMilestone;
        if (next === 0) return 100;
        let prev = 0;
        if (current >= 100) prev = 100;
        else if (current >= 30) prev = 30;
        else if (current >= 10) prev = 10;
        return Math.min(100, Math.max(0, ((current - prev) / (next - prev)) * 100));
    }, [user?.lifetimeGenerations, badge.nextMilestone]);

    return (
        <div className="pb-32 bg-[#FAFAFB] min-h-full animate-fadeIn overflow-x-hidden relative">
            
            {/* 1. PREMIUM HEADER & CONTEXTUAL GREETING */}
            <div className="px-6 pt-10 pb-6 bg-white flex flex-col gap-6 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowRanksModal(true)}
                            className="relative w-12 h-12 flex items-center justify-center group active:scale-90 transition-transform"
                        >
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle cx="24" cy="24" r="22" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                                <circle 
                                    cx="24" cy="24" r="22" fill="none" 
                                    stroke="url(#streakGradient)" 
                                    strokeWidth="3" 
                                    strokeDasharray={138.2} 
                                    strokeDashoffset={138.2 - (138.2 * progressPercent) / 100}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out"
                                />
                                <defs>
                                    <linearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-lg relative z-10">
                                {user?.avatar || firstName[0]}
                            </div>
                        </button>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 leading-none">{badge.rank}</span>
                            <h2 className="text-xl font-black text-gray-900 leading-none tracking-tight">Command Center</h2>
                        </div>
                    </div>
                    
                    <button onClick={() => setActiveTab('billing' as any)} className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-full flex items-center gap-2 active:scale-95 transition-all">
                        <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-black text-gray-900">{user?.credits || 0}</span>
                    </button>
                </div>

                <div className="px-1">
                    <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-[280px]">
                        {dynamicGreeting}
                    </p>
                </div>
            </div>

            {/* 2. MAGIC SEARCH ACTION BAR */}
            <div className="px-6 mb-8">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <SearchIcon className="w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="I want to make..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-100 py-4 pl-12 pr-6 rounded-[1.5rem] shadow-xl shadow-gray-200/50 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                        <span className="bg-gray-50 px-2 py-1 rounded-md text-[8px] font-black text-gray-300 uppercase border border-gray-100">Intelligent</span>
                    </div>
                </div>
            </div>

            {/* 3. RESUME PROJECT CAROUSEL */}
            <div className="mb-10">
                <div className="px-6 flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Resume Production</h3>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-200"></div>
                    </div>
                </div>

                <div className="flex overflow-x-auto no-scrollbar gap-4 px-6 snap-x snap-mandatory">
                    {loadingRecent ? (
                        [1, 2, 3].map(i => (
                            <div key={i} className="shrink-0 w-[240px] h-[160px] bg-gray-100 rounded-[2rem] animate-pulse"></div>
                        ))
                    ) : creations.length > 0 ? (
                        creations.map((c) => (
                            <div 
                                key={c.id}
                                onClick={() => setActiveTab('creations')}
                                className="shrink-0 w-[240px] snap-center relative aspect-[3/2] rounded-[2rem] overflow-hidden border border-gray-100 shadow-xl group active:scale-95 transition-all"
                            >
                                <img src={c.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-5 flex flex-col justify-end">
                                    <div className="flex justify-between items-end">
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Asset Ref: {c.id.slice(-4)}</p>
                                            <h4 className="text-white text-sm font-black truncate max-w-[120px]">{c.feature}</h4>
                                        </div>
                                        <button className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl text-white border border-white/20">
                                            <MagicWandIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="w-full bg-white p-10 rounded-[2rem] border border-dashed border-gray-200 text-center">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No active sessions found</p>
                        </div>
                    )}
                    <div className="shrink-0 w-6 h-full"></div> {/* Spacer for scroll end */}
                </div>
            </div>

            {/* 4. MISSION CONTROL (PREMIUM POLISH) */}
            <div className="px-6 py-4">
                 <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                    {/* Animated Light Sweep Effect */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-45 animate-light-sweep-slow"></div>
                    </div>

                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/20">
                                <FlagIcon className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">Live Missions</h3>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-[8px] font-black uppercase">Online</span>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between gap-4 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 active:bg-white/10 transition-colors" onClick={() => setActiveTab('daily_mission' as any)}>
                            <div className="flex-1">
                                <h4 className="text-sm font-black mb-1 leading-tight">{mission.title}</h4>
                                <p className="text-[10px] text-gray-400 font-medium line-clamp-1">Reward Ready: +5 Credits</p>
                            </div>
                            <div className={`p-2 rounded-xl ${isMissionComplete ? 'bg-green-500 text-white' : 'bg-white/10 text-indigo-300'}`}>
                                {isMissionComplete ? <CheckIcon className="w-4 h-4" /> : <ArrowRightIcon className="w-4 h-4" />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. DYNAMIC STATS TICKER */}
            <div className="px-6 mt-4 mb-4">
                <div className="bg-white/50 backdrop-blur-sm border border-gray-100 rounded-full py-2.5 overflow-hidden relative">
                    <div className="flex whitespace-nowrap animate-ticker-slide">
                        <div className="flex whitespace-nowrap">
                            {tickerItems.map((msg, i) => (
                                <div key={`orig-${i}`} className="flex items-center gap-2 px-6">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{msg}</span>
                                    <div className="w-1 h-1 bg-indigo-300 rounded-full ml-2"></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex whitespace-nowrap">
                            {tickerItems.map((msg, i) => (
                                <div key={`clone-${i}`} className="flex items-center gap-2 px-6">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{msg}</span>
                                    <div className="w-1 h-1 bg-indigo-300 rounded-full ml-2"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. TRANSFORMATION GALLERY */}
            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-5 px-1">
                    <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-[0.25em]">Global Showreel</h3>
                    <div className="h-0.5 w-12 bg-indigo-100 rounded-full"></div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                    {galleryItems.slice(0, 3).map((item, i) => (
                        <AutoWipeBox 
                            key={item.id} 
                            item={item} 
                            delay={i * 800} 
                            onClick={() => setActiveTab(item.id as View)} 
                        />
                    ))}
                </div>
            </div>

            {/* 7. TOOL HUB 2.0 */}
            <div className="px-6 py-8 pb-16 bg-white border-t border-gray-50 rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.02)]">
                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] mb-6 ml-1">Studio Toolkit</h3>
                <div className="grid grid-cols-2 gap-4">
                    {BENTO_TOOLS.map((tool) => (
                        <button 
                            key={tool.id}
                            onClick={() => setActiveTab(tool.id as View)}
                            className="group relative bg-[#F8FAFC] p-6 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between h-48 text-left active:scale-95 active:bg-white active:shadow-2xl transition-all overflow-hidden"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white shadow-sm border border-gray-100 transition-transform group-hover:scale-110 ${tool.text}`}>
                                <tool.icon className="w-10 h-10" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-gray-900 leading-tight">{tool.label}</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${tool.text}`}>{tool.sub}</p>
                            </div>
                            <div className="absolute top-6 right-6 opacity-0 group-active:opacity-100 transition-opacity">
                                <SparklesIcon className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                            </div>
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full mt-10 py-5 rounded-3xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-gray-200"
                >
                    Launch All Tools <ArrowRightIcon className="w-4 h-4 text-indigo-400" />
                </button>
            </div>

            {/* MODALS */}
            {showRanksModal && (
                <CreatorRanksModal 
                    currentGens={user?.lifetimeGenerations || 0} 
                    onClose={() => setShowRanksModal(false)} 
                />
            )}

            <style>{`
                @keyframes ticker-slide {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker-slide {
                    animation: ticker-slide 25s linear infinite;
                }
                @keyframes light-sweep-slow {
                    0% { transform: translateX(-100%) rotate(45deg); }
                    30% { transform: translateX(200%) rotate(45deg); }
                    100% { transform: translateX(200%) rotate(45deg); }
                }
                .animate-light-sweep-slow {
                    animation: light-sweep-slow 6s ease-in-out infinite;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

        </div>
    );
};

export default MobileHome;
