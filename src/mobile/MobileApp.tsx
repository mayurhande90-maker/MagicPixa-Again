
import React, { useState, Suspense, lazy } from 'react';
import { User, Page, View, AuthProps, AppConfig, Announcement, BrandKit } from '../types';
import { MobileLayout } from './layouts/MobileLayout';
import AuthModal from '../components/AuthModal';

// Lazy load mobile features
const MobileHome = lazy(() => import('./features/MobileHome').then(m => ({ default: m.MobileHome })));
const MobileFeatures = lazy(() => import('./features/MobileFeatures').then(m => ({ default: m.MobileFeatures })));
const MobileStudio = lazy(() => import('./features/MobileStudio').then(m => ({ default: m.MobileStudio })));
const MobileAdMaker = lazy(() => import('./features/MobileAdMaker').then(m => ({ default: m.MobileAdMaker })));
const MobileHeadshot = lazy(() => import('./features/MobileHeadshot').then(m => ({ default: m.MobileHeadshot })));
const MobileThumbnail = lazy(() => import('./features/MobileThumbnail').then(m => ({ default: m.MobileThumbnail })));
const MobileTogether = lazy(() => import('./features/MobileTogether').then(m => ({ default: m.MobileTogether })));
const MobileCreations = lazy(() => import('./features/MobileCreations').then(m => ({ default: m.MobileCreations })));
const MobileProfile = lazy(() => import('./features/MobileProfile').then(m => ({ default: m.MobileProfile })));

interface MobileAppProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
}

export const MobileApp: React.FC<MobileAppProps> = ({ auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState<View>('home_dashboard');

    // List of tabs that should be kept alive
    const PERSISTENT_TABS: View[] = [
        'home_dashboard',
        'dashboard',
        'studio',
        'brand_stylist',
        'headshot',
        'thumbnail_studio',
        'soul',
        'creations',
        'profile'
    ];

    const renderTabContent = (tab: View) => {
        switch (tab) {
            case 'home_dashboard':
                return <MobileHome auth={auth} setActiveTab={setActiveTab} />;
            case 'dashboard':
                return <MobileFeatures setActiveTab={setActiveTab} appConfig={appConfig} />;
            case 'studio':
                return <MobileStudio auth={auth} appConfig={appConfig} />;
            case 'brand_stylist':
                return <MobileAdMaker auth={auth} appConfig={appConfig} />;
            case 'headshot':
                return <MobileHeadshot auth={auth} appConfig={appConfig} />;
            case 'thumbnail_studio':
                return <MobileThumbnail auth={auth} appConfig={appConfig} />;
            case 'soul':
                return <MobileTogether auth={auth} appConfig={appConfig} />;
            case 'creations':
                return <MobileCreations auth={auth} />;
            case 'profile':
                return <MobileProfile auth={auth} />;
            default:
                return null;
        }
    };

    return (
        <MobileLayout activeTab={activeTab} setActiveTab={setActiveTab} auth={auth}>
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                {PERSISTENT_TABS.map((tab) => (
                    <div 
                        key={tab} 
                        className={`h-full w-full ${activeTab === tab ? 'block' : 'hidden'}`}
                    >
                        {renderTabContent(tab)}
                    </div>
                ))}
            </Suspense>
        </MobileLayout>
    );
};
