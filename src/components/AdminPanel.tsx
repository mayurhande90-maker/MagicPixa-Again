
import React, { useState } from 'react';
import { AuthProps, AppConfig } from '../types';
import { 
    UsersIcon, 
    CogIcon, 
    ChartBarIcon,
    ShieldCheckIcon,
    AudioWaveIcon,
    SystemIcon,
    StarIcon,
    LifebuoyIcon,
    CloudUploadIcon
} from './icons';
import { AdminStyles } from '../styles/Admin.styles';

// Sub-components
import { AdminOverview } from './admin/AdminOverview';
import { AdminFeedback } from './admin/AdminFeedback';
import { AdminSupport } from './admin/AdminSupport';
import { AdminUsers } from './admin/AdminUsers';
import { AdminComms } from './admin/AdminComms';
import { AdminConfig } from './admin/AdminConfig';
import { AdminSystem } from './admin/AdminSystem';
import { AdminVault } from './admin/AdminVault';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig, onConfigUpdate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'vault' | 'users' | 'support' | 'comms' | 'system' | 'config' | 'feedback'>('overview');

    const TabButton = ({ id, label, icon: Icon }: any) => ( 
        <button 
            onClick={() => setActiveTab(id)} 
            className={`${AdminStyles.tabButton} ${activeTab === id ? AdminStyles.tabActive : AdminStyles.tabInactive}`}
        > 
            <Icon className="w-4 h-4" /> {label} 
        </button> 
    );

    return (
        <div className={AdminStyles.container}>
            {/* Header and Tabs */}
            <div className={AdminStyles.header}>
                <h1 className={AdminStyles.title}><ShieldCheckIcon className="w-8 h-8 text-indigo-600" /> Admin Command</h1>
                <div className={AdminStyles.tabsContainer}>
                    <TabButton id="overview" label="Overview" icon={ChartBarIcon} />
                    <TabButton id="vault" label="Style Vault" icon={CloudUploadIcon} />
                    <TabButton id="feedback" label="Feedback" icon={StarIcon} />
                    <TabButton id="support" label="Support" icon={LifebuoyIcon} />
                    <TabButton id="users" label="Users" icon={UsersIcon} />
                    <TabButton id="comms" label="Comms" icon={AudioWaveIcon} />
                    <TabButton id="config" label="Config" icon={CogIcon} />
                    <TabButton id="system" label="System" icon={SystemIcon} />
                </div>
            </div>

            {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
            {activeTab === 'vault' && <AdminVault auth={auth} />}
            {activeTab === 'feedback' && <AdminFeedback />}
            {activeTab === 'support' && <AdminSupport auth={auth} />}
            {activeTab === 'users' && <AdminUsers auth={auth} appConfig={appConfig} />}
            {activeTab === 'comms' && <AdminComms auth={auth} />}
            {activeTab === 'config' && <AdminConfig appConfig={appConfig} onConfigUpdate={onConfigUpdate} />}
            {activeTab === 'system' && <AdminSystem />}
        </div>
    );
};
