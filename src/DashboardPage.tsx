
import React, { useState, useRef, Suspense, lazy } from 'react';
import { User, Page, View, AuthProps, AppConfig } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Billing } from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { ReferralModal } from './components/ReferralModal';
import { 
    FeatureLayout, 
    UploadPlaceholder, 
    TextAreaField, 
    MilestoneSuccessModal, 
    checkMilestone
} from './components/FeatureLayout';
import { 
    saveCreation, 
    deductCredits,
} from './firebase';
import { fileToBase64, Base64File } from './utils/imageUtils';
import { 
    UsersIcon,
    PaletteIcon,
    PencilIcon,
    PixaTogetherIcon,
    PixaRestoreIcon
} from './components/icons';

// --- LAZY LOADED FEATURES ---
// This splits the code so users only download the tools they actually use.
const MagicPhotoStudio = lazy(() => import('./features/MagicPhotoStudio').then(module => ({ default: module.MagicPhotoStudio })));
const MagicInterior = lazy(() => import('./features/MagicInterior').then(module => ({ default: module.MagicInterior })));
const MagicApparel = lazy(() => import('./features/MagicApparel').then(module => ({ default: module.MagicApparel })));
const MagicMockup = lazy(() => import('./features/MagicMockup').then(module => ({ default: module.MagicMockup })));
const DashboardHome = lazy(() => import('./features/DashboardHome').then(module => ({ default: module.DashboardHome })));
const Creations = lazy(() => import('./features/Creations').then(module => ({ default: module.Creations })));
const CaptionAI = lazy(() => import('./features/CaptionAI').then(module => ({ default: module.CaptionAI })));
const DailyMissionStudio = lazy(() => import('./features/DailyMissionStudio').then(module => ({ default: module.DailyMissionStudio })));
const ThumbnailStudio = lazy(() => import('./features/ThumbnailStudio').then(module => ({ default: module.ThumbnailStudio })));
const MerchantStudio = lazy(() => import('./features/MerchantStudio').then(module => ({ default: module.MerchantStudio })));
const BrandStylistAI = lazy(() => import('./features/BrandStylistAI').then(module => ({ default: module.BrandStylistAI })));
const MagicRealty = lazy(() => import('./features/MagicRealty').then(module => ({ default: module.MagicRealty })));
const BrandKitManager = lazy(() => import('./features/BrandKitManager').then(module => ({ default: module.BrandKitManager })));
const SupportCenter = lazy(() => import('./features/SupportCenter').then(module => ({ default: module.SupportCenter })));
const PixaTogether = lazy(() => import('./features/PixaTogether').then(module => ({ default: module.PixaTogether })));
const PixaPhotoRestore = lazy(() => import('./features/PixaPhotoRestore').then(module => ({ default: module.PixaPhotoRestore })));

// Loading Spinner for Suspense Fallback
const PageLoader = () => (
    <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-medium animate-pulse">Loading Feature...</p>
        </div>
    </div>
);

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
            case 'brand_manager':
                return <BrandKitManager auth={auth} />;
            case 'studio':
                 return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
            case 'brand_kit':
                 // Replaced BrandKitAI with MerchantStudio
                 return <MerchantStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'thumbnail_studio':
                 return <ThumbnailStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'brand_stylist':
                 return <BrandStylistAI auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'magic_realty':
                 return <MagicRealty auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'soul':
                 return <PixaTogether auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'colour':
                 return <PixaPhotoRestore auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'interior':
                 return <MagicInterior auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'apparel':
                 return <MagicApparel auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'mockup':
                 return <MagicMockup auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'caption':
                 return <CaptionAI auth={auth} appConfig={appConfig} />;
            case 'daily_mission':
                 return <DailyMissionStudio auth={auth} navigateTo={navigateTo} />;
            case 'support_center':
                 return <SupportCenter auth={auth} />;
            case 'billing':
                if (auth.user) {
                    return <Billing user={auth.user} setUser={auth.setUser} appConfig={appConfig} setActiveView={setActiveView} />;
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
                {/* 
                    FIX: Condition added to set overflow-hidden ONLY for support_center.
                    This prevents double scrolling on Support Center while keeping normal scroll for other pages.
                */}
                <main className={`flex-1 bg-white custom-scrollbar relative ${activeView === 'support_center' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    <Suspense fallback={<PageLoader />}>
                        {renderContent()}
                    </Suspense>
                </main>
            </div>
            
            {showReferralModal && auth.user && (
                <ReferralModal 
                    user={auth.user} 
                    onClose={() => setShowReferralModal(false)} 
                    onClaimSuccess={(updatedUser) => {
                        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
                    }}
                />
            )}
        </div>
    );
};

export default DashboardPage;
