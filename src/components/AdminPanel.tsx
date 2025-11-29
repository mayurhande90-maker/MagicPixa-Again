
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, User, Purchase, AuditLog, ApiErrorLog, Announcement } from '../types';
import { 
    getAllUsers, 
    addCreditsToUser, 
    updateAppConfig, 
    getRecentSignups, 
    getRecentPurchases, 
    getTotalRevenue,
    toggleUserBan,
    updateUserPlan,
    sendSystemNotification,
    getAuditLogs,
    getApiErrorLogs,
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
    AudioWaveIcon,
    DocumentTextIcon,
    ImageIcon,
    EyeIcon,
    AdjustmentsVerticalIcon,
    RegenerateIcon,
    SystemIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// DEFINITIVE LIST OF FEATURES
// Ensures toggles appear even if DB config is partial/missing keys
const KNOWN_FEATURES = [
    'studio',
    'brand_kit',
    'brand_stylist',
    'thumbnail_studio',
    'magic_realty',
    'soul',
    'colour',
    'caption',
    'interior',
    'apparel',
    'mockup',
    'scanner',
    'notes'
];

// User Detail Modal Component
const UserDetailModal: React.FC<{ 
    user: User; 
    onClose: () => void; 
    onViewAs: () => void; 
    adminUid: string;
}> = ({ user, onClose, onViewAs, adminUid }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(false);
    
    // Actions State
    const [manualPlan, setManualPlan] = useState(user.plan || 'Free');
    const [notificationText, setNotificationText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

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

    const handleUpdatePlan = async () => {
        setIsUpdating(true);
        try {
            await updateUserPlan(adminUid, user.uid, manualPlan);
            alert("Plan updated successfully!");
        } catch (e) {
            alert("Failed to update plan.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSendNotification = async () => {
        if(!notificationText.trim()) return;
        setIsUpdating(true);
        try {
            await sendSystemNotification(adminUid, user.uid, notificationText);
            setNotificationText('');
            alert("Notification sent! The user will see it next time they are active.");
        } catch (e) {
            alert("Failed to send notification.");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-fadeIn">
                
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
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onViewAs}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md"
                        >
                            <EyeIcon className="w-3 h-3" /> View As
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <XIcon className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button 
                        onClick={() => setActiveTab('overview')} 
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview & Actions
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
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Stats Cards */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Account Status</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Current Plan</span>
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

                            {/* Admin Controls Area */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <CogIcon className="w-4 h-4 text-gray-500" /> Admin Controls
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Manual Plan */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Manual Tier Assignment</label>
                                        <div className="flex gap-2">
                                            <select 
                                                value={manualPlan}
                                                onChange={(e) => setManualPlan(e.target.value)}
                                                className="flex-1 text-sm p-2 rounded-lg border border-gray-300 outline-none"
                                            >
                                                <option value="Free">Free</option>
                                                <option value="Starter Pack">Starter Pack</option>
                                                <option value="Creator Pack">Creator Pack</option>
                                                <option value="Studio Pack">Studio Pack</option>
                                                <option value="Agency Pack">Agency Pack</option>
                                                <option value="VIP Access">VIP Access</option>
                                                <option value="Influencer">Influencer</option>
                                            </select>
                                            <button 
                                                onClick={handleUpdatePlan} 
                                                disabled={isUpdating}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                Set Plan
                                            </button>
                                        </div>
                                    </div>

                                    {/* Targeted Notification */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Send Targeted Notification</label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={notificationText}
                                                onChange={(e) => setNotificationText(e.target.value)}
                                                placeholder="e.g. Added 50 credits..." 
                                                className="flex-1 text-sm p-2 rounded-lg border border-gray-300 outline-none"
                                            />
                                            <button 
                                                onClick={handleSendNotification} 
                                                disabled={isUpdating || !notificationText}
                                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                            >
                                                Send
                                            </button>
                                        </div>
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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'active' | 'credits_high' | 'spent_high'>('newest');
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
    const [apiErrorLogs, setApiErrorLogs] = useState<ApiErrorLog[]>([]);
    const [announcement, setAnnouncement] = useState<Announcement>({ message: '', isActive: false, type: 'info', displayStyle: 'banner' });
    const [featureUsage, setFeatureUsage] = useState<{feature: string, count: number}[]>([]);

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (appConfig) setLocalConfig(JSON.parse(JSON.stringify(appConfig)));
        loadOverview();
        fetchAnnouncement();
    }, [appConfig]);

    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'system') {
            loadAuditLogs();
            loadApiErrorLogs();
        }
        if (activeTab === 'analytics') loadAnalytics();
    }, [activeTab]);

    // FILTER & SORT LOGIC
    const filteredUsers = useMemo(() => {
        let result = [...allUsers];

        // 1. Search Filter
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(u => 
                u.name?.toLowerCase().includes(lower) || 
                u.email?.toLowerCase().includes(lower) ||
                u.uid === searchTerm
            );
        }

        // 2. Sort Logic
        // Timestamp Helper: Handles Timestamp objects, Date objects, or falls back to 0
        const getTs = (obj: any): number => {
            if (!obj) return 0;
            if (typeof obj.toMillis === 'function') return obj.toMillis();
            if (obj.seconds) return obj.seconds * 1000;
            if (obj instanceof Date) return obj.getTime();
            return 0;
        };

        result.sort((a, b) => {
            const dateA = getTs(a.signUpDate);
            const dateB = getTs(b.signUpDate);
            const activeA = getTs(a.lastActive);
            const activeB = getTs(b.lastActive);

            switch (sortOption) {
                case 'newest': // Descending (Newer dates first) -> B - A
                    return dateB - dateA;
                case 'oldest': // Ascending (Older dates first) -> A - B
                    return dateA - dateB;
                case 'active':
                    return activeB - activeA;
                case 'credits_high':
                    return (b.credits || 0) - (a.credits || 0);
                case 'spent_high':
                    return (b.totalSpent || 0) - (a.totalSpent || 0);
                default:
                    return 0;
            }
        });

        return result;
    }, [allUsers, searchTerm, sortOption]);

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
        setIsLoading(true);
        try {
            const logs = await getAuditLogs();
            setAuditLogs(logs);
        } finally {
            setIsLoading(false);
        }
    };

    const loadApiErrorLogs = async () => {
        try {
            const logs = await getApiErrorLogs();
            setApiErrorLogs(logs);
        } catch (e) { console.error(e) }
    };

    const loadAnalytics = async () => {
        const usage = await getGlobalFeatureUsage();
        setFeatureUsage(usage);
    };

    const fetchAnnouncement = async () => {
        const ann = await getAnnouncement();
        if (ann) setAnnouncement({ ...ann, displayStyle: ann.displayStyle || 'banner' });
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
            // Optimistic UI Update: Flip local state immediately
            setAllUsers(prev => prev.map(u => 
                u.uid === user.uid ? { ...u, isBanned: !u.isBanned } : u
            ));
            
            // Backend Update
            try {
                await toggleUserBan(auth.user.uid, user.uid, !user.isBanned);
            } catch (e) {
                console.error("Ban failed", e);
                alert("Failed to update ban status. Reverting UI.");
                loadUsers(); // Revert on failure
            }
        }
    };

    const handleViewAs = (targetUser: User) => {
        if (auth.impersonateUser) {
            // Confirm just in case
            if (confirm(`You are about to view the dashboard as ${targetUser.name}. Any generation you trigger will count towards THEIR credits. Continue?`)) {
                auth.impersonateUser(targetUser);
            }
        } else {
            alert("Impersonation feature not available.");
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!auth.user) return;
        await updateAnnouncement(auth.user.uid, announcement);
        alert("Announcement updated! It will appear for users immediately.");
    };

    const handleClearAnnouncement = async () => {
        if (!auth.user) return;
        const cleared: Announcement = { ...announcement, isActive: false, message: '' };
        setAnnouncement(cleared);
        await updateAnnouncement(auth.user.uid, cleared);
        alert("Announcement cleared.");
    }

    // Render Helpers
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
        <div className="p-6 max-w-[1600px] mx-auto pb-24">
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
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Signups</p>
                                <p className="text-3xl font-black text-[#1A1A1E]">{stats.signups.length} <span className="text-xs font-medium text-gray-400">last 10</span></p>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-gray-800 to-black p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">System Status</p>
                                    <p className="text-xl font-bold mt-1">Operational</p>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                            </div>
                            <div className="mt-4">
                                <span className="text-xs text-gray-400">{allUsers.length} total users indexed</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/50"><h3 className="font-bold text-gray-800">Recent Purchases</h3></div>
                            <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                {stats.purchases.map(p => (
                                    <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{p.packName}</p>
                                            <p className="text-xs text-gray-500">{p.userEmail}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded block mb-1">+₹{p.amountPaid}</span>
                                            <span className="text-[9px] text-gray-400">{p.purchaseDate ? new Date((p.purchaseDate as any).seconds * 1000).toLocaleDateString() : '-'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {localConfig && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-gray-800">Feature Controls</h3>
                                    {hasChanges && <button onClick={saveConfig} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md hover:bg-green-700 transition-colors">Save Changes</button>}
                                </div>
                                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                                    {/* Use KNOWN_FEATURES to iterate, ensuring all are shown even if missing in DB config */}
                                    {KNOWN_FEATURES.map((key) => {
                                        const enabled = localConfig.featureToggles?.[key] !== false; // Default true
                                        return (
                                            <div key={key} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:shadow-sm transition-all bg-gray-50/50">
                                                <span className="text-xs font-bold capitalize truncate max-w-[120px]" title={key}>{key.replace(/_/g, ' ')}</span>
                                                <button 
                                                    onClick={() => handleConfigChange('featureToggles', key, !enabled)}
                                                    className={`w-9 h-5 rounded-full relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                                >
                                                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${enabled ? 'left-5' : 'left-0.5'}`}></div>
                                                </button>
                                            </div>
                                        );
                                    })}
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
                        <h3 className="text-lg font-bold text-gray-800 mb-6">Feature Usage Heatmap</h3>
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
                                                <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-sm" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                <ChartBarIcon className="w-8 h-8 mx-auto mb-2 opacity-50"/>
                                No usage data available yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- USERS TAB --- */}
            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    
                    {/* Toolbar */}
                    <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-4 bg-gray-50/30">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">User Management</h3>
                            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{filteredUsers.length}</span>
                        </div>
                        
                        <div className="flex gap-3 w-full lg:w-auto">
                            {/* Sort Dropdown */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <AdjustmentsVerticalIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <select 
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value as any)}
                                    className="pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="active">Latest Active</option>
                                    <option value="credits_high">Highest Credits</option>
                                    <option value="spent_high">Top Spenders</option>
                                </select>
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 lg:w-64">
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-4 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200">
                                <tr>
                                    <th className="p-4">Identity</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Stats</th>
                                    <th className="p-4">Last Seen</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">Loading user database...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-gray-400">No users found.</td></tr>
                                ) : filteredUsers.map(u => (
                                    <tr key={u.uid} className={`hover:bg-gray-50 transition-colors group ${u.isBanned ? 'bg-red-50 hover:bg-red-100' : ''}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200 shadow-sm">
                                                    {u.name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                                                    <p className="text-[11px] text-gray-500">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {u.isBanned ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold border border-red-200">BANNED</span>
                                            ) : (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-bold border border-blue-100">{u.plan || 'Free'}</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-mono font-bold text-gray-700">{u.credits}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded w-fit">Gens: {u.lifetimeGenerations || 0}</span>
                                                {u.totalSpent ? <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded w-fit">Paid: ₹{u.totalSpent}</span> : null}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs text-gray-600">
                                                {u.lastActive ? new Date((u.lastActive as any).seconds * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleViewAs(u)}
                                                    className="p-1.5 hover:bg-indigo-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="View As User"
                                                >
                                                    <EyeIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => setSelectedUserForDetail(u)}
                                                    className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                                                    title="Details"
                                                >
                                                    <InformationCircleIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => setCreditModalUser(u.uid)}
                                                    className="p-1.5 hover:bg-green-100 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                                    title="Add Credits"
                                                >
                                                    <PlusIcon className="w-4 h-4"/>
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleBan(u)}
                                                    className={`p-1.5 rounded-lg transition-colors ${u.isBanned ? 'bg-red-100 text-red-600' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}
                                                    title={u.isBanned ? "Unban" : "Ban"}
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

            {/* --- COMMS TAB (ENHANCED) --- */}
            {activeTab === 'comms' && (
                <div className="animate-fadeIn max-w-4xl mx-auto space-y-8">
                    {/* Editor Card */}
                    <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FlagIcon className="w-6 h-6"/></div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Global Communication</h3>
                                <p className="text-sm text-gray-500">Send alerts or announcements to all active users.</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Announcement Text</label>
                                    <textarea 
                                        value={announcement.message}
                                        onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-32 resize-none transition-shadow"
                                        placeholder="e.g. Scheduled maintenance tonight at 10 PM."
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Display Style</label>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setAnnouncement({...announcement, displayStyle: 'banner'})}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${announcement.displayStyle === 'banner' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            Top Banner
                                        </button>
                                        <button 
                                            onClick={() => setAnnouncement({...announcement, displayStyle: 'modal'})}
                                            className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${announcement.displayStyle === 'modal' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                        >
                                            Popup Modal
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alert Level</label>
                                        <select 
                                            value={announcement.type}
                                            onChange={(e) => setAnnouncement({...announcement, type: e.target.value as any})}
                                            className="w-full p-3 border border-gray-200 rounded-xl text-sm font-medium bg-white outline-none cursor-pointer"
                                        >
                                            <option value="info">Info (Blue)</option>
                                            <option value="warning">Warning (Yellow)</option>
                                            <option value="error">Critical (Red)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                        <button 
                                            onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})}
                                            className={`w-full h-[46px] rounded-xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${announcement.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                        >
                                            <div className={`w-2.5 h-2.5 rounded-full shadow-sm transition-colors ${announcement.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                            {announcement.isActive ? 'PUBLISHED' : 'DRAFT'}
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={announcement.link || ''}
                                        onChange={(e) => setAnnouncement({...announcement, link: e.target.value})}
                                        placeholder="https://..."
                                        className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none"
                                    />
                                </div>
                            </div>

                            {/* Right: Live Preview */}
                            <div className="bg-gray-100 rounded-2xl p-4 flex flex-col justify-center items-center relative overflow-hidden border border-gray-200/50">
                                <div className="absolute top-4 left-4 bg-white/80 px-2 py-1 rounded text-[10px] font-bold text-gray-500 uppercase tracking-wide border border-gray-200">
                                    Live Preview
                                </div>
                                
                                {announcement.displayStyle === 'banner' ? (
                                    <div className="w-full space-y-2">
                                        <div className="w-full bg-white h-4 rounded-t-lg opacity-50"></div>
                                        <div className={`w-full py-3 px-4 rounded-lg shadow-sm text-white text-xs font-medium flex items-center justify-center gap-2 ${
                                            announcement.type === 'info' ? 'bg-blue-600' : 
                                            announcement.type === 'warning' ? 'bg-yellow-500' : 'bg-red-600'
                                        }`}>
                                            <InformationCircleIcon className="w-4 h-4"/>
                                            <span className="truncate max-w-[200px]">{announcement.message || "Preview Text"}</span>
                                        </div>
                                        <div className="w-full bg-white h-32 rounded-b-lg opacity-50 p-4">
                                            <div className="w-1/3 h-2 bg-gray-200 rounded mb-2"></div>
                                            <div className="w-2/3 h-2 bg-gray-200 rounded"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200/50 rounded-xl border border-gray-200 relative">
                                        {/* Mock Backdrop */}
                                        <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
                                        {/* Mock Modal */}
                                        <div className="bg-white w-4/5 rounded-xl shadow-lg relative z-10 overflow-hidden">
                                            <div className={`p-4 flex flex-col items-center justify-center border-b ${
                                                announcement.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                announcement.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-600' : 'bg-red-50 border-red-100 text-red-600'
                                            }`}>
                                                <InformationCircleIcon className="w-6 h-6 mb-2"/>
                                                <div className="h-2 w-16 bg-current opacity-20 rounded"></div>
                                            </div>
                                            <div className="p-4 text-center">
                                                <p className="text-xs text-gray-600 mb-4">{announcement.message || "Your message here..."}</p>
                                                <div className="h-8 w-full bg-gray-100 rounded-lg"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
                            <button 
                                onClick={handleClearAnnouncement}
                                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Clear & Disable
                            </button>
                            <button 
                                onClick={handleSaveAnnouncement}
                                className="flex-1 py-3 bg-[#1A1A1E] text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                            >
                                <CheckIcon className="w-5 h-5 text-[#F9D230]"/> Update Announcement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* API Health Log */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-red-800 flex items-center gap-2">
                                <SystemIcon className="w-4 h-4"/> API Failure Log (Last 50)
                            </h3>
                            <button onClick={loadApiErrorLogs} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                                <RegenerateIcon className="w-3 h-3"/> Refresh
                            </button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                                    <tr>
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Endpoint</th>
                                        <th className="p-4">Error</th>
                                        <th className="p-4">User</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading logs...</td></tr>
                                    ) : apiErrorLogs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">No API errors recorded recently.</td></tr>
                                    ) : apiErrorLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-red-50/30">
                                            <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                                                {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '-'}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-700">{log.endpoint}</td>
                                            <td className="p-4 text-xs text-red-600 font-mono break-all">{log.error}</td>
                                            <td className="p-4 text-xs text-gray-500">{log.userId}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Audit Logs */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Admin Audit Trail</h3>
                            <button onClick={loadAuditLogs} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                <RegenerateIcon className="w-3 h-3"/> Refresh
                            </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
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
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">Loading logs...</td></tr>
                                    ) : auditLogs.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-gray-400">No logs found.</td></tr>
                                    ) : auditLogs.map(log => (
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
                </div>
            )}

            {/* --- MODALS --- */}
            
            {/* Credit Grant Modal */}
            {creditModalUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[150] animate-fadeIn">
                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm transform transition-all scale-100 border border-gray-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 text-green-600 rounded-full"><PlusIcon className="w-5 h-5"/></div>
                            <h3 className="text-lg font-bold text-gray-900">Grant Credits</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Amount</label>
                                <input type="number" value={creditAmount} onChange={(e) => setCreditAmount(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reason</label>
                                <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setCreditModalUser(null)} className="flex-1 px-4 py-2 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                                <button onClick={handleGrantCredits} disabled={isLoading} className="flex-1 px-4 py-2 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg shadow-green-200 disabled:opacity-50">{isLoading ? '...' : 'Grant'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* User Detail Modal */}
            {selectedUserForDetail && auth.user && (
                <UserDetailModal 
                    user={selectedUserForDetail} 
                    onClose={() => setSelectedUserForDetail(null)} 
                    onViewAs={() => {
                        handleViewAs(selectedUserForDetail);
                        setSelectedUserForDetail(null);
                    }}
                    adminUid={auth.user.uid}
                />
            )}
        </div>
    );
};
