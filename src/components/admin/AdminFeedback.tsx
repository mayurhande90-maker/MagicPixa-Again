
import React, { useState, useEffect, useMemo } from 'react';
import { getRecentFeedbacks, getCreationById } from '../../firebase';
import { StarIcon, ThumbUpIcon, ThumbDownIcon, ImageIcon, EyeIcon } from '../icons';
import { AdminImageViewer } from './AdminImageViewer';

export const AdminFeedback: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'up' | 'down'>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        setIsLoading(true);
        try {
            const feed = await getRecentFeedbacks(100);
            setFeedbacks(feed);
        } catch (e) { console.error(e); }
        setIsLoading(false);
    };

    const handleViewGeneratedImage = async (userId: string, creationId: string) => {
        if (!creationId) {
            alert("No Creation ID available.");
            return;
        }
        try {
            const creation = await getCreationById(userId, creationId);
            if (creation && creation.imageUrl) {
                setViewingImage(creation.imageUrl);
            } else {
                alert("Image not found. It may have been deleted.");
            }
        } catch (e: any) {
            console.error("Failed to fetch image", e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: Admin cannot read user creations. Check Firestore rules.");
            } else {
                alert("Error loading image. " + e.message);
            }
        }
    };

    const feedbackStats = useMemo(() => {
        const total = feedbacks.length;
        if (total === 0) return { score: 0, positive: 0, negative: 0, topFeature: '-' };
        
        const positive = feedbacks.filter(f => f.feedback === 'up').length;
        const negative = total - positive;
        const score = Math.round((positive / total) * 100);
        
        const counts: {[key: string]: number} = {};
        feedbacks.forEach(f => {
            if(f.feedback === 'up') counts[f.feature] = (counts[f.feature] || 0) + 1;
        });
        const topFeature = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, '-');

        return { score, positive, negative, topFeature };
    }, [feedbacks]);

    const filteredFeedbacks = useMemo(() => {
        if (feedbackFilter === 'all') return feedbacks;
        return feedbacks.filter(f => f.feedback === feedbackFilter);
    }, [feedbacks, feedbackFilter]);

    const formatTableDate = (timestamp: any) => { if (!timestamp) return '-'; try { const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000 || timestamp); return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return '-'; } };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Dashboard Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Happiness Score */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-green-50 to-green-100 rounded-bl-full -mr-2 -mt-2"></div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Happiness Score</p>
                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <span className={`text-4xl font-black ${feedbackStats.score >= 80 ? 'text-green-600' : feedbackStats.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {feedbackStats.score}%
                        </span>
                        <div className="text-xs font-medium text-gray-500">
                            <p>{feedbackStats.positive} Good</p>
                            <p>{feedbackStats.negative} Bad</p>
                        </div>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden relative z-10">
                        <div className={`h-full rounded-full transition-all duration-1000 ${feedbackStats.score >= 80 ? 'bg-green-500' : feedbackStats.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${feedbackStats.score}%` }}></div>
                    </div>
                </div>

                {/* Volume Stats */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Feedback Volume</p>
                    <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-gray-800">{feedbacks.length}</span>
                        <span className="text-xs text-gray-500 font-medium mb-1.5">responses</span>
                    </div>
                </div>

                {/* Top Feature */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Top Rated Feature</p>
                    <p className="text-xl font-bold text-indigo-600 truncate" title={feedbackStats.topFeature}>{feedbackStats.topFeature}</p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><StarIcon className="w-5 h-5"/></div>
                        <h3 className="font-bold text-gray-800">Feedback Feed</h3>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                            <button onClick={() => setFeedbackFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>All</button>
                            <button onClick={() => setFeedbackFilter('up')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'up' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>Positive</button>
                            <button onClick={() => setFeedbackFilter('down')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'down' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:text-red-600'}`}>Negative</button>
                        </div>
                        <button onClick={loadFeedback} className="p-2 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors" title="Refresh">
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4 w-32">Rating</th>
                                <th className="p-4">Feature & Context</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Time</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && feedbacks.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading insights...</td></tr>
                            ) : filteredFeedbacks.length > 0 ? filteredFeedbacks.map((fb, idx) => (
                                <tr key={fb.id || idx} className="hover:bg-gray-50 transition-colors group">
                                    <td className="p-4">
                                        {fb.feedback === 'up' ? (
                                            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-bold border border-green-100">
                                                <ThumbUpIcon className="w-3.5 h-3.5" /> Good
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100">
                                                <ThumbDownIcon className="w-3.5 h-3.5" /> Bad
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden cursor-zoom-in shrink-0 relative group/thumb"
                                                onClick={() => {
                                                    if (fb.imageUrl) setViewingImage(fb.imageUrl);
                                                    else if (fb.creationId) handleViewGeneratedImage(fb.userId, fb.creationId);
                                                }}
                                            >
                                                {fb.imageUrl ? (
                                                    <img src={fb.imageUrl} className="w-full h-full object-cover" alt="Preview" loading="lazy" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{fb.feature}</p>
                                                {fb.creationId && <p className="text-[10px] text-gray-400 font-mono mt-0.5 opacity-60">ID: {fb.creationId.slice(0, 8)}...</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">U</div>
                                            <span className="text-xs font-medium text-gray-600 font-mono truncate max-w-[120px]" title={fb.userId}>{fb.userId}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                                        {formatTableDate(fb.timestamp)}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => {
                                                if (fb.imageUrl) setViewingImage(fb.imageUrl);
                                                else if (fb.creationId) handleViewGeneratedImage(fb.userId, fb.creationId);
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-lg"
                                            title="View Full Image"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400">
                                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <StarIcon className="w-6 h-6 text-gray-300" />
                                        </div>
                                        No feedback found matching filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {viewingImage && <AdminImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
        </div>
    );
};
