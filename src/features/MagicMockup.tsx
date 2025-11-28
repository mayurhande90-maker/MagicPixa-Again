
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { 
    MockupIcon, 
    UploadIcon, 
    XIcon, 
    UploadTrayIcon,
    SparklesIcon, 
    CreditCardIcon, 
    MagicWandIcon, 
    TrashIcon,
    PaletteIcon,
    ArrowUpCircleIcon,
    CheckIcon
} from '../components/icons';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateMagicMockup, analyzeMockupSuggestions, MockupSuggestion } from '../services/mockupService';
import { saveCreation, deductCredits } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';

export const MagicMockup: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [designImage, setDesignImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    
    // Configurations
    const [targetObject, setTargetObject] = useState('');
    const [customObject, setCustomObject] = useState(''); 
    const [material, setMaterial] = useState('');
    const [sceneVibe, setSceneVibe] = useState('');
    const [objectColor, setObjectColor] = useState(''); 
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    
    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [suggestions, setSuggestions] = useState<MockupSuggestion[]>([]);
    
    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Magic Mockup'] || 2;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;

    // Options
    const objectOptions = ['T-Shirt', 'Hoodie', 'iPhone 15', 'MacBook', 'Coffee Mug', 'Water Bottle', 'Tote Bag', 'Notebook', 'Business Card', 'Packaging Box', 'Neon Sign', 'Wall Sign', 'Other / Custom'];
    const materialOptions = ['Standard Ink', 'Embroidery', 'Gold Foil', 'Silver Foil', 'Deboss', 'Emboss', 'Laser Etch', 'Smart Object'];
    const vibeOptions = ['Studio Clean', 'Lifestyle', 'Cinematic', 'Nature', 'Urban'];
    
    const commonColors = [
        { name: 'White', value: '#FFFFFF', border: 'border-gray-200' },
        { name: 'Black', value: '#000000', border: 'border-gray-800' },
        { name: 'Navy', value: '#000080', border: 'border-blue-900' },
        { name: 'Red', value: '#DC2626', border: 'border-red-600' },
        { name: 'Grey', value: '#6B7280', border: 'border-gray-500' },
        { name: 'Beige', value: '#F5F5DC', border: 'border-yellow-100' },
        { name: 'Green', value: '#10B981', border: 'border-green-600' },
        { name: 'Pink', value: '#EC4899', border: 'border-pink-500' },
    ];

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

    const processFile = async (file: File) => {
        const base64 = await fileToBase64(file);
        setDesignImage({ url: URL.createObjectURL(file), base64 });
        setResultImage(null);
        
        // Trigger Analysis
        setIsAnalyzing(true);
        try {
            const results = await analyzeMockupSuggestions(base64.base64, base64.mimeType);
            setSuggestions(results);
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            await processFile(e.target.files[0]);
        }
        e.target.value = '';
    };

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                await processFile(file);
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const applySuggestion = (s: MockupSuggestion) => {
        // Reset Custom Logic
        setCustomObject(''); 
        
        // Set standard fields
        // Check if suggestion's target object is in our standard list
        const isStandardObject = objectOptions.includes(s.targetObject);
        
        if (isStandardObject) {
            setTargetObject(s.targetObject);
        } else {
            // If the AI suggests something totally new (unlikely but possible), treat as Custom
            setTargetObject('Other / Custom');
            setCustomObject(s.targetObject);
        }

        setMaterial(s.material);
        setSceneVibe(s.sceneVibe);
        setObjectColor(s.objectColor);
        autoScroll();
    };

    const handleGenerate = async () => {
        const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
        if (!designImage || !auth.user || !finalTarget || !material || !sceneVibe) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResultImage(null);

        try {
            const res = await generateMagicMockup(
                designImage.base64.base64,
                designImage.base64.mimeType,
                finalTarget,
                material,
                sceneVibe,
                objectColor
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
        setCustomObject('');
        setMaterial('');
        setSceneVibe('');
        setObjectColor('');
        setSuggestions([]);
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

    const finalTarget = targetObject === 'Other / Custom' ? customObject : targetObject;
    const canGenerate = !!designImage && !!finalTarget && !!material && !!sceneVibe && !isLowCredits;

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
                resultHeightClass="h-[800px]"
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
                
                // Left: Canvas (Upload Zone)
                leftContent={
                    designImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            {isAnalyzing && (
                                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] animate-fadeIn">
                                    <SparklesIcon className="w-10 h-10 text-yellow-300 animate-spin mb-4" />
                                    <p className="text-sm font-bold text-white tracking-widest uppercase">Generating Ideas...</p>
                                </div>
                            )}
                            
                            <img src={designImage.url} className={`max-w-full max-h-full object-contain shadow-sm transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Design Preview" />
                            
                            {!loading && !isAnalyzing && (
                                <>
                                    <div className="absolute top-4 left-0 w-full px-4 flex justify-between pointer-events-none">
                                         <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                                            SOURCE DESIGN
                                         </span>
                                    </div>
                                    
                                    <button 
                                        onClick={handleNewSession} 
                                        className="absolute top-4 right-4 pointer-events-auto bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"
                                        title="Clear All"
                                    >
                                        <XIcon className="w-5 h-5"/>
                                    </button>
                                    
                                    <button 
                                        onClick={() => redoFileInputRef.current?.click()} 
                                        className="absolute top-4 left-4 pointer-events-auto bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Design"
                                    >
                                        <UploadIcon className="w-5 h-5"/>
                                    </button>
                                </>
                            )}
                            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                isDragging 
                                ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' 
                                : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                            }`}
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <MockupIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Design</p>
                                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                                    <div className="bg-gray-50 rounded-full px-3 py-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                                            Click or Drop (PNG/JPG)
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Drag Overlay */}
                            {isDragging && (
                                <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                    <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce">
                                        <p className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                                            <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                // Right: Config
                rightContent={
                    !designImage ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                            <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                                <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                            </div>
                            <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                            <p className="text-sm text-gray-400">Upload a design to start.</p>
                        </div>
                    ) : isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* 0. AI SUGGESTIONS */}
                            {suggestions.length > 0 && !targetObject && (
                                <div className="mb-6 animate-fadeIn">
                                    <div className="flex items-center gap-2 mb-3 ml-1">
                                        <SparklesIcon className="w-4 h-4 text-indigo-500"/>
                                        <label className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Smart Suggestions</label>
                                    </div>
                                    <div className="space-y-3">
                                        {suggestions.map((s, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => applySuggestion(s)}
                                                className="w-full text-left bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md p-3 rounded-xl transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="relative z-10 flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-indigo-700">{s.title}</h4>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">{s.reasoning}</p>
                                                    </div>
                                                    <span className="text-[10px] font-mono bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100">
                                                        {s.targetObject}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative mt-6 mb-2">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-gray-200"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="px-2 bg-[#F6F7FA] text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Customize</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 1. Target Object Selection */}
                            <div className="animate-fadeIn">
                                <SelectionGrid 
                                    label="1. Target Object" 
                                    options={objectOptions} 
                                    value={targetObject} 
                                    onChange={(val) => { setTargetObject(val); autoScroll(); }} 
                                />
                                {/* Conditional Input for Custom Object */}
                                {targetObject === 'Other / Custom' && (
                                    <div className="mt-4 animate-fadeIn">
                                        <InputField 
                                            label="Describe Your Object"
                                            placeholder="e.g. Vintage Lunchbox, Surfboard, Space Helmet..."
                                            value={customObject}
                                            onChange={(e: any) => setCustomObject(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 2. Product Color - NEW PROFESSIONAL GRID */}
                            {(targetObject && (targetObject !== 'Other / Custom' || customObject)) && (
                                <div className="animate-fadeIn">
                                    <div className="flex items-center justify-between mb-3 ml-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Product Color</label>
                                        {objectColor && <span className="text-[10px] font-bold text-gray-500">{objectColor}</span>}
                                    </div>
                                    
                                    <div className="grid grid-cols-5 gap-3 mb-3">
                                        {commonColors.map(color => (
                                            <button
                                                key={color.name}
                                                onClick={() => setObjectColor(color.name)}
                                                className={`group relative aspect-square rounded-xl transition-all shadow-sm flex items-center justify-center ${color.border} border-2 ${objectColor === color.name ? 'ring-2 ring-offset-2 ring-indigo-500 scale-105 z-10' : 'hover:scale-105 hover:z-10'}`}
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            >
                                                {objectColor === color.name && (
                                                    <CheckIcon className={`w-4 h-4 ${['White', 'Beige'].includes(color.name) ? 'text-black' : 'text-white'}`} />
                                                )}
                                            </button>
                                        ))}
                                        
                                        {/* Custom Color Trigger */}
                                        <div className="relative">
                                            <button
                                                className={`w-full h-full aspect-square rounded-xl border-2 border-gray-200 bg-white flex items-center justify-center transition-all hover:border-indigo-400 hover:shadow-md ${!commonColors.some(c => c.name === objectColor) && objectColor ? 'ring-2 ring-offset-2 ring-indigo-500 border-indigo-500' : ''}`}
                                                onClick={() => {
                                                    if (!commonColors.some(c => c.name === objectColor)) {
                                                        // Already custom, focus input
                                                        document.getElementById('custom-color-input')?.focus();
                                                    } else {
                                                        setObjectColor(''); // Clear standard selection to prompt input
                                                        document.getElementById('custom-color-input')?.focus();
                                                    }
                                                }}
                                            >
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 via-green-500 to-blue-500"></div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Input (Always visible but highlighted if custom is active) */}
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <PaletteIcon className="w-4 h-4 text-gray-400"/>
                                        </div>
                                        <input 
                                            id="custom-color-input"
                                            type="text"
                                            placeholder="Custom Color (e.g. Neon Green, #FF5733)..."
                                            value={!commonColors.some(c => c.name === objectColor) ? objectColor : ''}
                                            onChange={(e) => setObjectColor(e.target.value)}
                                            className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-gray-400"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 3. Material Physics */}
                            {objectColor && (
                                <SelectionGrid 
                                    label="3. Material Physics" 
                                    options={materialOptions} 
                                    value={material} 
                                    onChange={(val) => { setMaterial(val); autoScroll(); }} 
                                />
                            )}

                            {/* 4. Scene Vibe */}
                            {material && (
                                <SelectionGrid 
                                    label="4. Scene Vibe" 
                                    options={vibeOptions} 
                                    value={sceneVibe} 
                                    onChange={(val) => { setSceneVibe(val); autoScroll(); }} 
                                />
                            )}
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && (
                <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />
            )}
        </>
    );
};
