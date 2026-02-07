import React, { useState, useEffect, useRef } from 'react';
import { AuthProps, Creation, View } from '../../types';
import { 
    ProjectsIcon, 
    InformationCircleIcon, 
    DownloadIcon, 
    MagicWandIcon, 
    XIcon, 
    TrashIcon, 
    CheckIcon,
    CreditCoinIcon,
    LockIcon
} from '../../components/icons';
import { getCreations, deleteCreation, updateCreation, deductCredits, saveCreation } from '../../firebase';
import { downloadImage, urlToBase64, base64ToBlobUrl } from '../../utils/imageUtils';
import { ImageModal } from '../../components/FeatureLayout';
import { MobileSheet } from '../components/MobileSheet';
import { refineStudioImage } from '../../services/photoStudioService';
import ToastNotification from '../../components/ToastNotification';
import { createPortal } from 'react-dom';

export const MobileCreations: React.FC<{ auth: AuthProps }> = ({ auth }) => {
    const [creations, setCreations] = useState<Creation[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View State
    const [viewCreation, setViewCreation] = useState<Creation | null>(null);
    
    // Refinement State
    const [isRefineOpen, setIsRefineOpen] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [refineText, setRefineText] = useState('');
    const [refineLoadingText, setRefineLoadingText] = useState("");
    const [progressPercent, setProgressPercent] = useState(0);
    const refineCost = 5;

    // Toast State
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    useEffect(() => {
        if (auth.user) {
            loadCreations();
        }
    }, [auth.user]);

    // Refinement Loading Messages & Progress Sync
    useEffect(() => {
        let interval: any;
        if (isRefining) {
            setProgressPercent(0);
            const steps = [
                "Elite Retoucher: Analyzing pixels...",
                "Optical Audit: Tracing light...",
                "Contact Correction: Depth sync...",
                "Global Illumination: Polishing...",
                "Finalizing masterpiece..."
            ];
            let step = 0;
            setRefineLoadingText(steps[0]);
            interval = setInterval(() => {
                step = (step + 1) % steps.length;
                setRefineLoadingText(steps[step]);
                setProgressPercent(prev => {
                    if (prev >= 98) return prev;
                    return Math.min(prev + (Math.random() * 5), 98);
                });
            }, 1800);
        } else {
            setProgressPercent(0);
        }
        return () => clearInterval(interval);
    }, [isRefining]);

    const loadCreations = async () => {
        if (!auth.user) return;
        setLoading(true);
        try {
            const data = await getCreations(auth.user.uid);
            setCreations(data as Creation[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (creation: Creation) => {
        if (!auth.user) return;
        if (window.confirm("Permanently delete this creation?")) {
            try {
                await deleteCreation(auth.user.uid, creation);
                setCreations(prev => prev.filter(c => c.id !== creation.id));
                setViewCreation(null);
                setToast({ msg: "Creation deleted.", type: 'info' });
            } catch (e) {
                setToast({ msg: "Delete failed.", type: 'error' });
            }
        }
    };

    const handleRefine = async () => {
        if (!viewCreation || !refineText.trim() || !auth.user || isRefining) return;
        
        if (auth.user.credits < refineCost) {
            setToast({ msg: "Insufficient credits.", type: 'error' });
            return;
        }

        setIsRefining(true);
        setIsRefineOpen(false);
        try {
            const currentB64 = await urlToBase64(viewCreation.imageUrl);
            const resB64 = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, viewCreation.feature);
            const blobUrl = await base64ToBlobUrl(resB64, 'image/png');
            
            const dataUri = `data:image/png;base64,${resB64}`;
            const featureName = `(Refined) ${viewCreation.feature}`;
            
            // Deduct credits
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement (Mobile)');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            // Save as NEW creation
            const newId = await saveCreation(auth.user.uid, dataUri, featureName);
            
            // Refresh list
            const freshList = await getCreations(auth.user.uid);
            setCreations(freshList as Creation[]);
            
            // Update modal view to the new result
            const newCreation = freshList.find((c: any) => c.id === newId) as Creation;
            if (newCreation) {
                setViewCreation(newCreation);
            } else {
                setViewCreation(null);
            }
            
            setToast({ msg: "Elite Retoucher: Masterpiece refined!", type: 'success' });
            setRefineText('');
        } catch (e) {
            console.error(e);
            setToast({ msg: "Refinement failed.", type: 'error' });
        } finally {
            setIsRefining(false);
        }
    };

    const isLowRefineCredits = (auth.user?.credits || 0) < refineCost;

    return (
        <div className="p-6 h-full flex flex-col animate-fadeIn">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none">My Creations</h1>
                    <div className="mt-2 flex items-center gap-2 text-[9px] text-amber-600 font-black uppercase bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 w-fit">
                        <InformationCircleIcon className="w-3 h-3" />
                        <span>15-Day Auto-Cleanup</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : creations.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pb-20">
                    {creations.map((c) => (
                        <div 
                            key={c.id} 
                            onClick={() => setViewCreation(c)}
                            className="group relative aspect-square bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer"
                        >
                            <img src={c.imageUrl} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                                <p className="text-[8px] font-black text-white/80 uppercase truncate">{c.feature}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                    <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-4">
                        <ProjectsIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Your lab is empty</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1 max-w-[200px]">Start creating in the Studio to populate your gallery.</p>
                </div>
            )}

            {/* FULL SCREEN IMAGE MODAL */}
            {viewCreation && (
                <ImageModal 
                    imageUrl={viewCreation.imageUrl}
                    onClose={() => setViewCreation(null)}
                    onDownload={() => downloadImage(viewCreation.imageUrl, 'pixa-creation.png')}
                    onDelete={() => handleDelete(viewCreation)}
                >
                    {/* Action Bar inside modal (Overlays at bottom) */}
                    <div className="flex flex-col items-center gap-4 w-full pointer-events-auto" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setIsRefineOpen(true)}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all"
                        >
                            <MagicWandIcon className="w-5 h-5 text-yellow-300" />
                            Make Changes
                        </button>
                    </div>
                </ImageModal>
            )}

            {/* REFINEMENT TRAY */}
            <MobileSheet 
                isOpen={isRefineOpen} 
                onClose={() => setIsRefineOpen(false)} 
                title={
                    <div className="flex items-center gap-3">
                        <span>Refine Creation</span>
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100 shrink-0">
                            <CreditCoinIcon className="w-2.5 h-2.5 text-indigo-600" />
                            <span className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">{refineCost} Credits</span>
                        </div>
                    </div>
                }
            >
                <div className="space-y-6 pb-6">
                    <textarea 
                        value={refineText} 
                        onChange={e => setRefineText(e.target.value)} 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none h-32" 
                        placeholder="e.g. Make the lighting warmer, add focus to the product label..." 
                    />
                    
                    {isLowRefineCredits ? (
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center gap-3">
                            <div className="flex items-center gap-2 text-red-700">
                                <LockIcon className="w-4 h-4" />
                                <span className="text-[11px] font-black uppercase tracking-tight">Insufficient Balance</span>
                            </div>
                            <p className="text-[10px] text-red-600/80 font-medium text-center px-4">
                                Refinement requires {refineCost} credits.
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleRefine} 
                            disabled={!refineText.trim() || isRefining} 
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${!refineText.trim() || isRefining ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}
                        >
                            Apply Refinement
                        </button>
                    )}
                </div>
            </MobileSheet>

            {/* PROCESSING OVERLAY (When refining) */}
            {isRefining && createPortal(
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center text-center px-10 animate-fadeIn">
                    <div className="relative w-24 h-24 flex items-center justify-center mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="44" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                            <circle 
                                cx="48" cy="48" r="44" 
                                fill="transparent" 
                                stroke="currentColor" 
                                strokeWidth="4" 
                                className="text-indigo-500" 
                                strokeDasharray={276.4} 
                                strokeDashoffset={276.4 - (276.4 * (progressPercent / 100))} 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <div className="absolute text-sm font-black text-white">{Math.round(progressPercent)}%</div>
                    </div>
                    <h2 className="text-xl font-black text-white mb-2 tracking-tight">Refining Identity...</h2>
                    <p className="text-sm font-bold text-indigo-200/60 uppercase tracking-widest animate-pulse">{refineLoadingText}</p>
                </div>,
                document.body
            )}

            {toast && (
                <ToastNotification 
                    message={toast.msg} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}

            <style>{`
                @keyframes materialize { 
                    0% { filter: grayscale(1) contrast(2) brightness(0.5) blur(15px); opacity: 0; transform: scale(0.95); } 
                    100% { filter: grayscale(0) contrast(1) brightness(1) blur(0px); opacity: 1; transform: scale(1); } 
                }
                .animate-materialize { animation: materialize 0.8s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                @keyframes cta-pulse { 0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 0 rgba(249, 210, 48, 0.4); } 50% { transform: scale(1.08); box-shadow: 0 0 20px 10px rgba(249, 210, 48, 0); } }
                .animate-cta-pulse { animation: cta-pulse 2s ease-in-out infinite; }
                @keyframes breathe { 0%, 100% { transform: scale(1); border-color: rgba(99, 102, 241, 0.2); } 50% { transform: scale(1.02); border-color: rgba(99, 102, 241, 0.5); } }
                .animate-breathe { animation: breathe 4s ease-in-out infinite; }
            `}</style>
        </div>
    );
};
