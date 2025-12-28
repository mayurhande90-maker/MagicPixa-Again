
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon, UploadIcon, CheckIcon, LockIcon, UsersIcon, EngineIcon, BuildingIcon, DocumentTextIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
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

// --- PREMIUM UI COMPONENTS ---

const PremiumCard: React.FC<{ children: React.ReactNode; title?: string; icon?: React.ReactNode; className?: string }> = ({ children, title, icon, className = "" }) => (
    <div className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] ${className}`}>
        {title && (
            <div className="flex items-center gap-2 mb-5">
                {icon && <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">{icon}</div>}
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
            </div>
        )}
        {children}
    </div>
);

const PremiumUpload: React.FC<{ label: string; uploadText?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, uploadText, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {image && <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Ready</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-gray-50 rounded-2xl border border-indigo-100 flex items-center justify-center overflow-hidden group-hover:border-indigo-300 transition-all shadow-inner`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt={label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-2">
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white/90 p-2 rounded-xl shadow-lg text-gray-500 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"><XIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 bg-white hover:bg-indigo-50/30 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group`}>
                    <div className="p-3 bg-gray-50 group-hover:bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 group-hover:shadow-md transition-all text-gray-400 group-hover:text-indigo-500 border border-gray-100">{icon}</div>
                    <p className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 uppercase tracking-wide text-center px-4">{uploadText || "Add Photo"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const PremiumSelector: React.FC<{ label: string; options: string[]; value: string; onChange: (val: string) => void }> = ({ label, options, value, onChange }) => (
    <div className="mb-5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block px-1">{label}</label>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isSelected = value === opt;
                return (
                    <button 
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                            isSelected 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg transform -translate-y-0.5' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>
    </div>
);

const EngineModeCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void; 
}> = ({ title, desc, icon, selected, onClick }) => (
    <div 
        onClick={onClick} 
        className={`${PixaTogetherStyles.engineCard} ${selected ? PixaTogetherStyles.engineCardSelected : PixaTogetherStyles.engineCardInactive}`}
    >
        <div>
            <h4 className={PixaTogetherStyles.engineTitle}>{title}</h4>
            <p className={`${PixaTogetherStyles.engineDesc} ${selected ? PixaTogetherStyles.engineDescSelected : PixaTogetherStyles.engineDescInactive}`}>{desc}</p>
        </div>
        <div className={`${PixaTogetherStyles.engineIconBox} ${selected ? PixaTogetherStyles.engineIconSelected : PixaTogetherStyles.engineIconInactive}`}>
            {icon}
        </div>
    </div>
);

