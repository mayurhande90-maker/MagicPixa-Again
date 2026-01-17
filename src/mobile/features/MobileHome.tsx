
import React from 'react';
import { AuthProps, View } from '../../types';
import { SparklesIcon, MagicAdsIcon, PixaHeadshotIcon, PixaTogetherIcon, ArrowRightIcon, GiftIcon, LightningIcon, ThumbnailIcon } from '../../components/icons';

interface MobileHomeProps {
    auth: AuthProps;
    setActiveTab: (tab: View) => void;
}

export const MobileHome: React.FC<MobileHomeProps> = ({ auth, setActiveTab }) => {
    const firstName = auth.user?.name ? auth.user.name.split(' ')[0] : 'Creator';

    return (
        <div className="p-6 animate-fadeIn">
            {/* Welcome Banner */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                    Hey, {firstName}! 👋
                </h1>
                <p className="text-gray-500 font-medium mt-1">What are we creating today?</p>
            </div>

            {/* Quick Stats / Referal */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white mb-8 shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/20 w-fit rounded-full border border-white/20">
                        <GiftIcon className="w-3 h-3 text-yellow-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Rewards Program</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Refer & Earn 10 Credits</h2>
                        <p className="text-indigo-100 text-xs mt-1 font-medium leading-relaxed opacity-80">
                            Invite a friend and both get free generation power.
                        </p>
                    </div>
                    <button className="bg-white text-indigo-700 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest w-fit shadow-lg active:scale-95 transition-transform">
                        Share Code
                    </button>
                </div>
            </div>

            {/* Bento Grid Features */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Featured Tools</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Main Tool: Studio */}
                    <button 
                        onClick={() => setActiveTab('studio')}
                        className="col-span-2 relative h-40 rounded-[2rem] bg-gradient-to-br from-[#E3F2FD] to-[#F1F8FF] border border-white p-6 flex flex-col justify-between items-start text-left group overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-400/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                        <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-blue-600">
                            <SparklesIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-gray-900 tracking-tight">Product Studio</h4>
                            <p className="text-xs text-blue-700 font-bold uppercase tracking-widest mt-0.5">Studio Quality • One Click</p>
                        </div>
                        <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg transform group-active:scale-90 transition-transform">
                            <ArrowRightIcon className="w-4 h-4" />
                        </div>
                    </button>

                    {/* Secondary: AdMaker */}
                    <button 
                        onClick={() => setActiveTab('brand_stylist')}
                        className="aspect-square relative rounded-[2rem] bg-[#F3E5F5] border border-white p-5 flex flex-col justify-between items-start text-left overflow-hidden group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-purple-600">
                            <MagicAdsIcon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight leading-tight">AdMaker Pro</h4>
                    </button>

                    {/* Secondary: Headshot */}
                    <button 
                        onClick={() => setActiveTab('headshot')}
                        className="aspect-square relative rounded-[2rem] bg-[#FFF8E1] border border-white p-5 flex flex-col justify-between items-start text-left overflow-hidden group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-amber-600">
                            <PixaHeadshotIcon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight leading-tight">Headshot Pro</h4>
                    </button>
                    
                    {/* Secondary: Together */}
                    <button 
                        onClick={() => setActiveTab('soul')}
                        className="aspect-square relative rounded-[2rem] bg-[#FCE4EC] border border-white p-5 flex flex-col justify-between items-start text-left overflow-hidden group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/80 backdrop-blur-md shadow-sm flex items-center justify-center text-pink-600">
                            <PixaTogetherIcon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight leading-tight">Pixa Together</h4>
                    </button>

                    {/* Secondary: Thumbnail */}
                    <button 
                        onClick={() => setActiveTab('thumbnail_studio')}
                        className="aspect-square relative rounded-[2rem] bg-indigo-900 border border-white p-5 flex flex-col justify-between items-start text-left overflow-hidden group"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md shadow-sm flex items-center justify-center text-white">
                            <ThumbnailIcon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-black text-white tracking-tight leading-tight">Thumbnail Pro</h4>
                    </button>
                </div>
            </div>

            {/* Daily Bonus Section */}
            <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-500">
                        <LightningIcon className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h5 className="font-bold text-gray-900 text-sm">Daily Check-in</h5>
                        <p className="text-[10px] text-gray-500 font-medium">Claim your daily free credit</p>
                    </div>
                </div>
                <button className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform">
                    Claim
                </button>
            </div>
        </div>
    );
};
