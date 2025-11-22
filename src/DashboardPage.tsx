
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { CreatorRanksModal } from './components/CreatorRanksModal';
import { ReferralModal } from './components/ReferralModal';
import { MagicPhotoStudio } from './features/MagicPhotoStudio';
import { 
    FeatureLayout, 
    UploadPlaceholder, 
    InputField, 
    TextAreaField, 
    ImageModal, 
    MilestoneSuccessModal, 
    checkMilestone
} from './components/FeatureLayout';
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
    generateThumbnail
} from './services/geminiService';
import { fileToBase64, Base64File, downloadImage } from './utils/imageUtils';
import { getDailyMission, isMissionLocked } from './utils/dailyMissions';
import { 
    PhotoStudioIcon, 
    UploadIcon, 
    SparklesIcon, 
    DownloadIcon, 
    TrashIcon, 
    ProjectsIcon,
    UsersIcon,
    LightbulbIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    CaptionIcon,
    ProductStudioIcon,
    ArrowLeftIcon,
    FlagIcon,
    CheckIcon,
    PencilIcon,
    CopyIcon,
    GiftIcon,
    AdjustmentsVerticalIcon,
    InformationCircleIcon
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
        
        // FIX: Strict credit check with fallback for undefined
        if ((auth.user.credits || 0) < cost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

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
    openReferralModal: () => void;
}> = ({ user, navigateTo, setActiveView, appConfig, openReferralModal }) => {
    
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loadingCreations, setLoadingCreations] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [showRanksModal, setShowRanksModal] = useState(false);

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
                        {getGreeting()}, {user?.name}!
                    </h1>
                    <p className="text-gray-500 mt-1">Ready to create something magic today?</p>
                </div>
                
                <button 
                    onClick={openReferralModal}
                    className="md:hidden bg-purple-100 text-purple-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border border-purple-200"
                >
                    <GiftIcon className="w-4 h-4" /> Refer & Earn
                </button>
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
                            <img src={latestCreation.thumbnailUrl || latestCreation.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Latest creation" loading="lazy" />
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
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Loyalty Bonus</p>
                                    <button onClick={() => setShowRanksModal(true)} className="text-gray-500 hover:text-[#4D7CFF] transition-colors">
                                         <InformationCircleIcon className="w-4 h-4" />
                                    </button>
                                </div>
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
            
            {/* Ranks Modal */}
            {showRanksModal && <CreatorRanksModal currentGens={lifetimeGens} onClose={() => setShowRanksModal(false)} />}
        </div>
    );
};

