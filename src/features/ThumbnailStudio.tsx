import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { ThumbnailIcon, XIcon, UploadTrayIcon, CreditCoinIcon, SparklesIcon, MagicWandIcon, CheckIcon, CubeIcon, DownloadIcon } from '../components/icons';
import { FeatureLayout, SelectionGrid, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { fileToBase64, Base64File, base64ToBlobUrl, downloadImage } from '../utils/imageUtils';
import { generateThumbnail } from '../services/thumbnailService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { ThumbnailStyles } from '../styles/features/ThumbnailStudio.styles';

const CompactUpload: React.FC<{ label: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; optional?: boolean; }> = ({ label, image, onUpload, onClear, icon, heightClass = "h-40", optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group"><div className="flex items-center justify-between mb-2 ml-1"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label} {optional && <span className="text-gray-300 font-normal">(Optional)</span>}</label></div>{image ? (<div className={`relative w-full ${heightClass} bg-white rounded-xl border-2 border-blue-100 flex items-center justify-center overflow-hidden shadow-sm`}><img src={image.url} className="max-w-full max-h-full object-contain" alt={label} /><button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors z-10"><XIcon className="w-4 h-4"/></button></div>) : (<div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border-2 border-dashed border-gray-300 hover:border-blue-400 bg-gray-50 hover:bg-blue-50/10 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}><div className="p-2 bg-white rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">{icon}</div><p className="text-xs font-bold text-gray-400 group-hover:text-blue-500 uppercase tracking-wide text-center px-2">Upload {label}</p><p className="text-[9px] text-gray-300 mt-1">Best: Expressive / High Res</p></div>)}<input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} /></div>
    );
};

const FormatSelector: React.FC<{ selected: 'landscape' | 'portrait' | null; onSelect: (format: 'landscape' | 'portrait') => void; }> = ({ selected, onSelect }) => (
    <div className="mb-8"><label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 block ml-1">1. Choose Format</label><div className="grid grid-cols-2 gap-4">
            <button onClick={() => onSelect('landscape')} className={`${ThumbnailStyles.formatBtn} ${selected === 'landscape' ? ThumbnailStyles.formatBtnSelectedYoutube : ThumbnailStyles.formatBtnInactive}`}>
                <div className={`${ThumbnailStyles.visualRep} ${selected === 'landscape' ? ThumbnailStyles.visualRepYoutube : 'border-gray-300 bg-gray-50 group-hover:border-[#FF0000]/50'}`}><div className={`w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-b-[5px] border-b-transparent ml-1 ${selected === 'landscape' ? 'border-l-[#FF0000]' : 'border-l-gray-400 group-hover:border-l-[#FF0000]'}`}></div></div>
                <div><h3 className={`font-bold text-sm ${selected === 'landscape' ? 'text-[#FF0000]' : 'text-gray-700'}`}>YouTube Video</h3><p className="text-[10px] text-gray-400 font-medium mt-1 tracking-wide">16:9 Landscape</p></div>
                {selected === 'landscape' && <div className={`${ThumbnailStyles.checkBadge} ${ThumbnailStyles.youtubeBadge}`}><CheckIcon className="w-3 h-3" /></div>}
            </button>
            <button onClick={() => onSelect('portrait')} className={`${ThumbnailStyles.formatBtn} ${selected === 'portrait' ? ThumbnailStyles.formatBtnSelectedInsta : ThumbnailStyles.formatBtnInactive}`} style={selected === 'portrait' ? { background: 'linear-gradient(135deg, rgba(249, 206, 52, 0.05), rgba(238, 42, 123, 0.05), rgba(98, 40, 215, 0.05))' } : {}}>
                <div className={`${ThumbnailStyles.visualRep} ${ThumbnailStyles.visualRepInsta} ${selected === 'portrait' ? 'border-transparent' : 'border-gray-300 bg-gray-50 group-hover:border-pink-300'}`} style={selected === 'portrait' ? { background: 'linear-gradient(135deg, #f9ce34 0%, #ee2a7b 50%, #6228d7 100%)' } : {}}><div className={`w-3 h-3 rounded-full border-2 ${selected === 'portrait' ? 'border-white bg-transparent' : 'border-gray-400 group-hover:border-pink-400'}`}></div></div>
                <div><h3 className={`font-bold text-sm ${selected === 'portrait' ? 'text-transparent bg-clip-text' : 'text-gray-700'}`} style={selected === 'portrait' ? { backgroundImage: 'linear-gradient(90deg, #f9ce34, #ee2a7b, #6228d7)' } : {}}>Reels & Stories</h3><p className="text-[10px] text-gray-400 font-medium mt-1 tracking-wide">9:16 Vertical</p></div>
                {selected === 'portrait' && <div className={ThumbnailStyles.checkBadge} style={{ background: 'linear-gradient(135deg, #f9ce34, #ee2a7b, #6228d7)' }}><CheckIcon className="w-3 h-3" /></div>}
            </button>
        </div></div>
);

