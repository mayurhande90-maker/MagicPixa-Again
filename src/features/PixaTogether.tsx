
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { 
    PixaTogetherIcon, 
    XIcon, 
    UserIcon, 
    SparklesIcon, 
    CreditCoinIcon, 
    MagicWandIcon,
    ShieldCheckIcon,
    AdjustmentsVerticalIcon,
    InformationCircleIcon,
    CameraIcon,
    LightbulbIcon,
    UploadTrayIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicSoul, PixaTogetherConfig } from '../services/imageToolsService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

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

const ModeCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    selected: boolean;
    onClick: () => void;
    colorClass: string;
}> = ({ title, description, icon, selected, onClick, colorClass }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all w-full group relative overflow-hidden text-center h-28 ${
            selected 
            ? `border-${colorClass}-500 bg-${colorClass}-50 shadow-md`
            : `border-gray-100 bg-white hover:border-${colorClass}-200 hover:bg-gray-50`
        }`}
    >
        <div className={`mb-2 transition-transform group-hover:scale-110 ${selected ? `text-${colorClass}-600` : `text-gray-400`}`}>
            {icon}
        </div>
        <h3 className={`font-bold text-xs mb-0.5 ${selected ? `text-${colorClass}-900` : 'text-gray-700'}`}>{title}</h3>
        <p className={`text-[9px] ${selected ? `text-${colorClass}-700` : 'text-gray-400'}`}>{description}</p>
    </button>
);

const CompactUpload: React.FC<{
    label: string;
    image: { url: string; warnings?: string[] } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
    color?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40", color = "blue" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const borderColor = color === 'pink' ? 'border-pink-100 hover:border-pink-300' : (color === 'purple' ? 'border-purple-100 hover:border-purple-300' : 'border-blue-100 hover:border-blue-300');
    const bgColor = color === 'pink' ? 'bg-pink-50 hover:bg-pink-100/50' : (color === 'purple' ? 'bg-purple-50 hover:bg-purple-100/50' : 'bg-blue-50 hover:bg-blue-100/50');
    const dashedBorder = color === 'pink' ? 'border-pink-300' : (color === 'purple' ? 'border-purple-300' : 'border-blue-300');

    return (
        <div className="relative w-full group h-full">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            {image ? (
                <div className="flex flex-col gap-2">
                    <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 ${borderColor} flex items-center justify-center overflow-hidden shadow-sm`}>
                        <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                        <button
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                        >
                            <XIcon className="w-3 h-3"/>
                        </button>
                    </div>
                    {image.warnings && image.warnings.length > 0 && <SmartWarning issues={image.warnings} />}
                </div>
            ) : (
                <div
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed ${dashedBorder} ${bgColor} rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-3 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide text-center px-2">Upload {label}</p>
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
    const [pose, setPose] = useState('Side-by-Side');
    const [clothingMode, setClothingMode] = useState<'Keep Original' | 'Match Vibe' | 'Professional Attire'>('Keep Original');
    
    // New Creative Engines
    const [timeline, setTimeline] = useState('Present Day');
    const [universe, setUniverse] = useState('Photorealistic');

    // UI State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);

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
    
    const timelineOptions = ['Present Day', '1920s Gatsby', '1950s Diner', '1980s Neon', '1990s Grunge', '2000s Y2K', '2050 Cyberpunk', 'Victorian Era', 'Medieval'];
    const universeOptions = ['Photorealistic', 'Pixar 3D', 'Anime Studio', 'GTA Loading Screen', 'Vintage Oil Painting', 'Claymation', 'Cybernetic'];

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing facial structures...", "Matching skin tones & lighting...", "Simulating reality engine...", "Applying timeline physics...", "Finalizing photo match..."];
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

        try {
            const config: PixaTogetherConfig = {
                mode,
                relationship: mode === 'creative' ? relationship : 'Neutral', // Use selection only in creative
                mood: mode === 'creative' ? mood : '',
                environment: mode === 'creative' ? (environmentPreset === 'Custom' ? customEnvironment : environmentPreset) : '',
                pose: mode === 'creative' ? pose : '',
                timeline: mode === 'creative' ? timeline : '',
                universe: mode === 'creative' ? universe : '',
                
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
            saveCreation(auth.user.uid, dataUri, `Pixa Together (${mode})`);
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

    const handleNewSession = () => {
        setPersonA(null);
        setPersonB(null);
        setReferencePose(null);
        setResultImage(null);
        // Reset defaults
        setMode('creative');
        setRelationship('Best Friends');
        setTimeline('Present Day');
        setUniverse('Photorealistic');
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
                        <button onClick={() => setShowMagicEditor(true)} className="bg-[#4D7CFF] hover:bg-[#3b63cc] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                            <MagicWandIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white"/> <span>Magic Editor</span>
                        </button>
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
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block ml-1">1. Select Engine</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <ModeCard 
                                        title="Creative" 
                                        description="Full Control" 
                                        icon={<SparklesIcon className="w-5 h-5"/>} 
                                        selected={mode === 'creative'} 
                                        onClick={() => setMode('creative')} 
                                        colorClass="pink"
                                    />
                                    <ModeCard 
                                        title="Reenact" 
                                        description="Copy Pose" 
                                        icon={<CameraIcon className="w-5 h-5"/>} 
                                        selected={mode === 'reenact'} 
                                        onClick={() => setMode('reenact')} 
                                        colorClass="purple"
                                    />
                                    <ModeCard 
                                        title="Pro Duo" 
                                        description="Corporate" 
                                        icon={<ShieldCheckIcon className="w-5 h-5"/>} 
                                        selected={mode === 'professional'} 
                                        onClick={() => setMode('professional')} 
                                        colorClass="blue"
                                    />
                                </div>
                            </div>

                            {/* 2. Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Upload Subjects</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <CompactUpload 
                                        label="Person A" 
                                        image={personA} 
                                        onUpload={handleUpload(setPersonA)} 
                                        onClear={() => setPersonA(null)} 
                                        icon={<UserIcon className="w-6 h-6 text-blue-400"/>}
                                        color="blue"
                                    />
                                    <CompactUpload 
                                        label="Person B" 
                                        image={personB} 
                                        onUpload={handleUpload(setPersonB)} 
                                        onClear={() => setPersonB(null)} 
                                        icon={<UserIcon className="w-6 h-6 text-pink-400"/>}
                                        color="pink"
                                    />
                                </div>
                                
                                {/* 3. Special Upload for Reenact */}
                                {mode === 'reenact' && (
                                    <div className="animate-fadeIn">
                                        <div className="flex items-center gap-2 mb-2 ml-1">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
                                            <label className="text-xs font-bold text-purple-600 uppercase tracking-wider">Reference Pose Required</label>
                                        </div>
                                        <CompactUpload 
                                            label="Target Pose / Scene" 
                                            image={referencePose} 
                                            onUpload={handleUpload(setReferencePose)} 
                                            onClear={() => setReferencePose(null)} 
                                            icon={<CameraIcon className="w-6 h-6 text-purple-400"/>}
                                            color="purple"
                                            heightClass="h-32"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-2 px-1">Upload a photo with the exact pose or composition you want to copy.</p>
                                    </div>
                                )}
                            </div>

                            {/* 4. Configuration Engines */}
                            {mode === 'creative' && (
                                <div className="space-y-6 animate-fadeIn">
                                    <div className="h-px bg-gray-100"></div>
                                    
                                    {/* Timeline & Universe */}
                                    <div className="grid grid-cols-1 gap-6">
                                        <SelectionGrid label="3. Timeline Engine" options={timelineOptions} value={timeline} onChange={setTimeline} />
                                        <SelectionGrid label="4. Universe Style" options={universeOptions} value={universe} onChange={setUniverse} />
                                    </div>

                                    <div className="h-px bg-gray-100"></div>

                                    {/* Standard Options */}
                                    <SelectionGrid label="5. Relationship" options={relationshipOptions} value={relationship} onChange={(val) => { setRelationship(val); autoScroll(); }} />
                                    <SelectionGrid label="6. Environment" options={envOptions} value={environmentPreset} onChange={(val) => { setEnvironmentPreset(val); autoScroll(); }} />
                                    {environmentPreset === 'Custom' && (
                                        <div className="mt-2 animate-fadeIn">
                                            <InputField 
                                                placeholder="Describe place (e.g. Hogwarts Great Hall)" 
                                                value={customEnvironment} 
                                                onChange={(e: any) => setCustomEnvironment(e.target.value)} 
                                            />
                                        </div>
                                    )}
                                    <SelectionGrid label="7. Pose Guide" options={poseOptions} value={pose} onChange={setPose} />
                                    <SelectionGrid label="8. Clothing" options={clothingOptions} value={clothingMode} onChange={(val: any) => setClothingMode(val)} />
                                </div>
                            )}

                            {mode === 'professional' && (
                                <div className="animate-fadeIn bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800 leading-relaxed">
                                    <p><strong>Professional Mode Active:</strong> Pixa will automatically:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
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
        </>
    );
};
