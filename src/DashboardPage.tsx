
import React, { useState, useRef } from 'react';
import { User, Page, View, AuthProps, AppConfig } from './types';
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
import { DailyMissionStudio } from './features/DailyMissionStudio';
import { ThumbnailStudio } from './features/ThumbnailStudio';
import { BrandKitAI } from './features/BrandKitAI';
import { BrandStylistAI } from './features/BrandStylistAI';
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
} from './firebase';
import { 
    colourizeImage, 
    generateMagicSoul, 
    generateMockup, 
} from './services/geminiService';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { 
    SparklesIcon, 
    UsersIcon,
    LightbulbIcon,
    ThumbnailIcon,
    PaletteIcon,
    MockupIcon,
    BrandKitIcon,
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
            case 'brand_kit':
                 return <BrandKitAI auth={auth} appConfig={appConfig} />;
            case 'thumbnail_studio':
                 return <ThumbnailStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'brand_stylist':
                 return <BrandStylistAI auth={auth} appConfig={appConfig} />;
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
