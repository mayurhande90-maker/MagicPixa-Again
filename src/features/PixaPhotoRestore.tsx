
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaRestoreIcon, UploadIcon, XIcon, CreditCoinIcon, MagicWandIcon, PaletteIcon, CheckIcon, InformationCircleIcon, ShieldCheckIcon, ArrowUpCircleIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { colourizeImage } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { RestoreStyles } from '../styles/features/PixaPhotoRestore.styles';

const ModeCard: React.FC<{ title: string; description: string; icon: React.ReactNode; selected: boolean; onClick: () => void; accentColor: string; }> = ({ title, description, icon, selected, onClick, accentColor }) => {
    return (
        <button onClick={onClick} className={`${RestoreStyles.modeCard} ${selected ? RestoreStyles.modeCardSelected : RestoreStyles.modeCardInactive}`}>
            <div className={`${RestoreStyles.iconBox} ${selected ? RestoreStyles.iconBoxSelected : `${RestoreStyles.iconBoxInactive} ${accentColor}`}`}>{icon}</div>
            <div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-1"><h3 className={`${RestoreStyles.title} ${selected ? RestoreStyles.titleSelected : RestoreStyles.titleInactive}`}>{title}</h3>{selected && <CheckIcon className="w-4 h-4 text-white" />}</div><p className={`${RestoreStyles.desc} ${selected ? RestoreStyles.descSelected : RestoreStyles.descInactive}`}>{description}</p>{selected && (<div className={RestoreStyles.identityBadge}><ShieldCheckIcon className="w-3 h-3 text-emerald-300" /><span className={RestoreStyles.identityText}>Identity Lock</span></div>)}</div>
            {selected && <div className={RestoreStyles.decor}></div>}
        </button>
    );
};

const SmartWarning: React.FC<{ issues: string[] }> = ({ issues }) => { if (issues.length === 0) return null; return (<div className="bg-orange-50 border border-orange-100 rounded-xl p-3 mb-4 flex items-start gap-2 animate-fadeIn mx-auto max-w-sm"><InformationCircleIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" /><div><p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Low Resolution Detected</p><ul className="list-disc list-inside text-xs text-orange-600 space-y-0.5">{issues.map((issue, idx) => (<li key={idx}>{issue}</li>))}</ul></div></div>); };

export const PixaPhotoRestore: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [restoreMode, setRestoreMode] = useState<'restore_color' | 'restore_only' | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa Photo Restore'] || appConfig?.featureCosts['Magic Photo Colour'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => { let interval: any; if (loading) { const steps = ["Scanning damage patterns...", "Forensic analysis...", "Historical era matching...", "Reconstructing biometrics...", "Finalizing details..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2000); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const validateImage = async (file: File): Promise<string[]> => { return new Promise((resolve) => { const img = new Image(); img.src = URL.createObjectURL(file); img.onload = () => { const warnings = []; if (img.width < 300 || img.height < 300) warnings.push("Image is very small. Restoration quality might be limited."); resolve(warnings); }; }); };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); const warnings = await validateImage(file); setImage({ url: URL.createObjectURL(file), base64, warnings }); setResultImage(null); } e.target.value = ''; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); const warnings = await validateImage(file); setImage({ url: URL.createObjectURL(file), base64, warnings }); setResultImage(null); } else { alert("Please drop a valid image file."); } }; };

    const handleGenerate = async () => {
        if (!image || !restoreMode || !auth.user) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try { const res = await colourizeImage(image.base64.base64, image.base64.mimeType, restoreMode); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); try { const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Photo Restore'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Photo Restore'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (persistenceError) { console.warn("Persistence/Credit deduction failed:", persistenceError); } } catch (e) { console.error(e); alert("Restoration failed. Please try again with a simpler image."); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Restored Image", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setImage(null); setResultImage(null); setRestoreMode(null); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Photo Restore (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!image && !!restoreMode && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Photo Restore" description="Professional restoration suite. Fix damage, enhance resolution, and optionally colorize." icon={<PixaRestoreIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultHeightClass="h-[750px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Begin Restoration" }} scrollRef={scrollRef}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-2 bg-white/50 rounded-full overflow-hidden shadow-lg mt-6 border border-white/20">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-[progress_2s_ease-in-out_infinite] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    </div>
                                    <p className="text-sm font-black text-indigo-900 tracking-widest uppercase animate-pulse mt-4 bg-white/80 px-4 py-2 rounded-full shadow-sm">{loadingText}</p>
                                </div>
                            )}
                            <img src={image.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Original" />
                            {!loading && (<><button onClick={() => fileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Image"><UploadIcon className="w-5 h-5"/></button>{image.warnings && image.warnings.length > 0 && (<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm"><SmartWarning issues={image.warnings} /></div>)}</>)}
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><PixaRestoreIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div><div className="relative z-10 mt-6 text-center space-y-2 px-6"><p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Old Photo</p><div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div><p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High quality scan (300 DPI+).</p></div>{isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}
                        </div>
                    )
                }
                rightContent={
                    <div className={`space-y-8 p-2 animate-fadeIn transition-all duration-300 ${!image ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                            <div className="h-8 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full"></div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Restoration Engine</h3>
                                <p className="text-xs text-gray-400 font-medium">Select your preferred output style</p>
                            </div>
                        </div>
                        {image && isLowCredits ? (
                            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-red-50/50 rounded-2xl border border-red-100 animate-fadeIn">
                                <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                                <p className="text-gray-500 mb-6 max-w-xs text-sm">Restoration requires {cost} credits.</p>
                                <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg pointer-events-auto">Recharge Now</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <ModeCard title="Colour & Restore" description="Repairs damage + AI Colorization. Best for black & white photos needing full revitalization." icon={<PaletteIcon className="w-6 h-6"/>} selected={restoreMode === 'restore_color'} onClick={() => setRestoreMode('restore_color')} accentColor="text-purple-500" />
                                <ModeCard title="Restore Only" description="Repairs damage while preserving original colors. Ideal for keeping the vintage aesthetic." icon={<MagicWandIcon className="w-6 h-6"/>} selected={restoreMode === 'restore_only'} onClick={() => setRestoreMode('restore_only')} accentColor="text-blue-500" />
                            </div>
                        )}
                        {!image && (
                            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium bg-gray-50/80 py-3 rounded-xl border border-gray-100 border-dashed">
                                <ArrowUpCircleIcon className="w-4 h-4" />
                                <span>Upload an image to enable these controls</span>
                            </div>
                        )}
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Restoration" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
