
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone, SelectionGrid, TextAreaField } from '../components/FeatureLayout';
import { BuildingIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, UserIcon, LightbulbIcon, MagicWandIcon, CheckIcon, PlusCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, BrandKitIcon } from '../components/icons';
import { fileToBase64, Base64File, urlToBase64, base64ToBlobUrl } from '../utils/imageUtils';
import { generateRealtyAd, analyzeRealtyReference, ReferenceAnalysis } from '../services/realtyService';
import { deductCredits, saveCreation, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { RealtyStyles } from '../styles/features/MagicRealty.styles';

const StepCard: React.FC<{ title: string; description: string; icon: React.ReactNode; selected: boolean; onClick: () => void; }> = ({ title, description, icon, selected, onClick }) => (
    <button onClick={onClick} className={`${RealtyStyles.stepCard} ${selected ? RealtyStyles.stepCardSelected : RealtyStyles.stepCardInactive}`}>
        <div className={`${RealtyStyles.stepIcon} ${selected ? RealtyStyles.stepIconSelected : RealtyStyles.stepIconInactive}`}>{icon}</div>
        <h3 className={`${RealtyStyles.stepTitle} ${selected ? RealtyStyles.stepTitleSelected : RealtyStyles.stepTitleInactive}`}>{title}</h3>
        <p className={`${RealtyStyles.stepDesc} ${selected ? RealtyStyles.stepDescSelected : RealtyStyles.stepDescInactive}`}>{description}</p>
    </button>
);

const CompactUpload: React.FC<{ label: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; optional?: boolean; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label>{image ? (<div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}><img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} /><button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"><XIcon className="w-3 h-3"/></button></div>) : (<div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}><div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div><p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p><p className="text-[9px] text-gray-300 mt-1">Best: Wide angle</p></div>)}<input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} /></div>
    );
};

