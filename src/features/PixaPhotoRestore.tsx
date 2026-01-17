import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaRestoreIcon, UploadIcon, XIcon, CreditCoinIcon, MagicWandIcon, PaletteIcon, CheckIcon, InformationCircleIcon, ShieldCheckIcon, ArrowUpCircleIcon } from '../components/icons';
import { RefinementPanel } from '../components/RefinementPanel';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
// Fix: Import refineStudioImage from photoStudioService as it is not available in imageToolsService
import { colourizeImage } from '../services/imageToolsService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { RestoreStyles } from '../styles/features/PixaPhotoRestore.styles';

const ColorRestoreIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <g clipPath="url(#SVGXv8lpc2Y)">
                <path fill="#66e1ff" d="M23 12a10.8 10.8 0 0 1-.823 4.16l-8.848-3.624c.144-.35.14-.743-.01-1.09l8.83-3.703a11 11 0 0 1 .85 4.257"/>
                <path fill="#c2f3ff" d="M22.178 16.16a10.92 10.92 0 0 1-5.93 5.979l-3.693-8.82a1.42 1.42 0 0 0 .775-.783z"/>
                <path fill="#ff808c" d="M16.247 22.139a10.94 10.94 0 0 1-8.417.038l3.625-8.857c.171.076.357.117.545.115c.192.002.38-.039.555-.115z"/>
                <path fill="#ffbfc5" d="m11.456 13.32l-3.625 8.857a11.04 11.04 0 0 1-5.978-5.93l8.828-3.692c.146.348.425.624.775.765"/>
                <path fill="#78eb7b" d="M10.566 12c-.002.191.037.38.115.555l-8.829 3.692A11 11 0 0 1 1 12a10.8 10.8 0 0 1 .823-4.17l8.857 3.625a1.3 1.3 0 0 0-.114.545"/>
                <path fill="#c9f7ca" d="M11.446 10.68c-.352.14-.63.42-.765.775L1.824 7.83a10.98 10.98 0 0 1 5.93-5.979z"/>
                <path fill="#ffef5e" d="m16.162 1.823l-3.616 8.857a1.38 1.38 0 0 0-1.1 0L7.754 1.85A11 11 0 0 1 12 1.001a10.8 10.8 0 0 1 4.16.822"/>
                <path fill="#fff9bf" d="m22.149 7.743l-8.829 3.702a1.38 1.38 0 0 0-.775-.765l3.616-8.857h.01a11.02 11.02 0 0 1 5.978 5.92"/>
                <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M23 12a10.8 10.8 0 0 1-.823 4.16l-8.848-3.624c.144-.35.14-.743-.01-1.09l8.83-3.703a11 11 0 0 1 .85 4.257"/>
                <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M22.178 16.16a10.92 10.92 0 0 1-5.93 5.979l-3.693-8.82a1.42 1.42 0 0 0 .775-.783zm-5.931 5.979a10.94 10.94 0 0 1-8.417.038l3.625-8.857c.171.076.357.117.545.115c.192.002.38-.039.555-.115z"/>
                <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M1.852 16.247a11.04 11.04 0 0 0 5.979 5.93l3.625-8.857a1.4 1.4 0 0 1-.775-.765m-8.829 3.692l8.829-3.692m-8.829 3.692A11 11 0 0 1 1 12a10.8 10.8 0 0 1 .823-4.17m8.858 4.725a1.3 1.3 0 0 1-.115-.555a1.3 1.3 0 0 1 .114-.545M1.823 7.83l8.857 3.625M1.823 7.83a10.98 10.98 0 0 1 5.931-5.98m2.926 9.604c.136-.354.414-.635.766-.775m0 0L7.754 1.85m3.692 8.829c.35-.153.75-.153 1.1 0l3.616-8.857A10.8 10.8 0 0 0 12 1c-1.458 0-2.902.29-4.247.851"/>
                <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="m22.149 7.743l-8.829 3.702a1.38 1.38 0 0 0-.775-.765l3.616-8.857h.01a11.02 11.02 0 0 1 5.978 5.92"/>
            </g>
            <defs>
                <clipPath id="SVGXv8lpc2Y">
                    <path fill="#fff" d="M0 0h24v24H0z"/>
                </clipPath>
            </defs>
        </g>
    </svg>
);

const RestoreOnlyIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <g fill="none" strokeLinejoin="round" strokeWidth="4">
            <path fill="#2F88FF" stroke="#000" d="M36.686 15.171C37.9364 16.9643 38.8163 19.0352 39.2147 21.2727H44V26.7273H39.2147C38.8163 28.9648 37.9364 31.0357 36.686 32.829L40.0706 36.2137L36.2137 40.0706L32.829 36.686C31.0357 37.9364 28.9648 38.8163 26.7273 39.2147V44H21.2727V39.2147C19.0352 38.8163 16.9643 37.9364 15.171 36.686L11.7863 40.0706L7.92939 36.2137L11.314 32.829C10.0636 31.0357 9.18372 28.9648 8.78533 26.7273H4V21.2727H8.78533C9.18372 19.0352 10.0636 16.9643 11.314 15.171L7.92939 11.7863L11.7863 7.92939L15.171 11.314C16.9643 10.0636 19.0352 9.18372 21.2727 8.78533V4H26.7273V8.78533C28.9648 9.18372 31.0357 10.0636 32.829 11.314L36.2137 7.92939L40.0706 11.7863L36.686 15.171Z"/>
            <path fill="#43CCF8" stroke="#fff" d="M24 29C26.7614 29 29 26.7614 29 24C29 21.2386 26.7614 19 24 19C21.2386 19 19 21.2386 19 24C19 26.7614 21.2386 29 24 29Z"/>
        </g>
    </svg>
);

