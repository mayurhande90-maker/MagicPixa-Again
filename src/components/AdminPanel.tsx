
import React, { useState, useEffect } from 'react';
import { AuthProps, AppConfig, User, Purchase, AuditLog, Announcement } from '../types';
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
    getCreations // Added for user details
} from '../firebase';
import { 
    UsersIcon, 
    CreditCardIcon, 
    CogIcon, 
    ChartBarIcon,
    PlusIcon,
    CheckIcon,
    XIcon,
    ShieldCheckIcon,
    InformationCircleIcon,
    TrashIcon,
    FlagIcon,
    AudioWaveIcon, // Placeholder for Announcement Icon
    DocumentTextIcon, // Placeholder for Logs
    ImageIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// User Detail Modal Component
const UserDetailModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(false);

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

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                            {user.name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview & History
                    </button>
                    <button 
                        onClick={() => setActiveTab('creations')} 
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'creations' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Creations Gallery
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {activeTab === 'overview' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Stats Cards */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account Status</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Plan</span>
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{user.plan || 'Free'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Credits</span>
                                        <span className="text-sm font-bold text-gray-800">{user.credits}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Total Spent</span>
                                        <span className="text-sm font-bold text-green-600">₹{user.totalSpent || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Joined</span>
                                        <span className="text-sm text-gray-800">{user.signUpDate ? new Date((user.signUpDate as any).seconds * 1000).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Last Active</span>
                                        <span className="text-sm text-gray-800">
                                            {user.lastActive ? new Date((user.lastActive as any).seconds * 1000).toLocaleString() : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Engagement */}
                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Engagement</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Generations</span>
                                        <span className="text-sm font-bold text-purple-600">{user.lifetimeGenerations || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Referrals</span>
                                        <span className="text-sm font-bold text-indigo-600">{user.referralCount || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-gray-600">Referral Code</span>
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.referralCode || '-'}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Creations Gallery
                        <div className="h-full">
                            {isLoadingCreations ? (
                                <div className="flex justify-center items-center h-40">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                                </div>
                            ) : userCreations.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {userCreations.map((creation) => (
                                        <div key={creation.id} className="relative group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 aspect-square">
                                            <img 
                                                src={creation.thumbnailUrl || creation.imageUrl} 
                                                alt={creation.feature} 
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{creation.feature}</span>
                                                <span className="text-[9px] text-gray-300">
                                                    {creation.createdAt ? new Date((creation.createdAt as any).seconds * 1000).toLocaleDateString() : ''}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                    <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                                    <p className="text-sm">No creations found for this user.</p>
                                </div>
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
        revenue: 0,
        signups: [],
        purchases: []
    });

    // Users Data
    const [allUsers, setAllUsers] = useState<User[]>([]); 
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUserForDetail, setSelectedUserForDetail] = useState<User | null>(null);
    
    // Credit Grant Modal
    const [creditModalUser, setCreditModalUser] = useState<string | null>(null); 
    const [creditAmount, setCreditAmount] = useState(10);
    const [creditReason, setCreditReason] = useState('Support Adjustment');

    // Config Data
    const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Advanced Features Data
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [announcement, setAnnouncement] = useState<Announcement>({ message: '', isActive: false, type: 'info' });
    const [featureUsage, setFeatureUsage] = useState<{feature: string, count: number}[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (appConfig) setLocalConfig(JSON.parse(JSON.stringify(appConfig)));
        // Initial Fetch
        loadOverview();
        fetchAnnouncement();
    }, [appConfig]);

    // Tab-Specific Loaders
    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'system') loadAuditLogs();
        if (activeTab === 'analytics') loadAnalytics();
    }, [activeTab]);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFilteredUsers(allUsers.filter(u => 
            u.name?.toLowerCase().includes(lower) || 
            u.email?.toLowerCase().includes(lower) ||
            u.uid === searchTerm
        ));
    }, [searchTerm, allUsers]);

    const loadOverview = async () => {
        try {
            const [rev, signups, purchases] = await Promise.all([
                getTotalRevenue(),
                getRecentSignups(10),
                getRecentPurchases(10)
            ]);
            setStats({ revenue: rev, signups, purchases });
        } catch (e) {
            console.error("Failed to load admin stats", e);
        }
    };

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const users = await getAllUsers();
            setAllUsers(users);
        } catch (e) {
            console.error("Failed to load users", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        const logs = await getAuditLogs();
        setAuditLogs(logs);
    };

    const loadAnalytics = async () => {
        const usage = await getGlobalFeatureUsage();
        setFeatureUsage(usage);
    };

    const fetchAnnouncement = async () => {
        const ann = await getAnnouncement();
        if (ann) setAnnouncement(ann);
    };

    // --- ACTIONS ---

    const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => {
        if (!localConfig) return;
        if (section === 'featureCosts' || section === 'featureToggles') {
             setLocalConfig(prev => {
                if(!prev) return null;
                return { ...prev, [section]: { ...prev[section], [key]: value } }
            });
        }
        setHasChanges(true);
    };

    const saveConfig = async () => {
        if (!localConfig) return;
        setIsLoading(true);
        try {
            await updateAppConfig(localConfig);
            onConfigUpdate(localConfig);
            setHasChanges(false);
            alert("Configuration saved!");
        } catch (e) {
            console.error(e);
            alert("Failed to save.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGrantCredits = async () => {
        if (!creditModalUser || !auth.user) return;
        setIsLoading(true);
        try {
            await addCreditsToUser(auth.user.uid, creditModalUser, creditAmount, creditReason);
            alert(`Added ${creditAmount} credits.`);
            setCreditModalUser(null);
            loadUsers(); 
        } catch (e) {
            console.error(e);
            alert("Failed to grant credits.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleBan = async (user: User) => {
        if (!auth.user) return;
        if (confirm(`Are you sure you want to ${user.isBanned ? 'UNBAN' : 'BAN'} ${user.email}?`)) {
            await toggleUserBan(auth.user.uid, user.uid, !user.isBanned);
            loadUsers(); // Refresh
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!auth.user) return;
        await updateAnnouncement(auth.user.uid, announcement);
        alert("Announcement updated!");
    };

    // Simple Render Helpers
    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === id 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
        >
            {Icon && <Icon className={`w-4 h-4 ${activeTab === id ? 'text-indigo-200' : 'text-gray-400'}`} />}
            {label}
        </button>
    );

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-[#1A1A1E] flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200">
                        <ShieldCheckIcon className="w-6 h-6"/>
                    </div>
                    Admin Command
                </h1>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <TabButton id="overview" label="Overview" icon={ChartBarIcon} />
                    <TabButton id="analytics" label="Analytics" icon={ImageIcon} />
                    <TabButton id="users" label="Users" icon={UsersIcon} />
                    <TabButton id="comms" label="Comms" icon={AudioWaveIcon} />
                    <TabButton id="system" label="System" icon={DocumentTextIcon} />
                </div>
            </div>

            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-green-100 rounded-xl text-green-600"><CreditCardIcon className="w-8 h-8"/></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                                <p className="text-3xl font-black text-[#1A1A1E]">₹{stats.revenue.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                            <div className="p-4 bg-blue-100 rounded-xl text-blue-600"><UsersIcon className="w-8 h-8"/></div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Users</p>
                                <p className="text-3xl font-black text-[#1A1A1E]">{stats.signups.length} <span className="text-xs font-medium text-gray-400">last 10</span></p>
                            </div>
                        </div>
                        {/* Config Panel Shortcut */}
                        <div className="bg-gradient-to-br from-gray-800 to-black p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Status</p>
                                    <p className="text-xl font-bold mt-1">Operational</p>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                            </div>
                            <button onClick={() => {}} className="text-xs font-bold text-gray-400 hover:text-white mt-4 flex items-center gap-1">
                                View Server Logs →
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800">Recent Activity</h3></div>
                            <div className="divide-y divide-gray-100">
                                {stats.purchases.map(p => (
                                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{p.packName}</p>
                                            <p className="text-xs text-gray-500">{p.userEmail}</p>
                                        </div>
                                        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+₹{p.amountPaid}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {localConfig && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-800">Quick Config</h3>
                                    {hasChanges && <button onClick={saveConfig} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>}
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {Object.entries(localConfig.featureToggles || {}).map(([key, enabled]) => (
                                        <div key={key} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                                            <span className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                            <button 
                                                onClick={() => handleConfigChange('featureToggles', key, !enabled)}
                                                className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${enabled ? 'left-4.5' : 'left-0.5'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- ANALYTICS TAB --- */}
            {activeTab === 'analytics' && (
                <div className="animate-fadeIn space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Feature Heatmap (Usage)</h3>
                        {featureUsage.length > 0 ? (
                            <div className="space-y-4">
                                {featureUsage.map((item, idx) => {
                                    const max = featureUsage[0].count;
                                    const percent = (item.count / max) * 100;
                                    return (
                                        <div key={item.feature} className="relative">
                                            <div className="flex justify-between text-xs font-bold mb-1 px-1">
                                                <span className="text-gray-700">{item.feature}</span>
                                                <span className="text-gray-500">{item.count} gens</span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">No usage data available yet.</p>
                        )}
                    </div>
                </div>
            )}

            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">User Management ({filteredUsers.length})</h3>
                        <input 
                            type="text" 
                            placeholder="Search by name, email, UID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-4">Identity</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Engagement</th>
                                    <th className="p-4 text-right">Controls</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading users...</td></tr>
                                ) : filteredUsers.map(u => (
                                    <tr key={u.uid} className={`hover:bg-gray-50 transition-colors ${u.isBanned ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {u.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{u.name}</p>
                                                    <p className="text-xs text-gray-500">{u.email}</p>
                                                    <p className="text-[9px] text-gray-300 font-mono mt-0.5 cursor-pointer hover:text-gray-500" title={u.uid} onClick={() => navigator.clipboard.writeText(u.uid)}>{u.uid.substring(0,8)}...</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.isBanned ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">BANNED</span>
                                            ) : (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{u.plan || 'Free'}</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-700">{u.credits}</td>
                                        <td className="p-4">
                                            <div className="text-xs">
                                                <span className="text-gray-500">Gens:</span> <b>{u.lifetimeGenerations || 0}</b>
                                            </div>
                                            <div className="text-xs mt-1">
                                                <span className="text-gray-500">Refs:</span> <b>{u.referralCount || 0}</b>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => setSelectedUserForDetail(u)}
                                                    className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                                    title="View Details & Gallery"
                                                >
                                                    <InformationCircleIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => setCreditModalUser(u.uid)}
                                                    className="p-1.5 hover:bg-green-100 rounded text-gray-500 hover:text-green-600 transition-colors"
                                                    title="Grant Credits"
                                                >
                                                    <PlusIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleBan(u)}
                                                    className={`p-1.5 rounded transition-colors ${u.isBanned ? 'bg-red-600 text-white' : 'hover:bg-red-100 text-gray-500 hover:text-red-600'}`}
                                                    title={u.isBanned ? "Unban User" : "Ban User"}
                                                >
                                                    <XIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- COMMS TAB --- */}
            {activeTab === 'comms' && (
                <div className="animate-fadeIn max-w-2xl mx-auto">
                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FlagIcon className="w-6 h-6"/></div>
                            <h3 className="text-xl font-bold text-gray-800">Global Announcement</h3>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</label>
                                <textarea 
                                    value={announcement.message}
                                    onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-24 resize-none"
                                    placeholder="e.g. Scheduled maintenance tonight at 10 PM."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                    <select 
                                        value={announcement.type}
                                        onChange={(e) => setAnnouncement({...announcement, type: e.target.value as any})}
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Yellow)</option>
                                        <option value="error">Critical (Red)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                    <div className="flex items-center gap-3 h-[46px]">
                                        <button 
                                            onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})}
                                            className={`flex-1 h-full rounded-xl text-sm font-bold transition-all border ${announcement.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}
                                        >
                                            {announcement.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSaveAnnouncement}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg mt-4"
                            >
                                Publish Announcement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800">System Audit Logs</h3></div>
                    <div className="max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Admin</th>
                                    <th className="p-4">Action</th>
                                    <th className="p-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                                            {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}
                                        </td>
                                        <td className="p-4 font-medium text-gray-800">{log.adminEmail}</td>
                                        <td className="p-4">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold font-mono">{log.action}</span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-600 font-mono">{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}
            
            {/* Credit Grant Modal */}
            {creditModalUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-all scale-100">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Grant Credits</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
                                <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason</label>
                                <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setCreditModalUser(null)} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">Cancel</button>
                                <button onClick={handleGrantCredits} disabled={isLoading} className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{isLoading ? '...' : 'Grant'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUserForDetail && (
                <UserDetailModal user={selectedUserForDetail} onClose={() => setSelectedUserForDetail(null)} />
            )}
        </div>
    );
};
