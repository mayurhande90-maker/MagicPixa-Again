
import React, { useState } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    MagicAdsIcon, ArrowRightIcon, ArrowLeftIcon, CubeIcon, UsersIcon
} from '../../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../../components/icons/adMakerIcons';
import { AdMakerStyles } from '../../styles/features/PixaAdMaker.styles';

const INDUSTRIES = [
    { id: 'ecommerce', label: 'Ecommerce', icon: EcommerceAdIcon },
    { id: 'fmcg', label: 'FMCG', icon: FMCGIcon },
    { id: 'fashion', label: 'Fashion', icon: EcommerceAdIcon },
    { id: 'realty', label: 'Real Estate', icon: RealtyAdIcon },
    { id: 'food', label: 'Food and Dining', icon: FoodIcon },
    { id: 'saas', label: 'SaaS/Tech', icon: SaaSRequestIcon },
    { id: 'education', label: 'Education', icon: EducationAdIcon },
    { id: 'services', label: 'Services', icon: ServicesAdIcon },
];

type AdMakerPhase = 'industry_select' | 'mode_select';

export const MobileAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void }> = ({ auth, appConfig }) => {
    const [phase, setPhase] = useState<AdMakerPhase>('industry_select');
    const [industry, setIndustry] = useState<string | null>(null);
    const [mode, setMode] = useState<'product' | 'model' | null>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;

    const handleIndustrySelect = (id: string) => {
        setIndustry(id);
        setPhase('mode_select');
    };

    const handleModeSelect = (m: 'product' | 'model') => {
        setMode(m);
        console.log("Selected Industry:", industry, "Selected Mode:", m);
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MagicAdsIcon className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-black uppercase tracking-tight">Pixa AdMaker</span>
                </div>
                <div className="bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    <span className="text-[10px] font-black text-indigo-600 uppercase">{cost} Credits</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {phase === 'industry_select' && (
                    <div className="animate-fadeIn">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900">Select Industry</h3>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Choose your business category</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {INDUSTRIES.map((ind) => (
                                <button 
                                    key={ind.id} 
                                    onClick={() => handleIndustrySelect(ind.id)}
                                    className={`${AdMakerStyles.modeCard} ${AdMakerStyles[`card${ind.id.charAt(0).toUpperCase() + ind.id.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.cardEcommerce} !h-32`}
                                >
                                    <div className={`${AdMakerStyles.orb} ${AdMakerStyles[`orb${ind.id.charAt(0).toUpperCase() + ind.id.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.orbEcommerce}`}></div>
                                    <div className={`${AdMakerStyles.iconGlass} ${AdMakerStyles[`icon${ind.id.charAt(0).toUpperCase() + ind.id.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.iconEcommerce}`}>
                                        <ind.icon className="w-6 h-6" />
                                    </div>
                                    <div className={AdMakerStyles.contentWrapper}>
                                        <h3 className="text-[12px] font-black text-gray-900 leading-none mb-1">{ind.label}</h3>
                                        <p className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">Optimized</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {phase === 'mode_select' && (
                    <div className="animate-fadeIn">
                        <button onClick={() => setPhase('industry_select')} className={AdMakerStyles.backButton}>
                            <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                        </button>
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Select Ad Mode</h3>
                            <p className="text-sm text-gray-500">How should we feature your product?</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <button 
                                onClick={() => handleModeSelect('product')} 
                                className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-40`}
                            >
                                <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbProduct}`}></div>
                                <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconProduct}`}>
                                    <CubeIcon className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 mt-4">Product Ad</h4>
                                <p className="text-xs text-gray-500 font-medium">Clean studio setup</p>
                            </button>
                            <button 
                                onClick={() => handleModeSelect('model')} 
                                className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-40`}
                            >
                                <div className={`${AdMakerStyles.engineOrb} ${AdMakerStyles.engineOrbModel}`}></div>
                                <div className={`${AdMakerStyles.engineIconBox} ${AdMakerStyles.engineIconModel}`}>
                                    <UsersIcon className="w-8 h-8" />
                                </div>
                                <h4 className="text-lg font-black text-gray-900 mt-4">Model Ad</h4>
                                <p className="text-xs text-gray-500 font-medium">Human lifestyle context</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileAdMaker;

