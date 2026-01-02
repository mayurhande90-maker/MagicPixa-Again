import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { 
    PhotoStudioIcon, CubeIcon, UsersIcon, CreditCoinIcon, SparklesIcon, ArrowLeftIcon, XIcon, UploadIcon, ArrowUpCircleIcon, PixaProductIcon, ArrowRightIcon, InformationCircleIcon, MagicWandIcon
} from '../components/icons';
import { 
    FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone, InputField 
} from '../components/FeatureLayout';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, editImageWithPrompt, refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus, logApiError } from '../firebase';
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
    
    const refineCost = 2;

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

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const refineTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    // Manual Refinement State
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    // Updated Categories: Packaged Products -> Medical Product + Added Custom
    const categories = ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Medical Product', 'Jewellery', 'Footwear', 'Toys', 'Automotive', 'Other / Custom'];
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

    // Fluid height effect for refinement textarea
    useEffect(() => {
        if (refineTextareaRef.current) {
            refineTextareaRef.current.style.height = 'auto';
            refineTextareaRef.current.style.height = `${refineTextareaRef.current.scrollHeight}px`;
        }
    }, [refineText, isRefineActive]);

    useEffect(() => {
        let interval: any;
        if (loading || isRefining) {
            const steps = isRefining 
                ? ["Elite Retoucher: Analyzing current pixels...", "Optical Audit: Tracing light transport...", "Contact Correction: Recalculating AO shadows...", "Global Illumination: Applying color bleed...", "Post-Production: Final pixel polish..."]
                : ["Pixa Vision: Extracting material properties...", "Production Engine: Calibrating lighting rig...", "Ray-Tracing: Calculating contact shadows...", "Elite Retoucher: Harmonizing reflections...", "Finalizing: Polishing 8K output..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

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
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType, auth.activeBrandKit);
                setSuggestedPrompts(prompts);
            } catch (err) { setSuggestedPrompts(["Clean white studio", "Luxury marble table", "Natural sunlight wood", "Modern minimalist podium"]); } finally { setIsAnalyzing(false); }
        } else if (mode === 'model') {
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType, auth.activeBrandKit);
                 setSuggestedModelPrompts(prompts);
             } catch (e) { setSuggestedModelPrompts([{ display: "Close-Up", prompt: "Close-up model shot" }]); } finally { setIsAnalyzingModel(false); }
        }
    };

    const handlePromptSelect = (prompt: string) => {
        if (selectedPrompt === prompt) { setSelectedPrompt(null); } else {
             setSelectedPrompt(prompt);
             if (studioMode === 'product') { setCategory(''); setCustomCategory(''); setBrandStyle(''); setVisualType(''); } else { setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); }
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (userCredits < currentCost) { alert("Insufficient credits."); return; }
        
        setResult(null); 
        setLoading(true); 
        setLastCreationId(null);
        setIsRefineActive(false);
        
        try {
            let res;
            if (studioMode === 'model') {
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, { modelType, region: modelRegion, skinTone, bodyType, composition: modelComposition, framing: modelFraming, freeformPrompt: selectedPrompt || undefined }, auth.activeBrandKit);
            } else {
                const finalCategory = category === 'Other / Custom' ? customCategory : category;
                let generationDirection = selectedPrompt || (finalCategory ? `${visualType || 'Professional'} shot of ${finalCategory} product. Style: ${brandStyle || 'Clean'}.` : "Professional studio lighting");
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection, auth.activeBrandKit);
            }
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            const featureName = studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots';
            
            try {
                const updatedUser = await deductCredits(auth.user.uid, currentCost, featureName);
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                const creationId = await saveCreation(auth.user.uid, dataUri, featureName);
                setLastCreationId(creationId);
                if (updatedUser.lifetimeGenerations) { 
                    const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                    if (bonus !== false) setMilestoneBonus(bonus); 
                }
            } catch (dbError: any) {
                console.error("DB Sync Failure", dbError);
                logApiError("DB Sync Failure", dbError.message || "Unknown Firestore Error", auth.user.uid);
            }
        } catch (e: any) { 
            console.error("AI Generation Error:", e); 
            logApiError("Studio AI Failure", e.message || "Unknown AI Error", auth.user.uid);
            alert('Generation failed.'); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(result);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText);
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            const featureName = studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots';
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, `${featureName} (Refined)`);
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, `${featureName} (Refinement)`);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            setRefineText('');
            setNotification({ msg: "Elite Retoucher: Refinement complete!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
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
        setImage(null); setResult(null); setStudioMode(null); setCategory(''); setCustomCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); setSuggestedPrompts([]); setSuggestedModelPrompts([]); setSelectedPrompt(null); setLastCreationId(null); setIsRefineActive(false);
    };

    const handleEditorSave = async (newUrl: string) => { 
        setResult(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const featureName = studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots';
            const id = await saveCreation(auth.user.uid, newUrl, featureName); 
            setLastCreationId(id); 
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && !isLowCredits && (
        studioMode === 'product' 
        ? (!!selectedPrompt || (!!category && (category !== 'Other / Custom' || !!customCategory.trim()) && !!brandStyle && !!visualType)) 
        : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming))
    );

    return (
        <>
        <FeatureLayout 
            title="Pixa Product Shots"
            description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
            icon={<PixaProductIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>}
            rawIcon={true}
            creditCost={currentCost}
            isGenerating={loading || isRefining}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            creationId={lastCreationId}
            onResetResult={result ? undefined : () => setResult(null)}
            onNewSession={result ? undefined : handleNewSession}
            onEdit={() => setShowMagicEditor(true)}
            activeBrandKit={auth.activeBrandKit}
            resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
            canvasOverlay={isRefineActive && result && !isRefining ? (
                <div className="bg-gray-900/95 backdrop-blur-2xl border border-white/20 p-3 rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-4 animate-[fadeInUp_0.4s_cubic-bezier(0.16,1,0.3,1)]">
                    <div className="flex items-center justify-between px-3 pt-2">
                        <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em]">Pixa Retoucher Active</span>
                        </div>
                        <button onClick={() => setIsRefineActive(false)} className="text-white/40 hover:text-white transition-colors">
                        <XIcon className="w-4 h-4"/>
                        </button>
                    </div>
                    
                    <div className="bg-white/5 rounded-2xl p-1.5 flex gap-3 items-start border border-white/5">
                        <div className="p-3 bg-indigo-500 rounded-xl text-white shadow-lg shadow-indigo-500/20 mt-1">
                            <MagicWandIcon className="w-5 h-5"/>
                        </div>
                        <textarea 
                            ref={refineTextareaRef}
                            rows={1}
                            value={refineText}
                            onChange={(e) => setRefineText(e.target.value)}
                            placeholder="Describe your changes... (e.g. Add water droplets, make lighting warmer)"
                            className="flex-1 bg-transparent border-none px-2 py-3 text-[clamp(13px,1.8vh,15px)] font-medium text-white placeholder-gray-500 outline-none focus:ring-0 resize-none max-h-40 custom-scrollbar overflow-y-auto"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleRefine();
                                }
                            }}
                        />
                        <button 
                            onClick={handleRefine}
                            disabled={!refineText.trim()}
                            className="bg-[#F9D230] hover:bg-[#dfbc2b] text-black px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center shadow-lg active:scale-95 mt-1"
                        >
                            Apply <ArrowRightIcon className="w-4 h-4 ml-2" />
                        </button>
                    </div>

                    <div className="flex justify-center pb-2">
                        <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/10 shadow-xl">
                            <CreditCoinIcon className="w-3 h-3 text-yellow-400"/>
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">
                                {refineCost} Credits Per Iteration
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}
            customActionButtons={result ? (
                <button 
                    onClick={() => setIsRefineActive(!isRefineActive)}
                    className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                >
                    <span>Make Changes</span>
                </button>
            ) : null}
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
                         {(loading || isRefining) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">{loadingText}</p>
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
                                    <span className="text-xs font-bold tracking-widest uppercase">Pixa Vision Scanning...</span>
                                </div>
                            </div>
                        )}
                        <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'blur-sm scale-105' : ''}`} />
                        {!loading && !isRefining && !isAnalyzing && !isAnalyzingModel && (
                            <>
                                <button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"><XIcon className="w-5 h-5"/></button>
                                <button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"><UploadIcon className="w-5 h-5"/></button>
                            </>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
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
                    <div className={`space-y-4 animate-fadeIn p-1 h-full flex flex-col ${(!image || loading || isRefining) ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <div className={PhotoStudioStyles.modeGrid}>
                                    <IndustryCard 
                                        title="Product Shot" desc="Studio lighting, 3D podiums, and pure environments." 
                                        icon={<CubeIcon className={`w-8 h-8 ${PhotoStudioStyles.iconProduct}`}/>} 
                                        onClick={() => handleModeSelect('product')}
                                        styles={{ card: PhotoStudioStyles.modeCardProduct, orb: PhotoStudioStyles.orbProduct, icon: PhotoStudioStyles.iconProduct }}
                                    />
                                    <IndustryCard 
                                        title="Model Shot" desc="AI Humans holding, wearing, or interacting with it." 
                                        icon={<UsersIcon className={`w-8 h-8 ${PhotoStudioStyles.iconModel}`}/>} 
                                        onClick={() => handleModeSelect('model')}
                                        styles={{ card: PhotoStudioStyles.modeCardModel, orb: PhotoStudioStyles.orbModel, icon: PhotoStudioStyles.iconModel }}
                                    />
                                </div>
                            </div>
                        )}
                        {studioMode && (
                            <div className="animate-fadeIn relative flex flex-col h-full">
                                <div className="flex items-center mb-4 -ml-2 shrink-0"> 
                                    <button onClick={() => { setStudioMode(null); setSelectedPrompt(null); setCategory(''); setCustomCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); }} className={PhotoStudioStyles.backButton}>
                                        <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                    {(isAnalyzing || isAnalyzingModel) ? (
                                        <div className="space-y-6">
                                             <div className="bg-gray-100/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 animate-pulse">
                                                 <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pixa Vision is Analyzing Identity...</p>
                                             </div>
                                        </div>
                                    ) : (
                                        <>
                                        {/* Suggested AI Prompts Section */}
                                        {(suggestedPrompts.length > 0 || suggestedModelPrompts.length > 0) && (
                                            <div className={PhotoStudioStyles.promptContainer}>
                                                <div className={PhotoStudioStyles.promptHeader}>
                                                    <label className={PhotoStudioStyles.promptLabel}>
                                                        {studioMode === 'product' ? '1. AI Suggestions (Blueprints)' : '1. AI Suggestions (Model Concepts)'}
                                                    </label>
                                                    {selectedPrompt && <button onClick={() => setSelectedPrompt(null)} className={PhotoStudioStyles.promptClearBtn}>Reset</button>}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mb-3 italic px-1">
                                                    <InformationCircleIcon className="w-3 h-3 inline mr-1" />
                                                    Pixa has analyzed your image to provide these custom AI recommendations.
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {studioMode === 'product' ? suggestedPrompts.map((p, i) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handlePromptSelect(p)}
                                                            className={`${PhotoStudioStyles.promptButton} ${selectedPrompt === p ? PhotoStudioStyles.promptButtonActive : PhotoStudioStyles.promptButtonInactive}`}
                                                        >
                                                            <div className={`${PhotoStudioStyles.promptBorder} ${selectedPrompt === p ? 'opacity-100' : 'opacity-0'}`}></div>
                                                            <div className={`${PhotoStudioStyles.promptContent} ${selectedPrompt === p ? 'bg-transparent' : 'bg-white border border-gray-100 group-hover:border-indigo-200'}`}>
                                                                <span className={`${PhotoStudioStyles.promptText} ${selectedPrompt === p ? PhotoStudioStyles.promptTextActive : PhotoStudioStyles.promptTextInactive}`}>"{p}"</span>
                                                            </div>
                                                        </button>
                                                    )) : suggestedModelPrompts.map((p, i) => (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => handlePromptSelect(p.prompt)}
                                                            className={`${PhotoStudioStyles.promptButton} ${selectedPrompt === p.prompt ? PhotoStudioStyles.promptButtonActive : PhotoStudioStyles.promptButtonInactive}`}
                                                        >
                                                            <div className={`${PhotoStudioStyles.promptBorder} ${selectedPrompt === p.prompt ? 'opacity-100' : 'opacity-0'}`}></div>
                                                            <div className={`${PhotoStudioStyles.promptContent} ${selectedPrompt === p.prompt ? 'bg-transparent' : 'bg-white border border-gray-100 group-hover:border-indigo-200'}`}>
                                                                <span className={`${PhotoStudioStyles.promptText} ${selectedPrompt === p.prompt ? PhotoStudioStyles.promptTextActive : PhotoStudioStyles.promptTextInactive}`}>{p.display}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 py-4">
                                            <div className="h-px bg-gray-200 flex-1"></div>
                                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Or Manual Refinement</span>
                                            <div className="h-px bg-gray-200 flex-1"></div>
                                        </div>

                                        {/* Manual Configuration based on mode */}
                                        <div className={`space-y-6 ${selectedPrompt ? 'opacity-30 pointer-events-none blur-[1px] grayscale' : ''}`}>
                                            {studioMode === 'product' ? (
                                                <>
                                                    <SelectionGrid label="2. Product Category" options={categories} value={category} onChange={(val) => { setCategory(val); autoScroll(); }} />
                                                    
                                                    {category === 'Other / Custom' && (
                                                        <div className="animate-fadeIn mt-2">
                                                            <InputField 
                                                                label="Define Custom Product Type" 
                                                                placeholder="e.g. Handmade Ceramic Bowl, Smart Watch..." 
                                                                value={customCategory} 
                                                                onChange={(e: any) => setCustomCategory(e.target.value)}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    )}

                                                    {category && (category !== 'Other / Custom' || !!customCategory.trim()) && (
                                                        <>
                                                            <SelectionGrid label="3. Brand Style" options={brandStyles} value={brandStyle} onChange={(val) => { setBrandStyle(val); autoScroll(); }} />
                                                            {brandStyle && <SelectionGrid label="4. Visual Theme" options={visualTypes} value={visualType} onChange={setVisualType} />}
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <SelectionGrid label="2. Model Persona" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); autoScroll(); }} />
                                                    {modelType && <SelectionGrid label="3. Regional Identity" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); autoScroll(); }} />}
                                                    {modelRegion && <SelectionGrid label="4. Skin & Build" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); autoScroll(); }} />}
                                                    {skinTone && <SelectionGrid label="5. Body Archetype" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); }} />}
                                                    {bodyType && <SelectionGrid label="6. Shot Composition" options={compositionTypes} value={modelComposition} onChange={(val) => { setModelComposition(val); autoScroll(); }} />}
                                                    {modelComposition && <SelectionGrid label="7. Camera Framing" options={shotTypes} value={modelFraming} onChange={setModelFraming} />}
                                                </>
                                            )}
                                        </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        {!image && (
                            <div className="h-full flex items-center justify-center gap-3 text-xs text-gray-400 font-bold uppercase tracking-widest opacity-60">
                                <ArrowUpCircleIcon className="w-5 h-5 animate-bounce" />
                                <span>Upload a photo to begin</span>
                            </div>
                        )}
                    </div>
                )
            }
        />
        
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
        
        {showMagicEditor && result && (
            <MagicEditorModal 
                imageUrl={result} 
                onClose={() => setShowMagicEditor(false)} 
                onSave={handleEditorSave} 
                deductCredit={handleDeductEditCredit} 
            />
        )}
        
        {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Product Shot" />}
        {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        
        {/* Hidden inputs for file uploads */}
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        
        <style>{`
            @keyframes scan-horizontal {
                0% { left: 0%; }
                100% { left: 100%; }
            }
        `}</style>
        </>
    );
};

const IndustryCard: React.FC<{ 
    title: string; 
    desc: string; 
    icon: React.ReactNode; 
    onClick: () => void;
    styles: { card: string; orb: string; icon: string; };
}> = ({ title, desc, icon, onClick, styles }) => (
    <button onClick={onClick} className={`${PhotoStudioStyles.modeCard} ${styles.card}`}>
        <div className={`${PhotoStudioStyles.orb} ${styles.orb}`}></div>
        <div className={`${PhotoStudioStyles.iconGlass} ${styles.icon}`}>{icon}</div>
        <div className={PhotoStudioStyles.contentWrapper}>
            <h3 className={PhotoStudioStyles.title}>{title}</h3>
            <p className={PhotoStudioStyles.desc}>{desc}</p>
        </div>
        <div className={PhotoStudioStyles.actionBtn}>
            <ArrowRightIcon className={PhotoStudioStyles.actionIcon}/>
        </div>
    </button>
);