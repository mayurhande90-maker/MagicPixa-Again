
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { 
    getCreations, 
    saveCreation, 
    deleteCreation, 
    deductCredits,
    completeDailyMission
} from './firebase';
import { 
    generateInteriorDesign, 
    colourizeImage, 
    generateMagicSoul, 
    generateApparelTryOn, 
    generateMockup, 
    generateCaptions, 
    generateProductPackPlan, 
    editImageWithPrompt,
    generateBrandStylistImage,
    generateThumbnail,
    analyzeProductImage,
    generateModelShot,
    analyzeProductForModelPrompts
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { getDailyMission, isMissionLocked } from './utils/dailyMissions';
import { getBadgeInfo } from './utils/badgeUtils';
import { 
    PhotoStudioIcon, 
    UploadIcon, 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    ProjectsIcon,
    CubeIcon,
    UsersIcon,
    LightbulbIcon,
    ArrowUpCircleIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    CaptionIcon,
    ProductStudioIcon,
    XIcon,
    ArrowLeftIcon,
    CreditCardIcon,
    FlagIcon,
    CheckIcon,
    RetryIcon,
    PencilIcon,
    CopyIcon,
    CurrencyDollarIcon
} from './components/icons';

interface DashboardPageProps {
    navigateTo: (page: Page, view?: View, sectionId?: string) => void;
    auth: AuthProps;
    activeView: View;
    setActiveView: (view: View) => void;
    openEditProfileModal: () => void;
    isConversationOpen: boolean;
    setIsConversationOpen: (isOpen: boolean) => void;
    appConfig: AppConfig | null;
    setAppConfig: (config: AppConfig) => void;
}

const downloadImage = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.warn("Download failed, opening in new tab", error);
        window.open(url, '_blank');
    }
};

const InputField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <input id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400" {...props} />
    </div>
);

