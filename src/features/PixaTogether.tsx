
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
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

// --- INTERNAL ICONS ---
const PaletteIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
const PlusIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const HomeIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const ScaleIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>;

// --- PRO MODE CONFIGURATIONS ---
const PRO_ARCHETYPES = [
    { id: 'executive', label: 'Corporate Executive', attire: 'Navy Power Suit, Crisp Shirt', vibe: 'Leadership', icon: <BuildingIcon className="w-4 h-4"/> },
    { id: 'tech', label: 'Tech Founder', attire: 'Premium T-Shirt & Blazer', vibe: 'Visionary', icon: <SparklesIcon className="w-4 h-4"/> },
    { id: 'creative', label: 'Creative Director', attire: 'Turtleneck & Designer Glasses', vibe: 'Sophisticated', icon: <PaletteIcon className="w-4 h-4"/> },
    { id: 'medical', label: 'Medical Pro', attire: 'White Coat / Premium Scrubs', vibe: 'Expert Care', icon: <PlusIcon className="w-4 h-4"/> },
    { id: 'realtor', label: 'Realtor / Sales', attire: 'Modern Business Formal', vibe: 'Friendly', icon: <HomeIcon className="w-4 h-4"/> },
    { id: 'legal', label: 'Legal / Finance', attire: 'Charcoal Suit, Conservative', vibe: 'Serious', icon: <ScaleIcon className="w-4 h-4"/> }
];

