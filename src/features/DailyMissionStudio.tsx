
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
                title={mission.title}
                description={mission.description}
                icon={<FlagIcon className="w-6 h-6 text-indigo-500" />}
                creditCost={0}
                isGenerating={loading}
                canGenerate={!!image && !isLocked}
                onGenerate={handleExecute}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={() => { setImage(null); setResult(null); }}
                resultHeightClass="h-[500px]"
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
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 h-full flex flex-col justify-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <SparklesIcon className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="font-bold text-indigo-900 mb-2">Mission Brief</h3>
                        <p className="text-sm text-indigo-700 leading-relaxed mb-6">
                            {mission.description}
                        </p>
                        <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100 inline-block mx-auto shadow-sm">
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">REWARD</p>
                            <p className="text-2xl font-black text-indigo-600">+{mission.reward} Credits</p>
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
    