import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, UsageLog, Purchase } from '../../types';
import { getUsageLogs, getRecentPurchases, getDashboardStats, scanStorageUsage } from '../../firebase';
import { 
    CreditCardIcon, LightningIcon, CubeIcon, ShieldCheckIcon, 
    ArrowUpCircleIcon, InformationCircleIcon, RefreshIcon, 
    ChartBarIcon, CurrencyDollarIcon, CubeIcon as BoxIcon,
    CheckIcon, SparklesIcon
} from '../icons';

// GOOGLE AI ESTIMATES (USD)
const RATES = {
    'gemini-3-pro-image-preview': 0.02, // approx per image
    'gemini-2.5-flash-image': 0.002, 
    'gemini-3-pro-preview': 0.0005, // per 1k tokens avg
    'gemini-3-flash-preview': 0.0001,
    'storage_per_gb': 0.026 // Monthly
};

export const AdminFinancials: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [stats, setStats] = useState({ revenue: 0, totalUsers: 0 });
    const [storage, setStorage] = useState({ totalBytes: 0, fileCount: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isScanningStorage, setIsScanningStorage] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [logs, buyHistory, dbStats] = await Promise.all([
                getUsageLogs(30),
                getRecentPurchases(100),
                getDashboardStats()
            ]);
            setUsageLogs(logs);
            setPurchases(buyHistory);
            setStats(dbStats);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScanStorage = async () => {
        setIsScanningStorage(true);
        try {
            const res = await scanStorageUsage();
            setStorage(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsScanningStorage(false);
        }
    };

    const financialData = useMemo(() => {
        // 1. Total Burn (USD to INR approx 84)
        const burnUsd = usageLogs.reduce((acc, log) => acc + (log.estimatedCost || 0), 0);
        const burnInr = burnUsd * 84;

        // 2. Storage Cost (Current Month Estimate)
        const storageGb = storage.totalBytes / (1024 * 1024 * 1024);
        const storageCostUsd = storageGb * RATES.storage_per_gb;
        const storageCostInr = storageCostUsd * 84;

        // 3. Profit
        const totalBurn = burnInr + storageCostInr;
        const profit = stats.revenue - totalBurn;
        const margin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0;

        // 4. Feature Breakdown
        const featureBurn: Record<string, number> = {};
        usageLogs.forEach(log => {
            featureBurn[log.feature] = (featureBurn[log.feature] || 0) + (log.estimatedCost * 84);
        });

        return { burnInr, storageGb, storageCostInr, profit, margin, featureBurn };
    }, [usageLogs, stats, storage]);

    if (isLoading) return <div className="p-20 text-center animate-pulse text-gray-400">Aggregating Ledgers...</div>;

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Financial Health</h2>
                    <p className="text-sm text-gray-500 font-medium">Profit vs. Burn Analysis (Last 30 Days)</p>
                </div>
                <button onClick={loadData} className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <RefreshIcon className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            {/* TOP METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Revenue</p>
                    <p className="text-3xl font-black text-gray-900">₹{stats.revenue.toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1 text-green-500 font-bold text-[10px]">
                        <CheckIcon className="w-3 h-3"/> Active Ledger
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated Burn</p>
                    <p className="text-3xl font-black text-red-500">₹{Math.ceil(financialData.burnInr).toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1 text-red-400 font-bold text-[10px]">
                        <LightningIcon className="w-3 h-3"/> AI Inference
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Storage Cost</p>
                    <p className="text-3xl font-black text-amber-600">₹{financialData.storageCostInr.toFixed(2)}</p>
                    <div className="mt-2 flex items-center gap-1 text-amber-500 font-bold text-[10px]">
                        <InformationCircleIcon className="w-3 h-3"/> {financialData.storageGb.toFixed(2)} GB Used
                    </div>
                </div>

                <div className={`p-6 rounded-[2rem] border-2 shadow-xl relative overflow-hidden ${financialData.profit >= 0 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Estimated Profit</p>
                    <p className="text-3xl font-black">₹{Math.floor(financialData.profit).toLocaleString()}</p>
                    <div className="mt-2 flex items-center gap-1 font-bold text-[10px]">
                        <SparklesIcon className="w-3 h-3 text-yellow-300"/> Margin: {financialData.margin.toFixed(1)}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Burn Breakdown */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <ChartBarIcon className="w-5 h-5 text-indigo-500"/> Burn Breakdown
                    </h3>
                    <div className="space-y-6">
                        {Object.entries(financialData.featureBurn)
                            .sort(([,a], [,b]) => b - a)
                            .map(([feature, cost]) => {
                                const percent = (cost / financialData.burnInr) * 100;
                                return (
                                    <div key={feature}>
                                        <div className="flex justify-between text-[11px] font-bold mb-2">
                                            <span className="text-gray-700">{feature}</span>
                                            <span className="text-gray-400">₹{Math.ceil(cost).toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                        {Object.keys(financialData.featureBurn).length === 0 && (
                            <div className="py-10 text-center text-gray-400 text-xs font-medium italic">No usage logged in current period.</div>
                        )}
                    </div>
                </div>

                {/* Storage Health */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                        <BoxIcon className="w-5 h-5 text-amber-500"/> Cloud Storage Health
                    </h3>
                    
                    <div className="flex-1 flex flex-col justify-center items-center text-center">
                        <div className="relative mb-8">
                            <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-2xl font-black text-gray-900">{Math.round((financialData.storageGb / 5) * 100)}%</p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Free Tier</p>
                                </div>
                            </div>
                            <svg className="absolute inset-0 w-32 h-32 transform -rotate-90">
                                <circle 
                                    cx="64" cy="64" r="56" 
                                    fill="transparent" 
                                    stroke="currentColor" 
                                    strokeWidth="8" 
                                    className="text-amber-500"
                                    strokeDasharray={351.8}
                                    strokeDashoffset={351.8 - (351.8 * Math.min(financialData.storageGb / 5, 1))}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-8 w-full">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Assets</p>
                                <p className="text-xl font-black text-gray-900">{storage.fileCount.toLocaleString()}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Bucket Weight</p>
                                <p className="text-xl font-black text-gray-900">{financialData.storageGb.toFixed(2)} GB</p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleScanStorage}
                        disabled={isScanningStorage}
                        className="mt-10 w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl border border-gray-200 transition-all flex items-center justify-center gap-2"
                    >
                        {isScanningStorage ? (
                            <><div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div> Scanning Bucket...</>
                        ) : (
                            <><ArrowUpCircleIcon className="w-4 h-4"/> Scan Storage Now</>
                        )}
                    </button>
                    <p className="text-[9px] text-gray-400 text-center mt-3 italic">Calculated using Firebase Storage metadata scan.</p>
                </div>
            </div>

            {/* RECENT PURCHASES MINI LIST */}
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest">Recent Inflow</h3>
                    <button className="text-[10px] font-bold text-indigo-600 hover:underline">View All Purchases</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[9px] tracking-widest sticky top-0">
                            <tr>
                                <th className="px-6 py-3">User</th>
                                <th className="px-6 py-3">Package</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchases.slice(0, 10).map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-xs">{p.userEmail}</p>
                                        <p className="text-[10px] text-gray-400">{p.userName}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{p.packName}</span>
                                    </td>
                                    <td className="px-6 py-4 text-[10px] text-gray-500 font-mono">
                                        {p.purchaseDate ? new Date(p.purchaseDate.seconds * 1000).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-black text-green-600">₹{p.amountPaid}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};