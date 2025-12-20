
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid } from '../components/FeatureLayout';
import { MagicAdsIcon, UploadTrayIcon, XIcon, ArrowRightIcon, BuildingIcon, CubeIcon, CloudUploadIcon, CreditCoinIcon, CheckIcon, PaletteIcon, LightbulbIcon, ApparelIcon, BrandKitIcon } from '../components/icons';
import { FoodIcon, SaaSRequestIcon, EcommerceAdIcon, FMCGIcon, RealtyAdIcon, EducationAdIcon, ServicesAdIcon } from '../components/icons/adMakerIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative, AdMakerInputs, STYLE_BLUEPRINTS } from '../services/adMakerService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { AdMakerStyles } from '../styles/features/PixaAdMaker.styles';

// --- COMPONENT: INDUSTRY CARD ---
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

// --- COMPONENT: VISUAL FOCUS CARD ---
const FocusCard: React.FC<{ title: string; desc: string; selected: boolean; onClick: () => void }> = ({ title, desc, selected, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex-1 p-3 rounded-xl border-2 transition-all duration-300 text-center relative overflow-hidden group ${
            selected 
            ? 'bg-indigo-50 border-indigo-500 shadow-md scale-[1.02]' 
            : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
        }`}
    >
        <div className="relative z-10">
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${selected ? 'text-indigo-700' : 'text-gray-600'}`}>{title}</p>
            <p className={`text-[9px] font-medium leading-tight ${selected ? 'text-indigo-500' : 'text-gray-400'}`}>{desc}</p>
        </div>
        {selected && <div className="absolute top-1 right-1 text-indigo-500"><CheckIcon className="w-3 h-3"/></div>}
    </button>
);

