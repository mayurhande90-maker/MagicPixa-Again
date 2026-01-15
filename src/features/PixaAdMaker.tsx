import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuthProps, AppConfig, Page, View, BrandKit } from '../types';
// Add TextAreaField to the import
import { FeatureLayout, InputField, TextAreaField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { 
    UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, BrandKitIcon, 
    MagicWandIcon, MagicAdsIcon, PlusIcon, CloudUploadIcon, 
    ArrowRightIcon, ReplicaIcon, ReimagineIcon, CreditCardIcon 
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateAdCreative } from '../services/adMakerService';
import { deductCredits, saveCreation, claimMilestoneBonus, getUserBrands, activateBrand } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { BrandStylistStyles } from '../styles/features/BrandStylist.styles';

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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal opacity-50 ml-1">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-2xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 relative z-10" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform relative z-10 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2 relative z-10">{uploadText || `Upload ${label}`}</p>
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
                     {loading ? (
                         <div className="flex justify-center py-20">
                             <div className="w-8 h-8 border-4 border-indigo-600 border-t-indigo-600 rounded-full animate-spin"></div>
                         </div>
                     ) : (
                        <div className={`grid grid-cols-2 gap-4 ${activatingId ? 'pointer-events-none' : ''}`}>
                            {brands.map(brand => {
                                const isActive = currentBrandId === brand.id;
                                const isActivating = activatingId === brand.id;
                                return (
                                    <button 
                                        key={brand.id} 
                                        onClick={(e) => { e.stopPropagation(); handleSelect(brand); }} 
                                        disabled={!!activatingId || isActive}
                                        className={`group relative flex flex-col h-40 rounded-2xl border transition-all duration-300 overflow-hidden text-left ${
                                            isActive 
                                            ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md scale-[1.01]' 
                                            : 'border-gray-200 hover:border-indigo-400 hover:shadow-lg bg-white'
                                        } ${isActivating ? 'ring-2 ring-indigo-600' : ''}`}
                                    >
                                        <div className={`h-20 shrink-0 flex items-center justify-center p-2 border-b transition-colors ${isActive ? 'bg-indigo-50/30 border-indigo-100' : 'bg-gray-50/30 border-gray-100 group-hover:bg-white'}`}>
                                            {brand.logos.primary ? (
                                                <img src={brand.logos.primary} className="max-w-[70%] max-h-[70%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300" alt="Logo" />
                                            ) : (
                                                <span className="text-2xl font-black text-gray-300">{(brand.companyName || brand.name || '?').substring(0,2).toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className={`px-4 py-2 flex-1 min-h-0 flex flex-col justify-center ${isActive ? 'bg-indigo-50/10' : 'bg-white'}`}>
                                            <h4 className={`font-bold text-xs truncate mb-0.5 ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>{brand.companyName || brand.name || 'Untitled'}</h4>
                                            <p className="text-[9px] text-gray-500 font-medium truncate opacity-80 uppercase tracking-wide">{brand.industry}</p>
                                        </div>
                                    </button>
                                );
                            })}
                            <button onClick={onCreateNew} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 h-40 hover:border-indigo-400 transition-colors">
                                <PlusIcon className="w-6 h-6 text-gray-400" />
                                <span className="text-xs font-bold text-gray-400">Create New</span>
                            </button>
                        </div>
                     )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export const PixaAdMaker: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [productImage, setProductImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [genMode, setGenMode] = useState<'replica' | 'remix'>('replica'); 
    const [language, setLanguage] = useState('English');
    const [productName, setProductName] = useState('');
    const [website, setWebsite] = useState('');
    const [specialOffer, setSpecialOffer] = useState('');
    const [address, setAddress] = useState('');
    const [description, setDescription] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa AdMaker'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    useEffect(() => {
        if (auth.activeBrandKit) {
            const kit = auth.activeBrandKit;
            setWebsite(kit.website || '');
            if (kit.companyName) setProductName(kit.companyName);
            if (kit.logos.primary) {
                urlToBase64(kit.logos.primary).then(base64 => {
                    setLogoImage({ url: kit.logos.primary!, base64 });
                }).catch(e => console.warn("Auto-logo load failed", e));
            }
        }
    }, [auth.activeBrandKit?.id]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!productImage || !auth.user || !description) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoadingText(!referenceImage ? "Pixa Agent is Researching Trends..." : "Pixa is Analyzing, Relighting & Harmonizing...");
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const assetUrl = await generateAdCreative({
                industry: 'ecommerce',
                mainImages: [productImage.base64],
                referenceImage: referenceImage?.base64,
                logoImage: logoImage?.base64,
                productName,
                website,
                offer: specialOffer,
                description,
                layoutTemplate: genMode === 'replica' ? 'Hero Focus' : 'Split Design'
            }, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const finalImageUrl = `data:image/png;base64,${assetUrl}`; const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa AdMaker'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message || "Please try again."}`); } finally { setLoading(false); }
    };

    const handleNewSession = () => { setProductImage(null); setLogoImage(null); setReferenceImage(null); setResultImage(null); setProductName(''); setWebsite(''); setSpecialOffer(''); setAddress(''); setDescription(''); setGenMode('replica'); setLanguage('English'); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa AdMaker (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    
    // Fix: Added missing handleRefundRequest function definition
    const handleRefundRequest = async (reason: string) => { 
        if (!auth.user || !resultImage) return; 
        setIsRefunding(true); 
        try { 
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Ad Creative", lastCreationId || undefined); 
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

    const handleBrandSelect = async (brand: BrandKit) => {
        if (auth.user && brand.id) {
            const brandData = await activateBrand(auth.user.uid, brand.id);
            auth.setActiveBrandKit(brandData || null);
            setShowBrandModal(false);
        }
    };

    const canGenerate = !!productImage && !isLowCredits && !!description;

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker" 
                description="Turn your product photos into high-converting ad creatives by mimicking successful styles." 
                icon={<MagicAdsIcon className="w-14 h-14" />} 
                rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} 
                creationId={lastCreationId}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null} 
                resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Ad" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className={`h-full rounded-full animate-[progress_2s_ease-in-out_infinite] ${genMode === 'remix' ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>) : (<div className="text-center opacity-50 select-none"><div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${genMode === 'remix' ? 'bg-purple-50' : 'bg-blue-50'}`}><MagicAdsIcon className={`w-10 h-10 ${genMode === 'remix' ? 'text-purple-500' : 'text-blue-500'}`} /></div><h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload Product & Reference to preview.</p></div>)}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-10 h-10 text-red-500 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={`space-y-8 p-2 animate-fadeIn flex flex-col h-full relative ${loading ? 'opacity-50 pointer-events-none cursor-not-allowed grayscale-[0.5]' : ''}`}>
                            {auth.activeBrandKit && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between animate-fadeIn">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-indigo-100 overflow-hidden">
                                            {auth.activeBrandKit.logos.primary ? <img src={auth.activeBrandKit.logos.primary} className="w-full h-full object-cover" /> : <BrandKitIcon className="w-4 h-4 text-indigo-500" />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Active Brand</p>
                                            <p className="text-xs font-bold text-indigo-900">{auth.activeBrandKit.companyName}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowBrandModal(true)} className="p-1.5 hover:bg-white rounded-lg text-indigo-600 transition-colors"><PlusIcon className="w-4 h-4"/></button>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-2 mb-3"><span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">1</span><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Source Assets</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Product" uploadText="Upload Product" image={productImage} onUpload={handleUpload(setProductImage)} onClear={() => setProductImage(null)} icon={<CloudUploadIcon className="w-5 h-5 text-blue-500" />} />
                                    <CompactUpload label="Logo" uploadText="Upload Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<CloudUploadIcon className="w-5 h-5 text-blue-500" />} optional={true} />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-3"><span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">2</span><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Style Reference</label></div>
                                <CompactUpload label="Ad / Design Image" uploadText="Upload Reference Image" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<CloudUploadIcon className="w-5 h-5 text-yellow-500" />} heightClass="h-40" optional={true} />
                            </div>

                            {referenceImage && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3"><span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">3</span><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Creativity Level</label></div>
                                    <div className={BrandStylistStyles.modeGrid}>
                                        <button onClick={() => setGenMode('replica')} className={`${BrandStylistStyles.modeCard} ${genMode === 'replica' ? BrandStylistStyles.modeCardReplica : BrandStylistStyles.modeCardInactive}`}><div className={`${BrandStylistStyles.orb} ${BrandStylistStyles.orbReplica}`}></div><div className={BrandStylistStyles.iconGlass}><ReplicaIcon className={`w-6 h-6 ${genMode === 'replica' ? BrandStylistStyles.iconReplica : BrandStylistStyles.iconInactive}`} /></div><div className={BrandStylistStyles.contentWrapper}><h3 className={BrandStylistStyles.modeTitle}>Replica</h3><p className={BrandStylistStyles.modeDesc}>Strictly copy layout.</p></div></button>
                                        <button onClick={() => setGenMode('remix')} className={`${BrandStylistStyles.modeCard} ${genMode === 'remix' ? BrandStylistStyles.modeCardRemix : BrandStylistStyles.modeCardInactive}`}><div className={`${BrandStylistStyles.orb} ${BrandStylistStyles.orbRemix}`}></div><div className={BrandStylistStyles.iconGlass}><ReimagineIcon className={`w-6 h-6 ${genMode === 'remix' ? BrandStylistStyles.iconRemix : BrandStylistStyles.iconInactive}`} /></div><div className={BrandStylistStyles.contentWrapper}><h3 className={BrandStylistStyles.modeTitle}>Reimagine</h3><p className={BrandStylistStyles.modeDesc}>Invent layout.</p></div></button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-5 pt-4 border-t border-gray-100 pb-20">
                                <div><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Ad Copy Details</label>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <InputField placeholder="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                        <InputField placeholder="Offer / CTA (Optional)" value={specialOffer} onChange={(e: any) => setSpecialOffer(e.target.value)} />
                                        <InputField placeholder="Website (Optional)" value={website} onChange={(e: any) => setWebsite(e.target.value)} />
                                        <div className="flex gap-2">
                                            {['English', 'Hindi', 'Marathi'].map(lang => (
                                                <button key={lang} onClick={() => setLanguage(lang)} className={`${BrandStylistStyles.languageButton} ${language === lang ? BrandStylistStyles.langActive : BrandStylistStyles.langInactive}`}>{lang}</button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* TextAreaField is now imported correctly */}
                                    <TextAreaField label="Context (Required)" placeholder="e.g. Organic Coffee, morning energy boost" value={description} onChange={(e: any) => setDescription(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={claimMilestoneBonus as any} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showBrandModal && auth.user && <BrandSelectionModal isOpen={showBrandModal} onClose={() => setShowBrandModal(false)} userId={auth.user.uid} currentBrandId={auth.activeBrandKit?.id} onSelect={handleBrandSelect} onCreateNew={() => navigateTo('dashboard', 'brand_manager')} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="AdMaker" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};

export default PixaAdMaker;