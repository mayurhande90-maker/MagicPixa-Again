
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
    ArrowLeftIcon,
    UserIcon,
    TrashIcon
} from '../components/icons';
import { FeatureLayout, TextAreaField, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, deductCredits } from '../firebase';

// Mini Upload Component for the Right Panel
const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void;
    icon: React.ReactNode;
    heightClass?: string;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-32" }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="relative w-full group">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain" alt={label} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"
                    >
                        <XIcon className="w-4 h-4"/>
                    </button>
                </div>
            ) : (
                <div 
                    onClick={() => inputRef.current?.click()}
                    className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}
                >
                    <div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                        {icon}
                    </div>
                    <p className="text-xs font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide">Upload</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

export const MagicApparel: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // State
    const [personImage, setPersonImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [topImage, setTopImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [bottomImage, setBottomImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Styling Options
    const [tuckStyle, setTuckStyle] = useState('');
    const [fitStyle, setFitStyle] = useState('');
    const [sleeveStyle, setSleeveStyle] = useState('');
    const [userPrompt, setUserPrompt] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    
    // Drag & Drop State for Person (Main Canvas)
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const scrollRef = useRef<HTMLDivElement>(null);
    const personInputRef = useRef<HTMLInputElement>(null);

    // Cost
    const cost = appConfig?.featureCosts['Magic Apparel'] || 3;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = auth.user && userCredits < cost;

    // Options for Selection Grids
    const tuckOptions = ['Tucked In', 'Untucked', 'French Tuck'];
    const fitOptions = ['Slim Fit', 'Regular Fit', 'Oversized'];
    const sleeveOptions = ['Full Length', 'Rolled Up', 'Cuffed'];

    // Animation Timer
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Scanning Body Pose...", "Analyzing Fabric...", "Mapping 3D Drape...", "Adjusting Lighting...", "Compositing Final Look..."];
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

    // Helper for file handling
    const processFile = async (file: File): Promise<{ url: string; base64: Base64File }> => {
        const base64 = await fileToBase64(file);
        return { url: URL.createObjectURL(file), base64 };
    };

    // Handlers
    const handlePersonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setResult(null);
            setPersonImage(data);
        }
    };

    const handleTopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setTopImage(data);
            autoScroll();
        }
    };

    const handleBottomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setBottomImage(data);
            autoScroll();
        }
    };

    // Drag and Drop Handlers for Left Panel
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
                const data = await processFile(file);
                setResult(null);
                setPersonImage(data);
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleGenerate = async () => {
        if (!personImage || (!topImage && !bottomImage) || !auth.user) return;
        
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
                topImage ? topImage.base64 : null,
                bottomImage ? bottomImage.base64 : null,
                userPrompt,
                {
                    tuck: tuckStyle,
                    fit: fitStyle,
                    sleeve: sleeveStyle
                }
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
        setTopImage(null);
        setBottomImage(null);
        setResult(null);
        setUserPrompt('');
        setTuckStyle('');
        setFitStyle('');
        setSleeveStyle('');
    };

    const canGenerate = !!personImage && (!!topImage || !!bottomImage) && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Magic Apparel"
                description="Virtually try on clothing. Upload a full-length photo and the garments you want to wear."
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
                    label: "Generate Try-On"
                }}
                scrollRef={scrollRef}
                // LEFT CONTENT: The "Fitting Room Mirror" (Canvas)
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
                                alt="Model Preview"
                            />

                            {!loading && (
                                <>
                                    <div className="absolute top-4 left-0 w-full px-4 flex justify-between pointer-events-none">
                                         <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                                            MODEL PREVIEW
                                         </span>
                                    </div>
                                    
                                    <button 
                                        onClick={handleNewSession} 
                                        className="absolute top-4 right-4 pointer-events-auto bg-white p-2 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all"
                                        title="Clear All"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                    
                                    <button 
                                        onClick={() => personInputRef.current?.click()} 
                                        className="absolute top-4 right-16 pointer-events-auto bg-white p-2 rounded-full shadow-md hover:bg-blue-50 text-gray-500 hover:text-blue-500 transition-all"
                                        title="Change Model"
                                    >
                                        <UploadIcon className="w-4 h-4"/>
                                    </button>
                                </>
                            )}
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <div 
                            onClick={() => personInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`w-full h-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden bg-white ${
                                isDragging 
                                ? 'border-blue-500 bg-blue-50/30 scale-[1.01]' 
                                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                            }`}
                        >
                            <div className="p-6 bg-blue-50 text-blue-500 rounded-full mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300 shadow-sm">
                                <UserIcon className="w-12 h-12"/>
                            </div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2 group-hover:text-blue-600 transition-colors">Upload Full Body Photo</h3>
                            <div className="bg-gray-100 px-3 py-1 rounded-full group-hover:bg-white border border-transparent group-hover:border-gray-200 transition-colors">
                                <p className="text-xs font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-widest">Click or Drop</p>
                            </div>
                            
                            {isDragging && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                    <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-blue-100 animate-bounce">
                                        <p className="text-lg font-bold text-blue-600 flex items-center gap-2">
                                            <UploadIcon className="w-5 h-5"/> Drop to Upload Model
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                // RIGHT CONTENT: The "Control Panel"
                rightContent={
                    <div className="space-y-8 p-1 animate-fadeIn">
                        
                        {isLowCredits && (
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col items-center text-center">
                                <p className="text-sm text-red-600 font-bold mb-2">Insufficient Credits</p>
                                <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg font-bold hover:bg-red-200 transition-colors">
                                    Recharge
                                </button>
                            </div>
                        )}

                        {/* 1. Garments Grid */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">1. Choose Outfit</label>
                            <div className="grid grid-cols-2 gap-4">
                                <CompactUpload 
                                    label="Top" 
                                    image={topImage} 
                                    onUpload={handleTopUpload} 
                                    onClear={() => setTopImage(null)}
                                    icon={<GarmentTopIcon className="w-6 h-6 text-purple-400"/>}
                                    heightClass="h-32"
                                />
                                <CompactUpload 
                                    label="Bottom" 
                                    image={bottomImage} 
                                    onUpload={handleBottomUpload} 
                                    onClear={() => setBottomImage(null)}
                                    icon={<GarmentTrousersIcon className="w-6 h-6 text-indigo-400"/>}
                                    heightClass="h-32"
                                />
                            </div>
                        </div>

                        {/* 2. Styling Preferences */}
                        {(topImage || bottomImage) && (
                            <div>
                                <div className="flex items-center gap-2 py-1 mb-4">
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">STYLING PREFERENCES</span>
                                    <div className="h-px flex-1 bg-gray-200"></div>
                                </div>
                                
                                {topImage && bottomImage && (
                                    <SelectionGrid 
                                        label="Tuck Style" 
                                        options={tuckOptions} 
                                        value={tuckStyle} 
                                        onChange={setTuckStyle} 
                                    />
                                )}
                                
                                <SelectionGrid 
                                    label="Fit Preference" 
                                    options={fitOptions} 
                                    value={fitStyle} 
                                    onChange={setFitStyle} 
                                />
                                
                                {topImage && (
                                    <SelectionGrid 
                                        label="Sleeve Style" 
                                        options={sleeveOptions} 
                                        value={sleeveStyle} 
                                        onChange={setSleeveStyle} 
                                    />
                                )}
                            </div>
                        )}

                        {/* 3. Instructions */}
                        <div>
                            <TextAreaField 
                                label="3. Additional Notes (Optional)"
                                value={userPrompt}
                                onChange={(e: any) => setUserPrompt(e.target.value)}
                                placeholder="e.g. Make sure the collar is popped, add a belt..."
                                rows={2}
                            />
                        </div>
                    </div>
                }
            />
            <input ref={personInputRef} type="file" className="hidden" accept="image/*" onChange={handlePersonUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