const TextAreaField: React.FC<any> = ({ label, id, ...props }) => (
    <div className="mb-6">
        {label && <label htmlFor={id} className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
        <textarea id={id} className="w-full px-5 py-4 bg-white border-2 border-gray-100 hover:border-gray-300 focus:border-[#4D7CFF] rounded-2xl outline-none transition-all font-medium text-[#1A1A1E] placeholder-gray-400 resize-none" rows={4} {...props} />
    </div>
);

// Visual Selector for Prompt-Less UI - Premium Card Style
const VisualSelector: React.FC<{ 
    label: string; 
    options: { id: string; label: string; color?: string }[]; 
    selected: string; 
    onSelect: (id: string) => void; 
}> = ({ label, options, selected, onSelect }) => (
    <div className="mb-8">
        <div className="flex items-center justify-between mb-3 ml-1">
             <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
             <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-full font-bold tracking-wide">REQUIRED</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
            {options.map(opt => {
                const isSelected = selected === opt.id;
                return (
                    <button 
                        key={opt.id} 
                        onClick={() => onSelect(opt.id)}
                        className={`relative group overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border-2 ${
                            isSelected 
                            ? 'border-[#4D7CFF] bg-[#4D7CFF]/5 shadow-md' 
                            : 'border-transparent bg-white hover:bg-gray-50 hover:border-gray-200'
                        }`}
                    >
                        <div className={`w-full h-full flex flex-col justify-between gap-3`}>
                            <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-[#4D7CFF]' : 'bg-gray-300 group-hover:bg-gray-400'} transition-colors duration-300`}></div>
                            <span className={`font-bold text-sm ${isSelected ? 'text-[#1A1A1E]' : 'text-gray-500 group-hover:text-gray-700'} transition-colors duration-300`}>{opt.label}</span>
                        </div>
                    </button>
                )
            })}
        </div>
    </div>
);

const ImageModal: React.FC<{ imageUrl: string; onClose: () => void }> = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6" onClick={onClose}>
        <div className="relative w-full h-full flex items-center justify-center">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"><XIcon className="w-8 h-8" /></button>
            <img src={imageUrl} alt="Full view" className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        </div>
    </div>
);

const MissionSuccessModal: React.FC<{ reward: number; onClose: () => void }> = ({ reward, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
         <div className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
             <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-6xl animate-pulse">🎉</div>
             
             <h2 className="text-2xl font-bold text-[#1A1A1E] mt-4 mb-2">Mission Accomplished!</h2>
             <p className="text-gray-500 mb-6">You've unlocked your daily creative reward.</p>
             
             <div className="bg-green-50 text-green-600 font-bold text-3xl py-4 rounded-2xl mb-6 border border-green-100">
                 +{reward} Credits
             </div>
             
             <button onClick={onClose} className="w-full bg-[#F9D230] text-[#1A1A1E] font-bold py-3 rounded-xl hover:bg-[#dfbc2b] transition-colors">
                 Awesome!
             </button>
         </div>
    </div>
);

const MilestoneSuccessModal: React.FC<{ onClose: () => void; bonus?: number }> = ({ onClose, bonus }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
         <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight text-white" onClick={e => e.stopPropagation()}>
             <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                 <SparklesIcon className="w-10 h-10 text-yellow-300 animate-spin-slow" />
             </div>
             
             <h2 className="text-2xl font-bold mt-4 mb-2">Milestone Reached!</h2>
             <p className="text-indigo-100 mb-6">You've hit a new creation record. Here is a reward for your creativity.</p>
             
             <div className="bg-white/20 backdrop-blur-md text-white font-bold text-3xl py-4 rounded-2xl mb-6 border border-white/30">
                 +{bonus || 5} Credits
             </div>
             
             <button onClick={onClose} className="w-full bg-white text-indigo-600 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg">
                 Collect Bonus
             </button>
         </div>
    </div>
);


// --- Standardized Layout Component (Strict 2-Column) ---
const FeatureLayout: React.FC<{
    title: string;
    icon: React.ReactNode;
    leftContent: React.ReactNode; // The Canvas
    rightContent: React.ReactNode; // The Controls
    onGenerate: () => void;
    isGenerating: boolean;
    canGenerate: boolean;
    creditCost: number;
    resultImage: string | null;
    onResetResult?: () => void;
    onNewSession?: () => void;
    description?: string;
    generateButtonStyle?: {
        className?: string;
        hideIcon?: boolean;
        label?: string;
    };
    resultHeightClass?: string;
    hideGenerateButton?: boolean; // New prop to hide the default generate button if custom UI handles it
    disableScroll?: boolean;
}> = ({ 
    title, icon, leftContent, rightContent, onGenerate, isGenerating, canGenerate, 
    creditCost, resultImage, onResetResult, onNewSession, description,
    generateButtonStyle, resultHeightClass, hideGenerateButton,
    disableScroll
}) => {
    const [isZoomed, setIsZoomed] = useState(false);
    
    // Default height if not specified. Used to enforce alignment.
    const contentHeightClass = resultHeightClass || 'h-[560px]';

    return (
        <div className="flex flex-col p-6 lg:p-8 max-w-[1800px] mx-auto bg-[#FFFFFF]">
            {/* Header */}
            <div className="mb-5 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                        {icon}
                    </div>
                    <h1 className="text-2xl font-bold text-[#1A1A1E]">{title}</h1>
                </div>
                {description && <p className="text-sm text-gray-500 font-medium max-w-2xl">{description}</p>}
            </div>

            {/* Main Content Grid */}
            {/* 50/50 Split for equal sizing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT COLUMN: Upload / Preview / Result Canvas */}
                <div className={`w-full flex flex-col justify-start ${contentHeightClass}`}>
                    {resultImage ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] rounded-3xl relative animate-fadeIn overflow-hidden shadow-inner">
                             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 to-[#1a1a1a] opacity-50"></div>
                             <img 
                                src={resultImage} 
                                className="w-full h-full object-contain shadow-2xl relative z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.01]" 
                                onClick={() => setIsZoomed(true)}
                                title="Click to zoom"
                             />
                             
                             {/* Result Actions */}
                             <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
                                <div className="pointer-events-auto flex gap-2 sm:gap-3 flex-wrap justify-center">
                                    {onNewSession && (
                                         <button onClick={onNewSession} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">New Project</span>
                                        </button>
                                    )}
                                    {onResetResult && (
                                        <button onClick={onResetResult} className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap">
                                            <RetryIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                                            <span className="hidden sm:inline">Regenerate</span>
                                        </button>
                                    )}
                                    <button onClick={() => resultImage && downloadImage(resultImage, 'magicpixa-creation.png')} className="bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl transition-all shadow-lg shadow-yellow-500/30 text-xs sm:text-sm font-bold flex items-center gap-2 transform hover:scale-105 whitespace-nowrap">
                                        <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5"/> <span>Download</span>
                                    </button>
                                </div>
                             </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-start">
                            <div className="w-full h-full relative flex flex-col items-center">
                                {leftContent}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Control Deck */}
                <div className={`flex flex-col ${contentHeightClass}`}>
                    <div className="bg-[#F6F7FA] p-5 rounded-3xl flex-1 flex-col h-full border border-gray-100 overflow-hidden flex">
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Configuration</h3>
                            <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
                        </div>
                        
                        {/* Scrollable Content containing inputs AND button */}
                        <div className={`flex-1 ${disableScroll ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'} pr-1 flex flex-col`}>
                            <div className="flex flex-col min-h-full">
                                {/* Changed justify-center to justify-start to align content to top */}
                                <div className="space-y-2 mb-6 flex-1 flex flex-col justify-start">
                                    {rightContent}
                                </div>

                                {/* Generate Button moved to bottom */}
                                {!hideGenerateButton && (
                                    <div className="mt-auto pt-4 border-t border-gray-200 bg-[#F6F7FA]">
                                        <button 
                                            onClick={onGenerate} 
                                            disabled={isGenerating || !canGenerate}
                                            className={`group w-full text-lg font-bold py-4 rounded-2xl shadow-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 ${
                                                generateButtonStyle?.className 
                                                ? generateButtonStyle.className 
                                                : "bg-[#F9D230] hover:bg-[#dfbc2b] text-[#1A1A1E] shadow-yellow-500/20 hover:shadow-yellow-500/40"
                                            }`}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <div className={`w-6 h-6 border-3 border-t-transparent rounded-full animate-spin border-black/10 border-t-black`}></div> 
                                                    <span className="animate-pulse">Generating...</span>
                                                </>
                                            ) : (
                                                <>
                                                    {!generateButtonStyle?.hideIcon && <SparklesIcon className="w-6 h-6 transition-transform group-hover:rotate-12"/>}
                                                    {generateButtonStyle?.label || "Generate"}
                                                </>
                                            )}
                                        </button>
                                        <div className="text-center mt-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                            {creditCost === 0 ? (
                                                 <div className="flex items-center gap-1.5 bg-green-100 text-green-600 px-3 py-1 rounded-full border border-green-200">
                                                     <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                     Sponsored by Daily Mission
                                                 </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                                                    <span className="w-1.5 h-1.5 bg-[#6EFACC] rounded-full animate-pulse"></span>
                                                    Cost: {creditCost} Credits
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isZoomed && resultImage && (
                <ImageModal imageUrl={resultImage} onClose={() => setIsZoomed(false)} />
            )}
        </div>
    );
};

// --- Enhanced Upload Placeholder Component ---
const UploadPlaceholder: React.FC<{ label: string; onClick: () => void; icon?: React.ReactNode }> = ({ label, onClick, icon }) => (
    <div 
        onClick={onClick}
        className="w-full h-full border-2 border-dashed border-gray-300 hover:border-[#4D7CFF] bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-md"
    >
        <div className="relative z-10 p-6 bg-gray-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
            {icon || <UploadIcon className="w-12 h-12 text-gray-400 group-hover:text-[#4D7CFF] transition-colors duration-300" />}
        </div>
        
        <div className="relative z-10 mt-6 text-center space-y-2 px-6">
            <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">{label}</p>
            <p className="text-xs font-bold text-gray-300 uppercase tracking-widest group-hover:text-[#4D7CFF] transition-colors delay-75 bg-gray-50 px-3 py-1 rounded-full">Click to Browse</p>
        </div>
    </div>
);

// Helper to check milestone status (10, 30, 50...)
const checkMilestone = (gens: number): number | false => {
    if (gens > 0) {
        if (gens === 10) return 5;
        if (gens > 10 && (gens - 10) % 20 === 0) {
            const multiplier = (gens - 10) / 20;
            return 5 + (multiplier * 5);
        }
    }
    return false;
};

const StandardFeature: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    cost: number;
    auth: AuthProps;
    onGenerate: (image: { base64: string; mimeType: string }, prompt?: string) => Promise<string>;
}> = ({ title, description, icon, cost, auth, onGenerate }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await onGenerate(image.base64, prompt);
            const url = res.startsWith('data:') ? res : `data:image/png;base64,${res}`;
            setResult(url);
            await saveCreation(auth.user.uid, url, title);
            const updatedUser = await deductCredits(auth.user.uid, cost, title);
            
            // Check for milestone bonus in updated user object
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) {
                    setMilestoneBonus(bonus);
                }
            }

            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <FeatureLayout
                title={title}
                description={description}
                icon={icon}
                creditCost={cost}
                isGenerating={loading}
                canGenerate={!!image}
                onGenerate={handleGenerate}
                resultImage={result}
                onResetResult={() => setResult(null)}
                onNewSession={() => { setImage(null); setResult(null); setPrompt(''); }}
                resultHeightClass="h-[400px]"
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center">
                            <img src={image.url} className="max-h-full max-w-full rounded-lg" alt="Source" />
                             <button onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 bg-white p-2 rounded-full shadow"><PencilIcon className="w-4 h-4"/></button>
                        </div>
                    ) : (
                        <UploadPlaceholder label="Upload Image" onClick={() => fileInputRef.current?.click()} />
                    )
                }
                rightContent={
                    <div className="space-y-4">
                        <TextAreaField label="Custom Instruction (Optional)" value={prompt} onChange={(e: any) => setPrompt(e.target.value)} placeholder="Describe desired outcome..." />
                    </div>
                }
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} accept="image/*" />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
}

