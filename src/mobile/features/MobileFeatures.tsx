
import React from 'react';
import { View, AppConfig } from '../../types';
import { 
    PixaProductIcon, PixaHeadshotIcon, PixaEcommerceIcon, 
    MagicAdsIcon, ThumbnailIcon, PixaTogetherIcon, 
    PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, 
    PixaTryOnIcon, ArrowRightIcon, DashboardIcon 
} from '../../components/icons';

interface MobileFeaturesProps {
    setActiveTab: (tab: View) => void;
    appConfig: AppConfig | null;
}

const ALL_TOOLS = [
    { id: 'studio', label: 'Product Shots', icon: PixaProductIcon, color: 'bg-blue-50 text-blue-600', desc: 'Studio Quality' },
    { id: 'headshot', label: 'Headshot Pro', icon: PixaHeadshotIcon, color: 'bg-amber-50 text-amber-600', desc: 'Executive' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-purple-50 text-purple-600', desc: 'Ads & Social' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-red-50 text-red-600', desc: 'Viral Hooks' },
    { id: 'brand_kit', label: 'Ecommerce Kit', icon: PixaEcommerceIcon, color: 'bg-green-50 text-green-600', desc: 'Listing Packs' },
    { id: 'soul', label: 'Together', icon: PixaTogetherIcon, color: 'bg-pink-50 text-pink-600', desc: 'Merge Faces' },
    { id: 'colour', label: 'Photo Restore', icon: PixaRestoreIcon, color: 'bg-slate-50 text-slate-600', desc: 'Vintage Fix' },
    { id: 'caption', label: 'Caption Pro', icon: PixaCaptionIcon, color: 'bg-indigo-50 text-indigo-600', desc: 'AI Copy' },
    { id: 'interior', label: 'Interior Design', icon: PixaInteriorIcon, color: 'bg-orange-50 text-orange-600', desc: 'Reimagine' },
    { id: 'apparel', label: 'TryOn', icon: PixaTryOnIcon, color: 'bg-rose-50 text-rose-600', desc: 'Virtual Wear' },
];

export const MobileFeatures: React.FC<MobileFeaturesProps> = ({ setActiveTab, appConfig }) => {
    return (
        <div className="px-4 pt-6 pb-24 animate-fadeIn">
            <div className="mb-8 px-2">
                <div className="flex items-center gap-3 mb-1">
                    <DashboardIcon className="w-8 h-8" />
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                        Creative Suite
                    </h1>
                </div>
                <p className="text-gray-500 font-medium ml-11">Select a tool to start creating</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {ALL_TOOLS.map((tool) => {
                    const isDisabled = appConfig?.featureToggles?.[tool.id] === false;
                    
                    return (
                        <button
                            key={tool.id}
                            disabled={isDisabled}
                            onClick={() => setActiveTab(tool.id as View)}
                            className={`flex flex-col items-center justify-center gap-3 p-4 aspect-square rounded-2xl border transition-all duration-300 text-center relative overflow-hidden group ${
                                isDisabled 
                                ? 'bg-gray-50 border-transparent opacity-60' 
                                : 'bg-white border-gray-100 shadow-sm active:scale-95 active:shadow-inner'
                            }`}
                        >
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-active:scale-110 shadow-sm ${tool.color}`}>
                                <tool.icon className="w-11 h-11" />
                            </div>
                            
                            <div className="w-full px-1">
                                <h3 className="text-base font-black text-gray-900 leading-tight mb-0.5">{tool.label}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider leading-none">{tool.desc}</p>
                            </div>

                            {isDisabled && (
                                <div className="absolute top-3 right-3">
                                    <span className="bg-gray-200 text-gray-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">Soon</span>
                                </div>
                            )}

                            {!isDisabled && (
                                <div className="absolute bottom-3 right-3 opacity-0 group-active:opacity-100 transition-opacity">
                                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                        <ArrowRightIcon className="w-3 h-3" />
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
