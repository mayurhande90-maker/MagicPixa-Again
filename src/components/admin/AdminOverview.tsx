
import React, { useState, useEffect } from 'react';
import { User, Purchase } from '../../types';
import { getRecentSignups, getRecentPurchases, getDashboardStats, getRevenueStats, getTotalRevenue, subscribeToRecentActiveUsers } from '../../firebase';
import { CreditCardIcon, FilterIcon, UsersIcon, StarIcon, LifebuoyIcon, AudioWaveIcon, CogIcon, SystemIcon, EyeIcon } from '../icons';

interface AdminOverviewProps {
    onNavigate: (tab: 'overview' | 'users' | 'support' | 'comms' | 'system' | 'config' | 'feedback') => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
    const [stats, setStats] = useState<{ revenue: number, totalUsers: number, signups: User[], purchases: Purchase[] }>({ 
        revenue: 0, totalUsers: 0, signups: [], purchases: [] 
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [revenueHistory, setRevenueHistory] = useState<{ date: string; amount: number }[]>([]);
    const [revenueFilter, setRevenueFilter] = useState<'7d' | '30d' | '6m' | '1y' | 'lifetime' | 'custom'>('lifetime');
    const [showRevenueFilterMenu, setShowRevenueFilterMenu] = useState(false);
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    
    // Real-Time Active Users State
    const [activeUsers, setActiveUsers] = useState<User[]>([]);

    useEffect(() => {
        loadOverview();
        
        // Setup real-time listener for active users
        const unsubscribe = subscribeToRecentActiveUsers((users) => {
            setActiveUsers(users);
        });
        
        return () => unsubscribe();
    }, []);

    const fetchRevenueWithFilter = async () => {
        if (!stats.revenue && revenueFilter === 'lifetime') return; // Initial load handles lifetime
        
        let start: Date | undefined;
        let end: Date | undefined = new Date();
        
        if (revenueFilter === '7d') { start = new Date(); start.setDate(start.getDate() - 7); } 
        else if (revenueFilter === '30d') { start = new Date(); start.setDate(start.getDate() - 30); } 
        else if (revenueFilter === '6m') { start = new Date(); start.setMonth(start.getMonth() - 6); } 
        else if (revenueFilter === '1y') { start = new Date(); start.setFullYear(start.getFullYear() - 1); } 
        else if (revenueFilter === 'custom') { 
            if (customRange.start) start = new Date(customRange.start); 
            if (customRange.end) end = new Date(customRange.end); 
            if (end) end.setHours(23, 59, 59, 999); 
        } else {
            // Lifetime: Refresh stats completely if needed, or rely on getDashboardStats
            const newStats = await getDashboardStats();
            setStats(prev => ({ ...prev, revenue: newStats.revenue }));
            return;
        }

        if (start) {
            try { 
                const total = await getTotalRevenue(start, end); 
                setStats(prev => ({ ...prev, revenue: total })); 
            } catch (e) { 
                console.error("Failed to fetch filtered revenue", e); 
            }
        }
    };

    useEffect(() => {
        if (!isLoading) fetchRevenueWithFilter();
    }, [revenueFilter]);

    const applyCustomRange = () => { if (customRange.start && customRange.end) { setRevenueFilter('custom'); setShowRevenueFilterMenu(false); } };

    const loadOverview = async () => {
        setIsLoading(true);
        try {
            // Parallel Fetching
            const [signups, purchases, revHistory, dashboardStats] = await Promise.all([ 
                getRecentSignups(10), 
                getRecentPurchases(10), 
                getRevenueStats(7),
                getDashboardStats()
            ]);

            setStats({ 
                revenue: dashboardStats.revenue, 
                totalUsers: dashboardStats.totalUsers,
                signups, 
                purchases 
            });
            setRevenueHistory(revHistory);
        } catch (e) { 
            console.error("Failed to load overview", e); 
        } finally {
            setIsLoading(false);
        }
    };

    const getFilterLabel = (f: string) => { switch(f) { case '7d': return 'Last 7 Days'; case '30d': return 'Last 30 Days'; case '6m': return 'Last 6 Months'; case '1y': return 'Last 1 Year'; case 'custom': return 'Custom Range'; default: return 'Lifetime'; } };

    const formatRelativeTime = (timestamp: any) => {
        if (!timestamp) return 'Offline';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ago`;
            return date.toLocaleDateString();
        } catch (e) { return '-'; }
    };

    if (isLoading) {
        return (
            <div className="space-y-8 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-32">
                            <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                            <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                            <div className="h-8 w-32 bg-gray-200 rounded"></div>
                        </div>
                    ))}
                </div>
                <div className="bg-white h-64 rounded-2xl border border-gray-200"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-xl"><CreditCardIcon className="w-6 h-6"/></div>
                        <div className="relative">
                            <button onClick={() => setShowRevenueFilterMenu(!showRevenueFilterMenu)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors" title="Filter Revenue"><FilterIcon className="w-5 h-5"/></button>
                            {showRevenueFilterMenu && (
                                <div className="absolute top-8 right-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden flex flex-col animate-fadeIn">
                                    <div className="p-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">Select Period</div>
                                    {['lifetime', '7d', '30d', '6m', '1y'].map((opt) => (<button key={opt} onClick={() => { setRevenueFilter(opt as any); setShowRevenueFilterMenu(false); }} className={`px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${revenueFilter === opt ? 'font-bold text-indigo-600 bg-indigo-50' : 'text-gray-600'}`}>{getFilterLabel(opt)}</button>))}
                                    <div className="border-t border-gray-100 p-2">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Custom Range</p>
                                        <div className="flex flex-col gap-1">
                                            <input type="date" value={customRange.start} onChange={(e) => setCustomRange({...customRange, start: e.target.value})} className="text-xs border border-gray-200 rounded p-1"/>
                                            <input type="date" value={customRange.end} onChange={(e) => setCustomRange({...customRange, end: e.target.value})} className="text-xs border border-gray-200 rounded p-1"/>
                                            <button onClick={applyCustomRange} disabled={!customRange.start || !customRange.end} className="mt-1 bg-indigo-600 text-white text-xs font-bold py-1 rounded disabled:opacity-50">Apply</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Revenue</p>
                    <div className="flex items-end gap-2">
                        <p className="text-2xl font-black text-[#1A1A1E]">₹{stats.revenue.toLocaleString()}</p>
                        {revenueFilter !== 'lifetime' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mb-1 border border-gray-200">{getFilterLabel(revenueFilter)}</span>}
                    </div>
                </div>

                {/* Users Card */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><UsersIcon className="w-6 h-6"/></div></div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Users</p>
                    <p className="text-2xl font-black text-[#1A1A1E]">{stats.totalUsers.toLocaleString()}</p>
                </div>

                {/* System Status Card */}
                <div className="bg-gray-900 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-xs font-bold uppercase tracking-wider text-gray-400">System</span></div>
                        <p className="text-lg font-bold">Operational</p>
                    </div>
                </div>
            </div>

            {/* LIVE ACTIVE USERS LIST */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Live Active Users</h3>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{activeUsers.length} Online Recently</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                            <tr>
                                <th className="p-3">User</th>
                                <th className="p-3">Plan</th>
                                <th className="p-3">Credits</th>
                                <th className="p-3 text-right">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activeUsers.map(user => (
                                <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-[10px]">{user.name?.[0]}</div>
                                            <div className="truncate max-w-[150px] font-medium text-gray-900">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="p-3"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{user.plan || 'Free'}</span></td>
                                    <td className="p-3 font-mono text-gray-600">{user.credits}</td>
                                    <td className="p-3 text-right text-xs font-bold text-green-600">{formatRelativeTime(user.lastActive)}</td>
                                </tr>
                            ))}
                            {activeUsers.length === 0 && (
                                <tr><td colSpan={4} className="p-6 text-center text-gray-400 text-xs">No active users in the last few minutes.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Overview / Module Shortcuts */}
            <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Admin Modules</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <button 
                        onClick={() => onNavigate('feedback')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-yellow-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><StarIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">Feedback</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">User ratings</p>
                    </button>

                    <button 
                        onClick={() => onNavigate('support')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><LifebuoyIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">Support</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Help desk</p>
                    </button>

                    <button 
                        onClick={() => onNavigate('users')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><UsersIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">Users</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Manage accounts</p>
                    </button>

                    <button 
                        onClick={() => onNavigate('comms')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-green-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><AudioWaveIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">Comms</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Announcements</p>
                    </button>

                    <button 
                        onClick={() => onNavigate('config')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-gray-50 text-gray-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><CogIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">Config</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Pricing & Features</p>
                    </button>

                    <button 
                        onClick={() => onNavigate('system')} 
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-red-400 hover:shadow-md transition-all text-left group"
                    >
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform"><SystemIcon className="w-5 h-5"/></div>
                        <p className="font-bold text-sm text-gray-700">System</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Audit logs</p>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="font-bold text-gray-800 mb-6">Revenue Trend (Last 7 Days)</h3>
                    <div className="h-48 flex items-end justify-between gap-2">
                        {revenueHistory.length > 0 ? revenueHistory.map((item, i) => { const maxAmount = Math.max(...revenueHistory.map(r => r.amount), 100); const heightPercent = Math.max((item.amount / maxAmount) * 100, 5); return (<div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer"><div className="w-full bg-blue-100 rounded-t-lg transition-all duration-500 group-hover:bg-blue-500 relative flex items-end justify-center" style={{ height: `${heightPercent}%` }}><div className="absolute -top-8 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-bold">₹{item.amount.toLocaleString()}</div></div><p className="text-center text-[9px] sm:text-[10px] text-gray-400 mt-2 font-bold truncate px-1">{item.date}</p></div>); }) : (<p className="text-gray-400 text-sm w-full text-center py-10">No revenue data available.</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};
