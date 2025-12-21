import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
// Added CameraIcon, UserIcon, and CaptionIcon to imports from icons barrel file
import { ThumbnailIcon, XIcon, UploadTrayIcon, CreditCoinIcon, SparklesIcon, MagicWandIcon, CheckIcon, CubeIcon, DownloadIcon, ShieldCheckIcon, InformationCircleIcon, CameraIcon, UserIcon, CaptionIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { fileToBase64, Base64File, base64ToBlobUrl, downloadImage } from '../utils/imageUtils';
// Added updateCreation to imports from firebase
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { ThumbnailStyles } from '../styles/features/ThumbnailStudio.styles';

const CompactUpload: React.FC<{ label: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; optional?: boolean; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <div className="flex items-center justify-between mb-2 ml-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
                {optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:border-indigo-300`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2" alt={label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-2">
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white/90 p-1.5 rounded-lg shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10 border border-gray-100"><XIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-white rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group`}>
                    <div className="p-3 bg-white rounded-xl shadow-sm mb-3 group-hover:scale-110 group-hover:shadow-md transition-all text-gray-400 group-hover:text-indigo-500 border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wider text-center px-2">Add {label}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const FormatSelector: React.FC<{ selected: 'landscape' | 'portrait' | null; onSelect: (format: 'landscape' | 'portrait') => void; }> = ({ selected, onSelect }) => (
    <div className="mb-8">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block ml-1">1. Choose Format</label>
        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => onSelect('landscape')} className={`${ThumbnailStyles.formatBtn} ${selected === 'landscape' ? 'border-red-500 bg-red-50/30' : 'border-gray-100'}`}>
                <div className={`${ThumbnailStyles.visualRep} ${selected === 'landscape' ? 'border-red-600 bg-red-100' : 'border-gray-300'}`}>
                    <div className={`w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-b-[5px] border-b-transparent ml-1 ${selected === 'landscape' ? 'border-l-red-600' : 'border-l-gray-400'}`}></div>
                </div>
                <div><h3 className="font-bold text-xs">YouTube Video</h3><p className="text-[9px] text-gray-400 uppercase font-black">16:9 Landscape</p></div>
                {selected === 'landscape' && <div className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"><CheckIcon className="w-3 h-3" /></div>}
            </button>
            <button onClick={() => onSelect('portrait')} className={`${ThumbnailStyles.formatBtn} ${selected === 'portrait' ? 'border-pink-500 bg-pink-50/30' : 'border-gray-100'}`}>
                <div className={`${ThumbnailStyles.visualRep} ${selected === 'portrait' ? 'border-pink-600 bg-pink-100' : 'border-gray-300'} w-7 h-11 rounded-md`}>
                    <div className={`w-3 h-3 rounded-full border-2 ${selected === 'portrait' ? 'border-pink-600' : 'border-gray-400'}`}></div>
                </div>
                <div><h3 className="font-bold text-xs">Reels & TikTok</h3><p className="text-[9px] text-gray-400 uppercase font-black">9:16 Vertical</p></div>
                {selected === 'portrait' && <div className="absolute top-2 right-2 bg-pink-600 text-white p-1 rounded-full"><CheckIcon className="w-3 h-3" /></div>}
            </button>
        </div>
    </div>
);

export const ThumbnailStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void; }> = ({ auth, appConfig, navigateTo }) => {
    const [format, setFormat] = useState<'landscape' | 'portrait' | null>(null);
    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [customText, setCustomText] = useState('');
    const [referenceImage, setReferenceImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [subjectImage, setSubjectImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [hostImage, setHostImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [guestImage, setGuestImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [elementImage, setElementImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || 8;
    const userCredits = auth.user?.credits || 0;
    const isPodcast = category === 'Podcast';
    const hasRequirements = format && (isPodcast ? (!!hostImage && !!guestImage && !!title) : (!!title && !!subjectImage));
    const isLowCredits = userCredits < cost;
    const categories = ['Podcast', 'Entertainment', 'Gaming', 'Vlogs', 'Fashion & Beauty', 'Tech', 'Education', 'Food & Cooking'];

    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Performing Internet Trend Audit...", 
                "Identifying Viral Color Palettes...", 
                "Scanning Biometric Identity Lock...", 
                "Engineering Clickbait Visual Hook...", 
                "Synthesizing Seamless Studio Lighting...",
                "Applying Instagram Safe Zones..."
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
    const autoScroll = () => { if (scrollRef.current) setTimeout(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, 100); };
    const processFile = async (file: File) => { const base64 = await fileToBase64(file); return { url: URL.createObjectURL(file), base64 }; };
    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const data = await processFile(e.target.files[0]); setter(data); autoScroll(); e.target.value = ''; } };

    const handleGenerate = async () => {
        if (!hasRequirements || !auth.user || !format) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResult(null); setLastCreationId(null);
        try {
            const res = await generateThumbnail({ 
                format, category, title, 
                customText: customText || undefined, 
                referenceImage: referenceImage?.base64, 
                subjectImage: subjectImage?.base64, 
                hostImage: hostImage?.base64, 
                guestImage: guestImage?.base64,
                elementImage: elementImage?.base64 
            }, auth.activeBrandKit);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResult(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Thumbnail Pro'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Thumbnail Pro');
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); }
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { 
            console.error(e); 
            alert(`Generation failed: ${e.message || "Please check your internet and try again."}`); 
        } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !result) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Thumbnail Generation", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResult(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setFormat(null); setReferenceImage(null); setSubjectImage(null); setHostImage(null); setGuestImage(null); setElementImage(null); setResult(null); setTitle(''); setCustomText(''); setCategory(''); setLastCreationId(null); };
    const handleEditorSave = async (newUrl: string) => { 
        setResult(newUrl); 
        if (lastCreationId && auth.user) {
            // FIX: updateCreation is now imported from firebase
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Thumbnail Pro (Edited)');
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const handleFormatSelect = (val: 'landscape' | 'portrait') => { setFormat(val); if (val !== format) { setCategory(''); setTitle(''); setCustomText(''); setSubjectImage(null); setHostImage(null); setGuestImage(null); setElementImage(null); setReferenceImage(null); } autoScroll(); };

    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" description="Intelligent Viral Engine. Pixa performs real-time research to design thumbnails that stop the scroll." icon={<ThumbnailIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={!!hasRequirements && !isLowCredits} onGenerate={handleGenerate} resultImage={result} creationId={lastCreationId}
                onResetResult={result ? undefined : handleGenerate} onNewSession={result ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit} isBrandCritical={true}
                resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass={format === 'portrait' ? "h-[1000px]" : "h-[850px]"} hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02] font-black uppercase tracking-wider", hideIcon: true, label: "Render Masterpiece" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-4 bg-white rounded-[2.5rem] border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn p-10">
                                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-10"></div>
                                <div className="w-full max-w-sm h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-6">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-black text-white tracking-[0.2em] uppercase animate-pulse text-center leading-relaxed">{loadingText}</p>
                            </div>
                        )}
                        {!loading && !result && (
                            <div className="text-center opacity-40 select-none">
                                <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner transform rotate-3">
                                    <ThumbnailIcon className="w-12 h-12 text-red-500" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Strategy Canvas</h3>
                                <p className="text-sm text-gray-500 mt-2 font-medium">{format === 'portrait' ? '9:16 vertical cover optimized for safe zones' : (format === 'landscape' ? '16:9 high-CTR landscape optimized' : 'Select a format to begin production')}</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b]">Recharge Now</button></div>) : (
                        <div className={`space-y-10 p-1 animate-fadeIn transition-all duration-300 ${loading ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            <FormatSelector selected={format} onSelect={handleFormatSelect} />
                            
                            {format && (
                                <div className="animate-fadeIn space-y-10">
                                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4 px-1">
                                            <ShieldCheckIcon className="w-4 h-4 text-indigo-500"/>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">2. Niche Identity</label>
                                        </div>
                                        <SelectionGrid label="What is your category?" options={categories} value={category} onChange={(val) => { setCategory(val); autoScroll(); }} />
                                    </div>

                                    {category && (
                                        <div className="animate-fadeIn space-y-10">
                                            <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50">
                                                <div className="flex items-center gap-2 mb-6 px-1">
                                                    {/* FIX: CameraIcon is now imported from icons */}
                                                    <CameraIcon className="w-4 h-4 text-indigo-600"/>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">3. Source Assets (Biometric Lock)</label>
                                                </div>
                                                {isPodcast ? (
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {/* FIX: UserIcon is now imported from icons */}
                                                            <CompactUpload label="Host Photo" image={hostImage} onUpload={handleUpload(setHostImage)} onClear={() => setHostImage(null)} icon={<UserIcon className="w-6 h-6 text-purple-400"/>} />
                                                            <CompactUpload label="Guest Photo" image={guestImage} onUpload={handleUpload(setGuestImage)} onClear={() => setGuestImage(null)} icon={<UserIcon className="w-6 h-6 text-indigo-400"/>} />
                                                        </div>
                                                        <CompactUpload label="Style / Layout Reference" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<InformationCircleIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {/* FIX: UserIcon is now imported from icons */}
                                                            <CompactUpload label="Your Photo" image={subjectImage} onUpload={handleUpload(setSubjectImage)} onClear={() => setSubjectImage(null)} icon={<UserIcon className="w-6 h-6 text-blue-400"/>} />
                                                            <CompactUpload label="Key Prop / Item" image={elementImage} onUpload={handleUpload(setElementImage)} onClear={() => setElementImage(null)} icon={<CubeIcon className="w-6 h-6 text-green-400"/>} optional={true} />
                                                        </div>
                                                        <CompactUpload label="Style / Layout Reference" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<InformationCircleIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                )}
                                                <div className="mt-6 flex items-start gap-2 bg-white/60 p-3 rounded-xl border border-indigo-50">
                                                    <ShieldCheckIcon className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0"/>
                                                    <p className="text-[9px] text-indigo-900 font-bold leading-relaxed">IDENTITY LOCK ACTIVE: Facial geometry and hair texture will be preserved 1:1.</p>
                                                </div>
                                            </div>

                                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                                                <div className="flex items-center gap-2 mb-2 px-1">
                                                    {/* FIX: CaptionIcon is now imported from icons */}
                                                    <CaptionIcon className="w-4 h-4 text-indigo-500"/>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">4. Strategy Inputs</label>
                                                </div>
                                                <InputField label="What is the video topic? (Context)" placeholder={isPodcast ? "e.g. Interview with AI Researcher on Sora" : "e.g. Secret underground bunker tour"} value={title} onChange={(e: any) => setTitle(e.target.value)} />
                                                <div className="pt-2 border-t border-gray-50">
                                                    <InputField label="Exact Hook Text (Optional)" placeholder="e.g. IT'S FINALLY HERE!" value={customText} onChange={(e: any) => setCustomText(e.target.value)} />
                                                    <p className="text-[9px] text-gray-400 font-bold italic px-1 mt-1">If empty, Pixa will engineer a viral headline based on research.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && result && <MagicEditorModal imageUrl={result} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Thumbnail" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
