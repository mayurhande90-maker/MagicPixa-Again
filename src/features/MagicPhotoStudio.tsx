import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    PhotoStudioIcon, CubeIcon, UsersIcon, CreditCoinIcon, SparklesIcon, ArrowLeftIcon, XIcon, UploadIcon, ArrowUpCircleIcon, PixaProductIcon, ArrowRightIcon, InformationCircleIcon, MagicWandIcon
} from '../components/icons';
import { 
    FeatureLayout, SelectionGrid, MilestoneSuccessModal, checkMilestone 
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
import { createPortal } from 'react-dom';

// FIX: Added missing IndustryCard component definition for mode selection
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
            <h3 className={PhotoStudioStyles.title}> {title} </h3>
            <p className={PhotoStudioStyles.desc}> {desc} </p>
        </div>
        <div className={PhotoStudioStyles.actionBtn}>
            <ArrowRightIcon className={PhotoStudioStyles.actionIcon}/>
        </div>
    </button>
);

export const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, navigateTo, appConfig }) => {
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);
    const currentCost = studioMode === 'model' ? (appConfig?.featureCosts['Model Shot'] || 10) : (appConfig?.featureCosts['Pixa Product Shots'] || 10);
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

    const [isRefineActive, setIsRefineActive] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

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
        if (loading || isRefining) {
            const steps = isRefining 
                ? ["Elite Retoucher: Syncing changes...", "Applying pixel adjustments...", "Refining lighting depth...", "Smoothing reflections...", "Finalizing high-res output..."]
                : ["Pixa Vision: Extracting material DNA...", "Production: Setting virtual lighting...", "Shadow Engine: Calculating AO shadows...", "Global Illumination: Bouncing light...", "Finalizing: Mastering 8K export..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [loading, isRefining]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            handleNewSession();
            setImage({ url: URL.createObjectURL(file), base64 });
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
            } catch (err) { setSuggestedPrompts(["Clean white studio", "Luxury marble table"]); } finally { setIsAnalyzing(false); }
        } else if (mode === 'model') {
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType, auth.activeBrandKit);
                 setSuggestedModelPrompts(prompts);
             } catch (e) { setSuggestedModelPrompts([{ display: "Close-Up", prompt: "Close-up model shot" }]); } finally { setIsAnalyzingModel(false); }
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (userCredits < currentCost) return;
        setResult(null); setLoading(true); setLastCreationId(null); setIsRefineActive(false);
        try {
            let res;
            if (studioMode === 'model') {
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, { modelType, region: modelRegion, skinTone, bodyType, composition: modelComposition, framing: modelFraming, freeformPrompt: selectedPrompt || undefined }, auth.activeBrandKit);
            } else {
                let generationDirection = selectedPrompt || (category ? `${visualType || 'Professional'} shot of ${category} product. Style: ${brandStyle || 'Clean'}.` : "Professional studio lighting");
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection, auth.activeBrandKit);
            }
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            const updatedUser = await deductCredits(auth.user.uid, currentCost, studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            const creationId = await saveCreation(auth.user.uid, `data:image/png;base64,${res}`, studioMode === 'model' ? 'Pixa Model Shots' : 'Pixa Product Shots');
            setLastCreationId(creationId);
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
        } catch (e: any) { alert('Generation failed.'); } finally { setLoading(false); }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits."); return; }
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(result);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResult(blobUrl);
            if (lastCreationId) await updateCreation(auth.user.uid, lastCreationId, `data:image/png;base64,${res}`);
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Studio Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setRefineText('');
            setNotification({ msg: "Refinement complete!", type: 'success' });
        } catch (e: any) { alert("Refinement failed."); } finally { setIsRefining(false); }
    };

    const handleNewSession = () => { setImage(null); setResult(null); setStudioMode(null); setCategory(''); setBrandStyle(''); setVisualType(''); setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelComposition(''); setModelFraming(''); setSuggestedPrompts([]); setSuggestedModelPrompts([]); setSelectedPrompt(null); setLastCreationId(null); setIsRefineActive(false); };

    // FIX: Added missing handleEditorSave implementation for MagicEditor integration
    const handleEditorSave = async (newUrl: string) => { 
        setResult(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Product Shots (Edited)'); 
            setLastCreationId(id); 
        }
    };

    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const canGenerate = !!image && !!studioMode && !isLowCredits && (studioMode === 'product' ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType)) : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming)));

    return (
        <>
        <FeatureLayout 
            title="Pixa Product Shots" description="Elite product and model photography studio. Preserve your identity, reimagine your world." icon={<PixaProductIcon className="w-14 h-14"/>} rawIcon={true} creditCost={currentCost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={result} creationId={lastCreationId} onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit} resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
            customActionButtons={result ? (
                <button 
                    onClick={() => setIsRefineActive(!isRefineActive)}
                    className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                >
                    <SparklesIcon className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                    <span>Make Changes</span>
                </button>
            ) : null}
            resultHeightClass="h-[800px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: studioMode === 'model' ? "Generate Model Shots" : "Generate Product Shots" }} scrollRef={scrollRef}
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                         {(loading || isRefining) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse text-center px-6">{loadingText}</p>
                            </div>
                        )}
                        {(isAnalyzing || isAnalyzingModel) && (
                            <div className={PhotoStudioStyles.analysisOverlay}>
                                <div className={PhotoStudioStyles.analysisBadge}><div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div><span className="text-xs font-bold tracking-widest uppercase">Pixa Vision Scanning...</span></div>
                            </div>
                        )}
                        <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'blur-sm scale-105' : ''}`} />
                        {!loading && !isRefining && !isAnalyzing && !isAnalyzingModel && (
                            <><button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"><XIcon className="w-5 h-5"/></button><button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40"><UploadIcon className="w-5 h-5"/></button></>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current?.click()} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden bg-white hover:-translate-y-1 hover:shadow-xl`}>
                        <div className="p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:scale-110 transition-all"><PhotoStudioIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600" /></div>
                        <div className="mt-6 text-center space-y-2 px-6"><p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E]">Upload Product Photo</p><p className="text-[10px] text-gray-400 font-medium">Capture your product against a simple background.</p></div>
                    </div>
                )
            }
            rightContent={
                <div className={`h-full flex flex-col ${(!image || loading || isRefining) ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                    {!studioMode ? (
                        <div className={PhotoStudioStyles.modeGrid}>
                            <IndustryCard title="Product Shot" desc="Studio lighting and 3D podiums." icon={<CubeIcon className="w-8 h-8 text-blue-600"/>} onClick={() => handleModeSelect('product')} styles={{ card: PhotoStudioStyles.modeCardProduct, orb: PhotoStudioStyles.orbProduct, icon: PhotoStudioStyles.iconProduct }} />
                            <IndustryCard title="Model Shot" desc="AI Humans interacting with it." icon={<UsersIcon className="w-8 h-8 text-purple-600"/>} onClick={() => handleModeSelect('model')} styles={{ card: PhotoStudioStyles.modeCardModel, orb: PhotoStudioStyles.orbModel, icon: PhotoStudioStyles.iconModel }} />
                        </div>
                    ) : (
                        <div className="animate-fadeIn relative flex flex-col h-full">
                            <div className="flex items-center mb-4 -ml-2 shrink-0"><button onClick={() => { setStudioMode(null); setSelectedPrompt(null); }} className={PhotoStudioStyles.backButton}><ArrowLeftIcon className="w-4 h-4" /> Back to Mode</button></div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <SelectionGrid label="1. Category" options={categories} value={category} onChange={(val) => { setCategory(val); autoScroll(); }} />
                                {category && <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={(val) => { setBrandStyle(val); autoScroll(); }} />}
                                {brandStyle && <SelectionGrid label="3. Theme" options={visualTypes} value={visualType} onChange={setVisualType} />}
                            </div>
                        </div>
                    )}
                </div>
            }
        />
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={async () => {}} onClose={() => setMilestoneBonus(undefined)} />}
        {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={async () => {}} />}
        {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={() => {}} isProcessing={isRefunding} featureName="Product Shot" />}
        {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}

        {isRefineActive && result && !isRefining && createPortal(
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 animate-fadeInUp z-[400]">
                <div className="bg-gray-900/95 backdrop-blur-xl border border-white/20 p-2.5 rounded-[1.8rem] shadow-2xl flex gap-3 items-center">
                    <div className="p-3 bg-white/10 rounded-2xl text-yellow-400"><MagicWandIcon className="w-5 h-5"/></div>
                    <input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} placeholder="e.g. Change table to wood, add shadows..." className="flex-1 bg-transparent border-none px-2 py-2 text-sm font-medium text-white outline-none focus:ring-0" autoFocus onKeyDown={(e) => e.key === 'Enter' && handleRefine()} />
                    <button onClick={handleRefine} disabled={!refineText.trim()} className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95">Refine</button>
                </div>
            </div>,
            document.body
        )}
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </>
    );
};