const LabelWithBadge: React.FC<{ label: string; detected?: boolean }> = ({ label, detected }) => (<div className="flex justify-between items-center w-full"><span>{label}</span>{detected && (<span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-sm border border-blue-200"><SparklesIcon className="w-2.5 h-2.5"/> Found in Ref</span>)}</div>);

export const MagicRealty: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [brandStrategy, setBrandStrategy] = useState<'brand_kit' | 'custom'>('custom');
    const [designMode, setDesignMode] = useState<'reference' | 'auto'>('reference');
    const [modelImage, setModelImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [propertyImage, setPropertyImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [modelChoice, setModelChoice] = useState<'upload' | 'generate' | 'skip' | null>('upload');
    const [propertyChoice, setPropertyChoice] = useState<'upload' | 'generate' | null>('upload');
    const [analyzingRef, setAnalyzingRef] = useState(false);
    const [detectedFields, setDetectedFields] = useState<ReferenceAnalysis | null>(null);
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');
    const [texts, setTexts] = useState({ projectName: '', unitType: '', marketingContext: '', price: '', location: '', rera: '', contact: '' });
    const [amenities, setAmenities] = useState<string[]>([]);
    const [showAmenities, setShowAmenities] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Realty Ads'] || appConfig?.featureCosts['Magic Realty'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 150); };
    useEffect(() => { if (auth.user?.brandKit) { setBrandStrategy('brand_kit'); } else { setBrandStrategy('custom'); } }, [auth.user?.brandKit]);
    useEffect(() => { const loadBrandAssets = async () => { if (brandStrategy === 'brand_kit' && auth.user?.brandKit) { const kit = auth.user.brandKit; setTexts(prev => ({ ...prev, contact: kit.website || prev.contact })); if (kit.website) setShowContact(true); if (kit.logos.primary && !logoImage) { try { const base64Data = await urlToBase64(kit.logos.primary); setLogoImage({ url: kit.logos.primary, base64: base64Data }); } catch (e) { console.warn("Could not load brand kit logo:", e); } } } }; loadBrandAssets(); }, [brandStrategy, auth.user?.brandKit]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };
    const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setReferenceImage({ url: URL.createObjectURL(file), base64 }); setAnalyzingRef(true); try { const analysis = await analyzeRealtyReference(base64.base64, base64.mimeType); setDetectedFields(analysis); if (analysis.hasContact || analysis.hasRera || analysis.hasLocation) { setShowContact(true); } } catch (err) { console.error("Ref analysis failed", err); } finally { setAnalyzingRef(false); } } e.target.value = ''; }
    
    const handleToggleAmenities = () => { if (!showAmenities) { if (amenities.length === 0) setAmenities(['', '', '']); setShowAmenities(true); } else { setShowAmenities(false); } autoScroll(); };
    const updateAmenity = (index: number, value: string) => { const newAmenities = [...amenities]; newAmenities[index] = value; setAmenities(newAmenities); };
    const addAmenity = () => { setAmenities([...amenities, '']); autoScroll(); };
    const removeAmenity = (index: number) => { const newAmenities = amenities.filter((_, i) => i !== index); setAmenities(newAmenities); };

    const handleGenerate = async () => {
        const refReady = designMode === 'auto' || !!referenceImage; if (!refReady || !auth.user || !texts.projectName) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const mode = propertyChoice === 'generate' ? 'new_property' : 'lifestyle_fusion';
            const modelGenerationParams = modelChoice === 'generate' ? { modelType, region: modelRegion, skinTone, bodyType, composition: modelComposition, framing: modelFraming } : undefined;
            const validAmenities = showAmenities ? amenities.filter(a => a.trim() !== '') : [];
            const finalTexts = { ...texts, contact: showContact ? texts.contact : '', rera: showContact ? texts.rera : '', location: showContact ? texts.location : '' };
            const assetUrl = await generateRealtyAd({ mode, modelImage: modelChoice === 'upload' ? modelImage?.base64 : null, modelGenerationParams, propertyImage: propertyChoice === 'upload' ? propertyImage?.base64 : null, referenceImage: designMode === 'reference' && referenceImage ? referenceImage.base64 : undefined, logoImage: logoImage?.base64, amenities: validAmenities, texts: finalTexts, brandIdentity: (brandStrategy === 'brand_kit' && auth.user.brandKit) ? { colors: auth.user.brandKit.colors, fonts: auth.user.brandKit.fonts } : undefined });
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${assetUrl}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Realty Ads'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Realty Ads'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Realty Ad", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setModelImage(null); setPropertyImage(null); setReferenceImage(null); if (brandStrategy === 'custom') setLogoImage(null); setModelChoice('upload'); setPropertyChoice('upload'); setTexts({ projectName: '', unitType: '', marketingContext: '', location: '', price: '', rera: '', contact: '' }); setAmenities([]); setShowAmenities(false); setShowContact(false); setResultImage(null); setDetectedFields(null); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Realty Ads (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const isModelReady = modelChoice === 'skip' || (modelChoice === 'upload' && !!modelImage) || (modelChoice === 'generate' && !!modelType);
    const isRefReady = designMode === 'auto' || (designMode === 'reference' && !!referenceImage);
    const canGenerate = isRefReady && !!texts.projectName && (propertyChoice === 'generate' || !!propertyImage) && !!modelChoice && isModelReady && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Realty Ads" description="Create luxury Real Estate ads with Lifestyle Fusion and Golden Hour enhancement." icon={<BuildingIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[900px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: designMode === 'auto' ? "Pixa Auto-Design" : "Generate Ad" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{designMode === 'auto' ? "Pixa is researching trends..." : "Pixa is cloning layout..."}</p></div>) : (<div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"><BuildingIcon className="w-10 h-10 text-indigo-500" /></div><h3 className="text-xl font-bold text-gray-300">Realty Canvas</h3><p className="text-sm text-gray-300 mt-1">Your flyer will appear here.</p></div>)}<style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn flex flex-col h-full relative">
                            {/* 1. Design Strategy */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setDesignMode('reference'); setReferenceImage(null); }} className={`p-3 rounded-xl border text-left transition-all ${designMode === 'reference' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-1"><UploadTrayIcon className={`w-4 h-4 ${designMode === 'reference' ? 'text-indigo-600' : 'text-gray-400'}`} /><span className={`text-xs font-bold uppercase ${designMode === 'reference' ? 'text-indigo-700' : 'text-gray-500'}`}>Clone Style</span></div>
                                    <p className="text-[10px] text-gray-400 leading-tight">Copy layout from image</p>
                                </button>
                                <button onClick={() => setDesignMode('auto')} className={`p-3 rounded-xl border text-left transition-all ${designMode === 'auto' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200' : 'bg-white border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-1"><SparklesIcon className={`w-4 h-4 ${designMode === 'auto' ? 'text-purple-600' : 'text-gray-400'}`} /><span className={`text-xs font-bold uppercase ${designMode === 'auto' ? 'text-purple-700' : 'text-gray-500'}`}>Auto Design</span></div>
                                    <p className="text-[10px] text-gray-400 leading-tight">AI trends research</p>
                                </button>
                            </div>

                            {/* 2. Visual Assets */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <div className="flex justify-between items-center"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visual Assets</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Property Photo" image={propertyImage} onUpload={handleUpload(setPropertyImage)} onClear={() => setPropertyImage(null)} icon={<BuildingIcon className="w-5 h-5 text-indigo-400"/>} />
                                    {designMode === 'reference' && <CompactUpload label="Style Reference" image={referenceImage} onUpload={handleRefUpload} onClear={() => setReferenceImage(null)} icon={<LightbulbIcon className="w-5 h-5 text-yellow-400"/>} />}
                                    <CompactUpload label="Brand Logo" image={logoImage} onUpload={handleUpload(setLogoImage)} onClear={() => setLogoImage(null)} icon={<BrandKitIcon className="w-5 h-5 text-gray-400"/>} optional={brandStrategy === 'brand_kit'} />
                                    <CompactUpload label="Model (Optional)" image={modelImage} onUpload={handleUpload(setModelImage)} onClear={() => setModelImage(null)} icon={<UserIcon className="w-5 h-5 text-pink-400"/>} optional={true} />
                                </div>
                            </div>

                            {/* 3. Property Details */}
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Ad Content</label>
                                <InputField placeholder="Project Name (e.g. Skyline Towers)" value={texts.projectName} onChange={(e: any) => setTexts({...texts, projectName: e.target.value})} />
                                <div className="grid grid-cols-2 gap-3">
                                    <InputField placeholder="Unit (e.g. 3 BHK)" value={texts.unitType} onChange={(e: any) => setTexts({...texts, unitType: e.target.value})} />
                                    <InputField placeholder="Price (e.g. ₹2.5 Cr)" value={texts.price} onChange={(e: any) => setTexts({...texts, price: e.target.value})} />
                                </div>
                                <TextAreaField placeholder="Marketing Hook / Context (e.g. Luxury living in downtown)" value={texts.marketingContext} onChange={(e: any) => setTexts({...texts, marketingContext: e.target.value})} rows={2} />
                                
                                <button onClick={handleToggleAmenities} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${showAmenities ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                    <span className="text-xs font-bold uppercase">Amenities List</span>
                                    {showAmenities ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                </button>
                                {showAmenities && (
                                    <div className={RealtyStyles.amenitiesContainer}>
                                        {amenities.map((amenity, idx) => (
                                            <div key={idx} className={RealtyStyles.amenityRow}>
                                                <input type="text" value={amenity} onChange={(e) => updateAmenity(idx, e.target.value)} className={RealtyStyles.amenityInput} placeholder="e.g. Gym" />
                                                <button onClick={() => removeAmenity(idx)} className={RealtyStyles.amenityRemove}><XIcon className="w-4 h-4"/></button>
                                            </div>
                                        ))}
                                        <button onClick={addAmenity} className={RealtyStyles.addAmenityBtn}><PlusCircleIcon className="w-4 h-4"/> Add Item</button>
                                    </div>
                                )}

                                <button onClick={() => setShowContact(!showContact)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all mt-2 ${showContact ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                                    <div className="flex items-center gap-2"><span className="text-xs font-bold uppercase">Footer Details</span>{detectedFields && (detectedFields.hasContact || detectedFields.hasRera) && <span className="text-[9px] bg-green-200 text-green-800 px-1.5 rounded font-bold">Detected</span>}</div>
                                    {showContact ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
                                </button>
                                {showContact && (
                                    <div className="space-y-2 animate-fadeIn p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <input type="text" placeholder="Location" value={texts.location} onChange={(e) => setTexts({...texts, location: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" />
                                        <input type="text" placeholder="RERA ID" value={texts.rera} onChange={(e) => setTexts({...texts, rera: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" />
                                        <input type="text" placeholder="Contact Info" value={texts.contact} onChange={(e) => setTexts({...texts, contact: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setModelImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Realty Ad" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