export const ThumbnailStudio: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void; }> = ({ auth, appConfig, navigateTo }) => {
    const [format, setFormat] = useState<'landscape' | 'portrait' | null>(null);
    const [category, setCategory] = useState('');
    const [mood, setMood] = useState('');
    const [podcastGear, setPodcastGear] = useState('');
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
    const cost = appConfig?.featureCosts['Pixa Thumbnail Pro'] || appConfig?.featureCosts['Thumbnail Studio'] || 8;
    const regenCost = 3;
    const userCredits = auth.user?.credits || 0;
    const isPodcast = category === 'Podcast';
    const hasRequirements = format && (isPodcast ? (!!hostImage && !!guestImage && !!title) : (!!title));
    const isLowCredits = userCredits < cost;
    
    const categories = ['Podcast', 'Entertainment', 'Gaming', 'Vlogs', 'How-to & Style', 'Education', 'Comedy', 'Music', 'Technology', 'Sports', 'Travel & Events'];
    const moods = ['Viral Extreme', 'Cinematic Noir', 'Luxury Gold', 'Minimalist', 'Neon Gamer', 'Dark Mystery', 'Retro Film', 'Bright & Airy'];
    const podcastGears = ['Professional Mics', 'No Mic'];

    useEffect(() => { let interval: any; if (loading) { const steps = ["Pixa is analyzing trend data...", "Pixa is enhancing photos...", "Pixa is blending elements...", "Pixa is designing layout...", "Pixa is polishing..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 1500); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (result) URL.revokeObjectURL(result); }; }, [result]);
    
    /**
     * Professional Auto-Scroll:
     * Focuses on the next interaction block to keep the flow intuitive.
     */
    const autoScroll = () => { 
        if (scrollRef.current) {
            setTimeout(() => {
                const container = scrollRef.current;
                if (container) {
                    // Smoothly scroll down by 150px to reveal the next block, or to bottom if at end
                    const targetScroll = container.scrollTop + 150;
                    const maxScroll = container.scrollHeight - container.clientHeight;
                    container.scrollTo({ 
                        top: Math.min(targetScroll, maxScroll), 
                        behavior: 'smooth' 
                    });
                }
            }, 150); 
        } 
    };

    const processFile = async (file: File) => { const base64 = await fileToBase64(file); return { url: URL.createObjectURL(file), base64 }; };
    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const data = await processFile(e.target.files[0]); setter(data); autoScroll(); e.target.value = ''; } };

    const handleGenerate = async () => {
        if (!hasRequirements || !auth.user || !format) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResult(null); setLastCreationId(null);
        try {
            const res = await generateThumbnail({ 
                format, 
                category, 
                mood,
                micMode: isPodcast ? podcastGear : undefined,
                title, 
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
        } catch (e) { console.error(e); alert("Generation failed. Please try again."); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRegenerate = async () => { if (!hasRequirements || !auth.user || !format) return; if (userCredits < regenCost) { alert("Insufficient credits."); return; } setLoading(true); setResult(null); setLastCreationId(null); try { const res = await generateThumbnail({ format, category, mood, micMode: isPodcast ? podcastGear : undefined, title, customText: customText || undefined, referenceImage: referenceImage?.base64, subjectImage: subjectImage?.base64, hostImage: hostImage?.base64, guestImage: guestImage?.base64, elementImage: elementImage?.base64 }, auth.activeBrandKit); const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResult(blobUrl); const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Thumbnail Pro (Regen)'); setLastCreationId(creationId); const updatedUser = await deductCredits(auth.user.uid, regenCost, 'Pixa Thumbnail Pro (Regen)'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } catch (e) { console.error(e); alert("Regeneration failed. Please try again."); } finally { setLoading(false); } };
    const handleRefundRequest = async (reason: string) => { if (!auth.user || !result) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Thumbnail Generation", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResult(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setFormat(null); setReferenceImage(null); setSubjectImage(null); setHostImage(null); setGuestImage(null); setElementImage(null); setResult(null); setTitle(''); setCustomText(''); setCategory(''); setMood(''); setPodcastGear(''); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResult(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Thumbnail Pro (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const handleFormatSelect = (val: 'landscape' | 'portrait') => { setFormat(val); if (val !== format) { setCategory(''); setMood(''); setPodcastGear(''); setTitle(''); setCustomText(''); setSubjectImage(null); setHostImage(null); setGuestImage(null); setElementImage(null); setReferenceImage(null); } autoScroll(); };

    return (
        <>
            <FeatureLayout 
                title="Pixa Thumbnail Pro" description="Create viral, high-CTR thumbnails. Analyze trends and generate hyper-realistic results." icon={<ThumbnailIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={!!hasRequirements && !isLowCredits} onGenerate={handleGenerate} resultImage={result} creationId={lastCreationId}
                onResetResult={result ? undefined : handleRegenerate} onNewSession={result ? undefined : handleNewSession}
                onEdit={() => setShowMagicEditor(true)} activeBrandKit={auth.activeBrandKit}
                isBrandCritical={true}
                resultOverlay={result ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass={format === 'portrait' ? "h-[1000px]" : "h-[850px]"} hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Thumbnail" }} scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>) : (<div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><ThumbnailIcon className="w-10 h-10 text-red-500" /></div><h3 className="text-xl font-bold text-gray-300">Thumbnail Canvas</h3><p className="text-sm text-gray-300 mt-1">{format === 'portrait' ? '9:16 Vertical Preview' : (format === 'landscape' ? '16:9 Landscape Preview' : 'Select a format to begin')}</p></div>)}<style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style></div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className={`space-y-8 p-1 animate-fadeIn transition-all duration-300 ${loading ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            <FormatSelector selected={format} onSelect={handleFormatSelect} />
                            {format && (
                                <div className="animate-fadeIn space-y-8">
                                    <SelectionGrid label="2. Select Category" options={categories} value={category} onChange={(val) => { setCategory(val); autoScroll(); }} />
                                    
                                    {category && (
                                        <div className="animate-fadeIn space-y-8">
                                            {/* MOVED: Upload Assets is now Step 3 */}
                                            <div>
                                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">3. Upload Assets</label>
                                                {isPodcast ? (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <CompactUpload label="Host Photo" image={hostImage} onUpload={handleUpload(setHostImage)} onClear={() => setHostImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-purple-400"/>} />
                                                            <CompactUpload label="Guest Photo" image={guestImage} onUpload={handleUpload(setGuestImage)} onClear={() => setGuestImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-indigo-400"/>} />
                                                        </div>
                                                        <CompactUpload label="Reference Thumbnail" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <CompactUpload label="Your Photo" image={subjectImage} onUpload={handleUpload(setSubjectImage)} onClear={() => setSubjectImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-blue-400"/>} optional={true} />
                                                            <CompactUpload label="Element / Prop" image={elementImage} onUpload={handleUpload(setElementImage)} onClear={() => setElementImage(null)} icon={<CubeIcon className="w-6 h-6 text-green-400"/>} optional={true} />
                                                        </div>
                                                        <CompactUpload label="Reference Thumbnail" image={referenceImage} onUpload={handleUpload(setReferenceImage)} onClear={() => setReferenceImage(null)} icon={<UploadTrayIcon className="w-6 h-6 text-yellow-400"/>} heightClass="h-40" optional={true} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="h-px w-full bg-gray-200"></div>

                                            {/* MOVED: Visual Mood is now Step 4 */}
                                            <SelectionGrid label="4. Visual Mood" options={moods} value={mood} onChange={(val) => { setMood(val); autoScroll(); }} />

                                            {isPodcast && (
                                                <div className="animate-fadeIn">
                                                    <SelectionGrid label="5. Podcast Studio Gear" options={podcastGears} value={podcastGear} onChange={(val) => { setPodcastGear(val); autoScroll(); }} />
                                                </div>
                                            )}

                                            <div className="animate-fadeIn"><InputField label={(isPodcast ? '6.' : '5.') + " What is the video about? (Context)"} placeholder={isPodcast ? "e.g. Interview with Sam Altman" : "e.g. Haunted House Vlog"} value={title} onChange={(e: any) => setTitle(e.target.value)} /></div>
                                            <div className="animate-fadeIn"><InputField label={(isPodcast ? '7.' : '6.') + " Exact Title Text (Optional)"} placeholder="e.g. DONT WATCH THIS" value={customText} onChange={(e: any) => setCustomText(e.target.value)} /><p className="text-[10px] text-gray-400 px-1 -mt-4 italic">If empty, Pixa will generate a viral title.</p></div>
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