const DailyQuest: React.FC<{ 
    user: User | null;
    navigateTo: (page: Page, view?: View) => void;
}> = ({ user, navigateTo }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const mission = getDailyMission();
    // Use strict server-based locking logic
    const isLocked = useMemo(() => isMissionLocked(user), [user]);

    useEffect(() => {
        const calculateTimeLeft = () => {
            if (!user?.dailyMission?.nextUnlock) return;
            
            const now = new Date();
            const nextReset = new Date(user.dailyMission.nextUnlock);
            const diff = nextReset.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeLeft("Ready!");
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
    }, [user]);

    return (
        <div className={`rounded-3xl p-4 shadow-md border relative overflow-hidden group h-full flex flex-col justify-between transition-all hover:shadow-xl ${
            isLocked 
            ? 'bg-green-50 border-green-200' 
            : 'bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E] border-gray-700 text-white'
        }`}>
            {!isLocked && <div className="absolute top-0 right-0 w-32 h-32 bg-[#F9D230]/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-[#F9D230]/20 transition-colors"></div>}
            
            <div>
                <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${
                        isLocked 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-red-500 text-white border border-white/10 animate-pulse'
                    }`}>
                        <FlagIcon className="w-3 h-3" /> {isLocked ? 'Mission Complete' : 'Daily Challenge'}
                    </span>
                    {!isLocked && <div className="w-2 h-2 bg-[#F9D230] rounded-full animate-pulse"></div>}
                </div>
                
                <h3 className={`text-xl font-bold mb-2 relative z-10 ${isLocked ? 'text-[#1A1A1E]' : 'text-white'}`}>{mission.title}</h3>
                <p className={`text-xs mb-3 relative z-10 leading-relaxed line-clamp-3 ${isLocked ? 'text-gray-500' : 'text-gray-300'}`}>{mission.description}</p>
            </div>
            
            <div className="relative z-10 mt-auto">
                {!isLocked ? (
                    <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-xl p-3 flex items-center justify-between shadow-inner transform transition-transform hover:scale-[1.02]">
                        <div>
                            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-0.5">Complete to Unlock</p>
                            <p className="text-xl font-black text-[#1A1A1E] flex items-center gap-1 leading-none">
                               +5 <span className="text-xs font-bold text-amber-700">CREDITS</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => navigateTo('dashboard', 'daily_mission')}
                            className="bg-[#1A1A1E] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black hover:scale-105 transition-all shadow-lg whitespace-nowrap"
                        >
                            Start Mission
                        </button>
                    </div>
                ) : (
                    <div className="w-full flex justify-between items-center bg-white/50 p-3 rounded-xl border border-green-100">
                         <span className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckIcon className="w-4 h-4"/> Reward Claimed</span>
                         <span className="text-xs font-mono text-green-600">Next mission will unlock in {timeLeft}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardHome: React.FC<{ 
    user: User | null; 
    navigateTo: (page: Page, view?: View, sectionId?: string) => void; 
    setActiveView: (view: View) => void;
    appConfig: AppConfig | null;
}> = ({ user, navigateTo, setActiveView, appConfig }) => {
    
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            getCreations(user.uid).then(data => {
                setCreations(data as Creation[]);
                setLoadingCreations(false);
            });
        }
    }, [user]);

    // Greeting Logic
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const badge = user ? getBadgeInfo(user.lifetimeGenerations) : null;

    // Stats Logic
    const totalGenerations = creations.length;
    const featureCounts: Record<string, number> = {};
    creations.forEach(c => {
        featureCounts[c.feature] = (featureCounts[c.feature] || 0) + 1;
    });
    const sortedFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]);
    const mostUsedFeature = sortedFeatures.length > 0 ? sortedFeatures[0][0] : "None yet";

    // Progress Logic for Loyalty Bonus (Non-linear: 10, 30, 50...)
    const lifetimeGens = user?.lifetimeGenerations || 0;
    let nextMilestone = 10;
    let prevMilestone = 0;
    let nextReward = 5;

    if (lifetimeGens >= 10) {
        // Formula logic matching firebase.ts:
        // 10 -> 5
        // 30 -> 10 (Gap 20)
        // 50 -> 15 (Gap 20)
        // Blocks passed = floor((gens - 10) / 20)
        const blocksPassed = Math.floor((lifetimeGens - 10) / 20) + 1;
        nextMilestone = 10 + (blocksPassed * 20);
        prevMilestone = nextMilestone - 20;
        nextReward = 5 + (blocksPassed * 5);
    }
    
    // Calculate percent within the current gap
    let progressPercent = 0;
    if (lifetimeGens < 10) {
        progressPercent = (lifetimeGens / 10) * 100;
    } else {
        progressPercent = ((lifetimeGens - prevMilestone) / (nextMilestone - prevMilestone)) * 100;
    }
    // Clamp
    progressPercent = Math.min(100, Math.max(0, progressPercent));


    // Helper to map feature name to view ID for "Generate Another"
    const getFeatureViewId = (featureName: string): View => {
        const map: Record<string, View> = {
            'Magic Photo Studio': 'studio',
            'Model Shot': 'studio',
            'Product Studio': 'product_studio',
            'Brand Stylist AI': 'brand_stylist',
            'Thumbnail Studio': 'thumbnail_studio',
            'Magic Soul': 'soul',
            'Magic Photo Colour': 'colour',
            'CaptionAI': 'caption',
            'Magic Interior': 'interior',
            'Magic Apparel': 'apparel',
            'Magic Mockup': 'mockup'
        };
        // Try exact match first, then check if it contains the feature name
        if (map[featureName]) return map[featureName];
        const key = Object.keys(map).find(k => featureName.includes(k));
        return key ? map[key] : 'studio';
    };

    const latestCreation = creations.length > 0 ? creations[0] : null;

    const tools = [
        { id: 'studio', label: 'Magic Photo Studio', icon: PhotoStudioIcon, color: 'bg-blue-500' },
        { id: 'product_studio', label: 'Product Studio', icon: ProductStudioIcon, color: 'bg-green-500' },
        { id: 'brand_stylist', label: 'Brand Stylist AI', icon: LightbulbIcon, color: 'bg-yellow-500' },
        { id: 'thumbnail_studio', label: 'Thumbnail Studio', icon: ThumbnailIcon, color: 'bg-red-500' },
        { id: 'soul', label: 'Magic Soul', icon: UsersIcon, color: 'bg-pink-500' },
        { id: 'colour', label: 'Photo Colour', icon: PaletteIcon, color: 'bg-rose-500' },
        { id: 'caption', label: 'CaptionAI', icon: CaptionIcon, color: 'bg-amber-500' },
        { id: 'interior', label: 'Magic Interior', icon: HomeIcon, color: 'bg-orange-500' },
        { id: 'apparel', label: 'Magic Apparel', icon: UsersIcon, color: 'bg-teal-500' },
        { id: 'mockup', label: 'Magic Mockup', icon: MockupIcon, color: 'bg-indigo-500' },
    ];

    return (
        <div className="p-6 lg:p-10 max-w-[1600px] mx-auto animate-fadeIn">
            {/* Header with Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1A1E]">
                        {getGreeting()}, {badge ? <span className={badge.color}>{badge.rank}</span> : ''} {user?.name}!
                    </h1>
                    <p className="text-gray-500 mt-1">Ready to create something magic today?</p>
                </div>
            </div>

            {/* Hero Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-12 items-stretch">
                
                {/* Left: Hero Banner (60% -> 3/5) */}
                <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col h-[450px]">
                    {loadingCreations ? (
                         <div className="h-full flex items-center justify-center text-gray-400">Loading activity...</div>
                    ) : latestCreation ? (
                        <div 
                            className="relative h-full group cursor-zoom-in"
                            onClick={() => setZoomedImage(latestCreation.imageUrl)}
                        >
                            <img src={latestCreation.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Latest creation" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-end pointer-events-none">
                                <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full w-fit mb-2 border border-white/10">Latest Creation</span>
                                <h3 className="text-white text-2xl font-bold mb-4">{latestCreation.feature}</h3>
                                <div className="flex gap-3 pointer-events-auto">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            downloadImage(latestCreation.imageUrl, 'latest-creation.png');
                                        }}
                                        className="bg-white text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors flex items-center gap-2"
                                    >
                                        <DownloadIcon className="w-4 h-4" /> Download
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveView(getFeatureViewId(latestCreation.feature));
                                        }}
                                        className="bg-[#F9D230] text-[#1A1A1E] px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#dfbc2b] transition-colors flex items-center gap-2"
                                    >
                                        <SparklesIcon className="w-4 h-4" /> Generate Another
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full bg-gradient-to-br from-[#1A1A1E] to-[#2a2a2e] p-8 flex flex-col justify-center items-start text-white relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                             <h2 className="text-3xl font-bold mb-4 relative z-10">Start your creative journey</h2>
                             <p className="text-gray-400 mb-8 max-w-md relative z-10">You haven't generated anything yet. Try our Magic Photo Studio to transform your first image.</p>
                             <button 
                                onClick={() => setActiveView('studio')}
                                className="bg-[#F9D230] text-[#1A1A1E] px-6 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-colors relative z-10"
                             >
                                Create Now
                             </button>
                        </div>
                    )}
                </div>

                {/* Right: Boxy Layout (40% -> 2/5) */}
                <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                    {/* Row 1: Loyalty Bonus (Full Width Box) */}
                    <div className="shrink-0 h-[155px] bg-white p-4 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden group">
                        {/* Decorative BG */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors"></div>
                        
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Loyalty Bonus</p>
                                <h3 className="text-xl font-black text-[#1A1A1E]">
                                    {lifetimeGens} <span className="text-sm font-medium text-gray-400">Generations</span>
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-black text-indigo-600">
                                    {nextMilestone}
                                </p>
                                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Target</p>
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between text-xs font-bold mb-1.5">
                                <span className="text-indigo-600">Progress</span>
                                <span className="text-gray-500">Next: +{nextReward} Credits</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full relative" style={{ width: `${progressPercent}%` }}>
                                     <div className="absolute inset-0 bg-white/20 w-full h-full animate-[progress_2s_linear_infinite]"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Daily Mission (Tray) */}
                    <div className="flex-1 min-h-[140px]">
                         <DailyQuest user={user} navigateTo={(page, view) => view && setActiveView(view)} />
                    </div>
                </div>
            </div>

            {/* All Tools Grid */}
            <div>
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">All Creative Tools</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {tools.map(tool => {
                        const isDisabled = appConfig?.featureToggles?.[tool.id] === false;
                        return (
                            <button
                                key={tool.id}
                                onClick={() => setActiveView(tool.id as View)}
                                disabled={isDisabled}
                                className={`flex flex-col items-center text-center p-5 rounded-2xl transition-all duration-300 border group ${
                                    isDisabled 
                                    ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-lg hover:-translate-y-1'
                                }`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${tool.color} shadow-sm`}>
                                    <tool.icon className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 group-hover:text-black">{tool.label}</span>
                                {isDisabled && <span className="mt-2 text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Coming Soon</span>}
                            </button>
                        )
                    })}
                </div>
            </div>
            
            {/* Image Modal for Zoom */}
            {zoomedImage && <ImageModal imageUrl={zoomedImage} onClose={() => setZoomedImage(null)} />}
        </div>
    );
};

