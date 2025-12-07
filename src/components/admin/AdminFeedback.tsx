
import React, { useState, useEffect, useMemo } from 'react';
import { getRecentFeedbacks, getCreationById, getAllUsers } from '../../firebase';
import { StarIcon, ThumbUpIcon, ThumbDownIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons';
import { AdminImageViewer } from './AdminImageViewer';
import { User } from '../../types';

export const AdminFeedback: React.FC = () => {
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, User>>({});
    const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'up' | 'down'>('all');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // Load Feedbacks and Users in parallel
            const [feed, allUsers] = await Promise.all([
                getRecentFeedbacks(100),
                getAllUsers()
            ]);
            
            setFeedbacks(feed);
            
            // Create a quick lookup map for users
            const map: Record<string, User> = {};
            allUsers.forEach(u => {
                map[u.uid] = u;
            });
            setUsersMap(map);

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
        let result = feedbacks;

        // 1. Status Filter
        if (feedbackFilter !== 'all') {
            result = result.filter(f => f.feedback === feedbackFilter);
        }

        // 2. Date Filter
        if (dateFilter) {
            result = result.filter(f => {
                if (!f.timestamp) return false;
                try {
                    const d = f.timestamp.toDate ? f.timestamp.toDate() : new Date(f.timestamp.seconds * 1000 || f.timestamp);
                    return d.toISOString().split('T')[0] === dateFilter;
                } catch { return false; }
            });
        }

        return result;
    }, [feedbacks, feedbackFilter, dateFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
    const paginatedFeedbacks = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredFeedbacks.slice(start, start + itemsPerPage);
    }, [filteredFeedbacks, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [feedbackFilter, dateFilter]);

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
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><StarIcon className="w-5 h-5"/></div>
                        <h3 className="font-bold text-gray-800">Feedback Feed</h3>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <input 
                            type="date" 
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 focus:outline-none focus:border-indigo-500 bg-white"
                        />
                        {dateFilter && (
                            <button onClick={() => setDateFilter('')} className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100">Clear Date</button>
                        )}
                        <div className="h-6 w-px bg-gray-300 mx-1"></div>
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                            <button onClick={() => setFeedbackFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'all' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>All</button>
                            <button onClick={() => setFeedbackFilter('up')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'up' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-green-600'}`}>Positive</button>
                            <button onClick={() => setFeedbackFilter('down')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${feedbackFilter === 'down' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:text-red-600'}`}>Negative</button>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th className="p-4 w-24">Rating</th>
                                <th className="p-4">Feature & Context</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Time</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading insights...</td></tr>
                            ) : paginatedFeedbacks.length > 0 ? paginatedFeedbacks.map((fb, idx) => {
                                // Resolve User Data
                                const userInMap = usersMap[fb.userId];
                                const displayName = fb.userName || userInMap?.name || 'Unknown User';
                                const displayEmail = fb.userEmail || userInMap?.email || fb.userId;

                                return (
                                    <tr key={fb.id || idx} className="hover:bg-gray-50 transition-colors group">
                                        <td className="p-4 align-top">
                                            {fb.feedback === 'up' ? (
                                                <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold border border-green-100">
                                                    <ThumbUpIcon className="w-3.5 h-3.5" /> Good
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-bold border border-red-100">
                                                    <ThumbDownIcon className="w-3.5 h-3.5" /> Bad
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 align-top">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{fb.feature}</p>
                                                {fb.creationId && <p className="text-[10px] text-gray-400 font-mono mt-0.5 opacity-60">ID: {fb.creationId.slice(0, 8)}...</p>}
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{displayName}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{displayEmail}</p>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top text-xs text-gray-500 whitespace-nowrap">
                                            {formatTableDate(fb.timestamp)}
                                        </td>
                                        <td className="p-4 align-top text-right">
                                            <button 
                                                onClick={() => {
                                                    if (fb.imageUrl) setViewingImage(fb.imageUrl);
                                                    else if (fb.creationId) handleViewGeneratedImage(fb.userId, fb.creationId);
                                                }}
                                                className="text-gray-400 hover:text-indigo-600 transition-colors p-2 hover:bg-indigo-50 rounded-lg inline-flex items-center gap-2"
                                                title="View Full Image"
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1}
                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4"/>
                        </button>
                        <span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                            disabled={currentPage === totalPages}
                            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                        >
                            <ArrowRightIcon className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>
            {viewingImage && <AdminImageViewer src={viewingImage} onClose={() => setViewingImage(null)} />}
        </div>
    );
};
