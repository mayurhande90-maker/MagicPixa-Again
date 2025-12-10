
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, Page, View } from '../types';
import { 
    FeatureLayout
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
    SparklesIcon,
    XIcon
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
    const [isDragging, setIsDragging] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const mission = getDailyMission();
    const isLocked = isMissionLocked(auth.user);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
            setLastCreationId(null);
        }
        e.target.value = '';
    };

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const base64 = await fileToBase64(file);
                setImage({ url: URL.createObjectURL(file), base64 });
                setResult(null);
                setLastCreationId(null);
            }
        }
    };

    const handleExecute = async () => {
        if (!image || !auth.user) return;
        if (isLocked) {
            alert("You have already completed the daily mission today. Come back tomorrow!");
            return;
        }

        setLoading(true);
        setLastCreationId(null);
        
        try {
            const res = await executeDailyMission(image.base64.base64, image.base64.mimeType, mission.config);
            const blobUrl = await base64ToBlobUrl(res, 'image/png');
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`;
            const creationId = await saveCreation(auth.user.uid, dataUri, `Mission: ${mission.title}`);
            setLastCreationId(creationId);
            
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
                creationId={lastCreationId}
                
                onResetResult={() => { setResult(null); setLastCreationId(null); }}
                onNewSession={() => { setImage(null); setResult(null); setLastCreationId(null); }}
                resultHeightClass="h-[600px]"
                hideGenerateButton={isLocked}
                // Redesigned Button: Premium Gold
                generateButtonStyle={{
                    className: "bg-gradient-to-r from-amber-400 to-yellow-600 text-[#0f172a] shadow-lg shadow-amber-500/20 border-none hover:scale-[1.02] font-black uppercase tracking-wider",
                    hideIcon: false,
                    label: "Complete Mission"
                }}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm group">
                            {/* Background Glow behind image - lighter */}
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-50 to-transparent opacity-50"></div>
                            
                            <img src={image.url} className="max-w-full max-h-full rounded-xl shadow-md object-contain relative z-10" alt="Source" />
                            
                            {!loading && (
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 transition-all z-20 group-hover:scale-110 text-gray-600"
                                    title="Change Photo"
                                >
                                    <UploadIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    ) : (
                        // Standardized Upload Placeholder (Product Studio Style)
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`w-full h-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                                isDragging 
                                ? 'border-indigo-500 bg-indigo-50/10' 
                                : 'border-gray-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'
                            }`}
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <FlagIcon className="w-12 h-12 text-indigo-400 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Mission Asset</p>
                                <div className="bg-gray-50 rounded-full px-3 py-1 inline-block border border-gray-200">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High quality image matching the mission.</p>
                            </div>
                            
                            {isDragging && (
                                <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none">
                                    <div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce">
                                        <p className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                                            <UploadIcon className="w-5 h-5"/> Drop to Upload!
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }
                rightContent={
                    <div className="h-full w-full relative overflow-hidden rounded-3xl bg-[#1A1A1E] shadow-2xl flex flex-col border border-gray-800">
                        {/* Animated Background Gradients - Dark Theme */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-500/10 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full p-8 text-left">
                            
                            {/* Top Badge */}
                            <div className="flex justify-between items-start mb-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <SparklesIcon className="w-3 h-3" />
                                    Daily Challenge
                                </div>
                                {!isLocked && (
                                    <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-green-400 tracking-wider uppercase">Active</span>
                                    </div>
                                )}
                            </div>

                            {/* Prominent Typography */}
                            <div className="mb-8">
                                <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] mb-6 tracking-tight drop-shadow-sm">
                                    {mission.title}
                                </h2>
                                <div className="w-20 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-8"></div>
                                
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                                    <p className="text-gray-300 text-lg leading-relaxed font-medium">
                                        {mission.description}
                                    </p>
                                </div>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1"></div>

                            {/* Premium Reward Card - Dark Version */}
                            <div className="relative group mt-auto">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur-sm"></div>
                                <div className="relative flex items-center justify-between bg-[#252529] rounded-xl p-6 border border-white/10 shadow-xl">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-inner transform group-hover:scale-110 transition-transform duration-300">
                                            <CheckIcon className="w-7 h-7 text-yellow-400" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reward Bounty</p>
                                            <p className="text-white font-bold text-base">Upon Completion</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-4xl font-black text-white tracking-tight">
                                                +{mission.reward}
                                            </span>
                                            <span className="text-sm font-bold text-yellow-400">CR</span>
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
