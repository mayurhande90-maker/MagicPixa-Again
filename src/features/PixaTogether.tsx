
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
    InformationCircleIcon
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
    const borderColor = color === 'pink' ? 'border-pink-100 hover:border-pink-300' : 'border-blue-100 hover:border-blue-300';
    const bgColor = color === 'pink' ? 'bg-pink-50 hover:bg-pink-100/50' : 'bg-blue-50 hover:bg-blue-100/50';
    const dashedBorder = color === 'pink' ? 'border-pink-300' : 'border-blue-300';

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

const ToggleOption: React.FC<{ label: string; checked: boolean; onChange: (val: boolean) => void }> = ({ label, checked, onChange }) => (
    <button 
        onClick={() => onChange(!checked)}
        className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${
            checked 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-800' 
            : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
        }`}
    >
        <span className="text-xs font-bold">{label}</span>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}>
            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-6' : 'left-1'}`}></div>
        </div>
    </button>
);

export const PixaTogether: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // Assets with metadata
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File; warnings?: string[] } | null>(null);
    
    // Core Config
    const [relationship, setRelationship] = useState('Best Friends');
    const [mood, setMood] = useState('Travel / Beach');
    const [environmentPreset, setEnvironmentPreset] = useState('Goa Beach');
    const [customEnvironment, setCustomEnvironment] = useState('');
    
    // Advanced Controls
    const [pose, setPose] = useState('Side-by-Side');
    const [faceStrength, setFaceStrength] = useState(100); // 0-100
    const [locks, setLocks] = useState({
        age: true,
        hair: false,
        accessories: false, // Glasses/Beard
        clothing: false
    });
    const [autoFix, setAutoFix] = useState(true);
    
    // UI State
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

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

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing facial structures...", "Matching skin tones & lighting...", "Generating pose interaction...", "Applying environment vibe...", "Finalizing photo match..."];
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
                // We could add more client-side checks here if needed
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
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);

        try {
            const config: PixaTogetherConfig = {
                relationship,
                mood,
                environment: environmentPreset === 'Custom' ? customEnvironment : environmentPreset,
                pose,
                faceStrength,
                locks,
                autoFix
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
            saveCreation(auth.user.uid, dataUri, 'Pixa Together');
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
        setResultImage(null);
        setRelationship('Best Friends');
        setMood('Travel / Beach');
        setEnvironmentPreset('Goa Beach');
        setCustomEnvironment('');
        setShowAdvanced(false);
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

    const canGenerate = !!personA && !!personB && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Together"
                description="Merge two photos into one perfect moment. Use advanced controls to match lighting, preserve details, and set the vibe."
                icon={<PixaTogetherIcon className="w-14 h-14"/>}
                rawIcon={true}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={handleGenerate} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[850px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Generate Magic Photo"
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
                                    <h3 className="text-xl font-bold text-gray-300">Magic Canvas</h3>
                                    <p className="text-sm text-gray-300 mt-1">Upload photos to start.</p>
                                </div>
                            ) : (
                                <div className="flex gap-4 items-center justify-center w-full h-full max-h-[80%]">
                                    {personA && (
                                        <div className="relative h-full aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform -rotate-2 hover:rotate-0 transition-transform duration-300 hover:z-10">
                                            <img src={personA.url} className="w-full h-full object-cover" alt="Person A" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Person A</div>
                                        </div>
                                    )}
                                    {personA && personB && <div className="text-2xl font-black text-gray-200">+</div>}
                                    {personB && (
                                        <div className="relative h-full aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden shadow-md border-2 border-white transform rotate-2 hover:rotate-0 transition-transform duration-300 hover:z-10">
                                            <img src={personB.url} className="w-full h-full object-cover" alt="Person B" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Person B</div>
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
                            
                            {/* 1. Dual Uploads */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Upload People</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            {/* 2. Base Configuration */}
                            <div className="space-y-6">
                                <SelectionGrid label="2. Relationship Dynamic" options={relationshipOptions} value={relationship} onChange={(val) => { setRelationship(val); autoScroll(); }} />
                                
                                <div>
                                    <SelectionGrid label="3. Mood & Vibe" options={moodOptions} value={mood} onChange={(val) => { setMood(val); autoScroll(); }} />
                                </div>

                                <div>
                                    <SelectionGrid label="4. Environment" options={envOptions} value={environmentPreset} onChange={(val) => { setEnvironmentPreset(val); autoScroll(); }} />
                                    {environmentPreset === 'Custom' && (
                                        <div className="mt-2 animate-fadeIn">
                                            <InputField 
                                                placeholder="Describe place (e.g. Kyoto Cherry Blossom Park)" 
                                                value={customEnvironment} 
                                                onChange={(e: any) => setCustomEnvironment(e.target.value)} 
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Advanced Controls (Accordion) */}
                            <div className="border-t border-gray-100 pt-4">
                                <button 
                                    onClick={() => setShowAdvanced(!showAdvanced)} 
                                    className="w-full flex items-center justify-between bg-gray-50 p-4 rounded-xl hover:bg-gray-100 transition-colors group"
                                >
                                    <div className="flex items-center gap-2 text-gray-600 font-bold text-xs uppercase tracking-wider group-hover:text-indigo-600">
                                        <AdjustmentsVerticalIcon className="w-4 h-4"/>
                                        Fine-Tuning Controls
                                    </div>
                                    <span className="text-gray-400">{showAdvanced ? '−' : '+'}</span>
                                </button>

                                {showAdvanced && (
                                    <div className="mt-4 p-4 border border-gray-100 rounded-xl space-y-6 animate-fadeIn">
                                        
                                        {/* Pose */}
                                        <SelectionGrid label="Force Pose" options={poseOptions} value={pose} onChange={setPose} />

                                        {/* Identity Strength */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Face Preservation Strength</label>
                                                <span className="text-xs font-bold text-indigo-600">{faceStrength}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="50" 
                                                max="100" 
                                                value={faceStrength} 
                                                onChange={(e) => setFaceStrength(parseInt(e.target.value))} 
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <p className="text-[9px] text-gray-400 mt-1">Higher = Strict identity match. Lower = Better blending.</p>
                                        </div>

                                        {/* Locks */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Feature Locks</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <ToggleOption label="Lock Age" checked={locks.age} onChange={(v) => setLocks(p => ({...p, age: v}))} />
                                                <ToggleOption label="Lock Hair" checked={locks.hair} onChange={(v) => setLocks(p => ({...p, hair: v}))} />
                                                <ToggleOption label="Lock Glasses/Beard" checked={locks.accessories} onChange={(v) => setLocks(p => ({...p, accessories: v}))} />
                                                <ToggleOption label="Lock Clothing" checked={locks.clothing} onChange={(v) => setLocks(p => ({...p, clothing: v}))} />
                                            </div>
                                        </div>

                                        {/* Auto Fix */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <ToggleOption label="✨ Auto-Fix Lighting & Clarity" checked={autoFix} onChange={setAutoFix} />
                                        </div>
                                    </div>
                                )}
                            </div>
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
