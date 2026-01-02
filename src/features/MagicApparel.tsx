
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { ApparelIcon, UploadIcon, XIcon, UserIcon, TrashIcon, UploadTrayIcon, CreditCoinIcon, SparklesIcon, PixaTryOnIcon, ArrowUpCircleIcon, InformationCircleIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ApparelStyles } from '../styles/features/MagicApparel.styles';

const CompactUpload: React.FC<{ label: string; subLabel?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className={ApparelStyles.compactUpload}><div className="flex justify-between items-baseline mb-2 ml-1"><label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>{subLabel && <span className="text-[10px] text-gray-400 font-medium">{subLabel}</span>}</div>{image ? (<div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-all`}><img src={image.url} className="max-w-full max-h-full object-contain" alt={label} /><button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"><XIcon className="w-4 h-4"/></button></div>) : (<div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}><div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">{icon}</div><p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p><p className="text-[9px] text-gray-300 mt-1">Best: Flat lay / White BG</p></div>)}<input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} /></div>
    );
};

export const MagicApparel: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topGarment, setTopGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomGarment, setBottomGarment] = useState<{ url: string; base64: Base64File } | null>(null);
    const [tuck, setTuck] = useState('');
    const [sleeve, setSleeve] = useState('');
    const [fit, setFit] = useState('');
    const [accessories, setAccessories] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 2;

    const cost = appConfig?.featureCosts['Pixa TryOn'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining ? ["Analyzing fabric fit...", "Retouching seams...", "Adjusting garment drape...", "Polishing fashion masterpiece..."] : ["Scanning model biometrics...", "Analyzing garment texture...", "Simulating fabric drape...", "Aligning seams & shadows...", "Finalizing fashion render..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                handleNewSession();
                setPersonImage({ url: URL.createObjectURL(file), base64 });
            } else { alert("Please drop a valid image file."); }
        }
    };

    const handleGenerate = async () => {
        if (!personImage || !auth.user) return; if (!topGarment && !bottomGarment) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try { const res = await generateApparelTryOn(personImage.base64.base64, personImage.base64.mimeType, topGarment ? topGarment.base64 : null, bottomGarment ? bottomGarment.base64 : null, undefined, { tuck, sleeve, fit, accessories }, auth.activeBrandKit); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa TryOn'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa TryOn'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Fashion Try-On Image");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa TryOn (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Fashion Editor: Tailoring complete!", type: 'success' });
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

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Virtual Try-On", lastCreationId || undefined);
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

    const handleNewSession = () => { setPersonImage(null); setTopGarment(null); setBottomGarment(null); setResultImage(null); setLastCreationId(null); setTuck(''); setSleeve(''); setFit(''); setAccessories(''); setIsRefineActive(false); };
    
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa TryOn');
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!personImage && (!!topGarment || !!bottomGarment) && !isLowCredits;
    const isControlsDisabled = !personImage || loading || isRefining;

    return (
        <>
            <FeatureLayout 
                title="Pixa TryOn" description="Virtual dressing room. Try clothes on any person instantly." icon={<PixaTryOnIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
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
                resultHeightClass="h-[800px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Try On Now" }} scrollRef={scrollRef}
                leftContent={
                    personImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isRefining) && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            <img src={personImage.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} />
                            {!loading && !isRefining && (<><button onClick={() => fileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Model"><UploadIcon className="w-5 h-5"/></button><button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40" title="Remove Model"><XIcon className="w-5 h-5"/></button></>)}
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center"><div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}><div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><UserIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div><div className="relative z-10 mt-6 text-center space-y-2 px-6"><p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Model Photo</p><div className="bg-gray-50 rounded-full px-3 py-1"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div><p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: Full body shot, neutral background.</p></div>{isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}</div></div>
                    )
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className={`space-y-6 p-1 animate-fadeIn transition-all duration-300 ${isControlsDisabled ? 'opacity-40 pointer-events-none select-none filter grayscale-[0.3]' : ''}`}>
                            <div>
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4"><span className={ApparelStyles.stepBadge}>2</span><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Garments</label></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Upper Wear" image={topGarment} onUpload={handleUpload(setTopGarment)} onClear={() => setTopGarment(null)} icon={<ApparelIcon className="w-6 h-6 text-indigo-400"/>} heightClass="h-44" />
                                    <CompactUpload label="Bottom Wear" image={bottomGarment} onUpload={handleUpload(setBottomGarment)} onClear={() => setBottomGarment(null)} icon={<ApparelIcon className="w-6 h-6 text-purple-400"/>} heightClass="h-44" />
                                </div>
                            </div>
                            <div className="border-t border-gray-100 pt-6 space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100 mb-4">
                                    <span className={ApparelStyles.stepBadge}>3</span>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Styling Preferences</label>
                                </div>
                                <SelectionGrid label="Tuck Style" options={['Untucked', 'Tucked In']} value={tuck} onChange={setTuck} />
                                <SelectionGrid label="Sleeve" options={['Long', 'Rolled Up']} value={sleeve} onChange={setSleeve} />
                                <SelectionGrid label="Fit" options={['Regular', 'Slim Fit', 'Oversized']} value={fit} onChange={setFit} />
                                <InputField label="Accessories" placeholder="e.g. gold watch, sunglasses" value={accessories} onChange={(e: any) => setAccessories(e.target.value)} />
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonImage)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Virtual Try-On" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
