import React, { useState, useRef, Suspense, lazy, useEffect } from 'react';
import { User, Page, View, AuthProps, AppConfig } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { Billing } from './components/Billing';
import { AdminPanel } from './components/AdminPanel';
import { ReferralModal } from './components/ReferralModal';
import { ErrorBoundary } from './components/ErrorBoundary';
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
    PixaTogetherIcon,
    PixaRestoreIcon
} from './components/icons';

// --- LAZY LOADED FEATURES ---
const MagicPhotoStudio = lazy(() => import('./features/MagicPhotoStudio').then(module => ({ default: module.MagicPhotoStudio })));
const MagicInterior = lazy(() => import('./features/MagicInterior').then(module => ({ default: module.MagicInterior })));
const MagicApparel = lazy(() => import('./features/MagicApparel').then(module => ({ default: module.MagicApparel })));
const DashboardHome = lazy(() => import('./features/DashboardHome').then(module => ({ default: module.DashboardHome })));
const Creations = lazy(() => import('./features/Creations').then(module => ({ default: module.Creations })));
const CaptionAI = lazy(() => import('./features/CaptionAI').then(module => ({ default: module.CaptionAI })));
const DailyMissionStudio = lazy(() => import('./features/DailyMissionStudio').then(module => ({ default: module.DailyMissionStudio })));
const ThumbnailStudio = lazy(() => import('./features/ThumbnailStudio').then(module => ({ default: module.ThumbnailStudio })));
const MerchantStudio = lazy(() => import('./features/MerchantStudio').then(module => ({ default: module.MerchantStudio })));
const PixaAdMaker = lazy(() => import('./features/PixaAdMaker').then(module => ({ default: module.PixaAdMaker }))); 
const BrandKitManager = lazy(() => import('./features/BrandKitManager').then(module => ({ default: module.BrandKitManager })));
const SupportCenter = lazy(() => import('./features/SupportCenter').then(module => ({ default: module.SupportCenter })));
const PixaTogether = lazy(() => import('./features/PixaTogether').then(module => ({ default: module.PixaTogether })));
const PixaPhotoRestore = lazy(() => import('./features/PixaPhotoRestore').then(module => ({ default: module.PixaPhotoRestore })));
const PixaHeadshotPro = lazy(() => import('./features/PixaHeadshotPro').then(module => ({ default: module.PixaHeadshotPro })));
const CampaignStudio = lazy(() => import('./features/PixaPlanner').then(module => ({ default: module.PixaPlanner })));
const Profile = lazy(() => import('./features/Profile').then(module => ({ default: module.Profile })));

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

