import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, View, Creation } from '../../types';
import { 
    FlagIcon, UploadIcon, SparklesIcon, XIcon, CheckIcon, 
    DownloadIcon, CreditCoinIcon, RefreshIcon, ShieldCheckIcon
} from '../../components/icons';
import { fileToBase64, base64ToBlobUrl, downloadImage } from '../../utils/imageUtils';
import { executeDailyMission } from '../../services/missionService';
import { saveCreation, completeDailyMission, getCreations } from '../../firebase';
import { getDailyMission, isMissionLocked } from '../../utils/dailyMissions';
import { ImageModal } from '../../components/FeatureLayout';

export const MobileDailyMission: React.FC<{ auth: AuthProps; onGenerationStart: () => void; setActiveTab: (tab: View) => void; }> = ({ auth, onGenerationStart, setActiveTab }) => {
    const [image, setImage] = useState<{ url: string; base64: any } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progressPercent, setProgressPercent] = useState(0);
    const [loadingText, setLoadingText] = useState("Analyzing...");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isFetchingTrophy, setIsFetchingTrophy] = useState(false);
    const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mission = getDailyMission();
    const isLocked = isMissionLocked(auth.user);

    // --- TROPHY STATE LOGIC ---
    useEffect(() => {
        const fetchTrophyImage = async () => {
            if (isLocked && !result && !image && auth.user) {
                setIsFetchingTrophy(true);
                try {
                    const creations = await getCreations(auth.user.uid) as Creation[];
                    const missionAsset = creations.find(c => 
                        c.feature.includes("Mission:") || 
                        c.feature.includes("Daily Mission")
                    );
                    if (missionAsset) {
                        setResult(missionAsset.imageUrl);
                    }
                } catch (e) {
                    console.error("Failed to fetch trophy image:", e);
                } finally {
                    setIsFetchingTrophy(false);
                }
            }
        };

        fetchTrophyImage();
    }, [isLocked, auth.user?.uid]);

    // Progress Animation Sync
    useEffect(() => {
        let interval: any;
        if (isGenerating) {
            setProgressPercent(0);
            const steps = [
                "Pixa Vision: Auditing mission objective...",
                "Neural Core: Aligning tactical physics...",
                "Production Engine: Rendering high-pass assets...",
                "Finalizing: Polishing reward bounty..."
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
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);

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
        if (!image || !auth.user || isGenerating || isLocked) return;

        onGenerationStart();
        setIsGenerating(true);
        try {
            const resB64 = await executeDailyMission(image.base64.base64, image.base64.mimeType, mission.config);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            setResult(blobUrl);
            
            const updatedUser = await completeDailyMission(auth.user.uid, mission.reward, mission.id);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            const id = await saveCreation(auth.user.uid, `data:image/png;base64,${resB64}`, `Daily Mission: ${mission.title}`);
            setLastCreationId(id);
            
            setIsGenerating(false);
            setShowSuccess(true);
        } catch (e) {
            console.error(e);
            alert("Mission failed. Please try again.");
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setImage(null);
        setResult(null);
        setLastCreationId(null);
    };

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden relative">
            {/* 1. Header: Identity + Commands */}
            <div className="flex-none flex flex-col bg-white z-50">
                <div className="pt-4 pb-1 flex justify-center items-center gap-2">
                    <FlagIcon className="w-5 h-5 text-black shrink-0" />
                    <span className="text-sm font-black uppercase tracking-tighter text-black">
                        Daily Mission
                    </span>
                </div>

                <div className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {!result && !isGenerating && (
                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 animate-fadeIn shadow-sm">
                                <CreditCoinIcon className="w-4 h-4 text-indigo-600" />
                                <span className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Sponsored</span>
                            </div>
                        )}
                        {isLocked && !isGenerating && !image && (
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100 animate-fadeIn shadow-sm">
                                <ShieldCheckIcon className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-[9px] font-black text-green-900 uppercase tracking-widest">Completed</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {result && !isGenerating ? (
                            <button 
                                onClick={() => downloadImage(result, 'mission-reward.png')}
                                className="p-2.5 bg-white rounded-full shadow-lg border border-gray-100 text-gray-700 animate-fadeIn"
                            >
                                <DownloadIcon className="w-5 h-5" />
                            </button>
                        ) : !result && (
                            <button 
                                onClick={handleExecute}
                                disabled={!image || isGenerating || isLocked}
                                className={`px-10 py-3.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all shadow-xl ${
                                    !image || isGenerating || isLocked
                                    ? 'bg-gray-100 text-gray-400 grayscale cursor-not-allowed'
                                    : 'bg-[#F9D230] text-[#1A1A1E] shadow-yellow-500/30 scale-105 active:scale-95'
                                }`}
                            >
                                {isLocked ? 'Finished' : isGenerating ? 'In Progress' : 'Launch'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Stage: Large Center Canvas (Expanded) */}
            <div className="relative flex-grow w-full flex items-center justify-center p-6 select-none overflow-hidden pb-4">
                <div className={`w-full h-full rounded-[2.5rem] overflow-hidden transition-all duration-700 flex items-center justify-center relative ${image || result ? 'bg-white shadow-2xl border border-gray-100' : 'bg-gray-50'}`}>
                    <div className="relative w-full h-full flex flex-col items-center justify-center rounded-[2.5rem] overflow-hidden z-10">
                        {result && !isGenerating ? (
                            <img 
                                src={result} 
                                onClick={() => !isGenerating && setIsFullScreenOpen(true)}
                                className="max-w-full max-h-full object-contain animate-materialize cursor-zoom-in" 
                            />
                        ) : isGenerating ? (
                             // Canvas disappears during generation as requested
                             null
                        ) : isFetchingTrophy ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Retrieving Asset...</span>
                            </div>
                        ) : image ? (
                            <img src={image.url} className="max-w-[85%] max-h-[85%] object-contain animate-fadeIn" />
                        ) : (
                            <div onClick={() => fileInputRef.current?.click()} className="text-center active:scale-95 transition-all">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-gray-100">
                                    <UploadIcon className="w-8 h-8 text-indigo-200" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Upload Asset</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Tap to browse</p>
                            </div>
                        )}

                        {/* Neural Overlays */}
                        {isGenerating && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 px-10 animate-fadeIn">
                                <div className="bg-black/60 backdrop-blur-xl px-8 py-10 rounded-[3rem] border border-white/20 shadow-2xl w-full max-w-[280px] flex flex-col items-center gap-8 animate-breathe">
                                    <div className="relative w-20 h-20 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                                            <circle 
                                                cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="4" 
                                                className="text-indigo-500" 
                                                strokeDasharray={226.2} 
                                                strokeDashoffset={226.2 - (226.2 * (progressPercent / 100))} 
                                                strokeLinecap="round" 
                                            />
                                        </svg>
                                        <div className="absolute"><span className="text-[12px] font-mono font-black text-white">{Math.round(progressPercent)}%</span></div>
                                    </div>
                                    <div className="flex flex-col items-center gap-3 text-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] opacity-90">neural processing</span>
                                        <div className="h-px w-8 bg-indigo-500/50"></div>
                                        <span className="text-[9px] text-indigo-200/60 font-bold uppercase tracking-widest animate-pulse max-w-[180px] leading-relaxed">
                                            {loadingText}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {isGenerating && <div className="absolute inset-0 z-40 pointer-events-none"><div className="w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_#6366f1] absolute top-0 left-0 animate-neural-scan opacity-80"></div></div>}
                    </div>

                    {image && !result && !isGenerating && (
                        <button 
                            onClick={handleReset}
                            className="absolute top-4 right-4 z-[60] bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-white/50 flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                            <RefreshIcon className="w-3.5 h-3.5 text-gray-700" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-700">Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 3. Controller: Compact Briefing Tray */}
            <div className="flex-none flex flex-col bg-[#1A1A1E] text-white rounded-t-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <FlagIcon className="w-5 h-5 text-yellow-400" />
                        </div>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Objective Briefing</h3>
                    </div>
                    {isLocked && (
                        <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            <CheckIcon className="w-3 h-3 text-green-500" />
                            <span className="text-[9px] font-bold text-green-500 tracking-wider uppercase">Fulfilled</span>
                        </div>
                    )}
                </div>

                <div className="mb-2">
                    <h2 className="text-2xl font-black mb-3 tracking-tight">{mission.title}</h2>
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                        {mission.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-yellow-400/80">
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-[11px] font-black uppercase tracking-widest">Bounty: +{mission.reward} Credits</span>
                    </div>
                </div>
            </div>

            {/* Success Portal */}
            {showSuccess && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setShowSuccess(false)}>
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-1 rounded-[3rem] shadow-2xl scale-100 animate-bounce-slight" onClick={e => e.stopPropagation()}>
                        <div className="bg-white rounded-[2.8rem] p-10 flex flex-col items-center text-center gap-6 max-w-[320px]">
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center shadow-inner">
                                <CheckIcon className="w-10 h-10 text-green-500" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Mission Success!</h2>
                                <p className="text-sm text-gray-500 mt-1">Your reward of <span className="font-bold text-indigo-600">+{mission.reward} Credits</span> has been deposited.</p>
                            </div>
                            <button 
                                onClick={() => setShowSuccess(false)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Viewer */}
            {isFullScreenOpen && result && (
                <ImageModal 
                    imageUrl={result} 
                    onClose={() => setIsFullScreenOpen(false)}
                    onDownload={() => downloadImage(result, 'mission-reward.png')}
                />
            )}

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />

            <style>{`
                @keyframes neural-scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
                .animate-neural-scan { animation: neural-scan 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(255, 255, 255, 0.2); } 50% { transform: scale(1.02); border-color: rgba(255, 255, 255, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
                @keyframes materialize { 0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } }
                .animate-materialize { animation: materialize 1.2s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
            `}</style>
        </div>
    );
};