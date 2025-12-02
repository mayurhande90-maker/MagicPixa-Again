
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    ApparelIcon, 
    UploadIcon, 
    XIcon, 
    UserIcon,
    TrashIcon,
    UploadTrayIcon,
    CreditCardIcon,
    SparklesIcon
} from '../components/icons';
import { FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateApparelTryOn } from '../services/apparelService';
import { saveCreation, deductCredits } from '../firebase';

// Compact Upload Component for the Right Panel
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
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label} {optional && <span className="text-gray-300 font-normal ml-1">(Optional)</span>}</label>
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
                    <p className="text-xs font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide">Upload {label}</p>
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
    const tuckOptions = ['Tucked In', 'Untucked'];
    const fitOptions = ['Slim Fit', 'Regular Fit', 'Oversized'];
    const sleeveOptions = ['Full Length', 'Rolled Up'];

    // Animation Timer
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa is scanning body pose...", "Pixa is analyzing fabric...", "Pixa is mapping 3D drape...", "Pixa is adjusting lighting...", "Pixa is compositing final look..."];
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
            if (result) URL.revokeObjectURL(result);
        };
    }, [result]);

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
            e.target.value = '';
        }
    };

    const handleTopUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setTopImage(data);
            e.target.value = '';
            autoScroll();
        }
    };

    const handleBottomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const data = await processFile(e.target.files[0]);
            setBottomImage(data);
            e.target.value = '';
            autoScroll();
        }
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
        if (isLowCredits) { alert("Insufficient credits."); return; }

        setLoading(true);
        setResult(null);

        try {
            const res = await generateApparelTryOn(
                personImage.base64.base64,
                personImage.base64.mimeType,
                topImage?.base64 || null,
                bottomImage?.base64 || null,
                undefined,
                {
                    tuck: tuckStyle,
                    fit: fitStyle,
                    sleeve: sleeveStyle
                }
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, 'Magic Apparel');
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Magic Apparel');
            
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
        setPersonImage(null);
        setTopImage(null);
        setBottomImage(null);
        setResult(null);
        setTuckStyle('');
        setFitStyle('');
        setSleeveStyle('');
    };

    const canGenerate = !!personImage && (!!topImage || !!bottomImage) && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Magic Apparel"
                description="Virtually try-on clothing on any person. Realistic fabric physics and lighting adaptation."
                icon={<ApparelIcon className="w-6 h-6 text-blue-500"/>}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={canGenerate}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)} 
                onNewSession={handleNewSession}
                resultHeightClass="h-[750px]"
                hideGenerateButton={isLowCredits}
                generateButtonStyle={{
                    className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                    hideIcon: true,
                    label: "Try On Now"
                }}
                scrollRef={scrollRef}
                
                // Left: Person Image Canvas
                leftContent={
                    personImage ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            
                            <img src={personImage.url} className={`max-w-full max-h-full object-contain shadow-sm transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Model Preview" />
                            
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
                                        onClick={() => personInputRef.current?.click()} 
                                        className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                        title="Change Model"
                                    >
                                        <UserIcon className="w-5 h-5"/>
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
                            className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${
                                isDragging 
                                ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' 
                                : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                            }`}
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <UserIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Model Photo</p>
                                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                                    <div className="bg-gray-50 rounded-full px-3 py-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                                            Click or Drop
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
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCardIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => (window as any).navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className="space-y-8 p-1 animate-fadeIn">
                            
                            {/* 1. Garment Uploads */}
                            <div className="animate-fadeIn">
                                <div className="flex items-center justify-between mb-3 ml-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Select Garments</label>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <CompactUpload 
                                        label="Top (Shirt/Jacket)" 
                                        image={topImage} 
                                        onUpload={handleTopUpload} 
                                        onClear={() => setTopImage(null)} 
                                        icon={<ApparelIcon className="w-6 h-6 text-blue-400"/>}
                                        optional
                                    />
                                    <CompactUpload 
                                        label="Bottom (Pants/Skirt)" 
                                        image={bottomImage} 
                                        onUpload={handleBottomUpload} 
                                        onClear={() => setBottomImage(null)} 
                                        icon={<ApparelIcon className="w-6 h-6 text-purple-400"/>}
                                        optional
                                    />
                                </div>
                            </div>

                            {/* 2. Styling Options */}
                            {(topImage || bottomImage) && (
                                <div className="animate-fadeIn space-y-4">
                                    <div className="h-px bg-gray-200 w-full my-2"></div>
                                    <SelectionGrid label="2. Tuck Style" options={tuckOptions} value={tuckStyle} onChange={setTuckStyle} />
                                    <SelectionGrid label="3. Fit Preference" options={fitOptions} value={fitStyle} onChange={setFitStyle} />
                                    <SelectionGrid label="4. Sleeve Style" options={sleeveOptions} value={sleeveStyle} onChange={setSleeveStyle} />
                                </div>
                            )}
                        </div>
                    )
                }
            />
            <input ref={personInputRef} type="file" className="hidden" accept="image/*" onChange={handlePersonUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
