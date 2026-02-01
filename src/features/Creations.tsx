
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AuthProps, Creation } from '../types';
// Add saveCreation to the imports from firebase
import { getCreations, deleteCreation, updateCreation, deductCredits, saveCreation } from '../firebase';
import { downloadImage, urlToBase64, base64ToBlobUrl } from '../utils/imageUtils';
import { refineStudioImage } from '../services/photoStudioService';
import { ImageModal } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import ToastNotification from '../components/ToastNotification';
import { 
    AdjustmentsVerticalIcon, 
    ProjectsIcon, 
    DownloadIcon, 
    TrashIcon,
    CheckIcon,
    XIcon,
    InformationCircleIcon,
    CreditCardIcon,
    MagicWandIcon
} from '../components/icons';

const FILTER_CATEGORIES = [
    { label: 'Pixa Product Shots', key: 'Product' },
    { label: 'Pixa Thumbnail Pro', key: 'Thumbnail' },
    { label: 'Pixa Headshot Pro', key: 'Headshot' },
    { label: 'Pixa AdMaker', key: 'AdMaker' },
    { label: 'Pixa Ecommerce Kit', key: 'Ecommerce' },
    { label: 'Pixa Together', key: 'Together' },
    { label: 'Pixa Photo Restore', key: 'Restore' },
    { label: 'Pixa Caption Pro', key: 'Caption' },
    { label: 'Pixa Interior Design', key: 'Interior' },
    { label: 'Pixa TryOn', key: 'TryOn' },
    { label: 'Campaign Studio', key: 'Campaign' },
    { label: 'Daily Missions', key: 'Mission' },
];

