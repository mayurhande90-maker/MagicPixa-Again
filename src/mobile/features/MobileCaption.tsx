
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    PixaCaptionIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    CopyIcon, ArrowLeftIcon, ImageIcon, CameraIcon, GlobeIcon,
    ArrowRightIcon, MagicWandIcon, InformationCircleIcon,
    CreditCoinIcon, PlusIcon, RegenerateIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, downloadImage, Base64File } from '../../utils/imageUtils';
import { generateCaptions } from '../../services/captionService';
import { deductCredits, saveCreation } from '../../firebase';

// --- CONFIGURATION ---

const CAPTION_STEPS = [
    { id: 'language', label: 'Language', options: ['English', 'Hindi', 'Marathi'] },
    { id: 'asset', label: 'Photo' },
    { id: 'tone', label: 'Tone', options: ['Friendly', 'Funny', 'Chill', 'Heartfelt', 'Hype', 'Professional', 'Marketing'] },
    { id: 'style', label: 'Style', options: ['SEO Friendly', 'Long Story', 'Short Punchy'] }
];

const TONE_ICONS: Record<string, string> = {
    'Friendly': '😊',
    'Funny': '😂',
    'Chill': '😎',
    'Heartfelt': '❤️',
    'Hype': '🔥',
    'Professional': '💼',
    'Marketing': '📈'
};

// --- COMPONENTS ---

const CaptionResultCard: React.FC<{ 
    item: { caption: string; hashtags: string }; 
    index: number;
    onCopy: (text: string, idx: number) => void;
    copiedIndex: number | null;
}> = ({ item, index, onCopy, copiedIndex }) => {
    const isCopied = copiedIndex === index;
    return (
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-4 animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600">
                        {index + 1}
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Option</span>
                </div>
                <button 
                    onClick={() => onCopy(`${item.caption}\n\n${item.hashtags}`, index)}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isCopied ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'}`}
                >
                    {isCopied ? <><CheckIcon className="w-3 h-3" /> Copied</> : <><CopyIcon className="w-3 h-3" /> Copy</>}
                </button>
            </div>
            <p className="text-sm font-medium text-gray-800 leading-relaxed mb-3">
                {item.caption}
            </p>
            <div className="pt-3 border-t border-gray-50">
                <p className="text-[11px] font-mono text-indigo-500 leading-relaxed">
                    {item.hashtags}
                </p>
            </div>
        </div>
    );
};

