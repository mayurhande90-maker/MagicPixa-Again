
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
    getCreations
} from '../firebase';
import { 
    UsersIcon, CreditCardIcon, CogIcon, ChartBarIcon, PlusIcon, CheckIcon, XIcon, 
    ShieldCheckIcon, InformationCircleIcon, TrashIcon, FlagIcon, AudioWaveIcon, 
    DocumentTextIcon, ImageIcon, EyeIcon, AdjustmentsVerticalIcon, RegenerateIcon, SystemIcon
} from './icons';

interface AdminPanelProps {
    auth: AuthProps;
    appConfig: AppConfig | null;
    onConfigUpdate: (config: AppConfig) => void;
}

// User Detail Modal
const UserDetailModal: React.FC<{ user: User; onClose: () => void; onViewAs: () => void; adminUid: string; }> = ({ user, onClose, onViewAs, adminUid }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'creations'>('overview');
    const [userCreations, setUserCreations] = useState<any[]>([]);
    const [manualPlan, setManualPlan] = useState(user.plan || 'Free');
    const [notificationText, setNotificationText] = useState('');

    useEffect(() => {
        if (activeTab === 'creations') getCreations(user.uid).then(setUserCreations);
    }, [activeTab]);

    const handleUpdatePlan = async () => {
        await updateUserPlan(adminUid, user.uid, manualPlan);
        alert("Plan updated.");
    };

    const handleSendNotification = async () => {
        await sendSystemNotification(adminUid, user.uid, notificationText);
        setNotificationText('');
        alert("Notification sent.");
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold">{user.name} <span className="text-sm font-normal text-gray-500">({user.email})</span></h2>
                    <button onClick={onClose}><XIcon className="w-6 h-6"/></button>
                </div>
                <div className="flex border-b px-6">
                    <button onClick={()=>setActiveTab('overview')} className={`py-3 px-4 text-sm font-bold border-b-2 ${activeTab==='overview'?'border-blue-500 text-blue-600':'border-transparent'}`}>Overview</button>
                    <button onClick={()=>setActiveTab('creations')} className={`py-3 px-4 text-sm font-bold border-b-2 ${activeTab==='creations'?'border-blue-500 text-blue-600':'border-transparent'}`}>Creations</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {activeTab === 'overview' ? (
                        <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-xl border">
                                    <h3 className="font-bold mb-2">Stats</h3>
                                    <p>Credits: {user.credits}</p>
                                    <p>Plan: {user.plan}</p>
                                    <p>Last Active: {user.lastActive ? new Date((user.lastActive as any).seconds * 1000).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border">
                                    <h3 className="font-bold mb-2">Controls</h3>
                                    <button onClick={onViewAs} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm font-bold mb-2">View As User</button>
                                    <div className="mt-4">
                                        <label className="text-xs font-bold block mb-1">Set Plan</label>
                                        <div className="flex gap-2">
                                            <select value={manualPlan} onChange={e=>setManualPlan(e.target.value)} className="border p-1 rounded"><option>Free</option><option>Starter Pack</option><option>Creator Pack</option><option>Studio Pack</option><option>Agency Pack</option></select>
                                            <button onClick={handleUpdatePlan} className="bg-blue-600 text-white px-2 py-1 rounded text-xs">Save</button>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-xs font-bold block mb-1">Send Notification</label>
                                        <div className="flex gap-2">
                                            <input type="text" value={notificationText} onChange={e=>setNotificationText(e.target.value)} className="border p-1 rounded flex-1" placeholder="Msg..."/>
                                            <button onClick={handleSendNotification} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">Send</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-4">
                            {userCreations.map(c => (
                                <div key={c.id} className="aspect-square bg-gray-200 rounded overflow-hidden relative group">
                                    <img src={c.thumbnailUrl||c.imageUrl} className="w-full h-full object-cover"/>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">{c.feature}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ auth, appConfig }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ revenue: 0, signups: [], purchases: [] });
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('newest');
    const [announcement, setAnnouncement] = useState<Announcement>({ message: '', isActive: false, type: 'info', displayStyle: 'banner' });
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [apiLogs, setApiLogs] = useState<ApiErrorLog[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        getTotalRevenue().then(r => setStats(prev => ({...prev, revenue: r})));
        getRecentSignups().then(s => setStats(prev => ({...prev, signups: s as any})));
        getRecentPurchases().then(p => setStats(prev => ({...prev, purchases: p})));
        getAnnouncement().then(a => a && setAnnouncement(a));
    }, []);

    useEffect(() => {
        if(activeTab === 'users') getAllUsers().then(setAllUsers);
        if(activeTab === 'system') { getAuditLogs().then(setAuditLogs); getApiErrorLogs().then(setApiLogs); }
    }, [activeTab]);

    const filteredUsers = useMemo(() => {
        let res = allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Robust Date Sorting
        const getTs = (d: any) => d ? (d.seconds ? d.seconds : new Date(d).getTime()/1000) : 0;
        
        res.sort((a,b) => {
            const dateA = getTs(a.signUpDate);
            const dateB = getTs(b.signUpDate);
            if (sortOption === 'newest') return dateB - dateA;
            if (sortOption === 'oldest') return dateA - dateB;
            if (sortOption === 'credits') return b.credits - a.credits;
            return 0;
        });
        return res;
    }, [allUsers, searchTerm, sortOption]);

    const handleBan = async (u: User) => {
        if (!auth.user) return;
        if (confirm(`Toggle ban for ${u.email}?`)) {
            // Optimistic Update
            setAllUsers(prev => prev.map(user => user.uid === u.uid ? { ...user, isBanned: !user.isBanned } : user));
            try {
                await toggleUserBan(auth.user.uid, u.uid, !u.isBanned);
            } catch (e) {
                console.error(e);
                alert("Action failed. Refreshing...");
                getAllUsers().then(setAllUsers);
            }
        }
    };

    const handleSaveAnnouncement = async () => {
        if (!auth.user) return;
        await updateAnnouncement(auth.user.uid, announcement);
        alert("Announcement updated.");
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto pb-24">
            <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
            <div className="flex gap-2 mb-6">
                {['overview', 'users', 'comms', 'system'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-bold capitalize ${activeTab===tab ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'}`}>{tab}</button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h3 className="font-bold text-gray-500 uppercase text-xs">Revenue</h3>
                        <p className="text-3xl font-black">₹{stats.revenue}</p>
                    </div>
                    {/* Add more widgets here */}
                </div>
            )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-2xl border shadow-sm p-6">
                    <div className="flex justify-between mb-4">
                        <input type="text" placeholder="Search..." className="border p-2 rounded w-64" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                        <select value={sortOption} onChange={e=>setSortOption(e.target.value)} className="border p-2 rounded">
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="credits">Highest Credits</option>
                        </select>
                    </div>
                    <table className="w-full text-left">
                        <thead><tr className="border-b"><th className="p-2">User</th><th className="p-2">Plan</th><th className="p-2">Credits</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
                        <tbody>
                            {filteredUsers.map(u => (
                                <tr key={u.uid} className="border-b hover:bg-gray-50">
                                    <td className="p-2">
                                        <div className="font-bold">{u.name}</div>
                                        <div className="text-xs text-gray-500">{u.email}</div>
                                    </td>
                                    <td className="p-2">{u.plan}</td>
                                    <td className="p-2">{u.credits}</td>
                                    <td className="p-2">{u.isBanned ? <span className="text-red-600 font-bold">BANNED</span> : <span className="text-green-600">Active</span>}</td>
                                    <td className="p-2 flex gap-2">
                                        <button onClick={() => setSelectedUser(u)} className="p-1 bg-gray-100 rounded hover:bg-gray-200"><InformationCircleIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleBan(u)} className={`p-1 rounded ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}><ShieldCheckIcon className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'comms' && (
                <div className="bg-white p-6 rounded-2xl border shadow-sm max-w-3xl">
                    <h3 className="font-bold text-lg mb-4">Announcement Editor</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <textarea className="w-full border p-3 rounded-xl h-32" placeholder="Message..." value={announcement.message} onChange={e=>setAnnouncement({...announcement, message: e.target.value})}></textarea>
                            <div>
                                <label className="text-xs font-bold block mb-1">Style</label>
                                <div className="flex gap-2">
                                    <button onClick={()=>setAnnouncement({...announcement, displayStyle: 'banner'})} className={`flex-1 py-2 rounded border ${announcement.displayStyle==='banner'?'bg-indigo-50 border-indigo-500 text-indigo-700':'bg-white'}`}>Banner</button>
                                    <button onClick={()=>setAnnouncement({...announcement, displayStyle: 'modal'})} className={`flex-1 py-2 rounded border ${announcement.displayStyle==='modal'?'bg-indigo-50 border-indigo-500 text-indigo-700':'bg-white'}`}>Modal</button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={announcement.isActive} onChange={e=>setAnnouncement({...announcement, isActive: e.target.checked})} className="w-5 h-5"/>
                                    <span className="font-bold">Active</span>
                                </label>
                                <select value={announcement.type} onChange={e=>setAnnouncement({...announcement, type: e.target.value as any})} className="border p-2 rounded"><option value="info">Info</option><option value="warning">Warning</option><option value="error">Critical</option></select>
                            </div>
                            <button onClick={handleSaveAnnouncement} className="w-full bg-black text-white py-3 rounded-xl font-bold">Publish Update</button>
                        </div>
                        <div className="bg-gray-100 rounded-xl p-4 flex items-center justify-center border">
                            <div className="text-center w-full">
                                <p className="text-xs text-gray-400 uppercase font-bold mb-2">Live Preview</p>
                                {announcement.displayStyle === 'banner' ? (
                                    <div className={`p-3 rounded text-white text-sm font-bold ${announcement.type==='error'?'bg-red-600':announcement.type==='warning'?'bg-yellow-500':'bg-blue-600'}`}>
                                        {announcement.message || 'Announcement Text'}
                                    </div>
                                ) : (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border">
                                        <h3 className="font-bold text-lg mb-2">Announcement</h3>
                                        <p className="text-sm text-gray-600">{announcement.message || 'Modal Text'}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'system' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h3 className="font-bold mb-4 text-red-600">API Errors</h3>
                        <div className="max-h-60 overflow-y-auto">
                            {apiLogs.map(l => (
                                <div key={l.id} className="text-xs border-b p-2 font-mono">{new Date(l.timestamp?.seconds*1000).toLocaleTimeString()}: {l.endpoint} - {l.error}</div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                        <h3 className="font-bold mb-4">Audit Log</h3>
                        <div className="max-h-60 overflow-y-auto">
                            {auditLogs.map(l => (
                                <div key={l.id} className="text-xs border-b p-2 font-mono flex gap-2">
                                    <span className="text-gray-400">{new Date(l.timestamp?.seconds*1000).toLocaleString()}</span>
                                    <span className="font-bold">{l.adminEmail}</span>
                                    <span className="text-blue-600">{l.action}</span>
                                    <span>{l.details}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedUser && auth.user && <UserDetailModal user={selectedUser} onClose={()=>setSelectedUser(null)} adminUid={auth.user.uid} onViewAs={()=>{ auth.impersonateUser && auth.impersonateUser(selectedUser); setSelectedUser(null); }} />}
        </div>
    );
};