export const Creations: React.FC<{ auth: AuthProps; navigateTo: any }> = ({ auth, navigateTo }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeature, setSelectedFeature] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    
    // View State
    const [viewCreation, setViewCreation] = useState<Creation | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [refineLoadingText, setRefineLoadingText] = useState("");
    const refineCost = 5;

    // Selection Mode State
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Notification State
    const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Cleanup Ref to ensure it runs once per mount
    const cleanupRan = useRef(false);

    useEffect(() => {
        let isMounted = true;

        const loadAndCleanup = async () => {
            if (!auth.user) return;

            try {
                const data = await getCreations(auth.user.uid);
                const allCreations = data as Creation[];
                
                // --- LAZY CLEANUP LOGIC ---
                if (!cleanupRan.current) {
                    cleanupRan.current = true;
                    
                    const now = new Date();
                    const expiredCreations: Creation[] = [];
                    const validCreations: Creation[] = [];

                    allCreations.forEach(c => {
                        const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt as any);
                        const diffTime = Math.abs(now.getTime() - cDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        
                        if (diffDays > 15) {
                            expiredCreations.push(c);
                        } else {
                            validCreations.push(c);
                        }
                    });

                    if (expiredCreations.length > 0) {
                        Promise.all(expiredCreations.map(c => deleteCreation(auth.user!.uid, c)))
                            .catch(err => console.error("Auto-cleanup error", err));

                        setToastMsg({ msg: `Cleaned up ${expiredCreations.length} expired images (older than 15 days).`, type: 'info' });
                        
                        if (isMounted) {
                            setCreations(validCreations);
                            setLoading(false);
                        }
                        return;
                    }
                }

                if (isMounted) {
                    setCreations(allCreations);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Failed to load creations", error);
                if (isMounted) setLoading(false);
            }
        };

        loadAndCleanup();

        return () => { isMounted = false; };
    }, [auth.user]);

    // Refinement Loading Messages
    useEffect(() => {
        let interval: any;
        if (isRefining) {
            const steps = [
                "Elite Retoucher: Analyzing previous generation...",
                "Optical Audit: Sampling light transport...",
                "Contact Correction: Refining shadow depth...",
                "Global Illumination: Applying color fidelity...",
                "Post-Production: Final pixel polish..."
            ];
            let step = 0;
            setRefineLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setRefineLoadingText(steps[step]);
            }, 1800);
        }
        return () => clearInterval(interval);
    }, [isRefining]);

    const filteredCreations = useMemo(() => {
        return creations.filter(c => {
            if (selectedFeature && !c.feature.toLowerCase().includes(selectedFeature.toLowerCase())) {
                if (selectedFeature === 'Product' && c.feature.toLowerCase().includes('model')) return true;
                return false;
            }
            if (selectedDate) {
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

    const getDaysOld = (creation: Creation): number => {
        const cDate = creation.createdAt?.toDate ? creation.createdAt.toDate() : new Date(creation.createdAt as any);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - cDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays;
    };

    const handleDelete = async (creation: Creation) => {
        if (confirm('Delete this creation? This action cannot be undone.')) {
            if (auth.user) {
                await deleteCreation(auth.user.uid, creation);
                setCreations(prev => prev.filter(c => c.id !== creation.id));
                setViewCreation(null); 
            }
        }
    };

    const handleDownload = (url: string) => {
        downloadImage(url, 'creation.png');
    };

    const handleRefine = async (refineText: string) => {
        if (!viewCreation || !refineText.trim() || !auth.user) return;
        if (auth.user.credits < refineCost) {
            setToastMsg({ msg: "Insufficient credits for refinement.", type: 'error' });
            return;
        }

        setIsRefining(true);
        setIsRefineActive(false);
        try {
            const currentB64 = await urlToBase64(viewCreation.imageUrl);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, `${viewCreation.feature} Refinement`);
            
            const dataUri = `data:image/png;base64,${res}`;
            const featureName = `(Refined) ${viewCreation.feature}`;
            
            // Deduct Credits
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            // Save as NEW Creation (Versioning)
            const newId = await saveCreation(auth.user.uid, dataUri, featureName);
            
            // Fetch updated list to show the new version in background
            const freshList = await getCreations(auth.user.uid);
            setCreations(freshList as Creation[]);
            
            // Update view to the new image if found, else keep current (to avoid closing modal)
            const newCreation = freshList.find((c: any) => c.id === newId) as Creation;
            if (newCreation) {
                setViewCreation(newCreation);
            }
            
            setToastMsg({ msg: "Elite Retoucher: Masterpiece refined!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            setToastMsg({ msg: "Refinement failed. Try again with a clearer prompt.", type: 'error' });
        } finally {
            setIsRefining(false);
        }
    };

    const toggleSelectMode = () => {
        if (isSelectMode) {
            setIsSelectMode(false);
            setSelectedIds(new Set());
        } else {
            setIsSelectMode(true);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const handleBulkDownload = async () => {
        const total = selectedIds.size;
        if (total === 0) return;

        const idsToDownload = Array.from(selectedIds);
        for (let i = 0; i < idsToDownload.length; i++) {
            const id = idsToDownload[i];
            const creation = creations.find(c => c.id === id);
            if (creation) {
                downloadImage(creation.imageUrl, `magicpixa-${creation.feature.replace(/\s+/g, '-').toLowerCase()}-${i + 1}.png`);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        setIsSelectMode(false);
        setSelectedIds(new Set());
    };

    const handleBulkDelete = async () => {
        const total = selectedIds.size;
        if (total === 0) return;

        if (confirm(`Are you sure you want to delete these ${total} items? This cannot be undone.`)) {
            const idsToDelete = Array.from(selectedIds);
            
            if (auth.user) {
                for (const id of idsToDelete) {
                    const creation = creations.find(c => c.id === id);
                    if (creation) {
                        await deleteCreation(auth.user.uid, creation);
                    }
                }
                setCreations(prev => prev.filter(c => !selectedIds.has(c.id)));
                setIsSelectMode(false);
                setSelectedIds(new Set());
            }
        }
    };

    return (
        <div className="p-[min(3.5vh,24px)] md:p-[min(5vh,40px)] max-w-7xl mx-auto min-h-screen pb-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[min(3.5vh,32px)] gap-4">
                <div>
                    <h2 className="text-[clamp(24px,4vh,32px)] font-bold text-[#1A1A1E]">My Creations</h2>
                    <p className="text-gray-500 mt-1 text-[clamp(11px,1.5vh,14px)]">Manage and view your generated masterpieces.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={toggleSelectMode}
                        className={`px-4 py-[min(1.2vh,10px)] rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                            isSelectMode 
                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        {isSelectMode ? (
                            <>
                                <XIcon className="w-4 h-4"/> Cancel
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-4 h-4"/> Select
                            </>
                        )}
                    </button>

                    <div className="h-6 w-px bg-gray-300 mx-1"></div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                             <AdjustmentsVerticalIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <select 
                            value={selectedFeature}
                            onChange={(e) => setSelectedFeature(e.target.value)}
                            className="pl-9 pr-4 py-[min(1.2vh,10px)] bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] appearance-none hover:bg-gray-50 transition-colors cursor-pointer min-w-[180px]"
                        >
                            <option value="">All Features</option>
                            {FILTER_CATEGORIES.map(cat => (
                                <option key={cat.key} value={cat.key}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                         <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="px-4 py-[min(1.2vh,10px)] bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#4D7CFF] focus:ring-1 focus:ring-[#4D7CFF] hover:bg-gray-50 transition-colors cursor-pointer"
                         />
                    </div>

                    {(selectedFeature || selectedDate) && (
                        <button 
                            onClick={() => { setSelectedFeature(''); setSelectedDate(''); }}
                            className="px-4 py-[min(1.2vh,10px)] text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-[min(3.5vh,32px)] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-[min(2.5vh,20px)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full text-blue-500 shadow-sm">
                        <InformationCircleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">15-Day Temporary Gallery</p>
                        <p className="text-xs text-gray-600">To maintain optimal performance, creations are automatically deleted 15 days after generation. Please download your favorites!</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-[#4D7CFF] rounded-full"></div>
                </div>
            ) : groupedCreations.length > 0 ? (
                <div className="space-y-[min(6vh,48px)]">
                    {groupedCreations.map((group) => (
                        <div key={group.title} className="animate-fadeIn">
                            <div className="flex items-center gap-4 mb-[min(3vh,24px)]">
                                <h3 className="text-[clamp(14px,2vh,18px)] font-bold text-gray-800 whitespace-nowrap">{group.title}</h3>
                                <div className="h-px bg-gray-200 w-full"></div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[min(3vh,24px)]">
                                {group.items.map(c => {
                                    const isSelected = selectedIds.has(c.id);
                                    const daysOld = getDaysOld(c);
                                    const daysRemaining = 15 - daysOld;
                                    const isExpiringSoon = daysRemaining <= 5;
                                    const featureLabel = c.feature;

                                    return (
                                        <div 
                                            key={c.id} 
                                            className={`group relative aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer shadow-sm transition-all duration-200 ${
                                                isSelectMode 
                                                    ? isSelected 
                                                        ? 'ring-4 ring-[#4D7CFF] scale-95' 
                                                        : 'ring-2 ring-transparent hover:ring-gray-200 scale-95 opacity-80 hover:opacity-100'
                                                    : isExpiringSoon 
                                                        ? 'hover:shadow-md ring-2 ring-red-400' 
                                                        : 'hover:shadow-md border border-gray-200'
                                            }`}
                                            onClick={() => {
                                                if (isSelectMode) {
                                                    toggleSelection(c.id);
                                                } else {
                                                    setViewCreation(c);
                                                    setIsRefineActive(false);
                                                }
                                            }}
                                        >
                                            <img 
                                                src={c.thumbnailUrl || c.imageUrl} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                                alt={c.feature} 
                                                loading="lazy"
                                            />
                                            
                                            {isExpiringSoon && (
                                                <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[9px] font-bold text-center py-1 z-20">
                                                    EXPIRES IN {daysRemaining} DAYS
                                                </div>
                                            )}

                                            {isSelectMode && (
                                                <div className="absolute top-3 right-3 z-20">
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                        isSelected 
                                                        ? 'bg-[#4D7CFF] border-[#4D7CFF]' 
                                                        : 'bg-black/20 border-white backdrop-blur-sm'
                                                    }`}>
                                                        {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                </div>
                                            )}

                                            {!isSelectMode && (
                                                <div className="absolute top-2 right-2 z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDownload(c.imageUrl);
                                                        }}
                                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-700 hover:text-[#1A1A1E] hover:bg-white shadow-sm border border-gray-100 transition-all hover:scale-105"
                                                        title="Download"
                                                    >
                                                        <DownloadIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                                                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg inline-block shadow-sm max-w-full">
                                                    <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{featureLabel}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
            
            {isSelectMode && selectedIds.size > 0 && (
                <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-[fadeInUp_0.3s_ease-out]">
                    <div className="bg-[#1A1A1E] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-gray-800">
                        <span className="text-sm font-bold text-gray-300">{selectedIds.size} Selected</span>
                        
                        <div className="h-6 w-px bg-gray-700"></div>
                        
                        <button 
                            onClick={handleBulkDownload}
                            className="flex items-center gap-2 text-sm font-bold hover:text-[#F9D230] transition-colors"
                        >
                            <DownloadIcon className="w-4 h-4"/> Download All
                        </button>
                        
                        <button 
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors"
                        >
                            <TrashIcon className="w-4 h-4"/> Delete
                        </button>
                    </div>
                </div>
            )}

            {viewCreation && (
                <ImageModal 
                    imageUrl={viewCreation.imageUrl} 
                    onClose={() => { setViewCreation(null); setIsRefineActive(false); }}
                    onDownload={() => handleDownload(viewCreation.imageUrl)}
                    onDelete={() => handleDelete(viewCreation)}
                >
                    <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
                        {isRefining ? (
                            <div className="bg-gray-900/90 backdrop-blur-xl px-10 py-6 rounded-[2rem] border border-white/20 shadow-2xl flex flex-col items-center gap-4 animate-fadeIn">
                                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="text-xs font-black text-white uppercase tracking-[0.2em] animate-pulse text-center">{refineLoadingText}</p>
                            </div>
                        ) : (
                            <>
                                <RefinementPanel 
                                    isActive={isRefineActive} 
                                    isRefining={isRefining} 
                                    onClose={() => setIsRefineActive(false)} 
                                    onRefine={handleRefine} 
                                    refineCost={refineCost} 
                                />
                                
                                {!isRefineActive && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setIsRefineActive(true); }}
                                        className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-8 py-3.5 rounded-2xl transition-all border border-white/20 shadow-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 pointer-events-auto"
                                    >
                                        <MagicWandIcon className="w-5 h-5 text-yellow-300" />
                                        Make Changes
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </ImageModal>
            )}

            {toastMsg && (
                <ToastNotification 
                    message={toastMsg.msg} 
                    type={toastMsg.type} 
                    onClose={() => setToastMsg(null)} 
                />
            )}
        </div>
    );
};