const PRO_BACKGROUNDS = [
    { id: 'studio', label: 'Studio Grey', desc: 'Neutral & Clean', prompt: 'Solid neutral grey studio backdrop with soft gradient' },
    { id: 'office', label: 'Modern Office', desc: 'Glass & Light', prompt: 'Blurred modern open-plan office background, bokeh lights, glass architecture' },
    { id: 'city', label: 'City Skyline', desc: 'High-Rise View', prompt: 'Blurred cityscape through a high-rise window, soft daylight' },
    { id: 'library', label: 'Library', desc: 'Warm Academic', prompt: 'Blurred academic library or mahogany bookshelf background' },
    { id: 'outdoor', label: 'Garden', desc: 'Natural Light', prompt: 'Soft focus manicured garden, natural sunlight' }
];


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
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [relationship, setRelationship] = useState('');
    
    // Single Subject Toggle for Professional Mode
    const [isSingleSubject, setIsSingleSubject] = useState(false);
    
    // Professional Mode Specifics
    const [proArchetype, setProArchetype] = useState(PRO_ARCHETYPES[0].label);
    const [proBackground, setProBackground] = useState(PRO_BACKGROUNDS[0].label);

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
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 5;
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

    useEffect(() => {
        if (mode !== 'professional') {
            setIsSingleSubject(false);
        } else {
            // Default professional mode to single subject
            setIsSingleSubject(true);
        }
    }, [mode]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };

    const handleGenerate = async () => {
        if (!personA || (!isSingleSubject && !personB) || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            // CONSTRUCT WORLD CLASS PROMPT IF PROFESSIONAL MODE
            let finalCustomDesc = customDescription;
            let finalEnvironment = environment;
            let finalMood = mood;
            
            if (mode === 'professional') {
                const archetypeData = PRO_ARCHETYPES.find(a => a.label === proArchetype) || PRO_ARCHETYPES[0];
                const backgroundData = PRO_BACKGROUNDS.find(b => b.label === proBackground) || PRO_BACKGROUNDS[0];
                
                // We construct a heavy "Override" description that the backend service will respect
                finalCustomDesc = `
                *** WORLD CLASS HEADSHOT PROTOCOL ***
                - **ARCHETYPE**: ${archetypeData.label}.
                - **ATTIRE**: ${archetypeData.attire}. Clothing must look expensive, tailored, and perfectly fitted.
                - **VIBE**: ${archetypeData.vibe}.
                - **BACKGROUND**: ${backgroundData.prompt}.
                
                *** PHOTOGRAPHY STUDIO SETTINGS ***
                - **Camera**: Sony A7R V with 85mm G Master Lens (Portrait Focal Length).
                - **Aperture**: f/1.8 to f/2.8 for pleasing optical bokeh.
                - **Lighting**: "Rembrandt" or "Butterfly" lighting pattern using large octabox softboxes. 
                - **Details**: Add a subtle "Rim Light" (hair light) to separate the subject from the background. Ensure distinct "Catchlights" in the eyes to make them look alive.
                
                *** RETOUCHING ***
                - **Skin**: High-end texture retention. Do NOT airbrush into plastic. Keep pores visible but clean.
                - **Structure**: Light facial contouring.
                `;
                
                // Force specific backend settings for consistency
                finalEnvironment = backgroundData.label; 
                finalMood = 'Professional';
            }

            const config: PixaTogetherConfig = {
                mode,
                relationship: mode === 'professional' ? 'Professional Portrait' : relationship,
                mood: finalMood,
                environment: finalEnvironment,
                pose: mode === 'professional' ? 'Confident Headshot, Shoulders angled 45 degrees, Face to camera' : pose,
                timeline: mode === 'professional' ? 'Present Day' : timeline,
                customDescription: finalCustomDesc,
                referencePoseBase64: refPose?.base64.base64,
                referencePoseMimeType: refPose?.base64.mimeType,
                faceStrength,
                clothingMode: mode === 'professional' ? 'Professional Attire' : clothingMode,
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
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const deduct = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...deduct } : null); } };
    
    const canGenerate = (isSingleSubject ? !!personA : (!!personA && !!personB)) && !isLowCredits && (mode === 'creative' ? !!relationship : true);

    return (
        <>
            <FeatureLayout
                title="Pixa Together" description="Merge people into one hyper-realistic photo. Create team shots, couple photos, or professional headshots." icon={<PixaTogetherIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage} creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
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
                                    <EngineModeCard title="Pro Headshot" desc="LinkedIn / Corp" icon={<UserIcon className="w-5 h-5"/>} selected={mode === 'professional'} onClick={() => setMode('professional')} />
                                </div>
                            </div>

                            {/* 2. Subjects */}
                            <PremiumCard className="relative overflow-visible">
                                <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><UserIcon className="w-5 h-5"/></div>
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Subjects</h3>
                                    </div>
                                    
                                    {(mode === 'professional' || mode === 'creative') && (
                                        <div className="flex bg-gray-100 p-1 rounded-lg">
                                            <button onClick={() => setIsSingleSubject(true)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Single</button>
                                            {mode !== 'professional' && <button onClick={() => setIsSingleSubject(false)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Duo</button>}
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
                                            <SparklesIcon className="w-3 h-3 text-indigo-500" />
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

                            {mode === 'professional' && (
                                <PremiumCard className="animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-4 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="w-5 h-5 flex-shrink-0">
                                            <g fill="none">
                                                <rect width="256" height="256" fill="#fff" rx="60"/>
                                                <rect width="256" height="256" fill="#0A66C2" rx="60"/>
                                                <path fill="#fff" d="M184.715 217.685h29.27a4 4 0 0 0 4-3.999l.015-61.842c0-32.323-6.965-57.168-44.738-57.168c-14.359-.534-27.9 6.868-35.207 19.228a.32.32 0 0 1-.595-.161V101.66a4 4 0 0 0-4-4h-27.777a4 4 0 0 0-4 4v112.02a4 4 0 0 0 4-4h29.268a4 4 0 0 0 4-4v-55.373c0-15.657 2.97-30.82 22.381-30.82c19.135 0 19.383 17.916 19.383 31.834v54.364a4 4 0 0 0 4 4ZM38 59.627c0 11.865 9.767 21.627 21.632 21.627c11.862-.001 21.623-9.769 21.623-21.631C81.253 47.761 71.491 38 59.628 38C47.762 38 38 47.763 38 59.627Zm6.959 158.058h29.307a4 4 0 0 0 4-4V101.66a4 4 0 0 0-4-4H44.959a4 4 0 0 0-4 4v112.025a4 4 0 0 0 4 4Z"/>
                                            </g>
                                        </svg>
                                        <div>
                                            <h4 className="text-xs font-bold text-indigo-900">LinkedIn™ Mode Active</h4>
                                            <p className="text-[10px] text-indigo-600 opacity-80">Hyper-realistic professional headshots.</p>
                                        </div>
                                    </div>

                                    {/* 1. Profession / Archetype - Clean Card Selection */}
                                    <div className="mb-6">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block px-1">Professional Archetype</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {PRO_ARCHETYPES.map(arch => (
                                                <button
                                                    key={arch.id}
                                                    onClick={() => setProArchetype(arch.label)}
                                                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 group ${proArchetype === arch.label ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600/20' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className={`p-2 rounded-lg ${proArchetype === arch.label ? 'bg-white text-indigo-600' : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'}`}>
                                                            {arch.icon}
                                                        </div>
                                                        {proArchetype === arch.label && <div className="bg-indigo-600 text-white rounded-full p-0.5"><CheckIcon className="w-3 h-3"/></div>}
                                                    </div>
                                                    
                                                    <p className={`text-xs font-bold mb-1 ${proArchetype === arch.label ? 'text-indigo-900' : 'text-gray-900'}`}>{arch.label}</p>
                                                    <p className={`text-[10px] leading-tight line-clamp-2 ${proArchetype === arch.label ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>{arch.attire}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Background Selector - Bento Grid */}
                                    <div className="mb-4">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block px-1">Studio Environment</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {PRO_BACKGROUNDS.map(bg => (
                                                <button
                                                    key={bg.id}
                                                    onClick={() => setProBackground(bg.label)}
                                                    className={`flex flex-col items-start p-3 rounded-xl border transition-all ${proBackground === bg.label ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-100' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                                >
                                                    <div className="flex justify-between w-full mb-2">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${proBackground === bg.label ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                            <BuildingIcon className="w-4 h-4"/>
                                                        </div>
                                                        {proBackground === bg.label && <div className="w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center"><CheckIcon className="w-2.5 h-2.5 text-white"/></div>}
                                                    </div>
                                                    <p className={`text-xs font-bold ${proBackground === bg.label ? 'text-gray-900' : 'text-gray-700'}`}>{bg.label}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">{bg.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100 mt-4">
                                        <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-blue-700 leading-relaxed">
                                            Pixa will strictly enforce <strong>Rembrandt lighting</strong>, <strong>85mm lens optics</strong>, and <strong>biometric skin texture</strong> retention for maximum realism.
                                        </p>
                                    </div>
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
