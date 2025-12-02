
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { 
    PhotoStudioIcon, 
    CubeIcon, 
    UsersIcon, 
    CreditCardIcon, 
    SparklesIcon, 
    ArrowLeftIcon,
    XIcon,
    UploadIcon,
    ArrowUpCircleIcon
} from '../components/icons';
import { 
    FeatureLayout, 
    SelectionGrid, 
    MilestoneSuccessModal, 
    checkMilestone 
} from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, editImageWithPrompt } from '../services/photoStudioService';
import { saveCreation, deductCredits } from '../firebase';
import { PixaMascot } from '../components/PixaMascot';

export const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, navigateTo, appConfig }) => {
    // Mode Selection State
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);

    // Determine cost based on current mode selection. Default to base studio cost if no mode selected yet.
    const currentCost = studioMode === 'model' 
        ? (appConfig?.featureCosts['Model Shot'] || 3) 
        : (appConfig?.featureCosts['Magic Photo Studio'] || 2);

    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    
    // New state for Drag & Drop
    const [isDragging, setIsDragging] = useState(false);

    // Refs for File Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    
    // Ref for auto-scrolling the right panel
    const scrollRef = useRef<HTMLDivElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);


    // Manual Refinement State (Product)
    const [category, setCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');

    // Manual Refinement State (Model)
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    // New Model Controls
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    const categories = ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Packaged Products', 'Jewellery', 'Footwear', 'Toys', 'Automotive'];
    const brandStyles = ['Clean', 'Bold', 'Luxury', 'Playful', 'Natural', 'High-tech', 'Minimal'];
    const visualTypes = ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'];

    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    // Check if user has enough credits for the selected operation
    const userCredits = auth.user?.credits || 0;
    // We only block if an image is uploaded AND credits are insufficient for current/default mode
    const isLowCredits = image && userCredits < currentCost;

    // Animation Timer for Loading Text
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing Structure...", "Generating Model...", "Adjusting Lighting...", "Applying Physics...", "Polishing Pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Cleanup result blob URL
    useEffect(() => {
        return () => {
            if (result) URL.revokeObjectURL(result);
        };
    }, [result]);

    const autoScroll = () => {
        if (scrollRef.current) {
            // Tuned to 100ms for snappier, smoother feel
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

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            
            setResult(null);
            setStudioMode(null);
            setCategory(''); setBrandStyle(''); setVisualType('');
            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
            setModelComposition(''); setModelFraming('');
            setSuggestedPrompts([]);
            setSuggestedModelPrompts([]);
            setSelectedPrompt(null);
            
            setImage({ url: URL.createObjectURL(file), base64 });
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
                const base64 = await fileToBase64(file);
                
                // Reset state same as handleUpload
                setResult(null);
                setStudioMode(null);
                setCategory(''); setBrandStyle(''); setVisualType('');
                setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                setModelComposition(''); setModelFraming('');
                setSuggestedPrompts([]);
                setSuggestedModelPrompts([]);
                setSelectedPrompt(null);
                
                setImage({ url: URL.createObjectURL(file), base64 });
            } else {
                alert("Please drop a valid image file.");
            }
        }
    };

    const handleModeSelect = async (mode: 'product' | 'model') => {
        setResult(null); // Clear any existing result to start scanning afresh on the original image
        setStudioMode(mode);
        setSelectedPrompt(null);
        autoScroll();
        
        if (mode === 'product') {
            setIsAnalyzing(true);
            try {
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType);
                setSuggestedPrompts(prompts);
            } catch (err) {
                console.error(err);
                setSuggestedPrompts(["Put this on a clean white table", "Show this product on a luxury gold podium"]);
            } finally {
                setIsAnalyzing(false);
            }
        } else if (mode === 'model') {
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType);
                 setSuggestedModelPrompts(prompts);
             } catch (e) {
                 console.error(e);
                 setSuggestedModelPrompts([{ display: "Close-Up", prompt: "Close-up model shot" }]);
             } finally {
                 setIsAnalyzingModel(false);
             }
        }
    };

    // Mutually Exclusive Selection Logic
    const handlePromptSelect = (prompt: string) => {
        if (selectedPrompt === prompt) {
             setSelectedPrompt(null);
        } else {
             setSelectedPrompt(prompt);
             if (studioMode === 'product') {
                 setCategory(''); setBrandStyle(''); setVisualType('');
             } else {
                 setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                 setModelComposition(''); setModelFraming('');
             }
        }
    };

    const handleCategorySelect = (val: string) => {
        setCategory(val);
        setBrandStyle('');
        setVisualType('');
        autoScroll();
    };

    const handleBrandStyleSelect = (val: string) => {
        setBrandStyle(val);
        setVisualType('');
        autoScroll();
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;

        // FIX: Strict credit check with fallback for undefined
        if (userCredits < currentCost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setResult(null); 
        setLoading(true);
        try {
            let res;

            if (studioMode === 'model') {
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, {
                    modelType,
                    region: modelRegion,
                    skinTone,
                    bodyType,
                    composition: modelComposition,
                    framing: modelFraming,
                    freeformPrompt: selectedPrompt || undefined
                 });
            } else {
                let generationDirection = "";
                if (selectedPrompt) {
                    generationDirection = selectedPrompt;
                } else if (category) {
                    generationDirection = `${visualType || 'Professional'} shot of ${category} product. Style: ${brandStyle || 'Clean'}.`;
                } else {
                    generationDirection = "Professional studio lighting";
                }
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection);
            }

            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            saveCreation(auth.user.uid, dataUri, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            const updatedUser = await deductCredits(auth.user.uid, currentCost, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            
             // Check for milestone bonus in updated user object
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) {
                    setMilestoneBonus(bonus);
                }
            }

            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setImage(null); 
        setResult(null);
        setStudioMode(null);
        setCategory(''); setBrandStyle(''); setVisualType('');
        setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
        setModelComposition(''); setModelFraming('');
        setSuggestedPrompts([]);
        setSuggestedModelPrompts([]);
        setSelectedPrompt(null);
    };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && !isLowCredits && (
        studioMode === 'product' 
            ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType))
            : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming))
    );

    return (
        <>
        <FeatureLayout 
            title="Magic Photo Studio"
            description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
            icon={<PhotoStudioIcon className="w-6 h-6 text-blue-500"/>}
            creditCost={currentCost}
            isGenerating={loading}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            onNewSession={handleNewSession}
            resultHeightClass="h-[600px]" // Reduced height to approx 60% of previous (approx 600px)
            hideGenerateButton={isLowCredits} // Hide normal generate button if credits low
            generateButtonStyle={{
                className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                hideIcon: true
            }}
            scrollRef={scrollRef} // Pass the scroll ref to enable auto-scroll
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                         {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md animate-fadeIn">
                                <PixaMascot mode="processing" size="lg" />
                                <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner mt-6">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-indigo-900 tracking-widest uppercase animate-pulse mt-4">{loadingText}</p>
                            </div>
                        )}

                        {(isAnalyzing || isAnalyzingModel) && (
                            <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] rounded-3xl overflow-hidden flex items-center justify-center">
                                {(isAnalyzing || isAnalyzingModel) && (
                                    <>
                                        <div className="absolute top-0 h-full w-[3px] bg-[#4D7CFF] shadow-[0_0_20px_#4D7CFF] animate-[scan-horizontal_1.5s_linear_infinite] z-30"></div>
                                        <div className="absolute top-0 h-full w-48 bg-gradient-to-l from-[#4D7CFF]/30 to-transparent animate-[scan-horizontal_1.5s_linear_infinite] -translate-x-full z-20"></div>
                                    </>
                                )}
                                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-40 animate-bounce-slight">
                                    <div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div>
                                    <span className="text-xs font-bold tracking-widest uppercase">{isAnalyzingModel ? 'Generating Suggestions...' : 'Scanning Image...'}</span>
                                </div>
                            </div>
                        )}

                        <img 
                            src={image.url} 
                            className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                        />
                        
                        {!loading && !isAnalyzing && !isAnalyzingModel && (
                            <>
                                <button 
                                    onClick={handleNewSession} 
                                    className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"
                                    title="Cancel"
                                >
                                    <XIcon className="w-5 h-5"/>
                                </button>
                                <button 
                                    onClick={() => redoFileInputRef.current?.click()} 
                                    className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"
                                    title="Change Photo"
                                >
                                    <UploadIcon className="w-5 h-5"/>
                                </button>
                            </>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        
                        <style>{`
                            @keyframes progress {
                                0% { width: 0%; margin-left: 0; }
                                50% { width: 100%; margin-left: 0; }
                                100% { width: 0%; margin-left: 100%; }
                            }
                            @keyframes fadeInUp {
                                from { opacity: 0; transform: translateY(10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            @keyframes scan-horizontal {
                                0% { left: 0%; }
                                100% { left: 100%; }
                            }
                        `}</style>
                    </div>
                ) : (
                    <div className="w-full h-full flex justify-center">
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
                                <PhotoStudioIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Product Photo</p>
                                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                                    <div className="bg-gray-50 rounded-full px-3 py-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                                            Click to Browse
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
                    </div>
                )
            }
            rightContent={
                !image ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                        <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                            <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                        </div>
                        <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                        <p className="text-sm text-gray-400">Upload a photo to unlock AI tools.</p>
                    </div>
                ) : isLowCredits ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-inner animate-bounce-slight">
                            <CreditCardIcon className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                        <p className="text-gray-500 mb-6 max-w-xs text-sm leading-relaxed">
                            This generation requires <span className="font-bold text-gray-800">{currentCost} credits</span>, but you only have <span className="font-bold text-red-500">{userCredits}</span>.
                        </p>
                        <button
                            onClick={() => navigateTo('dashboard', 'billing')}
                            className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg shadow-yellow-500/20 hover:scale-105 flex items-center gap-2"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            Recharge Now
                        </button>
                        <p className="text-xs text-gray-400 mt-4">Or earn credits by referring friends!</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn p-1">
                        
                        {/* STEP 1: Mode Selection (Product vs Model) */}
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <button onClick={() => handleModeSelect('product')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-blue-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors"><CubeIcon className="w-6 h-6"/></div>
                                        <span className="text-lg font-bold text-gray-800">Product Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Studio lighting, podiums, and nature settings.</p>
                                </button>
                                <button onClick={() => handleModeSelect('model')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-purple-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors"><UsersIcon className="w-6 h-6"/></div>
                                        <span className="text-lg font-bold text-gray-800">Model Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Realistic human models holding or wearing your product.</p>
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Configuration (Visible if Mode Selected) */}
                        {studioMode && (
                            <div className="animate-fadeIn relative">
                                <div className="flex items-center mb-4 -ml-2"> 
                                    <button onClick={() => {
                                            setStudioMode(null);
                                            setSelectedPrompt(null);
                                            setCategory(''); setBrandStyle(''); setVisualType('');
                                            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                                            setModelComposition(''); setModelFraming('');
                                        }} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                    </button>
                                </div>

                                {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType) || isAnalyzing || isAnalyzingModel) && (
                                    <div className={`transition-all duration-300 mb-6`}>
                                        {(isAnalyzing || isAnalyzingModel) ? (
                                            <div className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-100 opacity-50">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating Suggestions...</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-3 ml-1">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Suggestions</label>
                                                    {selectedPrompt ? (
                                                        <button onClick={() => setSelectedPrompt(null)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear Selection</button>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold tracking-wide">RECOMMENDED</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((promptItem, idx) => {
                                                        const isModel = studioMode === 'model';
                                                        const displayText = isModel ? (promptItem as any).display : promptItem;
                                                        const promptValue = isModel ? (promptItem as any).prompt : promptItem;

                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => handlePromptSelect(promptValue)}
                                                                style={!selectedPrompt ? { animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' } : {}}
                                                                className={`group relative w-auto inline-flex rounded-full p-[2px] transition-all duration-300 transform active:scale-95 ${!selectedPrompt && 'animate-[fadeInUp_0.5s_ease-out]'} ${
                                                                    selectedPrompt === promptValue ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
                                                                }`}
                                                            >
                                                                <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 ${selectedPrompt === promptValue ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-300`}></div>
                                                                <div className={`relative h-full w-full rounded-full flex items-center justify-center px-4 py-2 transition-colors duration-300 ${selectedPrompt === promptValue ? 'bg-transparent' : 'bg-white'}`}>
                                                                    <span className={`text-xs font-medium italic text-left ${selectedPrompt === promptValue ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'}`}>"{displayText}"</span>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="relative mb-6">
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR CUSTOMIZE</span>
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                        </div>
                                    </div>
                                )}

                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {studioMode === 'product' ? (
                                            <>
                                                 <div>
                                                     <div className="flex items-center justify-between mb-3 ml-1">
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Product Category</label>
                                                        {category && <button onClick={() => { setCategory(''); setBrandStyle(''); setVisualType(''); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear</button>}
                                                     </div>
                                                     <div className="flex flex-wrap gap-2">
                                                        {categories.map(opt => (
                                                            <button key={opt} onClick={() => handleCategorySelect(opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform ${category === opt ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm active:scale-95'}`}>{opt}</button>
                                                                ))}
                                                             </div>
                                                        </div>
                                                        {category && <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={handleBrandStyleSelect} />}
                                                        {category && brandStyle && <SelectionGrid label="3. Visual Type" options={visualTypes} value={visualType} onChange={(val) => { setVisualType(val); autoScroll(); }} />}
                                                    </>
                                                ) : (
                                                    <>
                                                        <SelectionGrid label="1. Composition" options={compositionTypes} value={modelComposition} onChange={(val) => { setModelComposition(val); autoScroll(); }} />
                                                        {modelComposition && <SelectionGrid label="2. Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming(''); autoScroll(); }} />}
                                                        {modelType && <SelectionGrid label="3. Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); setSkinTone(''); setBodyType(''); autoScroll(); }} />}
                                                        {modelRegion && <SelectionGrid label="4. Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); setBodyType(''); autoScroll(); }} />}
                                                        {skinTone && <SelectionGrid label="5. Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); setModelFraming(''); autoScroll(); }} />}
                                                        {bodyType && <SelectionGrid label="6. Shot Type" options={shotTypes} value={modelFraming} onChange={(val) => { setModelFraming(val); autoScroll(); }} />}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                    </div>
                )
            }
        />
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};
