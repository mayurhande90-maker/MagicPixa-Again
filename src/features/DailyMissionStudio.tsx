
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
import { fileToBase64, Base64File } from '../utils/imageUtils';
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
                         <p className="text-indigo-200 text-sm mb-6">Added to your account balance</p>
                         
                         <div className="scale-110 transition-transform duration-500 mt-4">
                             <div className="inline-block bg-white/20 backdrop-blur-md text-[#6EFACC] font-black text-5xl px-8 py-4 rounded-2xl border border-[#6EFACC]/50 shadow-[0_0_20px_rgba(110,250,204,0.4)]">
                                 +{reward}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
        </div>
    );
};

export const DailyMissionStudio: React.FC<{ 
    auth: AuthProps; 
    navigateTo: (page: Page, view?: View) => void; 
}> = ({ auth, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [showReward, setShowReward] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    
    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    const activeMission = getDailyMission();
    const hasCompletedRef = useRef(false);

    // STRICT PERSISTENCE: Use the helper that checks nextUnlock timestamp
    const isLocked = useMemo(() => isMissionLocked(auth.user), [auth.user]);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!auth.user?.dailyMission?.nextUnlock) return;
            
            const now = new Date();
            const nextReset = new Date(auth.user.dailyMission.nextUnlock);
            const diff = nextReset.getTime() - now.getTime();
            
            if (diff <= 0) {
                 setTimeLeft("Ready to start!");
                 return;
            }
            
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            
            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        };
        
        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [auth.user]);


    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            hasCompletedRef.current = false;
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        
        // Strict local check before even trying
        if (isMissionLocked(auth.user)) {
            alert("This mission is currently locked.");
            return;
        }

        setLoading(true);
        
        try {
            const res = await executeDailyMission(
                image.base64.base64, 
                image.base64.mimeType, 
                activeMission.config
            );

            const url = `data:image/png;base64,${res}`;
            setResult(url);

            // Only trigger credit grant if not already done in this session and not already locked
            if (!hasCompletedRef.current) {
                const updatedUser = await completeDailyMission(auth.user.uid, activeMission.reward, activeMission.title);
                
                // FORCE UPDATE LOCAL STATE to reflect new lock time immediately
                auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);

                setShowReward(true);
                hasCompletedRef.current = true;
            }
            
            saveCreation(auth.user.uid, url, `Daily Mission: ${activeMission.title}`);

        } catch (e: any) {
            console.error(e);
            if (e.message === "Mission locked" || e.message.includes("locked")) {
                 // If the server says it's locked, it implies the user has completed the mission (perhaps in another tab or previously).
                 const futureUnlock = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
                 
                 if (auth.user) {
                     auth.setUser({
                         ...auth.user,
                         dailyMission: {
                             ...(auth.user.dailyMission || { completedAt: new Date().toISOString(), lastMissionId: activeMission.id }),
                             nextUnlock: futureUnlock
                         }
                     });
                 }
                 setShowReward(true);
                 hasCompletedRef.current = true;
            } else {
                alert('Mission generation failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Render loading state while auth initializes
    if (!auth.user) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#4D7CFF] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // STRICT PERSISTENCE: If locked and NOT showing reward modal, show Locked Screen.
    if (isLocked && !showReward) {
         return (
             <div className="flex flex-col items-center justify-center h-full p-8 lg:p-16 max-w-4xl mx-auto animate-fadeIn">
                 <div className="bg-white p-12 rounded-3xl shadow-xl border border-green-100 text-center relative overflow-hidden w-full">
                     <div className="absolute top-0 left-0 w-full h-2 bg-green-500"></div>
                     <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                         <CheckIcon className="w-12 h-12 text-green-600" />
                     </div>
                     <h2 className="text-3xl font-bold text-[#1A1A1E] mb-2">Mission Accomplished!</h2>
                     <p className="text-gray-500 mb-8 text-lg">You've claimed your +{activeMission.reward} credits for this period.</p>
                     
                     <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 inline-block min-w-[300px]">
                         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Next Mission In</p>
                         <p className="text-4xl font-mono font-bold text-[#1A1A1E]">{timeLeft}</p>
                     </div>
                     
                     <div className="mt-8">
                         <button onClick={() => navigateTo('dashboard', 'home_dashboard')} className="text-[#4D7CFF] font-bold hover:underline">
                             Return to Dashboard
                         </button>
                     </div>
                 </div>
             </div>
         );
    }

    return (
        <>
            <FeatureLayout 
                title={`Daily Mission: ${activeMission.title}`}
                description={activeMission.description}
                icon={<FlagIcon className="w-6 h-6 text-yellow-500"/>}
                creditCost={0} // Always free/sponsored
                isGenerating={loading}
                canGenerate={!!image}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={() => { setImage(null); setResult(null); }}
                resultHeightClass="h-[650px]" 
                hideGenerateButton={true} // Custom button in right panel
                disableScroll={true} 
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                    <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                        <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                    </div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">Processing Mission...</p>
                                </div>
                            )}
                            <img 
                                src={image.url} 
                                className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                            />
                            {!loading && (
                                <button onClick={() => redoFileInputRef.current?.click()} className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40">
                                    <UploadIcon className="w-5 h-5"/>
                                </button>
                            )}
                            <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                            <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                        </div>
                    ) : (
                        <UploadPlaceholder label="Upload Photo to Start Mission" onClick={() => fileInputRef.current?.click()} />
                    )
                }
                rightContent={
                    <div className="h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2 space-y-4">
                            {/* Reward Banner */}
                            <div className="bg-gradient-to-br from-[#F9D230] to-[#F5A623] p-5 rounded-2xl text-[#1A1A1E] shadow-lg relative overflow-hidden transform transition-transform hover:scale-[1.01] shrink-0">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                                <h3 className="font-black text-xl mb-1 flex items-center gap-2">GET {activeMission.reward} CREDITS</h3>
                                <p className="font-bold text-xs opacity-80 mb-3">upon successful completion</p>
                                
                                <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm border border-white/10 text-[10px] font-bold">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px]">1</span>
                                        <span>Upload Photo</span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px]">2</span>
                                        <span>AI Transforms It</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[9px]">3</span>
                                        <span>Receive Reward</span>
                                    </div>
                                </div>
                            </div>

                            {/* Active Task Info */}
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col shrink-0">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Mission Briefing</h4>
                                <h3 className="text-lg font-bold text-[#1A1A1E] mb-2">{activeMission.title}</h3>
                                <p className="text-gray-500 text-xs leading-relaxed mb-4">{activeMission.description}</p>
                                
                                <div className="mt-auto pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 p-2.5 rounded-xl">
                                        <CheckIcon className="w-3.5 h-3.5"/>
                                        AI Settings Pre-Configured
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Fixed Bottom Section */}
                        <div className="mt-auto pt-4 border-t border-gray-200/50 shrink-0 z-10 bg-[#F6F7FA]">
                            <button 
                                onClick={handleGenerate} 
                                disabled={!image || loading}
                                className={`w-full py-3 rounded-2xl text-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 mb-2 ${
                                    !image 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                    : 'bg-[#1A1A1E] text-white hover:bg-black hover:scale-[1.02] shadow-black/20'
                                }`}
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <SparklesIcon className="w-5 h-5 text-[#F9D230]"/>
                                        Complete Mission
                                    </>
                                )}
                            </button>
                            <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest flex items-center justify-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Powered by MagicPixa
                            </p>
                        </div>
                    </div>
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {showReward && (
                <MissionSuccessModal 
                    reward={activeMission.reward} 
                    onClose={() => { 
                        setShowReward(false); 
                        navigateTo('dashboard', 'home_dashboard'); 
                    }} 
                />
            )}
        </>
    );
};
