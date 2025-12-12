
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone, SelectionGrid, InputField } from '../components/FeatureLayout';
import { PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon, UploadIcon, CheckIcon, LockIcon, UsersIcon, EngineIcon, BuildingIcon, DocumentTextIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import { RefundModal } from '../components/RefundModal';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

// --- CONFIGURATION CONSTANTS ---

const TIMELINE_ENVIRONMENTS: Record<string, string[]> = {
    'Present Day': ['Outdoor Park', 'Beach', 'Luxury Rooftop', 'City Street', 'Cozy Home', 'Cafe', 'Deep Forest', 'Modern Studio', 'Snowy Mountain', 'Sunset Beach'],
    'Future Sci-Fi': ['Neon City', 'Space Station', 'Cyberpunk Rooftop', 'Holo-Deck', 'Alien Planet', 'Starship Bridge', 'Crystal Forest', 'High-Tech Lab'],
    '1990s Vintage': ['90s Mall', 'Retro Arcade', 'Grunge Garage', 'Neon Diner', 'Video Store', 'High School Hallway', 'Suburban Street', 'Vintage Bedroom'],
    '1920s Noir': ['Jazz Club', 'Art Deco Hotel', 'Rainy Street', 'Speakeasy', 'Vintage Train', 'Gatsby Mansion', 'Smoky Bar', 'Classic Theater'],
    'Medieval': ['Castle Courtyard', 'Throne Room', 'Ancient Forest', 'Stone Village', 'Old Tavern', 'Battlefield', 'Mystic Ruins', 'Royal Garden']
};

// --- LIGHTWEIGHT PRO ICONS ---

const IconCorporate = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
        <path d="M12.5 12h-1v3.5a.5.5 0 01-.5.5h-1a.5.5 0 01-.5-.5V12h-1a.5.5 0 01-.5-.5V10h4.5v1.5a.5.5 0 01-.5.5z" />
    </svg>
);

const IconCreative = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
    </svg>
);

const IconMedical = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 01.75.75v.864c3.67.62 6.25 3.863 6.25 7.636v3.29c0 2.23 1.303 4.134 3.197 5.066a.75.75 0 01.352.923A2.25 2.25 0 0120.5 22.5h-17a2.25 2.25 0 01-2.049-1.72.75.75 0 01.352-.924c1.894-.932 3.197-2.836 3.197-5.066V11.5c0-3.773 2.58-7.016 6.25-7.636V3a.75.75 0 01.75-.75zM12 11.25a.75.75 0 00-1.5 0v1.5h-1.5a.75.75 0 000 1.5h1.5v1.5a.75.75 0 001.5 0v-1.5h1.5a.75.75 0 000-1.5h-1.5v-1.5z" clipRule="evenodd" />
    </svg>
);

const IconTech = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V3.375c0-1.036-.84-1.875-1.875-1.875H5.625zM7.5 4.125a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM6 20.25a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75a.75.75 0 01-.75-.75zM6 6.75h12v9.75H6V6.75z" />
    </svg>
);

const IconLegal = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a6.765 6.765 0 00-.165 2.379c.09.26.24.483.45.64.21.157.47.25.75.25h1.5c.28 0 .54-.093.75-.25a1.125 1.125 0 00.45-.64 6.765 6.765 0 00-.165-2.379c-.108-.215-.396-.634-.936-.634h-1.5zm6 0c-.54 0-.828.419-.936.634a6.765 6.765 0 00-.165 2.379c.09.26.24.483.45.64.21.157.47.25.75.25h1.5c.28 0 .54-.093.75-.25a1.125 1.125 0 00.45-.64 6.765 6.765 0 00-.165-2.379c-.108-.215-.396-.634-.936-.634h-1.5z" clipRule="evenodd" />
    </svg>
);

const IconRealtor = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
    </svg>
);

const EngineCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void; 
}> = ({ title, desc, icon, selected, onClick }) => (
    <button 
        onClick={onClick} 
        className={`${PixaTogetherStyles.engineCard} ${selected ? PixaTogetherStyles.engineCardSelected : PixaTogetherStyles.engineCardInactive}`}
    >
        <div className={`${PixaTogetherStyles.engineIconBox} ${selected ? PixaTogetherStyles.engineIconSelected : PixaTogetherStyles.engineIconInactive}`}>
            {icon}
        </div>
        <div>
            <h4 className={PixaTogetherStyles.engineTitle}>{title}</h4>
            <p className={`${PixaTogetherStyles.engineDesc} ${selected ? PixaTogetherStyles.engineDescSelected : PixaTogetherStyles.engineDescInactive}`}>{desc}</p>
        </div>
    </button>
);

