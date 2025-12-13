
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { PixaHeadshotIcon, UploadIcon, XIcon, CreditCoinIcon, CheckIcon, UserIcon, BuildingIcon, SparklesIcon, PaletteIcon, ScaleIcon, HomeIcon, PlusIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateProfessionalHeadshot } from '../services/headshotService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import { RefundModal } from '../components/RefundModal';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { HeadshotStyles } from '../styles/features/PixaHeadshotPro.styles';

const ARCHETYPES = [
    { id: 'Executive', label: 'Corporate Executive', icon: <BuildingIcon className="w-5 h-5"/>, desc: 'Suit & Tie / Formal' },
    { id: 'Tech', label: 'Tech Founder', icon: <SparklesIcon className="w-5 h-5"/>, desc: 'Smart Casual / Blazer' },
    { id: 'Creative', label: 'Creative Director', icon: <PaletteIcon className="w-5 h-5"/>, desc: 'Stylish & Modern' },
    { id: 'Medical', label: 'Medical Pro', icon: <PlusIcon className="w-5 h-5"/>, desc: 'White Coat / Scrubs' },
    { id: 'Legal', label: 'Legal / Finance', icon: <ScaleIcon className="w-5 h-5"/>, desc: 'Conservative Formal' },
    { id: 'Realtor', label: 'Realtor / Sales', icon: <HomeIcon className="w-5 h-5"/>, desc: 'Friendly Professional' }
];

const BACKGROUNDS = [
    { id: 'Studio Grey', label: 'Studio Grey' },
    { id: 'Modern Office', label: 'Modern Office' },
    { id: 'City Skyline', label: 'City Skyline' },
    { id: 'Library', label: 'Library' },
    { id: 'Outdoor Garden', label: 'Outdoor Garden' }
];

export const PixaHeadshotPro: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [archetype, setArchetype] = useState(ARCHETYPES[0].id);
    const [background, setBackground] = useState(BACKGROUNDS[0].id);
    const [customDesc, setCustomDesc] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Headshot Pro'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { let interval: any; if (loading) { const steps = ["Scanning facial biometrics...", "Applying professional lighting...", "Styling attire...", "Retouching skin texture...", "Finalizing headshot..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2000); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } e.target.value = ''; };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDrop = async (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) { const file = e.dataTransfer.files[0]; if (file.type.startsWith('image/')) { const base64 = await fileToBase64(file); setImage({ url: URL.createObjectURL(file), base64 }); setResultImage(null); } else { alert("Please drop a valid image file."); } } };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            const res = await generateProfessionalHeadshot(image.base64.base64, image.base64.mimeType, archetype, background, customDesc);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Headshot Pro'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Headshot Pro'); 
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Headshot", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    const handleNewSession = () => { setImage(null); setResultImage(null); setLastCreationId(null); setCustomDesc(''); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Headshot Pro (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    const canGenerate = !!image && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Headshot Pro" description="Create studio-quality professional headshots instantly." icon={<PixaHeadshotIcon className="w-14 h-14"/>} rawIcon={true} creditCost={cost} isGenerating={loading} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[800px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Headshot" }} scrollRef={scrollRef}
                leftContent={
                    image ? (
                        <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                            {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                            <img src={image.url} className={`max-w-full max-h-full object-contain shadow-md transition-all duration-700 ${loading ? 'scale-95 opacity-50' : ''}`} alt="Original" />
                            {!loading && (<><button onClick={() => fileInputRef.current?.click()} className="absolute top-4 left-4 bg-white p-2.5 rounded-full shadow-md hover:bg-[#4D7CFF] hover:text-white text-gray-500 transition-all z-40" title="Change Photo"><UploadIcon className="w-5 h-5"/></button><button onClick={handleNewSession} className="absolute top-4 right-4 bg-white p-2.5 rounded-full shadow-md hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all z-40" title="Remove Photo"><XIcon className="w-5 h-5"/></button></>)}
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`h-full w-full border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden mx-auto ${isDragging ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-xl' : 'border-indigo-300 hover:border-indigo-500 bg-white hover:-translate-y-1 hover:shadow-xl'}`}>
                            <div className="relative z-10 p-6 bg-indigo-50 rounded-2xl shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all duration-300"><UserIcon className="w-12 h-12 text-indigo-300 group-hover:text-indigo-600 transition-colors duration-300" /></div><div className="relative z-10 mt-6 text-center space-y-2 px-6"><p className="text-xl font-bold text-gray-500 group-hover:text-[#1A1A1E] transition-colors duration-300 tracking-tight">Upload Selfie</p><div className="bg-gray-50 rounded-full px-3 py-1 inline-block"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Click to Browse</p></div><p className="text-[10px] text-gray-400 mt-3 font-medium">Recommended: Good lighting, face visible.</p></div>{isDragging && (<div className="absolute inset-0 flex items-center justify-center bg-indigo-500/10 backdrop-blur-[2px] z-50 rounded-3xl pointer-events-none"><div className="bg-white px-6 py-3 rounded-full shadow-2xl border border-indigo-100 animate-bounce"><p className="text-lg font-bold text-indigo-600 flex items-center gap-2"><UploadIcon className="w-5 h-5"/> Drop to Upload!</p></div></div>)}
                        </div>
                    )
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className={`space-y-8 p-1 animate-fadeIn transition-all duration-300 ${!image ? 'opacity-40 pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                            
                            {/* Archetype Selector */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 px-1"><UserIcon className="w-4 h-4 text-gray-400"/><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Persona</label></div>
                                <div className={HeadshotStyles.grid}>
                                    {ARCHETYPES.map((type) => (
                                        <button 
                                            key={type.id} 
                                            onClick={() => setArchetype(type.id)}
                                            className={`${HeadshotStyles.modeCard} ${archetype === type.id ? HeadshotStyles.modeCardSelected : HeadshotStyles.modeCardInactive}`}
                                        >
                                            <div className={`${HeadshotStyles.iconBox} ${archetype === type.id ? HeadshotStyles.iconBoxSelected : HeadshotStyles.iconBoxInactive}`}>{type.icon}</div>
                                            <h3 className={`${HeadshotStyles.title} ${archetype === type.id ? HeadshotStyles.titleSelected : HeadshotStyles.titleInactive}`}>{type.label}</h3>
                                            <p className={`${HeadshotStyles.desc} ${archetype === type.id ? HeadshotStyles.descSelected : HeadshotStyles.descInactive}`}>{type.desc}</p>
                                            {archetype === type.id && <div className={HeadshotStyles.checkBadge}><CheckIcon className="w-3 h-3 text-white"/></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Background Selector */}
                            <div>
                                <div className="flex items-center gap-2 mb-3 px-1"><BuildingIcon className="w-4 h-4 text-gray-400"/><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Location</label></div>
                                <div className="flex flex-wrap gap-2">
                                    {BACKGROUNDS.map((bg) => (
                                        <button 
                                            key={bg.id}
                                            onClick={() => setBackground(bg.id)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${background === bg.id ? 'bg-blue-600 text-white border-transparent shadow-md transform -translate-y-0.5' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {bg.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Prompt */}
                            <InputField label="Custom Details (Optional)" placeholder="e.g. wearing red tie, smiling broadly" value={customDesc} onChange={(e: any) => setCustomDesc(e.target.value)} />
                        </div>
                    )
                }
            />
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Headshot Pro" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
