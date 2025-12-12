import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone, TextAreaField } from '../components/FeatureLayout';
import { PixaTogetherIcon, UploadIcon, XIcon, UserIcon, SparklesIcon, CreditCoinIcon, MagicWandIcon, BuildingIcon, InformationCircleIcon, CameraIcon, FilmIcon, LockIcon, EngineIcon, CheckIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

// --- Sub Components ---

const CompactUpload: React.FC<{ 
    label: string; 
    subLabel?: string;
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
}> = ({ label, subLabel, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group h-full">
            <div className="flex justify-between items-baseline mb-2 ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {subLabel && <span className="text-[10px] text-gray-400 font-medium">{subLabel}</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10">
                        <XIcon className="w-3 h-3"/>
                    </button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const PremiumCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-fadeIn">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50">
            {icon && <div className="text-indigo-500">{icon}</div>}
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

// Constants
const PRO_BACKGROUNDS = [
    { id: 'studio', label: 'Modern Studio' },
    { id: 'outdoor', label: 'Outdoor Park' },
    { id: 'luxury', label: 'Luxury Rooftop' },
    { id: 'street', label: 'City Street' },
    { id: 'home', label: 'Cozy Home' },
    { id: 'cafe', label: 'Cafe' },
    { id: 'forest', label: 'Deep Forest' },
    { id: 'beach', label: 'Beach' }
];

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null); // Used for relationship or reference pose in reenact
    
    // Config State
    const [mode, setMode] = useState<'creative' | 'reenact' | 'professional'>('creative');
    const [relationship, setRelationship] = useState('Friends');
    const [mood, setMood] = useState('Happy');
    const [environment, setEnvironment] = useState('Outdoor Park'); // Default
    const [pose, setPose] = useState('Standing side by side');
    const [timeline, setTimeline] = useState('Present Day');
    const [customDescription, setCustomDescription] = useState('');
    
    // Professional/Reenact specifics
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Match Vibe');
    const [locks, setLocks] = useState({ age: true, hair: false, accessories: false });
    
    // Result State
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    
    // UI State
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const cost = appConfig?.featureCosts['Pixa Together'] || appConfig?.featureCosts['Magic Soul'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Scanning biometrics...", "Analyzing relationship dynamics...", "Calculating lighting physics...", "Generating environment...", "Refining details..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

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
        
        setLoading(true);
        setResultImage(null);
        setLastCreationId(null);

        const config: PixaTogetherConfig = {
            mode,
            relationship: mode === 'creative' ? relationship : 'N/A',
            mood,
            environment: environment,
            pose: mode === 'creative' ? pose : 'N/A',
            timeline,
            customDescription,
            faceStrength: 1.0, // Default max
            clothingMode,
            locks,
            autoFix: true,
            // For Reenact mode, Person B slot is used as Reference Pose
            referencePoseBase64: (mode === 'reenact' && personB) ? personB.base64.base64 : undefined,
            referencePoseMimeType: (mode === 'reenact' && personB) ? personB.base64.mimeType : undefined,
        };

        // For creative mode with 2 people, pass personB as second subject
        const secondSubject = (mode === 'creative' && personB) ? personB : null;

        try {
            const res = await generateMagicSoul(
                personA.base64.base64,
                personA.base64.mimeType,
                secondSubject?.base64.base64,
                secondSubject?.base64.mimeType,
                config
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
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Pixa Together", lastCreationId || undefined);
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
        setPersonA(null);
        setPersonB(null);
        setResultImage(null);
        setCustomDescription('');
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

    const canGenerate = !!personA && !isLowCredits;

    return (
        <>
            <FeatureLayout
                title="Pixa Together"
                description="Combine people, swap faces, or generate professional portraits with perfect consistency."
                icon={<PixaTogetherIcon className="w-14 h-14" />}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate}
                onNewSession={resultImage ? undefined : handleNewSession}
                resultHeightClass="h-[850px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Magic" }}
                scrollRef={scrollRef}
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
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
                                    <PixaTogetherIcon className="w-10 h-10 text-purple-300" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Magic Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload photos to begin.</p>
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
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge</button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn flex flex-col h-full relative">
                            {/* Mode Selection */}
                            <div className={PixaTogetherStyles.engineGrid}>
                                <button onClick={() => { setMode('creative'); setPersonB(null); }} className={`${PixaTogetherStyles.engineCard} ${mode === 'creative' ? PixaTogetherStyles.engineCardSelected : PixaTogetherStyles.engineCardInactive}`}>
                                    <div className={`${PixaTogetherStyles.engineIconBox} ${mode === 'creative' ? PixaTogetherStyles.engineIconSelected : PixaTogetherStyles.engineIconInactive}`}><SparklesIcon className="w-4 h-4"/></div>
                                    <h3 className={PixaTogetherStyles.engineTitle}>Creative</h3>
                                    <p className={`${PixaTogetherStyles.engineDesc} ${mode === 'creative' ? PixaTogetherStyles.engineDescSelected : PixaTogetherStyles.engineDescInactive}`}>Merge & Imagine</p>
                                </button>
                                <button onClick={() => { setMode('reenact'); setPersonB(null); }} className={`${PixaTogetherStyles.engineCard} ${mode === 'reenact' ? PixaTogetherStyles.engineCardSelected : PixaTogetherStyles.engineCardInactive}`}>
                                    <div className={`${PixaTogetherStyles.engineIconBox} ${mode === 'reenact' ? PixaTogetherStyles.engineIconSelected : PixaTogetherStyles.engineIconInactive}`}><CameraIcon className="w-4 h-4"/></div>
                                    <h3 className={PixaTogetherStyles.engineTitle}>Re-Enact</h3>
                                    <p className={`${PixaTogetherStyles.engineDesc} ${mode === 'reenact' ? PixaTogetherStyles.engineDescSelected : PixaTogetherStyles.engineDescInactive}`}>Face Swap VFX</p>
                                </button>
                                <button onClick={() => { setMode('professional'); setPersonB(null); }} className={`${PixaTogetherStyles.engineCard} ${mode === 'professional' ? PixaTogetherStyles.engineCardSelected : PixaTogetherStyles.engineCardInactive}`}>
                                    <div className={`${PixaTogetherStyles.engineIconBox} ${mode === 'professional' ? PixaTogetherStyles.engineIconSelected : PixaTogetherStyles.engineIconInactive}`}><UserIcon className="w-4 h-4"/></div>
                                    <h3 className={PixaTogetherStyles.engineTitle}>Pro Headshot</h3>
                                    <p className={`${PixaTogetherStyles.engineDesc} ${mode === 'professional' ? PixaTogetherStyles.engineDescSelected : PixaTogetherStyles.engineDescInactive}`}>LinkedIn Style</p>
                                </button>
                            </div>

                            {/* Uploads */}
                            <PremiumCard title="1. Source Subjects" icon={<UserIcon className="w-5 h-5"/>}>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload 
                                        label="Person A (Main)" 
                                        image={personA} 
                                        onUpload={handleUpload(setPersonA)} 
                                        onClear={() => setPersonA(null)} 
                                        icon={<UserIcon className="w-6 h-6 text-indigo-400"/>} 
                                    />
                                    {mode === 'creative' && (
                                        <CompactUpload 
                                            label="Person B (Optional)" 
                                            subLabel="For Couples/Groups"
                                            image={personB} 
                                            onUpload={handleUpload(setPersonB)} 
                                            onClear={() => setPersonB(null)} 
                                            icon={<UserIcon className="w-6 h-6 text-purple-400"/>} 
                                        />
                                    )}
                                    {mode === 'reenact' && (
                                        <CompactUpload 
                                            label="Reference Scene" 
                                            subLabel="Target Body/Pose"
                                            image={personB} 
                                            onUpload={handleUpload(setPersonB)} 
                                            onClear={() => setPersonB(null)} 
                                            icon={<CameraIcon className="w-6 h-6 text-green-400"/>} 
                                        />
                                    )}
                                </div>
                            </PremiumCard>

                            {/* Controls */}
                            {mode === 'creative' && (
                                <div className="space-y-4">
                                    <PremiumCard title="2. Set The Scene" icon={<BuildingIcon className="w-5 h-5"/>}>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {PRO_BACKGROUNDS.map(bg => (
                                                <button
                                                    key={bg.id}
                                                    onClick={() => setEnvironment(bg.label)}
                                                    className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${
                                                        environment === bg.label 
                                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg transform -translate-y-0.5' 
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {bg.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SelectionGrid label="Mood" options={['Happy', 'Romantic', 'Cinematic', 'Vintage', 'Adventure']} value={mood} onChange={setMood} />
                                            <SelectionGrid label="Time Era" options={['Present Day', '1990s Vintage', 'Future Sci-Fi', '1920s Noir', 'Medieval']} value={timeline} onChange={setTimeline} />
                                        </div>
                                        <div className="mt-4">
                                            <InputField label="Custom Prompt (Optional override)" placeholder="e.g. Riding horses on a beach" value={customDescription} onChange={(e: any) => setCustomDescription(e.target.value)} />
                                        </div>
                                    </PremiumCard>
                                </div>
                            )}

                            {mode === 'professional' && (
                                <PremiumCard title="2. Professional Settings" icon={<UserIcon className="w-5 h-5"/>}>
                                    <SelectionGrid label="Attire" options={['Professional Attire', 'Keep Original']} value={clothingMode} onChange={(v: any) => setClothingMode(v)} />
                                    <SelectionGrid label="Environment" options={['Modern Studio', 'Blurred Office', 'City Skyline']} value={environment} onChange={setEnvironment} />
                                </PremiumCard>
                            )}

                            {mode === 'reenact' && (
                                <PremiumCard title="2. Re-Enactment Settings" icon={<FilmIcon className="w-5 h-5"/>}>
                                    <div className="p-3 bg-blue-50 text-blue-700 rounded-xl text-xs leading-relaxed border border-blue-100 mb-4">
                                        <InformationCircleIcon className="w-4 h-4 inline mr-1 -mt-0.5"/>
                                        <strong>VFX Mode:</strong> The face from "Person A" will be blended onto the body/scene of the "Reference Scene".
                                    </div>
                                    <SelectionGrid label="Era Match" options={['Present Day', '1990s Vintage', 'Future Sci-Fi', 'Medieval']} value={timeline} onChange={setTimeline} />
                                </PremiumCard>
                            )}

                            <PremiumCard title="3. Identity Locks" icon={<LockIcon className="w-5 h-5"/>}>
                                <div className="flex gap-4">
                                    <button onClick={() => setLocks({...locks, age: !locks.age})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${locks.age ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                        Lock Age {locks.age && <CheckIcon className="w-3 h-3 inline ml-1"/>}
                                    </button>
                                    <button onClick={() => setLocks({...locks, hair: !locks.hair})} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${locks.hair ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-gray-500 border-gray-200'}`}>
                                        Lock Hair {locks.hair && <CheckIcon className="w-3 h-3 inline ml-1"/>}
                                    </button>
                                </div>
                            </PremiumCard>
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