const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-end mb-2 ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label} {optional && <span className="text-[10px] text-gray-300 font-normal">(Opt)</span>}</label>
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2.5 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [imageA, setImageA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [imageB, setImageB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [refPose, setRefPose] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Config State
    const [relationship, setRelationship] = useState('Friends');
    const [mood, setMood] = useState('Happy');
    const [environment, setEnvironment] = useState('Outdoor Park');
    const [pose, setPose] = useState('Standing next to each other');
    const [timeline, setTimeline] = useState('Present Day');
    const [universe, setUniverse] = useState('');
    const [customDesc, setCustomDesc] = useState('');
    const [locks, setLocks] = useState({ age: true, hair: false, accessories: false });
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Match Vibe');
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Derived Lists
    const activeEnvironments = TIMELINE_ENVIRONMENTS[timeline] || TIMELINE_ENVIRONMENTS['Present Day'];

    useEffect(() => { let interval: any; if (loading) { const steps = ["Pixa Vision Analyzing Faces...", "Mapping Biometrics...", "Constructing Scene...", "Lighting & Texture Synthesis...", "Final Polish..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2000); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };

    const handleGenerate = async () => {
        if (!imageA || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        const config: PixaTogetherConfig = {
            mode,
            relationship,
            mood: mode === 'creative' ? mood : undefined,
            environment: mode === 'professional' ? (environment === 'Modern Studio' ? 'Modern Studio' : 'Office') : environment,
            pose,
            timeline: mode === 'creative' ? timeline : 'Present Day',
            universe,
            customDescription: customDesc,
            referencePoseBase64: refPose?.base64.base64,
            referencePoseMimeType: refPose?.base64.mimeType,
            faceStrength: 1.0,
            clothingMode: mode === 'professional' ? 'Professional Attire' : clothingMode,
            locks,
            autoFix: true
        };

        try {
            const res = await generateMagicSoul(
                imageA.base64.base64, imageA.base64.mimeType,
                imageB?.base64.base64, imageB?.base64.mimeType,
                config
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Together'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert("Generation failed: " + e.message); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => { if (!auth.user || !milestoneBonus) return; const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); };
    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Pixa Together", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setImageA(null); setImageB(null); setRefPose(null); setResultImage(null); setLastCreationId(null); setCustomDesc(''); setUniverse(''); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

    // Validation Logic
    const canGenerate = !!imageA && (mode === 'professional' || (mode === 'reenact' ? !!refPose : !!imageB)) && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Together" description="Merge people into one photo, create professional headshots, or reenact moments." icon={<PixaTogetherIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: mode === 'professional' ? "Generate Headshot" : "Create Magic" }} scrollRef={scrollRef}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>) : (<div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4"><UsersIcon className="w-10 h-10 text-purple-400" /></div><h3 className="text-xl font-bold text-gray-300">Composition Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload photos to begin.</p></div>)}
                        {/* Visual representations of uploaded assets on canvas */}
                        {!loading && !resultImage && imageA && (
                            <div className={PixaTogetherStyles.visualCardA} style={{backgroundImage: `url(${imageA.url})`, backgroundSize: 'cover'}}>
                                <div className={PixaTogetherStyles.visualLabel}>Person A</div>
                            </div>
                        )}
                        {!loading && !resultImage && imageB && mode !== 'professional' && (
                            <div className={PixaTogetherStyles.visualCardB} style={{backgroundImage: `url(${imageB.url})`, backgroundSize: 'cover'}}>
                                <div className={PixaTogetherStyles.visualLabel}>Person B</div>
                            </div>
                        )}
                        {!loading && !resultImage && refPose && mode === 'reenact' && (
                            <div className={PixaTogetherStyles.refPoseOverlay} style={{backgroundImage: `url(${refPose.url})`, backgroundSize: 'cover'}}>
                                <div className={PixaTogetherStyles.refPoseBadge}>Target Pose</div>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            {/* Mode Selection */}
                            <div className={PixaTogetherStyles.engineGrid}>
                                <EngineCard title="Creative" desc="Merge & Style" icon={<SparklesIcon className="w-4 h-4"/>} selected={mode === 'creative'} onClick={() => { setMode('creative'); autoScroll(); }} />
                                <EngineCard title="Reenact" desc="Face Swap" icon={<MagicWandIcon className="w-4 h-4"/>} selected={mode === 'reenact'} onClick={() => { setMode('reenact'); autoScroll(); }} />
                                <EngineCard title="Pro Headshot" desc="LinkedIn Ready" icon={<ShieldCheckIcon className="w-4 h-4"/>} selected={mode === 'professional'} onClick={() => { setMode('professional'); autoScroll(); }} />
                            </div>

                            {/* Dynamic Upload Area */}
                            <div className="grid grid-cols-2 gap-4">
                                <CompactUpload label={mode === 'professional' ? "Your Photo" : "Person A"} image={imageA} onUpload={handleUpload(setImageA)} onClear={() => setImageA(null)} icon={<UserIcon className="w-6 h-6 text-indigo-400"/>} />
                                {mode === 'professional' ? (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-center p-4">
                                        <p className="text-[10px] font-medium text-indigo-600">AI will generate a professional studio background and attire.</p>
                                    </div>
                                ) : mode === 'reenact' ? (
                                    <CompactUpload label="Reference Pose" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<CameraIcon className="w-6 h-6 text-purple-400"/>} />
                                ) : (
                                    <CompactUpload label="Person B" image={imageB} onUpload={handleUpload(setImageB)} onClear={() => setImageB(null)} icon={<UserIcon className="w-6 h-6 text-pink-400"/>} />
                                )}
                            </div>

                            {/* Mode Specific Controls */}
                            {mode === 'creative' && (
                                <div className="space-y-4 animate-fadeIn border-t border-gray-100 pt-4">
                                    <SelectionGrid label="Timeline / Era" options={Object.keys(TIMELINE_ENVIRONMENTS)} value={timeline} onChange={setTimeline} />
                                    <SelectionGrid label="Environment" options={activeEnvironments} value={environment} onChange={setEnvironment} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <SelectionGrid label="Mood" options={['Happy', 'Cinematic', 'Romantic', 'Vintage', 'Adventure']} value={mood} onChange={setMood} />
                                        <SelectionGrid label="Clothing" options={['Keep Original', 'Match Vibe', 'Professional Attire']} value={clothingMode} onChange={setClothingMode as any} />
                                    </div>
                                    <InputField label="Custom Context (Optional)" placeholder="e.g. Hiking in the alps, holding hands" value={customDesc} onChange={(e: any) => setCustomDesc(e.target.value)} />
                                </div>
                            )}

                            {mode === 'professional' && (
                                <div className="space-y-4 animate-fadeIn border-t border-gray-100 pt-4">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Archetype</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => { setEnvironment('Modern Studio'); setCustomDesc('Corporate Executive'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Corporate Executive' ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconCorporate className="w-full h-full text-indigo-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Corporate</span>
                                        </button>
                                        <button onClick={() => { setEnvironment('Start-up Office'); setCustomDesc('Tech Entrepreneur'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Tech Entrepreneur' ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconTech className="w-full h-full text-blue-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Tech / Startup</span>
                                        </button>
                                        <button onClick={() => { setEnvironment('Art Studio'); setCustomDesc('Creative Director'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Creative Director' ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconCreative className="w-full h-full text-purple-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Creative</span>
                                        </button>
                                        <button onClick={() => { setEnvironment('Hospital'); setCustomDesc('Doctor'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Doctor' ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconMedical className="w-full h-full text-emerald-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Medical</span>
                                        </button>
                                        <button onClick={() => { setEnvironment('Luxury Home'); setCustomDesc('Realtor'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Realtor' ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconRealtor className="w-full h-full text-orange-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Realtor</span>
                                        </button>
                                        <button onClick={() => { setEnvironment('Law Library'); setCustomDesc('Lawyer'); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${customDesc === 'Lawyer' ? 'bg-slate-50 border-slate-200 ring-1 ring-slate-200' : 'bg-white border-gray-200'}`}>
                                            <div className="w-10 h-10"><IconLegal className="w-full h-full text-slate-600"/></div>
                                            <span className="text-[10px] font-bold uppercase text-gray-600">Legal</span>
                                        </button>
                                    </div>
                                    <div className={PixaTogetherStyles.proModeBanner}>
                                        <span className="font-bold">PRO TIP:</span> For best results, use a selfie with good lighting. The AI will remove the background and replace the outfit.
                                    </div>
                                </div>
                            )}

                            {mode === 'reenact' && (
                                <div className="space-y-4 animate-fadeIn border-t border-gray-100 pt-4">
                                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start gap-3">
                                        <InformationCircleIcon className="w-5 h-5 text-yellow-600 mt-0.5"/>
                                        <div>
                                            <p className="text-xs font-bold text-yellow-800">Face Swap Mode</p>
                                            <p className="text-[10px] text-yellow-700 leading-relaxed mt-1">Upload a "Reference Pose" image. The AI will swap Person A's face onto the reference body while keeping the lighting and style of the reference.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between px-2">
                                        <label className="text-xs font-bold text-gray-500">Lock Hair Style?</label>
                                        <button onClick={() => setLocks({...locks, hair: !locks.hair})} className={`w-10 h-5 rounded-full relative transition-colors ${locks.hair ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${locks.hair ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Magic Soul" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
