
import React, { useState, useEffect } from 'react';
import { AuthProps, View, Creation } from '../../types';
import { 
    SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, 
    PixaTogetherIcon, ArrowRightIcon, GiftIcon, 
    LightningIcon, ThumbnailIcon, UploadIcon,
    PixaProductIcon, CameraIcon, CheckIcon,
    InformationCircleIcon, ClockIcon
} from '../../components/icons';
import { getCreations } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';

interface MobileHomeProps {
    auth: AuthProps;
    setActiveTab: (tab: View) => void;
}

const MobileBeforeAfter: React.FC<{ before: string, after: string, label: string }> = ({ before, after, label }) => {
    return (
        <div className="shrink-0 w-64 aspect-[4/3] rounded-3xl bg-gray-100 overflow-hidden relative border border-gray-100 shadow-sm">
            <img src={before} className="absolute inset-0 w-full h-full object-cover" alt="Before" />
            <div className="absolute inset-0 w-full h-full animate-mobile-wipe overflow-hidden">
                <img src={after} className="w-full h-full object-cover" alt="After" />
            </div>
            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                <span className="text-[8px] font-black text-white uppercase tracking-widest">{label}</span>
            </div>
            <div className="absolute top-3 right-3">
                <SparklesIcon className="w-4 h-4 text-yellow-400 drop-shadow-md" />
            </div>
        </div>
    );
};

export const MobileHome: React.FC<MobileHomeProps> = ({ auth, setActiveTab }) => {
    const [recentCreations, setRecentCreations] = useState<Creation[]>([]);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const firstName = auth.user?.name ? auth.user.name.split(' ')[0] : 'Creator';
    const mission = getDailyMission();
    const isLocked = isMissionLocked(auth.user);

    useEffect(() => {
        if (auth.user) {
            getCreations(auth.user.uid).then(data => {
                setRecentCreations((data as Creation[]).slice(0, 3));
                setLoadingRecent(false);
            });
        }
    }, [auth.user]);

    const exampleShowcase = [
        { label: "Product Shot", before: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=500", after: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?q=80&w=500" },
        { label: "Executive Pro", before: "https://i.pravatar.cc/500?u=1", after: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=500" },
        { label: "Viral Hook", before: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=500", after: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=500" },
    ];

    return (
        <div className="pb-24 animate-fadeIn">
            <style>{`
                @keyframes mobile-wipe {
                    0%, 15% { clip-path: inset(0 100% 0 0); }
                    45%, 65% { clip-path: inset(0 0% 0 0); }
                    90%, 100% { clip-path: inset(0 100% 0 0); }
                }
                .animate-mobile-wipe {
                    animation: mobile-wipe 6s ease-in-out infinite;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* 1. MAGIC ACTION ZONE (Hero) */}
            <div className="p-6 pb-2">
                <div className="relative w-full h-56 rounded-[2.5rem] bg-[#1A1A1E] overflow-hidden shadow-2xl group active:scale-[0.98] transition-all">
                    {/* Abstract Motion Background */}
                    <div className="absolute inset-0 opacity-40">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] -mr-20 -mt-20 animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600 rounded-full blur-[60px] -ml-10 -mb-10"></div>
                    </div>
                    
                    <div className="relative z-10 h-full p-8 flex flex-col justify-between items-start text-left">
                        <div className="space-y-1">
                            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mb-2">
                                <SparklesIcon className="w-3 h-3 text-yellow-300" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Instant Production</span>
                            </div>
                            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
                                Transform <br/>
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Everything.</span>
                            </h2>
                        </div>

                        <button 
                            onClick={() => setActiveTab('studio')}
                            className="bg-white text-black px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-transform"
                        >
                            <CameraIcon className="w-4 h-4" />
                            Upload & Transform
                        </button>
                    </div>

                    {/* Decorative Scan Line */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-20 animate-[scan-h_3s_linear_infinite]"></div>
                </div>
            </div>

            {/* 2. HALL OF MAGIC (Showcase) */}
            <div className="mt-8">
                <div className="px-7 mb-4 flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">The Magic Wall</h3>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 rounded-full bg-indigo-600"></div>
                        <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                        <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-2">
                    {exampleShowcase.map((item, i) => (
                        <MobileBeforeAfter key={i} {...item} />
                    ))}
                </div>
            </div>

            {/* 3. RECENT ACTIVITY (Pick Up Where You Left Off) */}
            {!loadingRecent && recentCreations.length > 0 && (
                <div className="mt-10 px-6">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">Continue Creating</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {recentCreations.map((creation) => (
                            <div key={creation.id} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-100 shadow-sm active:scale-95 transition-all">
                                <img src={creation.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <ArrowRightIcon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. SMART SHORTCUTS (Dynamic Bento) */}
            <div className="mt-10 px-6">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Strategic Power</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setActiveTab('brand_stylist')}
                        className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100 flex flex-col justify-between items-start gap-4 text-left group active:bg-indigo-100"
                    >
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 group-active:scale-110 transition-transform">
                            <MagicAdsIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-indigo-900 leading-none">AdMaker</h4>
                            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mt-1">Convert More</p>
                        </div>
                    </button>

                    <button 
                        onClick={() => setActiveTab('headshot')}
                        className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100 flex flex-col justify-between items-start gap-4 text-left group active:bg-amber-100"
                    >
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-amber-600 group-active:scale-110 transition-transform">
                            <PixaHeadshotIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 leading-none">Headshot</h4>
                            <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wide mt-1">Executive Pro</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* 5. THE ENERGY HUB (Gamification) */}
            <div className="mt-8 px-6">
                <div className="bg-gray-900 rounded-[2.5rem] p-7 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-yellow-400">
                                <LightningIcon className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-widest">Energy Hub</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">{isLocked ? 'Refilling...' : 'Mission Active'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-2xl font-black text-white">{auth.user?.credits || 0}</span>
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Power Left</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{mission.title}</p>
                            <span className="text-[10px] font-bold text-green-400">+5 Credits</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full bg-indigo-500 transition-all duration-1000 ${isLocked ? 'w-full' : 'w-1/3'}`}></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400 font-medium max-w-[140px] leading-relaxed">
                            {isLocked ? 'Next mission unlock in 14h' : 'Complete today\'s challenge for a bonus boost.'}
                        </p>
                        <button className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform">
                            {isLocked ? 'History' : 'Start'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 6. REFERRAL / GROWTH */}
            <div className="mt-8 px-6 pb-6">
                <button className="w-full flex items-center justify-between p-5 bg-indigo-50 border border-indigo-100 rounded-3xl group active:bg-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600">
                            <GiftIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-black text-indigo-900">Refer & Earn</p>
                            <p className="text-[10px] font-medium text-indigo-400">Get 10 credits per friend</p>
                        </div>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-indigo-400 group-active:translate-x-1 transition-transform" />
                </button>
            </div>
            
            <style>{`
                @keyframes scan-h {
                    0% { left: 0%; }
                    100% { left: 100%; }
                }
            `}</style>
        </div>
    );
};
