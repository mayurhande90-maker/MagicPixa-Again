
import React, { useState, useEffect } from 'react';
import { getGlobalFeatureUsage } from '../../firebase';

export const AdminAnalytics: React.FC = () => {
    const [featureUsage, setFeatureUsage] = useState<{feature: string, count: number}[]>([]);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => { 
        const usage = await getGlobalFeatureUsage(); 
        setFeatureUsage(usage); 
    };

    return (
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
    );
};
