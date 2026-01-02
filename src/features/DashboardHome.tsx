import React, { useState, useEffect, useMemo } from 'react';
import { User, Page, View, AppConfig, Creation } from '../types';
import { 
    getCreations, 
} from '../firebase';
import { downloadImage } from '../utils/imageUtils';
import { getDailyMission, isMissionLocked } from '../utils/dailyMissions';
import { ImageModal } from '../components/FeatureLayout';
import { CreatorRanksModal } from '../components/CreatorRanksModal';
import { 
    SparklesIcon, 
    DownloadIcon, 
    ProjectsIcon, 
    UsersIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    CaptionIcon,
    FlagIcon,
    CheckIcon,
    GiftIcon,
    InformationCircleIcon,
    ApparelIcon,
    MagicAdsIcon,
    PixaProductIcon,
    UploadTrayIcon,
    BuildingIcon,
    PixaEcommerceIcon,
    PixaTogetherIcon,
    PixaRestoreIcon,
    PixaCaptionIcon,
    PixaInteriorIcon,
    PixaTryOnIcon,
    PixaMockupIcon,
    PixaHeadshotIcon,
    CalendarIcon
} from '../components/icons';
import { DashboardStyles } from '../styles/Dashboard.styles';

const DailyQuest: React.FC<{ 
    user: User | null;
    navigateTo: (page: Page, view?: View) => void;
}> = ({ user, navigateTo }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const mission = getDailyMission();
    const isLocked = useMemo(() => isMissionLocked(user), [user]);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!user?.dailyMission?.nextUnlock) return;
            const now = new Date();
            const nextReset = new Date(user.dailyMission.nextUnlock);
            const diff = nextReset.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeLeft("Ready!");
                return;
            }
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [user]);

    return (
        <div className={`${DashboardStyles.questCard} ${isLocked ? DashboardStyles.questCardLocked : DashboardStyles.questCardActive}`}>
            {!isLocked && <div className="absolute top-0 right-0 w-32 h-32 bg-[#F9D230]/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-[#F9D230]/20 transition-colors"></div>}
            <div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm border ${isLocked ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-600 text-white border-red-500 animate-pulse shadow-red-500/20'}`}>
                        <FlagIcon className="w-3.5 h-3.5" /> {isLocked ? 'Mission Complete' : 'Daily Challenge'}
                    </span>
                    {!isLocked && <div className="w-2 h-2 bg-[#F9D230] rounded-full animate-pulse"></div>}
                </div>
                <h3 className={`text-xl font-bold mb-2 relative z-10 ${isLocked ? 'text-[#1A1A1E]' : 'text-white'}`}>{mission.title}</h3>
                <p className={`text-xs mb-3 relative z-10 leading-relaxed line-clamp-3 ${isLocked ? 'text-gray-500' : 'text-gray-300'}`}>{mission.description}</p>
            </div>
            <div className="relative z-10 mt-auto">
                {!isLocked ? (
                    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-xl p-3 flex items-center justify-between shadow-inner transform transition-transform hover:scale-[1.02]">
                        <div>
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-0.5">Complete to Unlock</p>
                            <p className="text-xl font-black text-[#1A1A1E] flex items-center gap-1 leading-none">
                               +5 <span className="text-xs font-bold text-amber-700">CREDITS</span>
                            </p>
                        </div>
                        <button onClick={() => navigateTo('dashboard', 'daily_mission')} className="bg-[#1A1A1E] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black hover:scale-105 transition-all shadow-lg whitespace-nowrap">Start Mission</button>
                    </div>
                ) : (
                    <div className="w-full flex justify-between items-center bg-white/50 p-3 rounded-xl border border-green-100">
                         <span className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckIcon className="w-4 h-4"/> Reward Claimed</span>
                         <span className="text-xs font-mono text-green-600">Next in {timeLeft}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export const DashboardHome: React.FC<{ 
    user: User | null; 
    navigateTo: (page: Page, view?: View, sectionId?: string) => void; 
    setActiveView: (view: View) => void;
    appConfig: AppConfig | null;
    openReferralModal: () => void;
}> = ({ user, navigateTo, setActiveView, appConfig, openReferralModal }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [showRanksModal, setShowRanksModal] = useState(false);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setCreations(data as Creation[]);
                setLoadingCreations(false);
            });
        }
    }, [user]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const lifetimeGens = user?.lifetimeGenerations || 0;
    let nextMilestone = 10, prevMilestone = 0, nextReward = 5;

    if (lifetimeGens < 10) { nextMilestone = 10; prevMilestone = 0; nextReward = 5; } 
    else if (lifetimeGens < 25) { nextMilestone = 25; prevMilestone = 10; nextReward = 10; } 
    else if (lifetimeGens < 50) { nextMilestone = 50; prevMilestone = 25; nextReward = 15; } 
    else if (lifetimeGens < 75) { nextMilestone = 75; prevMilestone = 50; nextReward = 20; } 
    else if (lifetimeGens < 100) { nextMilestone = 100; prevMilestone = 75; nextReward = 30; } 
    else { const hundreds = Math.floor(lifetimeGens / 100); prevMilestone = hundreds * 100; nextMilestone = (hundreds + 1) * 100; nextReward = 30; }
    
    const progressPercent = Math.min(100, Math.max(0, nextMilestone > prevMilestone ? ((lifetimeGens - prevMilestone) / (nextMilestone - prevMilestone)) * 100 : 0));

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
            'Pixa Mockups': 'mockup',
            'Pixa Headshot Pro': 'headshot',
            'Campaign Studio': 'campaign_studio',
            // Legacy Mappings
            'Magic Photo Studio': 'studio',
            'Merchant Studio': 'brand_kit',
            'Magic Ads': 'brand_stylist',
            'Brand Stylist': 'brand_stylist',
            'Magic Soul': 'soul',
            'Magic Photo Colour': 'colour',
            'CaptionAI': 'caption',
            'Magic Interior': 'interior',
            'Magic Apparel': 'apparel',
            'Magic Mockup': 'mockup'
        };
        const exact = map[featureName];
        if (exact) return exact;
        const fuzzy = Object.keys(map).find(k => featureName.includes(k));
        return fuzzy ? map[fuzzy] : 'studio';
    };

    const latestCreation = creations.length > 0 ? creations[0] : null;
    const latestFeatureLabel = latestCreation?.feature;

    const tools = [
        { id: 'studio', label: 'Pixa Product Shots', icon: PixaProductIcon, color: '' }, 
        { id: 'headshot', label: 'Pixa Headshot Pro', icon: PixaHeadshotIcon, color: '' },
        { id: 'brand_kit', label: 'Pixa Ecommerce Kit', icon: PixaEcommerceIcon, color: '' },
        { id: 'brand_stylist', label: 'Pixa AdMaker', icon: MagicAdsIcon, color: '' },
        { id: 'thumbnail_studio', label: 'Pixa Thumbnail Pro', icon: ThumbnailIcon, color: '' }, 
        { id: 'soul', label: 'Pixa Together', icon: PixaTogetherIcon, color: '' },
        { id: 'colour', label: 'Pixa Photo Restore', icon: PixaRestoreIcon, color: '' },
        { id: 'caption', label: 'Pixa Caption Pro', icon: PixaCaptionIcon, color: '' },
        { id: 'interior', label: 'Pixa Interior Design', icon: PixaInteriorIcon, color: '' },
        { id: 'apparel', label: 'Pixa TryOn', icon: PixaTryOnIcon, color: '' },
        { id: 'mockup', label: 'Pixa Mockups', icon: PixaMockupIcon, color: '' },
    ];

    return (
        <div className={DashboardStyles.container}>
            <div className={DashboardStyles.header}>
                <div>
                    <h1 className={DashboardStyles.welcomeTitle}>{getGreeting()}, {user?.name}!</h1>
                    <p className={DashboardStyles.welcomeSubtitle}>Ready to create something magic today?</p>
                </div>
                <button onClick={openReferralModal} className="md:hidden bg-purple-100 text-purple-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-purple-200">
                    <GiftIcon className="w-4 h-4" /> Refer & Earn
                </button>
            </div>
            <div className={DashboardStyles.heroGrid}>
                <div className={DashboardStyles.latestCreationCard}>
                    {loadingCreations ? (<div className="h-full flex items-center justify-center text-gray-400">Loading activity...</div>) : latestCreation ? (
                        <div className="relative h-full group cursor-zoom-in" onClick={() => setZoomedImage(latestCreation.imageUrl)}>
                            <img src={latestCreation.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Latest" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/10">Latest Creation</span>
                                <h3 className="text-white text-2xl font-bold mb-4">{latestFeatureLabel}</h3>
                                <div className="flex gap-3 pointer-events-auto">
                                    <button onClick={(e) => { e.stopPropagation(); downloadImage(latestCreation.imageUrl, 'latest.png'); }} className="bg-white text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"><DownloadIcon className="w-4 h-4" /> Download</button>
                                    <button onClick={(e) => { e.stopPropagation(); setActiveView(getFeatureViewId(latestCreation.feature)); }} className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#dfbc2b] transition-colors flex items-center gap-2"><SparklesIcon className="w-4 h-4" /> Generate Another</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={DashboardStyles.emptyStateCard}>
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                             <div className="relative z-10 max-w-md">
                                 <h2 className="text-3xl font-bold mb-4">Start your creative journey</h2>
                                 <p className="text-gray-400 mb-8">You haven't generated anything yet. I'm ready to help you create magic!</p>
                                 <button onClick={() => setActiveView('studio')} className="bg-[#F9D230] text-[#1A1A1E] px-6 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-colors relative z-10">Create Now</button>
                             </div>
                        </div>
                    )}
                </div>
                <div className={DashboardStyles.statsColumn}>
                    <div className={DashboardStyles.loyaltyCard}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors"></div>
                        <div className="relative z-10 flex items-center justify-between">
                            <div><div className="flex items-center gap-2 mb-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Loyalty Bonus</p><button onClick={() => setShowRanksModal(true)} className="text-gray-500 hover:text-[#4D7CFF] transition-colors"><InformationCircleIcon className="w-4 h-4" /></button></div><h3 className={DashboardStyles.loyaltyTitle}>{lifetimeGens} <span className="text-sm font-medium text-gray-400">Generations</span></h3></div>
                            <div className="text-right"><p className="text-xl font-black text-indigo-600">{nextMilestone}</p><p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Target</p></div>
                        </div>
                        <div className="relative z-10"><div className="flex justify-between text-xs font-bold mb-1.5"><span className="text-indigo-600">Progress</span><span className="text-gray-500">Next: +{nextReward} Credits</span></div><div className={DashboardStyles.progressBarBg}><div className={DashboardStyles.progressBarFill} style={{ width: `${progressPercent}%` }}><div className="absolute inset-0 bg-white/20 w-full h-full animate-[progress_2s_linear_infinite]"></div></div></div></div>
                    </div>
                    <div className="flex-1 min-h-[140px]"><DailyQuest user={user} navigateTo={(page, view) => view && setActiveView(view)} /></div>
                </div>
            </div>
            <div>
                <h2 className={DashboardStyles.toolsSectionTitle}>All Creative Tools</h2>
                <div className={DashboardStyles.toolsGrid}>
                    {tools.map(tool => {
                        const isDisabled = appConfig?.featureToggles?.[tool.id] === false;
                        return (
                            <button key={tool.id} onClick={() => setActiveView(tool.id as View)} disabled={isDisabled} className={`${DashboardStyles.toolCard} ${isDisabled ? DashboardStyles.toolCardDisabled : DashboardStyles.toolCardEnabled}`}>
                                <div className="mb-4 transition-transform group-hover:scale-110"><tool.icon className="w-14 h-14" /></div>
                                <span className="text-sm font-bold text-gray-800 group-hover:text-black">{tool.label}</span>
                                {isDisabled && <span className="mt-2 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>}
                            </button>
                        )
                    })}
                </div>
            </div>
            {zoomedImage && <ImageModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />}
            {showRanksModal && <CreatorRanksModal currentGens={lifetimeGens} onClose={() => setShowRanksModal(false)} />}
        </div>
    );
};