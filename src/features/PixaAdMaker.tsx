import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit, IndustryType } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, ArrowLeftIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PaletteIcon, LightbulbIcon, ApparelIcon, BrandKitIcon, SparklesIcon, UserIcon, PlusCircleIcon, LockIcon, PencilIcon, UploadIcon, PlusIcon, InformationCircleIcon, LightningIcon } from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon, BlueprintStarIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, getBlueprintsForIndustry } from '../services/adMakerService';
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

const INDUSTRY_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
    'ecommerce': { label: 'E-Commerce', icon: EcommerceAdIcon, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-200' },
    'fmcg': { label: 'FMCG / CPG', icon: FMCGIcon, color: 'text-green-600', bg: 'bg-green-50/50', border: 'border-green-200' },
    'fashion': { label: 'Fashion', icon: ApparelIcon, color: 'text-pink-500', bg: 'bg-pink-50/50', border: 'border-pink-200' },
    'realty': { label: 'Real Estate', icon: RealtyAdIcon, color: 'text-purple-600', bg: 'bg-purple-50/50', border: 'border-purple-200' },
    'food': { label: 'Food & Dining', icon: FoodIcon, color: 'text-orange-600', bg: 'bg-orange-50/50', border: 'border-orange-200' },
    'saas': { label: 'SaaS / Tech', icon: SaaSRequestIcon, color: 'text-teal-600', bg: 'bg-teal-50/50', border: 'border-teal-200' },
    'education': { label: 'Education', icon: EducationAdIcon, color: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-200' },
    'services': { label: 'Services', icon: ServicesAdIcon, color: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-200' },
};

const OCCASIONS = ['New Launch', 'Flash Sale', 'Holiday Special', 'Brand Awareness', 'Seasonal Collection'];
const AUDIENCES = ['Gen-Z', 'Corporate Professionals', 'Luxury High-End', 'Families / Parents', 'Students', 'Tech Enthusiasts'];
const LAYOUT_TEMPLATES = ['Hero Focus', 'Split Design', 'Bottom Strip', 'Social Proof'];

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
    isScanning?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional, uploadText, isScanning }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-all`}>
                    {isScanning && (
                        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center">
                            <div className="w-full h-0.5 bg-blue-400 shadow-[0_0_10px_#60A5FA] absolute top-0 animate-[scan-vertical_1.5s_linear_infinite]"></div>
                            <div className="bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
                                <p className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
                                    AI Scanning
                                </p>
                            </div>
                        </div>
                    )}
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    {!isScanning && (
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                    )}
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform relative z-10 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2 relative z-10">{uploadText || "Upload"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
            <style>{`@keyframes scan-vertical { 0% { top: 0%; } 100% { top: 100%; } }`}</style>
        </div>
    );
};

// Added RatioCard component for aspect ratio selection
const RatioCard: React.FC<{ 
    label: string; 
    sub: string; 
    ratio: '1:1' | '4:5' | '9:16'; 
    selected: boolean; 
    onClick: () => void; 
}> = ({ label, sub, ratio, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 ${
            selected 
            ? 'bg-indigo-50 border-indigo-600 shadow-md ring-2 ring-indigo-500/20' 
            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
        }`}
    >
        <div className={`mb-2 w-6 border-2 rounded-sm ${
            ratio === '1:1' ? 'aspect-square' : ratio === '4:5' ? 'aspect-[4/5]' : 'aspect-[9/16]'
        } ${selected ? 'border-indigo-600 bg-indigo-200' : 'border-gray-300 bg-gray-50'}`}></div>
        <span className={`text-[9px] font-bold uppercase tracking-wide ${selected ? 'text-indigo-900' : 'text-gray-500'}`}>
            {label}
        </span>
        <span className="text-[8px] opacity-60 font-medium">{sub}</span>
        {selected && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></div>}
    </button>
);

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [industry, setIndustry] = useState<'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services' | null>(null);
    const [visualFocus, setVisualFocus] = useState<'product' | 'lifestyle' | 'conceptual'>('product');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tone, setTone] = useState('');
    const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
    const [occasion, setOccasion] = useState('');
    const [audience, setAudience] = useState('');
    const [layoutTemplate, setLayoutTemplate] = useState('');
    const [isRefScanning, setIsRefScanning] = useState(false);
    const [refAnalysisDone, setRefAnalysisDone] = useState(false);
    const [productName, setProductName] = useState('');
    const [offer, setOffer] = useState('');
    const [desc, setDesc] = useState('');
    const [project, setProject] = useState('');
    const [location, setLocation] = useState('');
    const [config, setConfig] = useState('');
    const [features, setFeatures] = useState<string[]>([]);
    const [currentFeature, setCurrentFeature] = useState('');
    const [dishName, setDishName] = useState('');
    const [restaurant, setRestaurant] = useState('');
    const [headline, setHeadline] = useState('');
    const [subheadline, setSubheadline] = useState('');
    const [cta, setCta] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => { if (auth.activeBrandKit) { const mapped = MAP_KIT_TO_AD_INDUSTRY(auth.activeBrandKit.industry); if (mapped) setIndustry(mapped); } }, [auth.activeBrandKit?.id]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setReferenceImage({ url: URL.createObjectURL(file), base64 });
            setSelectedBlueprint(null); 
            setIsRefScanning(true);
            setRefAnalysisDone(false);
            setTimeout(() => { setIsRefScanning(false); setRefAnalysisDone(true); }, 2500);
        }
        e.target.value = '';
    };

    const handleClearRef = () => { setReferenceImage(null); setRefAnalysisDone(false); };

    const handleGenerate = async () => {
        if (!mainImage || !industry || !auth.user) return;
        if (isLowCredits) return;
        setLoading(true); setResultImage(null); setLastCreationId(null);
        setLoadingText("Inheriting structure from reference...");
        try {
            const inputs: AdMakerInputs = { 
                industry, visualFocus, aspectRatio, mainImage: mainImage.base64, logoImage: logoImage?.base64, 
                tone: referenceImage ? '' : (selectedBlueprint ? '' : tone), 
                blueprintId: selectedBlueprint || undefined,
                productName, offer, description: desc, project, location, config, features, dishName, restaurant, headline, cta, subheadline, 
                // Strategies only if no reference
                occasion: referenceImage ? undefined : occasion, 
                audience: referenceImage ? undefined : audience, 
                layoutTemplate: referenceImage ? undefined : layoutTemplate 
            };
            const assetUrl = await generateAdCreative(inputs, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${assetUrl}`, `Pixa AdMaker (${industry})`); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { setIndustry(null); setMainImage(null); setReferenceImage(null); setResultImage(null); setLastCreationId(null); setOccasion(''); setAudience(''); setLayoutTemplate(''); setSelectedBlueprint(null); };

    const isValid = !!mainImage && !isLowCredits && (
        (industry === 'ecommerce' && !!productName) || (industry === 'fmcg' && !!productName) || (industry === 'fashion' && !!productName) || (industry === 'realty' && !!project) || (industry === 'food' && !!dishName) || ((industry === 'saas' || industry === 'education' || industry === 'services') && !!headline)
    );

    const activeConfig = industry ? INDUSTRY_CONFIG[industry] : null;
    const currentBlueprints = industry ? getBlueprintsForIndustry(industry) : [];

    return (
        <>
            <FeatureLayout title="Pixa AdMaker" description="AI Creative Director. Supports 1:1 Feed and 9:16 Story/Reel formats." icon={<MagicAdsIcon className="w-14 h-14" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={isValid} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId} onNewSession={handleNewSession} onEdit={() => setShowMagicEditor(true)} resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg", hideIcon: true, label: "Generate Ad" }} scrollRef={scrollRef}
                leftContent={<div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden shadow-sm">{loading ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>) : (<div className="text-center opacity-50 select-none"><div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-50"><MagicAdsIcon className="w-12 h-12 text-gray-400" /></div><h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3><p className="text-sm text-gray-300 mt-2">{industry ? 'Ready for inputs' : 'Select an industry to start'}</p></div>)}</div>}
                rightContent={
                    <div className="h-full flex flex-col">{!industry ? (
                        <div className={AdMakerStyles.modeGrid}>
                            {Object.entries(INDUSTRY_CONFIG).map(([k, conf]) => (
                                <IndustryCard key={k} title={conf.label} desc="Create professional ads" icon={<conf.icon className="w-8 h-8"/>} onClick={() => setIndustry(k as any)} styles={{ card: `border-${conf.color.split('-')[1]}-100`, orb: `bg-${conf.color.split('-')[1]}-100`, icon: conf.color }} />
                            ))}
                        </div>
                    ) : (
                        <div className={AdMakerStyles.formContainer}>
                            {/* SECTION 1: ASSETS */}
                            <div className="bg-white/40 p-5 rounded-3xl border border-gray-100">
                                <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>1</span><label className={AdMakerStyles.sectionTitle}>Source Assets</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Product Photo" image={mainImage} onUpload={handleUpload(setProductImage)} onClear={() => setMainImage(null)} icon={<CloudUploadIcon className="w-6 h-6 text-indigo-500"/>} />
                                    <CompactUpload label="Brand Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<CloudUploadIcon className="w-6 h-6 text-indigo-500"/>} optional={true} />
                                </div>
                            </div>

                            {/* SECTION 2: THE INTELLIGENT FORK */}
                            <div className="bg-white/40 p-5 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                                <div className={AdMakerStyles.sectionHeader}>
                                    <span className={AdMakerStyles.stepBadge}>2</span>
                                    <label className={AdMakerStyles.sectionTitle}>Creative Direction</label>
                                </div>
                                
                                {/* STYLE REFERENCE: THE GATEKEEPER */}
                                <div className="mb-6">
                                    <CompactUpload label="Style Reference (Master Priority)" uploadText="Upload Reference Design" image={referenceImage} onUpload={handleRefUpload} onClear={handleClearRef} icon={<CloudUploadIcon className="w-6 h-6 text-pink-500"/>} heightClass="h-32" optional={true} isScanning={isRefScanning} />
                                    {refAnalysisDone && (<div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 animate-fadeIn"><CheckIcon className="w-3 h-3" /><span>Visual DNA Locked! Hiding manual controls to prevent conflicts.</span></div>)}
                                </div>

                                {/* MANUAL CONTROLS: Hidded if reference image exists */}
                                {!referenceImage ? (
                                    <div className="space-y-6 animate-fadeIn">
                                        <div className="flex items-center gap-2 py-2">
                                            <div className="h-px bg-gray-100 flex-1"></div>
                                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Manual Strategy</span>
                                            <div className="h-px bg-gray-100 flex-1"></div>
                                        </div>
                                        <SelectionGrid label="Campaign Occasion" options={OCCASIONS} value={occasion} onChange={setOccasion} />
                                        <SelectionGrid label="Target Audience" options={AUDIENCES} value={audience} onChange={setAudience} />
                                        <SelectionGrid label="Layout Template" options={LAYOUT_TEMPLATES} value={layoutTemplate} onChange={setLayoutTemplate} />
                                        <div className="pt-4 border-t border-gray-100">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">Visual Blueprint</label>
                                            <div className={AdMakerStyles.blueprintGrid}>{currentBlueprints.map(bp => (<button key={bp.id} onClick={() => setSelectedBlueprint(bp.id)} className={`${AdMakerStyles.blueprintCard} ${selectedBlueprint === bp.id ? AdMakerStyles.blueprintCardSelected : AdMakerStyles.blueprintCardInactive}`}><BlueprintStarIcon className="w-5 h-5" /><span className="text-[9px] font-bold uppercase">{bp.label}</span></button>))}</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3 animate-fadeIn">
                                        <div className="p-2 bg-white rounded-full text-indigo-600 shadow-sm"><LightningIcon className="w-5 h-5 animate-pulse"/></div>
                                        <div>
                                            <p className="text-xs font-black text-indigo-900 uppercase">Visual Inheritance Active</p>
                                            <p className="text-[10px] text-indigo-700 font-medium">Pixa is deriving strategy and composition from your upload.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 3: FORMAT & COPY */}
                            <div className="bg-white/40 p-5 rounded-3xl border border-gray-100 space-y-6">
                                <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>3</span><label className={AdMakerStyles.sectionTitle}>Campaign Details</label></div>
                                <div className="grid grid-cols-3 gap-2"><RatioCard label="Square" sub="1:1" ratio="1:1" selected={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} /><RatioCard label="Portrait" sub="4:5" ratio="4:5" selected={aspectRatio === '4:5'} onClick={() => setAspectRatio('4:5')} /><RatioCard label="Story" sub="9:16" ratio="9:16" selected={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} /></div>
                                
                                {industry === 'ecommerce' || industry === 'fmcg' || industry === 'fashion' ? (<div className="grid grid-cols-2 gap-3"><InputField placeholder="Product Name" value={productName} onChange={(e:any) => setProductName(e.target.value)} /><InputField placeholder="Offer (e.g. 50% OFF)" value={offer} onChange={(e:any) => setOffer(e.target.value)} /><div className="col-span-2"><InputField label="Highlights" placeholder="e.g. Handmade, Vegan, Eco-friendly" value={desc} onChange={(e:any) => setDesc(e.target.value)} /></div></div>) : industry === 'realty' ? (<div className="grid grid-cols-2 gap-3"><InputField placeholder="Project Name" value={project} onChange={(e:any) => setProject(e.target.value)} /><InputField placeholder="Location" value={location} onChange={(e:any) => setLocation(e.target.value)} /><InputField placeholder="Config (e.g. 3BHK)" value={config} onChange={(e:any) => setConfig(e.target.value)} /></div>) : (<div className="space-y-3"><InputField placeholder="Main Headline" value={headline} onChange={(e:any) => setHeadline(e.target.value)} /><InputField placeholder="CTA (e.g. Shop Now)" value={cta} onChange={(e:any) => setCta(e.target.value)} /></div>)}
                            </div>
                        </div>
                    )}</div>
                }
            />
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={(url) => setResultImage(url)} deductCredit={async () => {}} />}
        </>
    );
};