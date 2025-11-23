
import React, { useState, useEffect, useMemo } from 'react';
import { AuthProps, Creation } from '../types';
import { getCreations, deleteCreation } from '../firebase';
import { downloadImage } from '../utils/imageUtils';
import { 
    AdjustmentsVerticalIcon, 
    ProjectsIcon, 
    DownloadIcon, 
    TrashIcon 
} from '../components/icons';

export const Creations: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeature, setSelectedFeature] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');

    useEffect(() => {
        if (auth.user) {
            getCreations(auth.user.uid).then(data => {
                setCreations(data as Creation[]);
                setLoading(false);
            });
        }
    }, [auth.user]);

    const uniqueFeatures = useMemo(() => Array.from(new Set(creations.map(c => c.feature))).sort(), [creations]);

    const filteredCreations = useMemo(() => {
        return creations.filter(c => {
            if (selectedFeature && c.feature !== selectedFeature) return false;
            if (selectedDate) {
                // Handle Firebase Timestamp or Date object
                const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
                const dateString = cDate.toISOString().split('T')[0];
                if (dateString !== selectedDate) return false;
            }
            return true;
        });
    }, [creations, selectedFeature, selectedDate]);

    const groupedCreations = useMemo(() => {
        const groups: { title: string; items: Creation[] }[] = [];
        
        filteredCreations.forEach(c => {
            const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
            
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let headerKey = cDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            if (cDate.toDateString() === today.toDateString()) {
                headerKey = "Today";
            } else if (cDate.toDateString() === yesterday.toDateString()) {
                headerKey = "Yesterday";
            }

            const lastGroup = groups[groups.length - 1];
            if (lastGroup && lastGroup.title === headerKey) {
                lastGroup.items.push(c);
            } else {
                groups.push({ title: headerKey, items: [c] });
            }
        });
        return groups;
    }, [filteredCreations]);

    const handleDelete = async (e: React.MouseEvent, creation: Creation) => {
        e.stopPropagation();
        if (confirm('Delete this creation?')) {
            if (auth.user) {
                await deleteCreation(auth.user.uid, creation);
                setCreations(prev => prev.filter(c => c.id !== creation.id));
            }
        }
    };

    const handleDownload = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        downloadImage(url, 'creation.png');
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[#1A1A1E]">My Creations</h2>
                    <p className="text-gray-500 mt-1">Manage and view your generated masterpieces.</p>
                </div>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <AdjustmentsVerticalIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <select 
                            value={selectedFeature}
                            onChange={(e) => setSelectedFeature(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] appearance-none hover:bg-gray-50 transition-colors cursor-pointer min-w-[160px]"
                        >
                            <option value="">All Features</option>
                            {uniqueFeatures.map(f => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                         <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] hover:bg-gray-50 transition-colors cursor-pointer"
                         />
                    </div>

                    {(selectedFeature || selectedDate) && (
                        <button 
                            onClick={() => { setSelectedFeature(''); setSelectedDate(''); }}
                            className="px-4 py-2 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#4D7CFF] rounded-full"></div>
                </div>
            ) : groupedCreations.length > 0 ? (
                <div className="space-y-10">
                    {groupedCreations.map((group) => (
                        <div key={group.title} className="animate-fadeIn">
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-lg font-bold text-gray-800 whitespace-nowrap">{group.title}</h3>
                                <div className="h-px bg-gray-200 w-full"></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {group.items.map(c => (
                                    <div 
                                        key={c.id} 
                                        className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-pointer shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
                                        onClick={() => window.open(c.imageUrl, '_blank')}
                                        title="Click to open full resolution in new tab"
                                    >
                                        <img 
                                            src={c.thumbnailUrl || c.imageUrl} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                            alt={c.feature} 
                                            loading="lazy"
                                        />
                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[1px]">
                                            <button 
                                                onClick={(e) => handleDownload(e, c.imageUrl)} 
                                                className="p-2.5 bg-white/90 rounded-full hover:bg-white text-gray-700 hover:text-[#1A1A1E] transform hover:scale-110 transition-all shadow-lg"
                                                title="Download"
                                            >
                                                <DownloadIcon className="w-5 h-5"/>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, c)} 
                                                className="p-2.5 bg-white/90 rounded-full hover:bg-red-50 text-red-500 hover:text-red-600 transform hover:scale-110 transition-all shadow-lg"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>
                                        
                                        {/* Info Tag */}
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate">{c.feature}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <ProjectsIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No creations found</h3>
                    <p className="text-gray-500 text-sm mt-1">Try adjusting your filters or generate something new!</p>
                </div>
            )}
        </div>
    );
};
