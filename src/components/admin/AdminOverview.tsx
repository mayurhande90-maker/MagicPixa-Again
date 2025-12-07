
import React, { useState, useEffect } from 'react';
import { User, Purchase } from '../../types';
import { getRecentSignups, getRecentPurchases, getTotalRevenue, getRevenueStats, get24HourCreditBurn, getAllUsers } from '../../firebase';
import { CreditCardIcon, FilterIcon, UsersIcon, ImageIcon } from '../icons';

export const AdminOverview: React.FC = () => {
    const [stats, setStats] = useState<{ revenue: number, signups: User[], purchases: Purchase[] }>({ revenue: 0, signups: [], purchases: [] });
    const [burnStats, setBurnStats] = useState({ totalBurn: 0, burn24h: 0 });
    const [revenueHistory, setRevenueHistory] = useState<{ date: string; amount: number }[]>([]);
    const [revenueFilter, setRevenueFilter] = useState<'7d' | '30d' | '6m' | '1y' | 'lifetime' | 'custom'>('lifetime');
    const [showRevenueFilterMenu, setShowRevenueFilterMenu] = useState(false);
    const [customRange, setCustomRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
    
    // For counting total users
    const [totalUsersCount, setTotalUsersCount] = useState(0);

    useEffect(() => {
        loadOverview();
    }, []);

    const fetchRevenueWithFilter = async () => {
        let start: Date | undefined;
        let end: Date | undefined = new Date();
        if (revenueFilter === '7d') { start = new Date(); start.setDate(start.getDate() - 7); } 
        else if (revenueFilter === '30d') { start = new Date(); start.setDate(start.getDate() - 30); } 
        else if (revenueFilter === '6m') { start = new Date(); start.setMonth(start.getMonth() - 6); } 
        else if (revenueFilter === '1y') { start = new Date(); start.setFullYear(start.getFullYear() - 1); } 
        else if (revenueFilter === 'custom') { if (customRange.start) start = new Date(customRange.start); if (customRange.end) end = new Date(customRange.end); if (end) end.setHours(23, 59, 59, 999); } 
        else { start = undefined; end = undefined; }
        try { const total = await getTotalRevenue(start, end); setStats(prev => ({ ...prev, revenue: total })); } catch (e) { console.error("Failed to fetch filtered revenue", e); }
    };

    useEffect(() => {
        fetchRevenueWithFilter();
    }, [revenueFilter]);

    const applyCustomRange = () => { if (customRange.start && customRange.end) { setRevenueFilter('custom'); setShowRevenueFilterMenu(false); } };

    const loadOverview = async () => {
        try {
            const [signups, purchases, revHistory] = await Promise.all([ getRecentSignups(10), getRecentPurchases(10), getRevenueStats(7) ]);
            // Revenue loaded by separate effect or initial fetch
            const rev = await getTotalRevenue();
            setStats({ revenue: rev, signups, purchases });
            setRevenueHistory(revHistory);
            
            const burn24 = await get24HourCreditBurn();
            const allUsersSnap = await getAllUsers();
            setTotalUsersCount(allUsersSnap.length);

            let totalAcquired = 0; let totalHeld = 0;
            allUsersSnap.forEach(u => { totalAcquired += (u.totalCreditsAcquired || u.credits || 0); totalHeld += (u.credits || 0); });
            setBurnStats({ totalBurn: Math.max(0, totalAcquired - totalHeld), burn24h: burn24 });
        } catch (e) { console.error("Failed to load overview", e); }
    };

    const getFilterLabel = (f: string) => { switch(f) { case '7d': return 'Last 7 Days'; case '30d': return 'Last 30 Days'; case '6m': return 'Last 6 Months'; case '1y': return 'Last 1 Year'; case 'custom': return 'Custom Range'; default: return 'Lifetime'; } };

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><UsersIcon className="w-6 h-6"/></div></div>
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Users</p>
                    <p className="text-2xl font-black text-[#1A1A1E]">{totalUsersCount}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full -mr-10 -mt-10 blur-xl opacity-50"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10"><div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><ImageIcon className="w-6 h-6"/></div></div>
                    <p className="text-xs font-bold text-gray-400 uppercase relative z-10">Lifetime Credit Burn</p>
                    <div className="flex items-end gap-2 relative z-10">
                        <p className="text-2xl font-black text-[#1A1A1E]">{burnStats.totalBurn.toLocaleString()}</p>
                        <span className="text-xs font-bold text-orange-600 mb-1">-{burnStats.burn24h} (24h)</span>
                    </div>
                </div>
                <div className="bg-gray-900 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-xs font-bold uppercase tracking-wider text-gray-400">System</span></div>
                        <p className="text-lg font-bold">Operational</p>
                    </div>
                    {/* Link to system handled by parent navigation logic usually, but here we can't switch tabs easily without prop. Removing internal link. */}
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
