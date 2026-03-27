import React, { useState, useRef } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, UploadPlaceholder } from '../components/FeatureLayout';
import { 
    MagicAdsIcon, ArrowRightIcon, ArrowLeftIcon, CubeIcon, UsersIcon, XIcon
} from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';
import { fileToBase64, base64ToBlobUrl } from '../utils/imageUtils';

// --- CONSTANTS ---
const INDUSTRY_CONFIG: Record<string, { label: string; icon: any }> = {
    'ecommerce': { label: 'Ecommerce', icon: EcommerceAdIcon },
    'fmcg': { label: 'FMCG', icon: FMCGIcon },
    'fashion': { label: 'Fashion', icon: EcommerceAdIcon }, // Using Ecommerce icon as fallback if Fashion icon not in adMakerIcons
    'realty': { label: 'Real Estate', icon: RealtyAdIcon },
    'food': { label: 'Food and Dining', icon: FoodIcon },
    'saas': { label: 'SaaS/Tech', icon: SaaSRequestIcon },
    'education': { label: 'Education', icon: EducationAdIcon },
    'services': { label: 'Services', icon: ServicesAdIcon },
};

type AdMakerPhase = 'industry_select' | 'mode_select';

const IndustryCard: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    styles: { card: string; orb: string; icon: string; };
}> = ({ title, icon, onClick, styles }) => (
    <button onClick={onClick} className={`${AdMakerStyles.modeCard} ${styles.card}`}>
        <div className={`${AdMakerStyles.orb} ${styles.orb}`}></div>
        <div className={`${AdMakerStyles.iconGlass} ${styles.icon}`}>{icon}</div>
        <div className={AdMakerStyles.contentWrapper}>
            <h3 className={AdMakerStyles.title}> {title} </h3>
            <p className={AdMakerStyles.desc}> Optimized for {title} </p>
        </div>
        <div className={AdMakerStyles.actionBtn}>
            <ArrowRightIcon className={AdMakerStyles.actionIcon}/>
        </div>
    </button>
);

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [phase, setPhase] = useState<AdMakerPhase>('industry_select');
    const [industry, setIndustry] = useState<string | null>(null);
    const [mode, setMode] = useState<'product' | 'model' | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { base64, mimeType } = await fileToBase64(file);
                const blobUrl = await base64ToBlobUrl(base64, mimeType);
                setImage(blobUrl);
            } catch (err) {
                console.error("Upload failed:", err);
            }
        }
    };

    const handleIndustrySelect = (ind: string) => {
        setIndustry(ind);
        setPhase('mode_select');
    };

    const handleModeSelect = (m: 'product' | 'model') => {
        setMode(m);
        // Stop here as per user request: "Do this first then i will tell what to add inside."
        console.log("Selected Industry:", industry, "Selected Mode:", m);
    };

    return (
        <FeatureLayout
            title="Pixa AdMaker"
            description="Create high-converting ads for your business in seconds."
            icon={<MagicAdsIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>}
            rawIcon={true}
            creditCost={cost}
            hideGenerateButton={true}
            onGenerate={() => {}}
            isGenerating={false}
            canGenerate={false}
            resultImage={null}
            leftContent={
                <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                    {phase === 'mode_select' && !image ? (
                        <UploadPlaceholder 
                            label="Upload Product Image" 
                            onClick={() => fileInputRef.current?.click()} 
                            icon={<MagicAdsIcon className="w-12 h-12 text-gray-400 group-hover:text-indigo-600 transition-colors" />}
                        />
                    ) : image ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                             <img src={image} className="max-w-full max-h-full object-contain rounded-2xl" />
                             <button 
                                onClick={() => setImage(null)}
                                className="absolute top-4 right-4 bg-white/80 hover:bg-white text-red-500 p-2 rounded-full shadow-md backdrop-blur-sm transition-all"
                             >
                                <XIcon className="w-5 h-5" />
                             </button>
                        </div>
                    ) : (
                        <div className="text-center p-8">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6 mx-auto">
                                <MagicAdsIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Pixa AdMaker</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                Select your industry and ad mode to start creating professional advertisements.
                            </p>
                        </div>
                    )}
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        accept="image/*" 
                    />
                </div>
            }
            rightContent={
                <div className={`${AdMakerStyles.formContainer} ${phase === 'mode_select' && !image ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                    {phase === 'industry_select' && (
                        <div className="animate-fadeIn">
                            <div className="mb-6 px-4">
                                <h3 className="text-xl font-black text-gray-900">Select Industry</h3>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Choose your business category</p>
                            </div>
                            <div className={AdMakerStyles.modeGrid}>
                                {Object.entries(INDUSTRY_CONFIG).map(([key, conf]) => (
                                    <IndustryCard 
                                        key={key} 
                                        title={conf.label} 
                                        icon={<conf.icon className="w-8 h-8"/>} 
                                        onClick={() => handleIndustrySelect(key)}
                                        styles={{ 
                                            card: AdMakerStyles[`card${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.cardEcommerce, 
                                            orb: AdMakerStyles[`orb${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.orbEcommerce, 
                                            icon: AdMakerStyles[`icon${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof AdMakerStyles] as string || AdMakerStyles.iconEcommerce 
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {phase === 'mode_select' && (
                        <div className="animate-fadeIn">
                            <button onClick={() => setPhase('industry_select')} className={AdMakerStyles.backButton}>
                                <ArrowLeftIcon className="w-3.5 h-3.5" /> Back to Industries
                            </button>
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Select Ad Mode</h3>
                                <p className="text-sm text-gray-500">How should we feature your product?</p>
                            </div>
                            <div className={AdMakerStyles.engineGrid}>
                                <button 
                                    onClick={() => handleModeSelect('product')} 
                                    className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-48`}
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
                                    className={`${AdMakerStyles.engineCard} ${AdMakerStyles.engineCardInactive} !h-48`}
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
            }
        />
    );
};
