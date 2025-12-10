import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    PhotoStudioIcon, CubeIcon, UsersIcon, CreditCoinIcon, SparklesIcon, ArrowLeftIcon, XIcon, UploadIcon, ArrowUpCircleIcon, PixaProductIcon, ArrowRightIcon, InformationCircleIcon
} from '../components/icons';
import { 
    FeatureLayout, MilestoneSuccessModal, checkMilestone 
} from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, editImageWithPrompt } from '../services/photoStudioService';
import { saveCreation, deductCredits } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { PhotoStudioStyles } from '../styles/features/MagicPhotoStudio.styles';

// Internal Component for Selection
const ManualSelection = ({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (val: string) => void }) => (
    <div className={PhotoStudioStyles.promptContainer}>
        <div className={PhotoStudioStyles.promptHeader}>
            <label className={PhotoStudioStyles.promptLabel}>{label}</label>
            {value && <button onClick={() => onChange('')} className={PhotoStudioStyles.promptClearBtn}>Clear</button>}
        </div>
        <div className={PhotoStudioStyles.categoryGrid}>
            {options.map((opt: string) => (
                <button 
                    key={opt} 
                    onClick={() => onChange(opt)} 
                    className={`${PhotoStudioStyles.categoryBtn} ${value === opt ? PhotoStudioStyles.categoryBtnActive : PhotoStudioStyles.categoryBtnInactive}`}
                >
                    {opt}
                </button>
            ))}
        </div>
    </div>
);

