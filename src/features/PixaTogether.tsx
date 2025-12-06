
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, InputField, TextAreaField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { 
    PixaTogetherIcon, 
    XIcon, 
    UserIcon, 
    SparklesIcon, 
    CreditCoinIcon, 
    MagicWandIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    CameraIcon,
    FlagIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

// --- Components ---

const SmartWarning: React.FC<{ issues: string[] }> = ({ issues }) => {
    if (issues.length === 0) return null;
    return (
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-2 flex items-start gap-2 animate-fadeIn">
            <InformationCircleIcon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
            <div>
                <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide mb-1">Smart Suggestion</p>
                <ul className="list-disc list-inside text-xs text-orange-600 space-y-0.5">
                    {issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

// Refund Modal
const RefundModal: React.FC<{ 
    onClose: () => void; 
    onConfirm: (reason: string) => void;
    isProcessing: boolean;
}> = ({ onClose, onConfirm, isProcessing }) => {
    const [reason, setReason] = useState('');
    const reasons = [
        "Faces are distorted / blurry",
        "Didn't preserve identity well",
        "Glitch or Artifacts in image",
        "Unrealistic lighting/blending",
        "Other"
    ];

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative m-4" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XIcon className="w-5 h-5"/>
                </button>
                
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-red-500"/> Report Quality Issue
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    We're sorry the magic didn't work perfectly. Select a reason to request a refund.
                </p>

                <div className="space-y-2 mb-6">
                    {reasons.map(r => (
                        <button 
                            key={r}
                            onClick={() => setReason(r)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                                reason === r 
                                ? 'bg-red-50 border-red-500 text-red-700' 
                                : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    <button 
                        onClick={() => onConfirm(reason)}
                        disabled={!reason || isProcessing}
                        className="flex-1 py-3 bg-[#1A1A1E] text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : "Submit & Refund"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Enhanced Premium Mode Card
const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
}> = ({ title, description, icon, selected, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 w-full group relative overflow-hidden text-center h-32 border ${
            selected 
            ? 'bg-white border-indigo-100 shadow-xl shadow-indigo-500/10 scale-[1.02] ring-1 ring-indigo-50'
            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-md opacity-80 hover:opacity-100'
        }`}
    >
        {selected && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>}
        
        <div className={`mb-3 p-2.5 rounded-full transition-transform group-hover:scale-110 ${selected ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'}`}>
            {icon}
        </div>
        
        <h3 className={`font-bold text-sm mb-1 ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{title}</h3>
        <p className={`text-[10px] uppercase tracking-wide ${selected ? 'text-indigo-500 font-bold' : 'text-gray-400'}`}>{description}</p>
    </button>
);

// Enhanced Compact Upload
const CompactUpload: React.FC<{
    label: string;
    image: { url: string; warnings?: string[] } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group h-full">
            <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
            </div>
            
            {image ? (
                <div className="flex flex-col gap-2">
                    <div className={`relative w-full ${heightClass} bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center justify-center overflow-hidden group-hover:shadow-xl transition-shadow`}>
                        <img src={image.url} className="w-full h-full object-cover" alt={label} />
                        
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                className="bg-white text-red-500 p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                            >
                                <XIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                    {image.warnings && image.warnings.length > 0 && <SmartWarning issues={image.warnings} />}
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} bg-gray-50/50 border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-100/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative z-10 p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform border border-gray-100">
                        {icon}
                    </div>
                    <p className="relative z-10 text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider">Select Photo</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Mode
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');

    // Assets with metadata
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [referencePose, setReferencePose] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    
    // Core Config (Creative)
    const [relationship, setRelationship] = useState('Best Friends');
    const [mood, setMood] = useState('Travel / Beach');
    const [environmentPreset, setEnvironmentPreset] = useState('Goa Beach');
    const [customEnvironment, setCustomEnvironment] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [pose, setPose] = useState('Side-by-Side');
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Keep Original');
    
    // Tracking
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [lastConfig, setLastConfig] = useState<PixaTogetherConfig | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    
    // Refund State
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Presets
    const relationshipOptions = ['Best Friends', 'Couple', 'Siblings', 'Parent & Child', 'Colleagues', 'Childhood Glow-up'];
    const moodOptions = ['Retro Childhood', 'Romantic Couple', 'Party / Nightlife', 'Travel / Beach', 'Studio Portrait', 'Stylized Cartoon'];
    const envOptions = ['Café', 'Mountain Trek', 'Goa Beach', '90s Classroom', 'Royal Palace', 'Rainy Street', 'Sunset Balcony', 'Custom'];
    const poseOptions = ['Side-by-Side', 'Hugging', 'Handshake', 'V-Pose', 'Back-to-Back', 'Walking (Dynamic)', 'Keep Original'];
    const clothingOptions = ['Keep Original', 'Match Vibe'];
    
    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing facial structures...", "Matching skin tones & lighting...", "Simulating reality engine...", "Applying scene physics...", "Finalizing photo match..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Cleanup
    useEffect(() => {
        return () => { if (resultImage) URL.revokeObjectURL(resultImage); };
    }, [resultImage]);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }, 100); 
        }
    };

    const validateImage = async (file: File): Promise<string[]> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                const warnings = [];
                if (img.width < 400 || img.height < 400) warnings.push("Low resolution: Face might be blurry.");
                resolve(warnings);
            };
        });
    };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            const warnings = await validateImage(file);
            setter({ url: URL.createObjectURL(file), base64, warnings });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personA || !personB || !auth.user) return;
        if (mode === 'reenact' && !referencePose) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);

        try {
            const config: PixaTogetherConfig = {
                mode,
                relationship: mode === 'creative' ? relationship : 'Neutral',
                mood: mode === 'creative' ? mood : '',
                environment: mode === 'creative' ? (environmentPreset === 'Custom' ? customEnvironment : environmentPreset) : '',
                pose: mode === 'creative' ? pose : '',
                customDescription: customDescription,
                
                // Defaults for removed engines
                timeline: 'Present Day',
                universe: 'Photorealistic',
                
                referencePoseBase64: referencePose?.base64.base64,
                referencePoseMimeType: referencePose?.base64.mimeType,
                
                faceStrength: 100,
                clothingMode: mode === 'professional' ? 'Professional Attire' : (clothingMode as any),
                locks: {
                    age: true,
                    hair: true,
                    accessories: true
                },
                autoFix: true
            };
            
            setLastConfig(config);

            const res = await generateMagicSoul(
                personA.base64.base64,
                personA.base64.mimeType,
                personB.base64.base64,
                personB.base64.mimeType,
                config
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, `Pixa Together (${mode})`);
            setLastCreationId(creationId);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e) {
            console.error(e);
            alert("Generation failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !resultImage) return;
        setIsRefunding(true);
        try {
            // Pass the creation ID and Config so Admin can see context
            const res = await processRefundRequest(
                auth.user.uid,
                auth.user.email,
                cost,
                reason,
                "User generated image",
                lastCreationId || undefined,
                lastConfig || undefined
            );

            if (res.success) {
                if (res.type === 'refund') {
                    // Update local user credits instantly
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null);
                    setResultImage(null); // Clear the "bad" image
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

    const handleNewSession = () => {
        setPersonA(null);
        setPersonB(null);
        setReferencePose(null);
        setResultImage(null);
        setCustomDescription('');
        setLastCreationId(null);
        // Reset defaults
        setMode('creative');
        setRelationship('Best Friends');
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    // Validation
    const isReenactValid = mode === 'reenact' ? !!referencePose : true;
    const canGenerate = !!personA && !!personB && isReenactValid && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Together"
                description="Reality Simulator. Merge two people into any scene, era, or art style."
                icon={<PixaTogetherIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={handleGenerate} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[1000px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Reality"
                }}
                scrollRef={scrollRef}
                customActionButtons={
                    resultImage ? (
                        <>
                            <button onClick={() => setShowMagicEditor(true)} className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                                <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> <span>Magic Editor</span>
                            </button>
                            <button onClick={() => setShowRefundModal(true)} className="bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap">
                                <FlagIcon className="w-4 h-4 sm:w-5 sm:h-5"/> <span>Report Issue</span>
                            </button>
                        </>
                    ) : null
                }
                
                // Left: Canvas
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-6 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}
                        
                        <div className="flex flex-col items-center justify-center h-full w-full gap-6">
                            {(!personA && !personB) ? (
                                <div className="text-center opacity-50 select-none">
                                    <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <PixaTogetherIcon className="w-10 h-10 text-pink-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-300">Reality Canvas</h3>
                                    <p className="text-sm text-gray-300 mt-1">Select a mode to begin.</p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {/* Visual Representation of Inputs */}
                                    <div className="grid grid-cols-2 gap-4 max-w-lg w-full">
                                        {personA && (
                                            <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform -rotate-3 hover:rotate-0 transition-transform duration-300 z-10">
                                                <img src={personA.url} className="w-full h-full object-cover" alt="Person A" />
                                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Person A</div>
                                            </div>
                                        )}
                                        {personB && (
                                            <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
                                                <img src={personB.url} className="w-full h-full object-cover" alt="Person B" />
                                                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Person B</div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Overlay for Reference Pose in Reenact Mode */}
                                    {mode === 'reenact' && referencePose && (
                                        <div className="absolute bottom-4 right-4 w-32 aspect-[3/4] bg-white rounded-xl shadow-2xl border-4 border-white transform rotate-6 z-30 animate-fadeInUp">
                                            <img src={referencePose.url} className="w-full h-full object-cover rounded-lg" alt="Reference" />
                                            <div className="absolute top-2 right-2 bg-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Target Pose</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                }
                
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* 1. Mode Switcher */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block ml-1">1. Select Engine</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <ModeCard 
                                        title="Creative" 
                                        description="Full Control" 
                                        icon={<SparklesIcon className="w-5 h-5"/>} 
                                        selected={mode === 'creative'} 
                                        onClick={() => setMode('creative')} 
                                    />
                                    <ModeCard 
                                        title="Reenact" 
                                        description="Copy Pose" 
                                        icon={<CameraIcon className="w-5 h-5"/>} 
                                        selected={mode === 'reenact'} 
                                        onClick={() => setMode('reenact')} 
                                    />
                                    <ModeCard 
                                        title="Pro Duo" 
                                        description="Corporate" 
                                        icon={<ShieldCheckIcon className="w-5 h-5"/>} 
                                        selected={mode === 'professional'} 
                                        onClick={() => setMode('professional')} 
                                    />
                                </div>
                            </div>

                            {/* 2. Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">2. Upload Subjects</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <CompactUpload 
                                        label="Person A" 
                                        image={personA} 
                                        onUpload={handleUpload(setPersonA)} 
                                        onClear={() => setPersonA(null)} 
                                        icon={<UserIcon className="w-6 h-6 text-blue-400"/>}
                                    />
                                    <CompactUpload 
                                        label="Person B" 
                                        image={personB} 
                                        onUpload={handleUpload(setPersonB)} 
                                        onClear={() => setPersonB(null)} 
                                        icon={<UserIcon className="w-6 h-6 text-pink-400"/>}
                                    />
                                </div>
                                
                                {/* 3. Special Upload for Reenact */}
                                {mode === 'reenact' && (
                                    <div className="animate-fadeIn mt-6">
                                        <div className="flex items-center gap-2 mb-3 ml-1">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                            <label className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Reference Pose Required</label>
                                        </div>
                                        <CompactUpload 
                                            label="Target Pose / Scene" 
                                            image={referencePose} 
                                            onUpload={handleUpload(setReferencePose)} 
                                            onClear={() => setReferencePose(null)} 
                                            icon={<CameraIcon className="w-6 h-6 text-purple-400"/>}
                                            heightClass="h-32"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 px-1">Upload a photo with the exact pose or composition you want to copy.</p>
                                    </div>
                                )}
                            </div>

                            {/* 4. Configuration Engines */}
                            {mode === 'creative' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                                    
                                    {/* Standard Options */}
                                    <SelectionGrid label="3. Relationship" options={relationshipOptions} value={relationship} onChange={(val) => { setRelationship(val); autoScroll(); }} />
                                    <SelectionGrid label="4. Environment" options={envOptions} value={environmentPreset} onChange={(val) => { setEnvironmentPreset(val); autoScroll(); }} />
                                    {environmentPreset === 'Custom' && (
                                        <div className="mt-2 animate-fadeIn">
                                            <InputField 
                                                placeholder="Describe place (e.g. Hogwarts Great Hall)" 
                                                value={customEnvironment} 
                                                onChange={(e: any) => setCustomEnvironment(e.target.value)} 
                                            />
                                        </div>
                                    )}
                                    <SelectionGrid label="5. Pose Guide" options={poseOptions} value={pose} onChange={setPose} />
                                    <SelectionGrid label="6. Clothing" options={clothingOptions} value={clothingMode} onChange={(val: any) => setClothingMode(val)} />
                                    
                                    {/* Custom Description - New Field */}
                                    <TextAreaField
                                        label="7. Custom Instructions (Optional)"
                                        placeholder="E.g. 'Make it golden hour', 'Person A is holding a rose', 'Cinematic cyberpunk vibe'"
                                        value={customDescription}
                                        onChange={(e: any) => setCustomDescription(e.target.value)}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {mode === 'professional' && (
                                <div className="animate-fadeIn bg-blue-50/50 p-5 rounded-2xl border border-blue-100 text-xs text-blue-900 leading-relaxed shadow-sm">
                                    <p className="font-bold mb-2">Professional Mode Active</p>
                                    <p className="text-blue-700/80">Pixa will automatically:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-blue-700">
                                        <li>Dress subjects in premium business attire.</li>
                                        <li>Generate a modern office or studio background.</li>
                                        <li>Apply soft, flattering studio lighting.</li>
                                        <li>Ensure confident, professional poses.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            
            {/* Magic Editor Modal */}
            {showMagicEditor && resultImage && (
                <MagicEditorModal 
                    imageUrl={resultImage} 
                    onClose={() => setShowMagicEditor(false)} 
                    onSave={handleEditorSave}
                    deductCredit={handleDeductEditCredit}
                />
            )}

            {/* Refund Modal */}
            {showRefundModal && (
                <RefundModal 
                    onClose={() => setShowRefundModal(false)}
                    onConfirm={handleRefundRequest}
                    isProcessing={isRefunding}
                />
            )}

            {/* Notifications */}
            {notification && (
                <ToastNotification 
                    message={notification.msg} 
                    type={notification.type} 
                    onClose={() => setNotification(null)} 
                />
            )}
        </>
    );
};