export const MobileCaption: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; }> = ({ auth, appConfig, onGenerationStart }) => {
    // --- STATE ---
    const [currentStep, setCurrentStep] = useState(0);
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [language, setLanguage] = useState('English');
    const [tone, setTone] = useState('');
    const [style, setStyle] = useState('');
    
    const [results, setResults] = useState<{ caption: string; hashtags: string }[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cost = appConfig?.featureCosts?.['Pixa Caption Pro'] || 2;

    // --- LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!language;
        if (idx === 2) return !!image;
        if (idx === 3) return !!tone;
        return false;
    };

    const isStrategyComplete = useMemo(() => {
        return !!language && !!image && !!tone && !!style;
    }, [language, image, tone, style]);

    // Progress Animation
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Pixa Vision: Extracting visual empathy...", 
                "Social Architect: Scrubbing viral hooks...", 
                "Data Lab: Analyzing SEO engagement...", 
                "Copy Deck: Synthesizing human tone...", 
                "Finalizing: Formatting reach-ready packs..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 8), 98);
                });
            }, 1200);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Auto-advance for Asset
    useEffect(() => {
        if (currentStep === 1 && image) {
            setTimeout(() => setCurrentStep(2), 600);
        }
    }, [image, currentStep]);

    // --- HANDLERS ---

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResults([]);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !tone || !style || !auth.user || isGenerating) return;
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const captions = await generateCaptions(
                image.base64.base64, 
                image.base64.mimeType, 
                language, 
                tone, 
                style as any, 
                auth.activeBrandKit
            );
            setResults(captions);
            setIsGenerating(false);

            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Caption Pro (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

            // Note: Captions aren't currently "saved" to gallery as images are, but we can log usage
        } catch (e) {
            alert("Generation failed. Please try again.");
            setIsGenerating(false);
        }
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleNewProject = () => {
        setResults([]); setImage(null); setTone(''); setStyle('');
        setCurrentStep(0);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (results.length > 0) setResults([]);
        else if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    // --- RENDERERS ---

    const renderStepContent = (stepId: string) => {
        const activeStep = CAPTION_STEPS[currentStep];
        
        switch (stepId) {
            case 'language':
            case 'tone':
            case 'style':
                return (
                    <div className="w-full flex gap-2.5 overflow-x-auto no-scrollbar px-6 py-2 animate-fadeIn">
                        {activeStep.options?.map(opt => {
                            const isSelected = (stepId === 'language' && language === opt) || 
                                             (stepId === 'tone' && tone === opt) ||
                                             (stepId === 'style' && (style === opt || (style === 'SEO Friendly' && opt === 'SEO Friendly') || (style === 'Long Story' && opt === 'Long Story') || (style === 'Short Punchy' && opt === 'Short Punchy')));
                            
                            return (
                                <button 
                                    key={opt} 
                                    onClick={() => {
                                        if (stepId === 'language') setLanguage(opt);
                                        else if (stepId === 'tone') setTone(opt);
                                        else if (stepId === 'style') setStyle(opt);
                                        
                                        if (currentStep < CAPTION_STEPS.length - 1) {
                                            setTimeout(() => setCurrentStep(prev => prev + 1), 150);
                                        }
                                    }} 
                                    className={`shrink-0 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-500 border-slate-100 shadow-sm'}`}
                                >
                                    {stepId === 'tone' && <span className="mr-2">{TONE_ICONS[opt]}</span>}
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'asset':
                return (
                    <div className="w-full px-6 flex flex-col gap-2 animate-fadeIn py-2 items-center text-center">
                        <div className={`p-4 rounded-2xl border flex items-center justify-center gap-3 w-full max-w-[280px] transition-colors ${image ? 'bg-green-50 border-green-100 text-green-700' : 'bg-indigo-50 border-indigo-100 text-indigo-900'}`}>
                            {image ? <CheckIcon className="w-4 h-4" /> : <InformationCircleIcon className="w-4 h-4" />}
                            <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                {image ? 'Photo Analyzed' : 'Tap canvas to upload'}
                            </p>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Header Command Bar */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50 relative">
                <div className="flex items-center gap-2 z-10">
                    <button onClick={handleBack} className={`p-2 rounded-full transition-all ${((image && currentStep > 0) || results.length > 0) && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}>
                        <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                    {(image || results.length > 0) && !isGenerating && (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn">
                            <CreditCoinIcon className="w-3.5 h-3.5 text-indigo-600" />
                            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{cost} Credits</span>
                        </div>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Caption Pro</span>
                </div>

                <div className="flex items-center gap-3 z-10">
                    {results.length > 0 && !isGenerating ? (
                        <button onClick={handleNewProject} className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"><PlusIcon className="w-5 h-5" /></button>
                    ) : (
                        <button 
                            onClick={handleGenerate} 
                            disabled={!isStrategyComplete || isGenerating} 
                            className={`px-10 py-3.5 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${!isStrategyComplete || isGenerating ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed' : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'}`}
                        >
                            {isGenerating ? 'Analyzing...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Stage Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${image ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {results.length > 0 ? (
                            <div className="w-full h-full overflow-y-auto px-6 pt-10 pb-20 custom-scrollbar animate-fadeIn">
                                {results.map((item, i) => (
                                    <CaptionResultCard key={i} item={item} index={i} onCopy={handleCopy} copiedIndex={copiedIndex} />
                                ))}
                            </div>
                        ) : (currentStep === 0 && !image) ? (
                            <div className="text-center animate-fadeIn px-8">
                                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6"><PixaCaptionIcon className="w-10 h-10 text-indigo-400" /></div>
                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-tight">Copy Hub</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2 text-center">Pick language below to start</p>
                            </div>
                        ) : (
                            <button onClick={() => !isGenerating && fileInputRef.current?.click()} className={`w-[85%] aspect-square border-2 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden ${image ? 'border-indigo-500 bg-indigo-50/20 shadow-sm' : 'border-gray-200 border-dashed bg-white active:bg-gray-50'}`}>
                                {image ? (
                                    <>
                                        <img src={image.url} className={`w-full h-full object-cover rounded-[2.3rem] transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95 grayscale' : ''}`} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-indigo-600">Scan Ready</div>
                                    </>
                                ) : (
                                    <><ImageIcon className="w-10 h-10 text-gray-200"/><span className="text-[10px] font-black text-gray-300 tracking-[0.2em] text-center px-6">UPLOAD PHOTO TO SCAN</span></>
                                )}
                            </button>
                        )}

                        {isGenerating && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90"><circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-600" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" /></svg>
                                        <div className="absolute"><span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span></div>
                                    </div>
                                    <div className="text-center"><span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Social Architect</span><div className="h-px w-8 bg-indigo-500/50 mx-auto my-3" /><span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">{loadingText}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Controller Tray */}
            <div className="flex-none flex flex-col bg-white overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {results.length > 0 ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <button onClick={handleGenerate} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"><RegenerateIcon className="w-5 h-5" /> Regenerate Mix</button>
                            <button onClick={handleNewProject} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all"><PlusIcon className="w-4 h-4" /> Start New Photo</button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {CAPTION_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>
                            <div className="px-4 pt-4 pb-6 border-t border-gray-100 bg-white">
                                <div className="flex items-center justify-between gap-1">
                                    {CAPTION_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!language) || (idx === 1 && !!image) || (idx === 2 && !!tone) || (idx === 3 && !!style);
                                        
                                        return (
                                            <button key={step.id} onClick={() => isAccessible && setCurrentStep(idx)} disabled={!isAccessible} className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed'}`}>
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : isAccessible ? 'text-gray-400' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : isAccessible ? 'bg-gray-200' : 'bg-gray-100'}`}></div>
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {idx === 0 ? language : idx === 2 ? tone : idx === 3 ? style : 'Ready'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileCaption;
