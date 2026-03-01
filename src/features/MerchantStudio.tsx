import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, ImageModal } from '../components/FeatureLayout';
import { 
    ApparelIcon, CubeIcon, UploadTrayIcon, SparklesIcon, CreditCoinIcon, UserIcon, XIcon, DownloadIcon, CheckIcon, StarIcon, PixaEcommerceIcon, ArrowRightIcon, ThumbUpIcon, ThumbDownIcon,
    BrandKitIcon, InformationCircleIcon, PlusIcon, PlusCircleIcon
} from '../components/icons';
import { fileToBase64, Base64File, downloadImage, base64ToBlobUrl, resizeImage } from '../utils/imageUtils';
import { generateMerchantBatch } from '../services/merchantService';
import { saveCreation, deductCredits, logApiError, submitFeedback, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MerchantStyles } from '../styles/features/MerchantStudio.styles';
// @ts-ignore
import JSZip from 'jszip';

const FeedbackSparkle = () => (
  <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
    <div className="absolute animate-[ping_0.5s_ease-out_forwards] text-yellow-300 opacity-90 scale-150">✨</div>
    <div className="absolute -top-6 -right-6 text-yellow-200 w-4 h-4 animate-[bounce_0.6s_infinite]">✦</div>
    <div className="absolute -bottom-4 -left-6 text-yellow-400 w-3 h-3 animate-[pulse_0.4s_infinite]">★</div>
    <div className="absolute top-0 left-0 w-full h-full border-2 border-yellow-300 rounded-full animate-[ping_0.6s_ease-out_forwards] opacity-60"></div>
  </div>
);

const PackCard: React.FC<{ size: 5 | 7 | 10; label: string; subLabel: string; cost: number; selected: boolean; onClick: () => void; isPopular?: boolean; }> = ({ size, label, subLabel, cost, selected, onClick, isPopular }) => (
    <button onClick={onClick} className={`${MerchantStyles.packCard} ${selected ? MerchantStyles.packCardSelected : MerchantStyles.packCardInactive}`}>
        <div className={`${MerchantStyles.packOrb} ${selected ? MerchantStyles.packOrbSelected : MerchantStyles.packOrbInactive}`}></div>
        {isPopular && <div className={MerchantStyles.packPopular}>Best Value</div>}
        {selected && (
            <div className="absolute bottom-3 right-3 z-20">
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-fadeIn ring-2 ring-white">
                    <CheckIcon className="w-3 h-3 text-white"/>
                </div>
            </div>
        )}
        <div className={MerchantStyles.packContent}>
            <div>
                <span className={`${MerchantStyles.packLabel} ${selected ? MerchantStyles.packLabelSelected : MerchantStyles.packLabelInactive}`}>
                    {label}
                </span>
                <div className={MerchantStyles.packCountContainer}>
                    <span className={`${MerchantStyles.packCount} ${selected ? MerchantStyles.packCountSelected : MerchantStyles.packCountInactive}`}>
                        {size}
                    </span>
                    <span className={MerchantStyles.packUnit}>Assets</span>
                </div>
            </div>
            <div className={`${MerchantStyles.packCost} ${selected ? MerchantStyles.packCostSelected : MerchantStyles.packCostInactive}`}>
                {selected ? <SparklesIcon className="w-3 h-3 text-yellow-300"/> : <CreditCoinIcon className="w-3 h-3 text-current opacity-70"/>} 
                {cost} Credits
            </div>
        </div>
    </button>
);

