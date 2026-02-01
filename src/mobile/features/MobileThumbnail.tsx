
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig } from '../../types';
import { 
    ThumbnailIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    ChevronRightIcon, DownloadIcon, RegenerateIcon, PlusIcon,
    ArrowLeftIcon, ImageIcon, CameraIcon, UserIcon, UsersIcon,
    ArrowRightIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, urlToBase64, downloadImage } from '../../utils/imageUtils';
import { generateThumbnail } from '../../services/thumbnailService';
import { deductCredits, saveCreation } from '../../firebase';
import { MobileSheet } from '../components/MobileSheet';

const THUMBNAIL_STEPS = [
    { id: 'identity', label: 'Identity', instruction: 'What is the video about?' },
    { id: 'vibe', label: 'Vibe', options: ['Viral', 'Cinematic', 'Luxury/Premium', 'Minimalist/Clean', 'Gamer', 'Dark Mystery', 'Retro Style', 'Bright & Natural'] },
    { id: 'assets', label: 'Assets', instruction: 'Upload host and guests' }
];

// Custom Refine Icon
const CustomRefineIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
        <path fill="currentColor" d="M14 1.5a.5.5 0 0 0-1 0V2h-.5a.5.5 0 0 0 0 1h.5v.5a.5.5 0 0 0 1 0V3h.5a.5.5 0 0 0 0-1H14v-.5Zm-10 2a.5.5 0 0 0-1 0V4h-.5a.5.5 0 0 0 0 1H3v.5a.5.5 0 0 0 1 0V5h.5a.5.5 0 0 0 0-1H4v-.5Zm9 8a.5.5 0 0 1-.5.5H12v.5a.5.5 0 0 1-1 0V12h-.5a.5.5 0 0 1 0-1h.5v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 .5.5ZM8.73 4.563a1.914 1.914 0 0 1 2.707 2.708l-.48.48L8.25 5.042l.48-.48ZM7.543 5.75l2.707 2.707l-5.983 5.983a1.914 1.914 0 0 1-2.707-2.707L7.543 5.75Z"/>
    </svg>
);

interface MobileThumbnailProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onGenerationStart: () => void;
}

