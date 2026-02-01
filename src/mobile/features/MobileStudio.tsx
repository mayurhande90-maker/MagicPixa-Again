
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View } from '../../types';
import { 
    PixaProductIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CreditCoinIcon, PaletteIcon, MagicWandIcon, CubeIcon, UsersIcon,
    CameraIcon, ImageIcon, ArrowRightIcon, ArrowLeftIcon, RefreshIcon,
    InformationCircleIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64 } from '../../utils/imageUtils';
import { editImageWithPrompt, analyzeProductImage, analyzeProductForModelPrompts, generateModelShot, refineStudioImage } from '../../services/photoStudioService';
import { deductCredits, saveCreation, updateCreation } from '../../firebase';
import { SelectionGrid, InputField } from '../../components/FeatureLayout';
import { PhotoStudioStyles } from '../../styles/features/MagicPhotoStudio.styles';
import { MobileSheet } from '../components/MobileSheet';

const CATEGORIES = ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Jewellery', 'Footwear', 'Other / Custom'];
const BRAND_STYLES = ['Clean', 'Bold', 'Luxury', 'Playful', 'Natural', 'High-tech', 'Minimal'];
const VISUAL_THEMES = ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'];

const MODEL_TYPES = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
const MODEL_REGIONS = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American'];
const SKIN_TONES = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
const COMPOSITION_TYPES = ['Single Model', 'Group Shot'];

