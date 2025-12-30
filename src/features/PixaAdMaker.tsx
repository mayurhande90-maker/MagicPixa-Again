import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, IndustryType } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid, TextAreaField } from '../components/FeatureLayout';
import { 
    MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, 
    CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, LockIcon, 
    PencilIcon, UploadIcon, PlusIcon, InformationCircleIcon, LightningIcon, 
    ApparelIcon, BrandKitIcon, UserIcon, SparklesIcon, ShieldCheckIcon 
} from '../components/icons';
import { 
    FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, 
    EducationAdIcon, ServicesAdIcon 
} from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, getArchetypesForIndustry } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';

// --- HELPERS ---
const MAP_KIT_TO_AD_INDUSTRY = (type?: IndustryType): any => {
    switch (type) {
        case 'physical': return 'ecommerce';
        case 'digital': return 'saas';
        case 'realty': return 'realty';
        case 'fashion': return 'fashion';
        case 'service': return 'services';
        case 'food': return 'food';
        case 'fmcg': return 'fmcg';
        case 'education': return 'education';
        default: return null;
    }
};

const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string; base: string }> = {
    'ecommerce': { label: 'E-Commerce', icon: EcommerceAdIcon, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200', base: 'blue' },
    'fmcg': { label: 'FMCG / CPG', icon: FMCGIcon, color: 'text-green-600', bg: 'bg-green-50/50', border: 'border-green-200', base: 'green' },
    'fashion': { label: 'Fashion', icon: ApparelIcon, color: 'text-pink-500', bg: 'bg-pink-50/50', border: 'border-pink-200', base: 'pink' },
    'realty': { label: 'Real Estate', icon: RealtyAdIcon, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-200', base: 'purple' },
    'food': { label: 'Food & Dining', icon: FoodIcon, color: 'text-orange-600', bg: 'bg-orange-50/50', border: 'border-orange-200', base: 'orange' },
    'saas': { label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-teal-200', base: 'teal' },
    'education': { label: 'Education', icon: EducationAdIcon, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200', base: 'amber' },
    'services': { label: 'Services', icon: ServicesAdIcon, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-200', base: 'indigo' },
};

// FIX: Added missing IndustryCard component to handle category selection view
const IndustryCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    styles: { card: string; orb: string; icon: string; };
}> = ({ title, desc, icon, onClick, styles }) => (
    <button onClick={onClick} className={`${AdMakerStyles.modeCard} ${styles.card}`}>
        <div className={`${AdMakerStyles.orb} ${styles.orb}`}></div>
        <div className={`${AdMakerStyles.iconGlass} ${styles.icon}`}>{icon}</div>
        <div className={AdMakerStyles.contentWrapper}>
            <h3 className={AdMakerStyles.title}>{title}</h3>
            <p className={AdMakerStyles.desc}>{desc}</p>
        </div>
        <div className={AdMakerStyles.actionBtn}>
            <ArrowRightIcon className={AdMakerStyles.actionIcon}/>
        </div>
    </button>
);

const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    optional?: boolean; 
    uploadText?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional, uploadText }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-center mb-1.5 px-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>{optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}</div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-all`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform relative z-10 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2 relative z-10">{uploadText || "Upload"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const ArchetypeCard: React.FC<{ 
    title: string; 
    desc: string; 
    selected: boolean; 
    onClick: () => void; 
    colorBase: string;
}> = ({ title, desc, selected, onClick, colorBase }) => {
    const activeBorder = `border-${colorBase}-500`;
    const activeBg = `bg-${colorBase}-50/50`;
    const activeText = `text-${colorBase}-700`;
    const activeRing = `ring-${colorBase}-100`;

    return (
        <button 
            onClick={onClick}
            className={`p-4 rounded-2xl border-2 transition-all duration-300 text-left relative group overflow-hidden ${
                selected 
                ? `${activeBg} ${activeBorder} shadow-lg ring-2 ${activeRing} scale-[1.02]` 
                : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md'
            }`}
        >
            <div className={`text-[11px] font-black uppercase tracking-wider mb-1 ${selected ? activeText : 'text-gray-900'}`}>{title}</div>
            <p className="text-[10px] text-gray-400 font-medium leading-relaxed group-hover:text-gray-600">{desc}</p>
            {selected && (
                <div className={`absolute top-2 right-2 p-1 rounded-full ${activeText.replace('text-', 'bg-')} text-white shadow-sm`}>
                    <CheckIcon className="w-2.5 h-2.5" />
                </div>
            )}
        </button>
    );
};

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [industry, setIndustry] = useState<'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services' | null>(null);
    const [mainImages, setMainImages] = useState<{ url: string; base64: Base64File }[]>([]);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // NEW STREAMLINED STATES
    const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
    const [creativeGoal, setCreativeGoal] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
    const [modelSource, setModelSource] = useState<'ai' | 'upload'>('ai');
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [aiGender, setAiGender] = useState('Female');

    // UI States
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const archetypes = useMemo(() => industry ? getArchetypesForIndustry(industry) : [], [industry]);

    // DIRECT LANDING LOGIC
    useEffect(() => {
        if (auth.activeBrandKit) {
            const mapped = MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry);
            if (mapped) setIndustry(mapped);
        }
    }, [auth.activeBrandKit?.id]);

    useEffect(() => {
        if (auth.activeBrandKit?.logos.primary) {
            urlToBase64(auth.activeBrandKit.logos.primary).then(base64 => {
                setLogoImage({ url: auth.activeBrandKit!.logos.primary!, base64 });
            }).catch(console.warn);
        }
    }, [auth.activeBrandKit?.id]);

    const isIndustryMismatch = useMemo(() => {
        if (!auth.activeBrandKit || !industry) return false;
        const mappedIndustry = MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry);
        if (!mappedIndustry) return false;
        return mappedIndustry !== industry;
    }, [auth.activeBrandKit?.id, industry]);

    const handleUploadMain = async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const data = { url: URL.createObjectURL(file), base64 };
            const next = [...mainImages];
            next[slot] = data;
            setMainImages(next);
        }
        e.target.value = '';
    };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = '';
    };

    const handleGenerate = async () => {
        if (mainImages.length === 0 || !industry || !auth.user || !selectedArchetype || !creativeGoal) return;
        if (isLowCredits) return;

        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);
        
        try {
            const archetype = archetypes.find(a => a.id === selectedArchetype);
            const inputs: AdMakerInputs = {
                industry,
                mainImages: mainImages.map(m => m.base64),
                logoImage: logoImage?.base64,
                referenceImage: referenceImage?.base64,
                blueprintId: archetype?.prompt,
                description: creativeGoal,
                aspectRatio,
                visualFocus: archetype?.focus as any || 'product',
                modelSource: archetype?.focus === 'lifestyle' ? modelSource : undefined,
                modelImage: (archetype?.focus === 'lifestyle' && modelSource === 'upload') ? modelImage?.base64 : undefined,
                modelParams: (archetype?.focus === 'lifestyle' && modelSource === 'ai') ? { gender: aiGender, ethnicity: 'Diverse', skinTone: 'Natural', bodyType: 'Average' } : undefined
            };

            const assetUrl = await generateAdCreative(inputs, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png');
            setResultImage(blobUrl);

            const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${assetUrl}`, `Pixa AdMaker (${industry})`);
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            const bonus = checkMilestone(updatedUser.lifetimeGenerations || 0);
            if (bonus !== false) setMilestoneBonus(bonus);

        } catch (e: any) {
            console.error(e);
            alert(`Generation failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // FIX: Added missing handleEditorSave to support image editing persistence
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, `Pixa AdMaker (${industry || 'Unknown'})`); 
            setLastCreationId(id); 
        }
    };

    const handleNewSession = () => {
        setMainImages([]);
        setResultImage(null);
        setCreativeGoal('');
        setSelectedArchetype(null);
        setReferenceImage(null);
    };

    const industryConfig = industry ? INDUSTRY_CONFIG[industry] : null;

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker"
                description="The ultimate one-click agency. Upload your product, choose a vibe, and let AI build your high-converting ad."
                icon={<MagicAdsIcon className="w-14 h-14" />}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={mainImages.length > 0 && !!selectedArchetype && !!creativeGoal && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultHeightClass={aspectRatio === '9:16' ? "h-[1000px]" : "h-[850px]"}
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MagicAdsIcon className="w-12 h-12 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Campaign Canvas</h3>
                                <p className="text-sm text-gray-300 mt-2">{industry ? 'Configure your creative on the right' : 'Select industry to begin'}</p>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    <div className="h-full flex flex-col p-1">
                        {!industry ? (
                            <div className={AdMakerStyles.modeGrid}>
                                {Object.entries(INDUSTRY_CONFIG).map(([id, conf]) => (
                                    <IndustryCard 
                                        key={id}
                                        title={conf.label} 
                                        desc={`Professional ${conf.label} Ads`} 
                                        icon={<conf.icon className={`w-8 h-8 ${AdMakerStyles[`icon${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof AdMakerStyles] || 'text-gray-600'}`}/>} 
                                        onClick={() => setIndustry(id as any)} 
                                        styles={{ 
                                            card: AdMakerStyles[`card${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof AdMakerStyles] as string || 'bg-gray-100', 
                                            orb: AdMakerStyles[`orb${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof AdMakerStyles] as string || 'bg-gray-200', 
                                            icon: AdMakerStyles[`icon${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof typeof AdMakerStyles] as string || 'text-gray-500' 
                                        }} 
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-8 animate-fadeIn">
                                {/* Industry Context Bar */}
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl bg-white shadow-sm ${industryConfig?.color}`}>
                                            {industryConfig && <industryConfig.icon className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Industry Context</p>
                                            <h3 className="text-sm font-black text-gray-900">{industryConfig?.label}</h3>
                                        </div>
                                    </div>
                                    <button onClick={() => setIndustry(null)} className="text-[10px] font-bold text-indigo-600 hover:underline">SWITCH</button>
                                </div>

                                {isIndustryMismatch && (
                                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2">
                                        <InformationCircleIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-orange-700 leading-relaxed">Active brand is {auth.activeBrandKit?.industry}-based. AI will intelligently adapt style.</p>
                                    </div>
                                )}

                                {/* Step 1: Product Assets */}
                                <div>
                                    <div className={AdMakerStyles.sectionHeader}>
                                        <span className={AdMakerStyles.stepBadge}>1</span>
                                        <label className={AdMakerStyles.sectionTitle}>What is the product?</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <CompactUpload 
                                            label="Main Product" 
                                            image={mainImages[0] || null} 
                                            onUpload={(e) => handleUploadMain(e, 0)} 
                                            onClear={() => setMainImages([])} 
                                            icon={<CloudUploadIcon className="w-5 h-5 text-indigo-500" />}
                                            heightClass="h-40"
                                        />
                                        <CompactUpload 
                                            label="Brand Logo" 
                                            image={logoImage} 
                                            // FIX: Replaced undefined handleUploadLogo with functional handleUpload(setLogoImage)
                                            onUpload={handleUpload(setLogoImage)} 
                                            onClear={() => setLogoImage(null)} 
                                            icon={<BrandKitIcon className="w-5 h-5 text-gray-400" />}
                                            optional={true}
                                            heightClass="h-40"
                                        />
                                    </div>
                                </div>

                                {/* Step 2: Campaign Archetype */}
                                <div>
                                    <div className={AdMakerStyles.sectionHeader}>
                                        <span className={AdMakerStyles.stepBadge}>2</span>
                                        <label className={AdMakerStyles.sectionTitle}>What is the vibe?</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {archetypes.map(a => (
                                            <ArchetypeCard 
                                                key={a.id} 
                                                title={a.label} 
                                                desc={a.desc} 
                                                selected={selectedArchetype === a.id} 
                                                onClick={() => setSelectedArchetype(a.id)}
                                                colorBase={industryConfig?.base || 'indigo'}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Step 3: Creative Goal */}
                                <div>
                                    <div className={AdMakerStyles.sectionHeader}>
                                        <span className={AdMakerStyles.stepBadge}>3</span>
                                        <label className={AdMakerStyles.sectionTitle}>What is the goal?</label>
                                    </div>
                                    <TextAreaField 
                                        placeholder="e.g. Summer flash sale 50% off on our Organic Coffee, only this weekend in NYC."
                                        value={creativeGoal}
                                        onChange={(e: any) => setCreativeGoal(e.target.value)}
                                        rows={3}
                                    />
                                    <p className="text-[10px] text-gray-400 italic mt-1 px-1">
                                        Pixa's Intelligence Engine will automatically extract products, offers, and locations.
                                    </p>
                                </div>

                                {/* Step 4: Format & Model Control (Adaptive) */}
                                <div>
                                    <div className={AdMakerStyles.sectionHeader}>
                                        <span className={AdMakerStyles.stepBadge}>4</span>
                                        <label className={AdMakerStyles.sectionTitle}>Final Polish</label>
                                    </div>
                                    <div className="flex gap-4 items-end mb-6">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block px-1">Aspect Ratio</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['1:1', '4:5', '9:16'].map(r => (
                                                    <button key={r} onClick={() => setAspectRatio(r as any)} className={`py-2 text-[10px] font-black rounded-xl border transition-all ${aspectRatio === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'}`}>{r}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Adaptive Model Section */}
                                    {archetypes.find(a => a.id === selectedArchetype)?.focus === 'lifestyle' && (
                                        <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 animate-fadeInUp">
                                            <div className="flex items-center gap-2 mb-4">
                                                <UserIcon className="w-4 h-4 text-indigo-600"/>
                                                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Target Model Control</h4>
                                            </div>
                                            <div className="flex bg-white p-1 rounded-2xl border border-indigo-100 mb-4">
                                                <button onClick={() => setModelSource('ai')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${modelSource === 'ai' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Pixa Model</button>
                                                <button onClick={() => setModelSource('upload')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${modelSource === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>Upload Own</button>
                                            </div>
                                            {modelSource === 'ai' ? (
                                                <SelectionGrid label="Model Profile" options={['Female', 'Male', 'Diverse Group']} value={aiGender} onChange={setAiGender} />
                                            ) : (
                                                <CompactUpload 
                                                    label="Your Model" 
                                                    image={modelImage} 
                                                    onUpload={async (e) => {
                                                        if (e.target.files?.[0]) {
                                                            const base64 = await fileToBase64(e.target.files[0]);
                                                            setModelImage({ url: URL.createObjectURL(e.target.files[0]), base64 });
                                                        }
                                                    }} 
                                                    onClear={() => setModelImage(null)} 
                                                    icon={<UserIcon className="w-6 h-6 text-indigo-400" />}
                                                    heightClass="h-32"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
            />
            {/* FIX: Implementation of missing handleEditorSave handler */}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={async () => {}} />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={async () => {}} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};