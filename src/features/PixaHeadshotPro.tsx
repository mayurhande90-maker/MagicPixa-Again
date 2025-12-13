
import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { PixaHeadshotIcon, UserIcon, CheckIcon, BuildingIcon, SparklesIcon, PaletteIcon, PlusIcon, HomeIcon, ScaleIcon, XIcon, CreditCoinIcon } from '../components/icons';
import { fileToBase64, Base64File, base64ToBlobUrl } from '../utils/imageUtils';
import { generateProfessionalHeadshot } from '../services/headshotService';
import { saveCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { HeadshotStyles } from '../styles/features/PixaHeadshotPro.styles';

const PremiumCard: React.FC<{ children: React.ReactNode; title?: string; icon?: React.ReactNode; className?: string }> = ({ children, title, icon, className = "" }) => (
    <div className={`bg-white p-5 rounded-3xl border border-gray-100 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.05)] transition-all duration-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] ${className}`}>
        {title && (
            <div className="flex items-center gap-2 mb-5">
                {icon && <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">{icon}</div>}
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">{title}</h3>
            </div>
        )}
        {children}
    </div>
);

const PremiumUpload: React.FC<{ label: string; uploadText?: string; image: { url: string } | null; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void; icon: React.ReactNode; heightClass?: string; }> = ({ label, uploadText, image, onUpload, onClear, icon, heightClass = "h-40" }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative w-full group">
            <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {image && <span className="text-[10px] text-green-500 font-bold flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Ready</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-gray-50 rounded-2xl border border-indigo-100 flex items-center justify-center overflow-hidden group-hover:border-indigo-300 transition-all shadow-inner`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" alt={label} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-start justify-end p-2">
                        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="bg-white/90 p-2 rounded-xl shadow-lg text-gray-500 hover:text-red-500 hover:scale-110 transition-all backdrop-blur-sm"><XIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 bg-white hover:bg-indigo-50/30 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group`}>
                    <div className="p-3 bg-gray-50 group-hover:bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 group-hover:shadow-md transition-all text-gray-400 group-hover:text-indigo-500 border border-gray-100">{icon}</div>
                    <p className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 uppercase tracking-wide text-center px-4">{uploadText || "Add Photo"}</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const PRO_ARCHETYPES = [
    { id: 'executive', label: 'Corporate Executive', attire: 'Navy Power Suit, Crisp Shirt', vibe: 'Leadership', icon: <BuildingIcon className="w-4 h-4"/> },
    { id: 'tech', label: 'Tech Founder', attire: 'Premium T-Shirt & Blazer', vibe: 'Visionary', icon: <SparklesIcon className="w-4 h-4"/> },
    { id: 'creative', label: 'Creative Director', attire: 'Turtleneck & Designer Glasses', vibe: 'Sophisticated', icon: <PaletteIcon className="w-4 h-4"/> },
    { id: 'medical', label: 'Medical Pro', attire: 'White Coat / Premium Scrubs', vibe: 'Expert Care', icon: <PlusIcon className="w-4 h-4"/> },
    { id: 'realtor', label: 'Realtor / Sales', attire: 'Modern Business Formal', vibe: 'Friendly', icon: <HomeIcon className="w-4 h-4"/> },
    { id: 'legal', label: 'Legal / Finance', attire: 'Charcoal Suit, Conservative', vibe: 'Serious', icon: <ScaleIcon className="w-4 h-4"/> }
];

const PRO_BACKGROUNDS = [
    { id: 'studio', label: 'Studio Grey', desc: 'Neutral & Clean', prompt: 'Solid neutral grey studio backdrop with soft gradient' },
    { id: 'office', label: 'Modern Office', desc: 'Glass & Light', prompt: 'Blurred modern open-plan office background, bokeh lights, glass architecture' },
    { id: 'city', label: 'City Skyline', desc: 'High-Rise View', prompt: 'Blurred cityscape through a high-rise window, soft daylight' },
    { id: 'library', label: 'Library', desc: 'Warm Academic', prompt: 'Blurred academic library or mahogany bookshelf background' },
    { id: 'outdoor', label: 'Garden', desc: 'Natural Light', prompt: 'Soft focus manicured garden, natural sunlight' }
];

export const PixaHeadshotPro: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // State
    const [personA, setPersonA] = useState<{ url: string; base64: Base64File } | null>(null);
    const [personB, setPersonB] = useState<{ url: string; base64: Base64File } | null>(null);
    
    const [isSingleSubject, setIsSingleSubject] = useState(true);
    const [archetype, setArchetype] = useState(PRO_ARCHETYPES[0].label);
    const [background, setBackground] = useState(PRO_BACKGROUNDS[0].label);
    
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    
    // UI Modals
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Headshot Pro'] || appConfig?.featureCosts['Headshot'] || 3;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { let interval: any; if (loading) { const steps = ["Analyzing biometric structure...", "Optimizing lighting physics...", "Applying professional attire...", "Rendering high-res details...", "Finalizing headshot..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2000); } return () => clearInterval(interval); }, [loading]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) { const file = e.target.files[0]; const base64 = await fileToBase64(file); setter({ url: URL.createObjectURL(file), base64 }); } e.target.value = ''; };

    const handleGenerate = async () => {
        if (!personA || (!isSingleSubject && !personB) || !auth.user) return;
        if (isLowCredits) { alert("Insufficient credits."); return; }
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            // Find prompt data
            const archetypeData = PRO_ARCHETYPES.find(a => a.label === archetype) || PRO_ARCHETYPES[0];
            const backgroundData = PRO_BACKGROUNDS.find(b => b.label === background) || PRO_BACKGROUNDS[0];

            const res = await generateProfessionalHeadshot(
                personA.base64.base64,
                personA.base64.mimeType,
                archetypeData.label + ". Attire: " + archetypeData.attire,
                backgroundData.prompt,
                undefined, // Custom Description
                !isSingleSubject && personB ? personB.base64.base64 : undefined,
                !isSingleSubject && personB ? personB.base64.mimeType : undefined
            );

            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Headshot Pro'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Headshot Pro'); if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { 
        if (!auth.user || !resultImage) return; 
        setIsRefunding(true); 
        try { 
            const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Pixa Headshot Pro", lastCreationId || undefined); 
            if (res.success) { 
                if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } 
            } 
            setShowRefundModal(false); 
        } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } 
    };

    const handleNewSession = () => { setPersonA(null); setPersonB(null); setResultImage(null); setLastCreationId(null); };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Headshot Pro (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const deduct = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...deduct } : null); } };

    const canGenerate = (isSingleSubject ? !!personA : (!!personA && !!personB)) && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Headshot Pro" 
                description="Create studio-quality professional headshots instantly." 
                icon={<PixaHeadshotIcon className="w-14 h-14"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={resultImage}
                creationId={lastCreationId}
                onResetResult={resultImage ? undefined : handleGenerate} 
                onNewSession={resultImage ? undefined : handleNewSession} 
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[850px]" 
                hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: "Generate Headshot" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-2 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading && (<div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"><div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4"><div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div></div><p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p></div>)}
                        {!personA && !personB ? (
                            <div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><PixaHeadshotIcon className="w-10 h-10" /></div><h3 className="text-xl font-bold text-gray-300">Studio Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload photos to start.</p></div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <div className="relative w-64 h-80 mx-auto">
                                    {personA && (
                                        <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden shadow-xl border-4 border-white transition-all duration-500 z-10">
                                            <img src={personA.url} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Subject</div>
                                        </div>
                                    )}
                                    {personB && !isSingleSubject && (
                                        <div className="absolute top-4 -right-12 w-full h-full rounded-2xl overflow-hidden shadow-xl border-4 border-white transition-all duration-500 z-20">
                                            <img src={personB.url} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">Partner</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className="space-y-6 p-2 animate-fadeIn">
                            
                            {/* Subjects */}
                            <PremiumCard className="relative overflow-visible">
                                <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><UserIcon className="w-5 h-5"/></div>
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Subject</h3>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setIsSingleSubject(true)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Solo</button>
                                        <button onClick={() => setIsSingleSubject(false)} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!isSingleSubject ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Duo</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <PremiumUpload label={isSingleSubject ? "Your Photo" : "Person A"} uploadText={isSingleSubject ? "Add Photo" : "Add Person A"} image={personA} onUpload={handleUpload(setPersonA)} onClear={() => setPersonA(null)} icon={<UserIcon className="w-6 h-6 text-indigo-300"/>} />
                                    {!isSingleSubject && (
                                        <PremiumUpload label="Person B" uploadText="Add Person B" image={personB} onUpload={handleUpload(setPersonB)} onClear={() => setPersonB(null)} icon={<UserIcon className="w-6 h-6 text-pink-300"/>} />
                                    )}
                                </div>
                            </PremiumCard>

                            {/* Persona */}
                            <PremiumCard title="1. Professional Persona" icon={<UserIcon className="w-5 h-5"/>}>
                                <div className={HeadshotStyles.grid}>
                                    {PRO_ARCHETYPES.map(arch => {
                                        const isSelected = archetype === arch.label;
                                        return (
                                            <div
                                                key={arch.id}
                                                onClick={() => setArchetype(arch.label)}
                                                className={`${HeadshotStyles.modeCard} ${isSelected ? HeadshotStyles.modeCardSelected : HeadshotStyles.modeCardInactive}`}
                                            >
                                                <div className={`${HeadshotStyles.iconBox} ${isSelected ? HeadshotStyles.iconBoxSelected : HeadshotStyles.iconBoxInactive}`}>{arch.icon}</div>
                                                <div className={`${HeadshotStyles.title} ${isSelected ? HeadshotStyles.titleSelected : HeadshotStyles.titleInactive}`}>{arch.label}</div>
                                                <div className={`${HeadshotStyles.desc} ${isSelected ? HeadshotStyles.descSelected : HeadshotStyles.descInactive}`}>{arch.vibe}</div>
                                                {isSelected && <div className={HeadshotStyles.checkBadge}><CheckIcon className="w-3 h-3"/></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </PremiumCard>

                            {/* Background */}
                            <PremiumCard title="2. Studio Background" icon={<BuildingIcon className="w-5 h-5"/>}>
                                <div className={HeadshotStyles.grid}>
                                    {PRO_BACKGROUNDS.map(bg => {
                                        const isSelected = background === bg.label;
                                        return (
                                            <div
                                                key={bg.id}
                                                onClick={() => setBackground(bg.label)}
                                                className={`${HeadshotStyles.modeCard} ${isSelected ? HeadshotStyles.modeCardSelected : HeadshotStyles.modeCardInactive}`}
                                            >
                                                <div className={`${HeadshotStyles.title} ${isSelected ? HeadshotStyles.titleSelected : HeadshotStyles.titleInactive} mt-2`}>{bg.label}</div>
                                                <div className={`${HeadshotStyles.desc} ${isSelected ? HeadshotStyles.descSelected : HeadshotStyles.descInactive}`}>{bg.desc}</div>
                                                {isSelected && <div className={HeadshotStyles.checkBadge}><CheckIcon className="w-3 h-3"/></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </PremiumCard>
                        </div>
                    )
                }
            />
            
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleUpload(setPersonA)} />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Pixa Headshot Pro" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};
