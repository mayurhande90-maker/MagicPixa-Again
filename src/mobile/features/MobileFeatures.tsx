
import React from 'react';
import { View, AppConfig } from '../../types';
import { 
    PixaProductIcon, PixaHeadshotIcon, PixaEcommerceIcon, 
    MagicAdsIcon, ThumbnailIcon, PixaTogetherIcon, 
    PixaRestoreIcon, PixaCaptionIcon, PixaInteriorIcon, 
    PixaTryOnIcon, ArrowRightIcon 
} from '../../components/icons';

interface MobileFeaturesProps {
    setActiveTab: (tab: View) => void;
    appConfig: AppConfig | null;
}

const ALL_TOOLS = [
    { id: 'studio', label: 'Product Shots', icon: PixaProductIcon, color: 'bg-blue-50 text-blue-600', desc: 'Studio quality results' },
    { id: 'headshot', label: 'Headshot Pro', icon: PixaHeadshotIcon, color: 'bg-amber-50 text-amber-600', desc: 'Executive portraits' },
    { id: 'brand_stylist', label: 'AdMaker', icon: MagicAdsIcon, color: 'bg-purple-50 text-purple-600', desc: 'High-converting ads' },
    { id: 'thumbnail_studio', label: 'Thumbnail Pro', icon: ThumbnailIcon, color: 'bg-red-50 text-red-600', desc: 'Viral hooks' },
    { id: 'brand_kit', label: 'Ecommerce Kit', icon: PixaEcommerceIcon, color: 'bg-green-50 text-green-600', desc: 'Full product packs' },
    { id: 'soul', label: 'Together', icon: PixaTogetherIcon, color: 'bg-pink-50 text-pink-600', desc: 'Merge two people' },
    { id: 'colour', label: 'Photo Restore', icon: PixaRestoreIcon, color: 'bg-slate-50 text-slate-600', desc: 'Repair vintage photos' },
    { id: 'caption', label: 'Caption Pro', icon: PixaCaptionIcon, color: 'bg-indigo-50 text-indigo-600', desc: 'AI Copywriting' },
    { id: 'interior', label: 'Interior Design', icon: PixaInteriorIcon, color: 'bg-orange-50 text-orange-600', desc: 'Reimagine rooms' },
    { id: 'apparel', label: 'TryOn', icon: PixaTryOnIcon, color: 'bg-rose-50 text-rose-600', desc: 'Virtual dressing room' },
];

export const MobileFeatures: React.FC<MobileFeaturesProps> = ({ setActiveTab, appConfig }) => {
    return (
        <div className="p-6 pb-24 animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-tight">
                    Creative Suite
                </h1>
                <p className="text-gray-500 font-medium mt-1">Unlock the full power of Pixa AI</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {ALL_TOOLS.map((tool) => {
                    const isDisabled = appConfig?.featureToggles?.[tool.id] === false;
                    
                    return (
                        <button
                            key={tool.id}
                            disabled={isDisabled}
                            onClick={() => setActiveTab(tool.id as View)}
                            className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 text-left relative overflow-hidden group ${
                                isDisabled 
                                ? 'bg-gray-50 border-transparent opacity-60' 
                                : 'bg-white border-gray-100 shadow-sm active:scale-[0.98] active:bg-gray-50'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${tool.color}`}>
                                <tool.icon className="w-8 h-8" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="font-black text-gray-900 leading-none mb-1.5">{tool.label}</h3>
                                <p className="text-xs text-gray-500 font-medium truncate">{tool.desc}</p>
                            </div>

                            {isDisabled ? (
                                <span className="bg-gray-200 text-gray-500 text-[8px] font-black uppercase px-2 py-1 rounded-full">Soon</span>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-active:text-indigo-600 group-active:bg-indigo-50 transition-colors">
                                    <ArrowRightIcon className="w-4 h-4" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
