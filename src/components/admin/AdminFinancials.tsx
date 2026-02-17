
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, UsageLog, Purchase } from '../../types';
import { getUsageLogs, getRecentPurchases, getTotalRevenue } from '../../firebase';
import { 
    CreditCardIcon, LightningIcon, RefreshIcon, 
    ChartBarIcon, CheckIcon, SparklesIcon, 
    FilterIcon, CalendarIcon, XIcon, ArrowUpCircleIcon,
    InformationCircleIcon
} from '../icons';

const INR_RATE = 90;

type FilterType = '7d' | '15d' | '30d' | 'lifetime' | 'custom';

export const AdminFinancials: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [revenue, setRevenue] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    
    // Filter State
    const [filter, setFilter] = useState<FilterType>('30d');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    const [showCustomRange, setShowCustomRange] = useState(false);

    useEffect(() => {
        loadData();
    }, [filter, customRange]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            let start: Date | undefined;
            let end: Date | undefined;
            let days = 30;

            if (filter === '7d') days = 7;
            else if (filter === '15d') days = 15;
            else if (filter === '30d') days = 30;
            else if (filter === 'lifetime') days = -1;
            else if (filter === 'custom' && customRange.start && customRange.end) {
                start = new Date(customRange.start);
                end = new Date(customRange.end);
                end.setHours(23, 59, 59, 999);
            }

            if (days !== -1 && filter !== 'custom') {
                start = new Date();
                start.setDate(start.getDate() - days);
                start.setHours(0, 0, 0, 0);
            }

            const [logs, buyHistory, filteredRev] = await Promise.all([
                getUsageLogs(days, start, end),
                getRecentPurchases(1000, start, end),
                getTotalRevenue(start, end)
            ]);

            setUsageLogs(logs);
            setPurchases(buyHistory);
            setRevenue(filteredRev);
        } catch (e) {
            console.error("Failed to load financial data:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const analytics = useMemo(() => {
        const totalGens = usageLogs.length;
        const totalBurnUsd = usageLogs.reduce((acc, log) => acc + (log.estimatedCost || 0), 0);
        const totalBurnInr = totalBurnUsd * INR_RATE;
        const netProfit = revenue - totalBurnInr;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        // Feature Breakdown
        const featureStats: Record<string, { count: number; burn: number }> = {};
        usageLogs.forEach(log => {
            const f = log.feature || 'Unknown';
            if (!featureStats[f]) featureStats[f] = { count: 0, burn: 0 };
            featureStats[f].count++;
            featureStats[f].burn += (log.estimatedCost || 0) * INR_RATE;
        });

        // Grouping for Trends (Daily or Monthly)
        const timeGroups: Record<string, { burn: number; revenue: number; gens: number }> = {};
        
        const isLifetime = filter === 'lifetime';
        
        // Group Burn
        usageLogs.forEach(log => {
            const date = log.timestamp?.toDate ? log.timestamp.toDate() : new Date((log.timestamp as any).seconds * 1000);
            const key = isLifetime 
                ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (!timeGroups[key]) timeGroups[key] = { burn: 0, revenue: 0, gens: 0 };
            timeGroups[key].burn += (log.estimatedCost || 0) * INR_RATE;
            timeGroups[key].gens++;
        });

        // Group Revenue
        purchases.forEach(p => {
            const date = p.purchaseDate?.toDate ? p.purchaseDate.toDate() : new Date((p.purchaseDate as any).seconds * 1000);
            const key = isLifetime 
                ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            if (!timeGroups[key]) timeGroups[key] = { burn: 0, revenue: 0, gens: 0 };
            timeGroups[key].revenue += (p.amountPaid || 0);
        });

        // Convert to sorted array for charts
        const trendData = Object.entries(timeGroups).map(([date, data]) => ({ date, ...data }));
        // If daily, sort by date logic would be better but simple reverse often works for desc logs
        // For monthly, sort by date object
        trendData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { totalGens, totalBurnInr, netProfit, profitMargin, featureStats, trendData };
    }, [usageLogs, purchases, revenue, filter]);

    if (isLoading && usageLogs.length === 0) {
        return (
            <div className="p-20 flex flex-col items-center justify-center animate-pulse text-gray-400">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="font-bold uppercase tracking-widest text-xs">Reconciling Ledgers...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Production & Burn Command</h2>
                    <p className="text-sm text-gray-500 font-medium">Monitoring GCP Infrastructure vs. Creator Revenue</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
                        {(['7d', '15d', '30d', 'lifetime'] as FilterType[]).map((f) => (
                            <button 
                                key={f}
                                onClick={() => { setFilter(f); setShowCustomRange(false); }}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filter === f && !showCustomRange ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}
                            >
                                {f}
                            </button>
                        ))}
                        <button 
                            onClick={() => setShowCustomRange(!showCustomRange)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${showCustomRange ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-900'}`}
                        >
                            <CalendarIcon className="w-3 h-3" />
                            Custom
                        </button>
                    </div>

                    <button onClick={loadData} className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
                        <RefreshIcon className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {showCustomRange && (
                <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-500/5 flex flex-wrap items-center gap-6 animate-fadeIn">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                        <input type="date" className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={customRange.start} onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</label>
                        <input type="date" className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500" value={customRange.end} onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} />
                    </div>
                    <button onClick={() => { setFilter('custom'); loadData(); }} disabled={!customRange.start || !customRange.end} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50">Apply Strategy</button>
                    <button onClick={() => setShowCustomRange(false)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XIcon className="w-5 h-5" /></button>
                </div>
            )}

            {/* METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Generations</p>
                    <p className="text-3xl font-black text-gray-900">{analytics.totalGens.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Infrastructure Load</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Revenue</p>
                    <p className="text-3xl font-black text-green-600">₹{revenue.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <CheckIcon className="w-3 h-3 text-green-500"/>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Razorpay Capture</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated GCP Burn</p>
                    <p className="text-3xl font-black text-red-500">₹{Math.ceil(analytics.totalBurnInr).toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-2">
                        <LightningIcon className="w-3 h-3 text-red-500"/>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Rate: 90 INR/USD</span>
                    </div>
                </div>

                <div className={`p-6 rounded-[2.5rem] border-2 shadow-xl relative overflow-hidden transition-all duration-500 ${analytics.netProfit >= 0 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Net surplus</p>
                    <p className="text-3xl font-black">₹{Math.floor(analytics.netProfit).toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-2 font-bold text-[10px]">
                        <SparklesIcon className="w-3 h-3 text-yellow-300"/> 
                        Margin: {analytics.profitMargin.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* FEATURE BREAKDOWN TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Feature Contribution</h3>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Breakdown by Volume & Cost</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[9px] tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Tool Name</th>
                                <th className="px-6 py-4">Usage Count</th>
                                <th className="px-6 py-4">Total Burn (INR)</th>
                                <th className="px-6 py-4">Burn Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {Object.entries(analytics.featureStats)
                                .sort(([,a], [,b]) => b.count - a.count)
                                .map(([name, stats]) => {
                                    const share = (stats.burn / (analytics.totalBurnInr || 1)) * 100;
                                    return (
                                        <tr key={name} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-black text-gray-900">{name}</td>
                                            <td className="px-6 py-4 font-bold text-gray-600">{stats.count.toLocaleString()}</td>
                                            <td className="px-6 py-4 font-black text-red-500">₹{Math.ceil(stats.burn).toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${share}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400">{share.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PERFORMANCE CHART */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase tracking-widest">Growth Trends</h3>
                        <p className="text-xs text-gray-400 font-medium">Daily revenue vs infrastucture cost</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Burn</span>
                        </div>
                    </div>
                </div>

                <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2">
                    {analytics.trendData.map((d, i) => {
                        const maxVal = Math.max(...analytics.trendData.map(t => Math.max(t.revenue, t.burn)), 100);
                        const revHeight = (d.revenue / maxVal) * 100;
                        const burnHeight = (d.burn / maxVal) * 100;

                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative min-w-0">
                                {/* Hover Tooltip */}
                                <div className="absolute -top-16 bg-gray-900 text-white p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-xl border border-white/10 min-w-[120px]">
                                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">{d.date}</p>
                                    <p className="text-xs font-bold">Rev: ₹{Math.floor(d.revenue).toLocaleString()}</p>
                                    <p className="text-xs font-bold text-red-400">Burn: ₹{Math.floor(d.burn).toLocaleString()}</p>
                                    <p className="text-[9px] mt-1 text-gray-400">{d.gens} Generations</p>
                                </div>

                                <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 max-w-[40px]">
                                    <div className="flex-1 bg-indigo-600 rounded-t-sm sm:rounded-t-md transition-all duration-500 group-hover:brightness-110" style={{ height: `${Math.max(revHeight, 2)}%` }}></div>
                                    <div className="flex-1 bg-red-400 rounded-t-sm sm:rounded-t-md transition-all duration-500 group-hover:brightness-110" style={{ height: `${Math.max(burnHeight, 2)}%` }}></div>
                                </div>
                                
                                <p className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-tighter mt-3 whitespace-nowrap rotate-[-45deg] sm:rotate-0 origin-center truncate w-full text-center">
                                    {d.date}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RAW GENERATION LEDGER */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Generation Ledger</h3>
                    <button 
                        onClick={() => {
                            const csv = [
                                "Timestamp,Feature,Model,Cost(USD),Cost(INR)",
                                ...usageLogs.map(l => {
                                    const date = l.timestamp?.toDate ? l.timestamp.toDate() : new Date((l.timestamp as any).seconds * 1000);
                                    return `${date.toISOString()},${l.feature},${l.model},${l.estimatedCost},${l.estimatedCost * INR_RATE}`;
                                })
                            ].join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Pixa_Burn_Report_${new Date().toISOString()}.csv`;
                            a.click();
                        }}
                        className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest"
                    >
                        Export CSV
                    </button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[9px] tracking-widest sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">Feature</th>
                                <th className="px-6 py-3">Model</th>
                                <th className="px-6 py-3 text-right">Cost (INR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {usageLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-[11px] text-gray-500 font-mono">
                                        {log.timestamp ? (log.timestamp.toDate ? log.timestamp.toDate().toLocaleString() : new Date((log.timestamp as any).seconds * 1000).toLocaleString()) : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-700">{log.feature}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-mono text-gray-600">{log.model}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-red-500">₹{(log.estimatedCost * INR_RATE).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
