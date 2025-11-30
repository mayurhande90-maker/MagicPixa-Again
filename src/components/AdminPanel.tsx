
import React, { useState, useEffect } from 'react';
import { AuthProps, AppConfig, User, Purchase, AuditLog, Announcement, ApiErrorLog } from '../types';
import { 
    getAllUsers, 
    addCreditsToUser, 
    updateAppConfig, 
    getRecentSignups, 
    getRecentPurchases, 
    getTotalRevenue,
    toggleUserBan,
    updateUserPlan,
    getAuditLogs,
    getAnnouncement,
    updateAnnouncement,
    getGlobalFeatureUsage,
    getCreations,
    sendSystemNotification,
    getApiErrorLogs,
    get24HourCreditBurn
} from '../firebase';
import { 
    UsersIcon, 
    CreditCardIcon, 
    ChartBarIcon,
    XIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    FlagIcon,
    AudioWaveIcon,
    ImageIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    DownloadIcon,
    SystemIcon,
    EyeIcon,
    CheckIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// User Detail Modal Component
const UserDetailModal: React.FC<{ 
    user: User; 
    onClose: () => void;
    onViewAs: (u: User) => void; // Prop for impersonation
    onRefresh: () => void; // Prop to refresh user list after action
}> = ({ user, onClose, onViewAs, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(false);
    
    // Actions State
    const [creditsToAdd, setCreditsToAdd] = useState(10);
    const [creditReason, setCreditReason] = useState('Customer Support');
    const [notifMessage, setNotifMessage] = useState('');
    const [notifType, setNotifType] = useState<'info' | 'success' | 'warning'>('info');
    const [newPlanName, setNewPlanName] = useState(user.plan || 'Free');
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'creations') {
            loadCreations();
        }
    }, [activeTab]);

    const loadCreations = async () => {
        setIsLoadingCreations(true);
        try {
            const creations = await getCreations(user.uid);
            setUserCreations(creations);
        } catch (e) {
            console.error("Failed to load user creations", e);
        } finally {
            setIsLoadingCreations(false);
        }
    };

    const handleGrantCredits = async () => {
        if(!user.uid) return;
        setIsActionLoading(true);
        try {
            await addCreditsToUser('ADMIN', user.uid, creditsToAdd, creditReason);
            alert(`Granted ${creditsToAdd} credits successfully.`);
            onRefresh();
        } catch (e) {
            alert("Failed to grant credits.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if(!user.uid || !notifMessage) return;
        setIsActionLoading(true);
        try {
            await sendSystemNotification('ADMIN', user.uid, notifMessage, notifType);
            alert("Notification sent to user dashboard.");
            setNotifMessage('');
        } catch (e) {
            alert("Failed to send notification.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdatePlan = async () => {
        if(!user.uid) return;
        setIsActionLoading(true);
        try {
            await updateUserPlan('ADMIN', user.uid, newPlanName);
            alert(`Plan updated to ${newPlanName}`);
            onRefresh();
        } catch (e) {
            alert("Failed to update plan.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleToggleBan = async () => {
        if (!confirm(user.isBanned ? "Unban this user?" : "Ban this user? They will lose access immediately.")) return;
        setIsActionLoading(true);
        try {
            await toggleUserBan('ADMIN', user.uid, !user.isBanned);
            alert(user.isBanned ? "User Unbanned" : "User Banned");
            onRefresh();
            onClose(); // Close modal on ban
        } catch (e) {
            alert("Action failed.");
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${user.isBanned ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            {user.name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                {user.name}
                                {user.isBanned && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase">Banned</span>}
                            </h2>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">{user.uid}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => onViewAs(user)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            <EyeIcon className="w-4 h-4" /> View As
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <XIcon className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button onClick={() => setActiveTab('overview')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Overview & Actions</button>
                    <button onClick={() => setActiveTab('creations')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'creations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Creations Gallery</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'overview' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Stats */}
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Profile Stats</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Credits</span><span className="text-sm font-bold text-gray-800">{user.credits}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Lifetime Gens</span><span className="text-sm font-bold text-purple-600">{user.lifetimeGenerations || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Total Spent</span><span className="text-sm font-bold text-green-600">₹{user.totalSpent || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Joined</span><span className="text-sm text-gray-800">{user.signUpDate ? new Date((user.signUpDate as any).seconds * 1000).toLocaleDateString() : '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Status</span><span className={`text-sm font-bold ${user.isBanned ? 'text-red-600' : 'text-green-600'}`}>{user.isBanned ? 'Banned' : 'Active'}</span></div>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <button 
                                            onClick={handleToggleBan} 
                                            className={`w-full py-2 rounded-lg text-sm font-bold border transition-colors ${user.isBanned ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}
                                        >
                                            {user.isBanned ? 'Unban User' : 'Ban / Suspend User'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Manual Plan Assignment</h3>
                                    <div className="space-y-3">
                                        <input 
                                            type="text" 
                                            value={newPlanName} 
                                            onChange={(e) => setNewPlanName(e.target.value)} 
                                            className="w-full p-2 border rounded-lg text-sm" 
                                            placeholder="Plan Name (e.g. VIP, Agency)" 
                                        />
                                        <button onClick={handleUpdatePlan} disabled={isActionLoading} className="w-full bg-black text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-800 disabled:opacity-50">Update Plan</button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-6">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Grant Credits</h3>
                                    <div className="space-y-3">
                                        <input type="number" value={creditsToAdd} onChange={(e) => setCreditsToAdd(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" placeholder="Amount" />
                                        <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="Reason (e.g. Refund, Bonus)" />
                                        <button onClick={handleGrantCredits} disabled={isActionLoading} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">Grant Now</button>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Send In-App Notification</h3>
                                    <div className="space-y-3">
                                        <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className="w-full p-2 border rounded-lg text-sm h-20 resize-none" placeholder="Message to user..." />
                                        <div className="flex gap-2">
                                            {['info', 'success', 'warning'].map((t) => (
                                                <button key={t} onClick={() => setNotifType(t as any)} className={`flex-1 py-1 text-xs font-bold rounded capitalize border ${notifType === t ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>{t}</button>
                                            ))}
                                        </div>
                                        <button onClick={handleSendNotification} disabled={isActionLoading || !notifMessage} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">Send Alert</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Gallery
                        <div className="h-full">
                            {isLoadingCreations ? (
                                <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-2 border-blue-500 rounded-full border-t-transparent"></div></div>
                            ) : userCreations.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {userCreations.map((c) => (
                                        <div key={c.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                                            <img src={c.thumbnailUrl || c.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <span className="text-[10px] text-white font-bold">{c.feature}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 mt-10">No creations found.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig, onConfigUpdate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'comms' | 'system'>('overview');
    
    // Overview Data
    const [stats, setStats] = useState<{ revenue: number, signups: User[], purchases: Purchase[] }>({
        revenue: 0, signups: [], purchases: []
    });
    const [burnStats, setBurnStats] = useState({ totalBurn: 0, burn24h: 0 });

    // Users Data
    const [allUsers, setAllUsers] = useState<User[]>([]); 
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [searchTerm, setSearchTerm] = useState('');
    const [sortMode, setSortMode] = useState<'newest' | 'oldest' | 'credits'>('newest');
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
    
    // System Data
    const [systemLogType, setSystemLogType] = useState<'audit' | 'api'>('audit');
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [apiErrors, setApiErrors] = useState<ApiErrorLog[]>([]);
    const [isRefreshingLogs, setIsRefreshingLogs] = useState(false);

    // Feature Config
    const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Other
    const [announcement, setAnnouncement] = useState<Announcement>({ message: '', isActive: false, type: 'info', link: '', displayStyle: 'banner' });
    const [featureUsage, setFeatureUsage] = useState<{feature: string, count: number}[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        if (appConfig) setLocalConfig(JSON.parse(JSON.stringify(appConfig)));
        loadOverview();
        fetchAnnouncement();
    }, [appConfig]);

    // Tab Loaders
    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'system') loadLogs();
        if (activeTab === 'analytics') loadAnalytics();
    }, [activeTab]);

    // Filtering & Sorting
    useEffect(() => {
        let res = [...allUsers];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            res = res.filter(u => 
                u.name?.toLowerCase().includes(lower) || 
                u.email?.toLowerCase().includes(lower) ||
                u.uid === searchTerm
            );
        }
        res.sort((a, b) => {
            if (sortMode === 'credits') return b.credits - a.credits;
            const dateA = a.signUpDate ? (a.signUpDate as any).seconds : 0;
            const dateB = b.signUpDate ? (b.signUpDate as any).seconds : 0;
            return sortMode === 'newest' ? dateB - dateA : dateA - dateB;
        });
        setFilteredUsers(res);
        setCurrentPage(1);
    }, [searchTerm, allUsers, sortMode]);

    const loadOverview = async () => {
        try {
            const [rev, signups, purchases] = await Promise.all([
                getTotalRevenue(),
                getRecentSignups(10),
                getRecentPurchases(10)
            ]);
            setStats({ revenue: rev, signups, purchases });

            const burn24 = await get24HourCreditBurn();
            const allUsersSnap = await getAllUsers();
            let totalAcquired = 0;
            let totalHeld = 0;
            allUsersSnap.forEach(u => {
                totalAcquired += (u.totalCreditsAcquired || u.credits || 0);
                totalHeld += (u.credits || 0);
            });
            const totalBurn = Math.max(0, totalAcquired - totalHeld);
            setBurnStats({ totalBurn, burn24h: burn24 });

        } catch (e) {
            console.error("Failed to load overview", e);
        }
    };

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const users = await getAllUsers();
            setAllUsers(users);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLogs = async () => {
        setIsRefreshingLogs(true);
        if (systemLogType === 'audit') {
            const logs = await getAuditLogs(50);
            setAuditLogs(logs);
        } else {
            const errors = await getApiErrorLogs(50);
            setApiErrors(errors);
        }
        setIsRefreshingLogs(false);
    };

    // Auto-refresh logs
    useEffect(() => {
        let interval: any;
        if (activeTab === 'system') {
            interval = setInterval(loadLogs, 60000); // 1 min
        }
        return () => clearInterval(interval);
    }, [activeTab, systemLogType]);

    const loadAnalytics = async () => {
        const usage = await getGlobalFeatureUsage();
        setFeatureUsage(usage);
    };

    const fetchAnnouncement = async () => {
        const ann = await getAnnouncement();
        if (ann) setAnnouncement(ann);
    };

    // Actions
    const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => {
        if (!localConfig) return;
        setLocalConfig(prev => {
            if(!prev) return null;
            const next = JSON.parse(JSON.stringify(prev));
            if (section === 'featureToggles') next.featureToggles[key] = value;
            return next;
        });
        setHasChanges(true);
    };

    const saveConfig = async () => {
        if (!localConfig) return;
        await updateAppConfig(localConfig);
        onConfigUpdate(localConfig);
        setHasChanges(false);
        alert("Configuration saved.");
    };

    const handleSaveAnnouncement = async () => {
        if(auth.user) await updateAnnouncement(auth.user.uid, announcement);
        alert("Announcement updated.");
    };

    const exportUsersCSV = () => {
        const headers = ["UID", "Name", "Email", "Credits", "Plan", "Joined"];
        const rows = allUsers.map(u => [
            u.uid, u.name, u.email, u.credits, u.plan || 'Free', 
            u.signUpDate ? new Date((u.signUpDate as any).seconds * 1000).toISOString() : ''
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${new Date().toISOString()}.csv`;
        a.click();
    };

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-[#1A1A1E] flex items-center gap-3">
                    <ShieldCheckIcon className="w-8 h-8 text-indigo-600" /> Admin Command
                </h1>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <TabButton id="overview" label="Overview" icon={ChartBarIcon} />
                    <TabButton id="analytics" label="BI & Analytics" icon={ImageIcon} />
                    <TabButton id="users" label="Users" icon={UsersIcon} />
                    <TabButton id="comms" label="Comms" icon={AudioWaveIcon} />
                    <TabButton id="system" label="System" icon={SystemIcon} />
                </div>
            </div>

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-xl"><CreditCardIcon className="w-6 h-6"/></div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
                            <p className="text-2xl font-black text-[#1A1A1E]">₹{stats.revenue.toLocaleString()}</p>
                        </div>
                        
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><UsersIcon className="w-6 h-6"/></div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Users</p>
                            <p className="text-2xl font-black text-[#1A1A1E]">{allUsers.length}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><ImageIcon className="w-6 h-6"/></div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase relative z-10">Lifetime Credit Burn</p>
                            <div className="flex items-end gap-2 relative z-10">
                                <p className="text-2xl font-black text-[#1A1A1E]">{burnStats.totalBurn.toLocaleString()}</p>
                                <span className="text-xs font-bold text-orange-600 mb-1">-{burnStats.burn24h} (24h)</span>
                            </div>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">System</span>
                                </div>
                                <p className="text-lg font-bold">Operational</p>
                            </div>
                            <button onClick={() => setActiveTab('system')} className="text-xs font-bold text-gray-400 hover:text-white mt-4 flex items-center gap-1">
                                View Error Logs →
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Feature Config */}
                        {localConfig && (
                            <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800">Feature Control</h3>
                                    {hasChanges && <button onClick={saveConfig} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold animate-pulse">Save</button>}
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[300px]">
                                    {Object.entries(localConfig.featureToggles || {}).map(([key, enabled]) => (
                                        <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <span className="text-xs font-bold text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                                            <button 
                                                onClick={() => handleConfigChange('featureToggles', key, !enabled)}
                                                className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${enabled ? 'left-6' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Simple Revenue Chart */}
                        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-800 mb-6">Revenue Trend (Mock)</h3>
                            <div className="h-48 flex items-end justify-between gap-2">
                                {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                                    <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer">
                                        <div 
                                            className="w-full bg-blue-100 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500 relative" 
                                            style={{ height: `${h}%` }}
                                        >
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                Day {i+1}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-lg">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><ImageIcon className="w-6 h-6"/></div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Feature Heatmap & Burn Rate</h2>
                                <p className="text-sm text-gray-500">Track which features are consuming the most credits.</p>
                            </div>
                        </div>

                        {featureUsage.length > 0 ? (
                            <div className="space-y-6">
                                {featureUsage.map((item, idx) => {
                                    const max = featureUsage[0].count;
                                    const percent = (item.count / max) * 100;
                                    // Calculate simplistic "burn" (assuming avg 3 credits per gen)
                                    const estimatedBurn = item.count * 3; 
                                    
                                    return (
                                        <div key={item.feature} className="relative group">
                                            <div className="flex justify-between text-sm font-bold mb-2 px-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">{idx + 1}</span>
                                                    <span className="text-gray-800">{item.feature}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-gray-900">{item.count} Gens</span>
                                                    <span className="text-xs text-orange-500 ml-2">~{estimatedBurn} Credits</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-sm group-hover:from-blue-400 group-hover:to-indigo-500 transition-all duration-1000 ease-out" 
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-gray-400 font-medium">No analytics data available yet.</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Retention Cohort (Simulated)</h3>
                        <p className="text-sm text-gray-500 mb-6">User activity retention over the last 4 weeks.</p>
                        <div className="grid grid-cols-5 gap-4 text-center text-xs font-bold">
                            <div className="bg-gray-100 p-2 rounded">Week 1</div>
                            <div className="bg-green-100 text-green-800 p-2 rounded">100%</div>
                            <div className="bg-green-100 text-green-800 p-2 rounded">40%</div>
                            <div className="bg-green-50 text-green-600 p-2 rounded">20%</div>
                            <div className="bg-green-50 text-green-600 p-2 rounded">15%</div>
                            
                            <div className="bg-gray-100 p-2 rounded">Week 2</div>
                            <div className="bg-green-100 text-green-800 p-2 rounded">100%</div>
                            <div className="bg-green-100 text-green-800 p-2 rounded">35%</div>
                            <div className="bg-green-50 text-green-600 p-2 rounded">18%</div>
                            <div className="bg-gray-50 text-gray-300 p-2 rounded">-</div>
                        </div>
                    </div>
                </div>
            )}

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800">User Management</h3>
                            <button onClick={exportUsersCSV} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><DownloadIcon className="w-3 h-3"/> CSV</button>
                        </div>
                        <div className="flex gap-2">
                            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="credits">Most Credits</option>
                            </select>
                            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 w-48"/>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-4">Identity</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Plan</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4 text-right">Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading...</td></tr>
                                ) : currentUsers.map(u => (
                                    <tr key={u.uid} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'bg-red-50' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{u.name?.[0]}</div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{u.name}</p>
                                                    <p className="text-xs text-gray-500">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.isBanned 
                                                ? <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">Banned</span> 
                                                : <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">Active</span>
                                            }
                                        </td>
                                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{u.plan || 'Free'}</span></td>
                                        <td className="p-4 font-mono font-bold">{u.credits}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Impersonate Button */}
                                                <button 
                                                    onClick={() => auth.impersonateUser && auth.impersonateUser(u)} 
                                                    className="p-1.5 hover:bg-indigo-100 rounded text-indigo-600" 
                                                    title="View As User"
                                                >
                                                    <EyeIcon className="w-4 h-4"/>
                                                </button>
                                                
                                                <button onClick={() => setSelectedUserForDetail(u)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600">
                                                    <InformationCircleIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ArrowLeftIcon className="w-4 h-4"/></button>
                        <span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"><ArrowRightIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            )}

            {/* COMMS & SYSTEM TABS (Kept as is) */}
            {activeTab === 'comms' && (
                <div className="max-w-2xl mx-auto animate-fadeIn bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FlagIcon className="w-6 h-6"/></div>
                        <h3 className="text-xl font-bold text-gray-800">Global Announcement</h3>
                    </div>
                    {/* ... (Existing Comms UI) ... */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</label>
                            <textarea value={announcement.message} onChange={(e) => setAnnouncement({...announcement, message: e.target.value})} className="w-full p-4 border border-gray-200 rounded-xl h-24 resize-none" placeholder="e.g. Scheduled maintenance tonight." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link</label>
                            <input type="text" value={announcement.link || ''} onChange={(e) => setAnnouncement({...announcement, link: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl" />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})} className={`flex-1 py-3 rounded-xl font-bold border ${announcement.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{announcement.isActive ? 'Active' : 'Inactive'}</button>
                            <button onClick={handleSaveAnnouncement} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Publish</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex gap-2">
                            <button onClick={() => setSystemLogType('audit')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'audit' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>Admin Audit</button>
                            <button onClick={() => setSystemLogType('api')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${systemLogType === 'api' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:bg-gray-100'}`}>API Errors</button>
                        </div>
                        <button onClick={loadLogs} className="p-2 hover:bg-gray-200 rounded-full" title="Refresh">
                            <div className={`w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full ${isRefreshingLogs ? 'animate-spin' : ''}`}></div>
                        </button>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">{systemLogType === 'audit' ? 'Admin' : 'Endpoint'}</th>
                                    <th className="p-4">{systemLogType === 'audit' ? 'Action' : 'Error'}</th>
                                    <th className="p-4">{systemLogType === 'audit' ? 'Details' : 'User ID'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {systemLogType === 'audit' ? auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                                        <td className="p-4 font-bold text-gray-700">{log.adminEmail}</td>
                                        <td className="p-4"><span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{log.action}</span></td>
                                        <td className="p-4 text-xs text-gray-600 font-mono">{log.details}</td>
                                    </tr>
                                )) : apiErrors.map(err => (
                                    <tr key={err.id} className="hover:bg-red-50/30">
                                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{err.timestamp ? new Date(err.timestamp.seconds * 1000).toLocaleString() : '-'}</td>
                                        <td className="p-4 font-bold text-red-600">{err.endpoint}</td>
                                        <td className="p-4 text-xs text-red-700 font-mono max-w-xs truncate" title={err.error}>{err.error}</td>
                                        <td className="p-4 text-xs text-gray-500 font-mono">{err.userId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedUserForDetail && (
                <UserDetailModal 
                    user={selectedUserForDetail} 
                    onClose={() => setSelectedUserForDetail(null)} 
                    onViewAs={(u) => {
                        auth.impersonateUser && auth.impersonateUser(u);
                        setSelectedUserForDetail(null);
                    }}
                    onRefresh={loadUsers}
                />
            )}
        </div>
    );
};
