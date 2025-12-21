import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { ThumbnailIcon, XIcon, UploadTrayIcon, CreditCoinIcon, SparklesIcon, MagicWandIcon, CheckIcon, DownloadIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, UserIcon, CaptionIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone, UploadPlaceholder } from '../components/FeatureLayout';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateThumbnail } from '../services/thumbnailService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';

export const ThumbnailStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void; }> = ({ auth, appConfig, navigateTo }) => {
    const [format, setFormat] = useState<'landscape' | 'portrait'>('landscape');
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const categories = ['Entertainment', 'Gaming', 'Vlogs', 'Fashion & Beauty', 'Tech', 'Education', 'Food & Cooking', 'Podcast'];

    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Analyzing Trends...", 
                "Identifying Viral Colors...", 
                "Designing Visual Hook...", 
                "Synthesizing Lighting...",
                "Optimizing CTR..."
            ]; 
            let step = 0; 
            setLoadingText(steps[0]); 
            interval = setInterval(() => { 
                step = (step + 1) % steps.length; 
                setLoadingText(steps[step]); 
            }, 2000); 
        } 
        return () => clearInterval(interval); 
    }, [loading]);

    useEffect(() => { return () => { if (result) URL.revokeObjectURL(result); }; }, [result]);
    
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setImage({ url: URL.createObjectURL(file), base64 });
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !title || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        setLoading(true); setResult(null); setLastCreationId(null);
        try {
            const res = await generateThumbnail({ 
                format, 
                category, 
                title, 
                subjectImage: image.base64
            }, auth.activeBrandKit);
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResult(blobUrl);
            
            const dataUri = `data:image/png;base64,${res}`; 
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Thumbnail Pro'); 
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail Pro');
            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { 
            console.error(e); 
            alert(`Generation failed: ${e.message}`); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { 
        if (!auth.user || !result) return; 
        setIsRefunding(true); 
        try { 
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Thumbnail", lastCreationId || undefined); 
            if (res.success) { 
                if (res.type === 'refund') { 
                    auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); 
                    setResult(null); 
                    setNotification({ msg: res.message, type: 'success' }); 
                } else { 
                    setNotification({ msg: res.message, type: 'info' }); 
                } 
            } 
            setShowRefundModal(false); 
        } catch (e: any) { alert(e.message); } finally { setIsRefunding(false); } 
    };

    const handleNewSession = () => { 
        setImage(null); 
        setResult(null); 
        setTitle(''); 
        setCategory(''); 
        setLastCreationId(null); 
    };

    const handleEditorSave = async (newUrl: string) => { 
        setResult(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Thumbnail Pro (Edited)');
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { 
        if(auth.user) { 
            const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); 
        } 
    };

    const canGenerate = !!image && !!title && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" 
                description="Create viral, scroll-stopping thumbnails engineered for high click-through rates." 
                icon={<ThumbnailIcon className="w-14 h-14"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={result} 
                creationId={lastCreationId}
                onResetResult={result ? undefined : handleGenerate} 
                onNewSession={result ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} 
                activeBrandKit={auth.activeBrandKit} 
                isBrandCritical={true}
                resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass={format === 'portrait' ? "h-[850px]" : "h-[650px]"} 
                hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] font-black uppercase tracking-wider", hideIcon: true, label: "Generate Thumbnail" }} 
                scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
                                    <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                                    <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                                </div>
                            )}
                            <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'blur-sm scale-105' : ''}`} alt="Source" />
                            {!loading && (
                                <button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40"><XIcon className="w-5 h-5"/></button>
                            )}
                        </div>
                    ) : (
                        <UploadPlaceholder label="Upload Subject Photo" onClick={() => fileInputRef.current?.click()} icon={<UserIcon className="w-12 h-12 text-indigo-300" />} />
                    )
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b]">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={`space-y-8 p-1 animate-fadeIn transition-all duration-300 ${loading ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            {/* 1. Format */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">1. Choose Format</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setFormat('landscape')}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${format === 'landscape' ? 'bg-indigo-50 border-indigo-600 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-200'}`}
                                    >
                                        <div className={`w-10 h-6 border-2 rounded-sm ${format === 'landscape' ? 'border-indigo-600 bg-indigo-200' : 'border-gray-300 bg-gray-50'}`}></div>
                                        <span className={`text-[10px] font-bold uppercase ${format === 'landscape' ? 'text-indigo-700' : 'text-gray-500'}`}>Landscape (16:9)</span>
                                    </button>
                                    <button 
                                        onClick={() => setFormat('portrait')}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${format === 'portrait' ? 'bg-indigo-50 border-indigo-600 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-200'}`}
                                    >
                                        <div className={`w-6 h-10 border-2 rounded-sm ${format === 'portrait' ? 'border-indigo-600 bg-indigo-200' : 'border-gray-300 bg-gray-50'}`}></div>
                                        <span className={`text-[10px] font-bold uppercase ${format === 'portrait' ? 'text-indigo-700' : 'text-gray-500'}`}>Portrait (9:16)</span>
                                    </button>
                                </div>
                            </div>

                            {/* 2. Category */}
                            <SelectionGrid label="2. Target Category" options={categories} value={category} onChange={setCategory} />

                            {/* 3. Title */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">3. Video Topic / Title</label>
                                <InputField placeholder="e.g. Secret underground bunker tour" value={title} onChange={(e: any) => setTitle(e.target.value)} />
                            </div>
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Thumbnail" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
        </>
    );
};