const Creations: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeature, setSelectedFeature] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        if (auth.user) {
            getCreations(auth.user.uid).then(data => {
                setCreations(data as Creation[]);
                setLoading(false);
            });
        }
    }, [auth.user]);

    const uniqueFeatures = useMemo(() => Array.from(new Set(creations.map(c => c.feature))).sort(), [creations]);

    const filteredCreations = useMemo(() => {
        return creations.filter(c => {
            if (selectedFeature && c.feature !== selectedFeature) return false;
            if (selectedDate) {
                // Handle Firebase Timestamp or Date object
                const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
                const dateString = cDate.toISOString().split('T')[0];
                if (dateString !== selectedDate) return false;
            }
            return true;
        });
    }, [creations, selectedFeature, selectedDate]);

    const groupedCreations = useMemo(() => {
        const groups: { title: string; items: Creation[] }[] = [];
        
        filteredCreations.forEach(c => {
            const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let headerKey = cDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            if (cDate.toDateString() === today.toDateString()) {
                headerKey = "Today";
            } else if (cDate.toDateString() === yesterday.toDateString()) {
                headerKey = "Yesterday";
            }

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.title === headerKey) {
                lastGroup.items.push(c);
            } else {
                groups.push({ title: headerKey, items: [c] });
            }
        });
        return groups;
    }, [filteredCreations]);

    const handleDelete = async (e: React.MouseEvent, creation: Creation) => {
        e.stopPropagation();
        if (confirm('Delete this creation?')) {
            if (auth.user) {
                await deleteCreation(auth.user.uid, creation);
                setCreations(prev => prev.filter(c => c.id !== creation.id));
            }
        }
    };

    const handleDownload = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        downloadImage(url, 'creation.png');
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1E]">My Creations</h2>
                    <p className="text-gray-500 mt-1">Manage and view your generated masterpieces.</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <AdjustmentsVerticalIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <select 
                            value={selectedFeature}
                            onChange={(e) => setSelectedFeature(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] appearance-none hover:bg-gray-50 transition-colors cursor-pointer min-w-[160px]"
                        >
                            <option value="">All Features</option>
                            {uniqueFeatures.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                         <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] hover:bg-gray-50 transition-colors cursor-pointer"
                         />
                    </div>

                    {(selectedFeature || selectedDate) && (
                        <button 
                            onClick={() => { setSelectedFeature(''); setSelectedDate(''); }}
                            className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#4D7CFF] rounded-full"></div>
                </div>
            ) : groupedCreations.length > 0 ? (
                <div className="space-y-10">
                    {groupedCreations.map((group) => (
                        <div key={group.title} className="animate-fadeIn">
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-lg font-bold text-gray-800 whitespace-nowrap">{group.title}</h3>
                                <div className="h-px bg-gray-200 w-full"></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {group.items.map(c => (
                                    <div 
                                        key={c.id} 
                                        className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                                        onClick={() => window.open(c.imageUrl, '_blank')}
                                        title="Click to open full resolution in new tab"
                                    >
                                        <img 
                                            src={c.thumbnailUrl || c.imageUrl} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                            alt={c.feature} 
                                            loading="lazy"
                                        />
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                            <button 
                                                onClick={(e) => handleDownload(e, c.imageUrl)} 
                                                className="p-2.5 bg-white/90 rounded-full hover:bg-white text-gray-700 hover:text-[#1A1A1E] transform hover:scale-110 transition-all shadow-lg"
                                                title="Download"
                                            >
                                                <DownloadIcon className="w-5 h-5"/>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, c)} 
                                                className="p-2.5 bg-white/90 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transform hover:scale-110 transition-all shadow-lg"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                        
                                        {/* Info Tag */}
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{c.feature}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <ProjectsIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No creations found</h3>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or generate something new!</p>
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
        
        const cost = appConfig?.featureCosts['Product Studio'] || 5;
        // FIX: Strict credit check with fallback for undefined
        if ((auth.user.credits || 0) < cost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setLoading(true);
        try {
            const res = await generateProductPackPlan([image.base64.base64], productName, "A great product", { colors: [], fonts: []}, "", []);
            setResult(res);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Product Studio');
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
        
        const cost = appConfig?.featureCosts['CaptionAI'] || 1;
        // FIX: Strict credit check with fallback for undefined
        if ((auth.user.credits || 0) < cost) {
            alert("Insufficient credits. Please purchase a pack to continue.");
            return;
        }

        setLoading(true);
        try {
            const res = await generateCaptions(image.base64.base64, image.base64.mimeType);
            setCaptions(res);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'CaptionAI');
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

// --- Mission Success Modal ---
const MissionSuccessModal: React.FC<{ reward: number; onClose: () => void }> = ({ reward, onClose }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
         <div className="relative bg-white w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center transform animate-bounce-slight" onClick={e => e.stopPropagation()}>
             <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                 <CheckIcon className="w-10 h-10 text-green-600" />
             </div>
             
             <h2 className="text-2xl font-bold text-[#1A1A1E] mb-2">Mission Complete!</h2>
             <p className="text-gray-500 mb-6">You've successfully completed the daily challenge.</p>
             
             <div className="bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 font-bold text-3xl py-4 rounded-2xl mb-6 border border-amber-200 shadow-sm">
                 +{reward} Credits
             </div>
             
             <button onClick={onClose} className="w-full bg-[#1A1A1E] text-white font-bold py-3 rounded-xl hover:bg-black transition-colors shadow-lg">
                 Claim Reward
             </button>
         </div>
    </div>
);

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
    const [showReferralModal, setShowReferralModal] = useState(false);

    const renderContent = () => {
        switch (activeView) {
            case 'home_dashboard':
            case 'dashboard':
                return <DashboardHome 
                        user={auth.user} 
                        navigateTo={navigateTo} 
                        setActiveView={setActiveView} 
                        appConfig={appConfig} 
                        openReferralModal={() => setShowReferralModal(true)}
                        />;
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
                return <DashboardHome 
                        user={auth.user} 
                        navigateTo={navigateTo} 
                        setActiveView={setActiveView} 
                        appConfig={appConfig} 
                        openReferralModal={() => setShowReferralModal(true)}
                       />;
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
                    openReferralModal={() => setShowReferralModal(true)}
                />
                <main className="flex-1 overflow-y-auto bg-white custom-scrollbar relative">
                    {renderContent()}
                </main>
            </div>
            
            {showReferralModal && auth.user && (
                <ReferralModal 
                    user={auth.user} 
                    onClose={() => setShowReferralModal(false)} 
                    onClaimSuccess={(updatedUser) => {
                        // Use setUser from auth prop to update global user state immediately
                        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                    }}
                />
            )}
        </div>
    );
};

export default DashboardPage;
