import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, MilestoneSuccessModal, checkMilestone, InputField } from '../components/FeatureLayout';
import { RefinementPanel } from '../components/RefinementPanel';
import { 
    UploadIcon, 
    XIcon, 
    CreditCoinIcon, 
    CheckIcon, 
    UserIcon, 
    BuildingIcon, 
    SparklesIcon, 
    PaletteIcon, 
    ScaleIcon, 
    HomeIcon, 
    PlusIcon, 
    UsersIcon, 
    PencilIcon
} from '../components/icons';
import { 
    PixaHeadshotIcon,
    CorporateExecutiveIcon,
    TechFounderIcon,
    CreativeDirectorIcon,
    MedicalProIcon,
    LegalFinanceIcon,
    RealtorSalesIcon,
    LocationIcon
} from '../components/icons/headshotIcons';
import { fileToBase64, Base64File, base64ToBlobUrl, urlToBase64 } from '../utils/imageUtils';
import { generateProfessionalHeadshot } from '../services/headshotService';
import { refineStudioImage } from '../services/photoStudioService';
import { saveCreation, updateCreation, deductCredits, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { processRefundRequest } from '../services/refundService';
import { RefundModal } from '../components/RefundModal';
import ToastNotification from '../components/ToastNotification';
import { ResultToolbar } from '../components/ResultToolbar';
import { HeadshotStyles } from '../styles/features/PixaHeadshotPro.styles';
import { PixaTogetherStyles } from '../styles/features/PixaTogether.styles';

const ARCHETYPES = [
    { id: 'Executive', label: 'Corporate Executive', icon: <CorporateExecutiveIcon className="w-12 h-12"/>, desc: 'Suit & Tie / Formal' },
    { id: 'Tech', label: 'Tech Founder', icon: <TechFounderIcon className="w-12 h-12"/>, desc: 'Smart Casual / Blazer' },
    { id: 'Creative', label: 'Creative Director', icon: <CreativeDirectorIcon className="w-12 h-12"/>, desc: 'Stylish & Modern' },
    { id: 'Medical', label: 'Medical Pro', icon: <MedicalProIcon className="w-12 h-12"/>, desc: 'White Coat / Scrubs' },
    { id: 'Legal', label: 'Legal / Finance', icon: <LegalFinanceIcon className="w-12 h-12"/>, desc: 'Conservative Formal' },
    { id: 'Realtor', label: 'Realtor / Sales', icon: <RealtorSalesIcon className="w-12 h-12"/>, desc: 'Friendly Professional' }
];

const PERSONA_BACKGROUNDS: Record<string, string[]> = {
    'Executive': ['Studio Photoshoot', 'Modern Office', 'Meeting Room', 'Building Lobby', 'Personal Cabin'],
    'Tech': ['Studio Photoshoot', 'Startup Office', 'Server Room', 'Cool Lounge', 'City Street'],
    'Creative': ['Studio Photoshoot', 'Art Studio', 'Photo Gallery', 'Modern Loft', 'Green Garden'],
    'Medical': ['Studio Photoshoot', 'Clean Clinic', 'Doctor\'s Room', 'Bright Studio', 'Health Center'],
    'Legal': ['Studio Photoshoot', 'Book Library', 'Classic Boardroom', 'Formal Office', 'Courthouse'],
    'Realtor': ['Studio Photoshoot', 'Living Room', 'Modern Kitchen', 'Outside House', 'Nice Street']
};

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

export const PixaHeadshotPro: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    const [mode, setMode] = useState<'individual' | 'duo'>('individual');
    
    const [image, setImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [partnerImage, setPartnerImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    const [archetype, setArchetype] = useState(ARCHETYPES[0].id);
    const [background, setBackground] = useState('');
    const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState('');
    
    const [customDesc, setCustomDesc] = useState('');
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    // Refinement State
    const [isRefineActive, setIsRefineActive] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const refineCost = 2;

    const cost = appConfig?.featureCosts['Pixa Headshot Pro'] || 4;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);
    
    const isUploadsReady = mode === 'individual' ? !!image : (!!image && !!partnerImage);

    useEffect(() => {
        setBackground('');
        setCustomBackgroundPrompt('');
    }, [archetype]);

    useEffect(() => { let interval: any; if (loading || isRefining) { const steps = isRefining ? ["Analyzing facial structure...", "Modifying attire/lighting...", "Retouching micro-details...", "Finalizing refined portrait..."] : ["Scanning facial biometrics...", "Applying professional lighting...", "Styling attire...", "Retouching skin texture...", "Finalizing headshot..."]; let step = 0; setLoadingText(steps[0]); interval = setInterval(() => { step = (step + 1) % steps.length; setLoadingText(steps[step]); }, 2000); } return () => clearInterval(interval); }, [loading, isRefining]);
    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setter({ url: URL.createObjectURL(file), base64 });
            setResultImage(null);
        }
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!image || !auth.user) return;
        if (mode === 'duo' && !partnerImage) { alert("Please upload a partner photo for Duo mode."); return; }
        if (!background) { alert("Please select a location."); return; }
        if (isLowCredits) { alert("Insufficient credits."); return; }
        
        let finalBackground = background;
        if (background === 'Custom') {
            if (!customBackgroundPrompt.trim()) {
                alert("Please enter a description for your custom location.");
                return;
            }
            finalBackground = customBackgroundPrompt;
        }
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            const res = await generateProfessionalHeadshot(image.base64.base64, image.base64.mimeType, archetype, finalBackground, customDesc, mode === 'duo' ? partnerImage?.base64.base64 : undefined, mode === 'duo' ? partnerImage?.base64.mimeType : undefined);
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`; const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Headshot Pro'); setLastCreationId(creationId);
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Headshot Pro'); 
            if (updatedUser.lifetimeGenerations) { const bonus = checkMilestone(updatedUser.lifetimeGenerations); if (bonus !== false) setMilestoneBonus(bonus); } 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
        } catch (e: any) { console.error(e); alert(`Generation failed: ${e.message}`); } finally { setLoading(false); }
    };

    const handleRefine = async (refineText: string) => {
        if (!resultImage || !refineText.trim() || !auth.user) return;
        if (userCredits < refineCost) { alert("Insufficient credits for refinement."); return; }
        
        setIsRefining(true);
        setIsRefineActive(false); 
        try {
            const currentB64 = await urlToBase64(resultImage);
            const res = await refineStudioImage(currentB64.base64, currentB64.mimeType, refineText, "Professional Executive Headshot");
            
            const blobUrl = await base64ToBlobUrl(res, 'image/png'); 
            setResultImage(blobUrl);
            const dataUri = `data:image/png;base64,${res}`;
            
            if (lastCreationId) {
                await updateCreation(auth.user.uid, lastCreationId, dataUri);
            } else {
                const id = await saveCreation(auth.user.uid, dataUri, 'Pixa Headshot (Refined)');
                setLastCreationId(id);
            }
            
            const updatedUser = await deductCredits(auth.user.uid, refineCost, 'Pixa Refinement');
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            setNotification({ msg: "Headshot Retoucher: Features polished!", type: 'success' });
        } catch (e: any) {
            console.error(e);
            alert("Refinement failed.");
        } finally {
            setIsRefining(false);
        }
    };

    const handleClaimBonus = async () => {
        if (!auth.user || !milestoneBonus) return;
        const updatedUser = await claimMilestoneBonus(auth.user.uid, milestoneBonus);
        auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
    };

    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Headshot", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert("Refund processing failed: " + e.message); } finally { setIsRefunding(false); } };
    
    const handleNewSession = () => { setImage(null); setPartnerImage(null); setResultImage(null); setLastCreationId(null); setCustomDesc(''); setIsRefineActive(false); };
    
    const handleEditorSave = async (newUrl: string) => { 
        setResultImage(newUrl); 
        if (lastCreationId && auth.user) {
            await updateCreation(auth.user.uid, lastCreationId, newUrl);
        } else if (auth.user) {
            const id = await saveCreation(auth.user.uid, newUrl, 'Pixa Headshot Pro'); 
            setLastCreationId(id);
        }
    };
    
    const handleDeductEditCredit = async () => { if(auth.user) { const updatedUser = await deductCredits(auth.user.uid, 1, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null); } };
    
    const canGenerate = !!image && (mode === 'individual' || (mode === 'duo' && !!partnerImage)) && !!background && !isLowCredits;
    const currentAvailableBackgrounds = PERSONA_BACKGROUNDS[archetype] || PERSONA_BACKGROUNDS['Executive'];

    return (
        <>
            <FeatureLayout 
                title="Pixa Headshot Pro" description="Create studio-quality professional headshots instantly." icon={<PixaHeadshotIcon className="w-[clamp(32px,5vh,56px)] h-[clamp(32px,5vh,56px)]"/>} rawIcon={true} creditCost={cost} isGenerating={loading || isRefining} canGenerate={canGenerate} onGenerate={handleGenerate} resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} onNewSession={resultImage ? undefined : handleNewSession} resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                canvasOverlay={<RefinementPanel isActive={isRefineActive && !!resultImage} isRefining={isRefining} onClose={() => setIsRefineActive(false)} onRefine={handleRefine} refineCost={refineCost} />}
                customActionButtons={resultImage ? (
                    <button 
                        onClick={() => setIsRefineActive(!isRefineActive)}
                        className={`bg-white/10 backdrop-blur-md hover:bg-white/20 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all border border-white/10 shadow-lg text-xs sm:text-sm font-medium flex items-center gap-2 group whitespace-nowrap ${isRefineActive ? 'ring-2 ring-yellow-400' : ''}`}
                    >
                        <span>Make Changes</span>
                    </button>
                ) : null}
                resultHeightClass="h-[850px]" hideGenerateButton={isLowCredits} generateButtonStyle={{ hideIcon: true, label: "Generate Headshot" }} scrollRef={scrollRef}
                creationId={lastCreationId}
                leftContent={
                    <div className="relative h-full w-full flex flex-col items-center justify-center p-2 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {(loading || isRefining) && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-blue-400 to-purple-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse">{loadingText}</p>
                            </div>
                        )}
                        
                        {!image && !partnerImage ? (
                            <div className="text-center opacity-50 select-none"><div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4"><PixaHeadshotIcon className="w-10 h-10 text-indigo-500" /></div><h3 className="text-xl font-bold text-gray-300">Headshot Canvas</h3><p className="text-sm text-gray-300 mt-1">Upload photos to begin.</p></div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {mode === 'individual' && image ? (
                                    <img src={image.url} className={`max-w-full max-h-full rounded-xl shadow-md object-contain transition-all duration-700 ${loading ? 'blur-sm scale-105' : ''}`} />
                                ) : (
                                    <div className="relative w-72 h-80 mx-auto transform scale-125 origin-center">
                                        {image && (
                                            <div 
                                                className={PixaTogetherStyles.visualCardA} 
                                                style={(!partnerImage) ? { left: '50%', transform: 'translateX(-50%) rotate(0deg)', top: '2rem' } : {}}
                                            >
                                                <img src={image.url} className="w-full h-full object-cover" />
                                                <div className={PixaTogetherStyles.visualLabel}>Person A</div>
                                            </div>
                                        )}
                                        {partnerImage && mode === 'duo' && (
                                            <div className={PixaTogetherStyles.visualCardB}>
                                                <img src={partnerImage.url} className="w-full h-full object-cover" />
                                                <div className={PixaTogetherStyles.visualLabel}>Person B</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (<div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100"><CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3><p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p><button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button></div>) : (
                        <div className={`space-y-6 p-2 animate-fadeIn transition-all duration-300 ${loading || isRefining ? 'opacity-50 pointer-events-none select-none grayscale-[0.2]' : ''}`}>
                            
                            {/* 1. Subjects & Mode */}
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-visible">
                                <div className="flex justify-between items-center mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><UserIcon className="w-5 h-5"/></div>
                                        <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Subjects</h3>
                                    </div>
                                    <div className="flex bg-gray-100 p-1 rounded-lg">
                                        <button onClick={() => setMode('individual')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Single</button>
                                        <button onClick={() => setMode('duo')} className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'duo' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Duo</button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <PremiumUpload label={mode === 'individual' ? "Subject" : "Person A"} uploadText={mode === 'individual' ? "Add Subject" : "Add Person A"} image={image} onUpload={handleUpload(setImage)} onClear={() => setImage(null)} icon={<UserIcon className="w-6 h-6 text-indigo-300"/>} />
                                    
                                    {mode === 'duo' && (
                                        <PremiumUpload label="Person B" uploadText="Add Person B" image={partnerImage} onUpload={handleUpload(setPartnerImage)} onClear={() => setPartnerImage(null)} icon={<UserIcon className="w-6 h-6 text-pink-300"/>} />
                                    )}
                                </div>
                            </div>

                            <div className={`space-y-6 transition-all duration-300 ${!isUploadsReady ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                                {/* 2. Archetype Selector */}
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

                                {/* 3. Background Selector (DYNAMIC) */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3 px-1"><LocationIcon className="w-4 h-4 text-gray-400"/><label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Location</label></div>
                                    <div className="flex flex-wrap gap-2">
                                        {currentAvailableBackgrounds.map((bg) => (
                                            <button 
                                                key={bg}
                                                onClick={() => setBackground(bg)}
                                                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${background === bg ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-transparent shadow-lg transform -translate-y-0.5' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {bg}
                                            </button>
                                        ))}
                                        <button 
                                            onClick={() => setBackground('Custom')}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${background === 'Custom' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-lg transform -translate-y-0.5' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            <PencilIcon className="w-3 h-3" /> Custom
                                        </button>
                                    </div>
                                    
                                    {background === 'Custom' && (
                                        <div className="mt-4 animate-fadeIn">
                                            <InputField 
                                                label="Describe Your Perfect Backdrop" 
                                                placeholder="e.g. A luxury penthouse balcony at sunset, soft bokeh city lights, cinematic lighting" 
                                                value={customBackgroundPrompt} 
                                                onChange={(e: any) => setCustomBackgroundPrompt(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* 4. Custom Prompt */}
                                <div className="space-y-4">
                                    <div className="relative">
                                        <InputField 
                                            label="Additional Details (Optional)" 
                                            placeholder="e.g. wearing red tie, smiling broadly, add sunglasses" 
                                            value={customDesc} 
                                            onChange={(e: any) => setCustomDesc(e.target.value)} 
                                        />
                                        <div className="flex items-center gap-1.5 absolute top-0 right-1">
                                            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pixa Smart Analysis Active</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            />
            
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Headshot Pro" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};