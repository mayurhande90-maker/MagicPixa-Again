import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    PhotoStudioIcon, CubeIcon, UsersIcon, CreditCoinIcon, SparklesIcon, ArrowLeftIcon, XIcon, UploadIcon, ArrowUpCircleIcon, PixaProductIcon, ArrowRightIcon
} from '../components/icons';
import { 
    FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone 
} from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, editImageWithPrompt } from '../services/photoStudioService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { PhotoStudioStyles } from '../styles/features/MagicPhotoStudio.styles';

export const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, navigateTo, appConfig }) => {
    // Mode Selection State
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);

    // Determine cost
    const currentCost = studioMode === 'model' 
        ? (appConfig?.featureCosts['Model Shot'] || 10) 
        : (appConfig?.featureCosts['Pixa Product Shots'] || appConfig?.featureCosts['Magic Photo Studio'] || 10);

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

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => {
        if (!auth.user || !result) return; setIsRefunding(true);
        try { const res = await processRefundRequest(auth.user.uid, auth.user.email, currentCost, reason, "Product Shot", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + currentCost } : null); setResult(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); }
    };

    const handleNewSession = () => {
        setImage(null); setResult(null); setStudioMode(null); setCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); setSuggestedPrompts([]); setSuggestedModelPrompts([]); setSelectedPrompt(null); setLastCreationId(null);
    };

    const handleEditorSave = async (newUrl: string) => { setResult(newUrl); const id = await saveCreation(auth.user!.uid, newUrl, 'Pixa Product Shots (Edited)'); setLastCreationId(id); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

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
            resultHeightClass="h-[750px]"
            hideGenerateButton={isLowCredits}
            generateButtonStyle={{ 
                className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", 
                hideIcon: true,
                label: studioMode === 'model' ? "Generate Model Shots" : "Generate Product Shots"
            }}
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
                isLowCredits ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                        <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                        <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {currentCost} credits.</p>
                        <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b]">Recharge Now</button>
                    </div>
                ) : (
                    <div className={`space-y-4 animate-fadeIn p-1 h-full flex flex-col ${(!image || loading) ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <div className={PhotoStudioStyles.modeGrid}>
                                    <button onClick={() => handleModeSelect('product')} className={`${PhotoStudioStyles.modeCard} ${PhotoStudioStyles.modeCardProduct}`}>
                                        <div className={`${PhotoStudioStyles.orb} ${PhotoStudioStyles.orbProduct}`}></div>
                                        <div className={PhotoStudioStyles.iconGlass}><CubeIcon className={`w-8 h-8 ${PhotoStudioStyles.iconProduct}`}/></div>
                                        <div className={PhotoStudioStyles.contentWrapper}><h3 className={PhotoStudioStyles.title}>Product Shot</h3><p className={PhotoStudioStyles.desc}>Studio lighting, 3D podiums, and pure environments.</p></div>
                                        <div className={PhotoStudioStyles.actionBtn}><ArrowRightIcon className={PhotoStudioStyles.actionIcon}/></div>
                                    </button>
                                    <button onClick={() => handleModeSelect('model')} className={`${PhotoStudioStyles.modeCard} ${PhotoStudioStyles.modeCardModel}`}>
                                        <div className={`${PhotoStudioStyles.orb} ${PhotoStudioStyles.orbModel}`}></div>
                                        <div className={PhotoStudioStyles.iconGlass}><UsersIcon className={`w-8 h-8 ${PhotoStudioStyles.iconModel}`}/></div>
                                        <div className={PhotoStudioStyles.contentWrapper}><h3 className={PhotoStudioStyles.title}>Model Shot</h3><p className={PhotoStudioStyles.desc}>AI Humans holding, wearing, or interacting with it.</p></div>
                                        <div className={PhotoStudioStyles.actionBtn}><ArrowRightIcon className={PhotoStudioStyles.actionIcon}/></div>
                                    </button>
                                </div>
                            </div>
                        )}
                        {studioMode && (
                            <div className="animate-fadeIn relative flex flex-col h-full">
                                <div className="flex items-center mb-4 -ml-2 shrink-0"> 
                                    <button onClick={() => { setStudioMode(null); setSelectedPrompt(null); setCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); }} className={PhotoStudioStyles.backButton}>
                                        <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    {(isAnalyzing || isAnalyzingModel) ? (
                                        <div className="p-8 rounded-2xl flex flex-col items-center justify-center gap-4 border border-gray-100 bg-gray-50/50 h-64 opacity-50">
                                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Pixa is Thinking...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* BOX 1: AI BLUEPRINTS (Hidden if manual controls started) */}
                                            {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType)) && !selectedPrompt && (
                                                <div className="bg-indigo-50/40 rounded-2xl p-5 border border-indigo-100 mb-6 transition-all hover:border-indigo-200 hover:shadow-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                                            <SparklesIcon className="w-3.5 h-3.5 text-indigo-500" />
                                                            AI Blueprints
                                                        </label>
                                                        <span className="text-[10px] bg-white text-indigo-600 px-2 py-1 rounded-full font-bold shadow-sm border border-indigo-100">Pixa Recommends</span>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-2.5">
                                                        {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((promptItem, idx) => {
                                                            const isModel = studioMode === 'model';
                                                            const displayText = isModel ? (promptItem as any).display : promptItem;
                                                            const promptValue = isModel ? (promptItem as any).prompt : promptItem;
                                                            const isSelected = selectedPrompt === promptValue;

                                                            return (
                                                                <div 
                                                                    key={idx} 
                                                                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }} 
                                                                    className="group relative rounded-full p-[1px] bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 transition-all duration-300 animate-[fadeInUp_0.5s_ease-out] hover:shadow-md cursor-pointer"
                                                                    onClick={() => handlePromptSelect(promptValue)}
                                                                >
                                                                    <div className={`w-full h-full rounded-full bg-white/40 hover:bg-white/60 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between transition-all duration-200`}>
                                                                        <span className={`text-xs font-medium italic ${isSelected ? 'text-indigo-700 font-bold' : 'text-slate-700'}`}>
                                                                            "{displayText}"
                                                                        </span>
                                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white/50 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                                                            <ArrowRightIcon className="w-2.5 h-2.5" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* DIVIDER (Hidden if manual controls started) */}
                                            {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType)) && !selectedPrompt && (
                                                <div className="relative flex items-center py-2 mb-6 opacity-70">
                                                    <div className="flex-grow border-t border-gray-300"></div>
                                                    <span className="flex-shrink-0 mx-3 text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 py-1 bg-gray-100 rounded-full">OR BUILD YOUR OWN</span>
                                                    <div className="flex-grow border-t border-gray-300"></div>
                                                </div>
                                            )}

                                            {/* SELECTED PROMPT VIEW */}
                                            {selectedPrompt && (
                                                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200 mb-6 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Selected Blueprint</p>
                                                        <p className="text-sm font-medium text-indigo-900 line-clamp-2">
                                                            {studioMode === 'model' 
                                                                ? suggestedModelPrompts.find(p => (p as any).prompt === selectedPrompt)?.display 
                                                                : selectedPrompt}
                                                        </p>
                                                    </div>
                                                    <button onClick={() => setSelectedPrompt(null)} className="p-2 hover:bg-indigo-100 rounded-full text-indigo-500 transition-colors">
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* BOX 2: MANUAL CONTROLS */}
                                            {!selectedPrompt && (
                                                <div className={`transition-all duration-500 ${((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType)) ? 'bg-white rounded-2xl p-5 border border-gray-200 shadow-sm' : ''}`}>
                                                    
                                                    {/* Header for Box 2 */}
                                                    {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType)) && (
                                                        <div className="mb-5 flex items-center gap-2 border-b border-gray-100 pb-3">
                                                            <div className="p-1.5 bg-gray-100 rounded-lg">
                                                                <CubeIcon className="w-3.5 h-3.5 text-gray-500" />
                                                            </div>
                                                            <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                                                Custom Studio Config
                                                            </label>
                                                        </div>
                                                    )}

                                                    <div className="space-y-6 animate-fadeIn">
                                                        {studioMode === 'product' ? (
                                                            <>
                                                                 <div>
                                                                     <div className={PhotoStudioStyles.promptHeader}>
                                                                        <label className={PhotoStudioStyles.promptLabel}>1. Product Category</label>
                                                                        {category && <button onClick={() => { setCategory(''); setBrandStyle(''); setVisualType(''); }} className={PhotoStudioStyles.promptClearBtn}>Clear</button>}
                                                                     </div>
                                                                     <div className="flex flex-wrap gap-2">
                                                                        {categories.map(opt => (
                                                                            <button key={opt} onClick={() => { setCategory(opt); setBrandStyle(''); setVisualType(''); autoScroll(); }} className={`${PhotoStudioStyles.categoryBtn} ${category === opt ? PhotoStudioStyles.categoryBtnActive : PhotoStudioStyles.categoryBtnInactive}`}>{opt}</button>
                                                                        ))}
                                                                     </div>
                                                                </div>
                                                                {category && <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={(val) => { setBrandStyle(val); setVisualType(''); autoScroll(); }} />}
                                                                {category && brandStyle && <SelectionGrid label="3. Visual Type" options={visualTypes} value={visualType} onChange={(val) => { setVisualType(val); autoScroll(); }} />}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <SelectionGrid label="1. Composition" options={compositionTypes} value={modelComposition} onChange={(val) => { setModelComposition(val); autoScroll(); }} />
                                                                {modelComposition && <SelectionGrid label="2. Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming(''); autoScroll(); }} />}
                                                                {modelType && <SelectionGrid label="3. Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); setSkinTone(''); setBodyType(''); setModelFraming(''); autoScroll(); }} />}
                                                                {modelRegion && <SelectionGrid label="4. Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); setBodyType(''); setModelFraming(''); autoScroll(); }} />}
                                                                {skinTone && <SelectionGrid label="5. Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); setModelFraming(''); autoScroll(); }} />}
                                                                {bodyType && <SelectionGrid label="6. Shot Type" options={shotTypes} value={modelFraming} onChange={(val) => { setModelFraming(val); autoScroll(); }} />}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )
            }
        />
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
        {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
        {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Generation" />}
        {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};