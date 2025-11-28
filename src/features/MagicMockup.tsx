
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { 
    MockupIcon, 
    UploadIcon, 
    XIcon, 
    UploadTrayIcon,
    SparklesIcon, 
    CreditCardIcon, 
    MagicWandIcon, 
    TrashIcon 
} from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

// Compact Upload Component (Standardized)
const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-48" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <div className={`relative w-full ${heightClass} bg-white rounded-3xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${image ? 'border-indigo-100 shadow-sm' : 'border-dashed border-indigo-200 hover:border-indigo-400 cursor-pointer bg-indigo-50/30'}`}
                onClick={() => !image && inputRef.current?.click()}
            >
                {image ? (
                    <>
                        <img src={image.url} className="max-w-[80%] max-h-[80%] object-contain shadow-sm" alt={label} />
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClear(); }}
                            className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all z-10"
                        >
                            <TrashIcon className="w-4 h-4"/>
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            {icon}
                        </div>
                        <p className="text-sm font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">Upload Design</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">Logo / Art / Screen</p>
                    </div>
                )}
            </div>
            <input ref={inputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={onUpload} />
        </div>
    );
};

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // Configurations
    const [targetObject, setTargetObject] = useState('');
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Magic Mockup'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Options
    const objectOptions = ['T-Shirt', 'Hoodie', 'iPhone 15', 'MacBook', 'Coffee Mug', 'Water Bottle', 'Tote Bag', 'Notebook', 'Business Card', 'Packaging Box', 'Neon Sign', 'Wall Sign'];
    const materialOptions = ['Standard Ink', 'Embroidery', 'Gold Foil', 'Silver Foil', 'Deboss', 'Emboss', 'Laser Etch', 'Smart Object'];
    const vibeOptions = ['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban'];

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Mapping Surface Geometry...", "Simulating Physics...", "Calculating Reflections...", "Rendering Textures...", "Final Polish..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
                }
            }, 100); 
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setDesignImage({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!designImage || !auth.user || !targetObject || !material || !sceneVibe) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);

        try {
            const res = await generateMagicMockup(
                designImage.base64.base64,
                designImage.base64.mimeType,
                targetObject,
                material,
                sceneVibe
            );

            const url = `data:image/png;base64,${res}`;
            setResultImage(url);
            
            saveCreation(auth.user.uid, url, 'Magic Mockup');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Magic Mockup');
            
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
        setDesignImage(null);
        setResultImage(null);
        setTargetObject('');
        setMaterial('');
        setSceneVibe('');
    };

    const handleEditorSave = (newUrl: string) => {
        setResultImage(newUrl);
        saveCreation(auth.user!.uid, newUrl, 'Magic Mockup (Edited)');
    };

    const handleDeductEditCredit = async () => {
        if(auth.user) {
            const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        }
    };

    const canGenerate = !!designImage && !!targetObject && !!material && !!sceneVibe && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Magic Mockup"
                description="The Reality Engine. Turn flat designs into photorealistic physical objects with accurate material physics."
                icon={<MockupIcon className="w-6 h-6 text-indigo-600"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={resultImage}
                onResetResult={handleGenerate} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[750px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Render Reality"
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
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        ) : designImage ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={designImage.url} className="max-w-full max-h-full object-contain shadow-sm" alt="Design Preview" />
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-gray-500 shadow-sm border border-gray-100">
                                    Source Design
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MockupIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Mockup Canvas</h3>
                                <p className="text-sm text-gray-300 mt-1">Upload a design to start.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }

                // Right: Config
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* Upload Section - Always Visible if empty, compacted if full */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">1. Source Design</label>
                                <CompactUpload 
                                    label="Design" 
                                    image={designImage} 
                                    onUpload={handleUpload} 
                                    onClear={() => setDesignImage(null)} 
                                    icon={<UploadTrayIcon className="w-8 h-8 text-indigo-400"/>}
                                    heightClass={designImage ? 'h-32' : 'h-32'}
                                />
                            </div>

                            {designImage && (
                                <div className="animate-fadeIn space-y-6">
                                    <div className="h-px w-full bg-gray-200"></div>
                                    
                                    <SelectionGrid 
                                        label="2. Target Object" 
                                        options={objectOptions} 
                                        value={targetObject} 
                                        onChange={(val) => { setTargetObject(val); autoScroll(); }} 
                                    />

                                    {targetObject && (
                                        <SelectionGrid 
                                            label="3. Material Physics" 
                                            options={materialOptions} 
                                            value={material} 
                                            onChange={(val) => { setMaterial(val); autoScroll(); }} 
                                        />
                                    )}

                                    {material && (
                                        <SelectionGrid 
                                            label="4. Scene Vibe" 
                                            options={vibeOptions} 
                                            value={sceneVibe} 
                                            onChange={(val) => { setSceneVibe(val); autoScroll(); }} 
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && (
                <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />
            )}
        </>
    );
};
