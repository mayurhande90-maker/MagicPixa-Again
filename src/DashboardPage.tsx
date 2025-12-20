
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
import { fileToBase64, Base64File } from './utils/imageUtils';
import { 
    UsersIcon,
    PaletteIcon,
    PencilIcon,
    PixaTogetherIcon,
    PixaRestoreIcon
} from './components/icons';

// --- LAZY LOADED FEATURES ---
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
const PixaAdMaker = lazy(() => import('./features/PixaAdMaker').then(module => ({ default: module.PixaAdMaker }))); // Updated Import
const BrandKitManager = lazy(() => import('./features/BrandKitManager').then(module => ({ default: module.BrandKitManager })));
const SupportCenter = lazy(() => import('./features/SupportCenter').then(module => ({ default: module.SupportCenter })));
const PixaTogether = lazy(() => import('./features/PixaTogether').then(module => ({ default: module.PixaTogether })));
const PixaPhotoRestore = lazy(() => import('./features/PixaPhotoRestore').then(module => ({ default: module.PixaPhotoRestore })));
const PixaHeadshotPro = lazy(() => import('./features/PixaHeadshotPro').then(module => ({ default: module.PixaHeadshotPro })));
const CampaignStudio = lazy(() => import('./features/PixaPlanner').then(module => ({ default: module.PixaPlanner })));

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

// 10 Minutes in Milliseconds
const SESSION_TIMEOUT = 10 * 60 * 1000; 

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
    
    // --- SMART SESSION MANAGEMENT ---
    // Tracks which features are currently 'mounted' in the DOM (hidden or visible)
    const [activeSessions, setActiveSessions] = useState<Set<View>>(new Set(['home_dashboard']));
    // Tracks the last time a view was the 'activeView'
    const lastActiveRef = useRef<Record<string, number>>({ 'home_dashboard': Date.now() });

    // Sync activeView prop changes (e.g. from Home page navigation) to activeSessions
    useEffect(() => {
        setActiveSessions(prev => {
            if (prev.has(activeView)) return prev;
            const next = new Set(prev);
            next.add(activeView);
            lastActiveRef.current[activeView] = Date.now();
            return next;
        });
        // Update timestamp for existing view
        lastActiveRef.current[activeView] = Date.now();
    }, [activeView]);

    // Intercept View Changes to Manage Sessions
    const handleViewChange = (newView: View) => {
        setActiveView(newView);
        // The useEffect above will handle adding it to activeSessions
    };

    // Garbage Collector: Remove inactive sessions to save memory
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setActiveSessions(prev => {
                const next = new Set(prev);
                let hasChanges = false;

                next.forEach(viewId => {
                    // CRITICAL: NEVER kill the view currently on screen
                    if (viewId === activeView) {
                        lastActiveRef.current[viewId] = now; // Refresh timestamp
                        return;
                    }

                    // Check timeout
                    const lastActive = lastActiveRef.current[viewId] || 0;
                    if (now - lastActive > SESSION_TIMEOUT) {
                        console.log(`[Session GC] Killing inactive session: ${viewId}`);
                        next.delete(viewId);
                        hasChanges = true;
                    }
                });

                return hasChanges ? next : prev;
            });
        }, 60000); // Run every 60 seconds

        return () => clearInterval(interval);
    }, [activeView]); // Dependency on activeView ensures we have the latest ref

    // Component Factory
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
            case 'mockup':
                 return <MagicMockup auth={auth} appConfig={appConfig} navigateTo={navigateTo} />;
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
                
                {/* Main Content Area - Supports Multi-Session Rendering */}
                <main className={`flex-1 bg-white custom-scrollbar relative ${activeView === 'support_center' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                    <Suspense fallback={<PageLoader />}>
                        {/* Map over all active sessions and render them. Only the active one is visible. */}
                        {Array.from(activeSessions).map(viewId => (
                            <div 
                                key={viewId} 
                                style={{ 
                                    display: activeView === viewId ? 'block' : 'none',
                                    height: '100%',
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