const PremiumInput: React.FC<any> = ({ label, ...props }) => (
    <div className="mb-5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block px-1">{label}</label>
        <input className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-gray-400" {...props} />
    </div>
);

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    const [refPose, setRefPose] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Modes
    const [mode, setMode] = useState<'creative' | 'reenact'>('creative');
    const [relationship, setRelationship] = useState('');
    
    // Single Subject Toggle
    const [isSingleSubject, setIsSingleSubject] = useState(false);
    
    // Creative Params
    const [mood, setMood] = useState('Happy');
    const [timeline, setTimeline] = useState('Present Day');
    const [environment, setEnvironment] = useState(TIMELINE_ENVIRONMENTS['Present Day'][0]);
    
    const [pose, setPose] = useState('Standing Together');
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
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableEnvironments = TIMELINE_ENVIRONMENTS[timeline] || TIMELINE_ENVIRONMENTS['Present Day'];

    useEffect(() => {
        if (!availableEnvironments.includes(environment)) {
            setEnvironment(availableEnvironments[0]);
        }
    }, [timeline, availableEnvironments, environment]);

    useEffect(() => { let interval: any; if (loading) { const steps = ["Analyzing biometric structure...", "Locking identity features...", "Constructing scene geometry...", "Blending lighting & shadows...", "Finalizing high-res output..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2500); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };

    const handleGenerate = async () => {
        if (!personA || (!isSingleSubject && !personB) || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            const config: PixaTogetherConfig = {
                mode, // Now typed as 'creative' | 'reenact' | 'professional' in backend but we only pass 'creative' | 'reenact'
                relationship: relationship,
                mood: mood,
                environment: environment,
                pose: pose,
                timeline: timeline,
                customDescription: customDescription,
                referencePoseBase64: refPose?.base64.base64,
                referencePoseMimeType: refPose?.base64.mimeType,
                faceStrength,
                clothingMode: clothingMode,
                locks,
                autoFix
            };

            const res = await generateMagicSoul(
                personA.base64.base64, 
                personA.base64.mimeType, 
                isSingleSubject ? null : personB?.base64.base64, 
                isSingleSubject ? null : personB?.base64.mimeType, 
                config
            );
            
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
            const config: PixaTogetherConfig = { mode, relationship, mood, environment, pose, timeline, customDescription, faceStrength, clothingMode, locks, autoFix };
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Pixa Together", lastCreationId || undefined, config); 
            if (res.success) { 
                if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } 
            } 
            setShowRefundModal(false); 
        } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } 
    };
    
    const handleNewSession = () => { setPersonA(null); setPersonB(null); setRefPose(null); setResultImage(null); setLastCreationId(null); setCustomDescription(''); };
    
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Together (Edited)');
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const deduct = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...deduct } : null); } };
    
    const canGenerate = (isSingleSubject ? !!personA : (!!personA && !!personB)) && !isLowCredits && (mode === 'creative' ? !!relationship : true);

    return (
        <>
            <FeatureLayout
                title="Pixa Together" description="Merge people into one hyper-realistic photo. Create team shots, couple photos, or creative portraits." icon={<PixaTogetherIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Magic" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                        
                        {!personA && !personB ? (
                            <div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4"><PixaTogetherIcon className="w-10 h-10 text-pink-500" /></div><h3 className="text-xl font-bold text-gray-300">Duo Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload people to begin.</p></div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div className="relative w-72 h-80 mx-auto">
                                    {personA && (
                                        <div 
                                            className={PixaTogetherStyles.visualCardA} 
                                            style={(!personB || isSingleSubject) ? { left: '50%', transform: 'translateX(-50%) rotate(0deg)', top: '2rem' } : {}}
                                        >
                                            <img src={personA.url} className="w-full h-full object-cover" />
                                            <div className={PixaTogetherStyles.visualLabel}>{isSingleSubject ? 'Subject' : 'Person A'}</div>
                                        </div>
                                    )}
                                    {personB && !isSingleSubject && (
                                        <div className={PixaTogetherStyles.visualCardB}>
                                            <img src={personB.url} className="w-full h-full object-cover" />
                                            <div className={PixaTogetherStyles.visualLabel}>Person B</div>
                                        </div>
                                    )}
                                </div>
                                {mode === 'reenact' && refPose && (
                                    <div className={PixaTogetherStyles.refPoseOverlay}>
                                        <img src={refPose.url} className="w-full h-full object-cover" />
                                        <span className={PixaTogetherStyles.refPoseBadge}>Target Pose</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className="space-y-6 p-2 animate-fadeIn">
                            
                            {/* 1. Mode Selection */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><EngineIcon className="w-4 h-4"/></div>
                                    <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Engine Mode</h3>
                                </div>
                                <div className={PixaTogetherStyles.engineGrid}>
                                    <EngineModeCard title="Creative" desc="Themed Art" icon={<SparklesIcon className="w-5 h-5"/>} selected={mode === 'creative'} onClick={() => setMode('creative')} />
                                    <EngineModeCard title="Pose Match" desc="Copy Structure" icon={<CameraIcon className="w-5 h-5"/>} selected={mode === 'reenact'} onClick={() => setMode('reenact')} />
                                </div>
                            </div>

                            {/* 2. Subjects */}
                            <PremiumCard className="relative overflow-visible">
                                <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><UserIcon className="w-5 h-5"/></div>
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Subjects</h3>
                                    </div>
                                    
                                    {(mode === 'creative') && (
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button onClick={() => setIsSingleSubject(true)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Single</button>
                                            <button onClick={() => setIsSingleSubject(false)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Duo</button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <PremiumUpload label={isSingleSubject ? "Subject" : "Person A"} uploadText={isSingleSubject ? "Add Subject" : "Add Person A"} image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-6 h-6 text-indigo-300"/>} />
                                    
                                    {!isSingleSubject && (
                                        <PremiumUpload label="Person B" uploadText="Add Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-6 h-6 text-pink-300"/>} />
                                    )}
                                    
                                    {isSingleSubject && (
                                        <div className="h-40 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center bg-gray-50/50 opacity-50 select-none">
                                            <div className="p-3 bg-white rounded-full mb-2 shadow-sm"><CheckIcon className="w-5 h-5 text-gray-300"/></div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase">Single Mode Active</span>
                                        </div>
                                    )}
                                </div>
                            </PremiumCard>

                            {/* 3. Conditional Controls */}
                            {mode === 'creative' && (
                                <PremiumCard className="animate-fadeIn">
                                    <PremiumSelector label="Relationship" options={['Couple', 'Family', 'Friends', 'Siblings', 'Business Partners']} value={relationship} onChange={setRelationship} />
                                    
                                    <div className="mb-4 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Magic Overrides</span>
                                        </div>
                                        <div className="mb-4">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block px-1">Time Travel</label>
                                            <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer transition-colors">
                                                {Object.keys(TIMELINE_ENVIRONMENTS).map(t => <option key={t}>{t}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block px-1">Vibe</label>
                                            <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer">
                                                {['Happy', 'Cinematic', 'Romantic', 'Vintage', 'Luxury', 'Adventure', 'Candid', 'Professional', 'Ethereal', 'Moody'].map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block px-1">Setting</label>
                                            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 cursor-pointer">
                                                {availableEnvironments.map(o => <option key={o}>{o}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <PremiumInput placeholder="Custom Prompt (e.g. riding a bike together in Paris)" value={customDescription} onChange={(e: any) => setCustomDescription(e.target.value)} label="Custom Vision" />
                                    </div>
                                </PremiumCard>
                            )}

                            {mode === 'reenact' && (
                                <PremiumCard className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-100" title="Pose Match">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="p-2 bg-white rounded-lg shadow-sm"><CameraIcon className="w-4 h-4 text-blue-500" /></div>
                                        <div><h4 className="text-xs font-bold text-blue-900">Reference Shot</h4><p className="text-[10px] text-blue-600/80 mt-0.5">Upload a photo to copy the exact pose and composition.</p></div>
                                    </div>
                                    <PremiumUpload 
                                        label="Reference Pose" 
                                        uploadText="Upload Reference Pose" 
                                        image={refPose} 
                                        onUpload={handleUpload(setRefPose)} 
                                        onClear={() => setRefPose(null)} 
                                        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-5 h-5 text-[#008efa]"><path fill="currentColor" d="M296 384h-80c-13.3 0-24-10.7-24-24V192h-87.7c-17.8 0-26.7-21.5-14.1-34.1L242.3 5.7c7.5-7.5 19.8-7.5 27.3 0l152.2 152.2c12.6 12.6 3.7 34.1-14.1 34.1H320v168c0 13.3-10.7 24-24 24zm216-8v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h136v8c0 30.9 25.1 56 56 56h80c30.9 0 56-25.1 56-56v-8h136c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20s9 20 20 20s20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20s9 20 20 20s20-9 20-20z"/></svg>} 
                                        heightClass="h-32" 
                                    />
                                </PremiumCard>
                            )}
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
