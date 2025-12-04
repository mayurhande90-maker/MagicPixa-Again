
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProps, Page, View } from '../types';
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
    XIcon,
    ArrowLeftIcon
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
        e.target.value = '';
    };

    // Drag & Drop Handlers
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

    const handleReset = () => {
        setImage(null);
        setResult(null);
    };

    return (
        <div className="p-6 lg:p-12 max-w-4xl mx-auto min-h-screen animate-fadeIn pb-32">
            
            {/* Header / Brief */}
            <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100 shadow-sm">
                    <FlagIcon className="w-4 h-4" /> Daily Challenge
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-[#1A1A1E] mb-4 tracking-tight">{mission.title}</h1>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">{mission.description}</p>
            </div>

            {/* Mission Card */}
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden relative transition-all duration-500">
                
                {/* Reward Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold opacity-90">
                        <SparklesIcon className="w-5 h-5"/> Reward:
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold border border-white/10 shadow-sm">
                        <span className="text-yellow-300 text-lg">+ {mission.reward}</span> Credits
                    </div>
                </div>

                {/* Main Interaction Area */}
                <div className="p-8 md:p-12 bg-gray-50/50">
                    
                    {/* STATE 1: RESULT */}
                    {result ? (
                        <div className="animate-fadeIn">
                            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-white mx-auto max-w-2xl group">
                                <img src={result} className="w-full h-full object-cover" alt="Mission Result" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                                    <p className="text-white font-bold tracking-widest text-sm uppercase">Mission Accomplished</p>
                                </div>
                            </div>
                            <div className="text-center mt-8">
                                <button 
                                    onClick={() => navigateTo('dashboard', 'home_dashboard')}
                                    className="bg-[#1A1A1E] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:scale-105"
                                >
                                    Return to Dashboard
                                </button>
                            </div>
                        </div>
                    ) : (
                        // STATE 2: UPLOAD & ACTION
                        <div className="max-w-xl mx-auto">
                            {/* Upload Zone */}
                            <div className="relative aspect-[4/3] mb-8">
                                {image ? (
                                    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg border border-gray-200 group bg-white">
                                        <img src={image.url} className="w-full h-full object-contain" alt="Preview" />
                                        
                                        {!loading && (
                                            <button 
                                                onClick={handleReset}
                                                className="absolute top-3 right-3 bg-white/90 p-2 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                                            >
                                                <XIcon className="w-5 h-5"/>
                                            </button>
                                        )}

                                        {loading && (
                                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                                                <p className="text-indigo-900 font-bold animate-pulse">Pixa is working...</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`w-full h-full border-3 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                                            isDragging 
                                            ? 'border-indigo-500 bg-indigo-50' 
                                            : 'border-gray-300 bg-white hover:border-indigo-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${isDragging ? 'bg-white' : 'bg-gray-50'}`}>
                                            <UploadIcon className={`w-10 h-10 ${isDragging ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500'}`} />
                                        </div>
                                        <p className="text-lg font-bold text-gray-700">Upload Photo</p>
                                        <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleExecute}
                                disabled={!image || loading || isLocked}
                                className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wide transition-all shadow-xl ${
                                    isLocked
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : !image 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : loading 
                                            ? 'bg-indigo-400 text-white cursor-wait'
                                            : 'bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] hover:scale-[1.02] hover:shadow-yellow-500/20'
                                }`}
                            >
                                {isLocked 
                                    ? 'Mission Locked' 
                                    : loading 
                                        ? 'Completing Mission...' 
                                        : 'Complete Mission'
                                }
                            </button>
                            
                            {isLocked && (
                                <p className="text-center text-sm text-gray-400 mt-4 font-medium">
                                    Come back tomorrow for a new challenge!
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
        </div>
    );
};
