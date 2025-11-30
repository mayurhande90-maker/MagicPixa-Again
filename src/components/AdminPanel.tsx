
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, AppConfig, User, AuditLog, ApiErrorLog, Announcement, Purchase } from '../types';
import { 
    getAllUsers, 
    getTotalRevenue,
    toggleUserBan,
    updateUserPlan,
    sendSystemNotification,
    getAuditLogs,
    getApiErrorLogs,
    getAnnouncement,
    updateAnnouncement,
    getCreations,
    getRecentSignups,
    getRecentPurchases
} from '../firebase';
import { 
    XIcon, 
    ShieldCheckIcon, 
    InformationCircleIcon, 
    CheckIcon,
    MegaphoneIcon,
    UserIcon,
    CreditCardIcon,
    ChartBarIcon,
    SparklesIcon,
    CurrencyDollarIcon,
    ArrowUpCircleIcon,
    DownloadIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// --- Helper Components ---

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (val: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => onChange(!checked)}>
        <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-6' : 'translate-x-0'}`}></div>
        </div>
        {label && <span className={`text-sm font-bold ${checked ? 'text-green-600' : 'text-gray-500'}`}>{label}</span>}
    </div>
);

const StatCard: React.FC<{ 
    title: string; 
    value: string | number; 
    subValue?: string; 
    icon: React.ReactNode; 
    color: string; 
}> = ({ title, value, subValue, icon, color }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all">
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-black text-[#1A1A1E] mb-1">{value}</h3>
            {subValue && <p className={`text-xs font-bold ${color.replace('bg-', 'text-').replace('100', '600')}`}>{subValue}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
            {icon}
        </div>
    </div>
);

// --- User Detail Modal ---
const UserDetailModal: React.FC<{ user: User; onClose: () => void; onViewAs: () => void; adminUid: string; onRefresh: () => void; }> = ({ user, onClose, onViewAs, adminUid, onRefresh }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [manualPlan, setManualPlan] = useState(user.plan || 'Free');
    const [notificationText, setNotificationText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (activeTab === 'creations') getCreations(user.uid).then(setUserCreations);
    }, [activeTab, user.uid]);

    const handleUpdatePlan = async () => {
        setIsProcessing(true);
        try {
            await updateUserPlan(adminUid, user.uid, manualPlan);
            alert("Plan successfully updated.");
            onRefresh(); // Refresh parent list
        } catch (e) {
            console.error(e);
            alert("Failed to update plan.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendNotification = async () => {
        if (!notificationText.trim()) return;
        setIsProcessing(true);
        try {
            await sendSystemNotification(adminUid, user.uid, notificationText);
            setNotificationText('');
            alert("Notification sent to user dashboard.");
        } catch (e) {
            console.error(e);
            alert("Failed to send notification.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[120] p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1A1A1E]">{user.name}</h2>
                        <p className="text-sm text-gray-500 font-mono">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><XIcon className="w-6 h-6"/></button>
                </div>
                
                <div className="flex border-b px-6 bg-white">
                    <button onClick={()=>setActiveTab('overview')} className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab==='overview'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Overview & Actions</button>
                    <button onClick={()=>setActiveTab('creations')} className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab==='creations'?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>Creation Gallery</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB]">
                    {activeTab === 'overview' ? (
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Stats Card */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">User Profile</h3>
                                
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Credit Balance</span>
                                    <span className="text-xl font-bold text-[#1A1A1E]">{user.credits}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Current Plan</span>
                                    <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm">{user.plan || 'Free'}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Total Spent</span>
                                    <span className="font-bold text-gray-800">{user.totalSpent || 0} Credits</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Last Active</span>
                                    <span className="text-sm font-medium text-gray-800">
                                        {user.lastActive 
                                            ? new Date((user.lastActive as any).seconds * 1000).toLocaleString() 
                                            : 'Never'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-gray-600">Signed Up</span>
                                    <span className="text-sm font-medium text-gray-800">
                                        {user.signUpDate 
                                            ? new Date((user.signUpDate as any).seconds * 1000).toLocaleDateString() 
                                            : 'Unknown'}
                                    </span>
                                </div>
                            </div>

                            {/* Actions Card */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Administrative Controls</h3>
                                
                                <button 
                                    onClick={onViewAs} 
                                    className="w-full bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-sm font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                                    Impersonate (View As User)
                                </button>

                                {/* Plan Override */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2">Manual Plan Assignment</label>
                                    <div className="flex gap-2">
                                        <select 
                                            value={manualPlan} 
                                            onChange={e=>setManualPlan(e.target.value)} 
                                            className="flex-1 border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option>Free</option>
                                            <option>Starter Pack</option>
                                            <option>Creator Pack</option>
                                            <option>Studio Pack</option>
                                            <option>Agency Pack</option>
                                            <option>VIP</option>
                                        </select>
                                        <button 
                                            onClick={handleUpdatePlan} 
                                            disabled={isProcessing}
                                            className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-50"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>

                                {/* Targeted Notification */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-2">Send In-App Notification</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={notificationText} 
                                            onChange={e=>setNotificationText(e.target.value)} 
                                            className="flex-1 border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                            placeholder="Message will appear as a toast..."
                                        />
                                        <button 
                                            onClick={handleSendNotification} 
                                            disabled={isProcessing}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {userCreations.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <p>No creations found for this user.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {userCreations.map(c => (
                                        <div key={c.id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative group border border-gray-200">
                                            <img src={c.thumbnailUrl || c.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                                <p className="text-white text-xs font-bold truncate">{c.feature}</p>
                                                <p className="text-gray-300 text-[10px]">{new Date(c.createdAt?.seconds * 1000).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState('overview');
    
    // Stats State
    const [stats, setStats] = useState({ 
        revenue: 0, 
        totalUsers: 0,
        activeToday: 0,
        newToday: 0,
        totalSpent: 0,
        signups: [] as User[], 
        purchases: [] as Purchase[] 
    });

    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    
    // Announcement State
    const [announcement, setAnnouncement] = useState<Announcement>({ 
        message: '', 
        isActive: false, 
        type: 'info', 
        displayStyle: 'banner',
        link: ''
    });
    
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [apiLogs, setApiLogs] = useState<ApiErrorLog[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        const loadOverview = async () => {
            setIsLoading(true);
            try {
                // Fetch Core Data
                const [r, s, p, a, users] = await Promise.all([
                    getTotalRevenue(),
                    getRecentSignups(10),
                    getRecentPurchases(10),
                    getAnnouncement(),
                    getAllUsers() // Need full list for accurate counters
                ]);

                // Calculate Date-Based Stats
                const now = new Date();
                const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                
                const activeToday = users.filter(u => {
                    if (!u.lastActive) return false;
                    const d = (u.lastActive as any).toDate ? (u.lastActive as any).toDate() : new Date((u.lastActive as any).seconds * 1000);
                    return d > oneDayAgo;
                }).length;

                const newToday = users.filter(u => {
                    if (!u.signUpDate) return false;
                    const d = (u.signUpDate as any).toDate ? (u.signUpDate as any).toDate() : new Date((u.signUpDate as any).seconds * 1000);
                    return d > oneDayAgo;
                }).length;

                // Simple aggregation of credit usage
                const totalSpent = users.reduce((acc, u) => acc + (u.totalSpent || 0), 0);

                setStats({
                    revenue: r,
                    signups: s as any,
                    purchases: p as any,
                    totalUsers: users.length,
                    activeToday,
                    newToday,
                    totalSpent
                });
                
                setAllUsers(users); // Cache for User Tab
                if (a) setAnnouncement(a);
            } catch (e) {
                console.error("Failed to load admin stats", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadOverview();
    }, []);

    // Tab-Specific Lazy Loading
    useEffect(() => {
        if(activeTab === 'system') { 
            getAuditLogs().then(setAuditLogs); 
            getApiErrorLogs().then(setApiLogs); 
        }
    }, [activeTab]);

    const filteredUsers = useMemo(() => {
        let res = allUsers.filter(u => 
            (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
            (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
        // Robust Date Sorting
        const getTs = (d: any) => d ? (d.seconds ? d.seconds : new Date(d).getTime()/1000) : 0;
        
        res.sort((a,b) => {
            if (sortOption === 'newest') return getTs(b.signUpDate) - getTs(a.signUpDate);
            if (sortOption === 'oldest') return getTs(a.signUpDate) - getTs(b.signUpDate);
            if (sortOption === 'credits') return b.credits - a.credits;
            return 0;
        });
        return res;
    }, [allUsers, searchTerm, sortOption]);

    const handleBan = async (u: User) => {
        if (!auth.user) return;
        const action = u.isBanned ? "UNBAN" : "BAN";
        if (confirm(`Are you sure you want to ${action} ${u.email}?`)) {
            // Optimistic Update
            setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, isBanned: !user.isBanned } : user));
            try {
                await toggleUserBan(auth.user.uid, u.uid, !u.isBanned);
            } catch (e) {
                console.error("Ban toggle failed:", e);
                alert("Action failed. Reverting changes...");
                // Revert
                setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, isBanned: u.isBanned } : user));
            }
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!auth.user) return;
        try {
            await updateAnnouncement(auth.user.uid, announcement);
            alert("Announcement updated successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to update announcement.");
        }
    };

    // Helper to format timestamps safely
    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString();
    };

    return (
        <div className="p-4 sm:p-8 max-w-[1600px] mx-auto pb-32 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1A1E]">Admin Command Center</h1>
                    <p className="text-sm text-gray-500 mt-1">System Overview & Management</p>
                </div>
                <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto w-full sm:w-auto">
                    {['overview', 'users', 'comms', 'system'].map(tab => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)} 
                            className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all whitespace-nowrap ${
                                activeTab===tab 
                                ? 'bg-black text-white shadow-md' 
                                : 'bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fadeIn">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Total Revenue" 
                            value={`₹${stats.revenue.toLocaleString()}`} 
                            icon={<CurrencyDollarIcon className="w-6 h-6 text-green-600" />} 
                            color="bg-green-100" 
                        />
                        <StatCard 
                            title="Total Users" 
                            value={stats.totalUsers} 
                            subValue={`+${stats.newToday} today`} 
                            icon={<UserIcon className="w-6 h-6 text-blue-600" />} 
                            color="bg-blue-100" 
                        />
                        <StatCard 
                            title="Active (24h)" 
                            value={stats.activeToday} 
                            icon={<ChartBarIcon className="w-6 h-6 text-purple-600" />} 
                            color="bg-purple-100" 
                        />
                        <StatCard 
                            title="Credits Burned" 
                            value={stats.totalSpent.toLocaleString()} 
                            icon={<SparklesIcon className="w-6 h-6 text-orange-600" />} 
                            color="bg-orange-100" 
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Revenue/Transactions Chart Area (Simplified Representation) */}
                        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800 text-lg">Recent Transactions</h3>
                                <button onClick={()=>setActiveTab('users')} className="text-xs font-bold text-blue-600 hover:underline">View Users</button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase">
                                            <th className="pb-3 font-bold">User</th>
                                            <th className="pb-3 font-bold">Pack</th>
                                            <th className="pb-3 font-bold">Date</th>
                                            <th className="pb-3 font-bold text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {stats.purchases.length > 0 ? stats.purchases.map(p => (
                                            <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 font-medium text-gray-900">{p.userName || 'Unknown'}</td>
                                                <td className="py-3 text-gray-600">{p.packName}</td>
                                                <td className="py-3 text-gray-500">{formatDate(p.purchaseDate)}</td>
                                                <td className="py-3 text-right font-bold text-green-600">+₹{p.amountPaid}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-400">No recent transactions.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recent Signups Feed */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-gray-800 text-lg mb-4">Latest Signups</h3>
                            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-4 pr-2 custom-scrollbar">
                                {stats.signups.map(user => (
                                    <div key={user.uid} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => setSelectedUser(user)}>
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                            {user.avatar || user.name[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                        </div>
                                        <div className="ml-auto text-[10px] text-gray-400 font-medium">
                                            {formatDate(user.signUpDate)}
                                        </div>
                                    </div>
                                ))}
                                {stats.signups.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-4">No recent signups.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between mb-6 gap-4">
                        <div className="relative flex-1 max-w-md">
                            <input 
                                type="text" 
                                placeholder="Search users by name or email..." 
                                className="border border-gray-300 pl-4 pr-4 py-2.5 rounded-xl w-full text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                value={searchTerm} 
                                onChange={e=>setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            value={sortOption} 
                            onChange={e=>setSortOption(e.target.value)} 
                            className="border border-gray-300 p-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white cursor-pointer"
                        >
                            <option value="newest">Newest Signups</option>
                            <option value="oldest">Oldest Members</option>
                            <option value="credits">Highest Balance</option>
                        </select>
                    </div>
                    
                    {isLoading ? (
                        <div className="text-center py-20">
                            <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-black rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-400">Loading user database...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-bold">User</th>
                                        <th className="p-4 font-bold">Plan</th>
                                        <th className="p-4 font-bold">Credits</th>
                                        <th className="p-4 font-bold">Status</th>
                                        <th className="p-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(u => (
                                        <tr key={u.uid} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-bold text-[#1A1A1E]">{u.name}</div>
                                                <div className="text-xs text-gray-500">{u.email}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.plan === 'Free' || !u.plan ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'}`}>
                                                    {u.plan || 'Free'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono font-medium text-gray-700">{u.credits}</td>
                                            <td className="p-4">
                                                {u.isBanned ? (
                                                    <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100 flex items-center gap-1 w-fit">
                                                        <ShieldCheckIcon className="w-3 h-3" /> BANNED
                                                    </span>
                                                ) : (
                                                    <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-100 w-fit">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setSelectedUser(u)} 
                                                        className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 shadow-sm"
                                                    >
                                                        Details
                                                    </button>
                                                    <button 
                                                        onClick={() => handleBan(u)} 
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors ${
                                                            u.isBanned 
                                                            ? 'bg-green-600 text-white hover:bg-green-700' 
                                                            : 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100'
                                                        }`}
                                                    >
                                                        {u.isBanned ? 'Unban' : 'Ban'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'comms' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
                    <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><ShieldCheckIcon className="w-5 h-5"/></span>
                            Announcement Editor
                        </h3>
                        
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Message Content</label>
                            <textarea 
                                className="w-full border border-gray-200 p-4 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50" 
                                rows={4}
                                placeholder="Type your announcement here..." 
                                value={announcement.message} 
                                onChange={e=>setAnnouncement({...announcement, message: e.target.value})}
                            ></textarea>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Action Link (Optional)</label>
                            <input 
                                type="text"
                                className="w-full border border-gray-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" 
                                placeholder="https://..." 
                                value={announcement.link || ''} 
                                onChange={e=>setAnnouncement({...announcement, link: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Display Style</label>
                                <div className="flex flex-col gap-2">
                                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${announcement.displayStyle === 'banner' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="style" className="hidden" checked={announcement.displayStyle === 'banner'} onChange={() => setAnnouncement({...announcement, displayStyle: 'banner'})} />
                                        <span className="text-sm font-bold">Top Banner</span>
                                    </label>
                                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${announcement.displayStyle === 'modal' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="style" className="hidden" checked={announcement.displayStyle === 'modal'} onChange={() => setAnnouncement({...announcement, displayStyle: 'modal'})} />
                                        <span className="text-sm font-bold">Popup Modal</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Urgency Level</label>
                                <div className="flex flex-col gap-2">
                                    <select 
                                        value={announcement.type} 
                                        onChange={e=>setAnnouncement({...announcement, type: e.target.value as any})} 
                                        className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Yellow)</option>
                                        <option value="error">Critical (Red)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <ToggleSwitch 
                                checked={announcement.isActive} 
                                onChange={(val) => setAnnouncement({...announcement, isActive: val})} 
                                label={announcement.isActive ? "Active (Visible)" : "Inactive (Hidden)"}
                            />
                            <button onClick={handleSaveAnnouncement} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 shadow-lg transition-transform active:scale-95">
                                Publish
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-gray-100 rounded-2xl border border-gray-200 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute top-4 left-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</div>
                        
                        <div className="w-full max-w-lg">
                            {announcement.displayStyle === 'banner' ? (
                                <div className={`w-full p-4 rounded-lg shadow-md text-white flex items-center justify-between ${
                                    announcement.type === 'error' ? 'bg-red-600' : 
                                    announcement.type === 'warning' ? 'bg-yellow-500' : 
                                    'bg-blue-600'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <InformationCircleIcon className="w-5 h-5"/>
                                        <span className="font-medium text-sm">{announcement.message || "Your announcement text here..."}</span>
                                    </div>
                                    <XIcon className="w-4 h-4 opacity-50"/>
                                </div>
                            ) : (
                                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 w-full">
                                    <div className={`p-6 text-center border-b ${
                                        announcement.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 
                                        announcement.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 
                                        'bg-blue-50 border-blue-100 text-blue-700'
                                    }`}>
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                            <InformationCircleIcon className="w-6 h-6"/>
                                        </div>
                                        <h3 className="font-bold text-lg">Announcement</h3>
                                    </div>
                                    <div className="p-6 text-center">
                                        <p className="text-gray-600 mb-6">{announcement.message || "Your announcement text here..."}</p>
                                        {announcement.link ? (
                                            <button className="w-full bg-black text-white py-3 rounded-xl font-bold">Read More</button>
                                        ) : (
                                            <button className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold">Dismiss</button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div className="space-y-8 animate-fadeIn">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Audit Logs</h3>
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{auditLogs.length} Events</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {auditLogs.map(l => (
                                    <div key={l.id} className="p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors text-xs font-mono">
                                        <div className="flex justify-between text-gray-400 mb-1">
                                            <span>{new Date(l.timestamp?.seconds*1000).toLocaleString()}</span>
                                            <span className="font-bold text-gray-500">{l.adminEmail}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="font-bold text-blue-600">{l.action}</span>
                                            <span className="text-gray-700">{l.details}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-red-600">API Errors</h3>
                                <span className="text-xs font-bold bg-red-50 text-red-500 px-2 py-1 rounded-full">{apiLogs.length} Errors</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                {apiLogs.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-gray-400 text-sm">No errors logged. System healthy.</div>
                                ) : (
                                    apiLogs.map(l => (
                                        <div key={l.id} className="p-3 border-b border-gray-50 hover:bg-red-50/30 transition-colors text-xs font-mono">
                                            <div className="flex justify-between text-gray-400 mb-1">
                                                <span>{new Date(l.timestamp?.seconds*1000).toLocaleString()}</span>
                                                <span className="font-bold">{l.endpoint}</span>
                                            </div>
                                            <div className="text-red-700 font-medium break-all">
                                                {l.error}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedUser && auth.user && (
                <UserDetailModal 
                    user={selectedUser} 
                    onClose={()=>setSelectedUser(null)} 
                    adminUid={auth.user.uid} 
                    onViewAs={()=>{ auth.impersonateUser && auth.impersonateUser(selectedUser); setSelectedUser(null); }} 
                    onRefresh={() => {
                        getAllUsers().then(setAllUsers);
                        setSelectedUser(null);
                    }}
                />
            )}
        </div>
    );
};