export const MobileStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    // --- State ---
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing subject...");
    
    // AI Suggestions
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    // Form State
    const [category, setCategory] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [composition, setComposition] = useState('');

    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [isRefining, setIsRefining] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts['Pixa Product Shots'] || 10;
    const refineCost = 5;

    // --- Effects ---
    useEffect(() => {
        let interval: any;
        if (isGenerating || isRefining) {
            const steps = isRefining 
                ? ["Elite Retoucher: Analyzing pixels...", "Optical Audit: Tracing rays...", "Refining details...", "Finalizing output..."]
                : ["Pixa Vision: Extracting identity...", "Calibrating lighting rig...", "Tracing reflections...", "Polishing 4K render..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [isGenerating, isRefining]);

    // --- Handlers ---
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            setStudioMode(null);
            setSelectedPrompt(null);
        }
    };

    const handleModeSelect = async (mode: 'product' | 'model') => {
        setStudioMode(mode);
        setIsAnalyzing(true);
        try {
            if (mode === 'product') {
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType, auth.activeBrandKit);
                setSuggestedPrompts(prompts);
            } else {
                const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType, auth.activeBrandKit);
                setSuggestedModelPrompts(prompts);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setIsGenerating(true);
        try {
            const finalCategory = category === 'Other / Custom' ? customCategory : category;
            const promptDirection = selectedPrompt || (studioMode === 'product' 
                ? `${visualType} shot of ${finalCategory} product in ${brandStyle} style.`
                : `Model: ${modelType}, Region: ${modelRegion}, Skin: ${skinTone}, Composition: ${composition}`);

            let resB64;
            if (studioMode === 'product') {
                resB64 = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, promptDirection, auth.activeBrandKit);
            } else {
                resB64 = await generateModelShot(image.base64.base64, image.base64.mimeType, { 
                    modelType, region: modelRegion, skinTone, composition, freeformPrompt: selectedPrompt || undefined 
                }, auth.activeBrandKit);
            }

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Studio (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Product Shots');

        } catch (e: any) {
            alert("Generation failed. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRefine = async () => {
        if (!result || !refineText.trim() || !auth.user) return;
        setIsRefining(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(result);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            setRefineText('');
        } catch (e) {
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const canGenerate = !!studioMode && (
        selectedPrompt || 
        (studioMode === 'product' ? (!!category && !!brandStyle && !!visualType) : (!!modelType && !!modelRegion && !!skinTone))
    );

    return (
        <div className="h-full flex flex-col bg-white overflow-y-auto no-scrollbar pb-32">
            
            {/* 1. Viewport / Preview Area */}
            <div className="p-4 flex-none">
                <div className={`relative w-full aspect-square rounded-[2rem] overflow-hidden border-2 transition-all duration-500 ${image ? 'border-gray-100 bg-white shadow-lg' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                    {result ? (
                        <img src={result} className="w-full h-full object-contain animate-fadeIn" />
                    ) : image ? (
                        <img src={image.url} className="w-full h-full object-contain animate-fadeIn p-4" />
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center p-8">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
                                <UploadIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Upload Your Subject</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse gallery</p>
                            </div>
                        </div>
                    )}

                    {/* Overlays */}
                    {(isGenerating || isRefining) && (
                        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
                            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
                            <h3 className="text-xl font-black text-gray-900 mb-2">Pixa Agent Active</h3>
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] animate-pulse">{loadingText}</p>
                        </div>
                    )}

                    {(image || result) && !isGenerating && !isRefining && (
                        <div className="absolute top-6 right-6 z-40 flex flex-col gap-3">
                            <button onClick={() => { setImage(null); setResult(null); setStudioMode(null); }} className="p-3 bg-white/90 backdrop-blur-sm rounded-2xl text-gray-400 shadow-xl border border-gray-100 active:scale-90">
                                <XIcon className="w-5 h-5" />
                            </button>
                            {result && (
                                <button onClick={() => setIsRefineOpen(true)} className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl active:scale-90">
                                    <MagicWandIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Control Deck - Mirrors Desktop Layout */}
            <div className="px-6 pb-12 space-y-8 animate-fadeIn">
                {!image && (
                    <div className="text-center py-10 opacity-30 select-none">
                        <InformationCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Awaiting production asset</p>
                    </div>
                )}

                {image && !studioMode && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">1</span>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Select Production Mode</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <button onClick={() => handleModeSelect('product')} className="group relative flex items-center justify-between p-6 bg-gradient-to-br from-blue-50 to-white rounded-[2rem] border border-blue-100 text-left shadow-sm active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center text-blue-600">
                                        <CubeIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight">Product Shot</h4>
                                        <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Studio Setup</p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-5 h-5 text-blue-300 group-active:translate-x-1 transition-transform" />
                            </button>

                            <button onClick={() => handleModeSelect('model')} className="group relative flex items-center justify-between p-6 bg-gradient-to-br from-purple-50 to-white rounded-[2rem] border border-purple-100 text-left shadow-sm active:scale-[0.98] transition-all">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-purple-100 flex items-center justify-center text-purple-600">
                                        <UsersIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight">Model Shot</h4>
                                        <p className="text-xs text-purple-600 font-bold uppercase tracking-widest">Lifestyle Context</p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-5 h-5 text-purple-300 group-active:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}

                {image && studioMode && (
                    <div className="space-y-8 animate-fadeIn">
                        <button onClick={() => setStudioMode(null)} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest">
                            <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                        </button>

                        {isAnalyzing ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-gray-50 rounded-3xl animate-pulse border border-gray-100">
                                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pixa Vision Analysis Active...</p>
                            </div>
                        ) : (
                            <>
                                {/* AI Suggested Blueprints */}
                                {(suggestedPrompts.length > 0 || suggestedModelPrompts.length > 0) && (
                                    <div className="animate-fadeIn">
                                        <div className="flex justify-between items-center mb-4 ml-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Recommendations</label>
                                            {selectedPrompt && <button onClick={() => setSelectedPrompt(null)} className="text-[10px] font-bold text-red-500">Reset</button>}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {(studioMode === 'product' ? suggestedPrompts : suggestedModelPrompts).map((p: any, i) => {
                                                const prompt = studioMode === 'product' ? p : p.prompt;
                                                const label = studioMode === 'product' ? p : p.display;
                                                const isSelected = selectedPrompt === prompt;
                                                return (
                                                    <button 
                                                        key={i}
                                                        onClick={() => setSelectedPrompt(isSelected ? null : prompt)}
                                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-600 border-gray-200'}`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="h-px bg-gray-100"></div>

                                {/* Manual Grids */}
                                <div className={`space-y-8 ${selectedPrompt ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                    {studioMode === 'product' ? (
                                        <>
                                            <SelectionGrid label="1. Category" options={CATEGORIES} value={category} onChange={setCategory} />
                                            {category === 'Other / Custom' && (
                                                <InputField label="Custom Product Name" value={customCategory} onChange={(e: any) => setCustomCategory(e.target.value)} />
                                            )}
                                            <SelectionGrid label="2. Brand Style" options={BRAND_STYLES} value={brandStyle} onChange={setBrandStyle} />
                                            <SelectionGrid label="3. Visual Theme" options={VISUAL_THEMES} value={visualType} onChange={setVisualType} />
                                        </>
                                    ) : (
                                        <>
                                            <SelectionGrid label="1. Persona" options={MODEL_TYPES} value={modelType} onChange={setModelType} />
                                            <SelectionGrid label="2. Regional Identity" options={MODEL_REGIONS} value={modelRegion} onChange={setModelRegion} />
                                            <SelectionGrid label="3. Skin Tone" options={SKIN_TONES} value={skinTone} onChange={setSkinTone} />
                                            <SelectionGrid label="4. Shot Composition" options={COMPOSITION_TYPES} value={composition} onChange={setComposition} />
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Fixed Bottom Action (Production Trigger) */}
            <div className="fixed bottom-24 left-0 right-0 px-6 z-50 pointer-events-none">
                <button 
                    onClick={handleGenerate}
                    disabled={!canGenerate || isGenerating || isRefining}
                    className={`pointer-events-auto w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 ${
                        !canGenerate || isGenerating || isRefining ? 'bg-gray-200 text-gray-400 grayscale' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30'
                    }`}
                >
                    {isGenerating ? 'Rendering...' : isRefining ? 'Refining...' : 'Render Masterpiece'}
                    <SparklesIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Refinement Bottom Sheet */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="Master Refinement">
                <div className="space-y-6">
                    <p className="text-xs text-gray-500 font-medium leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                        Describe specific additions or tweaks. Our Elite Retoucher engine will rework the scene pixels precisely.
                    </p>
                    <textarea 
                        value={refineText}
                        onChange={e => setRefineText(e.target.value)}
                        className="w-full p-5 bg-white border-2 border-gray-100 rounded-3xl text-sm font-bold focus:border-indigo-500 outline-none h-40 shadow-inner"
                        placeholder="e.g. Add luxury water droplets to the bottle surface..."
                        autoFocus
                    />
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <CreditCoinIcon className="w-4 h-4 text-yellow-500" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{refineCost} Credits</span>
                        </div>
                        <button 
                            onClick={handleRefine}
                            disabled={!refineText.trim()}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-30 transition-all"
                        >
                            Apply Refinement
                        </button>
                    </div>
                </div>
            </MobileSheet>

            {/* Native Inputs */}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

        </div>
    );
};
