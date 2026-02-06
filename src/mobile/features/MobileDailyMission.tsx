import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, View, Creation } from '../../types';
import { 
    FlagIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, RefreshIcon, InformationCircleIcon,
    CreditCoinIcon, LockIcon, PlusIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, downloadImage, Base64File } from '../../utils/imageUtils';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { executeDailyMission } from '../../services/missionService';
import { deductCredits, saveCreation, completeDailyMission } from '../../firebase';

const MISSION_STEPS = [
    { id: 'asset', label: 'Asset' },
    { id: 'brief', label: 'Brief' },
    { id: 'reward', label: 'Reward' }
];

export const MobileDailyMission: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; onGenerationStart: () => void; setActiveTab: (tab: View) => void; }> = ({ auth, appConfig, onGenerationStart, setActiveTab }) => {
    // --- 1. STATE ---
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [currentStep, setCurrentStep] = useState(0);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mission = getDailyMission();
    const isLocked = isMissionLocked(auth.user);

    // --- 2. LOGIC ---

    const isStepAccessible = (idx: number) => {
        if (idx === 0) return true;
        if (idx === 1) return !!image;
        if (idx === 2) return !!result;
        return false;
    };

    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Mission Logic: Validating source...",
                "Creative Rig: Applying daily directive...",
                "Neural Compute: Synthesizing pixels...",
                "Identity Guard: Locking subjects...",
                "Finalizing: Polishing reward asset..."
            ];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 6), 98);
                });
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

    useEffect(() => {
        if (currentStep === 0 && image) {
            setTimeout(() => setCurrentStep(1), 500);
        }
    }, [image, currentStep]);

    // --- 3. HANDLERS ---

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
        e.target.value = '';
    };

    const handleExecute = async () => {
        if (!image || !auth.user || isLocked) return;

        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await executeDailyMission(image.base64.base64, image.base64.mimeType, mission.config);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            setIsGenerating(false);
            setCurrentStep(2);

            const dataUri = `data:image/png;base64,${resB64}`;
            await saveCreation(auth.user.uid, dataUri, `Mission: ${mission.title}`);
            
            const updatedUser = await completeDailyMission(auth.user.uid, mission.reward, mission.id);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Mission failed. Please try a different photo.");
            setIsGenerating(false);
        }
    };

    const handleNewProject = () => {
        setImage(null);
        setResult(null);
        setCurrentStep(0);
    };

    // --- 4. RENDER HELPERS ---

    const renderStepContent = (stepId: string) => {
        switch (stepId) {
            case 'asset':
                return (
                    <div className="w-full px-6 flex flex-col items-center animate-fadeIn py-2">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center gap-4 w-full">
                            <UploadIcon className="w-6 h-6 text-indigo-400" />
                            <div>
                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Asset Required</p>
                                <p className="text-[9px] text-indigo-300/60 font-medium uppercase tracking-wider">Tap canvas to upload for mission</p>
                            </div>
                        </div>
                    </div>
                );
            case 'brief':
                return (
                    <div className="w-full px-6 flex flex-col gap-3 animate-fadeIn py-2 items-center text-center">
                        <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 w-full">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target Directive</h4>
                            <p className="text-sm font-bold text-white leading-tight">{mission.title}</p>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-[280px]">
                            {mission.description}
                        </p>
                    </div>
                );
            case 'reward':
                return (
                    <div className="w-full px-6 flex flex-col items-center animate-fadeIn py-2 text-center">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-4 w-full justify-center">
                            <div className="p-2 bg-emerald-500 rounded-lg">
                                <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Mission Succeeded</p>
                                <p className="text-sm font-black text-white mt-1">+{mission.reward} Credits Earned</p>
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 overflow-hidden relative">
            {/* Header (Dark Themed) */}
            <div className="flex-none flex flex-col bg-gray-950 z-50">
                {/* Top Row: Identity */}
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <div className="p-1 bg-indigo-500/20 rounded-lg">
                        <FlagIcon className="w-4 h-4 text-indigo-400 shrink-0" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-tighter text-white">
                        Daily Mission
                    </span>
                </div>

                {/* Bottom Row: Commands */}
                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                         {!isGenerating && (
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 animate-fadeIn">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">{isLocked ? 'Claimed' : `+${mission.reward} Reward`}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button 
                                onClick={() => downloadImage(result, 'mission-reward.png')}
                                className="p-2.5 bg-gray-800 rounded-full shadow-lg border border-gray-700 text-gray-100 animate-fadeIn active:scale-95"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        ) : !result && (
                            <button 
                                onClick={handleExecute}
                                disabled={!image || isGenerating || isLocked}
                                className={`px-10 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                    !image || isGenerating || isLocked
                                    ? 'bg-gray-800 text-gray-500 grayscale'
                                    : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 animate-cta-pulse'
                                }`}
                            >
                                {isGenerating ? 'Logic Active' : 'Start Mission'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stage Area */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-10">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${image && !isGenerating ? 'bg-gray-900 border border-gray-800 shadow-2xl' : 'bg-gray-900/40'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className={`max-w-full max-h-full object-contain cursor-zoom-in transition-all duration-1000 ${isGenerating ? 'blur-xl grayscale opacity-30 scale-95' : 'animate-materialize'}`} 
                            />
                        ) : isGenerating ? (
                            null // Canvas disappears during generation as requested
                        ) : image ? (
                            <div className="relative w-full h-full flex items-center justify-center p-4">
                                <img src={image.url} className={`max-w-full max-h-full object-contain rounded-xl transition-all duration-700 ${isGenerating ? 'blur-md opacity-40 scale-95' : ''}`} />
                            </div>
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="text-center group active:scale-95 transition-all">
                                <div className="w-20 h-20 bg-gray-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-700 group-hover:bg-indigo-600 group-hover:border-indigo-500 transition-all">
                                    <FlagIcon className="w-10 h-10 text-indigo-400 group-hover:text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight leading-tight">Identity Pending</h3>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Tap to select asset</p>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none px-10 animate-fadeIn">
                                <div className="bg-black/80 backdrop-blur-2xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-indigo-50" strokeDasharray={226.2} strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} strokeLinecap="round" />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">Mission Logic</span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Floating Reset Button */}
                    {image && !result && !isGenerating && (
                        <button 
                            onClick={handleNewProject}
                            className="absolute top-4 right-4 z-[60] bg-gray-800/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-gray-700 flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-300" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Reset</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Controller Area */}
            <div className="flex-none flex flex-col bg-gray-950 overflow-hidden min-h-0">
                <div className={`flex flex-col transition-all duration-300 ${isGenerating ? 'pointer-events-none opacity-40 grayscale' : ''}`}>
                    {result ? (
                        <div className="p-6 animate-fadeIn flex flex-col gap-4">
                            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/20">
                                        <CheckIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Bounty Claimed</p>
                                        <p className="text-sm font-black text-white mt-0.5">+{mission.reward} CR Applied</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Next Unlock</p>
                                    <p className="text-[10px] font-bold text-indigo-400 mt-0.5">In 24 Hours</p>
                                </div>
                            </div>
                            <button onClick={handleNewProject} className="w-full py-4 bg-white/5 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 active:bg-white/10 transition-all">
                                <PlusIcon className="w-4 h-4" /> New Session
                            </button>
                        </div>
                    ) : isLocked ? (
                        <div className="p-6 animate-fadeIn bg-indigo-500/5 flex flex-col items-center gap-4 rounded-[2rem] border border-indigo-500/10 mx-6 mb-6">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-indigo-500/20 rounded-full text-indigo-400">
                                    <CheckIcon className="w-5 h-5" />
                                 </div>
                                 <div className="text-left">
                                    <p className="text-sm font-black text-white uppercase tracking-tight">Mission Accomplished</p>
                                    <p className="text-[10px] font-bold text-indigo-300/60 leading-relaxed">You've finished today's challenge. Come back tomorrow for a new mission and rewards!</p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => setActiveTab('creations')}
                                className="w-full py-4 bg-white text-[#1A1A1E] rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                             >
                                View My Creations
                             </button>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {/* Step Container */}
                            <div className="h-[140px] flex items-center relative overflow-hidden">
                                {MISSION_STEPS.map((step, idx) => (
                                    <div key={step.id} className={`absolute inset-0 flex flex-col justify-center transition-all duration-500 ${currentStep === idx ? 'opacity-100 translate-x-0' : currentStep > idx ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full'}`}>
                                        {renderStepContent(step.id)}
                                    </div>
                                ))}
                            </div>

                            {/* Progress Bar Nav */}
                            <div className="px-4 pt-4 pb-6 border-t border-white/5 bg-gray-950">
                                <div className="flex items-center justify-between gap-1">
                                    {MISSION_STEPS.map((step, idx) => {
                                        const isActive = currentStep === idx;
                                        const isAccessible = isStepAccessible(idx);
                                        const isFilled = (idx === 0 && !!image) || (idx === 1 && !!result) || (idx === 2 && isLocked);
                                        
                                        return (
                                            <button 
                                                key={step.id} 
                                                onClick={() => isAccessible && setCurrentStep(idx)} 
                                                disabled={!isAccessible}
                                                className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 transition-all ${isAccessible ? 'active:scale-95' : 'cursor-not-allowed opacity-30'}`}
                                            >
                                                <span className={`text-[8px] font-black uppercase tracking-widest transition-all truncate w-full text-center px-1 ${isActive ? 'text-indigo-400' : isAccessible ? 'text-gray-500' : 'text-gray-700'}`}>{step.label}</span>
                                                <div className={`h-1.5 w-full rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : isFilled ? 'bg-emerald-500' : isAccessible ? 'bg-gray-700' : 'bg-gray-800'}`}></div>
                                                <span className={`text-[7px] font-black h-3 transition-opacity truncate w-full text-center px-1 uppercase tracking-tighter ${isFilled ? 'opacity-100 text-indigo-400' : 'opacity-0'}`}>
                                                    Ready
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

            {isFullScreenOpen && result && (
                <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsFullScreenOpen(false)}>
                    <button onClick={() => setIsFullScreenOpen(false)} className="absolute top-10 right-6 p-3 bg-white/10 text-white rounded-full backdrop-blur-md border border-white/10"><XIcon className="w-6 h-6" /></button>
                    <img src={result} className="max-w-full max-h-full object-contain rounded-lg animate-materialize shadow-2xl" />
                </div>
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default MobileDailyMission;
