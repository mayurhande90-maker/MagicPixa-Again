
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
    ArrowUpCircleIcon
} from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateMagicMockup } from '../services/mockupService';
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
        { name: 'Black', value: '#000000', border: 'border-transparent' },
        { name: 'Navy', value: '#000080', border: 'border-transparent' },
        { name: 'Red', value: '#FF0000', border: 'border-transparent' },
        { name: 'Grey', value: '#808080', border: 'border-transparent' },
        { name: 'Beige', value: '#F5F5DC', border: 'border-gray-200' },
    ];

    // Animation
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa is mapping surface...", "Pixa is simulating physics...", "Pixa is calculating reflections...", "Pixa is rendering textures...", "Pixa is polishing pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Cleanup blob URL
    useEffect(() => {
        return () => {
            if (resultImage) URL.revokeObjectURL(resultImage);
        };
    }, [resultImage]);

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
                const base64 = await fileToBase64(file);
                setDesignImage({ url: URL.createObjectURL(file), base64 });
                setResultImage(null);
            } else {
                alert("Please drop a valid image file.");
            }
        }
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

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, 'Magic Mockup');
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
                            
                            <img src={designImage.url} className={`max-w-full max-h-full object-contain shadow-sm transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Design Preview" />
                            
                            {!loading && (
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

                            {/* 2. Product Color */}
                            {(targetObject && (targetObject !== 'Other / Custom' || customObject)) && (
                                <div className="animate-fadeIn">
                                    <div className="flex items-center justify-between mb-3 ml-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Product Color</label>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            {commonColors.map(color => (
                                                <button
                                                    key={color.name}
                                                    onClick={() => setObjectColor(color.name)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${color.border} ${objectColor === color.name ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : ''}`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <PaletteIcon className="w-4 h-4 text-gray-400"/>
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="Or type custom color (e.g. Neon Green)..."
                                                value={objectColor}
                                                onChange={(e) => setObjectColor(e.target.value)}
                                                className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                                            />
                                        </div>
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
