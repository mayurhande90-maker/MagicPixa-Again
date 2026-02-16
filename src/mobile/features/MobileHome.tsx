import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, View, Creation, Page, Transaction } from '../../types';
import { 
    SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, 
    ArrowRightIcon, LightningIcon, 
    PixaProductIcon, CameraIcon, CheckIcon,
    ClockIcon, FlagIcon, GiftIcon, UserIcon,
    PixaTogetherIcon, ThumbnailIcon, PixaRestoreIcon,
    PixaCaptionIcon, PixaInteriorIcon, PixaTryOnIcon,
    DashboardIcon, CreditCoinIcon, DownloadIcon, CalendarIcon,
    UploadIcon, PlusIcon, ImageIcon, MagicWandIcon, GlobeIcon,
    PaletteIcon, TicketIcon, PixaBillingIcon, LockIcon, BuildingIcon,
    CampaignStudioIcon,
    PixaEcommerceIcon
} from '../../components/icons';
import { getCreations, claimDailyAttendance, subscribeToLabCollections, getCreditHistory } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { getBadgeInfo } from '../../utils/badgeUtils';
import { downloadImage } from '../../utils/imageUtils';
import { CreatorRanksModal } from '../../components/CreatorRanksModal';
import { MobileSheet } from '../components/MobileSheet';

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
    { id: 'apparel', label: 'Pixa TryOn', before: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1000", after: "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=2000" },
    { id: 'soul', label: 'Pixa Together', before: "https://images.unsplash.com/photo-1516575394826-d312a4c8c24e?q=80&w=1000", after: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000" },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000" },
    { id: 'brand_kit', label: 'Ecommerce Kit', before: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2000", after: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=2000" },
    { id: 'colour', label: 'Photo Restore', before: "https://images.unsplash.com/photo-1493612276216-ee3925520721?q=80&w=2000", after: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=2000" }
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
    
    // History Tray States
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
                setCreations(data as Creation[]);
                setLoadingRecent(false);
            });
        }
        const unsubCollections = subscribeToLabCollections(setLabCollections);
        return () => unsubCollections();
    }, [user?.uid]);

    // Fixed, believable stats for the ticker
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

    const latestCreation = creations.length > 0 ? creations[0] : null;

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

    const fetchHistory = async () => {
        if (!user) return;
        setIsLoadingHistory(true);
        setIsHistoryOpen(true);
        try {
            const data = await getCreditHistory(user.uid);
            setTransactions(data as Transaction[]);
        } catch (e) {
            console.error("Failed to fetch history:", e);
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

    const groupedTransactions = groupTransactionsByDate(transactions);
    const sortedGroupKeys = Object.keys(groupedTransactions).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    return (
        <div className="pb-32 bg-[#FAFAFB] min-h-full animate-fadeIn overflow-x-hidden relative">
            
            {/* 1. POWER HEADER */}
            <div className="px-6 pt-8 pb-4 bg-white flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowRanksModal(true)}
                        className="relative w-14 h-14 flex items-center justify-center group active:scale-95 transition-transform"
                    >
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="28" cy="28" r="25" fill="none" stroke="#F1F5F9" strokeWidth="4" />
                            <circle 
                                cx="28" cy="28" r="25" fill="none" 
                                stroke="url(#streakGradient)" 
                                strokeWidth="4" 
                                strokeDasharray={157} 
                                strokeDashoffset={157 - (157 * progressPercent) / 100}
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
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg relative z-10 group-hover:shadow-indigo-500/30 transition-shadow">
                            {user?.avatar || firstName[0]}
                        </div>
                        {user?.lifetimeGenerations && user.lifetimeGenerations > 5 && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center shadow-sm animate-bounce-slight">
                                <LightningIcon className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </button>

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
                
                {/* UPDATED: Clicking credits now opens History Tray instead of navigating to billing tab */}
                <button onClick={fetchHistory} className="group active:scale-95 transition-all">
                    <div className="flex items-center gap-2 bg-gray-900 px-4 py-2.5 rounded-2xl shadow-xl shadow-gray-200 border border-gray-800">
                        <CreditCoinIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-black text-white">{user?.credits || 0}</span>
                    </div>
                </button>
            </div>

            {/* 2. INTELLIGENCE TICKER - Readable Glide Speed (20s) with Believable Data */}
            <div className="px-6 mb-6">
                <div className="bg-indigo-600/5 border border-indigo-100/50 rounded-full py-2 overflow-hidden relative">
                    <div className="flex whitespace-nowrap animate-ticker-slide">
                        <div className="flex whitespace-nowrap">
                            {tickerItems.map((msg, i) => (
                                <div key={`orig-${i}`} className="flex items-center gap-2 px-6">
                                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">{msg}</span>
                                    <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full ml-2"></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex whitespace-nowrap">
                            {tickerItems.map((msg, i) => (
                                <div key={`clone-${i}`} className="flex items-center gap-2 px-6">
                                    <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">{msg}</span>
                                    <div className="w-1.5 h-1.5 bg-indigo-200 rounded-full ml-2"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. LATEST CREATION BANNER */}
            <div className="px-6">
                <div className="relative w-full h-[320px] rounded-[2.5rem] bg-white border border-gray-100 shadow-xl overflow-hidden group active:scale-[0.98] transition-all">
                    {loadingRecent ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50">
                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Syncing Lab...</span>
                        </div>
                    ) : latestCreation ? (
                        <div className="w-full h-full relative" onClick={() => setActiveTab('creations')}>
                            <img src={latestCreation.imageUrl} className="w-full h-full object-cover" alt="Latest" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end">
                                <span className="bg-white/20 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit mb-2 border border-white/10 shadow-lg">Latest Creation</span>
                                <h3 className="text-white text-xl font-black tracking-tight mb-4">{latestCreation.feature}</h3>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); downloadImage(latestCreation.imageUrl, 'latest.png'); }} 
                                        className="flex-1 bg-white/10 backdrop-blur-md text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <DownloadIcon className="w-3.5 h-3.5" /> Download
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setActiveTab(getFeatureViewId(latestCreation.feature)); }} 
                                        className="flex-1 bg-[#F9D230] text-[#1A1A1E] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#dfbc2b] transition-all flex items-center justify-center gap-2"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" /> Start New
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div 
                            onClick={() => setActiveTab('studio')}
                            className="w-full h-full flex flex-col items-center justify-center text-center p-10 bg-gradient-to-br from-indigo-50 to-white"
                        >
                            <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 border border-indigo-100 text-indigo-600">
                                <PlusIcon className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Create Your First Magic</h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-6">Choose a tool and transform your first photo in seconds.</p>
                            <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200">Start Project</button>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. MISSION CONTROL */}
            <div className="px-6 py-8">
                 <div className="bg-gray-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                    {/* Background blob with pointer-events-none to prevent theft of touch events */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <FlagIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Mission Control</h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Daily Mission */}
                        <div className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex-1">
                                <h4 className="text-sm font-black mb-1">{mission.title}</h4>
                                <p className="text-[10px] text-gray-400 font-medium line-clamp-1">Reward: +5 Credits</p>
                            </div>
                            <button 
                                onClick={() => setActiveTab('daily_mission' as any)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isMissionComplete ? 'bg-green-50/20 text-green-400 border border-green-500/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95'}`}
                            >
                                {isMissionComplete ? 'Finished' : 'Launch'}
                            </button>
                        </div>

                        {/* Daily Check-in */}
                        <div className="flex items-center justify-between gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="flex-1">
                                <h4 className="text-sm font-black mb-1">Fuel Recharge</h4>
                                <p className="text-[10px] text-gray-400 font-medium">Claim +1 free daily credit</p>
                            </div>
                            <button 
                                onClick={handleClaimCheckin}
                                disabled={isClaiming || !canClaimCheckin}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!canClaimCheckin ? 'bg-white/5 text-gray-500 cursor-default' : 'bg-amber-400 text-black shadow-lg shadow-amber-400/20 active:scale-95'}`}
                            >
                                {isClaiming ? 'Wait...' : !canClaimCheckin ? '24h Locked' : 'Claim Credit'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. THE TRANSFORMATION GALLERY */}
            <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Transformation Gallery</h3>
                    <SparklesIcon className="w-4 h-4 text-indigo-500 animate-pulse" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
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

            {/* 6. EXTRA GALLERY TILES */}
            <div className="px-6 py-4 pb-8">
                <div className="grid grid-cols-2 gap-4">
                    {galleryItems.slice(3, 7).map((item, i) => (
                        <div key={item.id} className="h-44">
                            <AutoWipeBox 
                                item={item} 
                                delay={(i + 3) * 800} 
                                compact 
                                onClick={() => setActiveTab(item.id as View)} 
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* 7. TOOL HUB */}
            <div className="px-6 py-8 pb-16">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 ml-1">Advanced Tool Hub</h3>
                <div className="grid grid-cols-2 gap-4">
                    {BENTO_TOOLS.map((tool) => (
                        <button 
                            key={tool.id}
                            onClick={() => setActiveTab(tool.id as View)}
                            className="group relative bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg shadow-gray-200/50 flex flex-col justify-between h-48 text-left active:scale-[0.98] transition-all overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-12 -mt-12 opacity-0 group-active:opacity-100 transition-opacity"></div>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${tool.text}`}>
                                <tool.icon className="w-12 h-12" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-gray-900 leading-tight">{tool.label}</h4>
                                <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${tool.text}`}>{tool.sub}</p>
                            </div>
                            <div className="absolute bottom-5 right-5 opacity-20 group-hover:opacity-100 transition-all transform group-active:translate-x-1">
                                <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                            </div>
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="w-full mt-8 py-5 rounded-2xl bg-gray-50 border border-gray-100 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center justify-center gap-2 active:bg-gray-100 transition-all"
                >
                    Explore all tools <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>

            {/* HISTORY TRAY - Mobile Sheet for transactions */}
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
                        <button 
                            onClick={() => { setIsHistoryOpen(false); setActiveTab('billing'); }}
                            className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest active:bg-indigo-100 transition-all border border-indigo-100"
                        >
                            Visit Billing Station
                        </button>
                    </div>
                </div>
            </MobileSheet>

            {/* CREATOR RANKS MODAL */}
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
                    animation: ticker-slide 20s linear infinite;
                }
            `}</style>

        </div>
    );
};

export default MobileHome;
