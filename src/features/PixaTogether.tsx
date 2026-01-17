import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaTogetherIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, FlagIcon, UploadIcon, CheckIcon, LockIcon, UsersIcon, EngineIcon, BuildingIcon, DocumentTextIcon, StrategyStarIcon, PencilIcon } from '../components/icons';
import { RefinementPanel } from '../components/RefinementPanel';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
// Fix: Import refineStudioImage from photoStudioService as it is not available in imageToolsService
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { refineStudioImage } from '../services/photoStudioService';
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

// FIX: Completed the PixaTogether component with necessary logic and return statement
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
    
    // Advanced Params (for PixaTogetherConfig)
    const [faceStrength, setFaceStrength] = useState(0.85);
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Keep Original');
    const [locks, setLocks] = useState({ age: true, hair: true, accessories: false });
    const [autoFix, setAutoFix] = useState(true);
    const [customDescription, setCustomDescription] = useState('');

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

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 2;

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa Together'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Effect for dynamic loading text
    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining 
                ? ["Analyzing composite lighting...", "Refining facial harmony...", "Polishing material physics...", "Finalizing refined output..."]
                : ["Scanning biometric data...", "Analyzing spatial relationships...", "Synthesizing environment...", "Generating lighting dapples...", "Polishing photorealistic output..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

    // Cleanup blob URLs
    useEffect(() => {
        return () => { if (resultImage) URL.revokeObjectURL(resultImage); };
    }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personA || (!isSingleSubject && !personB) || !auth.user) return;
        if (mode === 'reenact' && !refPose) { alert("Please upload a reference pose."); return; }
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);

        const config: PixaTogetherConfig = {
            mode: mode as any,
            relationship,
            mood,
            environment,
            pose,
            timeline,
            customDescription,
            referencePoseBase64: refPose?.base64.base64,
            referencePoseMimeType: refPose?.base64.mimeType,
            faceStrength,
            clothingMode,
            locks,
            autoFix
        };

        try {
            const res = await generateMagicSoul(
                personA.base64.base64,
                personA.base64.mimeType,
                isSingleSubject ? null : personB?.base64.base64,
                isSingleSubject ? null : personB?.base64.mimeType,
                config,
                auth.activeBrandKit
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);

            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Together');
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
        } catch (e: any) {
            console.error(e);
            alert("Generation failed. Please ensure photos are clear.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Couple/Group Photography");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa Together (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Creative Retoucher: Scene updated!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            const res = await processRefundRequest(
                auth.user.uid, 
                auth.user.email, 
                cost, 
                reason, 
                resultImage, 
                lastCreationId || undefined,
                { mode, relationship, mood, environment, pose, timeline, faceStrength, clothingMode, locks, autoFix, customDescription }
            );
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
            alert("Refund failed: " + e.message);
        } finally {
            setIsRefunding(false);
        }
    };

    const handleNewSession = () => {
        setPersonA(null); setPersonB(null); setRefPose(null); setResultImage(null); 
        setLastCreationId(null); setIsRefineActive(false); setRelationship('');
    };

    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) await updateCreation(auth.user.uid, lastCreationId, newUrl);
    };

    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Editor (Soul)'); auth.setUser(prev => prev ? {...prev, ...updatedUser} : null); } };

    const isReady = personA && (isSingleSubject || personB);

    return (
        <>
            <FeatureLayout
                title="Pixa Together"
                description="Combine people into one hyper-realistic scene. Pixa anchors identities and simulates physical interaction between subjects."
                icon={<PixaTogetherIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading || isRefining}
                canGenerate={isReady && !isLowCredits}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onNewSession={handleNewSession}
                onEdit={() => setShowMagicEditor(true)}
                activeBrandKit={auth.activeBrandKit}
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
                resultHeightClass="h-[900px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ 
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] hover:!bg-[#dfbc2b]", 
                    hideIcon: true, 
                    label: "Generate Scene" 
                }}
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-2 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {(loading || isRefining) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}
                        {!isReady ? (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PixaTogetherIcon className="w-10 h-10 text-pink-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Composite Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload subjects to preview setup.</p>
                            </div>
                        ) : (
                            <div className="relative w-72 h-80 mx-auto transform scale-125 origin-center">
                                <div className={PixaTogetherStyles.visualCardA} style={isSingleSubject ? { left: '50%', transform: 'translateX(-50%) rotate(0deg)', top: '2rem' } : {}}>
                                    <img src={personA.url} className="w-full h-full object-cover" />
                                    <div className={PixaTogetherStyles.visualLabel}>Person A</div>
                                </div>
                                {!isSingleSubject && personB && (
                                    <div className={PixaTogetherStyles.visualCardB}>
                                        <img src={personB.url} className="w-full h-full object-cover" />
                                        <div className={PixaTogetherStyles.visualLabel}>Person B</div>
                                    </div>
                                )}
                                {mode === 'reenact' && refPose && (
                                    <div className={PixaTogetherStyles.refPoseOverlay}>
                                        <img src={refPose.url} className="w-full h-full object-cover rounded-lg" />
                                        <div className={PixaTogetherStyles.refPoseBadge}>Target Pose</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-red-50/50 rounded-2xl border border-red-100 animate-fadeIn">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm"> requires {cost} credits.</p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg pointer-events-auto">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={`space-y-6 animate-fadeIn p-1 h-full flex flex-col ${loading || isRefining ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            
                            {/* 1. Mode Switcher (Bento) */}
                            <div className="flex bg-gray-100 p-1 rounded-2xl w-full">
                                <button onClick={() => setMode('creative')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'creative' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Creative Engine</button>
                                <button onClick={() => setMode('reenact')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'reenact' ? 'bg-white text-indigo-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>Pose Re-enactment</button>
                            </div>

                            {/* 2. Subject Matrix */}
                            <PremiumCard title="Subject Matrix" icon={<UsersIcon className="w-4 h-4"/>}>
                                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                    <button onClick={() => { setIsSingleSubject(false); setPersonB(null); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Duo / Pair</button>
                                    <button onClick={() => { setIsSingleSubject(true); setPersonB(null); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>Solo Shot</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <PremiumUpload label={isSingleSubject ? "The Subject" : "Person A"} uploadText={isSingleSubject ? "Subject" : "Person A"} image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-6 h-6 text-indigo-300"/>} />
                                    {!isSingleSubject && (
                                        <PremiumUpload label="Person B" uploadText="Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-6 h-6 text-pink-300"/>} />
                                    )}
                                    {isSingleSubject && mode === 'reenact' && (
                                        <div className="animate-fadeIn">
                                            <PremiumUpload label="Reference Pose" uploadText="Pose" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<CameraIcon className="w-6 h-6 text-purple-300"/>} />
                                        </div>
                                    )}
                                </div>
                                {!isSingleSubject && mode === 'reenact' && (
                                    <div className="mt-4 animate-fadeIn">
                                        <PremiumUpload label="Reference Pose" uploadText="Add Reference Image" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<CameraIcon className="w-6 h-6 text-purple-300"/>} heightClass="h-28" />
                                    </div>
                                )}
                            </PremiumCard>

                            {/* 3. Logic Configuration */}
                            <div className={`space-y-6 transition-all duration-500 ${!isReady ? 'opacity-30 pointer-events-none' : ''}`}>
                                <PremiumCard title="Strategic Context" icon={<StrategyStarIcon className="w-4 h-4"/>}>
                                    <PremiumInput label="Relationship / Dynamic" placeholder="e.g. Best friends, Brother & Sister, Happy Couple" value={relationship} onChange={(e: any) => setRelationship(e.target.value)} />
                                    
                                    <div className="space-y-6 border-t border-gray-100 pt-6">
                                        <PremiumSelector label="Select Timeline" options={['Present Day', 'Future Sci-Fi', '1990s Vintage', '1920s Noir', 'Medieval']} value={timeline} onChange={(val) => { setTimeline(val); setEnvironment(TIMELINE_ENVIRONMENTS[val][0]); }} />
                                        <PremiumSelector label="Atmosphere (Mood)" options={['Happy', 'Cinematic', 'Romantic', 'Vintage', 'Luxury', 'Adventure', 'Candid', 'Professional', 'Ethereal', 'Moody']} value={mood} onChange={setMood} />
                                        <PremiumSelector label="Environment" options={TIMELINE_ENVIRONMENTS[timeline] || TIMELINE_ENVIRONMENTS['Present Day']} value={environment} onChange={setEnvironment} />
                                    </div>
                                </PremiumCard>

                                <PremiumCard title="Rendering Protocol" icon={<EngineIcon className="w-4 h-4"/>}>
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity Locking Strength</label>
                                            <span className="text-xs font-black text-indigo-600">{Math.round(faceStrength * 100)}%</span>
                                        </div>
                                        <input type="range" min="0.5" max="1" step="0.05" value={faceStrength} onChange={(e) => setFaceStrength(parseFloat(e.target.value))} className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer accent-indigo-600" />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {['Keep Original', 'Match Vibe', 'Professional Attire'].map((cMode) => (
                                            <button key={cMode} onClick={() => setClothingMode(cMode as any)} className={`p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all text-center ${clothingMode === cMode ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-white hover:border-gray-200'}`}>{cMode}</button>
                                        ))}
                                    </div>

                                    <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-gray-100">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div onClick={() => setLocks({...locks, age: !locks.age})} className={`w-10 h-6 rounded-full relative transition-colors ${locks.age ? 'bg-green-500' : 'bg-gray-200'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${locks.age ? 'left-5' : 'left-1 shadow-sm'}`}></div></div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-800">Lock Age</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div onClick={() => setLocks({...locks, hair: !locks.hair})} className={`w-10 h-6 rounded-full relative transition-colors ${locks.hair ? 'bg-green-500' : 'bg-gray-200'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${locks.hair ? 'left-5' : 'left-1 shadow-sm'}`}></div></div>
                                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-gray-800">Lock Hair</span>
                                        </label>
                                    </div>
                                </PremiumCard>

                                <PremiumCard title="Manual Overrides" icon={<PencilIcon className="w-4 h-4"/>}>
                                    <PremiumInput label="Describe Custom Scene Details" placeholder="e.g. Snow falling lightly, holding hot chocolate mugs, bokeh lights" value={customDescription} onChange={(e: any) => setCustomDescription(e.target.value)} />
                                </PremiumCard>
                            </div>
                        </div>
                    )
                }
            />

            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={async () => { if(auth.user) { const u = await claimMilestoneBonus(auth.user.uid, milestoneBonus); auth.setUser(prev => prev ? {...prev, ...u} : null); } }} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Soul Composite" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};

export default PixaTogether;