const CompactUpload: React.FC<{ label: string; subLabel?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="mb-2 ml-1 flex justify-between items-end"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>{subLabel && <span className="text-[10px] text-gray-400">{subLabel}</span>}</div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-blue-300 transition-colors`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-10 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-200 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Click to Upload</p>
                    <p className="text-[9px] text-gray-300 mt-1">Best: High Res, Clean BG</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const BrandSelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    currentBrandId?: string;
    onSelect: (brand: BrandKit) => Promise<void>;
    onCreateNew: () => void;
}> = ({ isOpen, onClose, userId, currentBrandId, onSelect, onCreateNew }) => {
    const [brands, setBrands] = useState<BrandKit[]>([]);
    const [loading, setLoading] = useState(true);
    const [activatingId, setActivatingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getUserBrands(userId).then(list => {
                setBrands(list);
                setLoading(false);
            });
        }
    }, [isOpen, userId]);

    const handleSelect = async (brand: BrandKit) => {
        if (!brand.id) return;
        setActivatingId(brand.id);
        await new Promise(r => setTimeout(r, 500));
        try {
            await onSelect(brand);
        } catch (e) {
            console.error("Selection failed", e);
            setActivatingId(null);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn ${activatingId ? 'cursor-wait' : ''}`} onClick={onClose}>
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transform transition-all scale-100 relative" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 z-10 relative">
                    <div className="flex items-center gap-3">
                         <div className="flex items-center justify-center"><BrandKitIcon className="w-7 h-7 text-indigo-600" /></div>
                         <div><h3 className="text-lg font-black text-gray-900 tracking-tight">Select Identity</h3><p className="text-xs text-gray-500 font-medium">Apply a brand kit to your ad.</p></div>
                    </div>
                    <button onClick={onClose} disabled={!!activatingId} className={`p-2 rounded-full transition-colors ${activatingId ? 'text-gray-200 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-400'}`}><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50/50 flex-1 relative">
                     {loading ? (<div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-indigo-600 rounded-full animate-spin"></div></div>) : brands.length === 0 ? (<div className="text-center py-10 flex flex-col items-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><BrandKitIcon className="w-8 h-8 text-gray-400" /></div><p className="text-gray-500 font-medium text-sm mb-6">No brand kits found.</p><button onClick={onCreateNew} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/20">Create First Brand</button></div>) : (
                        <div className={`grid grid-cols-2 gap-4 ${activatingId ? 'pointer-events-none' : ''}`}>{brands.map(brand => {
                                const isActive = currentBrandId === brand.id;
                                const isActivating = activatingId === brand.id;
                                return (<button key={brand.id} onClick={(e) => { e.stopPropagation(); handleSelect(brand); }} disabled={!!activatingId || isActive} className={`group relative flex flex-col h-40 rounded-2xl border transition-all duration-300 overflow-hidden text-left ${isActive ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.01]' : 'border-gray-200 hover:border-indigo-400 hover:shadow-lg bg-white'} ${isActivating ? 'ring-2 ring-indigo-600' : ''}`}>
                                        <div className={`h-20 shrink-0 flex items-center justify-center p-2 border-b transition-colors ${isActive ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50/30 border-gray-100 group-hover:bg-white'}`}>{brand.logos.primary ? (<img src={brand.logos.primary} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" alt="Logo" />) : (<span className="text-2xl font-black text-gray-300">{(brand.companyName || brand.name || '?').substring(0,2).toUpperCase()}</span>)}{isActive && !isActivating && (<div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-sm animate-scaleIn"><CheckIcon className="w-2.5 h-2.5" /></div>)}{isActivating && (<div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>)}</div>
                                        <div className={`px-4 py-2 flex-1 min-h-0 flex flex-col justify-center ${isActive ? 'bg-indigo-50/10' : 'bg-white'}`}><div><h4 className={`font-bold text-xs truncate mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{brand.companyName || brand.name || 'Untitled'}</h4><p className="text-[9px] text-gray-500 font-medium truncate opacity-80 uppercase tracking-wide">{brand.industry ? brand.industry.charAt(0).toUpperCase() + brand.industry.slice(1) : 'General'}</p></div>{brand.colors && (<div className="flex gap-1 mt-1.5"><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.primary || '#ccc' }}></div><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.secondary || '#eee' }}></div><div className="w-3 h-3 rounded-full border border-gray-200 shadow-sm" style={{ background: brand.colors.accent || '#999' }}></div></div>)}</div></button>);
                            })}<button onClick={onCreateNew} disabled={!!activatingId} className={`group relative flex flex-col h-40 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-6 transition-all duration-300 flex flex-col items-center justify-center text-center gap-2 bg-gray-50/30 hover:shadow-md ${activatingId ? 'opacity-50 cursor-not-allowed' : ''}`}><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all border border-gray-200 group-hover:border-indigo-200"><PlusCircleIcon className="w-5 h-5" /></div><span className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-700 transition-colors uppercase tracking-wide">Create New</span></button></div>)}
                </div>
            </div>
        </div>,
        document.body
    );
};

export const MerchantStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [mode, setMode] = useState<'apparel' | 'product' | null>(null);
    const [mainImage, setMainImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [backImage, setBackImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelSource, setModelSource] = useState<'ai' | 'upload' | null>(null);
    const [aiGender, setAiGender] = useState('');
    const [aiEthnicity, setAiEthnicity] = useState('');
    const [aiSkinTone, setAiSkinTone] = useState('');
    const [aiBodyType, setAiBodyType] = useState('');
    const [productType, setProductType] = useState('');
    const [productVibe, setProductVibe] = useState('');
    const [packSize, setPackSize] = useState<5 | 7 | 10>(5);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [results, setResults] = useState<string[]>([]);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [viewIndex, setViewIndex] = useState<number | null>(null);
    const [isZipping, setIsZipping] = useState(false);
    const [heroCreationId, setHeroCreationId] = useState<string | null>(null);
    const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
    const [animatingFeedback, setAnimatingFeedback] = useState<'up' | 'down' | null>(null);
    const [showThankYou, setShowThankYou] = useState(false);

    const [showBrandModal, setShowBrandModal] = useState(false);

    const baseCost = appConfig?.featureCosts['Pixa Ecommerce Kit'] || 25;
    let cost = baseCost;
    if (packSize === 5) cost = appConfig?.featureCosts['Pixa Ecommerce Kit (5 Assets)'] || baseCost;
    else if (packSize === 7) cost = appConfig?.featureCosts['Pixa Ecommerce Kit (7 Assets)'] || Math.ceil(baseCost * 1.4);
    else if (packSize === 10) cost = appConfig?.featureCosts['Pixa Ecommerce Kit (10 Assets)'] || Math.ceil(baseCost * 2.0);

    const costStandard = appConfig?.featureCosts['Pixa Ecommerce Kit (5 Assets)'] || baseCost;
    const costExtended = appConfig?.featureCosts['Pixa Ecommerce Kit (7 Assets)'] || Math.ceil(baseCost * 1.4);
    const costUltimate = appConfig?.featureCosts['Pixa Ecommerce Kit (10 Assets)'] || Math.ceil(baseCost * 2.0);

    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { return () => { results.forEach(url => URL.revokeObjectURL(url)); }; }, [results]);
    
    // NEW LOADING CYCLE: Triple-Engine Agency Sequence
    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Forensic Audit: Identifying material physics...",
                "Forensic Audit: Mapping geometric topology...",
                "Strategic Architect: Planning visual storytelling...",
                "Production Engine: Simulating ray-traced shadows...",
                "Production Engine: Finalizing 8K Global Illumination...",
                "Elite Retoucher: Final pixel polish..."
            ]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 2500); 
        } 
        return () => clearInterval(interval); 
    }, [loading]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!mainImage || !mode || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); results.forEach(url => URL.revokeObjectURL(url)); setResults([]); setHeroCreationId(null);
        try {
            const outputBase64Images = await generateMerchantBatch({
                type: mode, mainImage: mainImage.base64, backImage: backImage?.base64, modelImage: modelSource === 'upload' ? modelImage?.base64 : undefined,
                modelParams: modelSource === 'ai' ? { gender: aiGender, ethnicity: aiEthnicity, age: 'Young Adult', skinTone: aiSkinTone, bodyType: aiBodyType } : undefined,
                productType: productType, productVibe: productVibe, packSize: packSize
            }, auth.activeBrandKit, auth.user?.basePlan || undefined);
            if (!outputBase64Images || outputBase64Images.length === 0) throw new Error("Generation failed.");
            const blobUrls = await Promise.all(outputBase64Images.map(b64 => base64ToBlobUrl(b64, 'image/jpeg')));
            setResults(blobUrls);
            const creationIds = [];
            for (let i = 0; i < outputBase64Images.length; i++) {
                const label = getLabel(i, mode); 
                const rawUri = `data:image/jpeg;base64,${outputBase64Images[i]}`;
                const storedUri = await resizeImage(rawUri, 1024, 0.7);
                const id = await saveCreation(auth.user.uid, storedUri, `Ecommerce Kit: ${label}`);
                creationIds.push(id);
            }
            if (creationIds.length > 0) setHeroCreationId(creationIds[0]);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Ecommerce Kit');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); logApiError('Pixa Ecommerce Kit UI', e.message || 'Generation Failed', auth.user?.uid); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { 
        results.forEach(url => URL.revokeObjectURL(url)); setMainImage(null); setBackImage(null); setModelImage(null); setResults([]); setMode(null); setViewIndex(null); setPackSize(5); setModelSource(null); setHeroCreationId(null); setFeedbackGiven(null); setAnimatingFeedback(null); setShowThankYou(false); setIsZipping(false);
        setAiGender(''); setAiEthnicity(''); setAiSkinTone(''); setAiBodyType(''); setProductType(''); setProductVibe(''); 
    };

    const handleDownloadAll = async () => {
        if (results.length === 0 || !mode) return;
        setIsZipping(true);
        try {
            const zip = new JSZip();
            const promises = results.map(async (url, index) => {
                const label = getLabel(index, mode);
                const filename = `pixa_${label.replace(/\s+/g, '_').toLowerCase()}_${index + 1}.jpg`;
                const response = await fetch(url);
                const blob = await response.blob();
                zip.file(filename, blob);
            });
            await Promise.all(promises);
            const content = await zip.generateAsync({ type: "blob" });
            const zipUrl = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `pixa-ecommerce-pack.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { alert("Zip failed."); } finally { setIsZipping(false); }
    };

    const getLabel = (index: number, currentMode: 'apparel' | 'product') => { const labels = currentMode === 'apparel' ? ['Full Body (Hero)', 'Editorial Stylized', 'Side Profile', 'Back View', 'Fabric Detail', 'Lifestyle Alt', 'Creative Studio', 'Golden Hour', 'Action Shot', 'Minimalist'] : ['Hero Front View', 'Back View', 'Hero Shot (45°)', 'Lifestyle Usage', 'Build Quality Macro', 'Contextual Environment', 'Creative Ad', 'Flat Lay Composition', 'In-Hand Scale', 'Dramatic Vibe']; return labels[index] || `Variant ${index + 1}`; };
    
    const handleBrandSelect = async (brand: BrandKit) => { 
        if (auth.user && brand.id) { 
            try { 
                const brandData = await activateBrand(auth.user.uid, brand.id); 
                auth.setActiveBrandKit(brandData || null); 
                setShowBrandModal(false); 
            } catch (error) { 
                console.error(error); 
            } 
        } 
    };

    const isModelRequired = mode === 'apparel' && modelSource === null;
    const isAiParamsIncomplete = mode === 'apparel' && modelSource === 'ai' && !(aiGender && aiEthnicity && aiSkinTone && aiBodyType);
    const isModelUploadIncomplete = mode === 'apparel' && modelSource === 'upload' && !modelImage;
    const isProductVibeIncomplete = mode === 'product' && !productVibe;
    
    const canGenerate = !!mainImage && !isLowCredits && !isModelRequired && !isAiParamsIncomplete && !isModelUploadIncomplete && !isProductVibeIncomplete;

    return (
        <>
            <FeatureLayout
                title="Pixa Ecommerce Kit" description="The ultimate e-commerce engine. Generate 5, 7, or 10 listing-ready assets in one click using Triple-Engine architecture." icon={<PixaEcommerceIcon className="w-14 h-14" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={null} onNewSession={handleNewSession} hideGenerateButton={isLowCredits} resultHeightClass="h-[850px]"
                activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                generateButtonStyle={{ 
                    className: "!bg-[#F9D230] !text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] hover:!bg-[#dfbc2b]", 
                    hideIcon: true, 
                    label: "Generate Kit",
                    loadingLabel: "Generating..."
                }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="h-full w-full flex flex-col bg-gray-50/50 rounded-3xl overflow-hidden border border-gray-100 relative group">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-8">{loadingText}</p></div>)}
                        {!loading && results.length === 0 && (<div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60"><div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><PixaEcommerceIcon className="w-10 h-10 text-indigo-300" /></div><h3 className="text-xl font-bold text-gray-400">Ready to Create</h3><p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">Select a mode and pack size on the right to generate your assets.</p></div>)}
                        {!loading && results.length > 0 && mode && (
                            <div className="flex flex-col lg:flex-row h-full">
                                <div className={MerchantStyles.heroResultContainer} onClick={() => setViewIndex(0)}>
                                    <div className={MerchantStyles.heroLabel}>{getLabel(0, mode)}</div>
                                    <img src={results[0]} className="w-full h-full object-contain p-6 transition-transform group-hover/hero:scale-[1.02]" alt="Hero" />
                                    <div className="absolute bottom-6 right-6 pointer-events-none"><button onClick={(e) => { e.stopPropagation(); downloadImage(results[0], 'merchant-hero.png'); }} className={MerchantStyles.heroDownloadBtn}><DownloadIcon className="w-4 h-4"/> Download</button></div>
                                </div>
                                <div className={MerchantStyles.resultGridContainer}>
                                    <div className="p-4 space-y-4 pb-20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Asset Pack ({results.length})</span>
                                            <button onClick={handleDownloadAll} disabled={isZipping} className="text-[10px] font-bold text-blue-600 hover:underline">{isZipping ? 'Zipping...' : 'Download All (ZIP)'}</button>
                                        </div>
                                        {results.slice(1).map((res, idx) => (<div key={idx} className={MerchantStyles.resultThumbnail} onClick={() => setViewIndex(idx + 1)}><div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md z-10 border border-gray-100">{getLabel(idx + 1, mode)}</div><div className="aspect-[4/3]"><img src={res} className="w-full h-full object-cover transition-transform group-hover:scale-105" /></div><div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); downloadImage(res, `merchant-variant-${idx+1}.png`); }} className="bg-white p-1.5 rounded-full shadow-md text-gray-700 hover:text-blue-600"><DownloadIcon className="w-4 h-4"/></button></div></div>))}
                                    </div>
                                    <div className={MerchantStyles.scrollCue}><div className={MerchantStyles.scrollCueBadge}>Scroll for more</div></div>
                                </div>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">The selected pack requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge</button></div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            {!mode && (
                                <div className={MerchantStyles.modeGrid}>
                                    <button onClick={() => setMode('apparel')} className={`${MerchantStyles.modeCard} ${MerchantStyles.modeCardApparel}`}>
                                        <div className={`${MerchantStyles.orb} ${MerchantStyles.orbApparel}`}></div>
                                        <div className={MerchantStyles.iconGlass}><ApparelIcon className="w-6 h-6 text-purple-600" /></div>
                                        <div className={MerchantStyles.contentWrapper}><h3 className={MerchantStyles.title}>Apparel</h3><p className={MerchantStyles.desc}>Virtual Model Shoot</p></div>
                                        <div className={MerchantStyles.actionBtn}><ArrowRightIcon className={MerchantStyles.actionIcon} /></div>
                                    </button>
                                    <button onClick={() => setMode('product')} className={`${MerchantStyles.modeCard} ${MerchantStyles.modeCardProduct}`}>
                                        <div className={`${MerchantStyles.orb} ${MerchantStyles.orbProduct}`}></div>
                                        <div className={MerchantStyles.iconGlass}><CubeIcon className="w-6 h-6 text-blue-600" /></div>
                                        <div className={MerchantStyles.contentWrapper}><h3 className={MerchantStyles.title}>Product</h3><p className={MerchantStyles.desc}>E-com Pack</p></div>
                                        <div className={MerchantStyles.actionBtn}><ArrowRightIcon className={MerchantStyles.actionIcon} /></div>
                                    </button>
                                </div>
                            )}
                            {mode && (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="flex items-center justify-between"><button onClick={handleNewSession} className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">← BACK TO MODE</button><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mode === 'apparel' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{mode} Mode</span></div>
                                    <div className="mb-4"><label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block ml-1">Pack Size</label><div className={MerchantStyles.packGrid}><PackCard size={5} label="Standard" subLabel="Essentials" cost={costStandard} selected={packSize === 5} onClick={() => setPackSize(5)} /><PackCard size={7} label="Extended" subLabel="+ Creative" cost={costExtended} selected={packSize === 7} onClick={() => setPackSize(7)} /><PackCard size={10} label="Ultimate" subLabel="Complete Kit" cost={costUltimate} selected={packSize === 10} onClick={() => setPackSize(10)} isPopular={true} /></div></div>
                                    
                                    {mode === 'apparel' && (
                                        <>
                                            <CompactUpload label="Cloth Photo (Flat Lay)" image={mainImage} onUpload={handleUpload(setMainImage)} onClear={() => setMainImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-indigo-500"/>} />
                                            <CompactUpload label="Back View" subLabel="Optional" image={backImage} onUpload={handleUpload(setBackImage)} onClear={() => setBackImage(null)} icon={<UploadTrayIcon className="w-5 h-5 text-gray-400"/>} heightClass="h-24" />
                                            <div className="border-t border-gray-100 pt-6">
                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Model Selection</label>
                                                    {isModelRequired && mainImage && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">REQUIRED</span>}
                                                </div>
                                                <div className={MerchantStyles.modelSelectionGrid}>
                                                    <button onClick={() => { setModelSource('ai'); }} className={`${MerchantStyles.modelSelectionCard} ${modelSource === 'ai' ? MerchantStyles.modelSelectionCardSelected : isModelRequired && mainImage ? 'border-indigo-300 animate-pulse' : MerchantStyles.modelSelectionCardInactive}`}>
                                                        <div className={`p-2 rounded-full ${modelSource === 'ai' ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><SparklesIcon className="w-5 h-5"/></div>
                                                        <span className="text-xs font-bold">Pixa Model</span>
                                                    </button>
                                                    <button onClick={() => { setModelSource('upload'); }} className={`${MerchantStyles.modelSelectionCard} ${modelSource === 'upload' ? MerchantStyles.modelSelectionCardSelected : isModelRequired && mainImage ? 'border-indigo-300 animate-pulse' : MerchantStyles.modelSelectionCardInactive}`}>
                                                        <div className={`p-2 rounded-full ${modelSource === 'upload' ? 'bg-white text-indigo-600' : 'bg-gray-100 text-gray-400'}`}><UserIcon className="w-5 h-5"/></div>
                                                        <span className="text-xs font-bold">My Model</span>
                                                    </button>
                                                </div>
                                                {modelSource === 'ai' && (
                                                    <div className="space-y-4 animate-fadeIn">
                                                        <SelectionGrid label="Gender" options={['Female', 'Male']} value={aiGender} onChange={setAiGender} />
                                                        <SelectionGrid label="Ethnicity" options={['International', 'Indian', 'Asian', 'African']} value={aiEthnicity} onChange={setAiEthnicity} />
                                                        <SelectionGrid label="Skin Tone" options={['Fair Tone', 'Wheatish Tone', 'Dusky Tone']} value={aiSkinTone} onChange={setAiSkinTone} />
                                                        <SelectionGrid label="Body Type" options={['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size']} value={aiBodyType} onChange={setAiBodyType} />
                                                    </div>
                                                )}
                                                {modelSource === 'upload' && <div className="animate-fadeIn"><CompactUpload label="Your Model" image={modelImage} onUpload={handleUpload(setModelImage)} onClear={() => setModelImage(null)} icon={<UserIcon className="w-6 h-6 text-blue-400"/>} /></div>}
                                            </div>
                                        </>
                                    )}

                                    {/* Moved Product Type and Visual Vibe inputs outside of specific blocks to improve usability and resolve TS error */}
                                    {mode && (
                                        <div className="border-t border-gray-100 pt-6 space-y-4 mb-4">
                                            {mode === 'product' && (
                                                 <CompactUpload label="Product Photo" image={mainImage} onUpload={handleUpload(setMainImage)} onClear={() => setMainImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-indigo-500"/>} />
                                            )}
                                            {mode === 'product' && (
                                                 <CompactUpload label="Back View" subLabel="Optional" image={backImage} onUpload={handleUpload(setBackImage)} onClear={() => setBackImage(null)} icon={<UploadTrayIcon className="w-5 h-5 text-purple-400"/>} heightClass="h-24" />
                                            )}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Product Type</label>
                                                <input 
                                                    type="text" 
                                                    // FIX: Resolved unintentionally false comparison by providing correct placeholder logic for both modes.
                                                    placeholder={mode === 'apparel' ? "e.g. Oversized hoodie, Summer linen dress" : "e.g. Luxury face serum, Organic honey jar"} 
                                                    value={productType} 
                                                    onChange={(e) => setProductType(e.target.value)} 
                                                    className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:border-[#4D7CFF] font-medium" 
                                                />
                                            </div>
                                            {mode === 'product' && (
                                                <SelectionGrid label="Visual Vibe" options={['Clean Studio', 'Luxury', 'Organic/Nature', 'Tech/Neon', 'Lifestyle']} value={productVibe} onChange={setProductVibe} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {showBrandModal && auth.user && <BrandSelectionModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} userId={auth.user.uid} currentBrandId={auth.activeBrandKit?.id} onSelect={handleBrandSelect} onCreateNew={() => navigateTo('dashboard', 'brand_manager')} />}
        </>
    );
};
