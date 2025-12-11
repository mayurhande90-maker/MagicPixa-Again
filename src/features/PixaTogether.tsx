
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, InputField, TextAreaField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon, UploadIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import { RefundModal } from '../components/RefundModal';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

const CompactUpload: React.FC<{ label: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-2xl border border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-20 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-blue-400 bg-gray-50/50 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2.5 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wider text-center px-2">{`Upload ${label}`}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [refPose, setRefPose] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Modes
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [relationship, setRelationship] = useState('Friends');
    
    // Creative Params
    const [mood, setMood] = useState('Happy');
    const [environment, setEnvironment] = useState('Outdoor Park');
    const [pose, setPose] = useState('Standing Together');
    const [timeline, setTimeline] = useState('Present Day');
    const [universe, setUniverse] = useState('Photorealistic');
    const [customDescription, setCustomDescription] = useState('');

    // Settings
    const [faceStrength, setFaceStrength] = useState(0.8);
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Match Vibe');
    const [locks, setLocks] = useState({ age: true, hair: true, accessories: false });
    const [autoFix, setAutoFix] = useState(true);

    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { let interval: any; if (loading) { const steps = ["Analyzing facial biometrics...", "Locking identity features...", "Constructing scene geometry...", "Blending lighting & shadows...", "Finalizing high-res output..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2500); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            const config: PixaTogetherConfig = {
                mode,
                relationship,
                mood,
                environment,
                pose,
                timeline,
                universe,
                customDescription,
                referencePoseBase64: refPose?.base64.base64,
                referencePoseMimeType: refPose?.base64.mimeType,
                faceStrength,
                clothingMode,
                locks,
                autoFix
            };

            const res = await generateMagicSoul(personA.base64.base64, personA.base64.mimeType, personB.base64.base64, personB.base64.mimeType, config);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Together'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
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
            // Pass current config for context
            const config: PixaTogetherConfig = { mode, relationship, mood, environment, pose, timeline, universe, customDescription, faceStrength, clothingMode, locks, autoFix };
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Pixa Together", lastCreationId || undefined, config); 
            if (res.success) { 
                if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } 
            } 
            setShowRefundModal(false); 
        } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } 
    };
    
    const handleNewSession = () => { setPersonA(null); setPersonB(null); setRefPose(null); setResultImage(null); setLastCreationId(null); setCustomDescription(''); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!personA && !!personB && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Together" description="Merge two people into one hyper-realistic photo. Choose a theme, era, or reenact a specific pose." icon={<PixaTogetherIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Magic" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                        
                        {!personA && !personB ? (
                            <div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4"><PixaTogetherIcon className="w-10 h-10 text-pink-500" /></div><h3 className="text-xl font-bold text-gray-300">Duo Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload two people to begin.</p></div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {/* Visual Representation of inputs */}
                                <div className="relative w-64 h-80">
                                    {personA && <div className={PixaTogetherStyles.visualCardA}><img src={personA.url} className="w-full h-full object-cover" /><div className={PixaTogetherStyles.visualLabel}>Person A</div></div>}
                                    {personB && <div className={PixaTogetherStyles.visualCardB} style={{ left: personA ? '40px' : '0', top: personA ? '40px' : '0' }}><img src={personB.url} className="w-full h-full object-cover" /><div className={PixaTogetherStyles.visualLabel}>Person B</div></div>}
                                </div>
                                {mode === 'reenact' && refPose && (
                                    <div className={PixaTogetherStyles.refPoseOverlay}>
                                        <img src={refPose.url} className="w-full h-full object-cover" />
                                        <span className={PixaTogetherStyles.refPoseBadge}>Target Pose</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            {/* 1. People Uploads */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">1. Select People</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload label="Person A" image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-5 h-5 text-indigo-400"/>} />
                                    <CompactUpload label="Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-5 h-5 text-pink-400"/>} />
                                </div>
                            </div>

                            {/* 2. Mode Selection */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">2. Generation Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setMode('creative')} className={`p-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'creative' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white border-gray-200 text-gray-500'}`}>Creative</button>
                                    <button onClick={() => setMode('reenact')} className={`p-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'reenact' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white border-gray-200 text-gray-500'}`}>Re-Enact</button>
                                    <button onClick={() => setMode('professional')} className={`p-2 rounded-xl text-[10px] font-bold uppercase border transition-all ${mode === 'professional' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-500'}`}>Pro Headshot</button>
                                </div>
                            </div>

                            {/* 3. Conditional Controls */}
                            {mode === 'creative' && (
                                <div className="animate-fadeIn space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <SelectionGrid label="Relationship" options={['Couple', 'Friends', 'Siblings', 'Business Partners']} value={relationship} onChange={setRelationship} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <SelectionGrid label="Vibe / Mood" options={['Happy', 'Romantic', 'Serious', 'Funny', 'Candid']} value={mood} onChange={setMood} />
                                        <SelectionGrid label="Setting" options={['Outdoor Park', 'Beach', 'City Street', 'Cozy Home', 'Cafe']} value={environment} onChange={setEnvironment} />
                                    </div>
                                    <div className="pt-2 border-t border-gray-200">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Magic Controls (Optional)</label>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600"><option>Present Day</option><option>1990s Vintage</option><option>1920s Noir</option><option>Future Sci-Fi</option><option>Medieval</option></select>
                                            <select value={universe} onChange={(e) => setUniverse(e.target.value)} className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600"><option>Photorealistic</option><option>Disney Pixar</option><option>Anime Style</option><option>Oil Painting</option><option>Cyberpunk</option></select>
                                        </div>
                                        <InputField placeholder="Custom Prompt (e.g. riding a bike together in Paris)" value={customDescription} onChange={(e: any) => setCustomDescription(e.target.value)} />
                                    </div>
                                </div>
                            )}

                            {mode === 'reenact' && (
                                <div className="animate-fadeIn bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm"><CameraIcon className="w-5 h-5 text-blue-500" /></div>
                                        <div><h4 className="text-sm font-bold text-blue-900">Pose Reference</h4><p className="text-xs text-blue-600/80 mb-3">Upload a photo to copy the exact pose and composition.</p></div>
                                    </div>
                                    <CompactUpload label="Reference Pose" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<UploadIcon className="w-5 h-5 text-blue-400"/>} heightClass="h-32" />
                                </div>
                            )}

                            {mode === 'professional' && (
                                <div className={PixaTogetherStyles.proModeBanner}><SparklesIcon className="w-4 h-4 text-blue-600 mb-1" /><span className="font-bold block mb-1">LinkedIn Mode Active</span><p>AI will automatically dress subjects in business attire and place them in a high-end studio or office setting.</p></div>
                            )}

                            {/* 4. Advanced Locks */}
                            <div className="pt-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block ml-1">Identity Locks</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setLocks({...locks, age: !locks.age})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${locks.age ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-200'}`}>Age {locks.age ? 'Locked' : ''}</button>
                                    <button onClick={() => setLocks({...locks, hair: !locks.hair})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${locks.hair ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-200'}`}>Hair {locks.hair ? 'Locked' : ''}</button>
                                    <button onClick={() => setLocks({...locks, accessories: !locks.accessories})} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${locks.accessories ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-400 border-gray-200'}`}>Glasses {locks.accessories ? 'Locked' : ''}</button>
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Together" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
