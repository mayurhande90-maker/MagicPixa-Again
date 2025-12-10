
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
                        // Custom Light Upload Placeholder
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={handleDragOver}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`w-full h-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                                isDragging 
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                            }`}
                        >
                            {/* Background Grid Pattern - Dark dots on light bg */}
                            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            
                            <div className="relative z-10 p-6 bg-white rounded-full shadow-md mb-4 group-hover:scale-110 transition-transform duration-300 border border-gray-100">
                                <UploadIcon className="w-10 h-10 text-indigo-500" />
                            </div>
                            
                            <div className="relative z-10 text-center">
                                <p className="text-lg font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Upload Mission Asset</p>
                                <div className="bg-white/80 rounded-full px-3 py-1 inline-block mt-2 border border-gray-100"><p className="text-xs font-bold text-indigo-500 uppercase tracking-widest transition-colors">Click to Browse</p></div>
                                <p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: High quality image matching the mission.</p>
                            </div>
                        </div>
                    )
                }
                rightContent={
                    <div className="h-full w-full relative overflow-hidden rounded-3xl bg-white shadow-sm flex flex-col border border-gray-100">
                        {/* Animated Background Gradients - Light */}
                        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-50 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-50 rounded-full blur-[60px] -ml-10 -mb-10 pointer-events-none"></div>
                        
                        {/* Content */}
                        <div className="relative z-10 flex flex-col h-full p-8 text-left">
                            
                            {/* Top Badge */}
                            <div className="flex justify-between items-start mb-8">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <SparklesIcon className="w-3 h-3 text-amber-500" />
                                    Daily Challenge
                                </div>
                                {!isLocked && (
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase">Active</span>
                                    </div>
                                )}
                            </div>

                            {/* Typography */}
                            <div className="mb-6">
                                <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tight">
                                    {mission.title}
                                </h2>
                                <div className="h-1 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6"></div>
                                <p className="text-gray-600 text-sm md:text-base leading-relaxed font-medium border-l-2 border-indigo-100 pl-4">
                                    {mission.description}
                                </p>
                            </div>

                            {/* Spacer */}
                            <div className="flex-1"></div>

                            {/* Premium Reward Card - Light Version */}
                            <div className="relative group mt-auto">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-200 to-yellow-400 rounded-2xl opacity-30 group-hover:opacity-60 transition duration-500 blur-sm"></div>
                                <div className="relative flex items-center justify-between bg-white rounded-xl p-5 border border-amber-100 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center shadow-inner transform group-hover:scale-110 transition-transform duration-300">
                                            <CheckIcon className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Reward Bounty</p>
                                            <p className="text-gray-800 font-bold text-sm">Upon Completion</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-baseline justify-end gap-1">
                                            <span className="text-3xl font-black text-gray-900">
                                                +{mission.reward}
                                            </span>
                                            <span className="text-xs font-bold text-amber-500">CR</span>
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
