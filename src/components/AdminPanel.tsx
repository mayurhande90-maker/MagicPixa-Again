
import React, { useState } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    UsersIcon, 
    CogIcon, 
    ChartBarIcon,
    ShieldCheckIcon,
    AudioWaveIcon,
    ImageIcon,
    SystemIcon,
    StarIcon,
    LifebuoyIcon
} from './icons';

// Sub-components
import { AdminOverview } from './admin/AdminOverview';
import { AdminFeedback } from './admin/AdminFeedback';
import { AdminSupport } from './admin/AdminSupport';
import { AdminAnalytics } from './admin/AdminAnalytics';
import { AdminUsers } from './admin/AdminUsers';
import { AdminComms } from './admin/AdminComms';
import { AdminConfig } from './admin/AdminConfig';
import { AdminSystem } from './admin/AdminSystem';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig, onConfigUpdate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'support' | 'analytics' | 'comms' | 'system' | 'config' | 'feedback'>('overview');

    const TabButton = ({ id, label, icon: Icon }: any) => ( 
        <button 
            onClick={() => setActiveTab(id)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-100'
            }`}
        > 
            <Icon className="w-4 h-4" /> {label} 
        </button> 
    );

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            {/* Header and Tabs */}
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-[#1A1A1E] flex items-center gap-3"><ShieldCheckIcon className="w-8 h-8 text-indigo-600" /> Admin Command</h1>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <TabButton id="overview" label="Overview" icon={ChartBarIcon} />
                    <TabButton id="feedback" label="Feedback" icon={StarIcon} />
                    <TabButton id="support" label="Support" icon={LifebuoyIcon} />
                    <TabButton id="analytics" label="Analytics" icon={ImageIcon} />
                    <TabButton id="users" label="Users" icon={UsersIcon} />
                    <TabButton id="comms" label="Comms" icon={AudioWaveIcon} />
                    <TabButton id="config" label="Config" icon={CogIcon} />
                    <TabButton id="system" label="System" icon={SystemIcon} />
                </div>
            </div>

            {activeTab === 'overview' && <AdminOverview />}
            {activeTab === 'feedback' && <AdminFeedback />}
            {activeTab === 'support' && <AdminSupport auth={auth} />}
            {activeTab === 'analytics' && <AdminAnalytics />}
            {activeTab === 'users' && <AdminUsers auth={auth} appConfig={appConfig} />}
            {activeTab === 'comms' && <AdminComms auth={auth} />}
            {activeTab === 'config' && <AdminConfig appConfig={appConfig} onConfigUpdate={onConfigUpdate} />}
            {activeTab === 'system' && <AdminSystem />}
        </div>
    );
};
