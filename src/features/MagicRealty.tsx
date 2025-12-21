import React, { useState, useRef, useEffect } from 'react';
import { AuthProps, AppConfig, Page, View } from '../types';
import { FeatureLayout, InputField, MilestoneSuccessModal, checkMilestone } from '../components/FeatureLayout';
import { BuildingIcon, UploadTrayIcon, XIcon, SparklesIcon, CreditCoinIcon, CheckIcon, PlusCircleIcon, BrandKitIcon, HomeIcon, PhoneIcon, LightbulbIcon, MagicWandIcon, TrashIcon, UserIcon, MapPinIcon } from '../components/icons';
import { fileToBase64, Base64File, urlToBase64, base64ToBlobUrl } from '../utils/imageUtils';
import { generateRealtyAd } from '../services/realtyService';
import { deductCredits, saveCreation, claimMilestoneBonus } from '../firebase';
import { MagicEditorModal } from '../components/MagicEditorModal';
import { ResultToolbar } from '../components/ResultToolbar';
import { RefundModal } from '../components/RefundModal';
import { processRefundRequest } from '../services/refundService';
import ToastNotification from '../components/ToastNotification';
import { RealtyStyles } from '../styles/features/MagicRealty.styles';

// --- SUB-COMPONENTS ---

const CompactUpload: React.FC<{ 
    label: string; 
    image: { url: string } | null; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
    onClear: () => void; 
    icon: React.ReactNode; 
    heightClass?: string; 
    optional?: boolean; 
    fullWidth?: boolean;
}> = ({ label, image, onUpload, onClear, icon, heightClass = "h-28", optional, fullWidth }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className={`relative group ${fullWidth ? 'col-span-2' : ''}`}>
            <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                {optional && !image && <span className="text-[9px] text-gray-300 font-medium">Optional</span>}
                {image && <span className="text-[9px] text-green-500 font-bold flex items-center gap-1"><CheckIcon className="w-2.5 h-2.5"/> Loaded</span>}
            </div>
            {image ? (
                <div className={`relative w-full ${heightClass} bg-white rounded-xl border border-indigo-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:border-indigo-300 transition-all`}>
                    <img src={image.url} className="max-w-full max-h-full object-contain p-1" alt={label} />
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-lg shadow-sm hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors z-10 border border-gray-100"><XIcon className="w-3 h-3"/></button>
                </div>
            ) : (
                <div onClick={() => inputRef.current?.click()} className={`w-full ${heightClass} border border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group-hover:shadow-sm`}>
                    <div className="p-2 bg-white rounded-lg shadow-sm mb-2 group-hover:scale-110 transition-transform border border-gray-100">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-wide text-center px-2">Upload</p>
                </div>
            )}
            <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={onUpload} />
        </div>
    );
};

