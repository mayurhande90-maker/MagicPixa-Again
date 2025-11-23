
import React, { useState, useEffect } from 'react';
import { User, Page, View, AppConfig, Creation } from '../types';
import { getCreations } from '../firebase';
import { downloadImage } from '../utils/imageUtils';
import { getDailyMission, isMissionLocked } from '../utils/dailyMissions';
import { 
    SparklesIcon, 
    DownloadIcon, 
    PhotoStudioIcon, 
    FlagIcon, 
    GiftIcon, 
    CheckIcon, 
    ArrowRightIcon,
    ProductStudioIcon,
    LightbulbIcon,
    ThumbnailIcon,
    PaletteIcon,
    UsersIcon
} from '../components/icons';
import { ImageModal } from '../components/FeatureLayout';

interface DashboardHomeProps {
    user: User | null;
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    setActiveView: (view: View) => void;
    appConfig: AppConfig | null;
    openReferralModal: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ user, navigateTo, setActiveView, appConfig, openReferralModal }) => {
    const [latestCreation, setLatestCreation] = useState<Creation | null>(null);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    
    const dailyMission = getDailyMission();
    // Check if mission is locked based on persistent user state
    const isMissionDone = isMissionLocked(user);

    useEffect(() => {
        if (user) {
            getCreations(user.uid)
                .then(creations => {
                    if (creations.length > 0) {
                        // Assuming getCreations returns sorted by date desc (as per firebase.ts impl)
                        setLatestCreation(creations[0] as Creation);
                    }
                })
                .catch(err => console.error("Failed to load creations", err))
                .finally(() => setLoadingCreations(false));
        } else {
            setLoadingCreations(false);
        }
    }, [user]);

    const getFeatureViewId = (featureName: string): View => {
        const map: {[key: string]: View} = {
            'Magic Photo Studio': 'studio',
            'Model Shot': 'studio',
            'Product Studio': 'product_studio',
            'Brand Stylist AI': 'brand_stylist',
            'Thumbnail Studio': 'thumbnail_studio',
            'Magic Soul': 'soul',
            'Magic Photo Colour': 'colour',
            'CaptionAI': 'caption',
            'Magic Interior': 'interior',
            'Magic Apparel': 'apparel',
            'Magic Mockup': 'mockup'
        };
        // Simple partial match
        for (const key in map) {
            if (featureName.includes(key)) return map[key];
        }
        return 'studio';
    };

    const quickActions = [
        { id: 'studio', label: 'Magic Photo', icon: PhotoStudioIcon, color: 'bg-blue-500' },
        { id: 'product_studio', label: 'Product Pack', icon: ProductStudioIcon, color: 'bg-green-500' },
        { id: 'brand_stylist', label: 'Brand Style', icon: LightbulbIcon, color: 'bg-yellow-500' },
        { id: 'thumbnail_studio', label: 'Thumbnails', icon: ThumbnailIcon, color: 'bg-red-500' },
        { id: 'colour', label: 'Restoration', icon: PaletteIcon, color: 'bg-rose-500' },
        { id: 'soul', label: 'Magic Soul', icon: UsersIcon, color: 'bg-pink-500' },
    ];

    return (
        <div className="p-6 lg:p-8 pb-24 max-w-[1600px] mx-auto space-y-8">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1A1E]">
                        Welcome back, {user?.name.split(' ')[0] || 'Creator'}!
                    </h1>
                    <p className="text-gray-500 mt-1">Ready to create some magic today?</p>
                </div>
                <button 
                    onClick={() => navigateTo('dashboard', 'billing')} 
                    className="bg-white border border-gray-200 text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <span className="text-[#4D7CFF] font-black mr-1">{user?.credits || 0}</span> Credits Available
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Hero Banner (3/5) */}
                <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col h-[450px]">
                    {loadingCreations ? (
                         <div className="h-full flex items-center justify-center text-gray-400">Loading activity...</div>
                    ) : latestCreation ? (
                        <div 
                            className="relative h-full group cursor-zoom-in"
                            onClick={() => setZoomedImage(latestCreation.imageUrl)}
                        >
                            {/* Optimized Image Load: Use Medium URL if available (new creations), else Fallback to Original (old creations) */}
                            <img 
                                src={latestCreation.mediumUrl || latestCreation.imageUrl} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                alt="Latest creation" 
                                loading="lazy" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/10">Latest Creation</span>
                                <h3 className="text-white text-2xl font-bold mb-4">{latestCreation.feature}</h3>
                                <div className="flex gap-3 pointer-events-auto">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadImage(latestCreation.imageUrl, 'latest-creation.png');
                                        }}
                                        className="bg-white text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                                    >
                                        <DownloadIcon className="w-4 h-4" /> Download
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveView(getFeatureViewId(latestCreation.feature));
                                        }}
                                        className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#dfbc2b] transition-colors flex items-center gap-2"
                                    >
                                        <SparklesIcon className="w-4 h-4" /> Generate Another
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-gradient-to-br from-[#1A1A1E] to-[#2a2a2e] p-8 flex flex-col justify-center items-start text-white relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                             <h2 className="text-3xl font-bold mb-4 relative z-10">Start your creative journey</h2>
                             <p className="text-gray-400 mb-8 max-w-md relative z-10">You haven't generated anything yet. Try our Magic Photo Studio to transform your first image.</p>
                             <button 
                                onClick={() => setActiveView('studio')}
                                className="bg-[#F9D230] text-[#1A1A1E] px-6 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-colors relative z-10"
                             >
                                Create Now
                             </button>
                        </div>
                    )}
                </div>

                {/* Right: Sidebar Widgets (2/5) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Daily Mission Card */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden flex-1 flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                    <FlagIcon className="w-3 h-3" /> Daily Mission
                                </span>
                                {isMissionDone && (
                                    <span className="bg-green-500/20 text-green-300 text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                                        <CheckIcon className="w-3 h-3" /> Completed
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold mb-2">{dailyMission.title}</h3>
                            <p className="text-indigo-200 text-sm line-clamp-2">{dailyMission.description}</p>
                        </div>

                        <div className="relative z-10 mt-6 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Reward</p>
                                <p className="text-2xl font-bold">+{dailyMission.reward} Credits</p>
                            </div>
                            <button 
                                onClick={() => setActiveView('daily_mission')}
                                disabled={isMissionDone}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                                    isMissionDone 
                                    ? 'bg-white/10 text-white/50 cursor-default' 
                                    : 'bg-white text-indigo-600 hover:bg-indigo-50'
                                }`}
                            >
                                {isMissionDone ? 'Done' : 'Start'} <ArrowRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Referral Card */}
                    <div className="bg-[#F6F7FA] border border-gray-200 rounded-3xl p-6 flex-1 flex flex-col justify-center items-start relative overflow-hidden group cursor-pointer" onClick={openReferralModal}>
                        <div className="absolute right-4 top-4 p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
                            <GiftIcon className="w-6 h-6 text-purple-500" />
                        </div>
                        <h3 className="text-lg font-bold text-[#1A1A1E] mb-1">Refer & Earn</h3>
                        <p className="text-gray-500 text-sm mb-4 max-w-[80%]">Invite friends and get 10 free credits for every signup.</p>
                        <button className="text-purple-600 font-bold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                            Invite Now <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div>
                <h2 className="text-lg font-bold text-[#1A1A1E] mb-4">Quick Access</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {quickActions.map(action => (
                        <button 
                            key={action.id}
                            onClick={() => setActiveView(action.id as View)}
                            className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center gap-3 group h-32 justify-center"
                        >
                            <div className={`w-10 h-10 ${action.color} text-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <action.icon className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 group-hover:text-black">{action.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Image Modal */}
            {zoomedImage && (
                <ImageModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />
            )}
        </div>
    );
};