
import React, { useState, useEffect } from 'react';
import { AuthProps, AppConfig, User, Purchase, AuditLog, Announcement, ApiErrorLog, CreditPack } from '../types';
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
    get24HourCreditBurn,
    getRevenueStats,
    getUser,
    grantPackageToUser
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
    ImageIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    DownloadIcon,
    SystemIcon,
    EyeIcon,
    TicketIcon,
    StarIcon,
    FilterIcon,
    CalendarIcon,
    GiftIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// ... UserDetailModal Component
const UserDetailModal: React.FC<{ user: User; currentUser: User; onClose: () => void; appConfig: AppConfig | null }> = ({ user: initialUser, currentUser, onClose, appConfig }) => {
    // Maintain local user state to support instant refresh
    const [user, setUser] = useState<User>(initialUser);
    
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [isLoadingCreations, setIsLoadingCreations] = useState(false);
    
    // Actions State
    const [creditsToAdd, setCreditsToAdd] = useState(10);
    const [creditReason, setCreditReason] = useState('Customer Support');
    
    // Package Grant State
    const [selectedPackIndex, setSelectedPackIndex] = useState<string>("");
    const [packMessage, setPackMessage] = useState("Complimentary Upgrade");

    // Notification State
    const [notifTitle, setNotifTitle] = useState(''); // New Title State
    const [notifMessage, setNotifMessage] = useState('');
    const [notifType, setNotifType] = useState<'info' | 'success' | 'warning'>('info');
    const [notifStyle, setNotifStyle] = useState<'banner' | 'pill' | 'toast' | 'modal'>('banner');
    
    const [isActionLoading, setIsActionLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'creations') {
            loadCreations();
        }
    }, [activeTab, user.uid]);

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

    const refreshUserData = async () => {
        try {
            const updatedUser = await getUser(user.uid);
            if (updatedUser) setUser(updatedUser);
        } catch (e) {
            console.error("Failed to refresh user data", e);
        }
    };

    const handleGrantCredits = async () => {
        if(!user.uid || !currentUser.uid) return;
        setIsActionLoading(true);
        try {
            await addCreditsToUser(currentUser.uid, user.uid, creditsToAdd, creditReason);
            alert(`Success! Granted ${creditsToAdd} credits to ${user.name}.`);
            // Refresh to show new balance immediately
            await refreshUserData();
        } catch (e: any) {
            console.error("Grant Credits Error:", e);
            if (e.code === 'permission-denied' || e.message?.includes('permission')) {
                alert("Permission Denied: Please update the 'Firestore Rules' in the Firebase Console.");
            } else {
                alert(`Failed to grant credits: ${e.message}`);
            }
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleGrantPackage = async () => {
        if(!user.uid || !currentUser.uid || selectedPackIndex === "") return;
        
        const pack = appConfig?.creditPacks[parseInt(selectedPackIndex)];
        if (!pack) return;

        setIsActionLoading(true);
        try {
            await grantPackageToUser(currentUser.uid, user.uid, pack, packMessage);
            alert(`Success! Granted ${pack.name} to ${user.name}.`);
            await refreshUserData();
        } catch (e: any) {
            console.error("Grant Package Error:", e);
            alert(`Failed to grant package: ${e.message}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSendNotification = async () => {
        if(!user.uid || !notifMessage || !currentUser.uid) return;
        setIsActionLoading(true);
        try {
            // Pass the selected style and title
            await sendSystemNotification(currentUser.uid, user.uid, notifTitle, notifMessage, notifType, notifStyle);
            alert("Notification sent to user dashboard.");
            setNotifMessage('');
            setNotifTitle(''); // Reset title
        } catch (e) {
            console.error("Notification Error:", e);
            alert("Failed to send notification.");
        } finally {
            setIsActionLoading(false);
        }
    };

    const formatFullDate = (timestamp: any) => {
        if (!timestamp) return 'Never';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
        });
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
                            <p className="text-[10px] text-gray-400 font-mono mt-1">{user.uid}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <XIcon className="w-6 h-6 text-gray-500" />
                    </button>
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
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Total Acquired</span><span className="text-sm font-bold text-gray-800">{user.totalCreditsAcquired || user.credits}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Lifetime Gens</span><span className="text-sm font-bold text-purple-600">{user.lifetimeGenerations || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Total Spent</span><span className="text-sm font-bold text-green-600">₹{user.totalSpent || 0}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Plan</span><span className="text-sm font-bold bg-blue-50 text-blue-600 px-2 rounded">{user.plan || 'Free'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-gray-600">Joined</span><span className="text-sm text-gray-800">{user.signUpDate ? new Date((user.signUpDate as any).seconds * 1000).toLocaleDateString() : '-'}</span></div>
                                        <div className="flex justify-between border-t border-gray-100 pt-2"><span className="text-sm text-gray-600">Last Active</span><span className="text-sm font-bold text-gray-800">{formatFullDate(user.lastActive)}</span></div>
                                    </div>
                                </div>
                                
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Grant Custom Credits</h3>
                                    <div className="space-y-3">
                                        <input type="number" value={creditsToAdd} onChange={(e) => setCreditsToAdd(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm" placeholder="Amount" />
                                        <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="Reason" />
                                        <button onClick={handleGrantCredits} disabled={isActionLoading} className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">
                                            {isActionLoading ? 'Processing...' : 'Grant Now'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-6">
                                {/* Grant Package Section */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <GiftIcon className="w-4 h-4 text-purple-500" />
                                        Grant Package
                                    </h3>
                                    <div className="space-y-3">
                                        <select 
                                            value={selectedPackIndex} 
                                            onChange={(e) => setSelectedPackIndex(e.target.value)} 
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none"
                                        >
                                            <option value="" disabled>Select Package</option>
                                            {appConfig?.creditPacks.map((pack, idx) => (
                                                <option key={idx} value={idx}>{pack.name} ({pack.totalCredits} Cr)</option>
                                            ))}
                                        </select>
                                        <input 
                                            type="text" 
                                            value={packMessage} 
                                            onChange={(e) => setPackMessage(e.target.value)} 
                                            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-purple-500 outline-none" 
                                            placeholder="Custom Message (e.g. Bonus)" 
                                        />
                                        <button 
                                            onClick={handleGrantPackage} 
                                            disabled={isActionLoading || selectedPackIndex === ""} 
                                            className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                        >
                                            {isActionLoading ? 'Processing...' : 'Grant Package'}
                                        </button>
                                        <p className="text-[10px] text-gray-400">
                                            This will update the user's plan name and unlock storage tiers if applicable (Studio/Agency).
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Send In-App Notification</h3>
                                    <div className="space-y-4">
                                        
                                        {/* Title Input */}
                                        <div>
                                            <input 
                                                type="text" 
                                                value={notifTitle} 
                                                onChange={(e) => setNotifTitle(e.target.value)} 
                                                className="w-full p-3 border border-gray-200 rounded-xl text-sm font-bold focus:border-indigo-500 outline-none mb-2" 
                                                placeholder="Title / Headline (e.g. Special Bonus)" 
                                            />
                                            <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl text-sm h-20 resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="Message body..." />
                                        </div>
                                        
                                        {/* Type Selector */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Message Tone</label>
                                            <div className="flex gap-2">
                                                {['info', 'success', 'warning'].map((t) => (
                                                    <button key={t} onClick={() => setNotifType(t as any)} className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize border transition-all ${notifType === t ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Style Selector */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Visual Style</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button onClick={() => setNotifStyle('banner')} className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all ${notifStyle === 'banner' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                    📢 Top Banner
                                                </button>
                                                <button onClick={() => setNotifStyle('pill')} className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all ${notifStyle === 'pill' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                    💊 Floating Pill
                                                </button>
                                                <button onClick={() => setNotifStyle('toast')} className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all ${notifStyle === 'toast' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                    🍞 Corner Toast
                                                </button>
                                                <button onClick={() => setNotifStyle('modal')} className={`py-2 px-3 rounded-lg text-xs font-bold border text-left transition-all ${notifStyle === 'modal' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-gray-200 text-gray-500'}`}>
                                                    🛑 Center Modal
                                                </button>
                                            </div>
                                        </div>

                                        <button onClick={handleSendNotification} disabled={isActionLoading || !notifMessage} className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 transition-all transform active:scale-95">Send Alert</button>
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
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'comms' | 'system' | 'config'>('overview');
    
    // Overview Data
    const [stats, setStats] = useState<{ revenue: number, signups: User[], purchases: Purchase[] }>({
        revenue: 0, signups: [], purchases: []
    });
    const [burnStats, setBurnStats] = useState({ totalBurn: 0, burn24h: 0 });
    const [revenueHistory, setRevenueHistory] = useState<{ date: string; amount: number }[]>([]);

    // Revenue Filter State
    const [revenueFilter, setRevenueFilter] = useState<'7d' | '30d' | '6m' | '1y' | 'lifetime' | 'custom'>('lifetime');
    const [showRevenueFilterMenu, setShowRevenueFilterMenu] = useState(false);
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

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
    const [announcement, setAnnouncement] = useState<Announcement>({ title: '', message: '', isActive: false, type: 'info', link: '', style: 'banner' });
    const [featureUsage, setFeatureUsage] = useState<{feature: string, count: number}[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (appConfig) setLocalConfig(JSON.parse(JSON.stringify(appConfig)));
        loadOverview();
        fetchAnnouncement();
    }, [appConfig]);

    useEffect(() => {
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'system') loadLogs();
        if (activeTab === 'analytics') loadAnalytics();
    }, [activeTab]);

    // Re-fetch revenue when filter changes
    useEffect(() => {
        // Only fetch if not custom, or if custom is fully set. 
        // For standard ranges, fetch immediately.
        if (revenueFilter !== 'custom') {
            fetchRevenueWithFilter();
        }
    }, [revenueFilter]);

    const fetchRevenueWithFilter = async () => {
        let start: Date | undefined;
        let end: Date | undefined = new Date();

        if (revenueFilter === '7d') {
            start = new Date();
            start.setDate(start.getDate() - 7);
        } else if (revenueFilter === '30d') {
            start = new Date();
            start.setDate(start.getDate() - 30);
        } else if (revenueFilter === '6m') {
            start = new Date();
            start.setMonth(start.getMonth() - 6);
        } else if (revenueFilter === '1y') {
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
        } else if (revenueFilter === 'custom') {
            if (customRange.start) start = new Date(customRange.start);
            if (customRange.end) end = new Date(customRange.end);
            // End of day for the end date
            if (end) end.setHours(23, 59, 59, 999);
        } else {
            // Lifetime
            start = undefined;
            end = undefined;
        }

        try {
            const total = await getTotalRevenue(start, end);
            setStats(prev => ({ ...prev, revenue: total }));
        } catch (e) {
            console.error("Failed to fetch filtered revenue", e);
        }
    };

    const applyCustomRange = () => {
        if (customRange.start && customRange.end) {
            setRevenueFilter('custom');
            fetchRevenueWithFilter();
            setShowRevenueFilterMenu(false);
        }
    };

    const loadOverview = async () => {
        try {
            // Default to lifetime revenue initially or whatever state is
            // Note: fetchRevenueWithFilter handles the specific revenue part based on state
            // Here we fetch the other static overview items
            const [signups, purchases, revHistory] = await Promise.all([
                getRecentSignups(10),
                getRecentPurchases(10),
                getRevenueStats(7)
            ]);
            
            // Initial Revenue fetch (defaults to lifetime)
            const rev = await getTotalRevenue();

            setStats({ revenue: rev, signups, purchases });
            setRevenueHistory(revHistory);

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

    // ... (Existing helper functions like loadUsers, loadLogs, etc.) ...
    
    // Helper for user sorting
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

    const formatTableDate = (timestamp: any) => {
        if (!timestamp) return '-';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
            return date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric', 
                minute: '2-digit'
            });
        } catch (e) { return '-'; }
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
        try {
            if (systemLogType === 'audit') {
                const logs = await getAuditLogs(50);
                setAuditLogs(logs);
            } else {
                const errors = await getApiErrorLogs(50);
                setApiErrors(errors);
            }
        } catch (e) {
            console.error("Logs permission error", e);
        }
        setIsRefreshingLogs(false);
    };

    useEffect(() => {
        let interval: any;
        if (activeTab === 'system') {
            interval = setInterval(loadLogs, 60000); 
        }
        return () => clearInterval(interval);
    }, [activeTab, systemLogType]);

    const loadAnalytics = async () => {
        const usage = await getGlobalFeatureUsage();
        setFeatureUsage(usage);
    };

    const fetchAnnouncement = async () => {
        const ann = await getAnnouncement();
        if (ann) {
            setAnnouncement({
                title: ann.title ?? '',
                message: ann.message ?? '',
                isActive: ann.isActive ?? false,
                type: ann.type ?? 'info',
                link: ann.link ?? '',
                style: ann.style ?? 'banner'
            });
        }
    };

    const handleConfigChange = (section: keyof AppConfig, key: string, value: any) => {
        if (!localConfig) return;
        setLocalConfig(prev => {
            if(!prev) return null;
            const next = JSON.parse(JSON.stringify(prev));
            if (section === 'featureToggles') {
                next.featureToggles[key] = value;
            } else if (section === 'featureCosts') {
                next.featureCosts[key] = value;
            }
            return next;
        });
        setHasChanges(true);
    };

    const removeCostKey = (key: string) => {
        if (!localConfig) return;
        if (confirm(`Are you sure you want to remove the pricing for "${key}"? This will be deleted from the database configuration.`)) {
            setLocalConfig(prev => {
                if (!prev) return null;
                const next = JSON.parse(JSON.stringify(prev));
                delete next.featureCosts[key];
                return next;
            });
            setHasChanges(true);
        }
    };

    const handlePackChange = (index: number, field: keyof CreditPack, value: any) => {
        if (!localConfig) return;
        setLocalConfig(prev => {
            if (!prev) return null;
            const next = JSON.parse(JSON.stringify(prev));
            const pack = next.creditPacks[index];
            pack[field] = value;
            
            if (field === 'credits' || field === 'bonus') {
                pack.totalCredits = (parseInt(pack.credits) || 0) + (parseInt(pack.bonus) || 0);
            }
            
            const newCredits = field === 'credits' ? value : pack.credits;
            const newBonus = field === 'bonus' ? value : pack.bonus;
            const newPrice = field === 'price' ? value : pack.price;
            const total = (parseInt(newCredits) || 0) + (parseInt(newBonus) || 0);
            
            if (total > 0 && newPrice > 0) {
                 pack.value = parseFloat((newPrice / total).toFixed(2));
            } else {
                pack.value = 0;
            }
            return next;
        });
        setHasChanges(true);
    };

    const addPack = () => {
        if (!localConfig) return;
        setLocalConfig(prev => {
            if (!prev) return null;
            const next = JSON.parse(JSON.stringify(prev));
            next.creditPacks.push({
                name: 'New Pack',
                price: 0,
                credits: 0,
                totalCredits: 0,
                bonus: 0,
                tagline: 'Best value',
                popular: false,
                value: 0
            });
            return next;
        });
        setHasChanges(true);
    };

    const removePack = (index: number) => {
        if (!localConfig) return;
        if (confirm("Delete this package?")) {
            setLocalConfig(prev => {
                if (!prev) return null;
                const next = JSON.parse(JSON.stringify(prev));
                next.creditPacks.splice(index, 1);
                return next;
            });
            setHasChanges(true);
        }
    };

    const saveConfig = async () => {
        if (!localConfig) return;
        try {
            await updateAppConfig(localConfig);
            onConfigUpdate(localConfig);
            setHasChanges(false);
            alert("Configuration updated successfully.");
        } catch (e) {
            console.error("Config save error", e);
            alert("Failed to save config. Check permissions.");
        }
    };

    const handleToggleBan = async (user: User) => {
        if (confirm(`Confirm ${user.isBanned ? 'UNBAN' : 'BAN'} for ${user.email}?`)) {
            if(auth.user) await toggleUserBan(auth.user.uid, user.uid, !user.isBanned);
            loadUsers();
        }
    };

    const handleSaveAnnouncement = async () => {
        if(!auth.user) return;
        try {
            await updateAnnouncement(auth.user.uid, announcement);
            alert("Announcement updated successfully.");
        } catch (e) {
            console.error("Announcement Update Error:", e);
            alert("Failed to update announcement. Check console.");
        }
    };

    const exportUsersCSV = () => {
        const headers = ["UID", "Name", "Email", "Credits", "Plan", "Joined", "Last Active"];
        const rows = allUsers.map(u => [
            u.uid, u.name, u.email, u.credits, u.plan || 'Free', 
            u.signUpDate ? new Date((u.signUpDate as any).seconds * 1000).toISOString() : '',
            u.lastActive ? new Date((u.lastActive as any).seconds * 1000).toISOString() : ''
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

    const getFilterLabel = (f: string) => {
        switch(f) {
            case '7d': return 'Last 7 Days';
            case '30d': return 'Last 30 Days';
            case '6m': return 'Last 6 Months';
            case '1y': return 'Last 1 Year';
            case 'custom': return 'Custom Range';
            default: return 'Lifetime';
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-24">
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-[#1A1A1E] flex items-center gap-3">
                    <ShieldCheckIcon className="w-8 h-8 text-indigo-600" /> Admin Command
                </h1>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                    <TabButton id="overview" label="Overview" icon={ChartBarIcon} />
                    <TabButton id="analytics" label="Analytics" icon={ImageIcon} />
                    <TabButton id="users" label="Users" icon={UsersIcon} />
                    <TabButton id="comms" label="Comms" icon={AudioWaveIcon} />
                    <TabButton id="config" label="Config" icon={CogIcon} />
                    <TabButton id="system" label="System" icon={SystemIcon} />
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Revenue Card with Filter */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-xl"><CreditCardIcon className="w-6 h-6"/></div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowRevenueFilterMenu(!showRevenueFilterMenu)}
                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                        title="Filter Revenue"
                                    >
                                        <FilterIcon className="w-5 h-5"/>
                                    </button>
                                    
                                    {showRevenueFilterMenu && (
                                        <div className="absolute top-8 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col animate-fadeIn">
                                            <div className="p-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                                Select Period
                                            </div>
                                            {['lifetime', '7d', '30d', '6m', '1y'].map((opt) => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => { setRevenueFilter(opt as any); setShowRevenueFilterMenu(false); }}
                                                    className={`px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${revenueFilter === opt ? 'font-bold text-indigo-600 bg-indigo-50' : 'text-gray-600'}`}
                                                >
                                                    {getFilterLabel(opt)}
                                                </button>
                                            ))}
                                            <div className="border-t border-gray-100 p-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Custom Range</p>
                                                <div className="flex flex-col gap-1">
                                                    <input 
                                                        type="date" 
                                                        value={customRange.start} 
                                                        onChange={(e) => setCustomRange({...customRange, start: e.target.value})}
                                                        className="text-xs border border-gray-200 rounded p-1"
                                                    />
                                                    <input 
                                                        type="date" 
                                                        value={customRange.end} 
                                                        onChange={(e) => setCustomRange({...customRange, end: e.target.value})}
                                                        className="text-xs border border-gray-200 rounded p-1"
                                                    />
                                                    <button 
                                                        onClick={applyCustomRange}
                                                        disabled={!customRange.start || !customRange.end}
                                                        className="mt-1 bg-indigo-600 text-white text-xs font-bold py-1 rounded disabled:opacity-50"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-black text-[#1A1A1E]">₹{stats.revenue.toLocaleString()}</p>
                                {revenueFilter !== 'lifetime' && (
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mb-1 border border-gray-200">
                                        {getFilterLabel(revenueFilter)}
                                    </span>
                                )}
                            </div>
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
                        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                            <h3 className="font-bold text-gray-800 mb-6">Revenue Trend (Last 7 Days)</h3>
                            <div className="h-48 flex items-end justify-between gap-2">
                                {revenueHistory.length > 0 ? (
                                    revenueHistory.map((item, i) => {
                                        const maxAmount = Math.max(...revenueHistory.map(r => r.amount), 100);
                                        const heightPercent = Math.max((item.amount / maxAmount) * 100, 5);
                                        return (
                                            <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer">
                                                <div 
                                                    className="w-full bg-blue-100 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500 relative flex items-end justify-center" 
                                                    style={{ height: `${heightPercent}%` }}
                                                >
                                                    <div className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">
                                                        ₹{item.amount.toLocaleString()}
                                                    </div>
                                                </div>
                                                <p className="text-center text-[9px] sm:text-[10px] text-gray-400 mt-2 font-bold truncate px-1">{item.date}</p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-gray-400 text-sm w-full text-center py-10">No revenue data available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ... Other Tabs (Config, Users, Comms, System, Analytics) preserved ... */}
            
            {activeTab === 'config' && (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Feature Pricing & Availability</h2>
                            <p className="text-sm text-gray-500">Set credit costs and toggle features on/off.</p>
                        </div>
                        {hasChanges && (
                            <button onClick={saveConfig} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold animate-pulse shadow-lg shadow-green-200 hover:scale-105 transition-transform">
                                Save Changes
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* PRICING SECTION */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CreditCardIcon className="w-4 h-4"/> Credit Pricing
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(localConfig?.featureCosts || {}).map(([feature, cost]) => (
                                    <div key={feature} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm group">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => removeCostKey(feature)}
                                                className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                                title="Delete this feature cost"
                                            >
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                            <span className="text-sm font-bold text-gray-700">{feature}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={cost} 
                                                min="0"
                                                onChange={(e) => handleConfigChange('featureCosts', feature, parseInt(e.target.value) || 0)}
                                                className="w-16 p-2 text-right border border-gray-200 rounded-lg font-mono font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <span className="text-xs font-bold text-gray-400">CR</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* TOGGLES SECTION */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <ShieldCheckIcon className="w-4 h-4"/> Feature Toggles
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(localConfig?.featureToggles || {}).map(([key, enabled]) => (
                                    <div key={key} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <span className="text-sm font-bold text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <button 
                                            onClick={() => handleConfigChange('featureToggles', key, !enabled)}
                                            className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform duration-300 ${enabled ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* CREDIT PACKAGES SECTION */}
                    <div className="mt-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <TicketIcon className="w-4 h-4"/> Credit Packages
                            </h3>
                            <button onClick={addPack} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                                <PlusIcon className="w-3 h-3"/> Add Pack
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {localConfig?.creditPacks?.map((pack, index) => (
                                <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative group hover:border-indigo-200 transition-colors">
                                    <button 
                                        onClick={() => removePack(index)} 
                                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 p-1 transition-colors"
                                        title="Remove Pack"
                                    >
                                        <XIcon className="w-4 h-4"/>
                                    </button>

                                    <div className="space-y-3">
                                        {/* Name & Popular Toggle */}
                                        <div className="flex items-center gap-2 pr-6">
                                            <input 
                                                type="text" 
                                                value={pack.name} 
                                                onChange={(e) => handlePackChange(index, 'name', e.target.value)}
                                                className="w-full p-2 border border-gray-200 rounded font-bold text-gray-800 text-sm focus:border-indigo-500 outline-none"
                                                placeholder="Pack Name"
                                            />
                                            <button 
                                                onClick={() => handlePackChange(index, 'popular', !pack.popular)}
                                                className={`p-1.5 rounded-full transition-colors ${pack.popular ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-300 hover:text-yellow-400'}`}
                                                title="Toggle 'Popular' Badge"
                                            >
                                                <StarIcon className="w-4 h-4 fill-current"/>
                                            </button>
                                        </div>

                                        {/* Tagline */}
                                        <input 
                                            type="text" 
                                            value={pack.tagline} 
                                            onChange={(e) => handlePackChange(index, 'tagline', e.target.value)}
                                            className="w-full p-2 border border-gray-200 rounded text-xs text-gray-600 focus:border-indigo-500 outline-none"
                                            placeholder="Tagline (e.g. Best for beginners)"
                                        />

                                        {/* Pricing Row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Price (₹)</label>
                                                <input 
                                                    type="number" 
                                                    value={pack.price} 
                                                    min="0"
                                                    onChange={(e) => handlePackChange(index, 'price', parseInt(e.target.value) || 0)}
                                                    className="w-full p-2 border border-gray-200 rounded text-sm font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Credits</label>
                                                <input 
                                                    type="number" 
                                                    value={pack.credits} 
                                                    min="0"
                                                    onChange={(e) => handlePackChange(index, 'credits', parseInt(e.target.value) || 0)}
                                                    className="w-full p-2 border border-gray-200 rounded text-sm font-bold focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1">Bonus</label>
                                                <input 
                                                    type="number" 
                                                    value={pack.bonus} 
                                                    min="0"
                                                    onChange={(e) => handlePackChange(index, 'bonus', parseInt(e.target.value) || 0)}
                                                    className="w-full p-2 border border-gray-200 rounded text-sm font-bold text-green-600 focus:border-indigo-500 outline-none bg-green-50/50"
                                                />
                                            </div>
                                        </div>

                                        {/* Totals Readout */}
                                        <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 pt-2 border-t border-gray-100">
                                            <span>Total: <span className="text-gray-600 font-bold">{pack.totalCredits}</span> Cr</span>
                                            <span>Value: <span className="text-gray-600 font-bold">₹{pack.value}</span>/Cr</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-gray-800">Users ({filteredUsers.length})</h3>
                            <button onClick={exportUsersCSV} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><DownloadIcon className="w-3 h-3"/> Export CSV</button>
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={sortMode} 
                                onChange={(e) => setSortMode(e.target.value as any)}
                                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="credits">Most Credits</option>
                            </select>
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 w-48"
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th className="p-4">Identity</th>
                                    <th className="p-4">Plan</th>
                                    <th className="p-4">Credits</th>
                                    <th className="p-4">Spent</th>
                                    <th className="p-4">Last Login</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading...</td></tr>
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
                                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{u.plan || 'Free'}</span></td>
                                        <td className="p-4 font-mono font-bold">{u.credits}</td>
                                        <td className="p-4 font-mono text-green-600 font-bold">₹{u.totalSpent || 0}</td>
                                        <td className="p-4 text-xs text-gray-500 font-medium whitespace-nowrap">{formatTableDate(u.lastActive)}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => auth.impersonateUser && auth.impersonateUser(u)} 
                                                    className="p-1.5 hover:bg-orange-100 rounded text-gray-500 hover:text-orange-600"
                                                    title="View As User"
                                                >
                                                    <EyeIcon className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => setSelectedUserForDetail(u)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500 hover:text-blue-600"><InformationCircleIcon className="w-4 h-4"/></button>
                                                <button onClick={() => handleToggleBan(u)} className={`p-1.5 rounded transition-colors ${u.isBanned ? 'bg-red-600 text-white' : 'hover:bg-red-100 text-gray-500 hover:text-red-600'}`}>
                                                    <XIcon className="w-4 h-4"/>
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

            {activeTab === 'comms' && (
                <div className="max-w-2xl mx-auto animate-fadeIn bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-yellow-100 text-yellow-600 rounded-xl"><FlagIcon className="w-6 h-6"/></div>
                        <h3 className="text-xl font-bold text-gray-800">Global Announcement</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Content</label>
                            <div className="space-y-2">
                                <input 
                                    type="text" 
                                    value={announcement.title || ''} 
                                    onChange={(e) => setAnnouncement({...announcement, title: e.target.value})} 
                                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" 
                                    placeholder="Headline (e.g. Maintenance Alert)" 
                                />
                                <textarea value={announcement.message} onChange={(e) => setAnnouncement({...announcement, message: e.target.value})} className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium h-24 resize-none" placeholder="Message body..." />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Link (Optional)</label>
                            <input type="text" value={announcement.link || ''} onChange={(e) => setAnnouncement({...announcement, link: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl text-sm" placeholder="https://..." />
                        </div>
                        
                        {/* New Visual Style Selector for Announcement */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Visual Style</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['banner', 'pill', 'toast', 'modal'].map((s) => (
                                    <button 
                                        key={s} 
                                        onClick={() => setAnnouncement({...announcement, style: s as any})} 
                                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all capitalize ${
                                            announcement.style === s 
                                            ? 'bg-indigo-600 text-white border-indigo-600' 
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Type</label>
                                <select value={announcement.type} onChange={(e) => setAnnouncement({...announcement, type: e.target.value as any})} className="w-full p-3 border border-gray-200 rounded-xl text-sm">
                                    <option value="info">Info (Blue)</option>
                                    <option value="success">Success (Green)</option>
                                    <option value="warning">Warning (Yellow)</option>
                                    <option value="error">Critical (Red)</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => setAnnouncement({...announcement, isActive: !announcement.isActive})} className={`w-full py-3 rounded-xl font-bold transition-all border ${announcement.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}`}>{announcement.isActive ? 'Active' : 'Inactive'}</button>
                            </div>
                        </div>
                        <div className="pt-2">
                            <button onClick={handleSaveAnnouncement} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">Publish Announcement</button>
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
                        {((systemLogType === 'audit' && auditLogs.length === 0) || (systemLogType === 'api' && apiErrors.length === 0)) && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No logs found.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-fadeIn">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Feature Usage Heatmap</h3>
                    {featureUsage.length > 0 ? (
                        <div className="space-y-4">
                            {featureUsage.map((item) => {
                                const max = featureUsage[0].count;
                                const percent = (item.count / max) * 100;
                                return (
                                    <div key={item.feature} className="relative">
                                        <div className="flex justify-between text-xs font-bold mb-1 px-1">
                                            <span className="text-gray-700">{item.feature}</span>
                                            <span className="text-gray-500">{item.count} gens</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm">No data available.</p>
                    )}
                </div>
            )}

            {selectedUserForDetail && auth.user && <UserDetailModal user={selectedUserForDetail} currentUser={auth.user} appConfig={localConfig} onClose={() => setSelectedUserForDetail(null)} />}
        </div>
    );
};