const TargetCard: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    selected: boolean; 
    onClick: () => void; 
    color: string;
}> = ({ title, icon, selected, onClick, color }) => (
    <button 
        onClick={onClick} 
        className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all duration-300 h-24 ${
            selected 
            ? `bg-white border-${color}-500 shadow-md ring-2 ring-${color}-500/20` 
            : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200'
        }`}
    >
        <div className={`mb-2 p-2 rounded-full ${selected ? `bg-${color}-100 text-${color}-600` : 'bg-white text-gray-400'}`}>
            {icon}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${selected ? 'text-gray-900' : 'text-gray-500'}`}>
            {title}
        </span>
        {selected && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${color}-500 animate-pulse`}></div>}
    </button>
);

export const MagicRealty: React.FC<{ auth: AuthProps; appConfig: AppConfig | null; navigateTo: (page: Page, view?: View) => void }> = ({ auth, appConfig, navigateTo }) => {
    // Strategies
    const [targetAudience, setTargetAudience] = useState<'luxury' | 'investor' | 'family'>('luxury');
    
    // Assets
    const [propertyImage, setPropertyImage] = useState<{ url: string; base64: Base64File } | null>(null);
    const [logoImage, setLogoImage] = useState<{ url: string; base64: Base64File } | null>(null);
    
    // Text Data
    const [texts, setTexts] = useState({ projectName: '', configuration: '', contact: '', location: '' });
    const [sellingPoints, setSellingPoints] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState('');
    
    // UI State
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Initializing...");
    const [milestoneBonus, setMilestoneBonus] = useState<number | undefined>(undefined);
    const [showMagicEditor, setShowMagicEditor] = useState(false);
    const [lastCreationId, setLastCreationId] = useState<string | null>(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [isRefunding, setIsRefunding] = useState(false);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);

    const cost = appConfig?.featureCosts['Pixa Realty Ads'] || appConfig?.featureCosts['Magic Realty'] || 10;
    const userCredits = auth.user?.credits || 0;
    const isLowCredits = userCredits < cost;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initial Session Brand Kit Load & Sync
    useEffect(() => { 
        if (auth.activeBrandKit) { 
            const kit = auth.activeBrandKit;
            
            // Auto-fill contact info
            setTexts(prev => ({ ...prev, contact: kit.website || kit.companyName || prev.contact }));
            
            // Auto-load logo
            if (kit.logos.primary) { 
                urlToBase64(kit.logos.primary).then(base64 => {
                    setLogoImage({ url: kit.logos.primary!, base64 });
                }).catch(e => console.warn("Logo load error", e));
            } else {
                setLogoImage(null);
            }
        } else {
            // BRAND INTEGRATION OFF: Clear the fetched assets
            setLogoImage(null);
            setTexts(prev => ({ ...prev, contact: '' }));
        }
    }, [auth.activeBrandKit]); // Dependent on the whole object to catch the null switch

    // Loading Animation Loop
    useEffect(() => { 
        let interval: any; 
        if (loading) { 
            const steps = [
                "Analyzing Property Features...", 
                "Researching Market Trends...", 
                "Rewriting Copy for Impact...", 
                "Designing Layout & Composition...", 
                "Polishing Final Ad..."
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

    useEffect(() => { return () => { if (resultImage) URL.revokeObjectURL(resultImage); }; }, [resultImage]);

    const handleUpload = (setter: any) => async (e: React.ChangeEvent<HTMLInputElement>) => { 
        if (e.target.files?.[0]) { 
            const file = e.target.files[0]; 
            const base64 = await fileToBase64(file); 
            setter({ url: URL.createObjectURL(file), base64 }); 
        } 
        e.target.value = ''; 
    };

    const addTag = () => {
        if (currentTag.trim() && sellingPoints.length < 5) {
            setSellingPoints([...sellingPoints, currentTag.trim()]);
            setCurrentTag('');
        }
    };

    const removeTag = (index: number) => {
        setSellingPoints(sellingPoints.filter((_, i) => i !== index));
    };

    const handleGenerate = async () => {
        if (!auth.user || !texts.projectName || !propertyImage) return; 
        if (isLowCredits) { alert("Insufficient credits."); return; } 
        
        setLoading(true); setResultImage(null); setLastCreationId(null);
        
        try {
            const assetUrl = await generateRealtyAd({ 
                propertyImage: propertyImage.base64, 
                logoImage: logoImage?.base64, 
                targetAudience,
                sellingPoints, 
                texts: texts
            });
            
            const blobUrl = await base64ToBlobUrl(assetUrl, 'image/png'); 
            setResultImage(blobUrl);
            
            const dataUri = `data:image/png;base64,${assetUrl}`; 
            const creationId = await saveCreation(auth.user.uid, dataUri, 'Pixa Realty Ads'); 
            setLastCreationId(creationId);
            
            const updatedUser = await deductCredits(auth.user.uid, cost, 'Pixa Realty Ads'); 
            auth.setUser(prev => prev ? { ...prev, ...updatedUser } : null);
            
            if (updatedUser.lifetimeGenerations) { 
                const bonus = checkMilestone(updatedUser.lifetimeGenerations); 
                if (bonus !== false) setMilestoneBonus(bonus); 
            }
        } catch (e: any) { 
            console.error(e); 
            alert(`Generation failed: ${e.message}`); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleNewSession = () => { 
        setPropertyImage(null); 
        setResultImage(null); 
        setTexts({ projectName: '', configuration: '', contact: '', location: '' }); 
        setSellingPoints([]);
    };

    const handleClaimBonus = async () => { if (auth.user && milestoneBonus) { const u = await claimMilestoneBonus(auth.user.uid, milestoneBonus); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };
    const handleRefundRequest = async (reason: string) => { if (!auth.user || !resultImage) return; setIsRefunding(true); try { const res = await processRefundRequest(auth.user.uid, auth.user.email, cost, reason, "Realty Ad", lastCreationId || undefined); if (res.success) { if (res.type === 'refund') { auth.setUser(prev => prev ? { ...prev, credits: prev.credits + cost } : null); setResultImage(null); setNotification({ msg: res.message, type: 'success' }); } else { setNotification({ msg: res.message, type: 'info' }); } } setShowRefundModal(false); } catch (e: any) { alert(e.message); } finally { setIsRefunding(false); } };
    const handleEditorSave = (newUrl: string) => { setResultImage(newUrl); saveCreation(auth.user!.uid, newUrl, 'Pixa Realty Ads (Edited)'); };
    const handleDeductEditCredit = async () => { if(auth.user) { const u = await deductCredits(auth.user.uid, 2, 'Magic Eraser'); auth.setUser(prev => prev ? { ...prev, ...u } : null); } };

    const canGenerate = !!texts.projectName && !!propertyImage && !isLowCredits;

    return (
        <>
            <FeatureLayout 
                title="Pixa Realty Ads" 
                description="Turn property photos into high-converting ads. The AI analyzes your image, rewrites your copy, and designs a professional flyer." 
                icon={<BuildingIcon className="w-14 h-14"/>} 
                rawIcon={true} 
                creditCost={cost} 
                isGenerating={loading} 
                canGenerate={canGenerate} 
                onGenerate={handleGenerate} 
                resultImage={resultImage}
                onResetResult={resultImage ? undefined : handleGenerate} 
                onNewSession={resultImage ? undefined : handleNewSession} 
                resultOverlay={resultImage ? <ResultToolbar onNew={handleNewSession} onRegen={handleGenerate} onEdit={() => setShowMagicEditor(true)} onReport={() => setShowRefundModal(true)} /> : null}
                resultHeightClass="h-[950px]" 
                hideGenerateButton={isLowCredits} 
                generateButtonStyle={{ className: "bg-[#F9D230] text-[#1A1A1E] shadow-lg shadow-yellow-500/30 border-none hover:scale-[1.02]", hideIcon: true, label: loading ? loadingText : "Generate Smart Ad" }} 
                scrollRef={scrollRef}
                leftContent={
                    <div className="relative h-full w-full flex items-center justify-center p-4 bg-white rounded-3xl border border-dashed border-gray-200 overflow-hidden group mx-auto shadow-sm">
                        {loading ? (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                                <div className="w-64 h-1.5 bg-gray-700 rounded-full overflow-hidden shadow-inner mb-4">
                                    <div className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 animate-[progress_2s_ease-in-out_infinite] rounded-full"></div>
                                </div>
                                <p className="text-sm font-bold text-white tracking-widest uppercase animate-pulse bg-black/40 px-4 py-2 rounded-full">{loadingText}</p>
                            </div>
                        ) : (
                            <div className="text-center opacity-50 select-none">
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <BuildingIcon className="w-12 h-12 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-300">Realty Canvas</h3>
                                <p className="text-sm text-gray-300 mt-2">Upload property photo to start.</p>
                            </div>
                        )}
                        <style>{`@keyframes progress { 0% { width: 0%; margin-left: 0; } 50% { width: 100%; margin-left: 0; } 100% { width: 0%; margin-left: 100%; } }`}</style>
                    </div>
                }
                rightContent={
                    isLowCredits ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 animate-fadeIn bg-red-50/50 rounded-2xl border border-red-100">
                            <CreditCoinIcon className="w-16 h-16 text-red-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Insufficient Credits</h3>
                            <p className="text-gray-500 mb-6 max-w-xs text-sm">Requires {cost} credits.</p>
                            <button onClick={() => navigateTo('dashboard', 'billing')} className="bg-[#F9D230] text-[#1A1A1E] px-8 py-3 rounded-xl font-bold hover:bg-[#dfbc2b] transition-all shadow-lg">Recharge Now</button>
                        </div>
                    ) : (
                        <div className={RealtyStyles.container}>
                            
                            {/* SESSION BRAND KIT ACTIVE PILL */}
                            {auth.activeBrandKit && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3 animate-fadeIn">
                                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-indigo-100 overflow-hidden">
                                        {auth.activeBrandKit.logos.primary ? <img src={auth.activeBrandKit.logos.primary} className="w-full h-full object-cover" /> : <BrandKitIcon className="w-4 h-4 text-indigo-500" />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Active Brand</p>
                                        <p className="text-xs font-bold text-indigo-900">{auth.activeBrandKit.name || auth.activeBrandKit.companyName}</p>
                                    </div>
                                </div>
                            )}

                            {/* STEP 1: ASSETS */}
                            <div>
                                <div className={RealtyStyles.sectionHeader}>
                                    <span className={RealtyStyles.stepBadge}>1</span>
                                    <label className={RealtyStyles.sectionTitle}>The Facts (Assets)</label>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <CompactUpload 
                                        label="Property Photo (Hero)" 
                                        image={propertyImage} 
                                        onUpload={handleUpload(setPropertyImage)} 
                                        onClear={() => setPropertyImage(null)} 
                                        icon={<HomeIcon className="w-8 h-8 text-indigo-400"/>} 
                                        heightClass="h-32"
                                        fullWidth={true}
                                    />
                                    <CompactUpload 
                                        label="Brand Logo" 
                                        image={logoImage} 
                                        onUpload={handleUpload(setLogoImage)} 
                                        onClear={() => setLogoImage(null)} 
                                        icon={<BrandKitIcon className="w-5 h-5 text-gray-400"/>} 
                                        optional={true}
                                        fullWidth={true} 
                                        heightClass="h-20"
                                    />
                                </div>
                            </div>

                            {/* STEP 2: DATA SHEET */}
                            <div className="mt-6">
                                <div className={RealtyStyles.sectionHeader}>
                                    <span className={RealtyStyles.stepBadge}>2</span>
                                    <label className={RealtyStyles.sectionTitle}>Data Sheet</label>
                                </div>

                                <div className={RealtyStyles.inputGroup}>
                                    <InputField placeholder="Project Name (e.g. Skyline Towers)" value={texts.projectName} onChange={(e: any) => setTexts({...texts, projectName: e.target.value})} />
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <div className="absolute left-3 top-3.5 text-gray-400"><HomeIcon className="w-4 h-4"/></div>
                                            <input className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Config (e.g. 3 BHK)" value={texts.configuration} onChange={(e) => setTexts({...texts, configuration: e.target.value})} />
                                        </div>
                                        <div className="relative">
                                            <div className="absolute left-3 top-3.5 text-gray-400"><MapPinIcon className="w-4 h-4"/></div>
                                            <input className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Location" value={texts.location} onChange={(e) => setTexts({...texts, location: e.target.value})} />
                                        </div>
                                    </div>
                                    
                                    <div className="relative">
                                        <div className="absolute left-3 top-3.5 text-gray-400"><PhoneIcon className="w-4 h-4"/></div>
                                        <input className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Contact Info" value={texts.contact} onChange={(e) => setTexts({...texts, contact: e.target.value})} />
                                    </div>

                                    {/* Tag Input for Selling Points */}
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Key Selling Points (Max 5)</label>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {sellingPoints.map((tag, idx) => (
                                                <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded-lg flex items-center gap-1 font-medium border border-indigo-100">
                                                    {tag}
                                                    <button onClick={() => removeTag(idx)} className="hover:text-red-500"><XIcon className="w-3 h-3"/></button>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={currentTag} 
                                                onChange={(e) => setCurrentTag(e.target.value)} 
                                                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                                placeholder="e.g. Sea View, Near Metro" 
                                                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
                                            />
                                            <button onClick={addTag} className="bg-indigo-100 text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-200 transition-colors">
                                                <PlusCircleIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-1 italic ml-1">AI will rewrite these points for professional impact.</p>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3: TARGET AUDIENCE */}
                            <div className="mt-6">
                                <div className={RealtyStyles.sectionHeader}>
                                    <span className={RealtyStyles.stepBadge}>3</span>
                                    <label className={RealtyStyles.sectionTitle}>Campaign Goal</label>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <TargetCard 
                                        title="Luxury" 
                                        icon={<SparklesIcon className="w-5 h-5"/>} 
                                        selected={targetAudience === 'luxury'} 
                                        onClick={() => setTargetAudience('luxury')} 
                                        color="purple" 
                                    />
                                    <TargetCard 
                                        title="Investor" 
                                        icon={<CreditCoinIcon className="w-5 h-5"/>} 
                                        selected={targetAudience === 'investor'} 
                                        onClick={() => setTargetAudience('investor')} 
                                        color="green" 
                                    />
                                    <TargetCard 
                                        title="Family" 
                                        icon={<UserIcon className="w-5 h-5"/>} 
                                        selected={targetAudience === 'family'} 
                                        onClick={() => setTargetAudience('family')} 
                                        color="blue" 
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 ml-1 italic">
                                    AI will auto-select the best headline, colors, and layout for this audience.
                                </p>
                            </div>

                        </div>
                    )
                }
            />
            {milestoneBonus !== undefined && <MilestoneSuccessModal bonus={milestoneBonus} onClaim={handleClaimBonus} onClose={() => setMilestoneBonus(undefined)} />}
            {showMagicEditor && resultImage && <MagicEditorModal imageUrl={resultImage} onClose={() => setShowMagicEditor(false)} onSave={handleEditorSave} deductCredit={handleDeductEditCredit} />}
            {showRefundModal && <RefundModal onClose={() => setShowRefundModal(false)} onConfirm={handleRefundRequest} isProcessing={isRefunding} featureName="Realty Ad" />}
            {notification && <ToastNotification message={notification.msg} type={notification.type} onClose={() => setNotification(null)} />}
        </>
    );
};