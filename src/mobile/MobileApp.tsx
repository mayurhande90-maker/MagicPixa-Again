
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { User, Page, View, AuthProps, AppConfig, Announcement, BrandKit } from '../types';
import { MobileLayout } from './layouts/MobileLayout';
import { MobileSplashScreen } from './components/MobileSplashScreen';
import AuthModal from '../components/AuthModal';

// Lazy load mobile features
const MobileHome = lazy(() => import('./features/MobileHome').then(m => ({ default: m.MobileHome })));
const MobileFeatures = lazy(() => import('./features/MobileFeatures').then(m => ({ default: m.MobileFeatures })));
const MobileStudio = lazy(() => import('./features/MobileStudio').then(m => ({ default: m.MobileStudio })));
const MobileAdMaker = lazy(() => import('./features/MobileAdMaker').then(m => ({ default: m.MobileAdMaker })));
const MobileEcommerceKit = lazy(() => import('./features/MobileEcommerceKit').then(m => ({ default: m.MobileEcommerceKit })));
const MobileHeadshot = lazy(() => import('./features/MobileHeadshot').then(m => ({ default: m.MobileHeadshot })));
const MobileThumbnail = lazy(() => import('./features/MobileThumbnail').then(m => ({ default: m.MobileThumbnail })));
const MobileTogether = lazy(() => import('./features/MobileTogether').then(m => ({ default: m.MobileTogether })));
const MobileRestore = lazy(() => import('./features/MobileRestore').then(m => ({ default: m.MobileRestore })));
const MobileCaption = lazy(() => import('./features/MobileCaption').then(m => ({ default: m.MobileCaption })));
const MobileCreations = lazy(() => import('./features/MobileCreations').then(m => ({ default: m.MobileCreations })));
const MobileProfile = lazy(() => import('./features/MobileProfile').then(m => ({ default: m.MobileProfile })));
const MobileTryOn = lazy(() => import('./features/MobileTryOn').then(m => ({ default: m.MobileTryOn })));
const MobileInterior = lazy(() => import('./features/MobileInterior').then(m => ({ default: m.MobileInterior })));
const MobileDailyMission = lazy(() => import('./features/MobileDailyMission').then(m => ({ default: m.MobileDailyMission })));
const Billing = lazy(() => import('../components/Billing').then(m => ({ default: m.Billing })));

interface MobileAppProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
}

export const MobileApp: React.FC<MobileAppProps> = ({ auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState<View>('home_dashboard');
    const [showSplash, setShowSplash] = useState(true);
    
    // resetKeys tracks a counter for each tool. 
    // Changing the key of a component forces it to unmount and reset its internal state.
    const [resetKeys, setResetKeys] = useState<Record<string, number>>({});

    // Tabs that stay mounted in the background
    const PERSISTENT_TABS: View[] = [
        'home_dashboard',
        'dashboard',
        'studio',
        'brand_stylist',
        'brand_kit',
        'headshot',
        'thumbnail_studio',
        'soul',
        'colour',
        'caption',
        'creations',
        'profile',
        'apparel',
        'interior',
        'daily_mission',
        'billing'
    ];

    // Triggered by any feature when a user starts a "Generate" task
    const onGenerationStart = (viewId: View) => {
        setResetKeys(prev => {
            const next = { ...prev };
            // We increment the reset key for all OTHER tools.
            // This clears their memory because we are now "starting fresh" in a new tool.
            PERSISTENT_TABS.forEach(tab => {
                if (tab !== viewId && tab !== 'home_dashboard' && tab !== 'creations' && tab !== 'profile' && tab !== 'dashboard') {
                    next[tab] = (next[tab] || 0) + 1;
                }
            });
            return next;
        });
    };

    const renderTabContent = (tab: View) => {
        const commonProps = { 
            auth, 
            appConfig, 
            onGenerationStart: () => onGenerationStart(tab),
            setActiveTab
        };

        switch (tab) {
            case 'home_dashboard':
                return <MobileHome auth={auth} setActiveTab={setActiveTab} />;
            case 'dashboard':
                return <MobileFeatures setActiveTab={setActiveTab} appConfig={appConfig} />;
            case 'studio':
                return <MobileStudio {...commonProps} />;
            case 'brand_stylist':
                return <MobileAdMaker {...commonProps} />;
            case 'brand_kit':
                return <MobileEcommerceKit {...commonProps} />;
            case 'headshot':
                return <MobileHeadshot {...commonProps} />;
            case 'thumbnail_studio':
                return <MobileThumbnail {...commonProps} />;
            case 'soul':
                return <MobileTogether {...commonProps} />;
            case 'colour':
                return <MobileRestore {...commonProps} />;
            case 'caption':
                return <MobileCaption {...commonProps} />;
            case 'apparel':
                return <MobileTryOn {...commonProps} />;
            case 'interior':
                return <MobileInterior {...commonProps} />;
            case 'daily_mission':
                return <MobileDailyMission auth={auth} onGenerationStart={() => onGenerationStart(tab)} setActiveTab={setActiveTab} />;
            case 'creations':
                return <MobileCreations auth={auth} />;
            case 'profile':
                return <MobileProfile auth={auth} appConfig={appConfig} />;
            case 'billing':
                return <div className="h-full overflow-y-auto no-scrollbar pb-10"><Billing user={auth.user!} setUser={auth.setUser} appConfig={appConfig} setActiveView={setActiveTab} /></div>;
            default:
                return null;
        }
    };

    return (
        <>
            {showSplash && <MobileSplashScreen onComplete={() => setShowSplash(false)} />}
            
            <MobileLayout activeTab={activeTab} setActiveTab={setActiveTab} auth={auth}>
                <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                    {PERSISTENT_TABS.map((tab) => (
                        <div 
                            key={`${tab}-${resetKeys[tab] || 0}`} 
                            className={`h-full w-full ${activeTab === tab ? 'block' : 'hidden'}`}
                        >
                            {renderTabContent(tab)}
                        </div>
                    ))}
                </Suspense>
            </MobileLayout>
        </>
    );
};