// 3 Minutes for standard users to prevent heavy background OOM crashes
const SESSION_TIMEOUT = 3 * 60 * 1000; 
const MAX_CONCURRENT_SESSIONS = 3;

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
    
    const [activeSessions, setActiveSessions] = useState<View[]>(['home_dashboard']);
    const lastActiveRef = useRef<Record<string, number>>({ 'home_dashboard': Date.now() });

    useEffect(() => {
        setActiveSessions(prev => {
            if (prev.includes(activeView)) {
                lastActiveRef.current[activeView] = Date.now();
                return prev;
            }
            
            // Limit total sessions to prevent memory bloat
            let next = [...prev, activeView];
            if (next.length > MAX_CONCURRENT_SESSIONS) {
                // Remove the oldest non-active session
                const oldestView = next.find(v => v !== activeView);
                next = next.filter(v => v !== oldestView);
            }
            
            lastActiveRef.current[activeView] = Date.now();
            return next;
        });
    }, [activeView]);

    const handleViewChange = (newView: View) => {
        setActiveView(newView);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setActiveSessions(prev => {
                const next = prev.filter(viewId => {
                    if (viewId === activeView) return true;
                    const lastActive = lastActiveRef.current[viewId] || 0;
                    return (now - lastActive < SESSION_TIMEOUT);
                });

                return next.length !== prev.length ? next : prev;
            });
        }, 30000);

        return () => clearInterval(interval);
    }, [activeView]);

    const renderFeatureComponent = (viewId: View) => {
        console.log(`[DashboardPage] Rendering feature: ${viewId}`);
        switch (viewId) {
            case 'home_dashboard':
            case 'dashboard':
                return (
                    <ErrorBoundary name="Dashboard Home">
                        <DashboardHome 
                            user={auth.user} 
                            navigateTo={navigateTo} 
                            setActiveView={handleViewChange} 
                            appConfig={appConfig} 
                            openReferralModal={() => setShowReferralModal(true)}
                        />
                    </ErrorBoundary>
                );
            case 'creations':
                return (
                    <ErrorBoundary name="Creations">
                        <Creations auth={auth} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'brand_manager':
                return (
                    <ErrorBoundary name="Brand Kit Manager">
                        <BrandKitManager auth={auth} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'campaign_studio':
                return (
                    <ErrorBoundary name="Campaign Studio (PixaPlanner)">
                        <CampaignStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'studio':
                return (
                    <ErrorBoundary name="Magic Photo Studio">
                        <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />
                    </ErrorBoundary>
                );
            case 'brand_kit':
                return (
                    <ErrorBoundary name="Merchant Studio (Ecommerce Kit)">
                        <MerchantStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'thumbnail_studio':
                return (
                    <ErrorBoundary name="Thumbnail Studio">
                        <ThumbnailStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'brand_stylist':
                return (
                    <ErrorBoundary name="Pixa Ad Maker">
                        <PixaAdMaker auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'soul':
                return (
                    <ErrorBoundary name="Pixa Together">
                        <PixaTogether auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'colour':
                return (
                    <ErrorBoundary name="Pixa Photo Restore">
                        <PixaPhotoRestore auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'interior':
                return (
                    <ErrorBoundary name="Magic Interior">
                        <MagicInterior auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'apparel':
                return (
                    <ErrorBoundary name="Magic Apparel">
                        <MagicApparel auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'caption':
                return (
                    <ErrorBoundary name="Caption AI">
                        <CaptionAI auth={auth} appConfig={appConfig} />
                    </ErrorBoundary>
                );
            case 'headshot':
                return (
                    <ErrorBoundary name="Pixa Headshot Pro">
                        <PixaHeadshotPro auth={auth} appConfig={appConfig} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'daily_mission':
                return (
                    <ErrorBoundary name="Daily Mission Studio">
                        <DailyMissionStudio auth={auth} navigateTo={navigateTo} />
                    </ErrorBoundary>
                );
            case 'support_center':
                return (
                    <ErrorBoundary name="Support Center">
                        <SupportCenter auth={auth} appConfig={appConfig} />
                    </ErrorBoundary>
                );
            case 'billing':
                if (auth.user) {
                    return (
                        <ErrorBoundary name="Billing">
                            <Billing user={auth.user} setUser={auth.setUser} appConfig={appConfig} setActiveView={handleViewChange} />
                        </ErrorBoundary>
                    );
                }
                return null;
            case 'admin':
                return (
                    <ErrorBoundary name="Admin Panel">
                        <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />
                    </ErrorBoundary>
                );
            case 'profile':
                return (
                    <ErrorBoundary name="Profile">
                        <Profile auth={auth} />
                    </ErrorBoundary>
                );
            default:
                return null;
        }
    };

    const standardViews: View[] = ['home_dashboard', 'dashboard', 'creations', 'brand_manager', 'campaign_studio', 'brand_kit', 'billing', 'admin', 'profile'];
    const isStandardView = standardViews.includes(activeView);

    return (
        <div className="flex flex-col h-screen bg-white">
             <Header 
                navigateTo={navigateTo} 
                auth={{
                    ...auth, 
                    isDashboard: true, 
                    setActiveView: handleViewChange,
                }} 
            />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    user={auth.user}
                    setUser={auth.setUser}
                    activeView={activeView}
                    setActiveView={handleViewChange}
                    navigateTo={navigateTo}
                    appConfig={appConfig}
                    openReferralModal={() => setShowReferralModal(true)}
                />
                
                <main className={`flex-1 bg-white custom-scrollbar relative ${isStandardView ? 'overflow-y-auto' : 'overflow-hidden'}`}>
                    <Suspense fallback={<PageLoader />}>
                        {activeSessions.map(viewId => {
                            const isViewStandard = standardViews.includes(viewId);
                            return (
                                <div 
                                    key={viewId} 
                                    style={{ 
                                        display: activeView === viewId ? 'block' : 'none',
                                        height: isViewStandard ? 'auto' : '100%',
                                        width: '100%' 
                                    }}
                                >
                                    {renderFeatureComponent(viewId)}
                                </div>
                            );
                        })}
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