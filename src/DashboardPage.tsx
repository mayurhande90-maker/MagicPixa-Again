import React, { useState, useRef, Suspense, lazy, useEffect } from 'react';
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
import { fileToBase64, Base64File, resizeImage } from './utils/imageUtils';
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
        switch (viewId) {
            case 'home_dashboard':
            case 'dashboard':
                return <DashboardHome 
                        user={auth.user} 
                        navigateTo={navigateTo} 
                        setActiveView={handleViewChange} 
                        appConfig={appConfig} 
                        openReferralModal={() => setShowReferralModal(true)}
                        />;
            case 'creations':
                return <Creations auth={auth} navigateTo={navigateTo} />;
            case 'brand_manager':
                return <BrandKitManager auth={auth} navigateTo={navigateTo} />;
            case 'campaign_studio':
                return <CampaignStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'studio':
                 return <MagicPhotoStudio auth={auth} navigateTo={navigateTo} appConfig={appConfig} />;
            case 'brand_kit':
                 return <MerchantStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'thumbnail_studio':
                 return <ThumbnailStudio auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'brand_stylist':
                 return <PixaAdMaker auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'soul':
                 return <PixaTogether auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'colour':
                 return <PixaPhotoRestore auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'interior':
                 return <MagicInterior auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'apparel':
                 return <MagicApparel auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'caption':
                 return <CaptionAI auth={auth} appConfig={appConfig} />;
            case 'headshot':
                 return <PixaHeadshotPro auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
            case 'daily_mission':
                 return <DailyMissionStudio auth={auth} navigateTo={navigateTo} />;
            case 'support_center':
                 return <SupportCenter auth={auth} appConfig={appConfig} />;
            case 'billing':
                if (auth.user) {
                    return <Billing user={auth.user} setUser={auth.setUser} appConfig={appConfig} setActiveView={handleViewChange} />;
                }
                return null;
            case 'admin':
                return <AdminPanel auth={auth} appConfig={appConfig} onConfigUpdate={setAppConfig} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white">
             <Header 
                navigateTo={navigateTo} 
                auth={{
                    ...auth, 
                    isDashboard: true, 
                    setActiveView: handleViewChange,
                }} 
            />
            <div className="flex flex-1">
                <Sidebar 
                    user={auth.user}
                    setUser={auth.setUser}
                    activeView={activeView}
                    setActiveView={handleViewChange}
                    navigateTo={navigateTo}
                    appConfig={appConfig}
                    openReferralModal={() => setShowReferralModal(true)}
                />
                
                <main className="flex-1 bg-white relative">
                    <Suspense fallback={<PageLoader />}>
                        {activeSessions.map(viewId => (
                            <div 
                                key={viewId} 
                                style={{ 
                                    display: activeView === viewId ? 'block' : 'none',
                                    width: '100%' 
                                }}
                            >
                                {renderFeatureComponent(viewId)}
                            </div>
                        ))}
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
