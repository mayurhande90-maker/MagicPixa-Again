import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    ApparelIcon, 
    UploadIcon, 
    XIcon, 
    ArrowUpCircleIcon, 
    GarmentTopIcon, 
    GarmentTrousersIcon, 
    SparklesIcon,
    CreditCardIcon,
    PlusIcon,
    ArrowLeftIcon
} from '../components/icons';
import { FeatureLayout, TextAreaField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, deductCredits } from '../firebase';

export const MagicApparel: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [garmentImage, setGarmentImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [garmentType, setGarmentType] = useState<'top' | 'bottom' | 'dress'>('top');
    const [userPrompt, setUserPrompt] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    
    // Drag & Drop State for Person
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const personInputRef = useRef<HTMLInputElement>(null);
    const garmentInputRef = useRef<HTMLInputElement>(null);
    const redoPersonInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Magic Apparel'] || 3;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = auth.user && userCredits < cost;

    // Animation Timer
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Scanning Body Pose...", "Analyzing Garment Fabric...", "Mapping 3D Drape...", "Adjusting Lighting...", "Compositing Final Look..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Auto-scroll helper
    const autoScroll = () => {
        if (scrollRef.current) {
            setTimeout(() => {
                const element = scrollRef.current;
                if (element) {
                    element.scrollTo({
                        top: element.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 100); 
        }
    };

    // Handlers for Person Image
    const handlePersonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setResult(null); // Clear result if new person uploaded
            setPersonImage({ url: URL.createObjectURL(file), base64 });
        }
    };

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
                setResult(null);
                setPersonImage({ url: URL.createObjectURL(file), base64 });
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    // Handlers for Garment Image
    const handleGarmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setGarmentImage({ url: URL.createObjectURL(file), base64 });
            autoScroll();
        }
    };

    const handleGenerate = async () => {
        if (!personImage || !garmentImage || !auth.user) return;
        
        if (isLowCredits) {
            alert("Insufficient credits.");
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateApparelTryOn(
                personImage.base64.base64,
                personImage.base64.mimeType,
                garmentImage.base64.base64,
                garmentImage.base64.mimeType,
                garmentType,
                userPrompt
            );
            
            const url = `data:image/png;base64,${res}`;
            setResult(url);
            
            saveCreation(auth.user.uid, url, 'Magic Apparel');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Magic Apparel');
            
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) {
                    setMilestoneBonus(bonus);
                }
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
        setPersonImage(null);
        setGarmentImage(null);
        setResult(null);
        setUserPrompt('');
    };

    const canGenerate = !!personImage && !!garmentImage && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Magic Apparel"
                description="Virtually try on any clothing item. Upload a photo of yourself and the garment you want to wear."
                icon={<ApparelIcon className="w-6 h-6 text-blue-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={handleNewSession}
                resultHeightClass="h-[650px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Try On Garment"
                }}
                scrollRef={scrollRef}
                leftContent={
                    personImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            <img 
                                src={personImage.url} 
                                className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                            />

                            {!loading && (
                                <>
                                    <button 
                                        onClick={handleNewSession} 
                                        className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"
                                        title="Clear All"
                                    >
                                        <XIcon className="w-5 h-5"/>
                                    </button>
                                    <button 
                                        onClick={() => redoPersonInputRef.current?.click()} 
                                        className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Model"
                                    >
                                        <UploadIcon className="w-5 h-5"/>
                                    </button>
                                </>
                            )}
                            <input ref={redoPersonInputRef} type="file" className="hidden" accept="image/*" onChange={handlePersonUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div className="w-full h-full flex justify-center">
                            <div 
                                onClick={() => personInputRef.current?.click()}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                    isDragging 
                                    ? 'border-blue-600 bg-blue-50 scale-[1.02] shadow-xl' 
                                    : 'border-blue-300 hover:border-blue-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                                }`}
                            >
                                <div className="relative z-10 p-6 bg-blue-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                    <ApparelIcon className="w-12 h-12 text-blue-300 group-hover:text-blue-600 transition-colors duration-300" />
                                </div>
                                
                                <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                    <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Model Photo</p>
                                    <div className="bg-gray-50 rounded-full px-3 py-1 inline-block">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">Click to Browse</p>
                                    </div>
                                </div>

                                {isDragging && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                        <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-blue-100 animate-bounce">
                                            <p className="text-lg font-bold text-blue-600 flex items-center gap-2">
                                                <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                }
                rightContent={
                    !personImage ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                            <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                                <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                            </div>
                            <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                            <p className="text-sm text-gray-400">Upload a model photo to start.</p>
                        </div>
                    ) : isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                                <CreditCardIcon className="w-10 h-10 text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                                This generation requires <span className="font-bold text-gray-800">{cost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                            </p>
                            <button
                                onClick={() => (window as any).navigateTo('dashboard', 'billing')}
                                className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg shadow-yellow-500/20 hover:scale-105 flex items-center gap-2"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Recharge Now
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 p-1 animate-fadeIn">
                            
                            {/* 1. Garment Type Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Garment Type</label>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'top', label: 'Top', icon: GarmentTopIcon },
                                        { id: 'bottom', label: 'Bottom', icon: GarmentTrousersIcon },
                                        { id: 'dress', label: 'Full/Dress', icon: SparklesIcon }
                                    ].map(item => (
                                        <button 
                                            key={item.id}
                                            onClick={() => setGarmentType(item.id as any)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 transform hover:scale-[1.02] ${
                                                garmentType === item.id 
                                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' 
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-blue-200 hover:bg-blue-50/50'
                                            }`}
                                        >
                                            <item.icon className="w-6 h-6 mb-1"/>
                                            <span className="text-xs font-bold">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Garment Upload */}
                            <div className="animate-fadeIn">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">2. Upload Garment</label>
                                {garmentImage ? (
                                    <div className="relative w-full h-48 bg-white rounded-2xl border-2 border-blue-100 flex items-center justify-center overflow-hidden group shadow-sm">
                                        <img src={garmentImage.url} className="max-w-full max-h-full object-contain" alt="Garment" />
                                        <button 
                                            onClick={() => setGarmentImage(null)}
                                            className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                                        >
                                            <XIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => garmentInputRef.current?.click()}
                                        className="w-full h-48 border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group"
                                    >
                                        <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform mb-2">
                                            <PlusIcon className="w-6 h-6 text-blue-500" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-500 group-hover:text-blue-600">Select Garment Image</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Flat lay or mannequin shots work best</p>
                                    </div>
                                )}
                                <input ref={garmentInputRef} type="file" className="hidden" accept="image/*" onChange={handleGarmentUpload} />
                            </div>

                            {/* 3. Additional Instructions */}
                            <div className="animate-fadeIn">
                                <TextAreaField 
                                    label="3. Styling Instructions (Optional)"
                                    value={userPrompt}
                                    onChange={(e: any) => setUserPrompt(e.target.value)}
                                    placeholder="e.g. Tuck in the shirt, make it oversized, roll up sleeves..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    )
                }
            />
            <input ref={personInputRef} type="file" className="hidden" accept="image/*" onChange={handlePersonUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};