
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Page, View, AuthProps, AppConfig, Creation } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Billing from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { ReferralModal } from './components/ReferralModal';
import { MagicPhotoStudio } from './features/MagicPhotoStudio';
import { MagicInterior } from './features/MagicInterior';
import { MagicApparel } from './features/MagicApparel';
import { DashboardHome } from './features/DashboardHome';
import { Creations } from './features/Creations';
import { CaptionAI } from './features/CaptionAI';
import { 
    FeatureLayout, 
    UploadPlaceholder, 
    InputField, 
    TextAreaField, 
    MilestoneSuccessModal, 
    checkMilestone
} from './components/FeatureLayout';
import { 
    saveCreation, 
    deductCredits,
    completeDailyMission
} from './firebase';
import { 
    colourizeImage, 
    generateMagicSoul, 
    generateMockup, 
    generateProductPackPlan, 
    editImageWithPrompt,
    generateBrandStylistImage,
    generateThumbnail,
    generateInteriorDesign
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { getDailyMission, isMissionLocked } from './utils/dailyMissions';
import { 
    UploadIcon, 
    SparklesIcon, 
    UsersIcon,
    LightbulbIcon,
    ThumbnailIcon,
    PaletteIcon,
    HomeIcon,
    MockupIcon,
    ProductStudioIcon,
    FlagIcon,
    CheckIcon,
    PencilIcon,
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
                disableScroll={true} // Take control of scrolling to fix layout
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
                     // Fixed Layout Right Panel
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
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span> Powered by Gemini 3
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
                 return <MagicInterior auth={auth} appConfig={appConfig} />;
            case 'apparel':
                 return <MagicApparel auth={auth} appConfig={appConfig} />;
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
