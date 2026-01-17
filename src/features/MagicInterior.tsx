import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { HomeIcon, UploadIcon, XIcon, ArrowUpCircleIcon, CreditCoinIcon, SparklesIcon, PixaInteriorIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateInteriorDesign } from '../services/interiorService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { InteriorStyles } from '../styles/features/MagicInterior.styles';

export const MagicInterior: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [spaceType, setSpaceType] = useState<'home' | 'office'>('home');
    const [roomType, setRoomType] = useState('');
    const [style, setStyle] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 5;

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Interior Design'] || appConfig?.featureCosts['Magic Interior'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = image && userCredits < cost;

    const homeRooms = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Bathroom', 'Home Office', 'Balcony/Patio', 'Gaming Room'];
    const officeRooms = ['Open Workspace', 'Private Office', 'Conference Room', 'Reception / Lobby', 'Break Room', 'Meeting Pod'];
    const homeStyles = ['Modern', 'Minimalist', 'Japanese', 'American', 'Coastal', 'Traditional Indian', 'Arabic', 'Futuristic', 'African'];
    const officeStyles = ['Modern Corporate', 'Minimalist', 'Industrial', 'Creative / Artistic', 'Luxury Executive', 'Biophilic / Nature-Inspired', 'Tech Futuristic', 'Traditional Indian'];
    const activeRoomOptions = spaceType === 'home' ? homeRooms : officeRooms;
    const activeStyleOptions = spaceType === 'home' ? homeStyles : officeStyles;

    useEffect(() => { 
        let interval: any; 
        if (loading || isRefining) { 
            const steps = isRefining 
                ? ["Analyzing floor plan...", "Synthesizing new materials...", "Recalculating lighting spill...", "Polishing 4K render..."]
                : ["Pixa Vision: Calculating room geometry...", "Pixa Vision: Extracting 3D depth map...", "Design Engine: Simulating light transport...", "Design Engine: Finalizing photorealistic output..."]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 2500); 
        } 
        return () => clearInterval(interval); 
    }, [loading, isRefining]);

    useEffect(() => { return () => { if (result) URL.revokeObjectURL(result); }; }, [result]);
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); handleNewSession(); setImage({ url: URL.createObjectURL(file), base64 }); } };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); handleNewSession(); setImage({ url: URL.createObjectURL(file), base64 }); } else { alert("Please drop a valid image file."); } } };

    const handleGenerate = async () => {
        if (!image || !auth.user) return; if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResult(null); setLastCreationId(null);
        try {
            const res = await generateInteriorDesign(image.base64.base64, image.base64.mimeType, style, spaceType, roomType, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Interior Design'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Interior Design'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) { setMilestoneBonus(bonus); } } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) { console.error(e); alert("Generation failed. Please try again."); } finally { setLoading(false); }
    };

    const handleRefine = async (refineText: string) => {
        if (!result || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(result);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Interior Design Rendering");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa Interior (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Elite Interior Retoucher: Design refined!", type: 'success' });
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

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !result) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Interior Design", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResult(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setImage(null); setResult(null); setRoomType(''); setStyle(''); setLastCreationId(null); setIsRefineActive(false); };
    
    const handleEditorSave = async (newUrl: string) => { 
        // Fixed typo: renamed 'setResultImage' to 'setResult' to match state declaration
        setResult(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Interior Design'); 
            setLastCreationId(id); 
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!image && !isLowCredits && !!roomType && !!style;

    return (
        <>
            <FeatureLayout 
                title="Pixa Interior Design" description="Redesign any room in seconds. Pixa calculates depth and physics to transform your space realistically." icon={<PixaInteriorIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={result} creationId={lastCreationId}
                onResetResult={result ? undefined : handleGenerate} onNewSession={result ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
                resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                canvasOverlay={<RefinementPanel isActive={isRefineActive && !!result} isRefining={isRefining} onClose={() => setIsRefineActive(false)} onRefine={handleRefine} refineCost={refineCost} />}
                customActionButtons={result ? (
                    <button 
                        onClick={() => setIsRefineActive(!isRefineActive)}
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        <span>Make Changes</span>
                    </button>
                ) : null}
                resultHeightClass="h-[600px]" hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ 
                    className: "!bg-[#F9D230] !text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] hover:!bg-[#dfbc2b]", 
                    hideIcon: true,
                    label: "Generate Design"
                }} 
                scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {(loading || isRefining) && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                            <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} />
                            {!loading && !isRefining && (<><button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40" title="Cancel"><XIcon className="w-5 h-5"/></button><button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Photo"><UploadIcon className="w-5 h-5"/></button></>)}<style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center"><div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><HomeIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div>
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Room Photo</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High-res wide angle photo.</p>
                            </div>
                            {isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}
                        </div></div>
                    )
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b]">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={`space-y-6 p-1 animate-fadeIn transition-all duration-300 ${!image || loading || isRefining ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Space Type</label></div>
                                <div className="flex gap-4">
                                    <button onClick={() => { setSpaceType('home'); setRoomType(''); setStyle(''); autoScroll(); }} className={`${InteriorStyles.spaceTypeBtn} ${spaceType === 'home' ? InteriorStyles.spaceTypeActive : InteriorStyles.spaceTypeInactive}`}>Home</button>
                                    <button onClick={() => { setSpaceType('office'); setRoomType(''); setStyle(''); autoScroll(); }} className={`${InteriorStyles.spaceTypeBtn} ${spaceType === 'office' ? InteriorStyles.spaceTypeActive : InteriorStyles.spaceTypeInactive}`}>Office</button>
                                </div>
                            </div>
                            
                            <SelectionGrid label="2. Room Type" options={activeRoomOptions} value={roomType} onChange={(val) => { setRoomType(val); autoScroll(); }} />
                            {roomType && <SelectionGrid label="3. Design Style" options={activeStyleOptions} value={style} onChange={setStyle} />}
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Interior Design" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