const ModeCard: React.FC<{ 
    title: string; 
    description: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void; 
    variant: 'restore' | 'color'; 
}> = ({ title, description, icon, selected, onClick, variant }) => {
    return (
        <button 
            onClick={onClick} 
            className={`
                ${RestoreStyles.modeCard} 
                ${variant === 'restore' ? RestoreStyles.modeCardRestore : RestoreStyles.modeCardColor}
                ${selected ? RestoreStyles.modeCardSelected : RestoreStyles.modeCardInactive}
            `}
        >
            <div className={`
                ${RestoreStyles.orb} 
                ${variant === 'restore' ? RestoreStyles.orbRestore : RestoreStyles.orbColor}
            `}></div>
            <div className={RestoreStyles.iconGlass}>
                <div className={`${selected ? 'scale-110' : ''} transition-all duration-300 w-full h-full flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
            {selected && (
                <div className={RestoreStyles.checkBadge}>
                    <div className={RestoreStyles.checkIconBox}>
                        <CheckIcon className="w-4 h-4 text-white" />
                    </div>
                </div>
            )}
            <div className={RestoreStyles.contentWrapper}>
                <h3 className={RestoreStyles.title}>{title}</h3>
                <p className={RestoreStyles.desc}>{description}</p>
                {selected && (
                    <div className={RestoreStyles.identityBadge}>
                        <ShieldCheckIcon className="w-2.5 h-2.5 text-indigo-500" />
                        <span className={RestoreStyles.identityText}>Forensic Anchor Active</span>
                    </div>
                )}
            </div>
        </button>
    );
};

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

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 5;

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa Photo Restore'] || appConfig?.featureCosts['Magic Photo Colour'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => { 
        let interval: any; 
        if (loading || isRefining) { 
            const steps = isRefining ? ["Analyzing biometric stability...", "Refining forensic details...", "Polishing masterpieces...", "Finalizing refined output..."] : ["Scanning damage patterns...", "Forensic Identity Locking...", "Historical era matching...", "Reconstructing biometrics...", "Polishing final pixels..."]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 2000); 
        } 
        return () => clearInterval(interval); 
    }, [loading, isRefining]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } e.target.value = ''; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); setImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } else { alert("Please drop a valid image file."); } }; };

    const handleGenerate = async () => {
        if (!image || !restoreMode || !auth.user) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try { const res = await colourizeImage(image.base64.base64, image.base64.mimeType, restoreMode, auth.activeBrandKit); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); try { const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Photo Restore'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Photo Restore'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (persistenceError) { console.warn("Persistence/Credit deduction failed:", persistenceError); } } catch (e) { console.error(e); alert("Restoration failed. Please try again with a simpler image."); } finally { setLoading(false); }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Restored Historical Photo");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa Restore (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Restoration Retoucher: Pixels polished!", type: 'success' });
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

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Restored Image", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setImage(null); setResultImage(null); setRestoreMode(null); setLastCreationId(null); setIsRefineActive(false); };
    const handleEditorSave = async (newUrl: string) => { setResultImage(newUrl); if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!image && !!restoreMode && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Photo Restore" description="Professional restoration suite. Fix damage, enhance resolution, and optionally colorize with 100% identity accuracy." icon={<PixaRestoreIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>} rawIcon={true} creditCost={cost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
                resultHeightClass="h-[750px]" hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ 
                    className: "!bg-[#F9D230] !text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] hover:!bg-[#dfbc2b]", 
                    hideIcon: true, 
                    label: "Begin Forensic Restoration" 
                }} 
                scrollRef={scrollRef}
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
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isRefining) && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-2 bg-white/50 rounded-full overflow-hidden shadow-lg mt-6 border border-white/20">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-[progress_2s_ease-in-out_infinite] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                    </div>
                                    <p className="text-sm font-black text-indigo-900 tracking-widest uppercase animate-pulse mt-4 bg-white/80 px-4 py-2 rounded-full shadow-sm">{loadingText}</p>
                                </div>
                            )}
                            <img src={image.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Original" />
                            {!loading && !isRefining && (<><button onClick={() => fileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Image"><UploadIcon className="w-5 h-5"/></button></>)}<style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
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
                            <div className={RestoreStyles.modeGrid}>
                                <ModeCard 
                                    title="Colour & Restore" 
                                    description="Repairs damage + AI Colorization" 
                                    icon={<ColorRestoreIcon className="w-full h-full"/>} 
                                    selected={restoreMode === 'restore_color'} 
                                    onClick={() => setRestoreMode('restore_color')} 
                                    variant="color"
                                />
                                <ModeCard 
                                    title="Restore Only" 
                                    description="Repairs damage while keeping original BW soul" 
                                    icon={<RestoreOnlyIcon className="w-full h-full"/>} 
                                    selected={restoreMode === 'restore_only'} 
                                    onClick={() => setRestoreMode('restore_only')} 
                                    variant="restore"
                                />
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