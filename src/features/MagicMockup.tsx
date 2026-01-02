
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { MockupIcon, UploadIcon, XIcon, UploadTrayIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, TrashIcon, PaletteIcon, ArrowUpCircleIcon, PixaMockupIcon, CheckIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MockupStyles } from '../styles/features/MagicMockup.styles';

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [targetObject, setTargetObject] = useState('');
    const [customObject, setCustomObject] = useState(''); 
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('');
    const [objectColor, setObjectColor] = useState(''); 
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 2;

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Mockups'] || appConfig?.featureCosts['Magic Mockup'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = designImage && userCredits < cost;

    const objectOptions = ['T-Shirt', 'Hoodie', 'iPhone 15', 'MacBook', 'Coffee Mug', 'Water Bottle', 'Tote Bag', 'Notebook', 'Business Card', 'Packaging Box', 'Neon Sign', 'Wall Sign', 'Other / Custom'];
    const materialOptions = ['Standard Ink', 'Embroidery', 'Gold Foil', 'Silver Foil', 'Deboss', 'Emboss', 'Laser Etch', 'Smart Object'];
    const vibeOptions = ['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban'];
    
    const premiumColors = [
        { name: 'White', hex: '#FFFFFF', isLight: true },
        { name: 'Black', hex: '#1A1A1E', isLight: false },
        { name: 'Slate', hex: '#475569', isLight: false },
        { name: 'Navy', hex: '#1E3A8A', isLight: false },
        { name: 'Forest', hex: '#14532D', isLight: false },
        { name: 'Burgundy', hex: '#7F1D1D', isLight: false },
        { name: 'Cream', hex: '#F5F5DC', isLight: true },
    ];

    useEffect(() => { let interval: any; if (loading || isRefining) { const steps = isRefining ? ["Analyzing mockup surface...", "Adjusting design anchors...", "Refining material physics...", "Polishing 4K render..."] : ["Pixa is mapping surface...", "Pixa is simulating physics...", "Pixa is calculating reflections...", "Pixa is rendering textures...", "Pixa is polishing pixels..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 1500); } return () => clearInterval(interval); }, [loading, isRefining]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setDesignImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } e.target.value = ''; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); setDesignImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } else { alert("Please drop a valid image file."); } } };

    const handleGenerate = async () => {
        const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
        if (!designImage || !auth.user || !finalTarget || !material || !sceneVibe) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        try { const res = await generateMagicMockup(designImage.base64.base64, designImage.base64.mimeType, finalTarget, material, sceneVibe, objectColor, auth.activeBrandKit); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Mockups'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Mockups'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (e) { console.error(e); alert("Generation failed. Please try again."); } finally { setLoading(false); }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "3D Product Mockup");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa Mockup (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Mockup Retoucher: Design updated!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Mockup Generation", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setDesignImage(null); setResultImage(null); setTargetObject(''); setCustomObject(''); setMaterial(''); setSceneVibe(''); setObjectColor(''); setLastCreationId(null); setIsRefineActive(false); };
    const handleEditorSave = async (newUrl: string) => { setResultImage(newUrl); if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
    const canGenerate = !!designImage && !!finalTarget && !!material && !!sceneVibe && !isLowCredits;

    const isCustomActive = objectColor && !premiumColors.find(c => c.name === objectColor || c.hex.toLowerCase() === objectColor.toLowerCase());

    return (
        <>
            <FeatureLayout 
                title="Pixa Mockups" description="The Reality Engine. Turn flat designs into photorealistic physical objects with accurate material physics." icon={<PixaMockupIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                canvasOverlay={<RefinementPanel isActive={isRefineActive && !!resultImage} isRefining={isRefining} onClose={() => setIsRefineActive(false)} onRefine={handleRefine} refineCost={refineCost} />}
                customActionButtons={resultImage ? (
                    <button 
                        onClick={() => setIsRefineActive(!isRefineActive)}
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        <span>Make Changes</span>
                    </button>
                ) : null}
                resultHeightClass="h-[800px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Mockup" }} scrollRef={scrollRef}
                leftContent={
                    designImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isRefining) && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                            <img src={designImage.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Design" />
                            {!loading && !isRefining && (<button onClick={() => fileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Design"><UploadIcon className="w-5 h-5"/></button>)}
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><PixaMockupIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div>
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Design / Logo</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High-res PNG with transparent background.</p>
                            </div>
                            {isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}</div>
                    )
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>
                    ) : (
                        <div className={`space-y-8 p-1 animate-fadeIn transition-all duration-300 ${!designImage || loading || isRefining ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            <div><div className="flex items-center justify-between mb-3 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Select Item</label></div><div className="flex flex-wrap gap-2">{objectOptions.map(opt => (<button key={opt} onClick={() => { setTargetObject(opt); if(opt !== 'Other / Custom') autoScroll(); }} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform active:scale-95 ${targetObject === opt ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm'}`}>{opt}</button>))}</div>{targetObject === 'Other / Custom' && (<div className="mt-3 animate-fadeIn"><InputField placeholder="Describe object (e.g. Vintage Hat)" value={customObject} onChange={(e: any) => setCustomObject(e.target.value)} /></div>)}</div>
                            <SelectionGrid label="2. Material Physics" options={materialOptions} value={material} onChange={(val) => { setMaterial(val); autoScroll(); }} />
                            <SelectionGrid label="3. Scene Vibe" options={vibeOptions} value={sceneVibe} onChange={setSceneVibe} />
                            
                            <div className="animate-fadeIn">
                                <div className="flex items-center justify-between mb-4 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">4. Object Colour</label>
                                    {objectColor && (
                                        <button onClick={() => setObjectColor('')} className="text-[10px] text-red-500 font-bold hover:bg-red-50 px-2 py-1 rounded transition-colors">
                                            Reset
                                        </button>
                                    )}
                                </div>
                                <div className={MockupStyles.colorGrid}>
                                    {premiumColors.map(c => {
                                        const isSelected = objectColor === c.name || objectColor === c.hex;
                                        return (
                                            <div key={c.name} className={MockupStyles.colorItem}>
                                                <button 
                                                    onClick={() => setObjectColor(c.name)} 
                                                    className={`${MockupStyles.colorSwatch} ${isSelected ? MockupStyles.colorSwatchActive : MockupStyles.colorSwatchInactive}`} 
                                                    style={{ backgroundColor: c.hex }} 
                                                    title={c.name}
                                                >
                                                    {isSelected && (
                                                        <CheckIcon className={c.isLight ? MockupStyles.checkIconDark : MockupStyles.checkIcon} />
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className={MockupStyles.colorItem}>
                                        <button className={`${MockupStyles.customColorBtn} ${isCustomActive ? MockupStyles.colorSwatchActive : ''}`} title="Pick Custom Color">
                                            <div 
                                                className={MockupStyles.customColorPreview} 
                                                style={{ backgroundColor: isCustomActive ? objectColor : '#f3f4f6', backgroundImage: !isCustomActive ? 'linear-gradient(45deg, #f87171, #60a5fa, #34d399)' : 'none' }}
                                            ></div>
                                            <input 
                                                type="color" 
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                                                value={objectColor && objectColor.startsWith('#') ? objectColor : '#4d7cff'} 
                                                onChange={(e) => setObjectColor(e.target.value)} 
                                            />
                                        </button>
                                        <span className={`${MockupStyles.colorLabel} ${isCustomActive ? MockupStyles.colorLabelActive : ''}`}>Custom</span>
                                    </div>
                                </div>

                                {objectColor && (
                                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm w-fit animate-fadeIn">
                                        <div className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: objectColor.startsWith('#') ? objectColor : premiumColors.find(c => c.name === objectColor)?.hex }}></div>
                                        <span className="text-[10px] font-black text-indigo-700 uppercase">{objectColor}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Mockups" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
