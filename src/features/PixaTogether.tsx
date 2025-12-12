
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { 
    PixaTogetherIcon, UploadIcon, XIcon, UserIcon, UsersIcon, SparklesIcon, 
    CreditCoinIcon, MagicWandIcon, BuildingIcon, InformationCircleIcon, ArrowUpCircleIcon,
    CameraIcon, CheckIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

const PremiumCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fadeIn">
        <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
            <div className="p-1.5 bg-gray-50 rounded-lg text-gray-500">
                {icon}
            </div>
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string;
    optional?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal opacity-70">(Optional)</span>}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10">
                        <XIcon className="w-3 h-3"/>
                    </button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
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
    
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [relationship, setRelationship] = useState('Friends');
    
    // Creative Mode
    const [mood, setMood] = useState('Happy');
    const [environment, setEnvironment] = useState('Outdoor Park');
    const [pose, setPose] = useState('Standing side by side');
    
    // Professional Mode
    const [proBackground, setProBackground] = useState('Modern Studio');

    // Locks
    const [lockAge, setLockAge] = useState(true);
    const [lockHair, setLockHair] = useState(false);
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 5;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    const PRO_BACKGROUNDS = [
        { id: 'studio', label: 'Modern Studio' },
        { id: 'office', label: 'Executive Office' },
        { id: 'outdoor', label: 'City Business District' },
        { id: 'dark', label: 'Dark Mode Studio' },
    ];

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing facial biometrics...", "Mapping skeletal structure...", "Calculating lighting physics...", "Generating textures...", "Compositing final shot..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!personA || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);

        const config: PixaTogetherConfig = {
            mode,
            relationship,
            mood,
            environment: mode === 'professional' ? proBackground : environment,
            pose,
            faceStrength: 1.0,
            clothingMode: mode === 'professional' ? 'Professional Attire' : 'Match Vibe',
            locks: { age: lockAge, hair: lockHair, accessories: false },
            autoFix: true,
            referencePoseBase64: refPose?.base64.base64,
            referencePoseMimeType: refPose?.base64.mimeType
        };

        try {
            const res = await generateMagicSoul(
                personA.base64.base64,
                personA.base64.mimeType,
                personB?.base64.base64,
                personB?.base64.mimeType,
                config
            );
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Together');
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Together');
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) setMilestoneBonus(bonus);
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

        } catch (e: any) {
            console.error(e);
            alert(`Generation failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
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
            const res = await processRefundRequest(
                auth.user.uid, 
                auth.user.email, 
                cost, 
                reason, 
                "Pixa Together Generation", 
                lastCreationId || undefined
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
            alert("Refund processing failed: " + e.message); 
        } finally { 
            setIsRefunding(false); 
        } 
    };

    const handleNewSession = () => {
        setPersonA(null); setPersonB(null); setRefPose(null); setResultImage(null); setLastCreationId(null);
    };

    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Together (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

    const canGenerate = !!personA && !isLowCredits; 

    return (
        <>
            <FeatureLayout 
                title="Pixa Together"
                description="Combine people into one photo or create professional headshots."
                icon={<PixaTogetherIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate}
                onNewSession={resultImage ? undefined : handleNewSession}
                resultHeightClass="h-[800px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ 
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", 
                    hideIcon: true, 
                    label: "Generate Magic" 
                }}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PixaTogetherIcon className="w-12 h-12 text-purple-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Composition Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload photos to preview layout.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge</button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            {/* Mode Selection */}
                            <div className={PixaTogetherStyles.modeCard}>
                                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-full">
                                    {['creative', 'reenact', 'professional'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => { setMode(m as any); autoScroll(); }}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                                                mode === m 
                                                ? 'bg-white text-indigo-600 shadow-sm' 
                                                : 'text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="grid grid-cols-2 gap-4">
                                <CompactUpload label="Person A" image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-6 h-6 text-indigo-400"/>} />
                                {mode !== 'professional' && (
                                    <CompactUpload label="Person B (Optional)" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UsersIcon className="w-6 h-6 text-purple-400"/>} optional={true} />
                                )}
                            </div>

                            {mode === 'reenact' && (
                                <div className="animate-fadeIn">
                                    <CompactUpload label="Reference Pose / Style" image={refPose} onUpload={handleUpload(setRefPose)} onClear={() => setRefPose(null)} icon={<CameraIcon className="w-6 h-6 text-blue-400"/>} heightClass="h-40" />
                                    <p className="text-[10px] text-gray-400 mt-2 px-1">Pixa will copy the pose, lighting, and composition of this image exactly.</p>
                                </div>
                            )}

                            {mode === 'creative' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <SelectionGrid label="1. Mood" options={['Happy', 'Cinematic', 'Romantic', 'Vintage', 'Luxury', 'Adventure', 'Candid']} value={mood} onChange={setMood} />
                                    <SelectionGrid label="2. Environment" options={['Outdoor Park', 'Beach', 'Luxury Rooftop', 'City Street', 'Cozy Home', 'Cafe', 'Deep Forest', 'Snowy Mountain']} value={environment} onChange={setEnvironment} />
                                    <SelectionGrid label="3. Pose / Action" options={['Standing side by side', 'Sitting together', 'Walking holding hands', 'Close-up hug', 'Selfie angle', 'Back to back']} value={pose} onChange={setPose} />
                                </div>
                            )}

                            {mode === 'professional' && (
                                <div className="space-y-6 animate-fadeIn">
                                    {/* 2. Background Selector - Bento Grid */}
                                    <PremiumCard title="2. Choose Location" icon={<BuildingIcon className="w-5 h-5"/>}>
                                        <div className="flex flex-wrap gap-2">
                                            {PRO_BACKGROUNDS.map(bg => {
                                                const isSelected = proBackground === bg.label;
                                                return (
                                                    <button
                                                        key={bg.id}
                                                        onClick={() => setProBackground(bg.label)}
                                                        className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                                                            isSelected 
                                                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg transform -translate-y-0.5' 
                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {bg.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        <div className="mt-6 flex items-start gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <InformationCircleIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                            <p className="text-[10px] text-gray-500 leading-relaxed">
                                                Pixa uses <strong>Rembrandt lighting</strong> physics to blend the subject naturally. Face details are preserved while clothing and background are generated.
                                            </p>
                                        </div>
                                    </PremiumCard>
                                </div>
                            )}

                            {/* Identity Lock Settings */}
                            <div className="pt-4 border-t border-gray-100">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Identity Preservation</label>
                                <div className="flex gap-3">
                                    <button onClick={() => setLockAge(!lockAge)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${lockAge ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                                        {lockAge && <CheckIcon className="w-3 h-3 inline mr-1 mb-0.5"/>} Lock Age
                                    </button>
                                    <button onClick={() => setLockHair(!lockHair)} className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${lockHair ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                                        {lockHair && <CheckIcon className="w-3 h-3 inline mr-1 mb-0.5"/>} Lock Hair
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonA)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Together" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
