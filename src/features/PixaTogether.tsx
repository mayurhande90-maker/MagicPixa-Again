
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, InputField, TextAreaField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

const SmartWarning: React.FC<{ issues: string[] }> = ({ issues }) => {
    if (issues.length === 0) return null;
    return (<div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-2 flex items-start gap-2 animate-fadeIn"><InformationCircleIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" /><div><p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Smart Suggestion</p><ul className="list-disc list-inside text-xs text-orange-600 space-y-0.5">{issues.map((issue, idx) => (<li key={idx}>{issue}</li>))}</ul></div></div>);
};

const ModeCard: React.FC<{ title: string; description: string; icon: React.ReactNode; selected: boolean; onClick: () => void; }> = ({ title, description, icon, selected, onClick }) => (
    <button onClick={onClick} className={`${PixaTogetherStyles.modeCard} ${selected ? PixaTogetherStyles.modeCardSelected : PixaTogetherStyles.modeCardInactive}`}>
        {selected && <div className={PixaTogetherStyles.modeGradient}></div>}
        <div className={`${PixaTogetherStyles.iconContainer} ${selected ? PixaTogetherStyles.iconSelected : PixaTogetherStyles.iconInactive}`}>{icon}</div>
        <h3 className={`${PixaTogetherStyles.title} ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{title}</h3>
        <p className={`${PixaTogetherStyles.desc} ${selected ? 'text-indigo-500 font-bold' : 'text-gray-400'}`}>{description}</p>
    </button>
);

const CompactUpload: React.FC<{ label: string; image: { url: string; warnings?: string[] } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (<div className="relative w-full group h-full"><div className="flex items-center justify-between mb-2 px-1"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label></div>{image ? (<div className="flex flex-col gap-2"><div className={`relative w-full ${heightClass} bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center justify-center overflow-hidden group-hover:shadow-xl transition-shadow`}><img src={image.url} className="w-full h-full object-cover" alt={label} /><div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"><button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><XIcon className="w-4 h-4"/></button></div></div>{image.warnings && image.warnings.length > 0 && <SmartWarning issues={image.warnings} />}</div>) : (<div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} bg-gray-50/50 border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden`}><div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div><div className="relative z-10 p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform border border-gray-100">{icon}</div><p className="relative z-10 text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider">Select Photo</p><p className="relative z-10 text-[9px] text-gray-300 mt-1">Best: Clear face / Good lighting</p></div>)}<input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} /></div>);
};

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [referencePose, setReferencePose] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [relationship, setRelationship] = useState('Best Friends');
    const [mood, setMood] = useState('Travel / Beach');
    const [environmentPreset, setEnvironmentPreset] = useState('Goa Beach');
    const [customEnvironment, setCustomEnvironment] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [pose, setPose] = useState('Side-by-Side');
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Keep Original');
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [lastConfig, setLastConfig] = useState<PixaTogetherConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const relationshipOptions = ['Best Friends', 'Couple', 'Siblings', 'Parent & Child', 'Colleagues', 'Childhood Glow-up'];
    const moodOptions = ['Retro Childhood', 'Romantic Couple', 'Party / Nightlife', 'Travel / Beach', 'Studio Portrait', 'Stylized Cartoon'];
    const envOptions = ['Café', 'Mountain Trek', 'Goa Beach', '90s Classroom', 'Royal Palace', 'Rainy Street', 'Sunset Balcony', 'Custom'];
    const poseOptions = ['Side-by-Side', 'Hugging', 'Handshake', 'V-Pose', 'Back-to-Back', 'Walking (Dynamic)', 'Keep Original'];
    const clothingOptions = ['Keep Original', 'Match Vibe'];
    
    useEffect(() => { let interval: any; if (loading) { const steps = ["Analyzing facial structures...", "Matching skin tones & lighting...", "Simulating reality engine...", "Applying scene physics...", "Finalizing photo match..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 1500); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const validateImage = async (file: File): Promise<string[]> => { return new Promise((resolve) => { const img = new Image(); img.src = URL.createObjectURL(file); img.onload = () => { const warnings = []; if (img.width < 400 || img.height < 400) warnings.push("Low resolution: Face might be blurry."); resolve(warnings); }; }); };
    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); const warnings = await validateImage(file); setter({ url: URL.createObjectURL(file), base64, warnings }); } e.target.value = ''; };

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user) return; if (mode === 'reenact' && !referencePose) return; if (isLowCredits) { alert("Insufficient credits."); return; } setLoading(true); setResultImage(null); setLastCreationId(null);
        try {
            const config: PixaTogetherConfig = { mode, relationship: mode === 'creative' ? relationship : 'Neutral', mood: mode === 'creative' ? mood : '', environment: mode === 'creative' ? (environmentPreset === 'Custom' ? customEnvironment : environmentPreset) : '', pose: mode === 'creative' ? pose : '', customDescription: customDescription, timeline: 'Present Day', universe: 'Photorealistic', referencePoseBase64: referencePose?.base64.base64, referencePoseMimeType: referencePose?.base64.mimeType, faceStrength: 100, clothingMode: mode === 'professional' ? 'Professional Attire' : (clothingMode as any), locks: { age: true, hair: true, accessories: true }, autoFix: true }; setLastConfig(config);
            const res = await generateMagicSoul(personA.base64.base64, personA.base64.mimeType, personB.base64.base64, personB.base64.mimeType, config); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl); const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, `Pixa Together (${mode})`); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) { console.error(e); alert("Generation failed. Please try again."); } finally { setLoading(false); }
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "User generated image", lastCreationId || undefined, lastConfig || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setPersonA(null); setPersonB(null); setReferencePose(null); setResultImage(null); setCustomDescription(''); setLastCreationId(null); setMode('creative'); setRelationship('Best Friends'); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const isReenactValid = mode === 'reenact' ? !!referencePose : true; const canGenerate = !!personA && !!personB && isReenactValid && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Together" description="Reality Simulator. Merge two people into any scene, era, or art style." icon={<PixaTogetherIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} onResetResult={handleGenerate}  onNewSession={handleNewSession} resultHeightClass="h-[1000px]" hideGenerateButton={isLowCredits} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Reality" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-6 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                        <div className="flex flex-col items-center justify-center h-full w-full gap-6">
                            {(!personA && !personB) ? (<div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4"><PixaTogetherIcon className="w-10 h-10 text-pink-400" /></div><h3 className="text-xl font-bold text-gray-300">Reality Canvas</h3><p className="text-sm text-gray-300 mt-1">Select a mode to begin.</p></div>) : (<div className="relative w-full h-full flex items-center justify-center"><div className="grid grid-cols-2 gap-4 max-w-lg w-full">{personA && (<div className={PixaTogetherStyles.visualCardA}><img src={personA.url} className="w-full h-full object-cover" alt="Person A" /><div className={PixaTogetherStyles.visualLabel}>Person A</div></div>)}{personB && (<div className={PixaTogetherStyles.visualCardB}><img src={personB.url} className="w-full h-full object-cover" alt="Person B" /><div className={PixaTogetherStyles.visualLabel}>Person B</div></div>)}</div>{mode === 'reenact' && referencePose && (<div className={PixaTogetherStyles.refPoseOverlay}><img src={referencePose.url} className="w-full h-full object-cover rounded-lg" alt="Reference" /><div className={PixaTogetherStyles.refPoseBadge}>Target Pose</div></div>)}</div>)}
                        </div>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            <div className="grid grid-cols-2 gap-3"><ModeCard title="Creative" description="Merge in new scene" icon={<SparklesIcon className="w-6 h-6"/>} selected={mode === 'creative'} onClick={() => { setMode('creative'); autoScroll(); }} /><ModeCard title="Reenact" description="Copy a reference photo" icon={<CameraIcon className="w-6 h-6"/>} selected={mode === 'reenact'} onClick={() => { setMode('reenact'); autoScroll(); }} /></div>
                            {mode === 'reenact' && (<div className="animate-fadeIn p-4 bg-orange-50 rounded-2xl border border-orange-100"><div className="flex items-center gap-2 mb-3"><div className="bg-orange-100 p-1.5 rounded-lg"><InformationCircleIcon className="w-4 h-4 text-orange-600"/></div><span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Target Pose Required</span></div><CompactUpload label="Reference Pose Photo" image={referencePose} onUpload={handleUpload(setReferencePose)} onClear={() => setReferencePose(null)} icon={<CameraIcon className="w-5 h-5 text-orange-400"/>} /></div>)}
                            <div className="space-y-4"><div className="flex items-center justify-between mb-2 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cast</label></div><div className="grid grid-cols-2 gap-4"><CompactUpload label="Person A" image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-6 h-6 text-pink-400"/>} /><CompactUpload label="Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-6 h-6 text-blue-400"/>} /></div></div>
                            {mode === 'creative' && (<div className="space-y-6 animate-fadeIn pt-4 border-t border-gray-100"><SelectionGrid label="Relationship" options={relationshipOptions} value={relationship} onChange={setRelationship} /><SelectionGrid label="Environment" options={envOptions} value={environmentPreset} onChange={(val) => { setEnvironmentPreset(val); if(val) autoScroll(); }} />{environmentPreset === 'Custom' && <InputField placeholder="Describe location (e.g. Paris Cafe)" value={customEnvironment} onChange={(e: any) => setCustomEnvironment(e.target.value)} />}<SelectionGrid label="Vibe / Mood" options={moodOptions} value={mood} onChange={setMood} /><SelectionGrid label="Pose" options={poseOptions} value={pose} onChange={setPose} /><TextAreaField label="Custom Details (Optional)" placeholder="e.g. Make it sunset, vintage film style..." value={customDescription} onChange={(e: any) => setCustomDescription(e.target.value)} rows={2} /></div>)}
                            <div className="pt-4 border-t border-gray-100"><SelectionGrid label="Clothing Style" options={clothingOptions} value={clothingMode} onChange={(val) => setClothingMode(val as any)} /></div>
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Together" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