const Creations: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth.user) {
            getCreations(auth.user.uid).then(data => {
                setCreations(data as Creation[]);
                setLoading(false);
            });
        }
    }, [auth.user]);

    const handleDelete = async (creation: Creation) => {
        if (confirm('Delete this creation?')) {
            if (auth.user) {
                await deleteCreation(auth.user.uid, creation);
                setCreations(prev => prev.filter(c => c.id !== creation.id));
            }
        }
    };

    return (
        <div className="p-8">
            <h2 className="text-2xl font-bold mb-6">My Creations</h2>
            {loading ? <p>Loading...</p> : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {creations.map(c => (
                        <div key={c.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                            <img src={c.imageUrl} className="w-full h-full object-cover" alt="Creation" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button onClick={() => downloadImage(c.imageUrl, 'creation.png')} className="p-2 bg-white rounded-full"><DownloadIcon className="w-5 h-5"/></button>
                                <button onClick={() => handleDelete(c)} className="p-2 bg-white rounded-full text-red-500"><TrashIcon className="w-5 h-5"/></button>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                                {c.feature}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const ProductStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [productName, setProductName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null); // JSON plan
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setResult(null);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateProductPackPlan([image.base64.base64], productName, "A great product", { colors: [], fonts: []}, "", []);
            setResult(res);
            const updatedUser = await deductCredits(auth.user.uid, appConfig?.featureCosts['Product Studio'] || 5, 'Product Studio');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Failed to generate plan.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="Product Studio"
            description="Generate a full marketing pack."
            icon={<ProductStudioIcon className="w-6 h-6 text-green-500"/>}
            creditCost={appConfig?.featureCosts['Product Studio'] || 5}
            isGenerating={loading}
            canGenerate={!!image && !!productName}
            onGenerate={handleGenerate}
            resultImage={null} // Result is text/JSON
            resultHeightClass="h-[400px]"
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                        <img src={image.url} className="max-h-full max-w-full rounded-lg" alt="Product Source" />
                    </div>
                ) : <UploadPlaceholder label="Upload Product" onClick={() => fileInputRef.current?.click()} />
            }
            rightContent={
                <div className="space-y-4 h-full flex flex-col">
                    <InputField label="Product Name" value={productName} onChange={(e: any) => setProductName(e.target.value)} />
                    {result && (
                        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-xl text-xs font-mono">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                        </div>
                    )}
                </div>
            }
        />
    );
};

const CaptionAI: React.FC<{ auth: AuthProps; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [captions, setCaptions] = useState<{caption: string; hashtags: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
            setCaptions([]);
        }
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setLoading(true);
        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(res);
            const updatedUser = await deductCredits(auth.user.uid, appConfig?.featureCosts['CaptionAI'] || 1, 'CaptionAI');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert("Generation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <FeatureLayout
            title="CaptionAI"
            description="Get viral captions."
            icon={<CaptionIcon className="w-6 h-6 text-amber-500"/>}
            creditCost={appConfig?.featureCosts['CaptionAI'] || 1}
            isGenerating={loading}
            canGenerate={!!image}
            onGenerate={handleGenerate}
            resultImage={null}
            resultHeightClass="h-[400px]"
            leftContent={
                image ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                        <img src={image.url} className="max-h-full max-w-full rounded-lg" alt="Caption Source" />
                    </div>
                ) : <UploadPlaceholder label="Upload Image" onClick={() => fileInputRef.current?.click()} />
            }
            rightContent={
                <div className="space-y-4 h-full overflow-y-auto">
                    {captions.map((c, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-800 mb-2">{c.caption}</p>
                            <p className="text-xs text-blue-600">{c.hashtags}</p>
                            <button onClick={() => navigator.clipboard.writeText(`${c.caption} ${c.hashtags}`)} className="mt-2 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1">
                                <CopyIcon className="w-3 h-3"/> Copy
                            </button>
                        </div>
                    ))}
                </div>
            }
        />
    );
};


// --- Feature Components ---

// Helper for the new button-grid selectors
const SelectionGrid: React.FC<{ label: string; options: string[]; value: string; onChange: (val: string) => void }> = ({ label, options, value, onChange }) => (
    <div className="mb-6 animate-fadeIn">
        <div className="flex items-center justify-between mb-3 ml-1">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
            {value && (
                 <button onClick={() => onChange('')} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">
                     Clear
                 </button>
            )}
        </div>
        <div className="flex flex-wrap gap-2">
            {options.map(opt => {
                const isSelected = value === opt;
                return (
                    <button 
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-300 transform active:scale-95 ${
                            isSelected 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm'
                        }`}
                    >
                        {opt}
                    </button>
                )
            })}
        </div>
    </div>
);

// --- DailyMissionStudio Component is above in the file but needs no changes except for receiving correct user props ---
// It receives auth from DashboardPage, which receives it from App. App.tsx fix ensures auth.user has the correct fields.

const DailyMissionStudio: React.FC<{ auth: AuthProps; navigateTo: any; }> = ({ auth, navigateTo }) => {
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
            let res;
            const config = activeMission.config;
            
            // Dynamic dispatch based on toolType
            if (config.toolType === 'studio' && config.prompt) {
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, config.prompt);
            } else if (config.toolType === 'interior' && config.interiorStyle && config.interiorRoomType) {
                res = await generateInteriorDesign(image.base64.base64, image.base64.mimeType, config.interiorStyle, 'home', config.interiorRoomType);
            } else if (config.toolType === 'colour' && config.colourMode) {
                res = await colourizeImage(image.base64.base64, image.base64.mimeType, config.colourMode);
            } else {
                throw new Error("Invalid mission configuration");
            }

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
                 // We should treat this as a "Success" state for the UI, so they see the "Mission Accomplished" screen instead of an error.
                 
                 // Calculate a future date to force the locked state locally
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

    // Render loading state while auth initializes to prevent flashing "Upload" screen
    if (!auth.user) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[#4D7CFF] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    // STRICT PERSISTENCE: If locked and NOT showing reward modal, show Locked Screen.
    // This ensures that even after refresh, if nextUnlock > now, user sees this screen.
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
                resultHeightClass="h-[650px]" // Increased strict height to allow content to fit comfortably
                hideGenerateButton={true} // Hiding default button to use custom one in right panel
                // Removed disableScroll to allow scrolling if content overflows, preventing button from hiding
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
                     // New Marketing-Focused Right Panel
                    <div className="h-full flex flex-col">
                        {/* Reward Banner */}
                        <div className="bg-gradient-to-br from-[#F9D230] to-[#F5A623] p-5 rounded-2xl text-[#1A1A1E] shadow-lg relative overflow-hidden mb-6 transform transition-transform hover:scale-[1.02]">
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
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col">
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
                        
                        {/* Action Button */}
                        <div className="mt-5">
                            <button 
                                onClick={handleGenerate} 
                                disabled={!image || loading}
                                className={`w-full py-3 rounded-2xl text-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
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

const MagicPhotoStudio: React.FC<{ auth: AuthProps; navigateTo: any; appConfig: AppConfig | null }> = ({ auth, appConfig }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);

    // Refs for File Inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const redoFileInputRef = useRef<HTMLInputElement>(null);

    // Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingModel, setIsAnalyzingModel] = useState(false);
    const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
    const [suggestedModelPrompts, setSuggestedModelPrompts] = useState<{ display: string; prompt: string }[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);

    // Mode Selection State
    const [studioMode, setStudioMode] = useState<'product' | 'model' | null>(null);

    // Manual Refinement State (Product)
    const [category, setCategory] = useState('');
    const [brandStyle, setBrandStyle] = useState('');
    const [visualType, setVisualType] = useState('');

    // Manual Refinement State (Model)
    const [modelType, setModelType] = useState('');
    const [modelRegion, setModelRegion] = useState('');
    const [skinTone, setSkinTone] = useState('');
    const [bodyType, setBodyType] = useState('');
    // New Model Controls
    const [modelComposition, setModelComposition] = useState('');
    const [modelFraming, setModelFraming] = useState('');

    const categories = ['Beauty', 'Food', 'Fashion', 'Electronics', 'Home Decor', 'Packaged Products', 'Jewellery', 'Footwear', 'Toys', 'Automotive'];
    const brandStyles = ['Clean', 'Bold', 'Luxury', 'Playful', 'Natural', 'High-tech', 'Minimal'];
    const visualTypes = ['Studio', 'Lifestyle', 'Abstract', 'Natural Textures', 'Flat-lay', 'Seasonal'];

    const modelTypes = ['Young Female', 'Young Male', 'Adult Female', 'Adult Male', 'Senior Female', 'Senior Male', 'Kid Model'];
    const modelRegions = ['Indian', 'South Asian', 'East Asian', 'Southeast Asian', 'Middle Eastern', 'African', 'European', 'American', 'Australian / Oceania'];
    const skinTones = ['Fair Tone', 'Wheatish Tone', 'Dusky Tone'];
    const bodyTypes = ['Slim Build', 'Average Build', 'Athletic Build', 'Plus Size Model'];
    const compositionTypes = ['Single Model', 'Group Shot'];
    const shotTypes = ['Tight Close Shot', 'Close-Up Shot', 'Mid Shot', 'Wide Shot'];

    // Animation Timer for Loading Text
    useEffect(() => {
        let interval: any;
        if (loading) {
            const steps = ["Analyzing Structure...", "Generating Model...", "Adjusting Lighting...", "Applying Physics...", "Polishing Pixels..."];
            let step = 0;
            setLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setLoadingText(steps[step]);
            }, 1500);
        }
        return () => clearInterval(interval);
    }, [loading]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            
            setResult(null);
            setStudioMode(null);
            setCategory(''); setBrandStyle(''); setVisualType('');
            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
            setModelComposition(''); setModelFraming('');
            setSuggestedPrompts([]);
            setSuggestedModelPrompts([]);
            setSelectedPrompt(null);
            
            setImage({ url: URL.createObjectURL(file), base64 });
        }
    };

    const handleModeSelect = async (mode: 'product' | 'model') => {
        setResult(null); // Clear any existing result to start scanning afresh on the original image
        setStudioMode(mode);
        setSelectedPrompt(null);
        
        if (mode === 'product') {
            setIsAnalyzing(true);
            try {
                const prompts = await analyzeProductImage(image!.base64.base64, image!.base64.mimeType);
                setSuggestedPrompts(prompts);
            } catch (err) {
                console.error(err);
                setSuggestedPrompts(["Put this on a clean white table", "Show this product on a luxury gold podium"]);
            } finally {
                setIsAnalyzing(false);
            }
        } else if (mode === 'model') {
             setIsAnalyzingModel(true); 
             try {
                 const prompts = await analyzeProductForModelPrompts(image!.base64.base64, image!.base64.mimeType);
                 setSuggestedModelPrompts(prompts);
             } catch (e) {
                 console.error(e);
                 setSuggestedModelPrompts([{ display: "Close-Up", prompt: "Close-up model shot" }]);
             } finally {
                 setIsAnalyzingModel(false);
             }
        }
    };

    // Mutually Exclusive Selection Logic
    const handlePromptSelect = (prompt: string) => {
        if (selectedPrompt === prompt) {
             setSelectedPrompt(null);
        } else {
             setSelectedPrompt(prompt);
             if (studioMode === 'product') {
                 setCategory(''); setBrandStyle(''); setVisualType('');
             } else {
                 setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                 setModelComposition(''); setModelFraming('');
             }
        }
    };

    const handleCategorySelect = (val: string) => {
        setCategory(val);
        setBrandStyle('');
        setVisualType('');
    };

    const handleBrandStyleSelect = (val: string) => {
        setBrandStyle(val);
        setVisualType('');
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        setResult(null); 
        setLoading(true);
        try {
            let res;
            let cost = 2;

            if (studioMode === 'model') {
                 cost = appConfig?.featureCosts['Model Shot'] || 3;
                 res = await generateModelShot(image.base64.base64, image.base64.mimeType, {
                    modelType,
                    region: modelRegion,
                    skinTone,
                    bodyType,
                    composition: modelComposition,
                    framing: modelFraming,
                    freeformPrompt: selectedPrompt || undefined
                 });
            } else {
                cost = appConfig?.featureCosts['Magic Photo Studio'] || 2;
                let generationDirection = "";
                if (selectedPrompt) {
                    generationDirection = selectedPrompt;
                } else if (category) {
                    generationDirection = `${visualType || 'Professional'} shot of ${category} product. Style: ${brandStyle || 'Clean'}.`;
                } else {
                    generationDirection = "Professional studio lighting";
                }
                res = await editImageWithPrompt(image.base64.base64, image.base64.mimeType, generationDirection);
            }

            const url = `data:image/png;base64,${res}`;
            setResult(url);
            saveCreation(auth.user.uid, url, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            const updatedUser = await deductCredits(auth.user.uid, cost, studioMode === 'model' ? 'Model Shot' : 'Magic Photo Studio');
            
             // Check for milestone bonus in updated user object
            if (updatedUser.lifetimeGenerations) {
                const bonus = checkMilestone(updatedUser.lifetimeGenerations);
                if (bonus !== false) {
                    setMilestoneBonus(bonus);
                }
            }

            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e) {
            console.error(e);
            alert('Generation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewSession = () => {
        setImage(null); 
        setResult(null);
        setStudioMode(null);
        setCategory(''); setBrandStyle(''); setVisualType('');
        setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
        setModelComposition(''); setModelFraming('');
        setSuggestedPrompts([]);
        setSuggestedModelPrompts([]);
        setSelectedPrompt(null);
    };

    const canGenerate = !!image && !isAnalyzing && !isAnalyzingModel && !!studioMode && (
        studioMode === 'product' 
            ? (!!selectedPrompt || (!!category && !!brandStyle && !!visualType))
            : (!!selectedPrompt || (!!modelType && !!modelRegion && !!skinTone && !!bodyType && !!modelComposition && !!modelFraming))
    );

    const currentCost = studioMode === 'model' 
        ? (appConfig?.featureCosts['Model Shot'] || 3) 
        : (appConfig?.featureCosts['Magic Photo Studio'] || 2);

    return (
        <>
        <FeatureLayout 
            title="Magic Photo Studio"
            description="Transform simple photos into professional, studio-quality product shots or lifelike model images."
            icon={<PhotoStudioIcon className="w-6 h-6 text-blue-500"/>}
            creditCost={currentCost}
            isGenerating={loading}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
            resultImage={result}
            onResetResult={() => setResult(null)}
            onNewSession={handleNewSession}
            resultHeightClass="h-[560px]"
            generateButtonStyle={{
                className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]",
                hideIcon: true
            }}
            leftContent={
                image ? (
                    <div className="relative h-[560px] w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                         {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}

                        {(isAnalyzing || isAnalyzingModel) && (
                            <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] rounded-3xl overflow-hidden flex items-center justify-center">
                                {(isAnalyzing || isAnalyzingModel) && (
                                    <>
                                        <div className="absolute top-0 h-full w-[3px] bg-[#4D7CFF] shadow-[0_0_20px_#4D7CFF] animate-[scan-horizontal_1.5s_linear_infinite] z-30"></div>
                                        <div className="absolute top-0 h-full w-48 bg-gradient-to-l from-[#4D7CFF]/30 to-transparent animate-[scan-horizontal_1.5s_linear_infinite] -translate-x-full z-20"></div>
                                    </>
                                )}
                                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-40 animate-bounce-slight">
                                    <div className="w-2 h-2 bg-[#6EFACC] rounded-full animate-ping"></div>
                                    <span className="text-xs font-bold tracking-widest uppercase">{isAnalyzingModel ? 'Generating Suggestions...' : 'Scanning Image...'}</span>
                                </div>
                            </div>
                        )}

                        <img 
                            src={image.url} 
                            className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} 
                        />
                        
                        {!loading && !isAnalyzing && !isAnalyzingModel && (
                            <button 
                                onClick={() => redoFileInputRef.current?.click()} 
                                className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full shadow-lg hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all hover:scale-110 z-40 border border-gray-100 group-hover:opacity-100 opacity-0"
                                title="Change Photo"
                            >
                                <UploadIcon className="w-5 h-5"/>
                            </button>
                        )}
                        <input ref={redoFileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        
                        <style>{`
                            @keyframes progress {
                                0% { width: 0%; margin-left: 0; }
                                50% { width: 100%; margin-left: 0; }
                                100% { width: 0%; margin-left: 100%; }
                            }
                            @keyframes fadeInUp {
                                from { opacity: 0; transform: translateY(10px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                            @keyframes scan-horizontal {
                                0% { left: 0%; }
                                100% { left: 100%; }
                            }
                        `}</style>
                    </div>
                ) : (
                    <div className="w-full flex justify-center">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="h-[560px] w-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-white rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden hover:-translate-y-1 hover:shadow-xl mx-auto"
                        >
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300">
                                <UploadIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" />
                            </div>
                            
                            <div className="relative z-10 mt-6 text-center space-y-2 px-6">
                                <p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Product Photo</p>
                                <div className="inline-block p-[2px] rounded-full bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                                    <div className="bg-gray-50 rounded-full px-3 py-1">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-colors">
                                            Click to Browse
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            rightContent={
                !image ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50 select-none">
                        <div className="bg-white p-4 rounded-full mb-4 border border-gray-100">
                            <ArrowUpCircleIcon className="w-8 h-8 text-gray-400"/>
                        </div>
                        <h3 className="font-bold text-gray-600 mb-2">Controls Locked</h3>
                        <p className="text-sm text-gray-400">Upload a photo to unlock AI tools.</p>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fadeIn p-1">
                        
                        {/* STEP 1: Mode Selection (Product vs Model) */}
                        {!studioMode && !isAnalyzing && !isAnalyzingModel && (
                            <div className="flex flex-col gap-4 h-full justify-center">
                                <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Select Generation Mode</p>
                                <button onClick={() => handleModeSelect('product')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-blue-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors"><CubeIcon className="w-6 h-6"/></div>
                                        <span className="text-lg font-bold text-gray-800">Product Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Studio lighting, podiums, and nature settings.</p>
                                </button>
                                <button onClick={() => handleModeSelect('model')} className="group relative p-6 bg-white border-2 border-gray-100 hover:border-purple-500 rounded-3xl text-left transition-all hover:shadow-lg hover:-translate-y-1">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors"><UsersIcon className="w-6 h-6"/></div>
                                        <span className="text-lg font-bold text-gray-800">Model Shot</span>
                                    </div>
                                    <p className="text-xs text-gray-500 pl-[4.5rem]">Realistic human models holding or wearing your product.</p>
                                </button>
                            </div>
                        )}

                        {/* STEP 2: Configuration (Visible if Mode Selected) */}
                        {studioMode && (
                            <div className="animate-fadeIn relative">
                                <div className="flex items-center mb-4 -ml-2"> 
                                    <button onClick={() => {
                                            setStudioMode(null);
                                            setSelectedPrompt(null);
                                            setCategory(''); setBrandStyle(''); setVisualType('');
                                            setModelType(''); setModelRegion(''); setSkinTone(''); setBodyType('');
                                            setModelComposition(''); setModelFraming('');
                                        }} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <ArrowLeftIcon className="w-4 h-4" /> Back to Mode
                                    </button>
                                </div>

                                {((studioMode === 'product' && !category) || (studioMode === 'model' && !modelType) || isAnalyzing || isAnalyzingModel) && (
                                    <div className={`transition-all duration-300 mb-6`}>
                                        {(isAnalyzing || isAnalyzingModel) ? (
                                            <div className="p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border border-gray-100 opacity-50">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generating Suggestions...</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-3 ml-1">
                                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Suggestions</label>
                                                    {selectedPrompt ? (
                                                        <button onClick={() => setSelectedPrompt(null)} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear Selection</button>
                                                    ) : (
                                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded-full font-bold tracking-wide">RECOMMENDED</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {(studioMode === 'model' ? suggestedModelPrompts : suggestedPrompts).map((promptItem, idx) => {
                                                        const isModel = studioMode === 'model';
                                                        const displayText = isModel ? (promptItem as any).display : promptItem;
                                                        const promptValue = isModel ? (promptItem as any).prompt : promptItem;

                                                        return (
                                                            <button 
                                                                key={idx} 
                                                                onClick={() => handlePromptSelect(promptValue)}
                                                                style={!selectedPrompt ? { animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' } : {}}
                                                                className={`group relative w-auto inline-flex rounded-full p-[2px] transition-all duration-300 transform active:scale-95 ${!selectedPrompt && 'animate-[fadeInUp_0.5s_ease-out]'} ${
                                                                    selectedPrompt === promptValue ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
                                                                }`}
                                                            >
                                                                <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 ${selectedPrompt === promptValue ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'} transition-opacity duration-300`}></div>
                                                                <div className={`relative h-full w-full rounded-full flex items-center justify-center px-4 py-2 transition-colors duration-300 ${selectedPrompt === promptValue ? 'bg-transparent' : 'bg-white'}`}>
                                                                    <span className={`text-xs font-medium italic text-left ${selectedPrompt === promptValue ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600'}`}>"{displayText}"</span>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="relative mb-6">
                                        <div className="flex items-center gap-2 py-1">
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">OR CUSTOMIZE</span>
                                            <div className="h-px flex-1 bg-gray-200"></div>
                                        </div>
                                    </div>
                                )}

                                {!selectedPrompt && !isAnalyzing && !isAnalyzingModel && (
                                    <div className="space-y-6 animate-fadeIn">
                                        {studioMode === 'product' ? (
                                            <>
                                                 <div>
                                                     <div className="flex items-center justify-between mb-3 ml-1">
                                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Product Category</label>
                                                        {category && <button onClick={() => { setCategory(''); setBrandStyle(''); setVisualType(''); }} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100 transition-colors">Clear</button>}
                                                     </div>
                                                     <div className="flex flex-wrap gap-2">
                                                        {categories.map(opt => (
                                                            <button key={opt} onClick={() => handleCategorySelect(opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-300 transform ${category === opt ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900 hover:shadow-sm active:scale-95'}`}>{opt}</button>
                                                                ))}
                                                             </div>
                                                        </div>
                                                        {category && <SelectionGrid label="2. Brand Style" options={brandStyles} value={brandStyle} onChange={handleBrandStyleSelect} />}
                                                        {category && brandStyle && <SelectionGrid label="3. Visual Type" options={visualTypes} value={visualType} onChange={setVisualType} />}
                                                    </>
                                                ) : (
                                                    <>
                                                        <SelectionGrid label="1. Composition" options={compositionTypes} value={modelComposition} onChange={setModelComposition} />
                                                        {modelComposition && <SelectionGrid label="2. Model Type" options={modelTypes} value={modelType} onChange={(val) => { setModelType(val); setModelRegion(''); setSkinTone(''); setBodyType(''); setModelFraming(''); }} />}
                                                        {modelType && <SelectionGrid label="3. Region" options={modelRegions} value={modelRegion} onChange={(val) => { setModelRegion(val); setSkinTone(''); setBodyType(''); }} />}
                                                        {modelRegion && <SelectionGrid label="4. Skin Tone" options={skinTones} value={skinTone} onChange={(val) => { setSkinTone(val); setBodyType(''); }} />}
                                                        {skinTone && <SelectionGrid label="5. Body Type" options={bodyTypes} value={bodyType} onChange={(val) => { setBodyType(val); setModelFraming(''); }} />}
                                                        {bodyType && <SelectionGrid label="6. Shot Type" options={shotTypes} value={modelFraming} onChange={setModelFraming} />}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                    </div>
                )
            }
        />
        <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClose={() => setMilestoneBonus(undefined)} />}
        </>
    );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ 
    navigateTo, 
    auth, 
    activeView, 
    setActiveView, 
    openEditProfileModal, 
    isConversationOpen, 
    setIsConversationOpen, 
    appConfig, 
    setAppConfig 
}) => {
    
    const renderContent = () => {
        switch (activeView) {
            case 'home_dashboard':
            case 'dashboard':
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} appConfig={appConfig} />;
            case 'creations':
                return <Creations auth={auth} navigateTo={navigateTo} />;
            case 'studio':
                 return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
            case 'product_studio':
                 return <ProductStudio auth={auth} appConfig={appConfig} />;
            case 'thumbnail_studio':
                 return <StandardFeature title="Thumbnail Studio" description="Create viral thumbnails." icon={<ThumbnailIcon className="w-6 h-6 text-red-500"/>} cost={appConfig?.featureCosts['Thumbnail Studio'] || 2} auth={auth} onGenerate={async (img, p) => await generateThumbnail({ category: 'General', title: p || 'Video', referenceImage: img.base64, subjectA: img.base64 })} />;
            case 'brand_stylist':
                 return <StandardFeature title="Brand Stylist" description="Style transfer for brands." icon={<LightbulbIcon className="w-6 h-6 text-yellow-500"/>} cost={appConfig?.featureCosts['Brand Stylist AI'] || 4} auth={auth} onGenerate={async (img, p) => await generateBrandStylistImage(img.base64, p || '')} />;
            case 'soul':
                 return <StandardFeature title="Magic Soul" description="Merge two subjects." icon={<UsersIcon className="w-6 h-6 text-pink-500"/>} cost={appConfig?.featureCosts['Magic Soul'] || 3} auth={auth} onGenerate={async (img, p) => await generateMagicSoul(img.base64, img.mimeType, img.base64, img.mimeType, p || 'Fantasy', 'Studio')} />;
            case 'colour':
                 return <StandardFeature title="Photo Colour" description="Colourize B&W photos." icon={<PaletteIcon className="w-6 h-6 text-rose-500"/>} cost={appConfig?.featureCosts['Magic Photo Colour'] || 2} auth={auth} onGenerate={async (img) => await colourizeImage(img.base64, img.mimeType, 'restore')} />;
            case 'interior':
                 return <StandardFeature title="Magic Interior" description="Redesign your space." icon={<HomeIcon className="w-6 h-6 text-orange-500"/>} cost={appConfig?.featureCosts['Magic Interior'] || 2} auth={auth} onGenerate={async (img, p) => await generateInteriorDesign(img.base64, img.mimeType, p || 'Modern', 'home', 'Living Room')} />;
            case 'apparel':
                 return <StandardFeature title="Magic Apparel" description="Virtual Try-On." icon={<UsersIcon className="w-6 h-6 text-teal-500"/>} cost={appConfig?.featureCosts['Magic Apparel'] || 3} auth={auth} onGenerate={async (img) => await generateApparelTryOn(img.base64, img.mimeType, [])} />;
            case 'mockup':
                 return <StandardFeature title="Magic Mockup" description="Product Mockups." icon={<MockupIcon className="w-6 h-6 text-indigo-500"/>} cost={appConfig?.featureCosts['Magic Mockup'] || 2} auth={auth} onGenerate={async (img, p) => await generateMockup(img.base64, img.mimeType, p || 'T-Shirt')} />;
            case 'caption':
                 return <CaptionAI auth={auth} appConfig={appConfig} />;
            case 'daily_mission':
                 return <DailyMissionStudio auth={auth} navigateTo={navigateTo} />;
            case 'billing':
                if (auth.user) {
                    return <Billing user={auth.user} setUser={auth.setUser} appConfig={appConfig} />;
                }
                return null;
            case 'admin':
                return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
            default:
                return <DashboardHome user={auth.user} navigateTo={navigateTo} setActiveView={setActiveView} appConfig={appConfig} />;
        }
    };

    return (
        <div className="flex flex-col h-screen bg-white">
             <Header 
                navigateTo={navigateTo} 
                auth={{
                    ...auth, 
                    isDashboard: true, 
                    setActiveView, 
                    openConversation: () => setIsConversationOpen(true)
                }} 
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    user={auth.user} 
                    setUser={auth.setUser} 
                    activeView={activeView} 
                    setActiveView={setActiveView} 
                    navigateTo={navigateTo}
                    appConfig={appConfig}
                />
                <main className="flex-1 overflow-y-auto bg-[#F6F7FA] relative">
                    {renderContent()}
                </main>
            </div>
            {isConversationOpen && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-2xl h-[600px] flex flex-col relative overflow-hidden">
                         <button onClick={() => setIsConversationOpen(false)} className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                         <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                             <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                             </div>
                             <h2 className="text-2xl font-bold mb-2">Magic Conversation</h2>
                             <p className="text-gray-500">Voice mode is active. Speak to interact with the AI assistant.</p>
                         </div>
                    </div>
                </div>
            )}
            <div className="hidden">
                <input ref={useRef(null)} type="file" />
            </div>
        </div>
    );
};

export default DashboardPage;
