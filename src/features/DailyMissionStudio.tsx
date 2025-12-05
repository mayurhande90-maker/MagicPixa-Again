
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, Page, View } from '../types';
import { 
    FeatureLayout, 
    UploadPlaceholder
} from '../components/FeatureLayout';
import { 
    saveCreation, 
    completeDailyMission
} from '../firebase';
import { executeDailyMission } from '../services/missionService';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { getDailyMission, isMissionLocked } from '../utils/dailyMissions';
import { 
    UploadIcon, 
    FlagIcon,
    CheckIcon,
    SparklesIcon
} from '../components/icons';

// --- Mission Success Modal ---
const MissionSuccessModal: React.FC<{ reward: number; onClose: () => void }> = ({ reward, onClose }) => {
    const [isClaimed, setIsClaimed] = useState(false);

    const handleClaim = () => {
        setIsClaimed(true);
        setTimeout(() => {
            onClose();
        }, 2500);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
             <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white border border-white/10" onClick={e => e.stopPropagation()}>
                 {!isClaimed ? (
                     <div className="animate-fadeIn">
                         <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                             <CheckIcon className="w-10 h-10 text-white" />
                         </div>
                         
                         <h2 className="text-2xl font-bold mt-4 mb-2">Mission Complete!</h2>
                         <p className="text-indigo-100 mb-6 text-sm leading-relaxed">You've successfully completed the daily challenge.</p>
                         
                         <div className="bg-white/20 backdrop-blur-md text-white font-black text-4xl py-6 rounded-2xl mb-6 border border-white/30 shadow-inner">
                             +{reward} <span className="text-lg font-bold opacity-80">Credits</span>
                         </div>
                         
                         <button 
                            onClick={handleClaim} 
                            className="w-full bg-white text-indigo-600 font-bold py-3.5 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:scale-[1.02] active:scale-95"
                         >
                             Claim Reward
                         </button>
                     </div>
                 ) : (
                     <div className="animate-[fadeInUp_0.5s_ease-out] py-4">
                         <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_#22c55e] animate-[bounce_1s_infinite]">
                             <CheckIcon className="w-12 h-12 text-white" />
                         </div>
                         
                         <h2 className="text-3xl font-bold mb-2 text-white">Credited!</h2>
                         <p className="text-indigo-200 text-sm mb-6">Come back tomorrow for a new mission.</p>
                     </div>
                 )}
             </div>
        </div>
    );
};

export const DailyMissionStudio: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mission = getDailyMission();
    const isLocked = isMissionLocked(auth.user);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleExecute = async () => {
        if (!image || !auth.user) return;
        if (isLocked) {
            alert("You have already completed the daily mission today. Come back tomorrow!");
            return;
        }

        setLoading(true);
        try {
            const res = await executeDailyMission(image.base64.base64, image.base64.mimeType, mission.config);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            await saveCreation(auth.user.uid, dataUri, `Mission: ${mission.title}`);
            
            // Mark complete and grant reward
            const updatedUser = await completeDailyMission(auth.user.uid, mission.reward, mission.id);
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            setShowSuccess(true);
        } catch (e) {
            console.error(e);
            alert("Mission failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FeatureLayout
                title="Daily Mission"
                description="Complete the daily challenge to earn free credits."
                icon={<FlagIcon className="w-6 h-6 text-indigo-500" />}
                creditCost={0}
                isGenerating={loading}
                canGenerate={!!image && !isLocked}
                onGenerate={handleExecute}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={() => { setImage(null); setResult(null); }}
                resultHeightClass="h-[600px]"
                hideGenerateButton={isLocked}
                generateButtonStyle={{
                    className: "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg border-none hover:scale-[1.02]",
                    hideIcon: false,
                    label: "Complete Mission"
                }}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4">
                            <img src={image.url} className="max-w-full max-h-full rounded-xl shadow-md object-contain" alt="Source" />
                            {!loading && (
                                <button onClick={() => fileInputRef.current?.click()} className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:bg-gray-100">
                                    <UploadIcon className="w-5 h-5 text-gray-600" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <UploadPlaceholder label="Upload Photo" onClick={() => fileInputRef.current?.click()} />
                    )
                }
                rightContent={
                    <div className="h-full w-full relative overflow-hidden rounded-2xl bg-[#0f172a] shadow-2xl flex flex-col border border-slate-800">
                        {/* Animated Background Gradients */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none animate-pulse"></div>
                        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[80px] -ml-10 -mb-10 pointer-events-none"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full p-8 text-left">
                            
                            {/* Top Badge */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-amber-900 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                                    <SparklesIcon className="w-3 h-3" />
                                    Daily Challenge
                                </div>
                                {!isLocked && (
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-green-500 tracking-wider uppercase">Active</span>
                                    </div>
                                )}
                            </div>

                            {/* Typography */}
                            <div className="mb-6">
                                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4 tracking-tight drop-shadow-sm">
                                    {mission.title}
                                </h2>
                                <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6"></div>
                                <p className="text-slate-300 text-sm md:text-base leading-relaxed font-light border-l-2 border-slate-700 pl-4">
                                    {mission.description}
                                </p>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1"></div>

                            {/* Premium Reward Card */}
                            <div className="relative group mt-auto">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-600 to-amber-600 rounded-2xl opacity-30 group-hover:opacity-100 transition duration-500 blur-sm"></div>
                                <div className="relative flex items-center justify-between bg-[#131b2e]/90 backdrop-blur-xl rounded-xl p-5 border border-white/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                            <CheckIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Reward Bounty</p>
                                            <p className="text-white font-bold text-sm">Upon Completion</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                                                +{mission.reward}
                                            </span>
                                            <span className="text-xs font-bold text-yellow-500">CR</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
            {showSuccess && (
                <MissionSuccessModal 
                    reward={mission.reward} 
                    onClose={() => {
                        setShowSuccess(false);
                        navigateTo('dashboard', 'home_dashboard');
                    }} 
                />
            )}
        </>
    );
};