export const MobileThumbnail: React.FC<MobileThumbnailProps> = ({ auth, appConfig, onGenerationStart }) => {
    // --- UI State ---
    const [format, setFormat] = useState<'landscape' | 'portrait' | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Researching...");
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    // --- Config State ---
    const [currentStep, setCurrentStep] = useState(0);
    const [title, setTitle] = useState('');
    const [mood, setMood] = useState('Viral');
    const [hostImg, setHostImg] = useState<{ url: string; base64: any } | null>(null);
    const [guestImg, setGuestImg] = useState<{ url: string; base64: any } | null>(null);
    const [refImg, setRefImg] = useState<{ url: string; base64: any } | null>(null);

    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [refineText, setRefineText] = useState('');

    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;
    const scrollRef = useRef<HTMLDivElement>(null);

    const isStrategyComplete = useMemo(() => {
        return format && title.trim().length > 3 && mood && (hostImg || refImg);
    }, [format, title, mood, hostImg, refImg]);

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "CTR Analytics: Researching trending hooks...",
                "Creative Engine: Designing visual hierarchy...",
                "Pixel Forge: Sharpening host identity...",
                "Vibe Sync: Applying cinematic grading...",
                "Finalizing: Exporting high-contrast hook..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 5), 98);
                });
            }, 1600);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!isStrategyComplete || !auth.user || isGenerating) return;
        
        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await generateThumbnail({
                format: format!,
                category: 'Viral Content',
                mood: mood,
                title: title,
                subjectImage: hostImg?.base64,
                guestImage: guestImg?.base64,
                referenceImage: refImg?.base64,
                requestId: Math.random().toString(36).substring(7)
            }, auth.activeBrandKit);

            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);

            await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail (Mobile)');
            await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, 'Pixa Thumbnail Pro');
        } catch (e) {
            console.error(e);
            alert("Thumbnail generation failed.");
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setResult(null);
        setFormat(null);
        setTitle('');
        setMood('Viral');
        setHostImg(null);
        setGuestImg(null);
        setRefImg(null);
        setCurrentStep(0);
    };

    const handleBack = () => {
        if (isGenerating) return;
        if (result) {
            setResult(null);
        } else if (format) {
            if (currentStep > 0) {
                setCurrentStep(prev => prev - 1);
            } else {
                setFormat(null);
            }
        }
    };

    const renderStepContent = (stepId: string) => {
        switch (stepId) {
            case 'identity':
                return (
                    <div className="w-full px-6 flex flex-col gap-4 animate-fadeIn">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Video Topic</label>
                        <textarea 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-3xl text-sm font-bold focus:border-indigo-500 outline-none shadow-inner resize-none h-28"
                            placeholder="e.g. I spent 24 hours in a haunted forest..."
                            autoFocus
                        />
                        <button 
                            disabled={title.trim().length < 5}
                            onClick={() => setCurrentStep(1)} 
                            className="self-end px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30 transition-all active:scale-95"
                        >
                            Next: Visual Vibe
                        </button>
                    </div>
                );
            case 'vibe':
                return (
                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar px-6 pb-2">
                        {THUMBNAIL_STEPS[1].options?.map(opt => {
                            const isSelected = mood === opt;
                            return (
                                <button 
                                    key={opt} 
                                    onClick={() => { setMood(opt); setTimeout(() => setCurrentStep(2), 200); }} 
                                    className={`shrink-0 px-6 py-4 rounded-2xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300'}`}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                );
            case 'assets':
                return (
                    <div className="w-full px-6 flex gap-4 overflow-x-auto no-scrollbar pb-2 animate-fadeIn">
                        <AssetUploader label="Host" img={hostImg} onUpload={handleUpload(setHostImg)} onClear={() => setHostImg(null)} icon={<UserIcon className="w-5 h-5"/>} />
                        <AssetUploader label="Guest" img={guestImg} onUpload={handleUpload(setGuestImg)} onClear={() => setGuestImg(null)} icon={<UsersIcon className="w-5 h-5"/>} />
                        <AssetUploader label="Reference" img={refImg} onUpload={handleUpload(setRefImg)} onClear={() => setRefImg(null)} icon={<ImageIcon className="w-5 h-5"/>} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* Top Bar */}
            <div className="flex-none px-6 py-4 flex items-center justify-between z-50">
                <button 
                    onClick={handleBack} 
                    className={`p-2 rounded-full transition-all ${format && !isGenerating ? 'bg-gray-100 text-gray-500 active:bg-gray-200' : 'opacity-0 pointer-events-none'}`}
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                    {result && !isGenerating ? (
                        <button 
                            onClick={() => downloadImage(result, 'thumbnail-pro.png')}
                            className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                        >
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                    ) : !result && (
                        <button 
                            onClick={handleGenerate}
                            disabled={!isStrategyComplete || isGenerating}
                            className={`px-10 py-3.5 rounded-full font-black text-[12px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                !isStrategyComplete || isGenerating
                                ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                            }`}
                        >
                            {isGenerating ? 'Drafting...' : 'Generate'}
                        </button>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div className="relative h-[60%] w-full flex items-center justify-center p-6 select-none">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${format ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50 border-2 border-dashed border-gray-200'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : format ? (
                            <div className="text-center opacity-20">
                                <ThumbnailIcon className="w-20 h-20 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest text-gray-900">{format} Canvas Ready</p>
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 gap-6 animate-fadeIn">
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Select Format</h3>
                                <div className="flex gap-4 w-full max-w-sm">
                                    <button onClick={() => setFormat('landscape')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
                                            <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider">Landscape</span>
                                    </button>
                                    <button onClick={() => setFormat('portrait')} className="flex-1 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center gap-3 active:scale-95 transition-all">
                                        <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center">
                                            <div className="w-4 h-6 border-2 border-current rounded-sm"></div>
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-gray-800 tracking-wider">Vertical</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Analysis Overlay */}
                        {isGenerating && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[300px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-500" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Hook Engine</span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse max-w-[180px] leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isGenerating && <div className="absolute inset-0 z-40 pointer-events-none"><div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1] absolute top-0 left-0 animate-neural-scan opacity-80"></div></div>}
                    </div>
                </div>
            </div>

            {/* Controls Tray */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className={`flex-1 flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="flex-1 flex flex-col items-center justify-center px-6 animate-fadeIn">
                            <div className="w-full flex flex-col gap-4">
                                <button onClick={() => setIsRefineOpen(true)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                                    <CustomRefineIcon className="w-5 h-5 text-white" />
                                    Iterate Design
                                </button>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button onClick={handleNewProject} className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-gray-100 flex items-center justify-center gap-2 active:bg-gray-100 transition-all">
                                        <PlusIcon className="w-4 h-4" /> New Hook
                                    </button>
                                    <button onClick={handleGenerate} className="py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2 active:bg-indigo-50 transition-all shadow-sm">
                                        <RegenerateIcon className="w-4 h-4" /> Regenerate
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={`flex-1 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${format ? 'translate-y-0' : 'translate-y-full'}`}>
                            <div className="flex-1 min-h-0 overflow-hidden relative">
                                {THUMBNAIL_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 px-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-y-0 pointer-events-auto' : currentStep > idx ? 'opacity-0 -translate-y-8 pointer-events-none' : 'opacity-0 translate-y-8 pointer-events-none'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>

                            {/* Nav Bar */}
                            <div className="flex-none px-4 py-6 border-t border-gray-50 bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center justify-between gap-1">
                                    {THUMBNAIL_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isFilled = idx === 0 ? title.trim().length > 3 : idx === 1 ? !!mood : (hostImg || refImg);
                                        return (
                                            <button key={step.id} onClick={() => setCurrentStep(idx)} className="flex flex-col items-center gap-2 group flex-1 min-w-0">
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-600' : 'text-gray-300'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : isFilled ? 'bg-indigo-200' : 'bg-gray-100'}`}></div>
                                                <span className={`text-[7px] font-bold h-3 transition-opacity truncate w-full text-center px-1 ${isFilled ? 'opacity-100 text-indigo-500' : 'opacity-0'}`}>
                                                    {idx === 0 ? title : idx === 1 ? mood : hostImg ? 'Ready' : ''}
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

            {/* Refinement Sheet */}
            <MobileSheet isOpen={isRefineOpen} onClose={() => setIsRefineOpen(false)} title="CTR Refinement">
                <div className="space-y-6 pb-6">
                    <textarea value={refineText} onChange={e => setRefineText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" placeholder="e.g. Make the text yellow and bigger, add more rim light..." />
                    <button onClick={() => { setIsGenerating(true); setIsRefineOpen(false); handleGenerate(); }} disabled={!refineText.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Apply Changes</button>
                </div>
            </MobileSheet>

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize" />
                </div>
            )}

            <style>{`
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

const AssetUploader = ({ label, img, onUpload, onClear, icon }: any) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div onClick={() => !img && inputRef.current?.click()} className={`shrink-0 w-32 aspect-[3/4] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 text-center relative overflow-hidden ${img ? 'border-indigo-100 bg-white' : 'border-gray-100 bg-gray-50'}`}>
            {img ? (
                <>
                    <img src={img.url} className="w-full h-full object-cover rounded-xl" />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-1 right-1 p-1 bg-white/90 rounded-lg shadow-sm text-gray-400"><XIcon className="w-3 h-3"/></button>
                </>
            ) : (
                <>
                    <div className="p-2 bg-white rounded-lg shadow-sm mb-2">{icon}</div>
                    <span className="text-[9px] font-black uppercase text-gray-400">{label}</span>
                    <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
                </>
            )}
        </div>
    );
};
