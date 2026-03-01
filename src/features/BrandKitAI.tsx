
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { LightbulbIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, BrandKitIcon, MagicWandIcon, CopyIcon, MagicAdsIcon, PlusIcon, CloudUploadIcon, ArrowRightIcon, ReplicaIcon, ReimagineIcon, CreditCardIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateStyledBrandAsset } from '../services/brandStylistService';
import { deductCredits, saveCreation, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { LoadingOverlay } from '../components/LoadingOverlay';
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

export const BrandStylistAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
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
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Brand Stylist AI'] || appConfig?.featureCosts['Pixa AdMaker'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = '';
    };

    const handleGenerate = async () => {
        // Reference is now optional
        if (!productImage || !auth.user || !description) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        // Determine Loading Text based on mode
        const isAutoPilot = !referenceImage;
        setLoadingText(isAutoPilot ? "Pixa Agent is Researching Trends..." : "Pixa is Analyzing, Relighting & Harmonizing...");
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const assetUrl = await generateStyledBrandAsset(
                productImage.base64.base64,
                productImage.base64.mimeType,
                referenceImage?.base64.base64 || '', // Pass empty if missing
                referenceImage?.base64.mimeType || '', // Pass empty if missing
                logoImage?.base64.base64,
                logoImage?.base64.mimeType,
                productName,
                website,
                specialOffer,
                address,
                description,
                genMode,
                language,
                'physical',
                undefined,
                'Modern Sans',
                auth.user?.basePlan || undefined
            );
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); setResultImage(blobUrl);
            const finalImageUrl = `data:image/png;base64,${assetUrl}`; const creationId = await saveCreation(auth.user.uid, finalImageUrl, 'Pixa AdMaker'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa AdMaker'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message || "Please try again."}`); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Ad Creative", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setProductImage(null); setLogoImage(null); setReferenceImage(null); setResultImage(null); setProductName(''); setWebsite(''); setSpecialOffer(''); setAddress(''); setDescription(''); setGenMode('replica'); setLanguage('English'); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa AdMaker (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    
    // Updated validity check: Reference is now optional
    const canGenerate = !!productImage && !isLowCredits && !!description;

    return (
        <>
            <FeatureLayout
                title="Pixa AdMaker" description="Turn your product photos into high-converting ad creatives by mimicking successful styles." icon={<MagicAdsIcon className="w-14 h-14" />} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} 
                creationId={lastCreationId}
                onResetResult={undefined} // Removed duplicate regenerate
                onNewSession={undefined} // Removed duplicate new session
                customActionButtons={null} // Removed duplicate editor
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null} 
                resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits}
                generateButtonStyle={{ 
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", 
                    hideIcon: true, 
                    label: "Generate Ad" 
                }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        <LoadingOverlay 
                            isVisible={loading} 
                            loadingText={loadingText} 
                            gradient={genMode === 'remix' ? 'from-purple-400 to-pink-500' : 'from-blue-400 to-indigo-500'} 
                        />
                        {!loading && (
                            <div className="text-center opacity-50 select-none">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${genMode === 'remix' ? 'bg-purple-50' : 'bg-blue-50'}`}>
                                    <MagicAdsIcon className={`w-10 h-10 ${genMode === 'remix' ? 'text-purple-500' : 'text-blue-500'}`} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Ad Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload Product & Reference to preview.</p>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                This generation requires <span className="font-bold text-gray-800">{cost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                            </p>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className={`space-y-8 p-2 animate-fadeIn flex flex-col h-full relative ${loading ? 'opacity-50 pointer-events-none cursor-not-allowed grayscale-[0.5]' : ''}`}>
                            
                            {/* Row 1: Assets */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">1</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Source Assets</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload
                                        label="Product"
                                        uploadText="Upload Product"
                                        image={productImage}
                                        onUpload={handleUpload(setProductImage)}
                                        onClear={() => setProductImage(null)}
                                        icon={<CloudUploadIcon className="w-5 h-5 text-blue-500" />}
                                    />
                                    <CompactUpload
                                        label="Logo"
                                        uploadText="Upload Logo"
                                        image={logoImage}
                                        onUpload={handleUpload(setLogoImage)}
                                        onClear={() => setLogoImage(null)}
                                        icon={<CloudUploadIcon className="w-5 h-5 text-blue-500" />}
                                        optional={true}
                                    />
                                </div>
                            </div>

                            {/* Row 2: Reference */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold">2</span>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Style Reference</label>
                                </div>
                                <CompactUpload
                                    label="Ad / Design Image"
                                    uploadText="Upload Reference Image"
                                    image={referenceImage}
                                    onUpload={handleUpload(setReferenceImage)}
                                    onClear={() => setReferenceImage(null)}
                                    icon={<CloudUploadIcon className="w-5 h-5 text-yellow-500" />}
                                    heightClass="h-40"
                                    optional={true} // Marked as Optional
                                />
                            </div>

                            {/* Row 3: Mode / Auto-Pilot - Only show if reference exists */}
                            {referenceImage && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">3</span>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Creativity Level</label>
                                    </div>
                                    <div className={BrandStylistStyles.modeGrid}>
                                        <button 
                                            onClick={() => setGenMode('replica')} 
                                            className={`${BrandStylistStyles.modeCard} ${genMode === 'replica' ? BrandStylistStyles.modeCardReplica : BrandStylistStyles.modeCardInactive}`}
                                        >
                                            <div className={`${BrandStylistStyles.orb} ${BrandStylistStyles.orbReplica}`}></div>
                                            <div className={BrandStylistStyles.iconGlass}>
                                                <ReplicaIcon className={`w-6 h-6 ${genMode === 'replica' ? BrandStylistStyles.iconReplica : BrandStylistStyles.iconInactive}`} />
                                            </div>
                                            <div className={BrandStylistStyles.contentWrapper}>
                                                <h3 className={BrandStylistStyles.modeTitle}>Replica</h3>
                                                <p className={BrandStylistStyles.modeDesc}>Strictly copy layout & lighting.</p>
                                            </div>
                                            <div className={BrandStylistStyles.actionBtn}>
                                                <ArrowRightIcon className={BrandStylistStyles.actionIcon}/>
                                            </div>
                                        </button>

                                        <button 
                                            onClick={() => setGenMode('remix')} 
                                            className={`${BrandStylistStyles.modeCard} ${genMode === 'remix' ? BrandStylistStyles.modeCardRemix : BrandStylistStyles.modeCardInactive}`}
                                        >
                                            <div className={`${BrandStylistStyles.orb} ${BrandStylistStyles.orbRemix}`}></div>
                                            <div className={BrandStylistStyles.iconGlass}>
                                                <ReimagineIcon className={`w-6 h-6 ${genMode === 'remix' ? BrandStylistStyles.iconRemix : BrandStylistStyles.iconInactive}`} />
                                            </div>
                                            <div className={BrandStylistStyles.contentWrapper}>
                                                <h3 className={BrandStylistStyles.modeTitle}>Reimagine</h3>
                                                <p className={BrandStylistStyles.modeDesc}>Use style but invent layout.</p>
                                            </div>
                                            <div className={BrandStylistStyles.actionBtn}>
                                                <ArrowRightIcon className={BrandStylistStyles.actionIcon}/>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Row 4: Text Content */}
                            <div className="space-y-5 pt-4 border-t border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Target Language</label>
                                    <div className="flex gap-2">
                                        {['English', 'Hindi', 'Marathi'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setLanguage(lang)}
                                                className={`${BrandStylistStyles.languageButton} ${
                                                    language === lang
                                                        ? BrandStylistStyles.langActive
                                                        : BrandStylistStyles.langInactive
                                                }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">4</span>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ad Copy Details</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <InputField placeholder="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                                        <InputField placeholder="Offer / CTA (Optional)" value={specialOffer} onChange={(e: any) => setSpecialOffer(e.target.value)} />
                                        <InputField placeholder="Website (Optional)" value={website} onChange={(e: any) => setWebsite(e.target.value)} />
                                        <InputField placeholder="Location (Optional)" value={address} onChange={(e: any) => setAddress(e.target.value)} />
                                    </div>
                                    <InputField
                                        label="Context (Required)"
                                        placeholder="e.g. Organic Coffee, morning energy boost"
                                        value={description}
                                        onChange={(e: any) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}
            
            {/* Refund/Report Modal */}
            {showRefundModal && (
                <RefundModal 
                    onClose={() => setShowRefundModal(false)} 
                    onConfirm={handleRefundRequest} 
                    isProcessing={isRefunding} 
                    featureName="Ad Creative" 
                />
            )}
            
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