// --- COMPONENT: RATIO CARD ---
const RatioCard: React.FC<{ label: string; ratio: string; sub: string; selected: boolean; onClick: () => void }> = ({ label, ratio, sub, selected, onClick }) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all w-full ${
            selected 
            ? 'bg-blue-50 border-blue-500 shadow-sm' 
            : 'bg-white border-gray-100 hover:border-gray-200'
        }`}
    >
        <div className={`border-2 rounded flex items-center justify-center bg-gray-50 ${ratio === '9:16' ? 'w-4 h-7' : ratio === '4:5' ? 'w-5 h-6' : 'w-6 h-6'} ${selected ? 'border-blue-400 bg-blue-100' : 'border-gray-300'}`}></div>
        <div className="text-left">
            <p className={`text-[10px] font-bold uppercase tracking-wider ${selected ? 'text-blue-700' : 'text-gray-600'}`}>{label}</p>
            <p className="text-[9px] text-gray-400">{sub}</p>
        </div>
    </button>
);

// --- COMPONENT: COMPACT UPLOAD ---
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
                    
                    {/* Scanning Overlay Effect */}
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
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
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

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // 1. SELECTION STATE
    const [industry, setIndustry] = useState<'ecommerce' | 'realty' | 'food' | 'saas' | 'fmcg' | 'fashion' | 'education' | 'services' | null>(null);
    const [visualFocus, setVisualFocus] = useState<'product' | 'lifestyle' | 'conceptual'>('product');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16'>('1:1');

    // 2. COMMON ASSETS
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tone, setTone] = useState('Professional');
    const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
    
    // Scan State
    const [isRefScanning, setIsRefScanning] = useState(false);
    const [refAnalysisDone, setRefAnalysisDone] = useState(false);

    // 3. INDUSTRY SPECIFIC FIELDS
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

    // 4. UI STATE
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Cost Logic
    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    // AUTO-FILL FROM BRAND KIT
    useEffect(() => {
        if (auth.user?.brandKit) {
            const kit = auth.user.brandKit;
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(base64 => {
                    setLogoImage({ url: kit.logos.primary!, base64 });
                }).catch(console.warn);
            }
            if (kit.website) setCta(`Visit ${kit.website}`);
            if (kit.toneOfVoice) setTone(kit.toneOfVoice);
        } else {
            setLogoImage(null);
        }
    }, [auth.user?.brandKit]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = '';
    };

    // Special handler for Reference Upload
    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setReferenceImage({ url: URL.createObjectURL(file), base64 });
            setSelectedBlueprint(null); 
            
            setIsRefScanning(true);
            setRefAnalysisDone(false);
            
            setTimeout(() => {
                setIsRefScanning(false);
                setRefAnalysisDone(true);
            }, 2500);
        }
        e.target.value = '';
    };

    const handleClearRef = () => {
        setReferenceImage(null);
        setRefAnalysisDone(false);
    };

    const addFeature = () => {
        if (currentFeature.trim() && features.length < 4) {
            setFeatures([...features, currentFeature.trim()]);
            setCurrentFeature('');
        }
    };

    const handleGenerate = async () => {
        if (!mainImage || !industry || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        setLoadingText("Constructing intelligent layout...");

        try {
            const inputs: AdMakerInputs = {
                industry,
                visualFocus,
                aspectRatio,
                mainImage: mainImage.base64,
                logoImage: logoImage?.base64,
                tone,
                blueprintId: selectedBlueprint || undefined,
                productName, offer, description: desc,
                project, location, config, features,
                dishName, restaurant,
                headline, cta, subheadline
            };

            const assetUrl = await generateAdCreative(inputs);
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const finalImageUrl = `data:image/png;base64,${assetUrl}`; 
            const creationId = await saveCreation(auth.user.uid, finalImageUrl, `Pixa AdMaker (${industry})`); setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) { 
            console.error(e); 
            alert(`Generation failed: ${e.message}`); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleNewSession = () => {
        setIndustry(null);
        setMainImage(null);
        setResultImage(null);
        setReferenceImage(null);
        setSelectedBlueprint(null);
        setRefAnalysisDone(false);
        setVisualFocus('product');
        setAspectRatio('1:1');
        // Clear forms
        setProductName(''); setOffer(''); setDesc('');
        setProject(''); setLocation(''); setConfig(''); setFeatures([]);
        setDishName(''); setRestaurant('');
        setHeadline(''); setCta(''); setSubheadline('');
        setLastCreationId(null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Ad Creative", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Error: " + e.message); } finally { setIsRefunding(false); } };
    
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa AdMaker (Edited)'); 
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const u = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };
    const handleClaimBonus = async () => { if (auth.user && milestoneBonus) { const u = await claimMilestoneBonus(auth.user.uid, milestoneBonus); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };

    // Validation Logic
    const isValid = !!mainImage && !isLowCredits && (
        (industry === 'ecommerce' && !!productName) ||
        (industry === 'fmcg' && !!productName) ||
        (industry === 'fashion' && !!productName) ||
        (industry === 'realty' && !!project) ||
        (industry === 'food' && !!dishName) ||
        ((industry === 'saas' || industry === 'education' || industry === 'services') && !!headline)
    );
    
    // Result Height Class depends on ratio
    const getResultHeight = () => {
        if (aspectRatio === '9:16') return "h-[950px]";
        if (aspectRatio === '4:5') return "h-[850px]";
        return "h-[750px]";
    };

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker" 
                description="Intelligent ad creation. Supports Instagram Reels, Stories, and Feeds with safe-zone logic." 
                icon={<MagicAdsIcon className="w-14 h-14" />} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={isValid} 
                onGenerate={handleGenerate} 
                resultImage={resultImage} 
                creationId={lastCreationId}
                onResetResult={undefined}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null} 
                resultHeightClass={getResultHeight()}
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Smart Ad" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 bg-gray-50`}>
                                    <MagicAdsIcon className="w-12 h-12 text-gray-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3>
                                <p className="text-sm text-gray-300 mt-2">{industry ? 'Ready for inputs' : 'Select an industry to start'}</p>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {!industry ? (
                                <div className={AdMakerStyles.modeGrid}>
                                    <IndustryCard 
                                        title="E-commerce" desc="Product ads, Sales" 
                                        icon={<EcommerceAdIcon className={`w-8 h-8 ${AdMakerStyles.iconEcommerce}`}/>} 
                                        onClick={() => setIndustry('ecommerce')}
                                        styles={{ card: AdMakerStyles.cardEcommerce, orb: AdMakerStyles.orbEcommerce, icon: AdMakerStyles.iconEcommerce }}
                                    />
                                    <IndustryCard 
                                        title="FMCG / CPG" desc="Packaged Goods" 
                                        icon={<FMCGIcon className={`w-8 h-8 text-green-600`}/>} 
                                        onClick={() => setIndustry('fmcg')}
                                        styles={{ card: "bg-gradient-to-br from-[#E8F5E9] via-[#F1F8E9] to-[#DCEDC8]", orb: "bg-gradient-to-tr from-green-300 to-lime-200 -top-20 -right-20", icon: "text-green-600" }}
                                    />
                                    <IndustryCard 
                                        title="Fashion" desc="Lifestyle & Apparel" 
                                        icon={<ApparelIcon className={`w-8 h-8 text-pink-500`}/>} 
                                        onClick={() => setIndustry('fashion')}
                                        styles={{ card: "bg-gradient-to-br from-[#FCE4EC] via-[#F8BBD0] to-[#F48FB1]", orb: "bg-gradient-to-tr from-pink-300 to-rose-200 -top-20 -right-20", icon: "text-pink-500" }}
                                    />
                                    <IndustryCard 
                                        title="Real Estate" desc="Property flyers" 
                                        icon={<RealtyAdIcon className={`w-8 h-8 ${AdMakerStyles.iconRealty}`}/>} 
                                        onClick={() => setIndustry('realty')}
                                        styles={{ card: AdMakerStyles.cardRealty, orb: AdMakerStyles.orbRealty, icon: AdMakerStyles.iconRealty }}
                                    />
                                    <IndustryCard 
                                        title="Food & Dining" desc="Menus, Promos" 
                                        icon={<FoodIcon className={`w-8 h-8 ${AdMakerStyles.iconFood}`}/>} 
                                        onClick={() => setIndustry('food')}
                                        styles={{ card: AdMakerStyles.cardFood, orb: AdMakerStyles.orbFood, icon: AdMakerStyles.iconFood }}
                                    />
                                    <IndustryCard 
                                        title="SaaS / Tech" desc="B2B, Software" 
                                        icon={<SaaSRequestIcon className={`w-8 h-8 ${AdMakerStyles.iconSaaS}`}/>} 
                                        onClick={() => setIndustry('saas')}
                                        styles={{ card: AdMakerStyles.cardSaaS, orb: AdMakerStyles.orbSaaS, icon: AdMakerStyles.iconSaaS }}
                                    />
                                    <IndustryCard 
                                        title="Education" desc="Courses, Schools" 
                                        icon={<EducationAdIcon className={`w-8 h-8 text-amber-600`}/>} 
                                        onClick={() => setIndustry('education')}
                                        styles={{ card: "bg-gradient-to-br from-[#FFF3E0] via-[#FFE0B2] to-[#FFCC80]", orb: "bg-gradient-to-tr from-amber-300 to-orange-200 -top-20 -right-20", icon: "text-amber-600" }}
                                    />
                                    <IndustryCard 
                                        title="Services" desc="Consulting, Agency" 
                                        icon={<ServicesAdIcon className={`w-8 h-8 text-indigo-600`}/>} 
                                        onClick={() => setIndustry('services')}
                                        styles={{ card: "bg-gradient-to-br from-[#EDE7F6] via-[#D1C4E9] to-[#B39DDB]", orb: "bg-gradient-to-tr from-indigo-300 to-purple-200 -top-20 -right-20", icon: "text-indigo-600" }}
                                    />
                                </div>
                            ) : (
                                <div className={AdMakerStyles.formContainer}>
                                    {/* HEADER / BACK */}
                                    <button onClick={() => setIndustry(null)} className={AdMakerStyles.backButton}>
                                        ← Change Industry
                                    </button>
                                    
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600`}>
                                            {industry.toUpperCase()} Mode
                                        </span>
                                    </div>

                                    {/* 1. ASSETS */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>1</span><label className={AdMakerStyles.sectionTitle}>Visual Assets</label></div>
                                        <div className={AdMakerStyles.grid2}>
                                            <CompactUpload label="Main Image" uploadText="Upload Hero" image={mainImage} onUpload={handleUpload(setMainImage)} onClear={() => setMainImage(null)} icon={<CloudUploadIcon className="w-6 h-6 text-indigo-500"/>} />
                                            <CompactUpload label="Logo" uploadText="Upload Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<BuildingIcon className="w-5 h-5 text-gray-400"/>} optional={true} />
                                        </div>
                                    </div>

                                    {/* 2. STYLE INTELLIGENCE */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}>
                                            <span className={AdMakerStyles.stepBadge}>2</span>
                                            <label className={AdMakerStyles.sectionTitle}>Style Intelligence</label>
                                        </div>
                                        
                                        {/* Reference Upload */}
                                        <div className="mb-4">
                                            <CompactUpload 
                                                label="Upload Reference (Scanner)" 
                                                uploadText="Scan a Layout" 
                                                image={referenceImage} 
                                                onUpload={handleRefUpload} 
                                                onClear={handleClearRef} 
                                                icon={<CloudUploadIcon className="w-6 h-6 text-pink-500"/>} 
                                                heightClass="h-28"
                                                optional={true}
                                                isScanning={isRefScanning} // Pass scanning state
                                            />
                                            {refAnalysisDone && (
                                                <div className="mt-2 flex items-center gap-2 text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 animate-fadeIn">
                                                    <CheckIcon className="w-3 h-3" />
                                                    <span>Structure Analyzed! Layout will match this reference.</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Blueprints (Only show if NO reference uploaded) */}
                                        {!referenceImage && (
                                            <div className="animate-fadeIn">
                                                <div className="flex items-center gap-2 mb-2 px-1">
                                                    <LightbulbIcon className="w-3 h-3 text-yellow-500" />
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Or Choose a Blueprint</label>
                                                </div>
                                                <div className={AdMakerStyles.blueprintGrid}>
                                                    {STYLE_BLUEPRINTS.map(bp => (
                                                        <button 
                                                            key={bp.id}
                                                            onClick={() => setSelectedBlueprint(bp.id)}
                                                            className={`${AdMakerStyles.blueprintCard} ${selectedBlueprint === bp.id ? AdMakerStyles.blueprintCardSelected : AdMakerStyles.blueprintCardInactive}`}
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-gray-100 mb-1 flex items-center justify-center">
                                                                <PaletteIcon className={`w-4 h-4 ${selectedBlueprint === bp.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                                                            </div>
                                                            <span className={`${AdMakerStyles.blueprintLabel} ${selectedBlueprint === bp.id ? 'text-indigo-700' : 'text-gray-600'}`}>{bp.label}</span>
                                                            {selectedBlueprint === bp.id && (
                                                                <div className={AdMakerStyles.blueprintCheck}><CheckIcon className="w-3 h-3"/></div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. SMART DETAILS & STRATEGY */}
                                    <div>
                                        <div className={AdMakerStyles.sectionHeader}><span className={AdMakerStyles.stepBadge}>3</span><label className={AdMakerStyles.sectionTitle}>Smart Details</label></div>
                                        
                                        {/* AD FORMAT SELECTOR */}
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Format</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                <RatioCard label="Square" sub="Feed" ratio="1:1" selected={aspectRatio === '1:1'} onClick={() => setAspectRatio('1:1')} />
                                                <RatioCard label="Portrait" sub="4:5" ratio="4:5" selected={aspectRatio === '4:5'} onClick={() => setAspectRatio('4:5')} />
                                                <RatioCard label="Story" sub="Reels" ratio="9:16" selected={aspectRatio === '9:16'} onClick={() => setAspectRatio('9:16')} />
                                            </div>
                                        </div>

                                        {/* VISUAL FOCUS SELECTOR */}
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Visual Focus</label>
                                            <div className="flex gap-2">
                                                <FocusCard title="Product" desc="Studio Focus" selected={visualFocus === 'product'} onClick={() => setVisualFocus('product')} />
                                                <FocusCard title="Lifestyle" desc="In-Context" selected={visualFocus === 'lifestyle'} onClick={() => setVisualFocus('lifestyle')} />
                                                <FocusCard title="Concept" desc="Creative Art" selected={visualFocus === 'conceptual'} onClick={() => setVisualFocus('conceptual')} />
                                            </div>
                                        </div>

                                        {(industry === 'ecommerce' || industry === 'fmcg') && (
                                            <div className="space-y-4">
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                                    <InputField placeholder="Offer / Discount" value={offer} onChange={(e: any) => setOffer(e.target.value)} />
                                                </div>
                                                <InputField label="Short Description / Vibe" placeholder="e.g. Organic, Summer Sale, Minimalist" value={desc} onChange={(e: any) => setDesc(e.target.value)} />
                                            </div>
                                        )}

                                        {industry === 'fashion' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Brand / Product" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                                <InputField placeholder="Collection / Offer" value={offer} onChange={(e: any) => setOffer(e.target.value)} />
                                                <SelectionGrid label="Vibe" options={['Chic', 'Street', 'Luxury', 'Minimal', 'Vintage']} value={tone} onChange={setTone} />
                                            </div>
                                        )}

                                        {industry === 'realty' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Project Name" value={project} onChange={(e: any) => setProject(e.target.value)} />
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Location" value={location} onChange={(e: any) => setLocation(e.target.value)} />
                                                    <InputField placeholder="Config (e.g. 3BHK)" value={config} onChange={(e: any) => setConfig(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1">Selling Points</label>
                                                    <div className="flex gap-2 mb-2 flex-wrap">{features.map((f, i) => <span key={i} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs border border-indigo-100">{f}</span>)}</div>
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 px-3 py-2 bg-gray-50 border rounded-xl text-sm outline-none" placeholder="Add feature..." value={currentFeature} onChange={e => setCurrentFeature(e.target.value)} />
                                                        <button onClick={addFeature} className="bg-indigo-100 text-indigo-600 px-3 rounded-xl font-bold">+</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {industry === 'food' && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Dish Name" value={dishName} onChange={(e: any) => setDishName(e.target.value)} />
                                                <InputField placeholder="Restaurant Name" value={restaurant} onChange={(e: any) => setRestaurant(e.target.value)} />
                                                <SelectionGrid label="Taste Vibe" options={['Spicy', 'Fresh', 'Sweet', 'Comfort', 'Gourmet']} value={tone} onChange={setTone} />
                                            </div>
                                        )}

                                        {(industry === 'saas' || industry === 'education' || industry === 'services') && (
                                            <div className="space-y-4">
                                                <InputField placeholder="Main Headline" value={headline} onChange={(e: any) => setHeadline(e.target.value)} />
                                                <InputField placeholder="Sub-headline / Value Prop" value={subheadline} onChange={(e: any) => setSubheadline(e.target.value)} />
                                                <div className={AdMakerStyles.grid2}>
                                                    <InputField placeholder="Call to Action" value={cta} onChange={(e: any) => setCta(e.target.value)} />
                                                    <SelectionGrid label="Style" options={['Modern', 'Trustworthy', 'Creative', 'Clean']} value={tone} onChange={setTone} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="AdMaker" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