export const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, navigateTo, appConfig }) => {
    // Mode Selection State
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);

    // Determine cost
    const currentCost = studioMode === 'model' 
        ? (appConfig?.featureCosts['Model Shot'] || 3) 
        : (appConfig?.featureCosts['Pixa Product Shots'] || appConfig?.featureCosts['Magic Photo Studio'] || 2);

    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    // Manual Refinement State
    const [category, setCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
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

    const userCredits = auth.user?.credits || 0;
    const isLowCredits = image && userCredits < currentCost;

    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Pixa is analyzing structure...", "Pixa is generating model...", "Pixa is adjusting lighting...", "Pixa is applying physics...", "Pixa is polishing pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => { return () => { if (result) URL.revokeObjectURL(result); }; }, [result]);

    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            handleNewSession();
            setImage({ url: URL.createObjectURL(file), base64 });
        }
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                handleNewSession();
                setImage({ url: URL.createObjectURL(file), base64 });
            } else { alert("Please drop a valid image file."); }
        }
    };

    const handleModeSelect = async (mode: 'product' | 'model') => {
        setResult(null);
        setStudioMode(mode);
        setSelectedPrompt(null);
        autoScroll();
        if (mode === 'product') {
            setIsAnalyzing(true);
            try {
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType);
                setSuggestedPrompts(prompts);
            } catch (err) { setSuggestedPrompts(["Put this on a clean white table", "Show this product on a luxury gold podium"]); } finally { setIsAnalyzing(false); }
        } else if (mode === 'model') {
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType);
                 setSuggestedModelPrompts(prompts);
             } catch (e) { setSuggestedModelPrompts([{ display: "Close-Up", prompt: "Close-up model shot" }]); } finally { setIsAnalyzingModel(false); }
        }
    };

    const handlePromptSelect = (prompt: string) => {
        if (selectedPrompt === prompt) { setSelectedPrompt(null); } else {
             setSelectedPrompt(prompt);
             if (studioMode === 'product') { setCategory(''); setBrandStyle(''); setVisualType(''); } else { setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); }
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (userCredits < currentCost) { alert("Insufficient credits."); return; }
        setResult(null); setLoading(true); setLastCreationId(null);
        try {
            let res;
            if (studioMode === 'model') {
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, { modelType, region: modelRegion, skinTone, bodyType, composition: modelComposition, framing: modelFraming, freeformPrompt: selectedPrompt || undefined });
            } else {
                let generationDirection = selectedPrompt || (category ? `${visualType || 'Professional'} shot of ${category} product. Style: ${brandStyle || 'Clean'}.` : "Professional studio lighting");
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection);
            }
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots');
            setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, currentCost, studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots');
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) { console.error(e); alert('Generation failed. Please try again.'); } finally { setLoading(false); }
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !result) return; setIsRefunding(true);
        try { const res = await processRefundRequest(auth.user.uid, auth.user.email, currentCost, reason, "Product Shot", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + currentCost } : null); setResult(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); }
    };

    const handleNewSession = () => {
        setImage(null); setResult(null); setStudioMode(null); setCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); setSuggestedPrompts([]); setSuggestedModelPrompts([]); setSelectedPrompt(null); setLastCreationId(null);
    };

    const handleEditorSave = async (newUrl: string) => { setResult(newUrl); const id = await saveCreation(auth.user!.uid, newUrl, 'Pixa Product Shots (Edited)'); setLastCreationId(id); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && !isLowCredits && (studioMode === 'product' ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType)) : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming)));

    return (
        <>
        <FeatureLayout 
            title="Pixa Product Shots"
            description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
            icon={<PixaProductIcon className="w-14 h-14"/>}
            rawIcon={true}
            creditCost={currentCost}
            isGenerating={loading}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            creationId={lastCreationId}
            onResetResult={result ? undefined : () => setResult(null)}
            onNewSession={result ? undefined : handleNewSession}
            resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
            resultHeightClass="h-[600px]"
            hideGenerateButton={isLowCredits}
            generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true }}
            scrollRef={scrollRef}
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                         {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-2 bg-white/50 rounded-full overflow-hidden shadow-lg mt-6 border border-white/20">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-[progress_2s_ease-in-out_infinite] rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                </div>
                                <p className="text-sm font-black text-indigo-900 tracking-widest uppercase animate-pulse mt-4 bg-white/80 px-4 py-2 rounded-full shadow-sm">{loadingText}</p>
                            </div>
                        )}
                        {(isAnalyzing || isAnalyzingModel) && (
                            <div className={PhotoStudioStyles.analysisOverlay}>
                                <>
                                    <div className={PhotoStudioStyles.scanLine}></div>
                                    <div className={PhotoStudioStyles.scanGradient}></div>
                                </>
                                <div className={PhotoStudioStyles.analysisBadge}>
                                    <div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div>
                                    <span className="text-xs font-bold tracking-widest uppercase">{isAnalyzingModel ? 'Pixa is Thinking...' : 'Pixa Vision Scanning...'}</span>
                                </div>
                            </div>
                        )}
                        <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'blur-sm scale-105' : ''}`} />
                        {!loading && !isAnalyzing && !isAnalyzingModel && (
                            <>
                                <button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"><XIcon className="w-5 h-5"/></button>
                                <button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"><UploadIcon className="w-5 h-5"/></button>
                            </>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } } @keyframes scan-horizontal { 0% { left: 0%; } 100% { left: 100%; } }`}</style>
                    </div>
                ) : (
                    <div className="w-full h-full flex justify-center">
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <PhotoStudioIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Product Photo</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High-res product photo with good lighting.</p>
                            </div>
                            {isDragging && <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>}
                        </div>
                    </div>
                )
            }
            rightContent={
                !image ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                        <div className="bg-white p-4 rounded-full mb-4 border border-gray-100"><ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/></div>
                        <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                        <p className="text-sm text-gray-400">Upload a photo to unlock AI tools.</p>
                    </div>
                ) : isLowCredits ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                        <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                        <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {currentCost} credits.</p>
                        <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b]">Recharge Now</button>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn p-1">
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <div className={PhotoStudioStyles.modeGrid}>
                                    {/* Product Shot Card */}
                                    <button onClick={() => handleModeSelect('product')} className={`${PhotoStudioStyles.modeCard} ${PhotoStudioStyles.modeCardProduct}`}>
                                        <div className={`${PhotoStudioStyles.orb} ${PhotoStudioStyles.orbProduct}`}></div>
                                        
                                        <div className={PhotoStudioStyles.iconGlass}>
                                            <CubeIcon className={`w-8 h-8 ${PhotoStudioStyles.iconProduct}`}/>
                                        </div>

                                        <div className={PhotoStudioStyles.contentWrapper}>
                                            <h3 className={PhotoStudioStyles.title}>Product Shot</h3>
                                            <p className={PhotoStudioStyles.desc}>Studio lighting, 3D podiums, and pure environments.</p>
                                        </div>

                                        <div className={PhotoStudioStyles.actionBtn}>
                                            <ArrowRightIcon className={PhotoStudioStyles.actionIcon}/>
                                        </div>
                                    </button>

                                    {/* Model Shot Card */}
                                    <button onClick={() => handleModeSelect('model')} className={`${PhotoStudioStyles.modeCard} ${PhotoStudioStyles.modeCardModel}`}>
                                        <div className={`${PhotoStudioStyles.orb} ${PhotoStudioStyles.orbModel}`}></div>
                                        
                                        <div className={PhotoStudioStyles.iconGlass}>
                                            <UsersIcon className={`w-8 h-8 ${PhotoStudioStyles.iconModel}`}/>
                                        </div>

                                        <div className={PhotoStudioStyles.contentWrapper}>
                                            <h3 className={PhotoStudioStyles.title}>Model Shot</h3>
                                            <p className={PhotoStudioStyles.desc}>AI Humans holding, wearing, or interacting with it.</p>
                                        </div>

                                        <div className={PhotoStudioStyles.actionBtn}>
                                            <ArrowRightIcon className={PhotoStudioStyles.actionIcon}/>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                        {studioMode && (
                            <div className="animate-fadeIn relative">
                                <div className="flex items-center mb-2 -ml-2"> 
                                    <button onClick={() => { setStudioMode(null); setSelectedPrompt(null); setCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); }} className={PhotoStudioStyles.backButton}>
                                        <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                    </button>
                                </div>

                                {/* NEW HIGHLIGHTED INSTRUCTION */}
                                {(!selectedPrompt && !isAnalyzing && !isAnalyzingModel) && (
                                     <div className={PhotoStudioStyles.instructionBanner}>
                                        <InformationCircleIcon className={PhotoStudioStyles.instructionIcon} />
                                        <p className={PhotoStudioStyles.instructionText}>
                                            Choose an AI concept below <strong>OR</strong> customize your own style manually.
                                        </p>
                                     </div>
                                )}

                                {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType) || isAnalyzing || isAnalyzingModel) && (
                                    <div className={PhotoStudioStyles.promptContainer}>
                                        {(isAnalyzing || isAnalyzingModel) ? (
                                            <div className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-100 opacity-50"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pixa is Thinking...</p></div>
                                        ) : (
                                            <div>
                                                <div className={PhotoStudioStyles.promptHeader}>
                                                    <label className={PhotoStudioStyles.promptLabel}>Pixa's Ideas</label>
                                                    {selectedPrompt ? <button onClick={() => setSelectedPrompt(null)} className={PhotoStudioStyles.promptClearBtn}>Clear Selection</button> : <span className={PhotoStudioStyles.promptTag}>Pixa Recommends</span>}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((promptItem, idx) => {
                                                        const isModel = studioMode === 'model';
                                                        const displayText = isModel ? (promptItem as any).display : promptItem;
                                                        const promptValue = isModel ? (promptItem as any).prompt : promptItem;
                                                        return (
                                                            <button key={idx} onClick={() => handlePromptSelect(promptValue)} style={!selectedPrompt ? { animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' } : {}} className={`${PhotoStudioStyles.promptButton} ${!selectedPrompt && 'animate-[fadeInUp_0.5s_ease-out]'}`}>
                                                                <div className={`${PhotoStudioStyles.promptContent} ${selectedPrompt === promptValue ? PhotoStudioStyles.promptButtonActive : PhotoStudioStyles.promptButtonInactive} border border-transparent`}>
                                                                    <span className={`${PhotoStudioStyles.promptText} ${selectedPrompt === promptValue ? PhotoStudioStyles.promptTextActive : PhotoStudioStyles.promptTextInactive}`}>"{displayText}"</span>
                                                                    {selectedPrompt === promptValue && <SparklesIcon className="w-4 h-4 text-white" />}
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* DIVIDER - UPDATED TEXT */}
                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="relative flex py-4 items-center animate-fadeIn">
                                        <div className="flex-grow border-t border-gray-200"></div>
                                        <span className="flex-shrink-0 mx-2 text-[9px] text-gray-400 font-bold bg-white px-2 py-1 rounded-full border border-gray-100 uppercase tracking-widest shadow-sm">OR CONFIGURE MANUALLY</span>
                                        <div className="flex-grow border-t border-gray-200"></div>
                                    </div>
                                )}

                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {studioMode === 'product' ? (
                                            <>
                                                 <ManualSelection 
                                                    label="1. Product Category" 
                                                    options={categories} 
                                                    value={category} 
                                                    onChange={(val) => { setCategory(val); setBrandStyle(''); setVisualType(''); autoScroll(); }} 
                                                 />
                                                {category && <ManualSelection label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={(val) => { setBrandStyle(val); setVisualType(''); autoScroll(); }} />}
                                                {category && brandStyle && <ManualSelection label="3. Visual Type" options={visualTypes} value={visualType} onChange={(val) => { setVisualType(val); autoScroll(); }} />}
                                            </>
                                        ) : (
                                            <>
                                                <ManualSelection label="1. Composition" options={compositionTypes} value={modelComposition} onChange={(val) => { setModelComposition(val); autoScroll(); }} />
                                                {modelComposition && <ManualSelection label="2. Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming(''); autoScroll(); }} />}
                                                {modelType && <ManualSelection label="3. Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); setSkinTone(''); setBodyType(''); autoScroll(); }} />}
                                                {modelRegion && <ManualSelection label="4. Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); setBodyType(''); autoScroll(); }} />}
                                                {skinTone && <ManualSelection label="5. Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); setModelFraming(''); autoScroll(); }} />}
                                                {bodyType && <ManualSelection label="6. Shot Type" options={shotTypes} value={modelFraming} onChange={(val) => { setModelFraming(val); autoScroll(); }} />}
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
        {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
        {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Generation" />}
        {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};