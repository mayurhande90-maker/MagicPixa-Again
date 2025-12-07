
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid, TextAreaField } from '../components/FeatureLayout';
import { BuildingIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, UserIcon, LightbulbIcon, MagicWandIcon, CheckIcon, PlusCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, BrandKitIcon } from '../components/icons';
import { fileToBase64, Base64File, urlToBase64, base64ToBlobUrl } from '../utils/imageUtils';
import { generateRealtyAd, analyzeRealtyReference, ReferenceAnalysis } from '../services/realtyService';
import { deductCredits, saveCreation } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

// Specialized Card for Step Selection
const StepCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
}> = ({ title, description, icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left w-full hover:shadow-md ${
            selected 
            ? 'border-blue-500 bg-blue-50 shadow-sm' 
            : 'border-gray-100 bg-white hover:border-blue-200'
        }`}
    >
        <div className={`p-2 rounded-full mb-3 ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            {icon}
        </div>
        <h3 className={`font-bold text-sm ${selected ? 'text-blue-800' : 'text-gray-800'}`}>{title}</h3>
        <p className={`text-xs mt-1 ${selected ? 'text-blue-600' : 'text-gray-500'}`}>{description}</p>
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
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group h-full">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-3 h-3"/>
                    </button>
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

// Label Helper Component with Badge
const LabelWithBadge: React.FC<{ label: string; detected?: boolean }> = ({ label, detected }) => (
    <div className="flex justify-between items-center w-full">
        <span>{label}</span>
        {detected && (
            <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-sm border border-blue-200">
                <SparklesIcon className="w-2.5 h-2.5"/> Found in Ref
            </span>
        )}
    </div>
);

export const MagicRealty: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Strategy Choices
    const [brandStrategy, setBrandStrategy] = useState<'brand_kit' | 'custom'>('custom');
    const [designMode, setDesignMode] = useState<'reference' | 'auto'>('reference');

    // Assets
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [propertyImage, setPropertyImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);

    // Brand Kit Loading State
    const [isLoadingBrandKit, setIsLoadingBrandKit] = useState(false);

    // Decisions
    const [modelChoice, setModelChoice] = useState<'upload' | 'generate' | 'skip' | null>(null);
    const [propertyChoice, setPropertyChoice] = useState<'upload' | 'generate' | null>(null);

    // Analysis State
    const [analyzingRef, setAnalyzingRef] = useState(false);
    const [detectedFields, setDetectedFields] = useState<ReferenceAnalysis | null>(null);

    // Model Generation State
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    // Model Options
    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    // Details
    const [texts, setTexts] = useState({
        projectName: '',
        unitType: '',
        marketingContext: '',
        price: '',
        location: '',
        rera: '',
        contact: ''
    });

    // New Dynamic Sections State
    const [amenities, setAmenities] = useState<string[]>([]);
    const [showAmenities, setShowAmenities] = useState(false);
    const [showContact, setShowContact] = useState(false);

    // Result
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);

    // Refund State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Updated cost lookup
    const cost = appConfig?.featureCosts['Pixa Realty Ads'] || appConfig?.featureCosts['Magic Realty'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const scrollRef = useRef<HTMLDivElement>(null);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
                }
            }, 150);
        }
    };

    // --- BRAND KIT INIT ---
    useEffect(() => {
        if (auth.user?.brandKit) {
            setBrandStrategy('brand_kit');
        } else {
            setBrandStrategy('custom');
        }
    }, [auth.user?.brandKit]);

    // --- BRAND KIT ASSET LOADER ---
    useEffect(() => {
        const loadBrandAssets = async () => {
            if (brandStrategy === 'brand_kit' && auth.user?.brandKit) {
                setIsLoadingBrandKit(true);
                const kit = auth.user.brandKit;

                // 1. Text Pre-fill
                setTexts(prev => ({
                    ...prev,
                    contact: kit.website || prev.contact
                }));
                // Enable contact section if we have data
                if (kit.website) setShowContact(true);

                // 2. Logo Pre-fill (if not already custom loaded)
                if (kit.logos.primary && !logoImage) {
                    try {
                        const base64Data = await urlToBase64(kit.logos.primary);
                        setLogoImage({ url: kit.logos.primary, base64: base64Data });
                    } catch (e) {
                        console.warn("Could not load brand kit logo:", e);
                    }
                }
                setIsLoadingBrandKit(false);
            } else if (brandStrategy === 'custom') {
                // If switched to custom, clear logo so user can upload manually if they want
                // But typically we keep the logo if it exists to be nice.
            }
        };
        loadBrandAssets();
    }, [brandStrategy, auth.user?.brandKit]);

    // Cleanup blob URL
    useEffect(() => {
        return () => {
            if (resultImage) URL.revokeObjectURL(resultImage);
        };
    }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setReferenceImage({ url: URL.createObjectURL(file), base64 });
            
            // Trigger Auto-Detect
            setAnalyzingRef(true);
            try {
                const analysis = await analyzeRealtyReference(base64.base64, base64.mimeType);
                setDetectedFields(analysis);
                if (analysis.hasContact || analysis.hasRera || analysis.hasLocation) {
                    setShowContact(true);
                }
            } catch (err) {
                console.error("Ref analysis failed", err);
            } finally {
                setAnalyzingRef(false);
            }
        }
        e.target.value = '';
    }

    const handleToggleAmenities = () => {
        if (!showAmenities) {
            if (amenities.length === 0) setAmenities(['', '', '']);
            setShowAmenities(true);
        } else {
            setShowAmenities(false);
        }
        autoScroll();
    };

    const updateAmenity = (index: number, value: string) => {
        const newAmenities = [...amenities];
        newAmenities[index] = value;
        setAmenities(newAmenities);
    };

    const addAmenity = () => {
        setAmenities([...amenities, '']);
        autoScroll();
    };

    const removeAmenity = (index: number) => {
        const newAmenities = amenities.filter((_, i) => i !== index);
        setAmenities(newAmenities);
    };

    const handleGenerate = async () => {
        // Requirement Check: Need Reference (if in reference mode) OR Auto mode. And Project Name.
        const refReady = designMode === 'auto' || !!referenceImage;
        if (!refReady || !auth.user || !texts.projectName) return;
        
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);

        try {
            const mode = propertyChoice === 'generate' ? 'new_property' : 'lifestyle_fusion';
            
            const modelGenerationParams = modelChoice === 'generate' ? {
                modelType, region: modelRegion, skinTone, bodyType, composition: modelComposition, framing: modelFraming
            } : undefined;

            const validAmenities = showAmenities ? amenities.filter(a => a.trim() !== '') : [];

            const finalTexts = {
                ...texts,
                contact: showContact ? texts.contact : '',
                rera: showContact ? texts.rera : '',
                location: showContact ? texts.location : ''
            };

            const assetUrl = await generateRealtyAd({
                mode,
                modelImage: modelChoice === 'upload' ? modelImage?.base64 : null, 
                modelGenerationParams,
                propertyImage: propertyChoice === 'upload' ? propertyImage?.base64 : null, 
                referenceImage: designMode === 'reference' && referenceImage ? referenceImage.base64 : undefined,
                logoImage: logoImage?.base64,
                amenities: validAmenities,
                texts: finalTexts,
                brandIdentity: (brandStrategy === 'brand_kit' && auth.user.brandKit) ? {
                    colors: auth.user.brandKit.colors,
                    fonts: auth.user.brandKit.fonts
                } : undefined
            });

            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${assetUrl}`;
            // Save as Pixa Realty Ads
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Realty Ads');
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Realty Ads');
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

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(
                auth.user.uid,
                auth.user.email,
                cost,
                reason,
                "Realty Ad",
                lastCreationId || undefined
            );
            if (res.success) {
                if (res.type === 'refund') {
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null); 
                    setNotification({ msg: res.message, type: 'success' });
                } else {
                    setNotification({ msg: res.message, type: 'info' });
                }
            }
            setShowRefundModal(false);
        } catch (e: any) {
            alert("Refund processing failed: " + e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const handleNewSession = () => {
        setModelImage(null);
        setPropertyImage(null);
        setReferenceImage(null);
        if (brandStrategy === 'custom') setLogoImage(null);
        
        setModelChoice(null);
        setPropertyChoice(null);
        setTexts({ projectName: '', unitType: '', marketingContext: '', location: '', price: '', rera: '', contact: '' });
        setAmenities([]);
        setShowAmenities(false);
        setShowContact(false);
        setResultImage(null);
        setDetectedFields(null);
        setLastCreationId(null);
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Pixa Realty Ads (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    // --- VALIDATION ---
    const isModelReady = modelChoice === 'skip' || (modelChoice === 'upload' && !!modelImage) || (modelChoice === 'generate' && !!modelType);
    const isRefReady = designMode === 'auto' || (designMode === 'reference' && !!referenceImage);
    
    const canGenerate = 
        isRefReady && 
        !!texts.projectName && 
        (propertyChoice === 'generate' || !!propertyImage) && 
        !!modelChoice &&
        isModelReady &&
        !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Realty Ads"
                description="Create luxury Real Estate ads with Lifestyle Fusion and Golden Hour enhancement."
                icon={<BuildingIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                
                onResetResult={resultImage ? undefined : handleGenerate}
                onNewSession={resultImage ? undefined : handleNewSession}
                resultOverlay={
                    resultImage ? (
                        <ResultToolbar 
                            onNew={handleNewSession}
                            onRegen={handleGenerate}
                            onEdit={() => setShowMagicEditor(true)}
                            onReport={() => setShowRefundModal(true)}
                        />
                    ) : null
                }

                resultHeightClass="h-[900px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: designMode === 'auto' ? "Pixa Auto-Design" : "Generate Ad"
                }}
                scrollRef={scrollRef}
                
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">
                                    {designMode === 'auto' ? "Pixa is researching trends..." : "Pixa is cloning layout..."}
                                </p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BuildingIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Realty Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Your flyer will appear here.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* STRATEGY SELECTION: Brand Kit vs Custom */}
                            {auth.user?.brandKit && (
                                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <BrandKitIcon className="w-4 h-4 text-purple-600"/>
                                        <label className="text-xs font-bold text-purple-800 uppercase tracking-wider">Brand Strategy</label>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setBrandStrategy('brand_kit')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${brandStrategy === 'brand_kit' ? 'bg-white border-purple-400 text-purple-700 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/50'}`}
                                        >
                                            Use Brand Kit
                                        </button>
                                        <button 
                                            onClick={() => setBrandStrategy('custom')}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${brandStrategy === 'custom' ? 'bg-white border-purple-400 text-purple-700 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-white/50'}`}
                                        >
                                            Custom / One-off
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 1: Model */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lifestyle Model</label>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    <StepCard title="Upload" description="Own photo" icon={<UserIcon className="w-4 h-4"/>} selected={modelChoice === 'upload'} onClick={() => setModelChoice('upload')} />
                                    <StepCard title="Generate" description="AI Human" icon={<SparklesIcon className="w-4 h-4"/>} selected={modelChoice === 'generate'} onClick={() => setModelChoice('generate')} />
                                    <StepCard title="Skip" description="Architecture only" icon={<XIcon className="w-4 h-4"/>} selected={modelChoice === 'skip'} onClick={() => { setModelChoice('skip'); setModelImage(null); }} />
                                </div>
                                {modelChoice === 'upload' && <CompactUpload label="Model Photo" image={modelImage} onUpload={handleUpload(setModelImage)} onClear={() => setModelImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>} />}
                                {modelChoice === 'generate' && (
                                    <div className="animate-fadeIn space-y-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                        <SelectionGrid label="Composition" options={compositionTypes} value={modelComposition} onChange={setModelComposition} />
                                        {modelComposition && <SelectionGrid label="Model Type" options={modelTypes} value={modelType} onChange={setModelType} />}
                                        {modelType && <SelectionGrid label="Region" options={modelRegions} value={modelRegion} onChange={setModelRegion} />}
                                        {modelRegion && <SelectionGrid label="Skin Tone" options={skinTones} value={skinTone} onChange={setSkinTone} />}
                                        {skinTone && <SelectionGrid label="Body Type" options={bodyTypes} value={bodyType} onChange={setBodyType} />}
                                        {bodyType && <SelectionGrid label="Shot Type" options={shotTypes} value={modelFraming} onChange={setModelFraming} />}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Property */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Property Asset</label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <StepCard title="Upload Photo" description="Enhance existing" icon={<UploadTrayIcon className="w-5 h-5"/>} selected={propertyChoice === 'upload'} onClick={() => setPropertyChoice('upload')} />
                                    <StepCard title="Generate New" description="Create from text" icon={<SparklesIcon className="w-5 h-5"/>} selected={propertyChoice === 'generate'} onClick={() => { setPropertyChoice('generate'); setPropertyImage(null); }} />
                                </div>
                                {propertyChoice === 'upload' && <CompactUpload label="Site/Interior Photo" image={propertyImage} onUpload={handleUpload(setPropertyImage)} onClear={() => setPropertyImage(null)} icon={<BuildingIcon className="w-6 h-6 text-indigo-400"/>} />}
                            </div>

                            {/* Step 3: Design Mode (Ref vs Auto) */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Design Strategy</label>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <StepCard title="Reference" description="Clone a layout" icon={<LightbulbIcon className="w-5 h-5"/>} selected={designMode === 'reference'} onClick={() => setDesignMode('reference')} />
                                    <StepCard title="Pixa Auto-Design" description="Best practices 2025" icon={<MagicWandIcon className="w-5 h-5"/>} selected={designMode === 'auto'} onClick={() => { setDesignMode('auto'); setReferenceImage(null); }} />
                                </div>
                                
                                {designMode === 'reference' && (
                                    <div className="animate-fadeIn relative">
                                        {analyzingRef && (
                                            <div className="absolute top-0 right-0 flex items-center gap-2 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 z-10">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                                                <span className="text-[10px] text-blue-600 font-bold animate-pulse">Scanning Layout...</span>
                                            </div>
                                        )}
                                        <CompactUpload label="Reference Layout Image" image={referenceImage} onUpload={handleRefUpload} onClear={() => { setReferenceImage(null); setDetectedFields(null); }} icon={<LightbulbIcon className="w-6 h-6 text-yellow-500"/>} heightClass="h-40" />
                                    </div>
                                )}
                                {designMode === 'auto' && (
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-800 leading-relaxed">
                                        <p><strong>Pixa Agent Active:</strong> We will research current luxury real estate design trends and automatically generate a high-conversion layout for you.</p>
                                    </div>
                                )}
                            </div>

                            {/* Step 4: Details */}
                            <div className="border-t border-gray-100 pt-6">
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <span className="bg-indigo-100 text-indigo-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold">4</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ad Details</label>
                                </div>
                                
                                {/* Conditional Logo Section */}
                                <div className="mb-4">
                                    {brandStrategy === 'brand_kit' && logoImage ? (
                                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
                                            <img src={logoImage.url} className="w-10 h-10 object-contain" alt="Brand Logo"/>
                                            <div>
                                                <p className="text-xs font-bold text-purple-900">Brand Kit Active</p>
                                                <p className="text-[10px] text-purple-600">Logo & Contact pre-filled</p>
                                            </div>
                                            <button onClick={() => setBrandStrategy('custom')} className="ml-auto text-[10px] text-purple-500 underline hover:text-purple-700">Override</button>
                                        </div>
                                    ) : (
                                        <CompactUpload label="Brand Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<SparklesIcon className="w-6 h-6 text-purple-400"/>} optional={true} heightClass="h-24" />
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <InputField label={<LabelWithBadge label="Project Name" detected={detectedFields?.hasProjectName} />} placeholder="e.g. Skyline Towers" value={texts.projectName} onChange={(e: any) => setTexts({...texts, projectName: e.target.value})} />
                                        <InputField label={<LabelWithBadge label="Unit Size" detected={detectedFields?.hasUnitType} />} placeholder="e.g. 2 BHK" value={texts.unitType} onChange={(e: any) => setTexts({...texts, unitType: e.target.value})} />
                                    </div>
                                    <TextAreaField label="Context (Pixa will create title)" placeholder="e.g. 'Sea facing, Luxury'" value={texts.marketingContext} onChange={(e: any) => setTexts({...texts, marketingContext: e.target.value})} rows={3} />
                                    <InputField label={<LabelWithBadge label="Price (Optional)" detected={detectedFields?.hasPrice} />} placeholder="e.g. ₹1.5 Cr+" value={texts.price} onChange={(e: any) => setTexts({...texts, price: e.target.value})} />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="border-t border-gray-100 pt-4">
                                <button onClick={handleToggleAmenities} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${showAmenities ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'} border`}>
                                    <div className="flex items-center gap-2"><CheckIcon className={`w-4 h-4 ${showAmenities ? 'text-blue-600' : 'text-gray-400'}`}/><span className="text-xs font-bold uppercase tracking-wider">Add Amenities?</span></div>
                                    {showAmenities ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                </button>
                                {showAmenities && (
                                    <div className="mt-4 space-y-3 animate-fadeIn bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        {amenities.map((amenity, idx) => (
                                            <div key={idx} className="flex items-center gap-2"><input type="text" placeholder={`Amenity ${idx + 1}`} value={amenity} onChange={(e) => updateAmenity(idx, e.target.value)} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"/><button onClick={() => removeAmenity(idx)} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button></div>
                                        ))}
                                        <button onClick={addAmenity} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-800 mt-2"><PlusCircleIcon className="w-4 h-4"/> Add Amenity</button>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <button onClick={() => { setShowContact(!showContact); autoScroll(); }} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${showContact ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'} border`}>
                                    <div className="flex items-center gap-2"><CheckIcon className={`w-4 h-4 ${showContact ? 'text-blue-600' : 'text-gray-400'}`}/><span className="text-xs font-bold uppercase tracking-wider">Add Footer Info?</span></div>
                                    {showContact ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                </button>
                                {showContact && (
                                    <div className="mt-4 grid grid-cols-1 gap-3 animate-fadeIn bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <InputField label="Location" placeholder="Address" value={texts.location} onChange={(e: any) => setTexts({...texts, location: e.target.value})} />
                                        <InputField label="Contact / Website" placeholder="Website" value={texts.contact} onChange={(e: any) => setTexts({...texts, contact: e.target.value})} />
                                        <InputField label="RERA ID" placeholder="Legal ID" value={texts.rera} onChange={(e: any) => setTexts({...texts, rera: e.target.value})} />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && resultImage && (
                <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <RefundModal 
                    onClose={() => setShowRefundModal(false)}
                    onConfirm={handleRefundRequest}
                    isProcessing={isRefunding}
                    featureName="Realty Ad"
                />
            )}

            {/* Notification */}
            {notification && (
                <ToastNotification 
                    message={notification.msg} 
                    type={notification.type} 
                    onClose={() => setNotification(null)} 
                />
            )}
        </>
    );
};
