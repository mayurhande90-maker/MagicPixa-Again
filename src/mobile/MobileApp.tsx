
import React, { useState, Suspense, lazy } from 'react';
import { User, Page, View, AuthProps, AppConfig, Announcement, BrandKit } from '../types';
import { MobileLayout } from './layouts/MobileLayout';
import AuthModal from '../components/AuthModal';

// Lazy load mobile features
const MobileHome = lazy(() => import('./features/MobileHome').then(m => ({ default: m.MobileHome })));
const MobileStudio = lazy(() => import('./features/MobileStudio').then(m => ({ default: m.MobileStudio })));
const MobileCreations = lazy(() => import('./features/MobileCreations').then(m => ({ default: m.MobileCreations })));
const MobileProfile = lazy(() => import('./features/MobileProfile').then(m => ({ default: m.MobileProfile })));

interface MobileAppProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
}

export const MobileApp: React.FC<MobileAppProps> = ({ auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState<View>('home_dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'home_dashboard':
                return <MobileHome auth={auth} setActiveTab={setActiveTab} />;
            case 'studio':
                return <MobileStudio auth={auth} appConfig={appConfig} />;
            case 'creations':
                return <MobileCreations auth={auth} />;
            case 'profile':
                return <MobileProfile auth={auth} />;
            default:
                return <MobileHome auth={auth} setActiveTab={setActiveTab} />;
        }
    };

    return (
        <MobileLayout activeTab={activeTab} setActiveTab={setActiveTab} auth={auth}>
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                {renderContent()}
            </Suspense>
        </MobileLayout>
    );
};
